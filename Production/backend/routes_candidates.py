from uuid import UUID
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from database import get_db
from models import User, Job, Candidate, CandidateProfile, Evaluation, EvaluationCategory
from schemas import CandidateListItem, CandidateDetailResponse, CandidateProfileResponse, EvaluationResponse, EvaluationCategoryResponse
from auth import get_current_user

router = APIRouter()


@router.get("/jobs/{job_id}/candidates", response_model=list[CandidateListItem])
async def list_candidates(
    job_id: UUID,
    sort_by: Optional[str] = Query("score", regex="^(score|name|date)$"),
    recommendation: Optional[str] = Query(None),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Verify job belongs to user
    result = await db.execute(select(Job).where(Job.id == job_id, Job.user_id == user.id))
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found")

    stmt = (
        select(Candidate)
        .options(selectinload(Candidate.profile), selectinload(Candidate.evaluation))
        .where(Candidate.job_id == job_id)
    )
    result = await db.execute(stmt)
    candidates = result.scalars().all()

    items = []
    for c in candidates:
        items.append(CandidateListItem(
            id=c.id,
            filename=c.filename,
            status=c.status,
            name=c.profile.name if c.profile else None,
            overall_score=c.evaluation.overall_score if c.evaluation else None,
            recommendation=c.evaluation.recommendation if c.evaluation else None,
            created_at=c.created_at,
        ))

    # Filter by recommendation
    if recommendation:
        items = [i for i in items if i.recommendation and i.recommendation.lower() == recommendation.lower()]

    # Sort
    if sort_by == "score":
        items.sort(key=lambda x: x.overall_score or 0, reverse=True)
    elif sort_by == "name":
        items.sort(key=lambda x: (x.name or "").lower())
    elif sort_by == "date":
        items.sort(key=lambda x: x.created_at, reverse=True)

    return items


@router.get("/candidates/{candidate_id}", response_model=CandidateDetailResponse)
async def get_candidate_detail(
    candidate_id: UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    stmt = (
        select(Candidate)
        .options(
            selectinload(Candidate.profile),
            selectinload(Candidate.evaluation).selectinload(Evaluation.categories),
        )
        .where(Candidate.id == candidate_id)
    )
    result = await db.execute(stmt)
    candidate = result.scalar_one_or_none()

    if not candidate:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Candidate not found")

    # Verify ownership through job
    job_result = await db.execute(select(Job).where(Job.id == candidate.job_id, Job.user_id == user.id))
    if not job_result.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    profile_response = None
    if candidate.profile:
        profile_response = CandidateProfileResponse.model_validate(candidate.profile)

    evaluation_response = None
    if candidate.evaluation:
        categories = [
            EvaluationCategoryResponse(category=c.category, score=c.score, rationale=c.rationale)
            for c in candidate.evaluation.categories
        ]
        evaluation_response = EvaluationResponse(
            overall_score=candidate.evaluation.overall_score,
            recommendation=candidate.evaluation.recommendation,
            summary=candidate.evaluation.summary,
            strengths=candidate.evaluation.strengths,
            weaknesses=candidate.evaluation.weaknesses,
            missing_skills=candidate.evaluation.missing_skills,
            categories=categories,
        )

    return CandidateDetailResponse(
        id=candidate.id,
        filename=candidate.filename,
        status=candidate.status,
        raw_text=candidate.raw_text,
        created_at=candidate.created_at,
        profile=profile_response,
        evaluation=evaluation_response,
    )
