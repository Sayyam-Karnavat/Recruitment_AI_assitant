"""
Public job board, candidate application with Google OAuth identity gate,
and public candidate leaderboard endpoints.
"""

from uuid import UUID
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from pydantic import BaseModel
from google.oauth2 import id_token
from google.auth.transport import requests
import logging

from database import get_db
from config import settings
from file_parser import compute_file_hash, is_valid_resume_file, validate_resume_bytes, extract_text_from_bytes
from queue_manager import enqueue_batch_task

logger = logging.getLogger(__name__)

router = APIRouter()

class PublicJobResponse(BaseModel):
    id: UUID
    title: str
    description: str
    target_shortlist_count: int
    status: str
    min_passing_score: int
    created_at: str


class LeaderboardEntry(BaseModel):
    rank: int
    candidate_id: str
    name: str
    overall_score: int
    recommendation: str
    applied_at: str


class CandidateStatusResponse(BaseModel):
    candidate_id: str
    status: str
    name: Optional[str] = None
    overall_score: Optional[int] = None
    recommendation: Optional[str] = None
    summary: Optional[str] = None
    strengths: Optional[List[str]] = None
    weaknesses: Optional[List[str]] = None


@router.get("/jobs/{job_id}", response_model=PublicJobResponse)
async def get_public_job(job_id: UUID, db=Depends(get_db)):
    """Retrieve public job details for candidates."""
    conn, cur = db
    await cur.execute(
        "SELECT id, title, description, target_shortlist_count, status, created_at, min_passing_score FROM jobs WHERE id = %s",
        (str(job_id),)
    )
    row = await cur.fetchone()
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job posting not found")

    return PublicJobResponse(
        id=row[0],
        title=row[1],
        description=row[2],
        target_shortlist_count=row[3],
        status=row[4],
        min_passing_score=row[6] or 50,
        created_at=row[5].isoformat() if row[5] else ""
    )


@router.get("/jobs/{job_id}/leaderboard", response_model=List[LeaderboardEntry])
async def get_job_leaderboard(job_id: UUID, db=Depends(get_db)):
    """
    Public leaderboard showing ranked applicant scores and recommendations for a job.
    Resumes, raw text, emails, and phone numbers remain strictly private.
    """
    conn, cur = db
    await cur.execute(
        """SELECT c.id, 
                  COALESCE(cp.prof_name, c.candidate_name, 'Verified Candidate') as name,
                  e.overall_score, 
                  e.recommendation, 
                  c.created_at
           FROM candidates c
           JOIN evaluations e ON e.candidate_id = c.id
           LEFT JOIN candidate_profiles cp ON cp.candidate_id = c.id
           WHERE c.job_id = %s AND c.status = 'evaluated'
           ORDER BY e.overall_score DESC, c.created_at ASC
           LIMIT 50""",
        (str(job_id),)
    )
    rows = await cur.fetchall()

    leaderboard = []
    for idx, r in enumerate(rows):
        leaderboard.append(LeaderboardEntry(
            rank=idx + 1,
            candidate_id=str(r[0]),
            name=r[1],
            overall_score=r[2],
            recommendation=r[3],
            applied_at=r[4].isoformat() if r[4] else ""
        ))
    return leaderboard


def parse_json_list(val) -> Optional[List[str]]:
    """Safely parse JSONB list or stringified list."""
    if val is None:
        return None
    if isinstance(val, list):
        return [str(x) for x in val if x is not None]
    if isinstance(val, (str, bytes, bytearray)):
        try:
            parsed = json.loads(val)
            if isinstance(parsed, list):
                return [str(x) for x in parsed if x is not None]
            elif parsed:
                return [str(parsed)]
        except Exception:
            return []
    return []


@router.get("/candidates/{candidate_id}/status", response_model=CandidateStatusResponse)
async def get_candidate_status(candidate_id: UUID, db=Depends(get_db)):
    """Retrieve personal evaluation progress and scorecard for the candidate."""
    conn, cur = db
    await cur.execute(
        """SELECT c.id, c.status, 
                  COALESCE(cp.prof_name, c.candidate_name) as name,
                  e.overall_score, e.recommendation, e.summary, e.strengths, e.weaknesses
           FROM candidates c
           LEFT JOIN evaluations e ON e.candidate_id = c.id
           LEFT JOIN candidate_profiles cp ON cp.candidate_id = c.id
           WHERE c.id = %s""",
        (str(candidate_id),)
    )
    row = await cur.fetchone()
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Application not found")

    strengths = parse_json_list(row[6])
    weaknesses = parse_json_list(row[7])

    return CandidateStatusResponse(
        candidate_id=str(row[0]),
        status=row[1],
        name=row[2],
        overall_score=row[3],
        recommendation=row[4],
        summary=row[5],
        strengths=strengths,
        weaknesses=weaknesses
    )


