# Resume Shortlisting Platform — Design & Implementation Plan

## 1. Vision

An intentionally simple, production-ready AI Resume Shortlisting tool for HR recruiters. Upload resumes in bulk, get ranked candidates with explainable AI scoring against any job description.

---

## 2. Finalized Decisions

| Topic | Decision |
|-------|----------|
| Auth | Local email/password with JWT (no OAuth until product is verified) |
| Database | PostgreSQL via SQLAlchemy + Alembic migrations |
| LLM Provider | Groq (free tier with model fallback) |
| LLM Models | Llama 3.1 8B Instant for extraction AND scoring (no 70B) |
| AI Framework | LangChain + LangGraph with structured output parsers |
| File Upload | PDF, DOCX, and ZIP (containing PDF/DOCX) |
| Export | CSV + PDF export of shortlisted candidates |
| Background Processing | FastAPI BackgroundTasks (polling from frontend) |
| Backend Structure | Flat — single folder, modularized at file level |
| Frontend | React + Vite + Tailwind + shadcn/ui |
| Storage | All meaningful candidate data persisted in PostgreSQL |

---

## 3. User Personas & Journeys

**Primary Persona:** HR Recruiter processing 50–100 resumes per role.

### Journeys

1. **Landing** → Sees product value prop → Clicks "Get Started" → Registers/Logs in.
2. **Job Creation** → Dashboard → "Create Job" → Enters title, description, target shortlist count → Saves.
3. **Resume Upload** → Opens job → Drags PDFs/DOCX/ZIP into upload zone → Clicks "Analyze".
4. **Review** → Sees ranked candidate list with scores → Clicks candidate for detailed breakdown → Exports shortlist as CSV/PDF.

---

## 4. Database Schema (PostgreSQL)

```sql
-- users
id              UUID PRIMARY KEY
email           VARCHAR UNIQUE NOT NULL
password_hash   VARCHAR NOT NULL
created_at      TIMESTAMP DEFAULT NOW()

-- jobs
id                      UUID PRIMARY KEY
user_id                 UUID FK → users.id
title                   VARCHAR NOT NULL
description             TEXT NOT NULL
target_shortlist_count  INT DEFAULT 10
status                  VARCHAR DEFAULT 'active'  -- active, archived
created_at              TIMESTAMP DEFAULT NOW()

-- candidates
id              UUID PRIMARY KEY
job_id          UUID FK → jobs.id
file_hash       VARCHAR NOT NULL          -- SHA256 for duplicate detection
filename        VARCHAR NOT NULL
file_path       VARCHAR NOT NULL          -- local storage path
raw_text        TEXT                      -- deterministic text extraction
status          VARCHAR DEFAULT 'pending' -- pending, parsed, evaluated, failed
created_at      TIMESTAMP DEFAULT NOW()

-- candidate_profiles (structured extraction — Stage 1 output)
id                      UUID PRIMARY KEY
candidate_id            UUID FK → candidates.id (UNIQUE)
name                    VARCHAR
email                   VARCHAR
phone                   VARCHAR
location                VARCHAR
current_role            VARCHAR
total_experience_years  INT DEFAULT 0
skills                  JSONB       -- ["Python", "React", "AWS"]
work_experience         JSONB       -- [{company, role, duration, description}]
education               JSONB       -- [{degree, institution, year}]
projects                JSONB       -- [{title, description, technologies}]
certifications          JSONB       -- ["AWS SAA", "PMP"]
achievements            JSONB       -- ["Led team of 10", "Increased revenue 30%"]

-- evaluations (Stage 2 output)
id                      UUID PRIMARY KEY
candidate_id            UUID FK → candidates.id (UNIQUE)
overall_score           INT CHECK (0-100)
recommendation          VARCHAR     -- Strong Shortlist, Shortlist, Maybe, Reject
summary                 TEXT        -- Overall reasoning
strengths               JSONB       -- ["5+ years React", "AWS certified"]
weaknesses              JSONB       -- ["No backend experience"]
missing_skills          JSONB       -- ["Kubernetes", "CI/CD"]

-- evaluation_categories (per-category scores)
id              UUID PRIMARY KEY
evaluation_id   UUID FK → evaluations.id
category        VARCHAR     -- Experience, Skills, Projects, Education, Certifications, Achievements, Domain Match
score           INT CHECK (0-10)
rationale       TEXT

-- upload_batches (track bulk upload progress)
id              UUID PRIMARY KEY
job_id          UUID FK → jobs.id
total_files     INT
processed_files INT DEFAULT 0
status          VARCHAR DEFAULT 'processing' -- processing, completed, failed
created_at      TIMESTAMP DEFAULT NOW()
```

