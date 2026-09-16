# Sprint Documentation: Recruitment AI Assistant 
**Status:** In Progress (Phase 2 Completed → Production Hardening Sprint)  
**Target Scale:** 1,000 Recruiters (~2,000 Active Jobs, 100,000–200,000 Resumes, 2,500 Burst Concurrency)  

---

## 1. Product Vision & Architecture Overview

### The Product
An enterprise-grade, AI-powered recruitment intelligence platform that automates resume screening, ranks candidates based on customizable criteria, provides developer APIs for ATS/CRM integration, and offers a secure candidate self-application portal with gamified anonymous leaderboards.

### The Problem We Solve
Traditional ATS systems rely on naive regex or keyword searches, causing qualified talent to be filtered out while keyword-stuffed resumes pass. We utilize semantic LLM reasoning to evaluate actual work experience, technical depth, project quality, and role compatibility in seconds.

---

## 2. Milestone Status & Completed Features

### ✅ Phase 1: Core Engine & API Gateway [COMPLETED]
- [x] **LLM Pipeline Hardening:** High-precision resume parsing and candidate evaluation with structured Pydantic schemas.
- [x] **Developer API Gateway (`/v1`):** REST API endpoints (`POST /v1/jobs`, `POST /v1/jobs/{id}/upload`, `GET /v1/candidates/{id}`).
- [x] **API Key Management:** Hashed API keys (`rk_live_...`) with creation and revocation in Developer Settings.
- [x] **Real-Time Webhooks:** Event dispatcher notifying external CRMs/ATS upon candidate evaluation completion (`candidate.evaluated`).
- [x] **Candidate Feedback Loop:** Recruiter "Flag as Incorrect" reporting mechanism with database storage.
- [x] **Custom System Criteria:** Dynamic job-specific prompt instructions (e.g., focus on years of experience, specific frameworks).

### ✅ Phase 2: In-Memory Streaming, Queuing & Monetization [COMPLETED]
- [x] **In-Memory Streaming & Zero-Disk Storage (Option A):** Uploaded files (PDF, DOCX, ZIP) and remote URLs stream directly to memory, extract text into DB, and immediately discard file buffers (0 bytes retained on disk).
- [x] **Task Queue Engine:** Built `queue_manager.py` with dual-mode support: Redis (`rpush`/`blpop`) for Render/production and async worker pool for local zero-dependency development.
- [x] **Real-Time WebSockets:** Replaced 2-second HTTP polling with `/ws/jobs/{id}` broadcasting live progress and evaluation updates.
- [x] **Guarded Credit Wallet:** 
  - 1 Credit = 1 Resume Screened.
  - Strict fault guardrail: **System errors** (LLM timeout, API quota) automatically **refund 1 credit** with an audit log. **User errors** (unreadable document) consume credit.
- [x] **Razorpay Integration:** Backend endpoints for order creation, signature verification, and mock sandbox mode.
- [x] **HR Candidate Search Filter:** Live candidate search by name or filename directly inside `JobDetail.tsx`.

---

## 3. Production Go-Live Sprint Backlog (Active Sprint)

### 1. Complete UI/UX Modernization & Developer Portal Overhaul
- **Developer Documentation (`/developer-docs`):** Dedicated 3-pane documentation layout (Stripe / Mintlify style):
  - Left Pane: Navigation hierarchy (Getting Started, Authentication, Jobs API, Resumes API, Webhooks, Errors).
  - Center Pane: Clean typography, endpoints description, parameter tables.
  - Right Pane: Dark-mode interactive code terminal (cURL, Python, Node.js) with copy buttons and sample response payloads.
- **Landing Page (`Landing.tsx`):** High-converting SaaS aesthetics, interactive sandbox preview, feature matrix, live benchmark comparison vs legacy ATS, and pricing calculator.
- **Auth Pages (`Login.tsx`):** Modern split-screen layout with product value props on left, dual social sign-in (**Google SSO & GitHub OAuth**) on right, and "50 Free Welcome Credits" callout badge.
- **Dashboard & Navigation:** Modernized job cards with pipeline metrics, shortlist percentage, and activity timeline.

