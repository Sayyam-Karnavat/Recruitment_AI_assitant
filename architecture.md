# System Architecture & Scalability Guide 🏗️
**System:** Recruitment AI Assistant  
**Target Scale:** 1,000 Recruiters (~2,000 Active Jobs, 100,000–200,000 Resumes, 2,500 Burst Screening Tasks)  

---

## 1. Executive Summary & The Scalability Reality

In HR technology, **1,000 active recruiters** represents an enterprise workload:
- **1,000 recruiters** × 2 active jobs each = **2,000 active job pipelines**.
- Each job typically screens between **50 and 200 candidates**.
- Total workload: **100,000 to 200,000 resumes** evaluated by LLMs.
- During peak hiring windows (e.g., Monday mornings), up to 50 recruiters upload bulk batches simultaneously, resulting in a **burst of 2,500 simultaneous screening tasks**.

To handle this volume on cost-effective infrastructure (such as Render + managed Redis + PostgreSQL), the system is designed around **atomic task queuing, sequential in-memory streaming, lightweight markdown layout extraction, and event-driven WebSockets**.

---

## 2. High-Level Architecture Diagram

```
                              ┌────────────────────────────────────────────────────────┐
                              │                    CLIENT LAYER                        │
                              │   React 18 + Vite SPA (Tailwind / Apple-Inspired CSS)   │
                              └───────────┬────────────────────────────────┬───────────┘
                                          │ HTTPS REST Requests            │ WebSockets (WSS)
                                          ▼                                ▼
┌──────────────────────────────────────────────────────────────────────────────────────┐
│                             FASTAPI APPLICATION INGRESS                              │
│                                                                                      │
│  • Auth & API Gateway: Google SSO, GitHub OAuth, JWT & API Key Auth (X-API-Key)      │
│  • Rate Limiting & Pre-Flight Wallet Balance Check (Requires credits >= batch count) │
│  • In-Memory Stream Parser: Reads ZIP / PDFs sequentially (Peak RAM: ~2MB per file)  │
│  • Atomic Task Decomposer: Splits bulk uploads into 1 Task Per Candidate             │
└──────────────┬──────────────────────────┬────────────────────────────┬───────────────┘
               │                          │                            │
               │ Push Candidate IDs       │ Broadcast Live Events      │ Read/Write Records
               ▼                          ▼                            ▼
   ┌───────────────────────┐  ┌───────────────────────┐  ┌───────────────────────────┐
   │   REDIS TASK QUEUE    │  │    REDIS PUB / SUB    │  │   POSTGRESQL DATABASE     │
   │  (Atomic Task Stream) │  │  (Multi-Worker Sync)  │  │  (Connection Pooled)      │
   │  List: `resume_tasks` │  │  Channel: `job_events`│  │  • users & transactions   │
   └───────────┬───────────┘  └───────────┬───────────┘  │  • jobs & candidates      │
               │                          ▲              │  • evaluations & feedback │
               │ Pop Task (blpop)         │ Publish      └───────────────────────────┘
               ▼                          │
┌─────────────────────────────────────────┴────────────────────────────────────────────┐
│                       DISTRIBUTED ASYNC WORKER POOL                                  │
│                       (15–20 Concurrent Worker Coroutines)                           │
│                                                                                      │
│  1. Extract Markdown Layout via `pymupdf4llm` (<100ms, <20MB RAM, Preserves Tables) │
│  2. Compute Chronological Dates deterministically via `dateutil` (Resolves Overlaps)│
│  3. Call Remote LLM (Azure OpenAI / GPT-4o) with Tenacity Retry (3 Attempts, 2s Wait)│
│  4. Enforce Credit Guardrail: System Fault -> Auto Refund; User Fault -> Deduct      │
│  5. Save Evaluation to Postgres & Publish Event to Redis Pub/Sub                     │
│  6. Trigger Webhook to external ATS/CRM if configured                                │
└─────────────────────────────────────────┬────────────────────────────────────────────┘
                                          │ HTTPS
                                          ▼
                      ┌──────────────────────────────────────┐
                      │    AZURE OPENAI / OPENAI GATEWAY     │
                      │  Controlled within 300 RPM Quota     │
                      └──────────────────────────────────────┘
```

