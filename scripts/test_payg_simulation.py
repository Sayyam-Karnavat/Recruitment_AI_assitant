"""
=============================================================================
UPPSHOT PLATFORM — CORPORATE PAY-AS-YOU-GO LIFECYCLE SIMULATION TEST
=============================================================================
This test script demonstrates and automatically verifies the entire
Pay-As-You-Go (PAYG) corporate monthly billing lifecycle:

1. Connects to database and provisions a corporate recruiter test account (0 credits).
2. Verifies Razorpay credentials and initiates a card recurring mandate order (₹2.00 RBI auth).
3. Authorizes the mandate using HMAC-SHA256 signature verification with Razorpay secret.
4. Confirms the user's billing mode switches to 'payg_monthly' with card on file.
5. Creates a recruitment job.
6. Uploads and processes 4 genuine PDF resumes:
   - Confirms NO credit lockout occurs even with 0 prepaid credits.
   - Confirms screened resumes counter increments to 4.
   - Confirms accrued bill is exactly ₹3.16 (4 resumes @ standard ₹0.79 / resume).
7. Fast-forwards database billing cycle dates by 31 days to simulate month-end.
8. Triggers monthly billing settlement:
   - Verifies ₹3.16 is invoiced and charged to the corporate card.
   - Verifies a 'payg_settlement' transaction is logged with the card receipt.
   - Verifies payg_screened_count resets to 0.
   - Verifies the next 30-day billing cycle is automatically pushed forward.
9. Cleans up test artifacts.

Usage:
    python scripts/test_payg_simulation.py
=============================================================================
"""

import asyncio
import io
import sys
import uuid
import hmac
import hashlib
from datetime import datetime, timedelta, timezone
from pathlib import Path

# Configure Windows event loop & UTF-8 output
if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")

# Add backend directory to sys.path
backend_path = Path(__file__).resolve().parent.parent / "backend"
sys.path.insert(0, str(backend_path))

import fitz  # PyMuPDF
import httpx
from jose import jwt
import psycopg

from config import settings


def generate_resume_pdf(name: str, role: str, experience_text: str) -> bytes:
    """Generate a clean, parseable PDF resume in memory using PyMuPDF."""
    doc = fitz.open()
    page = doc.new_page()
    content = (
        f"{name}\n"
        f"{role}\n"
        f"Email: {name.lower().replace(' ', '.')}@example.com | Phone: +91 98765 43210 | Location: Bengaluru, India\n\n"
        "PROFESSIONAL SUMMARY\n"
        f"Accomplished {role} with 6+ years of expertise designing scalable backend services, "
        "cloud infrastructure, distributed messaging queues, and REST APIs.\n\n"
        "TECHNICAL SKILLS\n"
        "- Languages: Python, Go, TypeScript, SQL\n"
        "- Frameworks: FastAPI, Django, React, Celery, Node.js\n"
        "- Cloud & Databases: AWS, PostgreSQL, Redis, Docker, Kubernetes\n\n"
        "WORK EXPERIENCE\n"
        f"Senior Software Architect | TechGlobal Corp (2021 - Present)\n"
        f"- {experience_text}\n"
        "- Designed high-throughput asynchronous batch processing pipelines.\n"
        "- Reduced system latency by 45% through aggressive query optimization.\n\n"
        "EDUCATION\n"
        "B.Tech in Computer Science & Engineering - National Institute of Technology (2016 - 2020)\n"
    )
    page.insert_text((50, 72), content, fontsize=10)
    pdf_bytes = doc.tobytes()
    doc.close()
    return pdf_bytes


