from pydantic import BaseModel, Field
from typing import Optional, Literal


class DocumentClassifier(BaseModel):
    """Classifies whether an uploaded document is a resume or not."""
    is_resume: bool = Field(..., description="True if the document is a resume/CV, False otherwise.")
    reason: str = Field(..., description="Brief reason for the classification decision.")


class ExtractedResume(BaseModel):
    """Structured data extracted from a resume."""
    candidate_name: str = Field(..., description="Full name of the candidate.")
    email: Optional[str] = Field(None, description="Email address if found.")
    phone: Optional[str] = Field(None, description="Phone/contact number if found.")
    location: Optional[str] = Field(None, description="Current location/city if found.")
    total_experience_years: int = Field(0, description="Total years of professional experience.", ge=0)
    current_role: Optional[str] = Field(None, description="Current or most recent job title.")
    skills: str = Field(..., description="Comma-separated list of all technical and soft skills.")
    education: str = Field(..., description="Brief education summary (degrees, institutions).")
    work_experience_summary: str = Field(..., description="Brief summary of work experience.")
    projects_summary: Optional[str] = Field(None, description="Brief summary of notable projects.")


class CandidateScore(BaseModel):
    """Score and rationale for a single candidate against a JD."""
    candidate_name: str = Field(..., description="Name of the candidate.")
    score: int = Field(..., description="Fit score from 0 to 100.", ge=0, le=100)
    rationale: str = Field(..., description="2-3 sentence explanation of why this score was given.")


class RankingResult(BaseModel):
    """Ranking results for all candidates."""
    rankings: list[CandidateScore] = Field(..., description="List of candidates sorted by score descending.")


class ResumeResult(BaseModel):
    """Final result for a single uploaded file."""
    filename: str
    status: Literal["accepted", "rejected"]
    candidate_name: Optional[str] = None
    rank: Optional[int] = None
    score: Optional[int] = None
    summary: Optional[str] = None
    rejection_reason: Optional[str] = None
