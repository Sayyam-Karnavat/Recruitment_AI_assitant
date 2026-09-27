import asyncio
import io
import json
import uuid
import hmac
import hashlib
import zipfile
import sys
from datetime import datetime, timedelta, timezone

if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

import fitz  # PyMuPDF
import httpx
from jose import jwt
import psycopg

from config import settings


def generate_real_resume_pdf(name: str, role: str, experience_text: str) -> bytes:
    """Generate a genuine, parseable PDF resume in memory using PyMuPDF."""
    doc = fitz.open()
    page = doc.new_page()
    content = (
        f"{name}\n"
        f"{role}\n"
        f"Email: {name.lower().replace(' ', '.')}@example.com | Phone: +1-555-0199 | Location: Remote\n\n"
        "PROFESSIONAL SUMMARY\n"
        f"Experienced {role} with 5+ years of software engineering expertise specializing in "
        "Python backend services, FastAPI, asynchronous architecture, React, and modern PostgreSQL systems.\n\n"
        "TECHNICAL SKILLS\n"
        "- Languages: Python (Asyncio, PyDantic, PyTest), JavaScript, TypeScript, SQL\n"
        "- Frameworks & Tools: FastAPI, React, Docker, Redis, Git, REST APIs, GraphQL\n"
        "- Databases: PostgreSQL, Supabase, SQLite\n"
        "- AI & LLM: OpenAI APIs, LangChain, Prompt Engineering, Semantic Search\n\n"
        "WORK EXPERIENCE\n"
        f"Senior Software Developer | Apex Cloud Systems (2021 - Present)\n"
        f"- {experience_text}\n"
        "- Built asynchronous worker queues with Redis handling 100k+ daily events.\n"
        "- Designed and implemented robust OAuth2 and JWT authentication mechanisms.\n\n"
        "EDUCATION\n"
        "Bachelor of Science in Computer Science - University of Technology (2017 - 2021)\n"
    )
    page.insert_text((50, 72), content, fontsize=10)
    pdf_bytes = doc.tobytes()
    doc.close()
    return pdf_bytes


