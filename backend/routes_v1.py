import uuid
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks, UploadFile, File
from database import get_db
from schemas import JobCreate, JobResponse, UploadResponse, CandidateDetailResponse
from auth import get_api_key_user
from routes_jobs import create_job
from routes_upload import upload_resumes
from routes_candidates import get_candidate_detail as get_candidate

router = APIRouter()

@router.post("/jobs", response_model=JobResponse, summary="Create a new job", tags=["v1"])
async def v1_create_job(
    job: JobCreate,
    user=Depends(get_api_key_user),
    db=Depends(get_db)
):
    """Create a new job posting."""
    return await create_job(job, user, db)

@router.post("/jobs/{job_id}/upload", response_model=UploadResponse, summary="Upload resumes to a job", tags=["v1"])
async def v1_upload_resumes(
    job_id: uuid.UUID,
    background_tasks: BackgroundTasks,
    files: list[UploadFile] = File(...),
    user=Depends(get_api_key_user),
    db=Depends(get_db)
):
    """Upload one or more resumes (PDF, DOCX, ZIP) to be processed by the AI."""
    return await upload_resumes(job_id, background_tasks, files, user, db)

@router.get("/candidates/{candidate_id}", response_model=CandidateDetailResponse, summary="Get candidate evaluation", tags=["v1"])
async def v1_get_candidate(
    candidate_id: uuid.UUID,
    user=Depends(get_api_key_user),
    db=Depends(get_db)
):
    """Fetch the parsed profile and evaluation score of a candidate."""
    return await get_candidate(candidate_id, user, db)
