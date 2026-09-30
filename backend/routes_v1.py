"""
Developer API v1 (API-Key Authenticated).
Provides comprehensive programmatic endpoints for integrating ATS/CRM systems with Uppshot.
"""

import csv
import io
import json
import uuid
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks, UploadFile, File, Query
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from database import get_db
from schemas import (
    JobCreate, JobUpdate, JobResponse, UploadResponse,
    CandidateDetailResponse, CandidateListItem, BatchStatusResponse
)
from auth import get_api_key_user
from routes_jobs import create_job, get_job, update_job, delete_job
from routes_upload import upload_resumes, upload_links, get_batch_status, UploadLinksRequest
from routes_candidates import get_candidate_detail, list_candidates, delete_candidate
from routes_export import export_csv
from routes_wallet import get_wallet_balance, _is_unlimited
from rate_limiter import validate_webhook_url_ssrf
from queue_manager import enqueue_batch_task
from config import settings

router = APIRouter()


# ─────────────────────────────────────────────────────────────
# Pydantic Schemas for Developer APIs
# ─────────────────────────────────────────────────────────────

class JobShareLinkResponse(BaseModel):
    job_id: uuid.UUID
    title: str
    status: str
    shareable_url: str
    direct_apply_url: str


class JobWebhookRequest(BaseModel):
    webhook_url: str = Field(..., description="Public HTTPS callback URL")


class JobWebhookResponse(BaseModel):
    job_id: uuid.UUID
    webhook_url: Optional[str] = None
    status: str


class JobSummaryResponse(BaseModel):
    job_id: uuid.UUID
    title: str
    status: str
    total_candidates: int
    evaluated_candidates: int
    pending_candidates: int
    failed_candidates: int
    passing_threshold: int
    passed_count: int
    failed_score_count: int
    average_score: Optional[float] = None
    recommendations: dict[str, int]
    top_skills: list[str] = []


class CandidateStatusResponse(BaseModel):
    id: uuid.UUID
    job_id: uuid.UUID
    filename: str
    name: Optional[str] = None
    status: str
    overall_score: Optional[int] = None
    recommendation: Optional[str] = None
    error_reason: Optional[str] = None
    created_at: datetime


class CandidateLookupItem(BaseModel):
    id: uuid.UUID
    job_id: uuid.UUID
    job_title: str
    filename: str
    name: Optional[str] = None
    email: str
    status: str
    overall_score: Optional[int] = None
    recommendation: Optional[str] = None
    created_at: datetime


class CandidateReScreenResponse(BaseModel):
    candidate_id: uuid.UUID
    batch_id: uuid.UUID
    status: str
    message: str


# ─────────────────────────────────────────────────────────────
# 1. Job Lifecycle & Position Controls
# ─────────────────────────────────────────────────────────────

@router.post("/jobs", response_model=JobResponse, summary="Create a new job position", tags=["Developer APIs (v1)"])
async def v1_create_job(
    job: JobCreate,
    user=Depends(get_api_key_user),
    db=Depends(get_db)
):
    """Create a new job posting with target shortlist criteria and custom evaluation prompt."""
    return await create_job(job, user, db)


@router.get("/jobs", response_model=list[JobResponse], summary="List all jobs", tags=["Developer APIs (v1)"])
async def v1_list_jobs(
    status: Optional[str] = Query(None, description="Optional status filter: 'active', 'closed', or 'all'"),
    user=Depends(get_api_key_user),
    db=Depends(get_db)
):
    """List all positions belonging to the API key owner with optional status filtering."""
    conn, cur = db
    query = """
        SELECT j.id, j.title, j.description, j.target_shortlist_count, j.status, j.created_at,
               j.custom_prompt, j.active_days_limit, j.max_applications, j.min_passing_score,
               j.webhook_url, COUNT(c.id) as candidate_count
        FROM jobs j
        LEFT JOIN candidates c ON c.job_id = j.id
        WHERE j.user_id = %s
    """
    params = [str(user["id"])]
    if status and status.lower() != "all":
        query += " AND j.status = %s"
        params.append(status.lower())
    query += " GROUP BY j.id ORDER BY j.created_at DESC"

    await cur.execute(query, params)
    rows = await cur.fetchall()

    return [
        JobResponse(
            id=r[0], title=r[1], description=r[2], target_shortlist_count=r[3], status=r[4], created_at=r[5],
            custom_prompt=r[6], active_days_limit=r[7], max_applications=r[8], min_passing_score=r[9] or 50,
            webhook_url=r[10], candidate_count=r[11]
        )
        for r in rows
    ]