---

## 3. Core Architectural Decisions: "Why This Way?"

### A. Atomic Single-Resume Tasks vs. Monolithic Batch Tasks
* **The Problem:** If a user uploads 100 resumes and the server hands all 100 resumes as a single task to 1 worker, that worker is locked for 5 to 10 minutes. If resume #42 is corrupted or triggers an unexpected timeout, the entire batch crashes or hangs.
* **The Solution:** **1 Queue Task = 1 Candidate Resume**.
  - When 100 resumes are uploaded, the upload router creates candidate records with `status = 'pending'` and pushes **100 independent task IDs** into Redis.
  - 20 parallel workers immediately pull and process these resumes concurrently.
  - If candidate #42 fails, only candidate #42 is marked `failed` (and refunded if it was a system fault). Candidates #1 through #41 and #43 through #100 finish without interruption.
  - **Result:** Batch processing time drops from 10 minutes to **under 25 seconds**!

---

### B. Worker Concurrency & Fixed Retry Strategy
* **The Problem:** Azure OpenAI and OpenAI enforce rate limits (typically 300 Requests Per Minute for Tier 2). Unconstrained concurrency triggers `429 RateLimitError`. Conversely, exponential backoff (`2s -> 4s -> 8s -> 16s`) causes long, unacceptable delays for recruiters waiting on screen.
* **The Solution:**
  - **Worker Concurrency Cap:** We configure between **15 and 20 concurrent workers**. Since each LLM evaluation takes ~3 to 4 seconds, 15 workers generate ~225 to 300 requests/minute, perfectly saturating the API quota without triggering rate limit bans.
  - **Tenacity Simple Retry:** We wrap LLM calls with a fixed retry:
    ```python
    @retry(stop=stop_after_attempt(3), wait=wait_fixed(2), retry=retry_if_exception_type((RateLimitError, APIConnectionError)))
    ```
    If an unexpected network blip or momentary rate limit occurs, the worker pauses for 2 seconds and retries immediately. It recovers fast without compounding exponential delays.

---

### C. Extraction Tooling: Why `pymupdf4llm` over `docling` or basic `pymupdf`
* **Why not basic `pymupdf`?** `fitz.get_text()` dumps raw text without structural layout awareness. On modern two-column resumes, left and right columns interleave into a single jumbled paragraph. The dates of job A merge into the description of job B, severely confusing the LLM.
* **Why not `docling`?** While IBM's Docling offers excellent layout models, it requires **PyTorch, Torchvision, and deep learning weights (2GB+ footprint)** and takes 3 to 10 seconds per page on CPU. On Render's 1GB RAM tier, Docling instantly causes Out-Of-Memory (OOM) crashes.
* **The Winner:** **`pymupdf4llm`**.
  - Built directly on top of high-performance C++ MuPDF.
  - Zero heavy PyTorch/GPU dependencies (<20MB RAM footprint).
  - Converts PDFs into clean **GitHub Flavored Markdown** in **under 80ms**.
  - Accurately preserves tables, multi-column reading orders, bold headers, and bulleted lists.

---

### D. Zero-Disk Streaming & Sequential ZIP Processing (Avoiding Render 1GB Disk & S3 Storage)
* **The Problem:** Render free/starter tiers provide only 1GB of ephemeral disk space, mostly consumed by the OS, Python virtual environment, and system packages. Storing 100,000 raw PDF files in AWS S3 or Cloudflare R2 incurs ongoing storage, bandwidth, and maintenance costs.
* **The Solution: Sequential Stream-Parse-Discard**.
  - When a 100MB ZIP file containing 100 PDFs is uploaded, we do **not** extract all 100 files into a giant memory array.
  - Instead, we open the zip stream (`zipfile.ZipFile(io.BytesIO(zip_bytes))`) and iterate through entries **one file at a time**:
    1. Read the bytes of Resume #1 (~1.5 MB).
    2. Extract structural markdown via `pymupdf4llm`.
    3. Store the text in PostgreSQL (`candidates.raw_text`).
    4. Delete the raw file buffer immediately (`del raw_bytes`) before opening Resume #2.
  - **Result:** Peak RAM consumption never exceeds the size of a single resume (~2MB). Zero bytes are saved to disk, and **zero S3 cloud storage is needed**.

