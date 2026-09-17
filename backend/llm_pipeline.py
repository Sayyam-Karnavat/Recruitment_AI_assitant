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
from schemas import ExtractedProfile, EvaluationResult, FullCandidateScreeningResult

logger = logging.getLogger(__name__)

# Active, verified Azure deployment models (prioritizing high-speed gpt-4o-mini)
FALLBACK_MODELS = [
    "gpt-4o-mini",
    "gpt-4o"
]


def _invoke_with_fallback(chain_builder, input_data: dict):
    """Try chain across verified models, using structured output parser."""
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
# Single-Pass High-Speed Unified Screening
# (Extracts structured profile + Evaluates against JD in 1 call)
# ──────────────────────────────────────────────

UNIFIED_SCREENING_PROMPT = ChatPromptTemplate.from_messages([
    ("system", """You are an expert AI talent recruiter and screening evaluator.
Evaluate the candidate's resume against the Job Description in a SINGLE, FAST, HIGH-PRECISION pass.

Current Date: {current_date}

CRITICAL RULES:
1. DOCUMENT INTEGRITY VALIDATION:
   - First, check if the document is a legitimate candidate resume, CV, or professional bio/profile.
   - If the document is an electricity/utility bill, invoice, receipt, purchase order, salary slip, bank statement, tax document, random text, or unrelated non-resume document:
     Set `is_valid_resume = False`, `rejection_reason = "This file was rejected because it was not a valid resume document (detected as a utility bill, invoice, receipt, or non-resume document)."`, `overall_score = 0`, and leave profile fields null.
   - If it IS a legitimate resume/CV, set `is_valid_resume = True` and `rejection_reason = null`.

2. ACCURATE EXPERIENCE & TIMELINE:
   - Use {current_date} as the reference point for ongoing/current roles.
   - Calculate total professional experience years accurately across all non-overlapping roles up to {current_date}.
   - Express `total_experience_years` as a number (e.g. 3.0, 3.5, 4.0).
   - Keep work experience `description` strings concise (1 summary sentence per role).

3. SCORING & EVALUATION CRITERIA:
   {custom_prompt_section}
   - Score the candidate overall on a strict 0-100 scale based on how well their experience, skills, projects, and domain match the Job Description.
   - Provide categorical scores (0-10) for Experience, Skills, Projects, Education, Certifications, Achievements, Domain Match.
   - Keep category `rationale` strings crisp and concise (1 single sentence per category).
   - Provide a 2-sentence executive `summary`, 2-3 top `strengths`, and 1-2 `weaknesses` / `missing_skills`."""),
    ("human", """Job Description:
{job_description}

Candidate Resume Text:
{text}""")
])


async def screen_candidate_unified(raw_text: str, job_description: str, custom_prompt: str = None) -> FullCandidateScreeningResult | None:
    """Run single-pass unified extraction + evaluation on resume text against JD."""
    try:
        current_date_str = datetime.now().strftime("%B %Y")
        custom_prompt_section = f"USER CUSTOM EVALUATION CRITERIA:\n{custom_prompt}\n(Heavily weigh the above criteria when scoring.)\n" if custom_prompt else ""

        input_data = {
            "current_date": current_date_str,
            "custom_prompt_section": custom_prompt_section,
            "job_description": job_description[:3500],
            "text": raw_text[:6500]
        }

        result = await asyncio.to_thread(
            _invoke_with_fallback,
            lambda llm: UNIFIED_SCREENING_PROMPT | llm.with_structured_output(FullCandidateScreeningResult),
            input_data
        )
        return result
    except Exception as e:
        logger.error(f"Unified screening failed: {e}")
        return None


# ──────────────────────────────────────────────
# Legacy / Standalone Helpers (Preserved for compatibility)
# ──────────────────────────────────────────────

EXTRACTION_PROMPT = ChatPromptTemplate.from_messages([
    ("system", """You are an expert resume parser and document evaluator. Extract structured information from the resume text.
Only extract factual data actually present in the resume. Do not invent or assume any information.
If a field is not present in the resume, use null for that field.

Current Date: {current_date}

CRITICAL DOCUMENT VALIDATION RULES:
1. First, check if the document is a legitimate candidate resume, CV, or professional bio/profile.
2. If the document is an electricity/utility bill, invoice, receipt, purchase order, salary slip, bank statement, tax document, random text, or unrelated non-resume file:
   - Set `is_valid_resume = False`
   - Set `rejection_reason = "This file was rejected because it was not a valid resume document (detected as a utility bill, invoice, receipt, or non-resume document)."`
   - Set `name = null` and all other fields to null or defaults.
3. If and only if it IS a legitimate resume or CV, set `is_valid_resume = True` and `rejection_reason = null`, and extract the profile fields.

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


EVALUATION_PROMPT = ChatPromptTemplate.from_messages([
    ("system", """You are an expert recruitment evaluator. Evaluate the candidate against the job description.

Current Date Context: {current_date}

CRITICAL EVALUATION & EXPERIENCE CALCULATION RULES:
- Use Current Date ({current_date}) to evaluate ongoing roles ('Present' / 'Current').
- Calculate total experience accurately up to {current_date}.
- Do NOT falsely penalize a candidate for experience duration based on an outdated current year.

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
        custom_prompt_section = f"USER CUSTOM EVALUATION CRITERIA:\n{custom_prompt}\n(Heavily weigh the above criteria when scoring.)\n" if custom_prompt else ""

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

