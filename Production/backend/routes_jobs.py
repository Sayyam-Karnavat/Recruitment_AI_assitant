from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from models import User, Job, Candidate
from schemas import JobCreate, JobUpdate, JobResponse
from auth import get_current_user

router = APIRouter()


@router.post("", response_model=JobResponse, status_code=status.HTTP_201_CREATED)
async def create_job(body: JobCreate, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    job = Job(user_id=user.id, title=body.title, description=body.description, target_shortlist_count=body.target_shortlist_count)
    db.add(job)
    await db.commit()
    await db.refresh(job)
    return JobResponse(
        id=job.id, title=job.title, description=job.description,
        target_shortlist_count=job.target_shortlist_count, status=job.status,
        created_at=job.created_at, candidate_count=0
    )


@router.get("", response_model=list[JobResponse])
async def list_jobs(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    # Get jobs with candidate count
    stmt = (
        select(Job, func.count(Candidate.id).label("candidate_count"))
        .outerjoin(Candidate, Candidate.job_id == Job.id)
        .where(Job.user_id == user.id)
        .group_by(Job.id)
        .order_by(Job.created_at.desc())
    )
    result = await db.execute(stmt)
    rows = result.all()

    return [
        JobResponse(
            id=job.id, title=job.title, description=job.description,
            target_shortlist_count=job.target_shortlist_count, status=job.status,
            created_at=job.created_at, candidate_count=count
        )
        for job, count in rows
    ]


@router.get("/{job_id}", response_model=JobResponse)
async def get_job(job_id: UUID, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    stmt = (
        select(Job, func.count(Candidate.id).label("candidate_count"))
        .outerjoin(Candidate, Candidate.job_id == Job.id)
        .where(Job.id == job_id, Job.user_id == user.id)
        .group_by(Job.id)
    )
    result = await db.execute(stmt)
    row = result.first()

    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found")

    job, count = row
    return JobResponse(
        id=job.id, title=job.title, description=job.description,
        target_shortlist_count=job.target_shortlist_count, status=job.status,
        created_at=job.created_at, candidate_count=count
    )


@router.patch("/{job_id}", response_model=JobResponse)
async def update_job(job_id: UUID, body: JobUpdate, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Job).where(Job.id == job_id, Job.user_id == user.id))
    job = result.scalar_one_or_none()

    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found")

    update_data = body.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(job, key, value)

    await db.commit()
    await db.refresh(job)

    return JobResponse(
        id=job.id, title=job.title, description=job.description,
        target_shortlist_count=job.target_shortlist_count, status=job.status,
        created_at=job.created_at, candidate_count=0
    )