---

### E. Multi-Instance Synchronization via Redis Pub/Sub
* **The Problem:** WebSockets held in Python memory (`dict[job_id, WebSocket]`) only exist on the specific server instance that accepted the HTTP connection. If you run multiple web workers or server containers, Worker B cannot reach the browser connected to Server A.
* **The Solution:** **Redis Pub/Sub Event Bus**.
  - When any worker completes a candidate evaluation, it executes:
    ```python
    await redis.publish(f"job:{job_id}", json.dumps(event_payload))
    ```
  - Every running web node subscribes to Redis channels and instantly forwards messages to its locally connected WebSockets.
  - The frontend receives sub-second updates regardless of which worker or server processed the candidate.

---

### F. Candidate Anti-Cheat & Anonymous Leaderboard
* **The Problem:** Candidates who get a public link (`/careers/:jobId`) can see their AI score (e.g., 62/100), edit their resume with buzzwords, and resubmit 10 times until they get 95/100.
* **The Solution:**
  1. **Verified Social Auth (Google SSO & GitHub OAuth):** Candidates must sign in using verified Google or GitHub accounts prior to document submission, ensuring verified email identity.
  2. **Unique Database Constraint:**
     ```sql
     ALTER TABLE candidates ADD CONSTRAINT uq_job_candidate_email UNIQUE (job_id, candidate_email);
     ```
     Attempting a second submission with the same verified email address returns `HTTP 409 Conflict: "You have already submitted an application for this position."`
  3. **Anonymous Leaderboard:** Candidates can view an anonymized dashboard showing their percentile rank (e.g., *"Rank #3 of 68 — Top 5%"*) and match summary, without leaking other applicants' names or personal details (GDPR compliant).

---

### G. Dual Monetization Architecture (Prepaid Credits + Monthly Subscriptions @ ₹2/resume)
* **Prepaid Wallet (Pay-As-You-Go):**
  - ₹2 per resume evaluation (1 Credit = 1 Resume).
  - Flexible packages: ₹200 for 100 credits, ₹500 for 250 credits, ₹1,000 for 500 credits.
  - Ideal for irregular or seasonal hiring spikes.
* **Recurring Monthly Subscriptions:**
  - Automated recurring monthly billing via Razorpay Subscriptions API:
    - **Starter:** ₹399/month (200 credits/mo)
    - **Growth:** ₹999/month (600 credits/mo)
    - **Enterprise:** ₹2,499/month (2,000 credits/mo)
  - Provides steady Monthly Recurring Revenue (MRR) with low-balance auto-replenishment notifications.
* **Welcome Incentive:** Every new sign-up automatically receives **50 free credits**, driving immediate product-led adoption.
* **Strict Fault Attribution Policy (Credit Guardrails):**
  - **Application/System Fault (0 Net Credits Used):** If an error occurs during parsing or screening due to application crashes, memory exhaustion, LLM timeouts, or 5xx server issues, 1 credit is immediately auto-refunded to the user's wallet with an audit trail (`transaction_type = 'system_fault_refund'`).
  - **User Fault (1 Credit Consumed/Deducted):** If the user uploads non-PDF/non-DOCX files, corrupt unreadable files, or documents containing non-resume content (invoices, spam, random articles), the submission is rejected (`status = 'rejected_invalid_content'`) and 1 credit is consumed.

---

### H. Continuous LLM Evaluation, Grounding & Observability (Evals)
* **The Problem:** LLM prompts drift. If someone tweaks the prompt or OpenAI updates model weights, resume scores can silently inflate or experience calculations can drop in accuracy without throwing an error code.
* **The Solution: 3-Tier Eval Pipeline**:
  1. **Golden Test Dataset (`ground_truth.json`):** 15 curated benchmark resumes representing diverse real-world profiles (gaps, overlaps, multi-column, junior, senior).
  2. **Faithfulness & Grounding Check:** An automated verification asserting that 100% of skills, companies, and claims cited in the LLM output exist in the source resume (zero hallucination).
  3. **LangSmith Observability:** Tracing inputs, outputs, token counts, latency, and step-by-step reasoning traces in LangSmith's web dashboard.
  4. **CI Regression Gate:** Automated test runs on every pull request. If experience calculation Mean Absolute Error (MAE) > 0.5 years or extraction accuracy drops < 90%, CI blocks the merge.

