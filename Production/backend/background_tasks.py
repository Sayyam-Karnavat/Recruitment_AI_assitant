"""
Background processing: parse files, extract structured data, evaluate candidates.
Runs asynchronously via FastAPI BackgroundTasks.
"""

import logging
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from database import async_session
from models import Candidate, CandidateProfile, Evaluation, EvaluationCategory, UploadBatch
from file_parser import extract_text
from llm_pipeline import extract_profile, evaluate_candidate

logger = logging.getLogger(__name__)


async def process_batch(batch_id: UUID, candidate_ids: list[UUID], job_description: str):
    """Process all candidates in a batch: extract text → LLM parse → LLM evaluate."""
    async with async_session() as db:
        try:
            for candidate_id in candidate_ids:
                try:
                    await process_single_candidate(db, candidate_id, job_description)
                except Exception as e:
                    logger.error(f"Failed to process candidate {candidate_id}: {e}")
                    # Mark candidate as failed
                    result = await db.execute(select(Candidate).where(Candidate.id == candidate_id))
                    candidate = result.scalar_one_or_none()
                    if candidate:
                        candidate.status = "failed"
                        await db.commit()

                # Update batch progress
                result = await db.execute(select(UploadBatch).where(UploadBatch.id == batch_id))
                batch = result.scalar_one_or_none()
                if batch:
                    batch.processed_files += 1
                    await db.commit()

            # Mark batch complete
            result = await db.execute(select(UploadBatch).where(UploadBatch.id == batch_id))
            batch = result.scalar_one_or_none()
            if batch:
                batch.status = "completed"
                await db.commit()

        except Exception as e:
            logger.error(f"Batch {batch_id} failed: {e}")
            result = await db.execute(select(UploadBatch).where(UploadBatch.id == batch_id))
            batch = result.scalar_one_or_none()
            if batch:
                batch.status = "failed"
                await db.commit()


async def process_single_candidate(db: AsyncSession, candidate_id: UUID, job_description: str):
    """Full pipeline for one candidate: text extraction → LLM extraction → LLM evaluation."""
    result = await db.execute(select(Candidate).where(Candidate.id == candidate_id))
    candidate = result.scalar_one_or_none()
    if not candidate:
        return

    # Step 1: Extract raw text from file
    raw_text = extract_text(candidate.file_path)
    if not raw_text or len(raw_text) < 50:
        candidate.status = "failed"
        await db.commit()
        return

    candidate.raw_text = raw_text

    # Step 2: LLM structured extraction
    profile_data = await extract_profile(raw_text)
    if not profile_data:
        candidate.status = "failed"
        await db.commit()
        return

    candidate.status = "parsed"
    profile = CandidateProfile(
        candidate_id=candidate.id,
        name=profile_data.name,
        email=profile_data.email,
        phone=profile_data.phone,
        location=profile_data.location,
        current_role=profile_data.current_role,
        total_experience_years=profile_data.total_experience_years,
        skills=profile_data.skills,
        work_experience=profile_data.work_experience,
        education=profile_data.education,
        projects=profile_data.projects,
        certifications=profile_data.certifications,
        achievements=profile_data.achievements,
    )
    db.add(profile)
    await db.commit()

    # Step 3: LLM evaluation against JD
    eval_result = await evaluate_candidate(profile_data, job_description)
    if not eval_result:
        candidate.status = "parsed"  # Still parsed, just not evaluated
        await db.commit()
        return

    candidate.status = "evaluated"
    evaluation = Evaluation(
        candidate_id=candidate.id,
        overall_score=eval_result.overall_score,
        recommendation=eval_result.recommendation,
        summary=eval_result.summary,
        strengths=eval_result.strengths,
        weaknesses=eval_result.weaknesses,
        missing_skills=eval_result.missing_skills,
    )
    db.add(evaluation)
    await db.flush()

    # Save category scores
    for cat in eval_result.categories:
        category = EvaluationCategory(
            evaluation_id=evaluation.id,
            category=cat.category,
            score=cat.score,
            rationale=cat.rationale,
        )
        db.add(category)

    await db.commit()