@router.get("/jobs/{job_id}", response_model=JobResponse, summary="Get job details", tags=["Developer APIs (v1)"])
async def v1_get_job(
    job_id: uuid.UUID,
    user=Depends(get_api_key_user),
    db=Depends(get_db)
):
    """Retrieve metadata, scoring threshold, and candidate count for a specific position."""
    return await get_job(job_id, user, db)


@router.patch("/jobs/{job_id}", response_model=JobResponse, summary="Update job position settings", tags=["Developer APIs (v1)"])
async def v1_update_job(
    job_id: uuid.UUID,
    body: JobUpdate,
    user=Depends(get_api_key_user),
    db=Depends(get_db)
):
    """Update title, description, passing score cutoff, shortlist count, or prompt criteria."""
    return await update_job(job_id, body, user, db)


@router.post("/jobs/{job_id}/close", response_model=JobResponse, summary="Close a job position", tags=["Developer APIs (v1)"])
async def v1_close_job(
    job_id: uuid.UUID,
    user=Depends(get_api_key_user),
    db=Depends(get_db)
):
    """Pause/close a job posting so no new candidate applications can be submitted."""
    update_data = JobUpdate(status="closed")
    return await update_job(job_id, update_data, user, db)


@router.post("/jobs/{job_id}/reopen", response_model=JobResponse, summary="Reopen a closed job position", tags=["Developer APIs (v1)"])
async def v1_reopen_job(
    job_id: uuid.UUID,
    user=Depends(get_api_key_user),
    db=Depends(get_db)
):
    """Reactivate a closed job position to resume accepting candidate applications."""
    update_data = JobUpdate(status="active")
    return await update_job(job_id, update_data, user, db)


@router.delete("/jobs/{job_id}", summary="Delete a job position", tags=["Developer APIs (v1)"])
async def v1_delete_job(
    job_id: uuid.UUID,
    user=Depends(get_api_key_user),
    db=Depends(get_db)
):
    """Permanently delete a position and cascade-delete all candidates and evaluations."""
    await delete_job(job_id, user, db)
    return {"success": True, "message": "Job and all candidate evaluations permanently deleted", "id": str(job_id)}


@router.get("/jobs/{job_id}/share-link", response_model=JobShareLinkResponse, summary="Get public candidate application link", tags=["Developer APIs (v1)"])
async def v1_get_share_link(
    job_id: uuid.UUID,
    user=Depends(get_api_key_user),
    db=Depends(get_db)
):
    """Get the direct shareable URL for candidates to apply and upload resumes publicly."""
    conn, cur = db
    await cur.execute("SELECT id, title, status FROM jobs WHERE id = %s AND user_id = %s", (str(job_id), str(user["id"])))
    row = await cur.fetchone()
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found")

    base_frontend = "https://uppshot.com"
    if settings.FRONTEND_URL:
        base_frontend = settings.FRONTEND_URL.split(",")[0].strip()

    careers_url = f"{base_frontend}/careers/{job_id}"
    return JobShareLinkResponse(
        job_id=row[0],
        title=row[1],
        status=row[2],
        shareable_url=careers_url,
        direct_apply_url=careers_url
    )


