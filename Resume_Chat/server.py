"""
FastAPI server for Resume Screening POC.
Two endpoints: post a job description, upload & screen resumes.
"""

from fastapi import FastAPI, UploadFile, HTTPException, File
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse, FileResponse
import logging
import uuid

from langchain_core.prompts import ChatPromptTemplate
from utils import parse_uploaded_file
from llm import invoke_with_fallback, get_classifier_chain, get_extractor_chain, get_ranking_chain
from schemas import ResumeResult

from dotenv import load_dotenv

load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Resume Screening POC")
app.mount("/static", StaticFiles(directory="Static"), name="static")

# In-memory store for job descriptions (POC - no database needed)
job_store: dict = {}


PLACEHOLDER_JD = """Senior Full Stack Developer - Remote

About the Role:
We are looking for a Senior Full Stack Developer with 3+ years of experience to join our engineering team. You will be responsible for building and maintaining web applications, collaborating with cross-functional teams, and mentoring junior developers.

Requirements:
- 3+ years of professional experience in full-stack web development
- Strong proficiency in Python (FastAPI/Django/Flask) for backend
- Frontend experience with React.js or Vue.js
- Experience with relational databases (PostgreSQL, MySQL)
- Familiarity with cloud services (AWS/GCP/Azure)
- Experience with Docker and CI/CD pipelines
- Strong understanding of RESTful API design
- Git version control

Nice to Have:
- Experience with TypeScript
- Knowledge of microservices architecture
- Experience with Redis, message queues
- Contributions to open-source projects

What We Offer:
- Competitive salary
- Fully remote work
- Learning & development budget
- Flexible working hours
"""


@app.get("/", response_class=FileResponse)
async def serve_frontend():
    return FileResponse("Static/index.html")


@app.get("/placeholder-jd")
async def get_placeholder_jd():
    """Return placeholder JD text for quick testing."""
    return JSONResponse({"jd_text": PLACEHOLDER_JD})


@app.post("/api/post-job")
async def api_post_job(body: dict):
    """HR posts a job description text. Returns a job_id."""
    jd_text = body.get("jd_text", "").strip()
    if not jd_text:
        raise HTTPException(status_code=400, detail="Job description text is required.")

    job_id = str(uuid.uuid4())[:8]
    job_store[job_id] = {
        "jd_text": jd_text,
        "results": []
    }
    logger.info(f"[JOB {job_id}] Job description posted ({len(jd_text)} chars)")
    return JSONResponse({"success": True, "job_id": job_id})


