"""
Developer API v1 (API-Key Authenticated).
Provides programmatic endpoints for integrating ATS/CRM systems with ResumeAI.
"""

import uuid
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks, UploadFile, File, Query

from database import get_db
from schemas import (
    JobCreate, JobResponse, UploadResponse,
    CandidateDetailResponse, CandidateListItem, BatchStatusResponse
)
from auth import get_api_key_user
from routes_jobs import create_job, list_jobs, get_job
from routes_upload import upload_resumes, get_batch_status
from routes_candidates import get_candidate_detail, list_candidates
from routes_wallet import get_wallet_balance

router = APIRouter()


@router.post("/jobs", response_model=JobResponse, summary="Create a new job", tags=["Developer APIs (v1)"])
async def v1_create_job(
    job: JobCreate,
    user=Depends(get_api_key_user),
    db=Depends(get_db)
):
    """Create a new job posting with target shortlist criteria and custom evaluation prompt."""
    return await create_job(job, user, db)


@router.get("/jobs", response_model=list[JobResponse], summary="List all jobs", tags=["Developer APIs (v1)"])
async def v1_list_jobs(
    user=Depends(get_api_key_user),
    db=Depends(get_db)
):
    """List all active and closed job postings belonging to the API key owner."""
    return await list_jobs(user, db)


@router.get("/jobs/{job_id}", response_model=JobResponse, summary="Get job details", tags=["Developer APIs (v1)"])
async def v1_get_job(
    job_id: uuid.UUID,
    user=Depends(get_api_key_user),
    db=Depends(get_db)
):
    """Retrieve metadata and candidate count for a specific job."""
    return await get_job(job_id, user, db)


@router.post("/jobs/{job_id}/upload", response_model=UploadResponse, summary="Upload resumes to a job", tags=["Developer APIs (v1)"])
async def v1_upload_resumes(
    job_id: uuid.UUID,
    background_tasks: BackgroundTasks,
    files: list[UploadFile] = File(...),
    user=Depends(get_api_key_user),
    db=Depends(get_db)
):
    """
    Upload one or more candidate resumes (PDF, DOCX, or ZIP archive).
    Resumes are validated, text extracted in memory, and asynchronously evaluated by the AI pipeline.
    """
    return await upload_resumes(job_id, background_tasks, files, user, db)


@router.get("/jobs/{job_id}/batch/{batch_id}", response_model=BatchStatusResponse, summary="Get upload batch progress", tags=["Developer APIs (v1)"])
async def v1_get_batch_status(
    job_id: uuid.UUID,
    batch_id: uuid.UUID,
    user=Depends(get_api_key_user),
    db=Depends(get_db)
):
    """Check asynchronous AI screening progress for an uploaded batch of resumes."""
    return await get_batch_status(job_id, batch_id, user, db)


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


@router.get("/wallet/balance", summary="Get remaining credit balance", tags=["Developer APIs (v1)"])
async def v1_get_wallet_balance(
    user=Depends(get_api_key_user),
    db=Depends(get_db)
):
    """Check available resume screening credits on the API key account."""
    return await get_wallet_balance(user, db)