@router.get("/jobs/{job_id}/my-application")
async def get_my_application(
    job_id: UUID,
    email: Optional[str] = None,
    google_token: Optional[str] = None,
    db=Depends(get_db)
):
    """
    Check if a candidate has already applied to this specific job.
    Returns their status and scorecard so returning candidates cannot re-apply.
    """
    candidate_email: Optional[str] = None

    if google_token:
        try:
            idinfo = id_token.verify_oauth2_token(
                google_token, requests.Request(), settings.GOOGLE_CLIENT_ID
            )
            candidate_email = idinfo.get("email")
        except Exception:
            pass

    if not candidate_email and email:
        candidate_email = email.strip().lower()

    if not candidate_email:
        return {"has_applied": False, "is_processing": False, "application": None}

    conn, cur = db
    await cur.execute(
        """SELECT c.id, c.status, 
                  COALESCE(cp.prof_name, c.candidate_name) as name,
                  e.overall_score, e.recommendation, e.summary, e.strengths, e.weaknesses,
                  c.created_at, c.error_type, c.error_reason
           FROM candidates c
           LEFT JOIN evaluations e ON e.candidate_id = c.id
           LEFT JOIN candidate_profiles cp ON cp.candidate_id = c.id
           WHERE c.job_id = %s AND LOWER(c.candidate_email) = LOWER(%s)
           ORDER BY c.created_at DESC
           LIMIT 1""",
        (str(job_id), candidate_email)
    )
    row = await cur.fetchone()
    if not row:
        return {"has_applied": False, "is_processing": False, "application": None}

    c_id = str(row[0])
    c_status = row[1]
    error_type = row[9]

    # If the application failed due to a system fault, allow them to reapply
    if c_status == 'failed' and error_type == 'system_fault':
        return {
            "has_applied": False,
            "is_processing": False,
            "application": None,
            "system_fault_retry_allowed": True
        }

    strengths = parse_json_list(row[6])
    weaknesses = parse_json_list(row[7])

    return {
        "has_applied": True,
        "is_processing": (c_status in ["pending", "processing"]),
        "applied_at": row[8].isoformat() if row[8] else None,
        "application": {
            "candidate_id": c_id,
            "status": c_status,
            "name": row[2],
            "overall_score": row[3],
            "recommendation": row[4],
            "summary": row[5],
            "strengths": strengths,
            "weaknesses": weaknesses,
            "error_type": row[9],
            "error_reason": row[10]
        }
    }