@router.get("/jobs/{job_id}/summary", response_model=JobSummaryResponse, summary="Get job pipeline intelligence summary", tags=["Developer APIs (v1)"])
async def v1_get_job_summary(
    job_id: uuid.UUID,
    user=Depends(get_api_key_user),
    db=Depends(get_db)
):
    """Aggregate screening metrics: pass/fail counts, average score, recommendation distribution, and top skills."""
    conn, cur = db
    await cur.execute(
        "SELECT id, title, status, min_passing_score FROM jobs WHERE id = %s AND user_id = %s",
        (str(job_id), str(user["id"]))
    )
    job_row = await cur.fetchone()
    if not job_row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found")

    cutoff = job_row[3] or 50

    await cur.execute(
        """SELECT 
            COUNT(c.id) as total,
            COUNT(CASE WHEN c.status = 'evaluated' THEN 1 END) as evaluated,
            COUNT(CASE WHEN c.status IN ('pending', 'evaluating') THEN 1 END) as pending,
            COUNT(CASE WHEN c.status = 'failed' THEN 1 END) as failed,
            AVG(e.overall_score) as avg_score,
            COUNT(CASE WHEN e.overall_score >= %s THEN 1 END) as passed,
            COUNT(CASE WHEN e.overall_score < %s THEN 1 END) as failed_score
           FROM candidates c
           LEFT JOIN evaluations e ON e.candidate_id = c.id
           WHERE c.job_id = %s""",
        (cutoff, cutoff, str(job_id))
    )
    counts = await cur.fetchone()

    await cur.execute(
        """SELECT COALESCE(e.recommendation, 'Unscreened'), COUNT(c.id)
           FROM candidates c
           LEFT JOIN evaluations e ON e.candidate_id = c.id
           WHERE c.job_id = %s
           GROUP BY COALESCE(e.recommendation, 'Unscreened')""",
        (str(job_id),)
    )
    rec_rows = await cur.fetchall()
    recs = {r[0]: r[1] for r in rec_rows}

    await cur.execute(
        """SELECT cp.skills FROM candidate_profiles cp
           JOIN candidates c ON cp.candidate_id = c.id
           WHERE c.job_id = %s AND cp.skills IS NOT NULL""",
        (str(job_id),)
    )
    skills_rows = await cur.fetchall()
    skill_counts: dict[str, int] = {}
    for (skills_val,) in skills_rows:
        if isinstance(skills_val, list):
            for s in skills_val:
                s_clean = str(s).strip()
                if s_clean:
                    skill_counts[s_clean] = skill_counts.get(s_clean, 0) + 1
        elif isinstance(skills_val, str):
            for s in skills_val.split(","):
                s_clean = s.strip()
                if s_clean:
                    skill_counts[s_clean] = skill_counts.get(s_clean, 0) + 1

    top_skills = sorted(skill_counts.keys(), key=lambda k: skill_counts[k], reverse=True)[:10]

    return JobSummaryResponse(
        job_id=job_row[0],
        title=job_row[1],
        status=job_row[2],
        total_candidates=counts[0] or 0,
        evaluated_candidates=counts[1] or 0,
        pending_candidates=counts[2] or 0,
        failed_candidates=counts[3] or 0,
        average_score=round(float(counts[4]), 1) if counts[4] is not None else None,
        passing_threshold=cutoff,
        passed_count=counts[5] or 0,
        failed_score_count=counts[6] or 0,
        recommendations=recs,
        top_skills=top_skills
    )


# ─────────────────────────────────────────────────────────────
# 2. Webhook Callback Automation
# ─────────────────────────────────────────────────────────────

@router.post("/jobs/{job_id}/webhook", response_model=JobWebhookResponse, summary="Set screening completion webhook", tags=["Developer APIs (v1)"])
async def v1_set_webhook(
    job_id: uuid.UUID,
    req: JobWebhookRequest,
    user=Depends(get_api_key_user),
    db=Depends(get_db)
):
    """Register an HTTPS webhook URL to receive POST notifications upon candidate screening completion."""
    validate_webhook_url_ssrf(req.webhook_url)
    conn, cur = db
    await cur.execute(
        "UPDATE jobs SET webhook_url = %s WHERE id = %s AND user_id = %s RETURNING id, webhook_url, status",
        (req.webhook_url, str(job_id), str(user["id"]))
    )
    row = await cur.fetchone()
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found")
    await conn.commit()
    return JobWebhookResponse(job_id=row[0], webhook_url=row[1], status="active")


@router.get("/jobs/{job_id}/webhook", response_model=JobWebhookResponse, summary="Get webhook configuration", tags=["Developer APIs (v1)"])
async def v1_get_webhook(
    job_id: uuid.UUID,
    user=Depends(get_api_key_user),
    db=Depends(get_db)
):
    """Retrieve the current webhook callback URL configured for this position."""
    conn, cur = db
    await cur.execute(
        "SELECT id, webhook_url, status FROM jobs WHERE id = %s AND user_id = %s",
        (str(job_id), str(user["id"]))
    )
    row = await cur.fetchone()
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found")
    return JobWebhookResponse(job_id=row[0], webhook_url=row[1], status="active" if row[1] else "unconfigured")


@router.delete("/jobs/{job_id}/webhook", summary="Remove webhook configuration", tags=["Developer APIs (v1)"])
async def v1_delete_webhook(
    job_id: uuid.UUID,
    user=Depends(get_api_key_user),
    db=Depends(get_db)
):
    """Remove the webhook callback endpoint from the position."""
    conn, cur = db
    await cur.execute(
        "UPDATE jobs SET webhook_url = NULL WHERE id = %s AND user_id = %s RETURNING id",
        (str(job_id), str(user["id"]))
    )
    row = await cur.fetchone()
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found")
    await conn.commit()
    return {"success": True, "message": "Webhook callback removed successfully", "job_id": str(job_id)}


# ─────────────────────────────────────────────────────────────
# 3. Resume Ingestion & Batch Screening
# ─────────────────────────────────────────────────────────────

