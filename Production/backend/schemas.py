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
    company: str = Field(description="Name of the company")
    role: str = Field(description="Job title or role")
    duration: str = Field(description="Duration of employment")
    description: str = Field(description="Brief description of responsibilities and achievements")

class EducationItem(BaseModel):
    degree: str = Field(description="Name of the degree")
    institution: str = Field(description="Name of the university or institution")
    year: str = Field(description="Year of graduation or duration")

class ProjectItem(BaseModel):
    title: str = Field(description="Title of the project")
    description: str = Field(description="Brief description of the project")
    technologies: list[str] = Field(default_factory=list, description="Technologies used in the project")

class ExtractedProfile(BaseModel):
    """Structured data extracted from a resume by the LLM."""
    name: str = Field(description="Full name of the candidate")
    email: Optional[str] = Field(None, description="Email address if found")
    phone: Optional[str] = Field(None, description="Phone number if found")
    location: Optional[str] = Field(None, description="Current city/location if found")
    current_role: Optional[str] = Field(None, description="Current or most recent job title")
    total_experience_years: int = Field(0, description="Total years of professional experience", ge=0)
    skills: list[str] = Field(default_factory=list, description="List of technical skills")
    work_experience: list[WorkExperienceItem] = Field(default_factory=list, description="List of work experiences")
    education: list[EducationItem] = Field(default_factory=list, description="List of education entries")
    projects: list[ProjectItem] = Field(default_factory=list, description="List of projects")
    certifications: list[str] = Field(default_factory=list, description="List of certifications")
    achievements: list[str] = Field(default_factory=list, description="List of notable achievements")


class CategoryScore(BaseModel):
    """Score for a single evaluation category."""
    category: str = Field(description="Category name: Experience, Skills, Projects, Education, Certifications, Achievements, or Domain Match")
    score: int = Field(description="Score from 0 to 10", ge=0, le=10)
    rationale: str = Field(description="Brief explanation for this score")


class EvaluationResult(BaseModel):
    """Full evaluation result from the LLM."""
    overall_score: int = Field(description="Overall fit score from 0 to 100", ge=0, le=100)
    recommendation: str = Field(description="One of: Strong Shortlist, Shortlist, Maybe, Reject")
    summary: str = Field(description="2-3 sentence explanation of the overall assessment")
    strengths: list[str] = Field(default_factory=list, description="Key strengths of the candidate")
    weaknesses: list[str] = Field(default_factory=list, description="Key weaknesses or gaps")
    missing_skills: list[str] = Field(default_factory=list, description="Skills required by JD but missing from candidate")
    categories: list[CategoryScore] = Field(default_factory=list, description="Per-category scores")
