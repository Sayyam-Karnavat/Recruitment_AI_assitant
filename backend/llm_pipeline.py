"""
LLM Pipeline using LangChain + Groq.
Stage 1: Structured extraction from resume text.
Stage 2: Evaluation of candidate against job description.
"""

import asyncio
import logging
from datetime import datetime
from langchain_openai import AzureChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
import os
from config import settings
from schemas import ExtractedProfile, EvaluationResult

logger = logging.getLogger(__name__)

# Fallback models configuration
FALLBACK_MODELS = [
    "gpt-4o",
    "gpt-4o-mini",
    "gpt-4"
]




def _invoke_with_fallback(chain_builder, input_data: dict):
    """Try chain across multiple models, using structured output parser."""
    last_error = None

    for deployment_name in FALLBACK_MODELS:
        try:
            llm = AzureChatOpenAI(
                azure_endpoint=settings.AZURE_OPENAI_ENDPOINT,
                api_key=settings.AZURE_OPENAI_API_KEY,
                api_version="2024-12-01-preview",
                azure_deployment=deployment_name,
                temperature=0.0,
                max_retries=1,
                max_tokens=4096,
            )
            chain = chain_builder(llm)
            return chain.invoke(input_data)
        except Exception as e:
            last_error = e
            error_str = str(e).lower()

            if any(kw in error_str for kw in ["rate_limit", "quota", "429", "resource_exhausted"]):
                logger.warning(f"Deployment '{deployment_name}' rate limited, trying next...")
                continue
            
            if "connection" in error_str or "timeout" in error_str:
                logger.warning(f"Connection issue on '{deployment_name}', trying next...")
                continue
            
            logger.warning(f"Deployment '{deployment_name}' failed with error: {e}, trying next deployment...")
            continue

    raise RuntimeError(f"All models exhausted. Last error: {last_error}")


# ──────────────────────────────────────────────
# Stage 1: Extraction
# ──────────────────────────────────────────────

EXTRACTION_PROMPT = ChatPromptTemplate.from_messages([
    ("system", """You are an expert resume parser. Extract structured information from the resume text.
Only extract factual data actually present in the resume. Do not invent or assume any information.
If a field is not present in the resume, use null for that field.

Current Date: {current_date}

CRITICAL RULES FOR CALCULATING `total_experience_years`:
- Use the Current Date ({current_date}) as the ending reference point for any role marked "Present", "Current", or ongoing.
- Calculate total professional experience by summing the duration of all non-overlapping work experience roles up to {current_date}.
- Include relevant technical experience from education/projects if part of overall career history, but focus primarily on work history timeline.
- If a start date is missing or marked '[Start Date]', infer start time based on preceding education or work timeline.
- Express `total_experience_years` as a number (e.g. 3.0, 3.5, 4.0).
- Keep work experience `description` strings concise (1-2 summary sentences per role)."""),
    ("human", "Extract structured data from this resume:\n\n{text}")
])


async def extract_profile(raw_text: str) -> ExtractedProfile | None:
    """Run LLM extraction on resume text. Returns structured profile or None on failure."""
    try:
        current_date_str = datetime.now().strftime("%B %Y")
        result = await asyncio.to_thread(
            _invoke_with_fallback,
            lambda llm: EXTRACTION_PROMPT | llm.with_structured_output(ExtractedProfile),
            {"text": raw_text[:6000], "current_date": current_date_str}
        )
        return result
    except Exception as e:
        logger.error(f"Extraction failed: {e}")
        return None


# ──────────────────────────────────────────────
# Stage 2: Evaluation
# ──────────────────────────────────────────────

EVALUATION_PROMPT = ChatPromptTemplate.from_messages([
    ("system", """You are an expert recruitment evaluator. Evaluate the candidate against the job description.

Current Date Context: {current_date}

CRITICAL EVALUATION & EXPERIENCE CALCULATION RULES:
- Use Current Date ({current_date}) to evaluate ongoing roles ('Present' / 'Current').
- Calculate total experience accurately up to {current_date}. For instance, a candidate working from Feb 2024 to Nov 2025 plus an ongoing role or education timeline must be evaluated up to {current_date}.
- Do NOT falsely penalize a candidate for experience duration based on an outdated current year.
Evaluate total years across all work experience and project history. If total experience meets or exceeds the required years in the job description, score the Experience category appropriately and do not reject solely on experience duration.

{custom_prompt_section}

Provide per-category scores (0-10) for Experience, Skills, Projects, Education, Certifications, Achievements, Domain Match.
Provide an overall_score (0-100) and recommendation ("Strong Shortlist", "Shortlist", "Maybe", "Reject")."""),
    ("human", """Job Description:
{job_description}

Candidate Profile:
Name: {name}
Current Role: {current_role}
Total Experience: {experience_years} years
Skills: {skills}
Work Experience: {work_experience}
Education: {education}
Projects: {projects}
Certifications: {certifications}
Achievements: {achievements}

Evaluate this candidate against the job description.""")
])


async def evaluate_candidate(profile: ExtractedProfile, job_description: str, custom_prompt: str = None) -> EvaluationResult | None:
    """Run LLM evaluation on a candidate profile against a JD."""
    try:
        current_date_str = datetime.now().strftime("%B %Y")
        custom_prompt_section = f"USER CUSTOM EVALUATION CRITERIA:\n{custom_prompt}\n(Heavily weigh the above criteria when scoring and making your recommendation.)\n" if custom_prompt else ""

        input_data = {
            "current_date": current_date_str,
            "custom_prompt_section": custom_prompt_section,
            "job_description": job_description[:3000],
            "name": profile.name or "Unknown",
            "current_role": profile.current_role or "Not specified",
            "experience_years": profile.total_experience_years,
            "skills": ", ".join(profile.skills) if profile.skills else "None listed",
            "work_experience": str(profile.work_experience)[:1500] if profile.work_experience else "None listed",
            "education": str(profile.education)[:500] if profile.education else "None listed",
            "projects": str(profile.projects)[:800] if profile.projects else "None listed",
            "certifications": ", ".join(profile.certifications) if profile.certifications else "None",
            "achievements": ", ".join(profile.achievements) if profile.achievements else "None",
        }

        result = await asyncio.to_thread(
            _invoke_with_fallback,
            lambda llm: EVALUATION_PROMPT | llm.with_structured_output(EvaluationResult),
            input_data
        )
        return result
    except Exception as e:
        logger.error(f"Evaluation failed: {e}")
        return None

