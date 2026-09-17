from uuid import UUID
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, BackgroundTasks, status
from pydantic import BaseModel

from database import get_db
from schemas import UploadResponse, BatchStatusResponse
from auth import get_current_user
from file_parser import (
    compute_file_hash,
    is_valid_resume_file,
    is_zip_file,
    extract_files_from_zip_in_memory,
    validate_resume_bytes,
    extract_text_from_bytes,
)
from queue_manager import enqueue_batch_task
from url_downloader import download_file_from_url

router = APIRouter()

class UploadLinksRequest(BaseModel):
    urls: list[str]


@router.post("/{job_id}/upload", response_model=UploadResponse)
async def upload_resumes(
    job_id: UUID,
    background_tasks: BackgroundTasks,
    files: list[UploadFile] = File(...),
    user=Depends(get_current_user),
    db=Depends(get_db),
):
    conn, cur = db

    # 1. Verify job exists and belongs to user
    await cur.execute(
        "SELECT id, title, description, custom_prompt FROM jobs WHERE id = %s AND user_id = %s",
        (str(job_id), str(user["id"]))
    )
    job_row = await cur.fetchone()
    if not job_row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found")

    job_title = job_row[1]
    job_description = job_row[2]
    custom_prompt = job_row[3]

    # 2. Extract and parse files purely in-memory
    items_to_process: list[tuple[str, str, str]] = []  # (filename, file_hash, raw_text)
    invalid_items: list[tuple[str, str, str]] = []  # (filename, file_hash, error_reason)

    for file in files:
        filename = file.filename or "unknown"
        raw_bytes = await file.read()
        if not raw_bytes:
            continue

        if is_zip_file(filename):
            try:
                extracted_items = extract_files_from_zip_in_memory(raw_bytes)
            except ValueError as e:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

            for name, item_bytes in extracted_items:
                f_hash = compute_file_hash(item_bytes)
                # Duplicate check
                await cur.execute(
                    "SELECT id FROM candidates WHERE job_id = %s AND file_hash = %s",
                    (str(job_id), f_hash)
                )
                if await cur.fetchone():
                    continue

                is_valid, err_msg = validate_resume_bytes(item_bytes, name)
                if not is_valid:
                    invalid_items.append((name, f_hash, err_msg))
                    continue

                text = extract_text_from_bytes(item_bytes, name)
                items_to_process.append((name, f_hash, text))

        else:
            f_hash = compute_file_hash(raw_bytes)
            await cur.execute(
                "SELECT id FROM candidates WHERE job_id = %s AND file_hash = %s",
                (str(job_id), f_hash)
            )
            if await cur.fetchone():
                continue

            if not is_valid_resume_file(filename):
                ext = Path(filename).suffix or "unknown"
                invalid_items.append((filename, f_hash, f"File format '{ext}' is not supported. Please upload valid PDF or DOCX resumes."))
                continue

            is_valid, err_msg = validate_resume_bytes(raw_bytes, filename)
            if not is_valid:
                invalid_items.append((filename, f_hash, err_msg))
                continue

            text = extract_text_from_bytes(raw_bytes, filename)
            items_to_process.append((filename, f_hash, text))

    if not items_to_process and not invalid_items:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No new resume files found (documents may have already been uploaded).")

    # 3. Check Wallet Balance & Guarded Credit System for valid candidates
    num_resumes = len(items_to_process)
    user_email = (user.get("email") or "").lower()
    is_unlimited = (user_email == "sanyam.karnavat5@gmail.com")

    if num_resumes > 0 and not is_unlimited:
        await cur.execute("SELECT credits FROM users WHERE id = %s", (str(user["id"]),))
        user_row = await cur.fetchone()
        current_credits = user_row[0] if user_row and user_row[0] is not None else 0

        if current_credits < num_resumes:
            raise HTTPException(
                status_code=status.HTTP_402_PAYMENT_REQUIRED,
                detail=f"Insufficient resume credits. You have {current_credits} credits, but {num_resumes} are needed. Please top up your wallet."
            )

    # 4. Insert candidate records with in-memory text (zero disk write)
    candidate_ids = []
    for filename, f_hash, text in items_to_process:
        await cur.execute(
            """INSERT INTO candidates (job_id, file_hash, filename, file_path, raw_text, status)
               VALUES (%s, %s, %s, NULL, %s, 'pending') RETURNING id""",
            (str(job_id), f_hash, filename, text)
        )
        row = await cur.fetchone()
        candidate_ids.append(str(row[0]))

    # Insert invalid / unparseable files as failed records so they appear in UI with reasons
    for filename, f_hash, reason in invalid_items:
        await cur.execute(
            """INSERT INTO candidates (job_id, file_hash, filename, file_path, raw_text, status, error_type, error_reason)
               VALUES (%s, %s, %s, NULL, NULL, 'failed', 'user_fault', %s) RETURNING id""",
            (str(job_id), f_hash, filename, reason)
        )

    # 5. Create batch record
    total_batch_count = len(candidate_ids) + len(invalid_items)
    await cur.execute(
        """INSERT INTO upload_batches (job_id, total_files, processed_files, status)
           VALUES (%s, %s, %s, %s) RETURNING id""",
        (str(job_id), total_batch_count, len(invalid_items), 'processing' if candidate_ids else 'completed')
    )
    batch_row = await cur.fetchone()
    batch_id = str(batch_row[0])

    # 6. Deduct credits upfront and log transaction (only for regular users and active resumes)
    if num_resumes > 0:
        if not is_unlimited:
            await cur.execute(
                "UPDATE users SET credits = credits - %s WHERE id = %s",
                (num_resumes, str(user["id"]))
            )
            await cur.execute(
                """INSERT INTO transactions
                   (user_id, amount_credits, amount_inr, transaction_type, status, reference_id, description)
                   VALUES (%s, %s, 0, 'deduction', 'success', %s, %s)""",
                (
                    str(user["id"]),
                    -num_resumes,
                    batch_id,
                    f"Resume Processing ({num_resumes} files) for '{job_title}'"
                )
            )
        else:
            # Keep unlimited credits topped up
            await cur.execute("UPDATE users SET credits = 999999 WHERE id = %s", (str(user["id"]),))

    await conn.commit()

    # 7. Enqueue batch to task queue if there are active candidates to process
    if candidate_ids:
        await enqueue_batch_task(
            batch_id=batch_id,
            candidate_ids=candidate_ids,
            job_id=str(job_id),
            user_id=str(user["id"]),
            job_description=job_description,
            custom_prompt=custom_prompt
        )

    return UploadResponse(batch_id=batch_row[0], total_files=total_batch_count, message="Processing started")


