from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, BackgroundTasks, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from models import User, Job, Candidate, UploadBatch
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
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Verify job exists and belongs to user
    result = await db.execute(select(Job).where(Job.id == job_id, Job.user_id == user.id))
    job = result.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found")

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
            # Extract files from ZIP
            try:
                extracted_paths = extract_files_from_zip(raw_bytes, job_dir)
            except ValueError as e:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

            for path in extracted_paths:
                file_bytes = path.read_bytes()
                file_hash = compute_file_hash(file_bytes)

                # Duplicate check
                existing = await db.execute(
                    select(Candidate).where(Candidate.job_id == job_id, Candidate.file_hash == file_hash)
                )
                if existing.scalar_one_or_none():
                    continue

                candidate = Candidate(
                    job_id=job_id, file_hash=file_hash,
                    filename=path.name, file_path=str(path), status="pending"
                )
                db.add(candidate)
                await db.flush()
                candidate_ids.append(candidate.id)

        elif is_valid_resume_file(filename):
            file_hash = compute_file_hash(raw_bytes)

            # Duplicate check
            existing = await db.execute(
                select(Candidate).where(Candidate.job_id == job_id, Candidate.file_hash == file_hash)
            )
            if existing.scalar_one_or_none():
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

            candidate = Candidate(
                job_id=job_id, file_hash=file_hash,
                filename=filename, file_path=str(dest), status="pending"
            )
            db.add(candidate)
            await db.flush()
            candidate_ids.append(candidate.id)
        else:
            # Skip unsupported files silently
            continue

    if not candidate_ids:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No valid new resume files found")

    # Create batch record
    batch = UploadBatch(job_id=job_id, total_files=len(candidate_ids), processed_files=0, status="processing")
    db.add(batch)
    await db.commit()
    await db.refresh(batch)

    # Kick off background processing
    background_tasks.add_task(process_batch, batch.id, candidate_ids, job.description)

    return UploadResponse(batch_id=batch.id, total_files=len(candidate_ids), message="Processing started")


@router.get("/{job_id}/batch/{batch_id}", response_model=BatchStatusResponse)
async def get_batch_status(
    job_id: UUID,
    batch_id: UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Verify job belongs to user
    result = await db.execute(select(Job).where(Job.id == job_id, Job.user_id == user.id))
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found")

    result = await db.execute(select(UploadBatch).where(UploadBatch.id == batch_id, UploadBatch.job_id == job_id))
    batch = result.scalar_one_or_none()
    if not batch:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Batch not found")

    return batch
