# Sprint Documentation: Recruitment AI Assistant 🚀

## 1. Product Vision & Fundamental Problem
### The Idea
An intelligent, AI-powered recruitment intelligence platform that automates resume screening, ranks candidates based on highly customizable criteria, and provides developer-friendly APIs for seamless integration into any existing HR or CRM workflow.

### The Fundamental Problem
Recruiters and engineering managers spend countless hours manually parsing resumes and extracting data. Traditional ATS (Applicant Tracking Systems) rely on rigid, keyword-based matching that lacks semantic understanding, resulting in qualified candidates being overlooked or unqualified candidates passing through. 

**Our Solution:** We replace static keyword matching with context-aware LLMs (8B–27B parameters) that can intelligently deduce years of experience, evaluate project impact, and score candidates exactly like a human recruiter would—but in a fraction of the time.

---

## 2. Core Features & Requirements

### User-Requested Features
1. **Robust Document Ingestion & AI Reliability:** Fix edge cases in resume parsing (especially calculating exact dates and years of experience) and ensure the scoring mechanism output is highly reliable and strictly formatted.
2. **Candidate Notification System:** Automated emails or a status portal where candidates receive updates on their ranking/scores (creating a transparent hiring process).
3. **Custom System Prompts:** Allow users to dynamically adjust the AI's focus per job (e.g., "Weight heavy importance on distributed systems experience" or "Focus purely on React frontend skills").
4. **Multi-Source Uploads:** Bulk ZIP file support alongside Google Drive and Microsoft OneDrive integrations.
5. **API Exposure & Developer Hub:** Robust API endpoints so companies can integrate our scoring engine directly into their own ATS or CRM systems.
6. **UI Polish:** Final tweaks to the Apple-inspired fluid design to ensure a premium feel.

### Additional Critical Features (Suggested)
7. **API Security & Webhooks (Critical for B2B):** If we expose APIs, we need API Key management, rate limiting, and Webhooks (so CRMs get a ping when a candidate's resume finishes processing asynchronously).
8. **Human-in-the-Loop Feedback:** A mechanism where recruiters can flag a resume score as "Incorrect." This data will be used to refine our prompts and evaluate model performance.
9. **Data Privacy & GDPR Compliance:** An automated data retention policy that deletes resumes after a certain period, which is legally required for enterprise clients.

---

## 3. Pricing Strategy Proposal
Since the backend utilizes cost-effective 8B-27B parameter open-weight models (e.g., via Groq, Together, or self-hosted), inference costs are extremely low. We can disrupt expensive legacy ATS tools with volume-based pricing:

*   **Free Tier (Product-Led Growth):** 50 resumes/month, standard prompt, manual UI uploads only. (Hook small startups).
*   **Pro Tier ($49/month):** 1,000 resumes/month, custom system prompts, Google Drive/OneDrive integrations.
*   **API / Developer Tier (Pay-as-you-go):** ~$0.05 to $0.10 per resume processed. Includes API keys and webhook support.
*   **Enterprise:** Custom SLAs, bulk limits, data compliance guarantees.

---

## 4. Sprint Task Distribution (2 Weeks)

### 🧑‍💻 Swaraj (AI & Core Engine)
*Primary Focus: AI accuracy, prompt engineering, and LLM reliability.*
*   **[AI-1] Enhance Date/Experience Extraction:** Rework the extraction prompts or add a pre-processing Python heuristic script to accurately calculate years of experience before feeding it to the LLM.
*   **[AI-2] Custom System Prompts Architecture:** Implement the backend logic to accept dynamic scoring weights and custom prompt instructions per job posting.
*   **[AI-3] Structured Output Hardening:** Ensure the 8B-27B models always return valid JSON schemas (using tools like Outlines, Instructor, or strict JSON modes) without token truncation.
*   **[AI-4] Feedback Loop Data Capture:** Create a database schema to store recruiter corrections for future model tuning.

### 🧑‍💻 Sanyam (Backend APIs & Developer Experience)
*Primary Focus: API architecture, integrations, and documentation.*
*   **[API-1] API Gateway & Security:** Implement API Key generation, authentication middleware, and rate-limiting for third-party developers.
*   **[API-2] Expose Core Endpoints:** Build the external REST APIs for `POST /v1/jobs`, `POST /v1/candidates/upload`, and `GET /v1/candidates/{id}/score`.
*   **[API-3] Developer Documentation:** Write comprehensive, interactive OpenAPI (Swagger) documentation showing exact request/response payloads and cURL examples.
*   **[API-4] Webhooks Implementation:** Build a webhook dispatcher so external systems get HTTP POST callbacks when a resume finishes processing.
*   **[API-5] Candidate Notifications:** Build the email service integration (e.g., Resend or SendGrid) to notify candidates of their status/scores.

### 🧑‍💻 Tejas (Shadow Resource / Full-Stack Support)
*Primary Focus: Assisting with UI tweaks, file handling, and learning the stack.*
*   **[UI-1] UI Polish & Tweaks:** Implement the final CSS tweaks on the dashboard and candidate detail pages to perfect the Apple-design layout. (Easy/Medium)
*   **[FS-1] Bulk ZIP Upload:** Create the endpoint to accept a `.zip` file, extract PDFs/DOCXs in memory, and queue them for processing. (Medium)
*   **[FS-2] Cloud Drive Integration:** Research and implement the Google Picker API and OneDrive file picker on the frontend, passing the file URLs to the backend. (Medium - pair with Sanyam).
*   **[QA-1] Postman API Testing:** Write Postman collections for Sanyam's exposed APIs to ensure they work seamlessly before launching the documentation. (Easy)

---

## 5. Sprint Goals & Definition of Done (DoD)
- **DoD:** APIs are secured and documented. ZIP and Drive uploads function without timeouts. The AI successfully extracts dates with 95%+ accuracy on test datasets. Custom prompts alter the scoring weight visibly.
- **Review Date:** End of Week 2.