### 2. Advanced Bulk Ingestion (Recursive ZIP, Google Drive, OneDrive)
- **Recursive ZIP Unpacker:** Support arbitrary nested directory structures inside ZIP files (e.g. `2026/Tech/Backend/Candidate.pdf`), automatically filtering and extracting only `.pdf` and `.docx` files while ignoring system files (`__MACOSX`, `.DS_Store`).
- **Cloud Drive Recursive Scraper:** Enhance Google Drive and Microsoft OneDrive folder link ingestion to recursively traverse subfolders and batch-download all discovered resumes into memory.
- **Sequential Stream-Parse-Discard:** Process files from ZIP archives sequentially one-by-one so RAM usage never exceeds a single resume (~2MB), preventing Render 1GB memory/disk overflow.

### 3. Candidate Experience: Portal, Anonymous Leaderboard & Anti-Cheat Lock
- **Google SSO & GitHub OAuth for Candidates (Anti-Gaming Guard):** Candidates must sign in via Google SSO or GitHub OAuth before submitting on `/careers/:jobId`. Database enforcement: `UNIQUE(job_id, candidate_email)` prevents candidates from repeatedly testing altered resumes to game the AI evaluation.
- **Anonymous Candidate Leaderboard & Feedback:** Post-submission dashboard for candidates displaying their percentile rank (e.g., *"Rank #4 of 72 applicants — Top 6%"*), application status, and personalized strengths/missing skills summary without leaking other applicants' names or personal details.

### 4. Razorpay Subscriptions & Prepaid Billing Realignment
- **Cost Realignment:** Update unit pricing to **₹2 per resume evaluation** (e.g., ₹200 for 100 credits, ₹500 for 250 credits, ₹1,000 for 500 credits).
- **Dual Monetization Model:**
  - **Pay-As-You-Go:** Instant one-time wallet credit recharge via Razorpay Checkout.
  - **Monthly Subscriptions:** Razorpay Subscriptions API for recurring plans (Starter: ₹399/mo for 200 credits; Growth: ₹999/mo for 600 credits; Enterprise: ₹2,499/mo for 2,000 credits) with auto-renewal and low-balance alerts.

### 5. Document Extraction Quality & Chronological Date Calculator
- **Markdown Extraction (`pymupdf4llm`):** Replace raw unformatted text dump with structural markdown extraction via `pymupdf4llm` (<100ms per file, <20MB RAM, zero heavy PyTorch dependencies). Preserves two-column layouts, tables, and section headers that currently scramble dates and work history.
- **Deterministic Chronological Date Parser:** Pre-processing Python utility using regex and date parsing (`dateutil`) to parse start/end employment dates, resolve overlapping positions, and compute exact total months/years of experience deterministically before LLM prompt injection.

### 6. 50 Free Welcome Credits on Signup
- Automatically grant **50 free resume credits** to every newly registered user upon first authentication (via Google SSO or GitHub OAuth), logged with an initial bonus audit transaction.

### 7. Automated CI/CD Workflows (GitHub Actions)
- Create `.github/workflows/ci.yml`:
  - **Backend Job:** Setup Python, resolve dependencies with `uv`, run linting, and execute automated test suites.
  - **Frontend Job:** Setup Node.js, run TypeScript compilation (`tsc -b`), and verify Vite production bundle (`vite build`).

### 8. LLM Evaluation, Grounding & Observability Pipeline (LangSmith / Eval Harness)
- **Benchmark Golden Dataset:** Curate a standardized test set of 15–20 annotated resumes covering challenging cases (two-column layouts, gap years, overlapping concurrent jobs, career switchers, non-standard date formats) paired with human-verified `ground_truth.json`.
- **LangSmith Tracing:** Integrate LangSmith observability (`LANGCHAIN_TRACING_V2=true`) to log exact input prompts, token consumption, latency, and reasoning step traces in a central dashboard.
- **Grounding & Faithfulness Scoring:** Automated evaluator checking that every skill, project, and experience detail cited in the evaluation is strictly grounded in the candidate's actual resume text (0% hallucination tolerance).
- **Date & Experience Calibration:** Measure Mean Absolute Error (MAE) between extracted years of experience and ground-truth values to ensure the date calculator and prompt achieve >95% accuracy.