@router.post("/jobs/{job_id}/upload", response_model=UploadResponse, summary="Upload resumes to a job", tags=["Developer APIs (v1)"])
async def v1_upload_resumes(
    job_id: uuid.UUID,
    background_tasks: BackgroundTasks,
    files: list[UploadFile] = File(...),
    user=Depends(get_api_key_user),
    db=Depends(get_db)
):
    """Upload one or more candidate resumes (PDF, DOCX, or ZIP archive)."""
    return await upload_resumes(job_id, background_tasks, files, user, db)


@router.post("/jobs/{job_id}/upload-links", response_model=UploadResponse, summary="Ingest resumes via cloud or direct download URLs", tags=["Developer APIs (v1)"])
async def v1_upload_links(
    job_id: uuid.UUID,
    req: UploadLinksRequest,
    background_tasks: BackgroundTasks,
    user=Depends(get_api_key_user),
    db=Depends(get_db)
):
    """Ingest resumes programmatically via public URLs (Google Drive, S3, Dropbox, or direct PDFs)."""
    return await upload_links(job_id, req, background_tasks, user, db)


@router.get("/jobs/{job_id}/batch/{batch_id}", response_model=BatchStatusResponse, summary="Get upload batch progress", tags=["Developer APIs (v1)"])
async def v1_get_batch_status(
    job_id: uuid.UUID,
    batch_id: uuid.UUID,
    user=Depends(get_api_key_user),
    db=Depends(get_db)
):
    """Check asynchronous AI screening progress for an uploaded batch of resumes."""
    return await get_batch_status(job_id, batch_id, user, db)


# ─────────────────────────────────────────────────────────────
# 4. Candidate Management & Reporting
# ─────────────────────────────────────────────────────────────

@router.get("/jobs/{job_id}/candidates", response_model=list[CandidateListItem], summary="List ranked candidates", tags=["Developer APIs (v1)"])
async def v1_list_candidates(
    job_id: uuid.UUID,
    sort_by: Optional[str] = Query("score", pattern="^(score|name|date)$"),
    recommendation: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    user=Depends(get_api_key_user),
    db=Depends(get_db)
):
    """Retrieve all screened candidates for a job, ranked by overall match score."""
    return await list_candidates(job_id, sort_by, recommendation, search, user, db)


@router.get("/candidates/{candidate_id}", response_model=CandidateDetailResponse, summary="Get candidate evaluation", tags=["Developer APIs (v1)"])
async def v1_get_candidate(
    candidate_id: uuid.UUID,
    user=Depends(get_api_key_user),
    db=Depends(get_db)
):
    """Fetch structured candidate profile, experience breakdown, category scores, and executive summary."""
    return await get_candidate_detail(candidate_id, user, db)


@router.get("/candidates/{candidate_id}/status", response_model=CandidateStatusResponse, summary="Get candidate screening status", tags=["Developer APIs (v1)"])
async def v1_get_candidate_status(
    candidate_id: uuid.UUID,
    user=Depends(get_api_key_user),
    db=Depends(get_db)
):
    """Fast, lightweight endpoint to check if an applicant is pending, evaluated, or failed."""
    conn, cur = db
    await cur.execute(
        """SELECT c.id, c.job_id, c.filename, cp.prof_name, c.status,
                  e.overall_score, e.recommendation, c.error_reason, c.created_at
           FROM candidates c
           JOIN jobs j ON c.job_id = j.id
           LEFT JOIN candidate_profiles cp ON cp.candidate_id = c.id
           LEFT JOIN evaluations e ON e.candidate_id = c.id
           WHERE c.id = %s AND j.user_id = %s""",
        (str(candidate_id), str(user["id"]))
    )
    row = await cur.fetchone()
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Candidate not found or access denied")

    return CandidateStatusResponse(
        id=row[0],
        job_id=row[1],
        filename=row[2],
        name=row[3],
        status=row[4],
        overall_score=row[5],
        recommendation=row[6],
        error_reason=row[7],
        created_at=row[8]
    )


