"""
Public job board and self-service candidate application routes (unauthenticated).
"""

from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from pydantic import BaseModel

from database import get_db
from file_parser import compute_file_hash, is_valid_resume_file, validate_resume_bytes, extract_text_from_bytes
from queue_manager import enqueue_batch_task

router = APIRouter()

class PublicJobResponse(BaseModel):
    id: UUID
    title: str
    description: str
    target_shortlist_count: int
    status: str
    created_at: str


@router.get("/jobs/{job_id}", response_model=PublicJobResponse)
async def get_public_job(job_id: UUID, db=Depends(get_db)):
    """Retrieve public job details for candidates."""
    conn, cur = db
    await cur.execute(
        "SELECT id, title, description, target_shortlist_count, status, created_at FROM jobs WHERE id = %s",
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
        created_at=row[5].isoformat() if row[5] else ""
    )


@router.post("/jobs/{job_id}/apply")
async def apply_to_job(
    job_id: UUID,
    file: UploadFile = File(...),
    db=Depends(get_db)
):
    """Public candidate submission: upload resume for AI screening without authentication."""
    conn, cur = db

    # 1. Verify job exists and is active
    await cur.execute(
        "SELECT id, user_id, title, description, custom_prompt, status FROM jobs WHERE id = %s",
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

    # 2. In-memory validation and text extraction
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

    # Check duplicate application
    await cur.execute(
        "SELECT id FROM candidates WHERE job_id = %s AND file_hash = %s",
        (str(job_id), file_hash)
    )
    if await cur.fetchone():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You have already submitted this resume for this job opening."
        )

    raw_text = extract_text_from_bytes(raw_bytes, filename)

    # 3. Check employer credits & deduct 1 credit if available
    await cur.execute("SELECT credits FROM users WHERE id = %s", (user_id,))
    u_row = await cur.fetchone()
    employer_credits = u_row[0] if u_row and u_row[0] is not None else 0

    if employer_credits > 0:
        await cur.execute("UPDATE users SET credits = credits - 1 WHERE id = %s", (user_id,))
        await cur.execute(
            """INSERT INTO transactions
               (user_id, amount_credits, amount_inr, transaction_type, status, description)
               VALUES (%s, -1, 0, 'deduction', 'success', %s)""",
            (user_id, f"Candidate application via public portal for '{job_title}'")
        )

    # 4. Insert candidate record
    await cur.execute(
        """INSERT INTO candidates (job_id, file_hash, filename, file_path, raw_text, status)
           VALUES (%s, %s, %s, NULL, %s, 'pending') RETURNING id""",
        (str(job_id), file_hash, filename, raw_text)
    )
    candidate_row = await cur.fetchone()
    candidate_id = str(candidate_row[0])

    # 5. Create batch record
    await cur.execute(
        """INSERT INTO upload_batches (job_id, total_files, processed_files, status)
           VALUES (%s, 1, 0, 'processing') RETURNING id""",
        (str(job_id),)
    )
    batch_row = await cur.fetchone()
    batch_id = str(batch_row[0])

    await conn.commit()

    # 6. Enqueue task
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
        "job_title": job_title
    }