@app.post("/api/upload-resumes/{job_id}")
async def upload_resumes(job_id: str, files: list[UploadFile] = File(...)):
    """
    Upload 1-3 resume files, classify, extract, rank against JD.
    """
    # Validate job exists
    if job_id not in job_store:
        raise HTTPException(status_code=404, detail="Job not found. Post a job description first.")

    # Validate file count
    if len(files) > 3:
        raise HTTPException(status_code=400, detail="Maximum 3 files allowed for this POC.")
    if len(files) == 0:
        raise HTTPException(status_code=400, detail="At least 1 file is required.")

    jd_text = job_store[job_id]["jd_text"]
    results: list[ResumeResult] = []
    accepted_candidates: list[dict] = []  # {filename, extracted_data}

    for file in files:
        filename = file.filename or "unknown"
        ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""

        # Validate file type
        if ext not in {"pdf", "docx"}:
            results.append(ResumeResult(
                filename=filename,
                status="rejected",
                rejection_reason=f"Unsupported file type: .{ext}. Only PDF and DOCX are accepted."
            ))
            continue

        # Read and parse file
        raw_bytes = await file.read()
        if not raw_bytes:
            results.append(ResumeResult(
                filename=filename,
                status="rejected",
                rejection_reason="File is empty."
            ))
            continue

        text = parse_uploaded_file(file, raw_bytes)
        if not text or len(text) < 50:
            results.append(ResumeResult(
                filename=filename,
                status="rejected",
                rejection_reason="The uploaded file does not appear to be a valid resume. Could not extract readable content."
            ))
            continue

        # Step 1: Classify - Is this a resume?
        logger.info(f"[JOB {job_id}] Classifying '{filename}'...")
        classify_prompt = ChatPromptTemplate.from_messages([
            ("system", """You are a document classifier. Determine if the given text is a resume/CV or not.
A resume typically contains: candidate name, contact info, work experience, skills, education, projects.
Documents that are NOT resumes: job descriptions, cover letters, articles, invoices, policies, random text."""),
            ("human", "Classify this document:\n\n{text}\n\nIs this a resume?")
        ])

        try:
            classification = invoke_with_fallback(
                lambda llm: classify_prompt | llm.with_structured_output(schema=__import__('schemas', fromlist=['DocumentClassifier']).DocumentClassifier),
                {"text": text[:3000]}  # Limit text to avoid token issues
            )
        except Exception as e:
            logger.error(f"[JOB {job_id}] Classification failed for '{filename}': {e}")
            results.append(ResumeResult(
                filename=filename,
                status="rejected",
                rejection_reason=f"Unable to verify the document. Please check your internet connection and try again."
            ))
            continue

        if not classification.is_resume:
            results.append(ResumeResult(
                filename=filename,
                status="rejected",
                rejection_reason=f"The uploaded document was not identified as a resume. {classification.reason}"
            ))
            continue

        # Step 2: Extract structured data from resume
        logger.info(f"[JOB {job_id}] Extracting data from '{filename}'...")
        extract_prompt = ChatPromptTemplate.from_messages([
            ("system", """You are an expert resume parser. Extract structured information from the resume text provided.
If a field is not found, use a reasonable default or leave it empty."""),
            ("human", "Extract data from this resume:\n\n{text}")
        ])

        try:
            extracted = invoke_with_fallback(
                lambda llm: extract_prompt | llm.with_structured_output(schema=__import__('schemas', fromlist=['ExtractedResume']).ExtractedResume),
                {"text": text[:4000]}
            )
            accepted_candidates.append({
                "filename": filename,
                "extracted": extracted
            })
        except Exception as e:
            logger.error(f"[JOB {job_id}] Extraction failed for '{filename}': {e}")
            results.append(ResumeResult(
                filename=filename,
                status="rejected",
                rejection_reason=f"Could not process the resume. Please check your connection and try again."
            ))
            continue

    # Step 3: Rank accepted candidates against JD
    if accepted_candidates:
        logger.info(f"[JOB {job_id}] Ranking {len(accepted_candidates)} candidates...")

        # Build candidate summaries for ranking prompt
        candidate_summaries = ""
        for i, c in enumerate(accepted_candidates, 1):
            ex = c["extracted"]
            candidate_summaries += f"""
--- Candidate {i}: {ex.candidate_name} ---
Current Role: {ex.current_role or 'Not specified'}
Experience: {ex.total_experience_years} years
Skills: {ex.skills}
Education: {ex.education}
Work Experience: {ex.work_experience_summary}
Projects: {ex.projects_summary or 'None listed'}
"""

        ranking_prompt = ChatPromptTemplate.from_messages([
            ("system", """You are an expert recruitment evaluator. Given a job description and candidate profiles, 
score each candidate from 0-100 based on how well they fit the job requirements.
Consider: relevant skills match, years of experience, education fit, and project relevance.
Be fair and objective. Return rankings sorted by score descending."""),
            ("human", """Job Description:
{jd_text}

Candidates:
{candidates}

Score and rank each candidate.""")
        ])

        try:
            from schemas import RankingResult
            ranking = invoke_with_fallback(
                lambda llm: ranking_prompt | llm.with_structured_output(schema=RankingResult),
                {"jd_text": jd_text, "candidates": candidate_summaries}
            )

            # Map rankings back to results
            for rank_idx, scored in enumerate(ranking.rankings, 1):
                # Find matching candidate by name
                matched_file = None
                for c in accepted_candidates:
                    if c["extracted"].candidate_name.lower().strip() == scored.candidate_name.lower().strip():
                        matched_file = c["filename"]
                        break

                # Fallback: match by index if name matching fails
                if not matched_file and rank_idx <= len(accepted_candidates):
                    matched_file = accepted_candidates[rank_idx - 1]["filename"]

                if matched_file:
                    results.append(ResumeResult(
                        filename=matched_file,
                        status="accepted",
                        candidate_name=scored.candidate_name,
                        rank=rank_idx,
                        score=scored.score,
                        summary=scored.rationale
                    ))

        except Exception as e:
            logger.error(f"[JOB {job_id}] Ranking failed: {e}")
            # If ranking fails, still return accepted candidates without scores
            for c in accepted_candidates:
                results.append(ResumeResult(
                    filename=c["filename"],
                    status="accepted",
                    candidate_name=c["extracted"].candidate_name,
                    score=None,
                    rank=None,
                    summary=f"Skills: {c['extracted'].skills[:100]}... (Ranking unavailable)"
                ))

    # Store results
    job_store[job_id]["results"] = [r.model_dump() for r in results]

    # Sort: accepted first (by rank), rejected last
    sorted_results = sorted(
        [r.model_dump() for r in results],
        key=lambda x: (0 if x["status"] == "accepted" else 1, x.get("rank") or 999)
    )

    return JSONResponse({"success": True, "results": sorted_results})


if __name__ == "__main__":
    import uvicorn

    port = 3333
    logger.info(f"Starting Resume Screening POC on port {port}")
    uvicorn.run(
        "server:app",
        host="0.0.0.0",
        port=port,
        reload=True,
        log_level="info"
    )