@router.post("/{job_id}/upload-links", response_model=UploadResponse)
async def upload_links(
    job_id: UUID,
    req: UploadLinksRequest,
    background_tasks: BackgroundTasks,
    user=Depends(get_current_user),
    db=Depends(get_db),
):
    conn, cur = db
    await cur.execute(
        "SELECT id, title, description, custom_prompt FROM jobs WHERE id = %s AND user_id = %s",
        (str(job_id), str(user["id"]))
    )
    job_row = await cur.fetchone()
    if not job_row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found")

    job_title = job_row[1]
    job_description = job_row[2]
    custom_prompt = job_row[3]

    items_to_process: list[tuple[str, str, str]] = []
    invalid_items: list[tuple[str, str, str]] = []

    for url in req.urls:
        try:
            raw_bytes, filename = await download_file_from_url(url)
            if not raw_bytes:
                invalid_items.append((url, compute_file_hash(url.encode()), "Could not download content from the provided link."))
                continue

            f_hash = compute_file_hash(raw_bytes)
            await cur.execute(
                "SELECT id FROM candidates WHERE job_id = %s AND file_hash = %s",
                (str(job_id), f_hash)
            )
            if await cur.fetchone():
                continue

            if is_zip_file(filename):
                extracted_items = extract_files_from_zip_in_memory(raw_bytes)
                for name, item_bytes in extracted_items:
                    item_hash = compute_file_hash(item_bytes)
                    is_valid, err_msg = validate_resume_bytes(item_bytes, name)
                    if not is_valid:
                        invalid_items.append((name, item_hash, err_msg))
                        continue

                    text = extract_text_from_bytes(item_bytes, name)
                    items_to_process.append((name, item_hash, text))

            elif is_valid_resume_file(filename):
                is_valid, err_msg = validate_resume_bytes(raw_bytes, filename)
                if not is_valid:
                    invalid_items.append((filename, f_hash, err_msg))
                    continue

                text = extract_text_from_bytes(raw_bytes, filename)
                items_to_process.append((filename, f_hash, text))
            else:
                ext = Path(filename).suffix or "unknown"
                invalid_items.append((filename, f_hash, f"File format '{ext}' downloaded from link is not a supported PDF or DOCX resume."))
        except Exception as e:
            invalid_items.append((url, compute_file_hash(url.encode()), f"Failed to ingest link: {str(e)}"))
            continue

    if not items_to_process and not invalid_items:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No new resume files found from the provided links.")

    num_resumes = len(items_to_process)
    user_email = (user.get("email") or "").lower()
    is_unlimited = (user_email == "sanyam.karnavat5@gmail.com")

    if num_resumes > 0 and not is_unlimited:
        await cur.execute("SELECT credits FROM users WHERE id = %s", (str(user["id"]),))
        user_row = await cur.fetchone()
        current_credits = user_row[0] if user_row and user_row[0] is not None else 0

        if current_credits < num_resumes:
            raise HTTPException(
                status_code=status.HTTP_402_PAYMENT_REQUIRED,
                detail=f"Insufficient resume credits. You have {current_credits} credits, but {num_resumes} are needed. Please top up your wallet."
            )

    candidate_ids = []
    for filename, f_hash, text in items_to_process:
        await cur.execute(
            """INSERT INTO candidates (job_id, file_hash, filename, file_path, raw_text, status)
               VALUES (%s, %s, %s, NULL, %s, 'pending') RETURNING id""",
            (str(job_id), f_hash, filename, text)
        )
        row = await cur.fetchone()
        candidate_ids.append(str(row[0]))

    for filename, f_hash, reason in invalid_items:
        await cur.execute(
            """INSERT INTO candidates (job_id, file_hash, filename, file_path, raw_text, status, error_type, error_reason)
               VALUES (%s, %s, %s, NULL, NULL, 'failed', 'user_fault', %s) RETURNING id""",
            (str(job_id), f_hash, filename, reason)
        )

    total_batch_count = len(candidate_ids) + len(invalid_items)
    await cur.execute(
        """INSERT INTO upload_batches (job_id, total_files, processed_files, status)
           VALUES (%s, %s, %s, %s) RETURNING id""",
        (str(job_id), total_batch_count, len(invalid_items), 'processing' if candidate_ids else 'completed')
    )
    batch_row = await cur.fetchone()
    batch_id = str(batch_row[0])

    if num_resumes > 0:
        if not is_unlimited:
            await cur.execute(
                "UPDATE users SET credits = credits - %s WHERE id = %s",
                (num_resumes, str(user["id"]))
            )
            await cur.execute(
                """INSERT INTO transactions
                   (user_id, amount_credits, amount_inr, transaction_type, status, reference_id, description)
                   VALUES (%s, %s, 0, 'deduction', 'success', %s, %s)""",
                (
                    str(user["id"]),
                    -num_resumes,
                    batch_id,
                    f"Resume Processing ({num_resumes} links) for '{job_title}'"
                )
            )
        else:
            await cur.execute("UPDATE users SET credits = 999999 WHERE id = %s", (str(user["id"]),))

    await conn.commit()

    if candidate_ids:
        await enqueue_batch_task(
            batch_id=batch_id,
            candidate_ids=candidate_ids,
            job_id=str(job_id),
            user_id=str(user["id"]),
            job_description=job_description,
            custom_prompt=custom_prompt
        )

    return UploadResponse(batch_id=batch_row[0], total_files=total_batch_count, message="Processing links started")


@router.get("/{job_id}/batch/{batch_id}", response_model=BatchStatusResponse)
async def get_batch_status(
    job_id: UUID,
    batch_id: UUID,
    user=Depends(get_current_user),
    db=Depends(get_db),
):
    conn, cur = db
    await cur.execute("SELECT id FROM jobs WHERE id = %s AND user_id = %s", (str(job_id), str(user["id"])))
    if not await cur.fetchone():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found")

    await cur.execute(
        "SELECT id, total_files, processed_files, status FROM upload_batches WHERE id = %s AND job_id = %s",
        (str(batch_id), str(job_id))
    )
    row = await cur.fetchone()
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Batch not found")

    return BatchStatusResponse(id=row[0], total_files=row[1], processed_files=row[2], status=row[3])
