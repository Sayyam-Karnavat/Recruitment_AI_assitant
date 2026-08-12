"""
LLM Pipeline using LangChain + Groq.
Stage 1: Structured extraction from resume text.
Stage 2: Evaluation of candidate against job description.
"""

import asyncio
import logging
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type
from groq import RateLimitError, InternalServerError, APIConnectionError

from langchain_groq import ChatGroq
from langchain_core.prompts import ChatPromptTemplate

from config import settings
from schemas import ExtractedProfile, EvaluationResult

logger = logging.getLogger(__name__)

# Models to try in order (8B preferred, fallback to larger only if all fail)
FALLBACK_MODELS = [
    "llama-3.1-8b-instant",
    "gemma2-9b-it",
    "llama-3.3-70b-versatile",  # last resort
]


def _get_llm(model_name: str) -> ChatGroq:
    return ChatGroq(model=model_name, api_key=settings.GROQ_API_KEY, temperature=0.1, max_retries=2)


@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=2, max=10),
    retry=retry_if_exception_type((RateLimitError, InternalServerError, APIConnectionError)),
    reraise=True
)
def _invoke_with_fallback(chain_builder, input_data: dict):
    """Try chain across multiple models, using tenacity for retries."""
    last_error = None

    for model_name in FALLBACK_MODELS:
        try:
            llm = _get_llm(model_name)
            chain = chain_builder(llm)
            return chain.invoke(input_data)
        except Exception as e:
            last_error = e
            error_str = str(e).lower()

            if any(kw in error_str for kw in ["rate_limit", "quota", "429", "resource_exhausted"]):
                logger.warning(f"Model '{model_name}' rate limited, trying next...")
                continue
            
            if "connection" in error_str or "timeout" in error_str:
                logger.warning(f"Connection issue on '{model_name}', trying next...")
                continue
            
            # If not a recognized retryable error on this model, just move to the next model
            break

    raise RuntimeError(f"All models exhausted. Last error: {last_error}")


# ──────────────────────────────────────────────
# Stage 1: Extraction
# ──────────────────────────────────────────────

EXTRACTION_PROMPT = ChatPromptTemplate.from_messages([
    ("system", """You are an expert resume parser. Extract structured information from the resume text.
Only extract factual data present in the resume. Do not invent or assume information.
Focus on: name, contact info, current role, experience years, technical skills, work history, education, projects, certifications, achievements.
Skip: hobbies, soft skills, references, personal statements, objectives."""),
    ("human", "Extract structured data from this resume:\n\n{text}")
])


async def extract_profile(raw_text: str) -> ExtractedProfile | None:
    """Run LLM extraction on resume text. Returns structured profile or None on failure."""
    try:
        result = await asyncio.to_thread(
            _invoke_with_fallback,
            lambda llm: EXTRACTION_PROMPT | llm.with_structured_output(ExtractedProfile),
            {"text": raw_text[:5000]}  # Limit context to avoid token overflow
        )
        return result
    except Exception as e:
        logger.error(f"Extraction failed: {e}")
        return None


# ──────────────────────────────────────────────
# Stage 2: Evaluation
# ──────────────────────────────────────────────

EVALUATION_PROMPT = ChatPromptTemplate.from_messages([
    ("system", """You are an expert recruitment evaluator. Given a job description and a candidate's profile,
evaluate how well the candidate fits the role.

Score the candidate from 0-100 overall and provide per-category scores (0-10) for:
- Experience: Relevance and depth of work experience
- Skills: Technical skills match with JD requirements
- Projects: Relevant project work
- Education: Educational qualification fit
- Certifications: Relevant certifications
- Achievements: Notable accomplishments
- Domain Match: Overall domain/industry alignment

Provide a recommendation: "Strong Shortlist", "Shortlist", "Maybe", or "Reject".
Be fair, objective, and justify your scores."""),
    ("human", """Job Description:
{job_description}

Candidate Profile:
Name: {name}
Current Role: {current_role}
Experience: {experience_years} years
Skills: {skills}
Work Experience: {work_experience}
Education: {education}
Projects: {projects}
Certifications: {certifications}
Achievements: {achievements}

Evaluate this candidate against the job description.""")
])


async def evaluate_candidate(profile: ExtractedProfile, job_description: str) -> EvaluationResult | None:
    """Run LLM evaluation on a candidate profile against a JD."""
    try:
        input_data = {
            "job_description": job_description[:3000],
            "name": profile.name,
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