@router.post("/jobs/{job_id}/apply")
async def apply_to_job(
    job_id: UUID,
    file: UploadFile = File(...),
    google_token: Optional[str] = Form(None),
    db=Depends(get_db)
):
    """
    Public candidate submission: upload resume for AI screening.
    Enforces Google OAuth verification to strictly prevent repeat duplicate spam.
    """
    conn, cur = db

    # 1. Verify job exists and is active
    await cur.execute(
        "SELECT id, user_id, title, description, custom_prompt, status, min_passing_score FROM jobs WHERE id = %s",
        (str(job_id),)
    )
    job_row = await cur.fetchone()
    if not job_row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job posting not found")

    user_id = str(job_row[1])
    job_title = job_row[2]
    job_description = job_row[3]
    custom_prompt = job_row[4]
    job_status = job_row[5]

    if job_status != "active":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This job posting is currently closed and no longer accepting applications."
        )

    # 2. Verify Google OAuth token for applicant (mandatory identity check)
    if not google_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Google sign-in is required to submit your job application."
        )

    candidate_email: Optional[str] = None
    candidate_name: Optional[str] = None
    candidate_picture: Optional[str] = None

    try:
        idinfo = id_token.verify_oauth2_token(
            google_token, requests.Request(), settings.GOOGLE_CLIENT_ID
        )
        candidate_email = idinfo.get("email")
        candidate_name = idinfo.get("name")
        candidate_picture = idinfo.get("picture")
        google_sub = idinfo.get("sub")
    except Exception as e:
        logger.warning(f"Google token verification failed on candidate apply: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication failed. Please sign in with Google again."
        )

    if not candidate_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No verified email address found in Google account."
        )

    # Store/update candidate in candidate_users table
    await cur.execute(
        """INSERT INTO candidate_users (email, name, picture, google_id)
           VALUES (%s, %s, %s, %s)
           ON CONFLICT (email) DO UPDATE SET
             name = EXCLUDED.name,
             picture = EXCLUDED.picture,
             google_id = EXCLUDED.google_id""",
        (candidate_email, candidate_name, candidate_picture, google_sub)
    )

    # Prevent repeat duplicate applications: check if candidate already applied to this job with this email
    await cur.execute(
        """SELECT id, status, error_type FROM candidates 
           WHERE job_id = %s AND LOWER(candidate_email) = LOWER(%s)
           ORDER BY created_at DESC LIMIT 1""",
        (str(job_id), candidate_email)
    )
    existing_cand = await cur.fetchone()
    if existing_cand:
        # Allow re-applying only if the previous attempt failed due to system fault
        if not (existing_cand[1] == 'failed' and existing_cand[2] == 'system_fault'):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"You have already submitted an application for '{job_title}' using {candidate_email}. You cannot reapply for the same job."
            )

    # 3. In-memory validation and text extraction
    filename = file.filename or "resume.pdf"
    if not is_valid_resume_file(filename):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid file format. Please upload a PDF or DOCX resume."
        )

    raw_bytes = await file.read()
    if not raw_bytes:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Uploaded file is empty.")

    is_valid, err_msg = validate_resume_bytes(raw_bytes, filename)
    if not is_valid:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=err_msg)

    file_hash = compute_file_hash(raw_bytes)

    # Check duplicate application by file hash
    await cur.execute(
        """SELECT id, status, error_type FROM candidates 
           WHERE job_id = %s AND file_hash = %s
           ORDER BY created_at DESC LIMIT 1""",
        (str(job_id), file_hash)
    )
    existing_hash = await cur.fetchone()
    if existing_hash:
        if not (existing_hash[1] == 'failed' and existing_hash[2] == 'system_fault'):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="This exact resume document has already been submitted for this job opening."
            )

    raw_text = extract_text_from_bytes(raw_bytes, filename)

    # 4. Check employer credits & deduct 1 credit if available
    await cur.execute("SELECT credits, email FROM users WHERE id = %s", (user_id,))
    u_row = await cur.fetchone()
    employer_credits = u_row[0] if u_row and u_row[0] is not None else 0
    employer_email = (u_row[1] or "").lower() if u_row else ""
    is_unlimited_employer = (employer_email == "sanyam.karnavat5@gmail.com")

    if is_unlimited_employer:
        await cur.execute("UPDATE users SET credits = 999999 WHERE id = %s", (user_id,))
    elif employer_credits > 0:
        await cur.execute("UPDATE users SET credits = credits - 1 WHERE id = %s", (user_id,))
        await cur.execute(
            """INSERT INTO transactions
               (user_id, amount_credits, amount_inr, transaction_type, status, description)
               VALUES (%s, -1, 0, 'deduction', 'success', %s)""",
            (user_id, f"Candidate application via public portal for '{job_title}'")
        )

    # 5. Insert candidate record with verified candidate identity
    await cur.execute(
        """INSERT INTO candidates (job_id, file_hash, filename, file_path, raw_text, status, candidate_email, candidate_name)
           VALUES (%s, %s, %s, NULL, %s, 'pending', %s, %s) RETURNING id""",
        (str(job_id), file_hash, filename, raw_text, candidate_email, candidate_name)
    )
    candidate_row = await cur.fetchone()
    candidate_id = str(candidate_row[0])

    # 6. Create batch record
    await cur.execute(
        """INSERT INTO upload_batches (job_id, total_files, processed_files, status)
           VALUES (%s, 1, 0, 'processing') RETURNING id""",
        (str(job_id),)
    )
    batch_row = await cur.fetchone()
    batch_id = str(batch_row[0])

    await conn.commit()

    # 7. Enqueue AI screening task
    await enqueue_batch_task(
        batch_id=batch_id,
        candidate_ids=[candidate_id],
        job_id=str(job_id),
        user_id=user_id,
        job_description=job_description,
        custom_prompt=custom_prompt
    )

    return {
        "success": True,
        "message": "Application submitted successfully! Our AI screening engine is evaluating your profile.",
        "candidate_id": candidate_id,
        "job_title": job_title,
        "candidate_email": candidate_email,
        "candidate_name": candidate_name
    }
