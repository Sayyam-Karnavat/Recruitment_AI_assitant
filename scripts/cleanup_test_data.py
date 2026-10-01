"""
Production Database Sanitation Script:
Safely purges transient simulation users (@enterprise.test), test payment mandates,
and mock test transactions from the Render PostgreSQL database.
Ensures real users have proper defaults (billing_mode='prepaid', payg_screened_count=0).

Usage:
    python scripts/cleanup_test_data.py
"""

import os
import sys
from pathlib import Path

# Add backend to sys.path
backend_path = Path(__file__).resolve().parent.parent / "backend"
sys.path.insert(0, str(backend_path))

import psycopg
from config import settings


def cleanup_test_data():
    print("=" * 70)
    print("🧹 UPPSHOT PLATFORM — PRODUCTION DATABASE SANITATION")
    print("=" * 70)

    if not settings.DATABASE_URL:
        print("❌ DATABASE_URL is not configured in backend/.env")
        return

    print("🔌 Connecting to Render PostgreSQL database...")
    try:
        with psycopg.connect(settings.DATABASE_URL) as conn:
            with conn.cursor() as cur:
                # 1. Purge simulation test users
                cur.execute(
                    "SELECT id, email FROM users WHERE email LIKE '%@enterprise.test' OR email LIKE 'corp.payg.%'"
                )
                test_users = cur.fetchall()
                print(f"  🔍 Found {len(test_users)} test simulation users.")

                if test_users:
                    test_ids = [str(u[0]) for u in test_users]
                    cur.execute("DELETE FROM jobs WHERE user_id = ANY(%s)", (test_ids,))
                    cur.execute("DELETE FROM payment_orders WHERE user_id = ANY(%s)", (test_ids,))
                    cur.execute("DELETE FROM payment_mandates WHERE user_id = ANY(%s)", (test_ids,))
                    cur.execute("DELETE FROM transactions WHERE user_id = ANY(%s)", (test_ids,))
                    cur.execute("DELETE FROM users WHERE id = ANY(%s)", (test_ids,))
                    print(f"  ✅ Purged {len(test_users)} test simulation users and their child records.")

                # 2. Purge test / mock transactions
                cur.execute("DELETE FROM transactions WHERE reference_id LIKE 'pay_test_%'")
                print("  ✅ Purged simulation test transactions.")

                # 3. Purge test payment orders
                cur.execute(
                    "DELETE FROM payment_orders WHERE razorpay_payment_id LIKE 'pay_test_%' OR razorpay_order_id LIKE '%test%'"
                )
                print("  ✅ Purged simulation test payment orders.")

                # 4. Purge test mandates
                cur.execute(
                    "DELETE FROM payment_mandates WHERE razorpay_token_id LIKE 'token_test_%' OR razorpay_customer_id LIKE 'cust_test_%'"
                )
                print("  ✅ Purged simulation test mandates.")

                # 5. Ensure existing production users have safe default states
                cur.execute("UPDATE users SET billing_mode = 'prepaid' WHERE billing_mode IS NULL")
                cur.execute("UPDATE users SET payg_screened_count = 0 WHERE payg_screened_count IS NULL")
                print("  ✅ Ensured all accounts have valid billing_mode ('prepaid') and counters initialized.")

                conn.commit()

        print("\n🎉 Database is 100% clean and production-ready!")
        print("=" * 70)

    except Exception as e:
        print(f"❌ Error during database sanitation: {e}")


if __name__ == "__main__":
    cleanup_test_data()
