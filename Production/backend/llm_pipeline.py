"""
LLM Pipeline using LangChain + Groq.
Stage 1: Structured extraction from resume text.
Stage 2: Evaluation of candidate against job description.

Uses raw JSON output (no tool-calling) to avoid Groq 'failed_generation' errors.
"""

import asyncio
import json
import logging
import re
from datetime import datetime
from langchain_groq import ChatGroq
from langchain_core.prompts import ChatPromptTemplate
from pydantic import ValidationError

from config import settings
from schemas import ExtractedProfile, EvaluationResult

logger = logging.getLogger(__name__)

# Fallback models supporting json_object mode
FALLBACK_MODELS = [
    "qwen/qwen3.6-27b"
]


def _get_llm(model_name: str) -> ChatGroq:
    return ChatGroq(
        model=model_name,
        api_key=settings.GROQ_API_KEY,
        temperature=0.0,
        max_retries=1,
        max_tokens=4096,
    )


def _extract_json(text: str) -> dict:
    """Extract first JSON object from LLM text response."""
    try:
        return json.loads(text.strip())
    except json.JSONDecodeError:
        pass

    # Try markdown code fence
    match = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", text, re.DOTALL)
    if match:
        try:
            return json.loads(match.group(1))
        except json.JSONDecodeError:
            pass

    # Last resort: find first { ... } block
    match = re.search(r"\{.*\}", text, re.DOTALL)
    if match:
        try:
            return json.loads(match.group(0))
        except json.JSONDecodeError:
            pass

    raise ValueError(f"No valid JSON found in LLM response: {text[:300]}")


def _invoke_with_fallback(prompt: ChatPromptTemplate, input_data: dict) -> dict:
    """
    Invoke prompt across models, returning a raw dict.
    Uses response_format=json_object to force JSON output WITHOUT tool-calling.
    """
    last_error = None

    for model_name in FALLBACK_MODELS:
        try:
            llm = _get_llm(model_name)
            # Force raw JSON output — bypasses tool-calling entirely
            llm_json = llm.bind(response_format={"type": "json_object"})
            chain = prompt | llm_json
            response = chain.invoke(input_data)
            raw = response.content if hasattr(response, "content") else str(response)
            return _extract_json(raw)
        except Exception as e:
            last_error = e
            logger.warning(f"Model '{model_name}' failed with error: {e}, trying next model...")
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
- Keep work experience `description` strings concise (1-2 summary sentences per role) to fit output token limits.

Respond with ONLY a valid JSON object using this exact structure:
{{
  "name": "string or null",
  "email": "string or null",
  "phone": "string or null",
  "location": "string or null",
  "current_role": "string or null",
  "total_experience_years": 0.0,
  "skills": ["skill1", "skill2"],
  "work_experience": [
    {{
      "company": "string or null",
      "role": "string or null",
      "duration": "string or null",
      "description": "string or null"
    }}
  ],
  "education": [
    {{
      "degree": "string or null",
      "institution": "string or null",
      "year": "string or null"
    }}
  ],
  "projects": [
    {{
      "title": "string or null",
      "description": "string or null",
      "technologies": ["tech1"]
    }}
  ],
  "certifications": ["cert1"],
  "achievements": ["achievement1"]
}}"""),
    ("human", "Extract structured data from this resume:\n\n{text}")
])


async def extract_profile(raw_text: str) -> ExtractedProfile | None:
    """Run LLM extraction on resume text. Returns structured profile or None on failure."""
    try:
        current_date_str = datetime.now().strftime("%B %Y")
        raw_dict = await asyncio.to_thread(
            _invoke_with_fallback,
            EXTRACTION_PROMPT,
            {"text": raw_text[:6000], "current_date": current_date_str},
        )
        return ExtractedProfile.model_validate(raw_dict)
    except (ValidationError, ValueError, RuntimeError) as e:
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
- Evaluate total years across all work experience and project history. If total experience meets or exceeds the required years in the job description, score the Experience category appropriately and do not reject solely on experience duration.

Respond with ONLY a valid JSON object using this exact structure:
{{
  "overall_score": 75,
  "recommendation": "Shortlist",
  "summary": "2-3 sentence overall assessment of the candidate.",
  "strengths": ["strength1", "strength2"],
  "weaknesses": ["weakness1", "weakness2"],
  "missing_skills": ["skill1", "skill2"],
  "categories": [
    {{"category": "Experience", "score": 7, "rationale": "explanation"}},
    {{"category": "Skills", "score": 6, "rationale": "explanation"}},
    {{"category": "Projects", "score": 5, "rationale": "explanation"}},
    {{"category": "Education", "score": 8, "rationale": "explanation"}},
    {{"category": "Certifications", "score": 3, "rationale": "explanation"}},
    {{"category": "Achievements", "score": 7, "rationale": "explanation"}},
    {{"category": "Domain Match", "score": 6, "rationale": "explanation"}}
  ]
}}

Rules:
- overall_score must be an integer between 0 and 100
- recommendation must be exactly one of: "Strong Shortlist", "Shortlist", "Maybe", "Reject"
- All 7 categories must be included
- category score must be an integer between 0 and 10
- Be fair, objective, and base your evaluation strictly on the information provided."""),
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


async def evaluate_candidate(profile: ExtractedProfile, job_description: str) -> EvaluationResult | None:
    """Run LLM evaluation on a candidate profile against a JD."""
    try:
        current_date_str = datetime.now().strftime("%B %Y")
        input_data = {
            "current_date": current_date_str,
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

        raw_dict = await asyncio.to_thread(
            _invoke_with_fallback,
            EVALUATION_PROMPT,
            input_data,
        )
        return EvaluationResult.model_validate(raw_dict)
    except (ValidationError, ValueError, RuntimeError) as e:
        logger.error(f"Evaluation failed: {e}")
        return None
