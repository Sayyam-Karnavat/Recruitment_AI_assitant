# Task List — Resume Shortlisting Platform

All code lives in `Production/` folder. MVP/ remains untouched.

---

## Phase 1: Project Setup & Foundation

### Task 1.1 — Project Structure Setup ✅
- [x] Created `Production/backend/`, `Production/frontend/`, `Production/uploads/`
- [x] Updated `.gitignore`

### Task 1.2 — Backend Skeleton ✅
- [x] `backend/main.py` — FastAPI app with CORS, router includes
- [x] `backend/config.py` — Pydantic Settings from .env
- [x] `backend/database.py` — SQLAlchemy async engine, session, Base
- [x] `backend/requirements.txt` — No versions (uv resolves)
- [x] `backend/.env.example`

### Task 1.3 — Database Models & Migrations ✅
- [x] `backend/models.py` — All models (users, jobs, candidates, candidate_profiles, evaluations, evaluation_categories, upload_batches)
- [x] Alembic setup (alembic.ini, env.py, script.py.mako, versions/)
- [ ] Run `alembic revision --autogenerate -m "initial"` (requires DB connection — manual step)

### Task 1.4 — Pydantic Schemas ✅
- [x] `backend/schemas.py` — Auth, Job, Candidate, Upload, LLM output schemas

### Task 1.5 — Auth System ✅
- [x] `backend/auth.py` — JWT + bcrypt + get_current_user dependency
- [x] `backend/routes_auth.py` — Register, Login, Me endpoints

---

## Phase 2: Core Backend APIs

### Task 2.1 — Job CRUD ✅
- [x] `backend/routes_jobs.py` — GET/POST/PATCH jobs with candidate count

### Task 2.2 — File Parser ✅
- [x] `backend/file_parser.py` — PDF (PyMuPDF), DOCX (python-docx), ZIP extraction with safety

### Task 2.3 — Upload & Batch Processing ✅
- [x] `backend/routes_upload.py` — Upload endpoint + batch polling
- [x] `backend/background_tasks.py` — Async pipeline orchestration

---

## Phase 3: AI Pipeline

### Task 3.1 — LLM Extraction ✅
- [x] `backend/llm_pipeline.py` — Stage 1 extraction with structured output

### Task 3.2 — LLM Evaluation ✅
- [x] Stage 2 evaluation with category scoring

### Task 3.3 — Integration ✅
- [x] Wired into background_tasks.py with status flow

---

## Phase 4: Candidate & Export APIs

### Task 4.1 — Candidate Endpoints ✅
- [x] `backend/routes_candidates.py` — List (sorted/filtered) + detail with evaluation

### Task 4.2 — Export Endpoints ✅
- [x] `backend/routes_export.py` — CSV + PDF export (reportlab)

---

## Phase 5: Frontend Setup

### Task 5.1 — Frontend Scaffold ✅
- [x] React + Vite + TypeScript (`package.json`, `vite.config.ts`, `tsconfig.json`)
- [x] Tailwind CSS + shadcn/ui color tokens (`tailwind.config.ts`, `postcss.config.js`, `index.css`)
- [x] Routing (React Router in `App.tsx`)
- [x] API client with JWT interceptor (`services/api.ts`)
- [x] Auth hook/context (`hooks/useAuth.tsx`)

### Task 5.2 — Layouts & Auth Pages ✅
- [x] `layouts/PublicLayout.tsx`
- [x] `layouts/AuthLayout.tsx` — Navbar + collapsible sidebar
- [x] `pages/Landing.tsx` — Hero, features, CTA
- [x] `pages/Login.tsx` — Login/Register toggle

---

## Phase 6: Frontend Core Features

### Task 6.1 — Dashboard ✅
- [x] `pages/Dashboard.tsx` — Job cards, create modal, empty state

### Task 6.2 — Job Detail ✅
- [x] `pages/JobDetail.tsx` — Upload zone (drag-drop), progress polling, candidate table

### Task 6.3 — Candidate Detail ✅
- [x] `pages/CandidateDetail.tsx` — Score, categories, strengths/weaknesses, skills

### Task 6.4 — Export & Polish
- [x] Export buttons on JobDetail page
- [ ] Install dependencies and run (manual step)

---

## Phase 7: Manual Steps (You)

### To get running:

**Backend:**
```bash
cd Production/backend
# Copy .env.example to .env and fill in your values
cp .env.example .env

# Install dependencies
uv pip install -r requirements.txt

# Create database (make sure PostgreSQL is running)
# CREATE DATABASE Resume_Shortlisting;

# Run migrations
alembic revision --autogenerate -m "initial"
alembic upgrade head

# Start server
python main.py
```

**Frontend:**
```bash
cd Production/frontend
npm install
npm run dev
```

Then open http://localhost:5173 — register an account, create a job, upload resumes.
