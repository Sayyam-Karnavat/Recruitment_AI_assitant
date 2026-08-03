from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, BackgroundTasks, status

from database import get_db
from schemas import UploadResponse, BatchStatusResponse
from auth import get_current_user
from file_parser import compute_file_hash, is_valid_resume_file, is_zip_file, extract_files_from_zip
from config import settings
from background_tasks import process_batch

from pathlib import Path

router = APIRouter()


@router.post("/{job_id}/upload", response_model=UploadResponse)
async def upload_resumes(
    job_id: UUID,
    background_tasks: BackgroundTasks,
    files: list[UploadFile] = File(...),
    user=Depends(get_current_user),
    db=Depends(get_db),
):
    conn, cur = db

    # Verify job exists and belongs to user
    await cur.execute("SELECT id, description FROM jobs WHERE id = %s AND user_id = %s", (str(job_id), str(user["id"])))
    job_row = await cur.fetchone()
    if not job_row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found")

    job_description = job_row[1]

    # Create job upload directory
    job_dir = Path(settings.UPLOAD_DIR) / str(job_id)
    job_dir.mkdir(parents=True, exist_ok=True)

    candidate_ids = []

    for file in files:
        filename = file.filename or "unknown"
        raw_bytes = await file.read()

        if not raw_bytes:
            continue

        if is_zip_file(filename):
            try:
                extracted_paths = extract_files_from_zip(raw_bytes, job_dir)
            except ValueError as e:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

            for path in extracted_paths:
                file_bytes = path.read_bytes()
                file_hash = compute_file_hash(file_bytes)

                # Duplicate check
                await cur.execute(
                    "SELECT id FROM candidates WHERE job_id = %s AND file_hash = %s",
                    (str(job_id), file_hash)
                )
                if await cur.fetchone():
                    continue

                await cur.execute(
                    """INSERT INTO candidates (job_id, file_hash, filename, file_path, status)
                       VALUES (%s, %s, %s, %s, 'pending') RETURNING id""",
                    (str(job_id), file_hash, path.name, str(path))
                )
                row = await cur.fetchone()
                candidate_ids.append(str(row[0]))

        elif is_valid_resume_file(filename):
            file_hash = compute_file_hash(raw_bytes)

            # Duplicate check
            await cur.execute(
                "SELECT id FROM candidates WHERE job_id = %s AND file_hash = %s",
                (str(job_id), file_hash)
            )
            if await cur.fetchone():
                continue

            # Save file
            dest = job_dir / filename
            counter = 1
            while dest.exists():
                stem = Path(filename).stem
                suffix = Path(filename).suffix
                dest = job_dir / f"{stem}_{counter}{suffix}"
                counter += 1
            dest.write_bytes(raw_bytes)

            await cur.execute(
                """INSERT INTO candidates (job_id, file_hash, filename, file_path, status)
                   VALUES (%s, %s, %s, %s, 'pending') RETURNING id""",
                (str(job_id), file_hash, filename, str(dest))
            )
            row = await cur.fetchone()
            candidate_ids.append(str(row[0]))
        else:
            continue

    if not candidate_ids:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No valid new resume files found")

    # Create batch record
    await cur.execute(
        """INSERT INTO upload_batches (job_id, total_files, processed_files, status)
           VALUES (%s, %s, 0, 'processing') RETURNING id""",
        (str(job_id), len(candidate_ids))
    )
    batch_row = await cur.fetchone()
    batch_id = str(batch_row[0])
    await conn.commit()

    # Kick off background processing
    background_tasks.add_task(process_batch, batch_id, candidate_ids, job_description)

    return UploadResponse(batch_id=batch_row[0], total_files=len(candidate_ids), message="Processing started")


@router.get("/{job_id}/batch/{batch_id}", response_model=BatchStatusResponse)
async def get_batch_status(
    job_id: UUID,
    batch_id: UUID,
    user=Depends(get_current_user),
    db=Depends(get_db),
):
    conn, cur = db

    # Verify job belongs to user
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