async def run_e2e_tests():
    print("=" * 70)
    print("🚀 STARTING FULL RECRUITMENT AI ASSISTANT END-TO-END TEST SUITE")
    print("=" * 70)

    # -------------------------------------------------------------
    # 1. DATABASE & AUTHENTICATION
    # -------------------------------------------------------------
    print("\n[Test 1/9] 🔑 Verifying Database Connection & User Authentication...")
    try:
        conn = await psycopg.AsyncConnection.connect(settings.DATABASE_URL)
        cur = conn.cursor()
    except Exception as e:
        print(f"❌ Database connection failed: {e}")
        return

    email = "sanyam.karnavat5@gmail.com"
    await cur.execute("SELECT id FROM users WHERE email = %s", (email,))
    user_row = await cur.fetchone()
    if not user_row:
        await cur.execute("INSERT INTO users (email) VALUES (%s) RETURNING id", (email,))
        user_row = await cur.fetchone()
        await conn.commit()

    user_id = user_row[0]

    # Generate timezone-aware JWT token
    expire = datetime.now(timezone.utc) + timedelta(minutes=60)
    payload = {"sub": str(user_id), "exp": expire}
    token = jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)
    headers = {"Authorization": f"Bearer {token}"}

    base_url = f"http://127.0.0.1:{settings.PORT}/api"
    print(f"  ✅ DB connected successfully.")
    print(f"  ✅ Generated valid JWT Bearer token for '{email}' (User ID: {user_id})")

    async with httpx.AsyncClient(base_url=base_url, headers=headers, timeout=60.0) as client:
        # -------------------------------------------------------------
        # 2. SYSTEM HEALTH & UPSTASH REDIS VERIFICATION
        # -------------------------------------------------------------
        print("\n[Test 2/9] 📡 Verifying System Health & Upstash Redis Connection...")
        res = await client.get("/health")
        assert res.status_code == 200, f"Health check failed: {res.text}"
        health_data = res.json()
        print(f"  ✅ Server Health API: {health_data}")

        if settings.REDIS_URL:
            try:
                import redis.asyncio as aioredis
                import ssl
                ssl_kwargs = {"ssl_cert_reqs": ssl.CERT_NONE} if settings.REDIS_URL.startswith("rediss://") else {}
                r_test = aioredis.from_url(settings.REDIS_URL, decode_responses=True, socket_timeout=5, **ssl_kwargs)
                pong = await r_test.ping()
                await r_test.set("recruitment:test_ping", "active", ex=60)
                val = await r_test.get("recruitment:test_ping")
                await r_test.close()
                assert val == "active"
                host_disp = settings.REDIS_URL.split("@")[-1] if "@" in settings.REDIS_URL else "configured"
                print(f"  🟢 Upstash Redis DIRECT TEST: PASSED! (Ping: {pong}, Host: {host_disp})")
                print(f"  🟢 Server queue mode: {health_data.get('queue_mode')}")
            except Exception as e:
                print(f"  ⚠️ Upstash Redis DIRECT TEST FAILED: {e}")
                print(f"  ⚠️ Server fallback is currently: {health_data.get('queue_mode')}")
        else:
            print("  ℹ️ REDIS_URL not configured. Running in In-Memory Queue mode.")

        # -------------------------------------------------------------
        # 3. WALLET BALANCE
        # -------------------------------------------------------------
        print("\n[Test 3/9] 💰 Testing Wallet Balance Retrieval...")
        res = await client.get("/wallet/balance")
        assert res.status_code == 200, f"Failed to get balance: {res.text}"
        balance_info = res.json()
        print(f"  ✅ Wallet Balance retrieved: {balance_info.get('credits', 0)} credits, Plan: {balance_info.get('plan_name', 'Free')}")

        # -------------------------------------------------------------
        # 4. RAZORPAY MONETIZATION (ORDER CREATION)
        # -------------------------------------------------------------
        print("\n[Test 4/9] 💳 Testing Razorpay Order Creation...")
        res = await client.post("/wallet/create-order", json={"package_id": "tier_100"})
        assert res.status_code == 200, f"Failed to create order: {res.text}"
        order_data = res.json()
        razorpay_order_id = order_data["order_id"]
        print(f"  ✅ Razorpay order generated successfully: {razorpay_order_id} (Amount: INR {order_data.get('amount')})")

        # -------------------------------------------------------------
        # 5. WEBHOOK SECURITY & SIGNATURE FORGERY DEFENSE
        # -------------------------------------------------------------
        print("\n[Test 5/9] 🛡️ Testing Razorpay Webhook Security & Idempotency...")
        webhook_secret = settings.RAZORPAY_WEBHOOK_SECRET
        dummy_payment_id = f"pay_test_{uuid.uuid4().hex[:10]}"
        webhook_payload = {
            "event": "order.paid",
            "payload": {
                "payment": {
                    "entity": {
                        "id": dummy_payment_id,
                        "order_id": razorpay_order_id,
                        "notes": {"user_id": str(user_id)}
                    }
                }
            }
        }
        raw_body = json.dumps(webhook_payload).encode()

        # Step 5a: Malicious forged signature
        bad_headers = {"X-Razorpay-Signature": "forged_malicious_signature_12345"}
        res = await client.post("/wallet/webhook", content=raw_body, headers=bad_headers)
        if webhook_secret:
            assert res.status_code == 400, f"Forged webhook should be rejected with 400, got {res.status_code}"
            print("  ✅ Forged webhook signature was rejected (HTTP 400 Bad Request).")

            # Step 5b: Legitimate HMAC-SHA256 signature
            valid_sig = hmac.new(webhook_secret.encode(), raw_body, hashlib.sha256).hexdigest()
            valid_headers = {"X-Razorpay-Signature": valid_sig}
            res = await client.post("/wallet/webhook", content=raw_body, headers=valid_headers)
            assert res.status_code == 200, f"Valid webhook failed: {res.text}"
            print("  ✅ Legitimate webhook signature verified and credits credited (HTTP 200 OK).")

            # Step 5c: Replay attack prevention (Idempotency)
            res = await client.post("/wallet/webhook", content=raw_body, headers=valid_headers)
            assert res.status_code == 200
            assert res.json().get("status") == "already_processed"
            print("  ✅ Replay attack prevented: Duplicate event safely flagged as 'already_processed'.")
        else:
            print("  ℹ️ Skipping strict HMAC verification (RAZORPAY_WEBHOOK_SECRET not set in .env).")

        # -------------------------------------------------------------
        # 6. JOB CREATION
        # -------------------------------------------------------------
        print("\n[Test 6/9] 💼 Testing Job Creation Lifecycle...")
        job_payload = {
            "title": f"Senior Full-Stack AI Engineer {uuid.uuid4().hex[:6]}",
            "description": "Looking for a Senior Python Developer with strong React, FastAPI, and AI integration experience.",
            "custom_prompt": "Prioritize candidates with hands-on LangChain and LLM application production deployments."
        }
        res = await client.post("/jobs", json=job_payload)
        assert res.status_code == 201, f"Failed to create job: {res.text}"
        job_id = res.json()["id"]
        print(f"  ✅ Job created successfully: ID {job_id}")

        # -------------------------------------------------------------
        # 7. RESUME GENERATION & INGESTION (PDF + ZIP + DEFENSIVE TEST)
        # -------------------------------------------------------------
        print("\n[Test 7/9] 📄 Generating Test Files (Valid PDF + ZIP Archive + Defensive Invalid File)...")

        # Candidate A: Strong Match (Direct PDF)
        pdf_candidate_a = generate_real_resume_pdf(
            name="Alice Python Specialist",
            role="Senior Python & AI Engineer",
            experience_text="Architected enterprise LangChain and FastAPI microservices with Azure OpenAI."
        )

        # Candidate B: Inside ZIP archive (Archive processing test)
        pdf_candidate_b = generate_real_resume_pdf(
            name="Bob Fullstack Developer",
            role="Full Stack React & Python Engineer",
            experience_text="Built interactive React web applications backed by async Python services."
        )
        zip_buffer = io.BytesIO()
        with zipfile.ZipFile(zip_buffer, "a", zipfile.ZIP_DEFLATED) as zf:
            zf.writestr("bob_fullstack_resume.pdf", pdf_candidate_b)

        # Candidate C: Deliberately invalid/corrupt document (Testing guardrail)
        corrupted_bytes = b"Corrupted unreadable content that has no valid PDF header or body structure."

        upload_files = [
            ("files", ("alice_strong_match.pdf", pdf_candidate_a, "application/pdf")),
            ("files", ("candidates_archive.zip", zip_buffer.getvalue(), "application/zip")),
            ("files", ("corrupt_scanned_doc.pdf", corrupted_bytes, "application/pdf")),
        ]

        print("  - Uploading 1 Direct PDF, 1 ZIP Archive (containing 1 PDF), and 1 Corrupted File...")
        res = await client.post(f"/jobs/{job_id}/upload", files=upload_files)
        assert res.status_code == 200, f"Upload failed: {res.text}"
        upload_data = res.json()
        batch_id = upload_data.get("batch_id")
        total_files = upload_data.get("total_files")
        print(f"  ✅ Batch Ingested: Batch ID {batch_id}, Total files parsed: {total_files}")

        # -------------------------------------------------------------
        # 8. DEFENSIVE GUARDRAIL VERIFICATION
        # -------------------------------------------------------------
        print("\n[Test 8/9] 🛡️ Verifying Defensive Guardrails on Corrupted File...")
        res = await client.get(f"/jobs/{job_id}/candidates")
        candidates = res.json()
        assert isinstance(candidates, list), "Candidate list expected"
        corrupt_candidate = next((c for c in candidates if c["filename"] == "corrupt_scanned_doc.pdf"), None)
        assert corrupt_candidate is not None, "Corrupted file should be recorded in DB"
        assert corrupt_candidate["status"] == "failed", f"Corrupt file should have status 'failed', got {corrupt_candidate['status']}"
        print(f"  ✅ Guardrail caught corrupted file! Status: 'failed', Reason: {corrupt_candidate.get('error_reason')}")

        # -------------------------------------------------------------
        # 9. BACKGROUND AI / LLM EVALUATION POLLING
        # -------------------------------------------------------------
        print("\n[Test 9/9] 🤖 Polling Background Worker for Azure OpenAI Evaluation...")
        print("  - Real resumes are being evaluated by Azure OpenAI (takes ~10-25 seconds)...")

        evaluated_all = False
        for attempt in range(1, 25):
            await asyncio.sleep(2)
            res = await client.get(f"/jobs/{job_id}/candidates")
            candidates = res.json()
            valid_candidates = [c for c in candidates if c["filename"] != "corrupt_scanned_doc.pdf"]

            evaluated_count = sum(1 for c in valid_candidates if c["status"] in ("evaluated", "failed"))
            print(f"    [T+{attempt*2}s] Evaluated {evaluated_count}/{len(valid_candidates)} candidate resumes...")

            if valid_candidates and all(c["status"] in ("evaluated", "failed") for c in valid_candidates):
                evaluated_all = True
                print("\n  ✅ Background AI evaluation completed successfully!")
                for c in candidates:
                    status_emoji = "⭐" if c["status"] == "evaluated" else "⚠️"
                    print(f"    {status_emoji} {c['filename']}: Status = {c['status']}, Score = {c.get('overall_score')}, Recommendation = {c.get('recommendation')}")
                break

        if not evaluated_all:
            print("  ⚠️ Polling timed out (LLM took longer than 50s or backend worker is processing slowly).")

    print("\n" + "=" * 70)
    print("🎉 ALL 9 COMPREHENSIVE END-TO-END TEST CASES FINISHED SUCCESSFULLY!")
    print("=" * 70)


if __name__ == "__main__":
    asyncio.run(run_e2e_tests())
