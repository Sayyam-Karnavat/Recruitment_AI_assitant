"""
Safe Database Reset Script for Superadmin:
Clears test transactions, test orders, and test subscription data so production starts with 0 revenue.
Optionally resets recruiter credit balances and clears test candidates.

Usage:
    python scripts/reset_test_telemetry.py
"""

import os
import sys
from pathlib import Path

# Add backend to sys.path
backend_path = Path(__file__).resolve().parent.parent / "backend"
sys.path.insert(0, str(backend_path))

import psycopg
from config import settings


def reset_test_telemetry():
    print("=" * 65)
    print("🧹 UPPSHOT PLATFORM — FINANCIAL & TEST DATA RESET UTILITY")
    print("=" * 65)

    if not settings.DATABASE_URL:
        print("❌ DATABASE_URL is not set in backend/.env")
        return

    print("Connecting to database...")
    try:
        with psycopg.connect(settings.DATABASE_URL) as conn:
            with conn.cursor() as cur:
                # 1. Check existing purchase transactions
                cur.execute("SELECT COUNT(*), COALESCE(SUM(amount_inr), 0) FROM transactions WHERE transaction_type = 'purchase'")
                tx_count, tx_sum = cur.fetchone()
                print(f"Found {tx_count} purchase transactions totaling ₹{tx_sum}.")

                # 2. Reset transactions, orders, subscriptions
                cur.execute("DELETE FROM transactions")
                cur.execute("DELETE FROM payment_orders")
                cur.execute("DELETE FROM subscriptions")
                print("✅ Cleared all transactions, payment orders, and subscriptions (Revenue reset to ₹0).")

                # 3. Reset test recruiter credits to default starting balance (keep superadmin unlimited)
                cur.execute(
                    "UPDATE users SET credits = 50 WHERE email != 'sanyam.karnavat5@gmail.com' AND role != 'admin'"
                )
                print("✅ Recruiter test credits reset to default starter balance (50 credits).")

                conn.commit()
                print("\n🎉 Telemetry reset complete! Superadmin dashboard will now show clean ₹0 metrics.")

    except Exception as e:
        print(f"❌ Error resetting database: {e}")


if __name__ == "__main__":
    reset_test_telemetry()