---

### I. Admin Telemetry & Unit Economics Architecture
* **The Problem:** In AI SaaS products, LLM costs can spiral if not monitored per request. Without real-time visibility into token consumption versus collected subscription/prepaid revenue, founders cannot know their true gross margins.
* **The Solution: In-Flight Cost Accounting Engine**:
  1. **Token Counting via `tiktoken` & Response Metadata:**
     - For every resume parsed (JSON extraction) and evaluated (JD matching), the exact prompt and completion tokens are recorded from the API response (`response.usage`) or calculated using `tiktoken`.
  2. **Database Tracking (`evaluations` table):**
     - Each evaluation record stores: `prompt_tokens`, `completion_tokens`, `total_tokens`, `model_name`, `estimated_cost_usd`, and `estimated_cost_inr`.
     - *Example unit calculation:* 1,200 input tokens + 350 output tokens on GPT-4o-mini = $0.00039 (~₹0.033). On GPT-4o = ~$0.0065 (~₹0.55).
  3. **Platform Financial Metrics:**
     - **Gross Margin:** `(Total Razorpay Revenue - Total LLM Cost) / Total Revenue`.
     - **Average Cost Per Resume:** `Total LLM Cost / Total Resumes Evaluated`.
     - At ₹2.00 charged per resume vs ~₹0.30 average cost, the target gross margin is **~85%**.
  4. **Role-Based Admin Access (RBAC):**
     - `users.role` (`'admin'` vs `'recruiter'`).
     - Admin routes (`/api/admin/*`) are protected by a backend dependency `verify_admin_user` and only accessible to users with verified administrative privileges.

---

### J. Dual Social Authentication Architecture (Google SSO & GitHub OAuth)
* **The Objective:** Provide instant, secure, low-friction sign-in for recruiters on `/login` and candidate authentication on public job links `/careers/:jobId`, without requiring password management.
* **Architecture & Flow:**
  1. **Client Ingress:** Client requests GitHub authorization via `https://github.com/login/oauth/authorize?client_id={CLIENT_ID}&scope=user:email`.
  2. **Authorization Code Exchange:** Frontend receives code and posts to `POST /api/auth/github` (recruiters) or `POST /api/public/auth/github` (candidates).
  3. **Backend Verification:**
     - Backend exchanges code with GitHub OAuth API for an access token using `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET`.
     - Queries `https://api.github.com/user` and `https://api.github.com/user/emails` to resolve verified primary email, display name, and avatar.
  4. **Database Identity Upsert:**
     - Upserts into `users` (`email`, `name`, `avatar_url`, `auth_provider = 'github'`, `github_id`).
     - First-time registration automatically logs a `welcome_bonus` transaction and grants 50 free credits.
  5. **Session Issuance:** Returns signed JWT containing `sub`, `email`, `role`, and `provider`.

---

## 4. Key Metrics & Benchmarks

| Metric | Target | Architecture Provision |
| :--- | :--- | :--- |
| **Max Concurrent Jobs** | 2,500 tasks | Redis queue with atomic single-resume tasks |
| **Parsing Speed** | <100ms per resume | `pymupdf4llm` C++ engine |
| **LLM Evaluation Latency** | 3–5 seconds | Azure OpenAI GPT-4o with async client |
| **End-to-End Batch (100 Resumes)**| <25 seconds | 20 parallel async workers |
| **RAM Footprint per Upload** | <15 MB | Sequential stream-parse-discard pipeline |
| **External Cloud Storage Cost** | ₹0 / month | Zero-disk retention (raw text in PostgreSQL) |
| **WebSocket Latency** | <150ms | Redis Pub/Sub broadcast |
| **Error Recovery** | 99.9% resilience | Tenacity fixed retry (3 attempts) + automatic wallet refund on system fault |
| **Candidate Anti-Cheat** | 100% enforcement | Google SSO & GitHub OAuth verified email + DB unique constraint |