### 9. Admin Operations & Token Cost Analytics Dashboard (Unit Economics)
- **Real-Time Token & Cost Telemetry:** Implement a cost accounting engine using `tiktoken` to compute prompt and completion tokens for every LLM call, multiplying by dynamic model rates (e.g. GPT-4o input: $2.50/1M, output: $10.00/1M) converted to INR.
- **Unit Economics & Margin Tracking:** Dashboard displaying platform-wide financial health: Total Revenue collected via Razorpay vs Total LLM API Cost spent, calculating Gross Profit Margin % and real-time **Average Cost Per Resume** (e.g. ~₹0.25–₹0.35/resume).
- **User & Job Management Portal:** Administrative control panel to inspect all registered recruiters, view current credit balances, manually adjust/grant credits, activate/deactivate accounts, and inspect global screening error rates (system faults vs user faults).

---

## 4. 🎯 Employee Task Assignment Board (Hyper-Focused, One-Task-Per-Ticket)

Use this section to assign single-responsibility tasks directly to individual team members.

### 🗄️ Database Schema & Migration Tasks

| Ticket ID | Task Name | Hyper-Focused Description | Assignee | Status |
| :--- | :--- | :--- | :--- | :--- |
| **[DB-01]** | **Admin Role & User Status Schema** | Add migration script adding `role VARCHAR(20) DEFAULT 'recruiter'` and `is_active BOOLEAN DEFAULT TRUE` to `users` table, and seed initial superadmin. | Sanyam | `[ ] Ready` |
| **[DB-02]** | **LLM Token & Cost Telemetry Schema** | Add migration adding `prompt_tokens INT`, `completion_tokens INT`, `total_tokens INT`, `model_name VARCHAR(100)`, `estimated_cost_usd NUMERIC(10,6)`, and `estimated_cost_inr NUMERIC(10,4)` to `evaluations` table. | Sanyam | `[ ] Ready` |
| **[DB-03]** | **Candidate Unique Submission Constraint** | Add PostgreSQL unique constraint `ALTER TABLE candidates ADD CONSTRAINT uq_job_candidate_email UNIQUE (job_id, candidate_email);` to enforce single-submission rule. | Sanyam | `[ ] Ready` |
| **[DB-04]** | **OAuth Provider Schema Migration** | Add database migration adding `auth_provider VARCHAR(20) DEFAULT 'google'`, `github_id VARCHAR(100) UNIQUE NULL`, and `avatar_url VARCHAR(500) NULL` to `users` table to support dual social sign-in. | Sanyam | `[ ] Ready` |

---

### 🧑‍💻 Backend & Infrastructure Tasks

