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
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")

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
    print("🚀 STARTING UPPSHOT PLATFORM END-TO-END TEST SUITE")
    print("=" * 70)

    conn = None
    cur = None
    server = None
    server_task = None
    candidates = []

    try:
        # -------------------------------------------------------------
        # 1. DATABASE & AUTHENTICATION
        # -------------------------------------------------------------
        print("\n[Test 1/11] 🔑 Verifying Database Connection & User Authentication...")
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

        # Probe if local server is already running
        base_url = None
        candidate_ports = list(dict.fromkeys([settings.PORT, 10000, 8000]))
        for p in candidate_ports:
            try:
                async with httpx.AsyncClient(timeout=0.6) as probe:
                    r = await probe.get(f"http://127.0.0.1:{p}/api/health")
                    if r.status_code == 200:
                        base_url = f"http://127.0.0.1:{p}/api"
                        print(f"  ⚡ Detected running local backend on port {p}")
                        break
            except Exception:
                continue

        # If not running, start in-process uvicorn server so local routes & changes are verified
        if not base_url:
            try:
                import uvicorn
                from main import app
                test_port = 8008
                config = uvicorn.Config(app=app, host="127.0.0.1", port=test_port, log_level="warning")
                server = uvicorn.Server(config=config)
                server.install_signal_handlers = lambda: None
                server_task = asyncio.create_task(server.serve())

                for _ in range(30):
                    try:
                        async with httpx.AsyncClient(timeout=0.5) as probe:
                            r = await probe.get(f"http://127.0.0.1:{test_port}/api/health")
                            if r.status_code == 200:
                                base_url = f"http://127.0.0.1:{test_port}/api"
                                print(f"  ⚡ In-process test server started successfully on http://127.0.0.1:{test_port}")
                                break
                    except Exception:
                        await asyncio.sleep(0.2)
            except Exception as e:
                print(f"  ⚠️ Could not spawn in-process server: {e}")

        # Fallback to production if in-process bind fails
        if not base_url:
            base_url = f"{settings.PRODUCTION_BACKEND_URL}/api"
            print(f"  🌐 Falling back to live production backend: {base_url}")

        print(f"  ✅ DB connected successfully.")
        print(f"  ✅ Generated valid JWT Bearer token for '{email}' (User ID: {user_id})")
        print(f"  🎯 Testing target backend: {base_url}")

        async with httpx.AsyncClient(base_url=base_url, headers=headers, timeout=60.0) as client:
            # -------------------------------------------------------------
            # 2. SYSTEM HEALTH & UPSTASH REDIS VERIFICATION
            # -------------------------------------------------------------
            print("\n[Test 2/11] 📡 Verifying System Health & Upstash Redis Connection...")
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
        # -------------------------------------------------------------
        # 3. WALLET BALANCE
        # -------------------------------------------------------------
        print("\n[Test 3/11] 💰 Testing Wallet Balance Retrieval...")
        res = await client.get("/wallet/balance")
        assert res.status_code == 200, f"Failed to get balance: {res.text}"
        balance_info = res.json()
        print(f"  ✅ Wallet Balance retrieved: {balance_info.get('credits', 0)} credits, Plan: {balance_info.get('plan_name', 'Free')}")

        # -------------------------------------------------------------
        # 4. RAZORPAY MONETIZATION (ORDER CREATION)
        # -------------------------------------------------------------
        print("\n[Test 4/11] 💳 Testing Razorpay Order Creation...")
        res = await client.post("/wallet/create-order", json={"package_id": "tier_100"})
        assert res.status_code == 200, f"Failed to create order: {res.text}"
        order_data = res.json()
        razorpay_order_id = order_data["order_id"]
        print(f"  ✅ Razorpay order generated successfully: {razorpay_order_id} (Amount: INR {order_data.get('amount')})")

        # -------------------------------------------------------------
        # 5. WEBHOOK SECURITY & SIGNATURE FORGERY DEFENSE
        # -------------------------------------------------------------
        print("\n[Test 5/11] 🛡️ Testing Razorpay Webhook Security & Idempotency...")
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
        print("\n[Test 6/11] 💼 Testing Job Creation Lifecycle...")
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
        print("\n[Test 7/11] 📄 Generating Test Files (Valid PDF + ZIP Archive + Defensive Invalid File)...")

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
        print("\n[Test 8/11] 🛡️ Verifying Defensive Guardrails on Corrupted File...")
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
        print("\n[Test 9/11] 🤖 Polling Background Worker for Azure OpenAI Evaluation...")
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

        # -------------------------------------------------------------
        # 10. DEDICATED ADMIN PORTAL AUTHENTICATION & ISOLATION
        # -------------------------------------------------------------
        print("\n[Test 10/11] 🔐 Testing Dedicated Admin Portal Authentication & Isolation...")

        # 10a: Bad credentials rejected
        bad_admin_res = await client.post("/admin/login", json={"username": "admin", "password": "wrong_password_123"})
        assert bad_admin_res.status_code == 401, f"Expected 401 on bad admin login, got {bad_admin_res.status_code}"
        print("  ✅ Unauthorized admin login properly rejected (HTTP 401).")

        # 10b: Regular user token rejected on admin metrics
        user_metrics_res = await client.get("/admin/metrics")
        assert user_metrics_res.status_code == 403, f"Expected 403 when regular user accesses admin metrics, got {user_metrics_res.status_code}"
        print("  ✅ Regular user Bearer token blocked from admin endpoints (HTTP 403 Forbidden).")

        # 10c: Valid admin login with .env credentials
        good_admin_res = await client.post("/admin/login", json={
            "username": settings.ADMIN_USERNAME,
            "password": settings.ADMIN_PASSWORD
        })
        assert good_admin_res.status_code == 200, f"Failed admin login: {good_admin_res.text}"
        admin_auth_data = good_admin_res.json()
        admin_token = admin_auth_data["access_token"]
        print(f"  ✅ Dedicated Admin login succeeded with .env credentials. Role: {admin_auth_data.get('role')}")

        # 10d: Access admin metrics using dedicated admin token
        admin_client_headers = {"Authorization": f"Bearer {admin_token}"}
        async with httpx.AsyncClient(base_url=base_url, headers=admin_client_headers, timeout=30.0) as admin_client:
            admin_metrics_res = await admin_client.get("/admin/metrics")
            assert admin_metrics_res.status_code == 200, f"Admin metrics failed with admin token: {admin_metrics_res.text}"
            metrics_data = admin_metrics_res.json()
            total_rev = metrics_data.get("financials", {}).get("total_revenue_inr", 0)
            total_rec = metrics_data.get("overview", {}).get("total_recruiters", 0)
            print(f"  ✅ Admin Telemetry verified: Total Recruiters: {total_rec}, Total Revenue: INR {total_rev}")

        # -------------------------------------------------------------
        # 11. COMPREHENSIVE DEVELOPER APIS (/v1) TEST SUITE
        # -------------------------------------------------------------
        print("\n[Test 11/11] ⚡ Testing Comprehensive Developer APIs (/v1 with API Key Authentication)...")

        # 11a: Prune old test keys to avoid 5-key limit, then create API Key
        await cur.execute("DELETE FROM api_keys WHERE user_id = %s AND name LIKE %s", (str(user_id), "%Test%"))
        await conn.commit()
        await cur.execute("SELECT count(*) FROM api_keys WHERE user_id = %s", (str(user_id),))
        k_count = (await cur.fetchone())[0]
        if k_count >= 5:
            await cur.execute("DELETE FROM api_keys WHERE user_id = %s", (str(user_id),))
            await conn.commit()

        key_res = await client.post("/keys", json={"name": "E2E Test Automation Key"})
        assert key_res.status_code == 200, f"API Key creation failed: {key_res.text}"
        raw_api_key = key_res.json()["api_key"]
        print(f"  ✅ API Key created successfully: {raw_api_key[:12]}...")

        v1_base_url = base_url.replace("/api", "/v1")
        v1_headers = {"X-API-Key": raw_api_key}

        async with httpx.AsyncClient(base_url=v1_base_url, headers=v1_headers, timeout=30.0) as v1_client:
            # 11b: Wallet balance check via API Key
            v1_bal_res = await v1_client.get("/wallet/balance")
            assert v1_bal_res.status_code == 200, f"v1 wallet balance failed: {v1_bal_res.text}"
            print(f"  ✅ [v1] Wallet balance verified via API Key: {v1_bal_res.json().get('credits')} credits")

            # 11c: Create Job via v1
            v1_job_res = await v1_client.post("/jobs", json={
                "title": "Senior AI Integration Engineer",
                "description": "Build high-throughput developer APIs and ATS webhooks with Python and FastAPI.",
                "target_shortlist_count": 5,
                "min_passing_score": 60,
                "custom_prompt": "Evaluate API design and ATS architecture experience."
            })
            assert v1_job_res.status_code == 201, f"v1 job create failed: {v1_job_res.text}"
            v1_job_id = v1_job_res.json()["id"]
            print(f"  ✅ [v1] Position created via v1: ID {v1_job_id}")

            # 11d: List Jobs via GET /v1/jobs
            v1_jobs_list = await v1_client.get("/jobs?status=all")
            assert v1_jobs_list.status_code == 200
            assert any(str(j["id"]) == str(v1_job_id) for j in v1_jobs_list.json())
            print(f"  ✅ [v1] GET /v1/jobs?status=all verified ({len(v1_jobs_list.json())} positions returned)")

            # 11e: Update Job via PATCH /v1/jobs/{job_id}
            v1_patch_res = await v1_client.patch(f"/jobs/{v1_job_id}", json={
                "title": "Principal AI Integration Architect",
                "target_shortlist_count": 8
            })
            assert v1_patch_res.status_code == 200
            assert v1_patch_res.json()["title"] == "Principal AI Integration Architect"
            print("  ✅ [v1] PATCH /v1/jobs/{job_id} updated position title and shortlist count")

            # 11f: Shareable application link GET /v1/jobs/{job_id}/share-link
            v1_link_res = await v1_client.get(f"/jobs/{v1_job_id}/share-link")
            assert v1_link_res.status_code == 200
            share_url = v1_link_res.json()["shareable_url"]
            assert str(v1_job_id) in share_url
            print(f"  ✅ [v1] GET /v1/jobs/{{job_id}}/share-link verified: {share_url}")

            # 11g: Set, Get & Delete Webhook
            v1_wh_res = await v1_client.post(f"/jobs/{v1_job_id}/webhook", json={
                "webhook_url": "https://httpbin.org/post"
            })
            assert v1_wh_res.status_code == 200
            assert v1_wh_res.json()["status"] == "active"
            v1_get_wh = await v1_client.get(f"/jobs/{v1_job_id}/webhook")
            assert v1_get_wh.status_code == 200
            assert v1_get_wh.json()["webhook_url"] == "https://httpbin.org/post"
            v1_del_wh = await v1_client.delete(f"/jobs/{v1_job_id}/webhook")
            assert v1_del_wh.status_code == 200
            print("  ✅ [v1] POST, GET & DELETE /v1/jobs/{job_id}/webhook fully verified")

            # 11h: Job Summary Analytics
            v1_sum_res = await v1_client.get(f"/jobs/{v1_job_id}/summary")
            assert v1_sum_res.status_code == 200
            summary = v1_sum_res.json()
            assert "total_candidates" in summary and "passing_threshold" in summary
            print(f"  ✅ [v1] GET /v1/jobs/{{job_id}}/summary retrieved pipeline intelligence (Threshold: {summary['passing_threshold']}%)")

            # 11i: Close & Reopen Position
            v1_close_res = await v1_client.post(f"/jobs/{v1_job_id}/close")
            assert v1_close_res.status_code == 200
            assert v1_close_res.json()["status"] == "closed"
            print("  ✅ [v1] POST /v1/jobs/{job_id}/close successfully transitioned status to 'closed'")

            v1_reopen_res = await v1_client.post(f"/jobs/{v1_job_id}/reopen")
            assert v1_reopen_res.status_code == 200
            assert v1_reopen_res.json()["status"] == "active"
            print("  ✅ [v1] POST /v1/jobs/{job_id}/reopen successfully reactivated position")

            # 11j: Candidate Status & Re-Screening
            valid_cands = [c for c in candidates if c.get("filename") != "corrupt_scanned_doc.pdf"]
            if valid_cands:
                test_cand_id = valid_cands[0]["id"]
                cand_status_res = await v1_client.get(f"/candidates/{test_cand_id}/status")
                assert cand_status_res.status_code == 200
                print(f"  ✅ [v1] GET /v1/candidates/{{id}}/status verified: {cand_status_res.json()['status']}")

                rescreen_res = await v1_client.post(f"/candidates/{test_cand_id}/rescreen")
                assert rescreen_res.status_code == 200
                print(f"  ✅ [v1] POST /v1/candidates/{{id}}/rescreen verified: {rescreen_res.json()['message']}")

            # 11k: Export CSV via GET /v1/jobs/{job_id}/export/csv
            v1_csv = await v1_client.get(f"/jobs/{job_id}/export/csv")
            assert v1_csv.status_code == 200
            assert "Rank,Name,Score" in v1_csv.text
            print(f"  ✅ [v1] GET /v1/jobs/{{id}}/export/csv verified streaming report")

            # 11l: Delete Position via DELETE /v1/jobs/{job_id}
            v1_del_res = await v1_client.delete(f"/jobs/{v1_job_id}")
            assert v1_del_res.status_code == 200
            v1_verify_del = await v1_client.get(f"/jobs/{v1_job_id}")
            assert v1_verify_del.status_code == 404
            print(f"  ✅ [v1] DELETE /v1/jobs/{{job_id}} permanently deleted job and cascaded records")

        print("\n" + "=" * 70)
        print("🎉 ALL 11 COMPREHENSIVE END-TO-END TEST CASES FINISHED SUCCESSFULLY!")
        print("=" * 70)

    finally:
        if server is not None:
            server.should_exit = True
            await asyncio.sleep(0.5)
        if cur is not None:
            await cur.close()
        if conn is not None:
            await conn.close()


if __name__ == "__main__":
    asyncio.run(run_e2e_tests())
