import uuid
from datetime import datetime
from pydantic import BaseModel, Field, EmailStr
from typing import Optional


# ──────────────────────────────────────────────
# Auth Schemas
# ──────────────────────────────────────────────

class UserRegister(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserResponse(BaseModel):
    id: uuid.UUID
    email: str
    created_at: datetime

    class Config:
        from_attributes = True


# ──────────────────────────────────────────────
# Job Schemas
# ──────────────────────────────────────────────

class JobCreate(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    description: str = Field(min_length=10)
    target_shortlist_count: int = Field(default=10, ge=1, le=100)


class JobUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    target_shortlist_count: Optional[int] = None
    status: Optional[str] = None  # active, archived


class JobResponse(BaseModel):
    id: uuid.UUID
    title: str
    description: str
    target_shortlist_count: int
    status: str
    created_at: datetime
    candidate_count: Optional[int] = 0

    class Config:
        from_attributes = True


# ──────────────────────────────────────────────
# Candidate Schemas
# ──────────────────────────────────────────────

class CandidateProfileResponse(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    location: Optional[str] = None
    current_role: Optional[str] = None
    total_experience_years: int = 0
    skills: Optional[list] = None
    work_experience: Optional[list] = None
    education: Optional[list] = None
    projects: Optional[list] = None
    certifications: Optional[list] = None
    achievements: Optional[list] = None

    class Config:
        from_attributes = True


class EvaluationCategoryResponse(BaseModel):
    category: str
    score: int
    rationale: Optional[str] = None

    class Config:
        from_attributes = True


class EvaluationResponse(BaseModel):
    overall_score: int
    recommendation: str
    summary: Optional[str] = None
    strengths: Optional[list] = None
    weaknesses: Optional[list] = None
    missing_skills: Optional[list] = None
    categories: list[EvaluationCategoryResponse] = []

    class Config:
        from_attributes = True


class CandidateListItem(BaseModel):
    id: uuid.UUID
    filename: str
    status: str
    name: Optional[str] = None
    overall_score: Optional[int] = None
    recommendation: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class CandidateDetailResponse(BaseModel):
    id: uuid.UUID
    filename: str
    status: str
    raw_text: Optional[str] = None
    created_at: datetime
    profile: Optional[CandidateProfileResponse] = None
    evaluation: Optional[EvaluationResponse] = None

    class Config:
        from_attributes = True


# ──────────────────────────────────────────────
# Upload / Batch Schemas
# ──────────────────────────────────────────────

class UploadResponse(BaseModel):
    batch_id: uuid.UUID
    total_files: int
    message: str


class BatchStatusResponse(BaseModel):
    id: uuid.UUID
    total_files: int
    processed_files: int
    status: str

    class Config:
        from_attributes = True


# ──────────────────────────────────────────────
# LLM Structured Output Schemas
# (Used with LangChain's with_structured_output)
# ──────────────────────────────────────────────

class WorkExperienceItem(BaseModel):
    company: Optional[str] = Field(None, description="Name of the company if present")
    role: Optional[str] = Field(None, description="Job title or role if present")
    duration: Optional[str] = Field(None, description="Duration of employment if present")
    description: Optional[str] = Field(None, description="Brief description of responsibilities if present")

class EducationItem(BaseModel):
    degree: Optional[str] = Field(None, description="Name of the degree if present")
    institution: Optional[str] = Field(None, description="Name of the university or institution if present")
    year: Optional[str] = Field(None, description="Year of graduation or duration if present")

class ProjectItem(BaseModel):
    title: Optional[str] = Field(None, description="Title of the project if present")
    description: Optional[str] = Field(None, description="Brief description of the project if present")
    technologies: Optional[list[str]] = Field(None, description="Technologies used in the project if present")

class ExtractedProfile(BaseModel):
    """Structured data extracted from a resume by the LLM."""
    name: Optional[str] = Field(None, description="Full name of the candidate if found")
    email: Optional[str] = Field(None, description="Email address if found")
    phone: Optional[str] = Field(None, description="Phone number if found")
    location: Optional[str] = Field(None, description="Current city/location if found")
    current_role: Optional[str] = Field(None, description="Current or most recent job title if found")
    total_experience_years: float = Field(0.0, description="Total years of professional experience", ge=0)
    skills: Optional[list[str]] = Field(None, description="List of technical skills")
    work_experience: Optional[list[WorkExperienceItem]] = Field(None, description="List of work experiences")
    education: Optional[list[EducationItem]] = Field(None, description="List of education entries")
    projects: Optional[list[ProjectItem]] = Field(None, description="List of projects")
    certifications: Optional[list[str]] = Field(None, description="List of certifications")
    achievements: Optional[list[str]] = Field(None, description="List of notable achievements")


class CategoryScore(BaseModel):
    """Score for a single evaluation category."""
    category: str = Field(description="Category name")
    score: int = Field(description="Score from 0 to 10", ge=0, le=10)
    rationale: str = Field(description="Brief explanation for this score")


class EvaluationResult(BaseModel):
    """Full evaluation result from the LLM."""
    overall_score: int = Field(description="Overall fit score from 0 to 100", ge=0, le=100)
    recommendation: str = Field(description="One of: Strong Shortlist, Shortlist, Maybe, Reject")
    summary: str = Field(description="Explanation of the overall assessment")
    strengths: Optional[list[str]] = Field(None, description="Key strengths of the candidate")
    weaknesses: Optional[list[str]] = Field(None, description="Key weaknesses or gaps")
    missing_skills: Optional[list[str]] = Field(None, description="Skills required by JD but missing from candidate")
    categories: Optional[list[CategoryScore]] = Field(None, description="Per-category scores")