**What we extract & store:** Name, email, phone, location, current role, years of experience, technical skills, work experience (structured), education, projects, certifications, achievements.

**What we skip:** Hobbies, soft skills, references, personal statements, objectives.

---

## 5. API Endpoints

```
Auth:
  POST   /api/auth/register
  POST   /api/auth/login

Jobs:
  GET    /api/jobs                        — List user's jobs
  POST   /api/jobs                        — Create job
  GET    /api/jobs/{job_id}               — Job detail
  PATCH  /api/jobs/{job_id}               — Update job (archive, edit)

Upload & Processing:
  POST   /api/jobs/{job_id}/upload        — Upload resumes (PDF/DOCX/ZIP)
  GET    /api/jobs/{job_id}/batch/{batch_id} — Poll batch progress

Candidates:
  GET    /api/jobs/{job_id}/candidates    — List candidates (ranked, filterable)
  GET    /api/candidates/{candidate_id}   — Full candidate detail + evaluation

Export:
  GET    /api/jobs/{job_id}/export/csv    — CSV export
  GET    /api/jobs/{job_id}/export/pdf    — PDF export
```

---

## 6. AI Pipeline (LangChain + LangGraph)

### Stage 1: Extraction
- **Input:** Raw text from PyMuPDF / python-docx
- **Model:** `llama-3.1-8b-instant` on Groq
- **Output:** Structured `CandidateProfile` (Pydantic model → stored in `candidate_profiles`)
- **Method:** `ChatGroq.with_structured_output()` via LangChain

### Stage 2: Evaluation
- **Input:** Candidate structured profile + Job Description
- **Model:** `llama-3.1-8b-instant` on Groq
- **Output:** `EvaluationResult` with overall score, recommendation, category scores, strengths/weaknesses
- **Method:** LangGraph workflow node that processes each candidate, allowing batch parallelism

### Fallback Strategy
Models tried in order: `llama-3.1-8b-instant` → `gemma2-9b-it` → `llama-3.3-70b-versatile` (last resort only)

Rate limit handling: catch 429, rotate to next model. Connection errors: retry once with 3s delay.

---

## 7. ZIP Upload Safety

Allowing ZIP upload with these safeguards:
- Max ZIP size: 50MB
- Max files inside ZIP: 100
- Only extract `.pdf` and `.docx` files (skip everything else silently)
- Reject nested ZIPs
- Validate extracted file sizes (max 10MB per file)
- Use `zipfile` module with path traversal protection (reject entries with `..` or absolute paths)

---

## 8. Frontend Architecture

### Pages
| Route | Page | Auth Required |
|-------|------|---------------|
| `/` | Landing page (product marketing) | No |
| `/login` | Login / Register | No |
| `/dashboard` | Job listing + create | Yes |
| `/jobs/:id` | Job detail — upload zone + candidate table | Yes |
| `/jobs/:id/candidates/:cid` | Candidate detail (slide-out or page) | Yes |

### Layout (Authenticated)
- **Navbar:** Logo, user avatar/dropdown, logout
- **Sidebar:** Navigation — Dashboard, All Jobs, Settings (collapsible)
- **Main content:** Context-dependent