@router.get("/candidates/by-email", response_model=list[CandidateLookupItem], summary="Lookup candidate by email address", tags=["Developer APIs (v1)"])
async def v1_lookup_candidate_by_email(
    email: str = Query(..., min_length=3, description="Candidate email address to look up"),
    job_id: Optional[uuid.UUID] = Query(None, description="Optional job ID filter"),
    user=Depends(get_api_key_user),
    db=Depends(get_db)
):
    """Find all candidate screening scorecards and reports matching a candidate's email address."""
    conn, cur = db
    clean_email = email.strip().lower()

    query = """
        SELECT c.id, c.job_id, j.title, c.filename, cp.prof_name, cp.prof_email,
               c.status, e.overall_score, e.recommendation, c.created_at
        FROM candidates c
        JOIN jobs j ON c.job_id = j.id
        LEFT JOIN candidate_profiles cp ON cp.candidate_id = c.id
        LEFT JOIN evaluations e ON e.candidate_id = c.id
        WHERE j.user_id = %s AND LOWER(cp.prof_email) = %s
    """
    params = [str(user["id"]), clean_email]
    if job_id:
        query += " AND c.job_id = %s"
        params.append(str(job_id))
    query += " ORDER BY c.created_at DESC"

    await cur.execute(query, params)
    rows = await cur.fetchall()

    return [
        CandidateLookupItem(
            id=r[0],
            job_id=r[1],
            job_title=r[2],
            filename=r[3],
            name=r[4],
            email=r[5] or clean_email,
            status=r[6],
            overall_score=r[7],
            recommendation=r[8],
            created_at=r[9]
        )
        for r in rows
    ]


@router.delete("/candidates/{candidate_id}", summary="Delete a candidate evaluation", tags=["Developer APIs (v1)"])
async def v1_delete_candidate(
    candidate_id: uuid.UUID,
    user=Depends(get_api_key_user),
    db=Depends(get_db)
):
    """Delete a single candidate record and all associated profile and evaluation data."""
    return await delete_candidate(candidate_id, user, db)


@router.post("/candidates/{candidate_id}/rescreen", response_model=CandidateReScreenResponse, summary="Re-evaluate candidate", tags=["Developer APIs (v1)"])
async def v1_rescreen_candidate(
    candidate_id: uuid.UUID,
    user=Depends(get_api_key_user),
    db=Depends(get_db)
):
    """Trigger an immediate re-evaluation of an existing candidate against current job criteria."""
    conn, cur = db
    await cur.execute(
        """SELECT c.id, c.job_id, c.raw_text, j.title, j.description, j.custom_prompt, j.user_id
           FROM candidates c
           JOIN jobs j ON c.job_id = j.id
           WHERE c.id = %s AND j.user_id = %s""",
        (str(candidate_id), str(user["id"]))
    )
    row = await cur.fetchone()
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Candidate not found or access denied")

    cand_id, job_id, raw_text, job_title, job_description, custom_prompt, job_user_id = row
    if not raw_text or not raw_text.strip():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Candidate resume text is empty or unreadable; cannot re-screen.")

    is_unlimited = _is_unlimited(user.get("email", "")) or user.get("role") == "admin"
    if not is_unlimited:
        await cur.execute("SELECT credits FROM users WHERE id = %s", (str(user["id"]),))
        user_row = await cur.fetchone()
        if not user_row or user_row[0] < 1:
            raise HTTPException(status_code=status.HTTP_402_PAYMENT_REQUIRED, detail="Insufficient credits for re-screening.")
        await cur.execute("UPDATE users SET credits = credits - 1 WHERE id = %s", (str(user["id"]),))

    batch_id = str(uuid.uuid4())
    await cur.execute(
        """INSERT INTO upload_batches (id, job_id, total_files, processed_files, status)
           VALUES (%s, %s, 1, 0, 'processing')""",
        (batch_id, str(job_id))
    )
    await cur.execute(
        "UPDATE candidates SET status = 'pending', error_type = NULL, error_reason = NULL WHERE id = %s",
        (str(candidate_id),)
    )
    await conn.commit()

    await enqueue_batch_task(
        batch_id=batch_id,
        candidate_ids=[str(candidate_id)],
        job_id=str(job_id),
        user_id=str(user["id"]),
        job_description=job_description,
        custom_prompt=custom_prompt
    )

    return CandidateReScreenResponse(
        candidate_id=candidate_id,
        batch_id=uuid.UUID(batch_id),
        status="processing",
        message="Candidate re-screening enqueued successfully"
    )


# ─────────────────────────────────────────────────────────────
# 5. Exports & Quota Controls
# ─────────────────────────────────────────────────────────────

@router.get("/jobs/{job_id}/export/csv", summary="Export ranked candidates to CSV", tags=["Developer APIs (v1)"])
async def v1_export_csv(
    job_id: uuid.UUID,
    user=Depends(get_api_key_user),
    db=Depends(get_db)
):
    """Download candidate scorecards, contact emails, and recommendations as a CSV stream."""
    return await export_csv(job_id, user, db)


@router.get("/wallet/balance", summary="Get remaining credit balance", tags=["Developer APIs (v1)"])
async def v1_get_wallet_balance(
    user=Depends(get_api_key_user),
    db=Depends(get_db)
):
    """Check available resume screening credits on the API key account."""
    return await get_wallet_balance(user, db)