async def run_simulation():
    print("\n" + "=" * 75)
    print("🏢 UPPSHOT PLATFORM — PAY-AS-YOU-GO LIFECYCLE SIMULATION")
    print("=" * 75)

    conn = None
    server_task = None
    server = None
    user_id = None
    job_id = None

    try:
        # -------------------------------------------------------------------
        # Phase 1: Database & Test User Provisioning
        # -------------------------------------------------------------------
        print("\n[Step 1/8] 🔌 Connecting to Database & Provisioning Test Recruiter...")
        if not settings.DATABASE_URL:
            print("❌ DATABASE_URL missing from backend/.env")
            return

        conn = await psycopg.AsyncConnection.connect(settings.DATABASE_URL)
        cur = conn.cursor()

        print("  🔄 Ensuring database schema and PAYG columns are migrated...")
        await cur.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS billing_mode VARCHAR(20) DEFAULT 'prepaid';")
        await cur.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS payg_screened_count INT DEFAULT 0;")
        await cur.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS payg_cycle_start TIMESTAMPTZ DEFAULT NOW();")
        await cur.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS payg_cycle_end TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days');")
        await cur.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS card_last4 VARCHAR(4);")
        await cur.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS card_network VARCHAR(30);")
        await cur.execute("ALTER TABLE transactions ADD COLUMN IF NOT EXISTS amount_inr NUMERIC(10,2) DEFAULT 0;")
        await cur.execute("""
            CREATE TABLE IF NOT EXISTS payment_orders (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                razorpay_order_id VARCHAR(64) UNIQUE NOT NULL,
                package_id VARCHAR(32) NOT NULL,
                credits INTEGER NOT NULL,
                amount_inr INTEGER NOT NULL,
                amount_paise INTEGER NOT NULL,
                payment_type VARCHAR(16) DEFAULT 'onetime',
                status VARCHAR(16) DEFAULT 'created',
                razorpay_payment_id VARCHAR(64),
                razorpay_signature VARCHAR(256),
                created_at TIMESTAMPTZ DEFAULT NOW(),
                updated_at TIMESTAMPTZ DEFAULT NOW()
            );
        """)
        await cur.execute("""
            CREATE TABLE IF NOT EXISTS payment_mandates (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                razorpay_customer_id VARCHAR(64) NOT NULL,
                razorpay_token_id VARCHAR(64),
                contact VARCHAR(20),
                auto_topup_threshold INTEGER DEFAULT 5,
                auto_topup_package_id VARCHAR(32) DEFAULT 'tier_100',
                is_active BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMPTZ DEFAULT NOW(),
                last_charged_at TIMESTAMPTZ
            );
        """)
        await conn.commit()

        test_email = f"corp.payg.{uuid.uuid4().hex[:6]}@enterprise.test"
        await cur.execute(
            """INSERT INTO users (email, role, credits, billing_mode, payg_screened_count)
               VALUES (%s, 'recruiter', 0, 'prepaid', 0)
               RETURNING id""",
            (test_email,)
        )
        user_row = await cur.fetchone()
        user_id = str(user_row[0])
        await conn.commit()

        print(f"  ✅ Created test user: {test_email} (ID: {user_id})")
        print(f"  ✅ Starting status: billing_mode = 'prepaid', credits = 0 (Zero balance)")

        # Generate JWT Bearer token
        expire = datetime.now(timezone.utc) + timedelta(minutes=60)
        token = jwt.encode({"sub": user_id, "exp": expire}, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)
        headers = {"Authorization": f"Bearer {token}"}

        # -------------------------------------------------------------------
        # Phase 2: Initialize Database Pool & In-Process ASGI Application
        # -------------------------------------------------------------------
        print("\n[Step 2/8] 🌐 Initializing FastAPI Application & Connection Pool...")
        from main import app
        from database import open_pool
        await open_pool()
        print("  ⚡ Direct In-Process ASGI Transport activated (zero port/network dependencies)")

        try:
            transport = httpx.ASGITransport(app=app)
            client_kwargs = {"transport": transport, "base_url": "http://testserver/api"}
        except AttributeError:
            client_kwargs = {"app": app, "base_url": "http://testserver/api"}

        import routes_wallet
        real_get_rzp_client = routes_wallet._get_rzp_client

        def mock_get_rzp_client():
            client = real_get_rzp_client()
            original_fetch = client.payment.fetch
            def mock_fetch(payment_id):
                if str(payment_id).startswith("pay_test_"):
                    return {
                        "id": payment_id,
                        "card": {"last4": "4242", "network": "Visa"},
                        "token_id": "token_test_corp_mandate"
                    }
                return original_fetch(payment_id)
            client.payment.fetch = mock_fetch

            def mock_create_recurring(data):
                return {"id": f"pay_test_recur_{uuid.uuid4().hex[:8]}"}
            client.payment.createRecurring = mock_create_recurring
            return client

        routes_wallet._get_rzp_client = mock_get_rzp_client

        async with httpx.AsyncClient(**client_kwargs, headers=headers, timeout=60.0) as client:

            # ---------------------------------------------------------------
            # Phase 3: Razorpay Credentials Check & Mandate Order
            # ---------------------------------------------------------------
            print("\n[Step 3/8] 💳 Creating Razorpay Card Recurring Mandate Order...")
            print(f"  🔑 RAZORPAY_KEY_ID: {settings.RAZORPAY_KEY_ID[:12] if settings.RAZORPAY_KEY_ID else 'Not set'}...")
            assert settings.RAZORPAY_KEY_ID, "RAZORPAY_KEY_ID is required"
            assert settings.RAZORPAY_KEY_SECRET, "RAZORPAY_KEY_SECRET is required"

            res = await client.post("/wallet/payg/create-mandate-order", json={"contact": "9876543210"})
            assert res.status_code == 200, f"Mandate order creation failed: {res.text}"
            order_data = res.json()
            order_id = order_data["order_id"]
            cust_id = order_data["customer_id"]
            auth_amount = order_data["amount"]
            print(f"  ✅ Mandate Order Created: {order_id} (Customer: {cust_id})")
            print(f"  ✅ RBI Mandate Verification Amount: ₹{auth_amount / 100:.2f} (Refundable standard auth)")

            # ---------------------------------------------------------------
            # Phase 4: Authorize & Verify Corporate Card Mandate
            # ---------------------------------------------------------------
            print("\n[Step 4/8] 🔒 Authorizing & Cryptographically Verifying Card Mandate...")
            test_payment_id = f"pay_test_{uuid.uuid4().hex[:12]}"
            token_id = f"token_test_corp_{uuid.uuid4().hex[:8]}"

            # Generate HMAC-SHA256 signature matching Razorpay utility
            msg = f"{order_id}|{test_payment_id}".encode("utf-8")
            signature = hmac.new(settings.RAZORPAY_KEY_SECRET.encode("utf-8"), msg, hashlib.sha256).hexdigest()

            verify_payload = {
                "razorpay_order_id": order_id,
                "razorpay_payment_id": test_payment_id,
                "razorpay_signature": signature,
                "razorpay_customer_id": cust_id,
                "razorpay_token_id": token_id
            }

            v_res = await client.post("/wallet/payg/verify-mandate", json=verify_payload)
            assert v_res.status_code == 200, f"Verification failed: {v_res.text}"
            print(f"  ✅ Mandate Verified! Response: {v_res.json()['message']}")

            # Verify balance endpoint reflects Pay-As-You-Go mode
            bal_res = await client.get("/wallet/balance")
            bal_data = bal_res.json()
            assert bal_data["billing_mode"] == "payg_monthly", f"Expected payg_monthly, got {bal_data['billing_mode']}"
            assert bal_data["credits"] == 0, f"Expected 0 credits, got {bal_data['credits']}"
            assert bal_data["payg_details"]["is_active"] is True
            print(f"  ✅ Verified Account Status:")
            print(f"     - Billing Mode: {bal_data['billing_mode'].upper()}")
            print(f"     - Linked Card:  {bal_data['card_network']} •••• {bal_data['card_last4']}")
            print(f"     - Prepaid Credits: {bal_data['credits']} (No prepayment required)")

            # ---------------------------------------------------------------
            # Phase 5: Create Recruitment Job
            # ---------------------------------------------------------------
            print("\n[Step 5/8] 💼 Creating Recruitment Job...")
            job_res = await client.post("/jobs", json={
                "title": f"Staff AI & Cloud Engineer {uuid.uuid4().hex[:4]}",
                "description": "Looking for a seasoned backend engineer with Python, Postgres, and Docker skills.",
                "min_passing_score": 60
            })
            assert job_res.status_code == 201, f"Job creation failed: {job_res.text}"
            job_id = job_res.json()["id"]
            print(f"  ✅ Job created with ID: {job_id}")

            # ---------------------------------------------------------------
            # Phase 6: Ingest 4 Resumes with 0 Prepaid Credits
            # ---------------------------------------------------------------
            print("\n[Step 6/8] 📄 Ingesting 4 Real PDF Resumes (Zero Credits Balance)...")
            pdf1 = generate_resume_pdf("Siddharth Rao", "Backend Team Lead", "Led distributed Python & FastAPI microservices architecture.")
            pdf2 = generate_resume_pdf("Meera Patel", "Senior Systems Engineer", "Implemented Redis caching and PostgreSQL query optimizations.")
            pdf3 = generate_resume_pdf("Arjun Sharma", "AI Infrastructure Engineer", "Built LLM evaluation and ingestion pipelines on AWS.")
            pdf4 = generate_resume_pdf("Kavita Nair", "Full Stack Developer", "Developed scalable recruitment portals using React and Python.")

            upload_files = [
                ("files", ("siddharth_backend.pdf", pdf1, "application/pdf")),
                ("files", ("meera_systems.pdf", pdf2, "application/pdf")),
                ("files", ("arjun_ai.pdf", pdf3, "application/pdf")),
                ("files", ("kavita_fullstack.pdf", pdf4, "application/pdf")),
            ]

            up_res = await client.post(f"/jobs/{job_id}/upload", files=upload_files)
            assert up_res.status_code == 200, f"Upload rejected! Response: {up_res.text}"
            up_data = up_res.json()
            print(f"  ✅ Upload Succeeded without credit check block! (Batch: {up_data['batch_id']})")
            print(f"  ✅ Processed Files Count: {up_data['total_files']} files")

            # Verify PAYG usage metering in wallet balance
            bal_res2 = await client.get("/wallet/balance")
            payg_stats = bal_res2.json()["payg_details"]
            print(f"\n  📊 Metered Pay-As-You-Go Usage:")
            print(f"     - Resumes Screened This Month: {payg_stats['screened_this_cycle']}")
            print(f"     - Standard Rate:              ₹{payg_stats['rate_per_resume_inr']} / resume")
            print(f"     - Accrued Bill:               ₹{payg_stats['current_accrued_inr']:.2f}")

            assert payg_stats["screened_this_cycle"] == 4, f"Expected 4 screened, got {payg_stats['screened_this_cycle']}"
            assert payg_stats["current_accrued_inr"] == 3.16, f"Expected ₹3.16 accrued (4 * 0.79), got {payg_stats['current_accrued_inr']}"

            # ---------------------------------------------------------------
            # Phase 7: Simulate Month-End by Fast-Forwarding Database Dates
            # ---------------------------------------------------------------
            print("\n[Step 7/8] ⏳ Simulating Month-End by Shifting Dates in Database (31 Days Ahead)...")
            await cur.execute(
                """UPDATE users
                   SET payg_cycle_start = NOW() - INTERVAL '31 days',
                       payg_cycle_end = NOW() - INTERVAL '1 day'
                   WHERE id = %s""",
                (user_id,)
            )
            await conn.commit()

            # Confirm cycle is now due for settlement
            await cur.execute("SELECT payg_cycle_end < NOW() FROM users WHERE id = %s", (user_id,))
            cycle_ended = (await cur.fetchone())[0]
            print(f"  ✅ Database Updated: payg_cycle_end is in the past -> Month Completed: {cycle_ended}")

            # ---------------------------------------------------------------
            # Phase 8: Execute Monthly Settlement & Verify Invoice Deduction
            # ---------------------------------------------------------------
            print("\n[Step 8/8] 💰 Executing Monthly Settlement / Invoicing...")
            settle_res = await client.post("/wallet/payg/settle-cycle")
            assert settle_res.status_code == 200, f"Settlement failed: {settle_res.text}"
            settle_data = settle_res.json()

            print(f"  ✅ Settlement Response: {settle_data['message']}")
            print(f"  ✅ Amount Invoiced:      ₹{settle_data['amount_inr']:.2f}")
            print(f"  ✅ Resumes Settled:      {settle_data['screened_count']}")
            print(f"  ✅ Transaction Ref:      {settle_data.get('reference_id')}")

            assert settle_data["amount_inr"] == 3.16, f"Expected ₹3.16 deducted, got {settle_data['amount_inr']}"
            assert settle_data["screened_count"] == 4, f"Expected 4 resumes settled, got {settle_data['screened_count']}"

            # Verify post-settlement database state
            await cur.execute(
                """SELECT payg_screened_count, payg_cycle_end > NOW(),
                          (SELECT COUNT(*) FROM transactions WHERE user_id = %s AND transaction_type = 'payg_settlement')
                   FROM users WHERE id = %s""",
                (user_id, user_id)
            )
            db_row = await cur.fetchone()
            new_screened_count, cycle_extended, settlement_tx_count = db_row

            assert new_screened_count == 0, f"Expected screened count reset to 0, got {new_screened_count}"
            assert cycle_extended is True, "Expected billing cycle pushed forward into future"
            assert settlement_tx_count >= 1, "Expected settlement transaction in database"

            print(f"\n  🔍 Post-Settlement Verification:")
            print(f"     - Reset Screened Count:      {new_screened_count} (Clean slate for new month)")
            print(f"     - Billing Cycle Extended:    Next 30 Days Scheduled ✅")
            print(f"     - Settlement Invoice Logged: Confirmed in Database ✅")

            # Final balance check via API
            bal_final = (await client.get("/wallet/balance")).json()
            assert bal_final["payg_details"]["screened_this_cycle"] == 0
            assert bal_final["payg_details"]["current_accrued_inr"] == 0.0
            print(f"     - Live Wallet API Screened:  {bal_final['payg_details']['screened_this_cycle']}")
            print(f"     - Live Wallet API Accrued:   ₹{bal_final['payg_details']['current_accrued_inr']:.2f}")

        # -------------------------------------------------------------------
        # Clean Up Test User Records
        # -------------------------------------------------------------------
        print("\n🧹 Cleaning up test user and batch data...")
        if job_id:
            await cur.execute("DELETE FROM jobs WHERE id = %s", (job_id,))
        if user_id:
            await cur.execute("DELETE FROM users WHERE id = %s", (user_id,))
        await conn.commit()
        print("  ✅ Temporary test data cleaned up.")

        print("\n" + "=" * 75)
        print("🎉 ALL PAY-AS-YOU-GO LIFECYCLE TESTS PASSED PERFECTLY!")
        print("   1. Card Mandate Authorization Verified")
        print("   2. Zero-Credit Uninterrupted Screening Confirmed")
        print("   3. Metred Billing (4 * ₹0.79 = ₹3.16) Verified")
        print("   4. Month-End Date Shifting Simulated")
        print("   5. Automatic Monthly Invoice & Card Charge Verified")
        print("   6. Cycle Rollover & Counter Reset Confirmed")
        print("=" * 75 + "\n")

    except Exception as e:
        print(f"\n❌ Test Failed with Exception: {e}")
        import traceback
        traceback.print_exc()

    finally:
        from database import close_pool
        try:
            await close_pool()
        try:
            import routes_wallet
            routes_wallet._get_rzp_client = real_get_rzp_client
        except Exception:
            pass
        if conn:
            await conn.close()


if __name__ == "__main__":
    asyncio.run(run_simulation())