### Design Principles
- Clean, minimal, modern (inspired by Linear/Notion aesthetic)
- Light mode default
- Responsive (mobile-friendly)
- Accessible (WCAG 2.1 AA baseline)
- SEO-optimized landing page (meta tags, semantic HTML, Open Graph)

### Key UI Components
- Drag-and-drop upload zone (iLovePDF style)
- Data table with sorting/filtering for candidates
- Score visualization (progress bars + color coding)
- Candidate detail panel with category breakdown
- Toast notifications for async operations
- Batch progress indicator (polling)

---

## 9. Folder Structure (Final)

```
root/
├── backend/
│   ├── main.py              — FastAPI app, router registration, startup
│   ├── config.py            — Settings, env loading
│   ├── database.py          — SQLAlchemy engine, session, Base
│   ├── models.py            — All SQLAlchemy models
│   ├── schemas.py           — All Pydantic schemas (request/response/LLM)
│   ├── auth.py              — JWT creation, password hashing, auth dependencies
│   ├── routes_auth.py       — Auth endpoints (register, login)
│   ├── routes_jobs.py       — Job CRUD endpoints
│   ├── routes_upload.py     — Upload + batch polling endpoints
│   ├── routes_candidates.py — Candidate listing + detail endpoints
│   ├── routes_export.py     — CSV/PDF export endpoints
│   ├── file_parser.py       — PDF/DOCX/ZIP text extraction
│   ├── llm_pipeline.py      — LangChain/LangGraph AI pipeline
│   ├── background_tasks.py  — Async processing logic
│   ├── requirements.txt
│   ├── .env.example
│   ├── alembic.ini
│   └── alembic/
│       ├── env.py
│       └── versions/
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── components/      — Reusable UI (Button, Card, Table, Upload, etc.)
│   │   ├── pages/           — Landing, Login, Dashboard, JobDetail, CandidateDetail
│   │   ├── layouts/         — AuthLayout (navbar+sidebar), PublicLayout
│   │   ├── services/        — API client (axios), auth helpers
│   │   ├── hooks/           — Custom React hooks
│   │   ├── lib/             — Utility functions
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── index.html
│   ├── package.json
│   ├── tailwind.config.ts
│   ├── vite.config.ts
│   └── tsconfig.json
├── uploads/                  — Local file storage (gitignored)
└── README.md
```

---

## 10. Environment Variables (.env.example)

```env
# Database
DATABASE_URL=postgresql://postgres:your_password@localhost:5432/Resume_Shortlisting

# Auth
JWT_SECRET_KEY=your-secret-key-here
JWT_ALGORITHM=HS256
JWT_EXPIRY_MINUTES=1440

# LLM
GROQ_API_KEY=your-groq-api-key

# Storage
UPLOAD_DIR=../uploads

# Server
HOST=0.0.0.0
PORT=8000
```

---

## 11. Improvements Added

These are additions beyond the original spec that improve the product:

1. **Upload Batches table** — Tracks progress of bulk uploads so frontend can poll and show real-time progress bars.
2. **Job archiving** — `status` field on jobs so HR can archive old roles without deleting data.
3. **Candidate deduplication per job** — SHA256 file hash checked per job_id to prevent re-processing.
4. **Separate `candidate_profiles` table** — Normalized storage of structured extraction (not just JSONB blob) for future querying/filtering across jobs.
5. **Category-level scoring** — Stored in `evaluation_categories` for radar-chart visualization and granular filtering.
6. **Landing page** — SEO-optimized marketing page to make the product feel complete and professional.
7. **Collapsible sidebar** — Better UX for smaller screens while maintaining navigation.

---

## 12. Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| LLM latency on bulk uploads | BackgroundTasks + polling UI with progress bar |
| Groq rate limits | Model fallback chain + retry logic |
| ZIP bomb / malicious files | Size limits, file count limits, path traversal protection |
| Duplicate resumes | SHA256 hash check per job |
| LLM hallucination in scoring | Structured output schemas enforce format; category rationale provides transparency |
| 8B model accuracy | Acceptable for MVP; upgrade path to larger models is trivial (config change) |