| Ticket ID | Task Name | Hyper-Focused Description | Assignee | Status |
| :--- | :--- | :--- | :--- | :--- |
| **[BE-01]** | **Welcome Credits Grant** | In `routes_auth.py`, when a new user record is inserted, assign `credits = 50` and insert a record into `transactions` with `transaction_type = 'welcome_bonus'`. | Gaurav | `[ ] Ready` |
| **[BE-02]** | **Pricing Realignment** | In `routes_wallet.py`, update `PACKAGES` dictionary to ₹2/credit rates (100 credits = ₹200, 250 credits = ₹500, 500 credits = ₹1000). | Gaurav | `[ ] Ready` |
| **[BE-03]** | **Razorpay Subscription API** | In `routes_wallet.py`, add `POST /api/wallet/subscription/create` and `POST /api/wallet/subscription/webhook` handling recurring monthly plans. | Sanyam | `[ ] Ready` |
| **[BE-04]** | **Candidate Google SSO Auth** | Create candidate auth route `POST /api/public/auth/google` verifying Google ID token and issuing a restricted candidate JWT containing `email` and `sub`. | Sanyam | `[ ] Ready` |
| **[BE-05]** | **Candidate Anti-Cheat Constraint** | Add PostgreSQL unique constraint `ALTER TABLE candidates ADD CONSTRAINT uq_job_candidate_email UNIQUE (job_id, candidate_email);` and return HTTP 409 if candidate reapplies. | Sanyam | `[ ] Ready` |
| **[BE-06]** | **Anonymous Leaderboard Endpoint** | In `routes_public.py`, add `GET /api/public/jobs/{job_id}/leaderboard` returning total applicants, current candidate's percentile rank, and score distribution histogram without exposing competitor names. | Sanyam | `[ ] Ready` |
| **[BE-07]** | **Single-Resume Atomic Queue** | Refactor `enqueue_batch_task` in `queue_manager.py` so each resume is pushed as an individual atomic task `resume_task_queue`, enabling granular independent worker execution. | Sanyam | `[ ] Ready` |
| **[BE-08]** | **Tenacity Simple Retry** | In `llm_pipeline.py`, wrap LLM invocation with `@retry(stop=stop_after_attempt(3), wait=wait_fixed(2), retry=retry_if_exception_type(...))` to handle transient rate limits without exponential delays. | Gaurav | `[ ] Ready` |
| **[BE-09]** | **Redis Pub/Sub WebSocket Bridge** | In `routes_ws.py`, subscribe to Redis channel `job_updates` so background worker events broadcast across WebSockets via Redis Pub/Sub. | Sanyam | `[ ] Ready` |
| **[BE-10]** | **Recursive ZIP Parsing** | In `file_parser.py`, update `extract_files_from_zip_in_memory` using `os.walk` or recursive zip entry traversal, filtering exclusively `.pdf` and `.docx` while discarding `__MACOSX` and hidden files. | Sanyam | `[ ] Ready` |
| **[BE-11]** | **Sequential Stream-Parse-Discard** | In `routes_upload.py`, stream and extract each file in the ZIP sequentially, immediately freeing each buffer before reading the next file to prevent memory accumulation. | Sanyam | `[ ] Ready` |
| **[BE-12]** | **Cloud Drive Recursive Folder Resolver** | In `url_downloader.py`, implement recursive traversal for public Google Drive and OneDrive folder links to discover and download all nested documents. | Sanyam | `[ ] Ready` |
| **[BE-13]** | **Tiktoken Cost Calculator** | Build `backend/cost_calculator.py` using `tiktoken` to compute prompt/completion token counts and calculate estimated USD & INR costs based on active model rates. | Swaraj/Pradyumna | `[ ] Ready` |
| **[BE-14]** | **Admin Analytics & Cost Endpoints** | Create `routes_admin.py` with `GET /api/admin/metrics`, `GET /api/admin/cost-analytics`, and `GET /api/admin/users` returning revenue vs LLM cost, margins, and user stats. | Sanyam | `[ ] Ready` |
| **[BE-15]** | **Admin RBAC Auth Guard** | Create `verify_admin_user` dependency in `auth.py` verifying `user.role == 'admin'` and blocking non-admin requests with HTTP 403 Forbidden. | Sanyam | `[ ] Ready` |
| **[BE-16]** | **GitHub OAuth Backend Flow** | In `routes_auth.py` and `routes_public.py`, add `POST /api/auth/github` and `POST /api/public/auth/github` to exchange GitHub OAuth code for access token, fetch verified primary email/profile via GitHub API, and issue JWT session. | Sanyam | `[ ] Ready` |
| **[BE-17]** | **App-Fault Zero-Credit Guardrail** | In `queue_manager.py` / `background_tasks.py`, ensure application/parsing runtime errors trigger immediate automatic credit refunds (`system_fault_refund`), resulting in 0 net credits used. | Sanyam | `[ ] Ready` |
| **[BE-18]** | **User Fault Rejection & Credit Deduction** | In `routes_upload.py`, reject non-PDF/non-DOCX uploads and non-resume content (`status = 'rejected_invalid_content'`) while strictly deducting/consuming 1 credit as a user-side fault. | Sanyam | `[ ] Ready` |

---

### 🧠 AI & Extraction Pipeline Tasks

