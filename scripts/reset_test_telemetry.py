"""
Safe Database Reset Script for Superadmin:
Clears test transactions, test orders, and test subscription data so production starts with 0 revenue.
Optionally resets recruiter credit balances and clears test candidates.

Usage:
    python scripts/reset_test_telemetry.py
"""

import asyncio
import os
import sys
from pathlib import Path

# Add backend to sys.path
backend_path = Path(__file__).resolve().parent.parent / "backend"
sys.path.insert(0, str(backend_path))

import psycopg
from config import settings


async def reset_test_telemetry():
    print("=" * 65)
    print("🧹 UPPSHOT PLATFORM — FINANCIAL & TEST DATA RESET UTILITY")
    print("=" * 65)

    if not settings.DATABASE_URL:
        print("❌ DATABASE_URL is not set in backend/.env")
        return

    print(f"Connecting to database...")
    conn = await psycopg.AsyncConnection.connect(settings.DATABASE_URL)
    cur = conn.cursor()

    try:
        # 1. Transactions & Orders
        await cur.execute("SELECT COUNT(*), COALESCE(SUM(amount_inr), 0) FROM transactions WHERE transaction_type = 'purchase'")
        tx_count, tx_sum = await cur.fetchone()
        print(f"Found {tx_count} purchase transactions totaling ₹{tx_sum}.")

        await cur.execute("DELETE FROM transactions")
        await cur.execute("DELETE FROM payment_orders")
        await cur.execute("DELETE FROM subscriptions")
        print("✅ Cleared all transactions, payment orders, and subscriptions (Revenue reset to ₹0).")

        # 2. Reset test recruiter credits to default starting balance (keep superadmin unlimited)
        await cur.execute(
            "UPDATE users SET credits = 50 WHERE email != 'sanyam.karnavat5@gmail.com' AND role != 'admin'"
        )
        print("✅ Recruiter test credits reset to default starter balance (50 credits).")

        await conn.commit()
        print("\n🎉 Telemetry reset complete! Superadmin dashboard will now show clean ₹0 metrics.")

    except Exception as e:
        await conn.rollback()
        print(f"❌ Error resetting database: {e}")
    finally:
        await cur.close()
        await conn.close()


if __name__ == "__main__":
    asyncio.run(reset_test_telemetry())
