# Resume Shortlisting Platform - Implementation Plan

## Goal Description
Build an MVP AI-powered Resume Shortlisting platform prioritizing speed, accuracy, transparency, and simplicity. It allows HR to create jobs, upload candidate resumes (PDF/DOCX), automatically extract content via a two-stage pipeline, evaluate candidates against the JD using structured categories, and rank candidates with clear AI explainability.

## User Feedback Incorporated
> [!NOTE]
> - **Authentication**: We will proceed with a simple local email/password authentication using JWT tokens and the `users` table until the product is verified.
> - **Folder Restructuring**: The entire repository will be explicitly restructured into two main directories: `/frontend` and `/backend`. The existing files will be moved/removed accordingly.
> - **Database Configuration**: A `.env` file template will be provided with `DATABASE_URL=postgresql://postgres:<your_password>@localhost:5432/Resume_Shortlisting`.
> - **Background Processing**: We will use standard FastAPI `async` endpoints. While LLM inference is I/O bound and won't block the server, we will use simple `BackgroundTasks` to prevent client-side HTTP timeouts during bulk uploads, allowing the frontend to poll for progress updates.

## Product Requirements Document (PRD)

### Vision
An intentionally simple, production-ready Resume Shortlisting tool for HR, removing the friction of manual screening.

### User Personas
- **Primary Persona:** HR Recruiter. Wants to quickly process 50-100 resumes for a newly posted role, filter out junk, and shortlist the top candidates with clear justification for why they fit the JD.

### User Journeys
1. **Job Creation:** HR logs in -> clicks "Create Job" -> enters Job Title -> pastes Job Description text -> sets "Target Shortlist Count" (e.g., top 10) -> saves Job.
2. **Resume Upload:** HR opens the Job -> clicks "Upload Resumes" -> drags & drops 50 PDF/DOCX files -> clicks "Analyze".
3. **Review & Action:** System processes resumes. HR sees a ranked list of candidates with overall fit scores (0-100), recommendations, and reasons. HR clicks a candidate to view category breakdown. HR exports the shortlist as CSV.

### Core Features (MVP)
- **Job Management:** Create jobs with JD.
- **Bulk Resume Upload:** Drag-and-drop file upload, duplicate detection, valid file type check (PDF, DOCX).
- **Two-Stage AI Pipeline:**
  1. *Extraction*: PyMuPDF/python-docx + LLM extraction into structured JSON (skills, experience, projects).
  2. *Evaluator*: LLM compares parsed JSON to JD, scoring categories, assigning an overall fit score and recommendation.
- **Candidate Ranking & Filtering:** Sort by fit score, filter by recommendation.
- **Explainable Scoring:** Display reasoning for each category and overall recommendation.
- **Export:** CSV export of shortlisted candidates.

## Database Schema (PostgreSQL)

- **users**
  - id (UUID, PK)
  - email (String, Unique)
  - password_hash (String)
  - created_at (Timestamp)

- **jobs**
  - id (UUID, PK)
  - user_id (UUID, FK -> users.id)
  - title (String)
  - description (Text)
  - target_shortlist_count (Int, default 10)
  - created_at (Timestamp)

- **candidates**
  - id (UUID, PK)
  - job_id (UUID, FK -> jobs.id)
  - name (String)
  - email (String, nullable)
  - phone (String, nullable)
  - status (Enum: pending, parsed, evaluated, failed, rejected_format)
  - created_at (Timestamp)

- **candidate_files**
  - id (UUID, PK)
  - candidate_id (UUID, FK -> candidates.id)
  - filename (String)
  - file_path (String) # Local storage path
  - file_hash (String) # MD5/SHA256 for duplicate detection
  - raw_text (Text) # Deterministic text extraction
  - structured_data (JSONB) # LLM structured extraction (Stage 1)

- **evaluations**
  - id (UUID, PK)
  - candidate_id (UUID, FK -> candidates.id)
  - overall_score (Int, 0-100)
  - recommendation (Enum: Strong Shortlist, Shortlist, Maybe, Reject)
  - summary_explanation (Text)
  - strengths (JSONB)
  - weaknesses (JSONB)
  - missing_skills (JSONB)

- **evaluation_scores**
  - id (UUID, PK)
  - evaluation_id (UUID, FK -> evaluations.id)
  - category (String: Experience, Skills, Projects, Education, Certifications, Achievements, Communication, Domain Match)
  - score (Int, 0-10)
  - rationale (Text)