| Ticket ID | Task Name | Hyper-Focused Description | Assignee | Status |
| :--- | :--- | :--- | :--- | :--- |
| **[AI-01]** | **pymupdf4llm Integration** | Add `pymupdf4llm` to `requirements.txt` and replace `extract_text_from_pdf_bytes` in `file_parser.py` with `pymupdf4llm.to_markdown(doc)` for structural markdown conversion. | Tejas | `[ ] Ready` |
| **[AI-02]** | **Chronological Date Parser** | Improve `backend/date_calculator.py` to accurately calculate employment date calculation , months/years of experience, and detect overlaps deterministically. | Pradyumn/Swaraj | `[ ] Ready` |
| **[AI-03]** | **Prompt Date Context Injection** | In `llm_pipeline.py`, inject the deterministically calculated experience duration into the evaluation prompt so the LLM does not perform mental date arithmetic. | Swaraj/pradymna | `[ ] Ready` |
| **[AI-04]** | **Non-Resume Content Detector** | In `file_parser.py` / `llm_pipeline.py`, add fast classification detecting non-resume content (invoices, random text, spam) to reject candidate and trigger user-fault credit deduction. | Tejas | `[ ] Ready` |

---

### 🧪 LLM Evaluation & Grounding Pipeline Tasks (Evals)

| Ticket ID | Task Name | Hyper-Focused Description | Assignee | Status |
| :--- | :--- | :--- | :--- | :--- |
| **[EVAL-01]** | **Golden Benchmark Dataset** | Create `backend/tests/evals/dataset/` with 15 diverse test resumes (multi-column, gaps, overlaps) and `ground_truth.json` containing human-verified dates, skills, and target scores. | Pradyumna/Swaraj | `[ ] Ready` |
| **[EVAL-02]** | **LangSmith Tracing Setup** | Configure LangSmith in `config.py` and `llm_pipeline.py` (`LANGCHAIN_TRACING_V2=true`, project `recruitment-evals`) to log prompts, tokens, latency, and step-by-step reasoning traces. | Sanyam | `[ ] Ready` |
| **[EVAL-03]** | **Automated Eval Runner** | Build `backend/tests/evals/run_evals.py` to run batch evaluations against `ground_truth.json` and compute Experience MAE, Skills F1 score, and Recommendation accuracy percentage. | Pradyumna/Swaraj | `[ ] Ready` |
| **[EVAL-04]** | **Grounding & Faithfulness Verifier** | In `run_evals.py`, implement an automated faithfulness evaluator asserting that all skills, companies, and achievements cited by the LLM exist verbatim in the source resume (0% hallucination). | P | `[ ] Ready` |
| **[EVAL-05]** | **Reasoning & Score Calibration** | Build a reasoning alignment evaluator verifying that candidate scores (0-100) and recommendations correlate strictly with the JD criteria (detecting unwarranted optimism/pessimism). | Pradyumna/Swaraj | `[ ] Ready` |
| **[EVAL-06]** | **CI Eval Regression Gate** | In `.github/workflows/ci.yml`, add a step running `run_evals.py` with failure gates: fails the build if experience error > 0.5 years or extraction accuracy drops below 90%. | Anand | `[ ] Ready` |

---

### 🎨 Frontend & UI/UX Tasks