## API Endpoints (FastAPI)
- `POST /api/auth/register` (Create test user)
- `POST /api/auth/login` (Returns JWT)
- `GET /api/jobs`
- `POST /api/jobs`
- `GET /api/jobs/{job_id}`
- `POST /api/jobs/{job_id}/upload` - Bulk upload resumes
- `GET /api/jobs/{job_id}/candidates` - Get candidates and evaluations
- `GET /api/candidates/{candidate_id}` - Get full candidate detail & reasoning
- `GET /api/jobs/{job_id}/export` - Export candidates as CSV

## Folder Structure
```
root/
├── backend/                  # ALL Python code moves here
│   ├── alembic/              # DB migrations
│   ├── app/
│   │   ├── api/              # API routers
│   │   ├── core/             # Config, security, DB setup
│   │   ├── models/           # SQLAlchemy models
│   │   ├── schemas/          # Pydantic models (Input/Output/LLM Structured)
│   │   ├── services/         # Business logic (Resume Parsing, AI Pipeline)
│   │   └── utils/            # Helper functions
│   ├── .env.example          # Contains DATABASE_URL template
│   ├── tests/
│   ├── requirements.txt
│   └── main.py               # FastAPI entrypoint
├── frontend/                 # ALL React code moves here
│   ├── public/
│   ├── src/
│   │   ├── components/       # Reusable shadcn/ui components
│   │   ├── pages/            # Dashboard, JobDetails, CandidateDetails
│   │   ├── services/         # Axios API clients
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── package.json
│   ├── tailwind.config.js
│   └── vite.config.ts
├── uploads/                  # Local storage for files MVP
└── README.md
```

## UI Wireframes (Textual)
- **Dashboard (/):** Minimal view showing "Active Jobs" as cards. A prominent "+" button to "Create Job".
- **Create Job Modal:** Form fields: Job Title, Job Description (TextArea), Target Shortlist Count (Dropdown/Number).
- **Job View (/jobs/:id):** 
  - Top: Job details and target count.
  - Middle: Big drag-and-drop zone (I Love PDF style) for "Upload Resumes".
  - Bottom: Data table of Candidates (Name, Score, Recommendation, Status).
- **Candidate Detail Panel (Slide-out or Modal):**
  - Left side: View of parsed resume / original text.
  - Right side: Score (e.g. 85/100), Recommendation badge (Strong Shortlist). Radar chart or progress bars for categories (Experience 9/10, Skills 8/10). List of strengths, weaknesses, and missing skills.

## Risks and Trade-offs
1. **LLM Latency & Cost:** Processing many resumes synchronously is slow.
   *Mitigation:* Provide real-time UI updates via polling. Utilize smaller models for the extraction stage to save cost/time, and Llama 3.3 70B for the scoring stage.
2. **Duplicate Uploads:** Uploading the same resume twice.
   *Mitigation:* Hash files upon upload and skip if hash exists for the same `job_id`.

## Task Breakdown

### Phase 1: Setup & DB Foundation
- **Task 1.1:** Restructure repository into `/frontend` and `/backend`.
- **Task 1.2:** Setup Backend structure (FastAPI, SQLAlchemy, Alembic, PostgreSQL connection via `.env`).
- **Task 1.3:** Define SQLAlchemy models (Users, Jobs, Candidates, CandidateFiles, Evaluations, EvaluationScores).
- **Task 1.4:** Setup Frontend structure (React, Vite, Tailwind, shadcn/ui).
- **Task 1.5:** Setup basic API routing and simple Auth (JWT).

### Phase 2: Core Job Management & Parsing
- **Task 2.1:** Implement Job Creation & Listing APIs.
- **Task 2.2:** Build File Upload API with Duplicate Detection (MD5 hashing) and Validation (PDF/DOCX).
- **Task 2.3:** Implement Deterministic Parser (PyMuPDF, docx2txt) to extract raw text and save to DB.

### Phase 3: AI Pipeline (Two-Stage)
- **Task 3.1:** Implement LLM Structured Extraction (Stage 1) -> extracts skills, exp into `structured_data`.
- **Task 3.2:** Implement LLM Evaluation & Scoring (Stage 2) -> calculates scores dynamically based on JD & Role.
- **Task 3.3:** Integrate Background Tasks to process uploads asynchronously without blocking the client.

### Phase 4: Frontend Development
- **Task 4.1:** Build Dashboard & Job Creation UI.
- **Task 4.2:** Build Drag-and-Drop Resume Upload UI.
- **Task 4.3:** Build Candidates List (Ranked, Filterable).
- **Task 4.4:** Build Candidate Detail View (Explainable AI reasoning).

### Phase 5: Polish & Export
- **Task 5.1:** Implement CSV Export API.
- **Task 5.2:** Add Frontend CSV Export Button and overall UI polish.