| Ticket ID | Task Name | Hyper-Focused Description | Assignee | Status |
| :--- | :--- | :--- | :--- | :--- |
| **[FE-01]** | **3-Pane Developer Docs Layout** | Redesign `DeveloperDocs.tsx` into a dedicated 3-pane layout: Left navigation tree, Center endpoint specifications, and Right sticky code/response console. | Sanyam | `[ ] Ready` |
| **[FE-02]** | **Landing Page Hero & Sandbox** | Redesign `Landing.tsx` with a high-converting hero section, live interactive candidate score preview widget, and clear CTA buttons. | Sanyam | `[ ] Ready` |
| **[FE-03]** | **Landing Page Comparison & FAQ** | In `Landing.tsx`, add a feature comparison table (Traditional ATS vs ResumeAI) and an accordion FAQ section. | Sanyam | `[ ] Ready` |
| **[FE-04]** | **Split-Screen Login Page** | Redesign `Login.tsx` into a split-screen layout with testimonials/metrics on the left, Google SSO and GitHub OAuth buttons on the right, and a "Get 50 Free Credits" banner. | Sanyam | `[ ] Ready` |
| **[FE-05]** | **Dashboard Metrics Revamp** | In `Dashboard.tsx`, add top metric cards: Total Screened, Shortlist Ratio, Active Jobs, and an activity timeline. | Sanyam | `[ ] Ready` |
| **[FE-06]** | **Candidate Social Auth Modal** | In `PublicJobApply.tsx`, require candidates to sign in via Google SSO or GitHub OAuth before revealing the resume upload dropzone. | Sanyam | `[ ] Ready` |
| **[FE-07]** | **Candidate Leaderboard View** | In `PublicJobApply.tsx`, add post-submission screen showing applicant percentile rank, status badge, and personalized strengths/gaps breakdown. | Sanyam | `[ ] Ready` |
| **[FE-08]** | **Wallet Subscription Tier Tabs** | In `WalletModal.tsx`, update packages to ₹2/resume and add a "Monthly Subscription" tab supporting recurring plans. | Sanyam | `[ ] Ready` |
| **[FE-09]** | **Admin Cost & Economics Dashboard** | Build `AdminDashboard.tsx` (`/admin`) displaying Total Revenue vs Total LLM Cost, Gross Margin %, real-time Cost-Per-Resume chart, and User Management table. | Sanyam | `[ ] Ready` |
| **[FE-10]** | **Admin Navigation & Route Guard** | In `App.tsx` and `AuthLayout.tsx`, implement `AdminRoute` and add an "Admin Portal" navigation item visible exclusively to users with `role == 'admin'`. | Sanyam | `[ ] Ready` |
| **[FE-11]** | **GitHub OAuth Frontend Integration** | Build branded "Continue with GitHub" button with OAuth redirect/callback handler extracting code and authenticating via backend API. | Sanyam | `[ ] Ready` |

---

### 🚀 DevOps & QA Tasks

| Ticket ID | Task Name | Hyper-Focused Description | Assignee | Status |
| :--- | :--- | :--- | :--- | :--- |
| **[DO-01]** | **GitHub Actions CI Workflow** | Create `.github/workflows/ci.yml` running Python linting, `pytest` on backend, and `tsc -b && vite build` on frontend on pull requests. | Anand/Sanyam | `[ ] Ready` |
| **[QA-01]** | **Nested ZIP Stress Test** | Create a security test script that uploads a 50MB nested ZIP archive containing 100 PDFs/DOCXs in subdirectories to verify zero memory leaks and 100% extraction accuracy. | Sanyam | `[ ] Ready` |
| **[QA-02]** | **Candidate Anti-Cheat Test** | Write automated test verifying that a candidate submitting twice with the same verified Google or GitHub email for the same job gets blocked with HTTP 409. | Sanyam/Hetansi | `[ ] Ready` |
| **[QA-03]** | **GitHub OAuth Verification Test** | Write automated integration test mocking GitHub OAuth token exchange, primary email resolution (handling private GitHub emails), and JWT issuance. | Sanyam | `[ ] Ready` |
| **[QA-04]** | **Credit Guardrail Attribution Test** | Write automated test verifying app-side parser crashes result in 0 net credit deduction (auto-refund), while non-PDF/DOCX or non-resume content is rejected with 1 credit deducted. | Sanyam | `[ ] Ready` |

---

## 5. Definition of Done (DoD) for Production Launch
1. **Frontend Polish:** Landing, Auth, Dashboard, and 3-Pane Developer Docs pass design review.
2. **Bulk Uploads:** Tested on 100-file nested ZIPs and Google Drive links with 0 dropped files and <50MB RAM usage.
3. **Candidate Lock:** Candidate cannot apply more than once per job with same Google SSO or GitHub OAuth verified email.
4. **Accuracy:** Date/experience extraction achieves >95% accuracy on standard benchmark resumes.
5. **Billing:** Razorpay subscription webhooks and prepaid purchases credit wallet within <1 second at ₹2/resume.
6. **CI/CD:** GitHub Actions workflow successfully validates backend tests and frontend build on every pull request.
7. **Dual Social Auth:** Both Google SSO and GitHub OAuth work out-of-the-box for recruiter onboarding and candidate verification.
