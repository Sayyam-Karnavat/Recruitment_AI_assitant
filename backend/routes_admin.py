"""
Admin Portal & Unit Economics Telemetry Routes.
Protected by verify_admin_user dependency (Role-Based Access Control).
"""

import uuid
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field

from database import get_db
from auth import verify_admin_user

router = APIRouter()


class AdjustCreditsRequest(BaseModel):
    amount_credits: int = Field(..., description="Credits to add (positive) or deduct (negative)")
    reason: Optional[str] = Field("Manual administrative adjustment", description="Audit note")


class UpdateUserStatusRequest(BaseModel):
    is_active: bool


@router.get("/metrics")
async def get_admin_metrics(
    admin=Depends(verify_admin_user),
    db=Depends(get_db)
):
    """
    Compute real-time platform financial health, LLM token costs, and gross margins.
    """
    conn, cur = db

    # Total recruiters
    await cur.execute("SELECT count(*) FROM users WHERE role != 'admin' OR role IS NULL")
    total_recruiters = (await cur.fetchone())[0]

    # Total jobs
    await cur.execute("SELECT count(*) FROM jobs")
    total_jobs = (await cur.fetchone())[0]

    # Candidate statistics
    await cur.execute(
        """SELECT 
               count(*),
               count(*) FILTER (WHERE status = 'completed'),
               count(*) FILTER (WHERE status = 'pending'),
               count(*) FILTER (WHERE status = 'failed'),
               count(*) FILTER (WHERE error_type = 'system_fault'),
               count(*) FILTER (WHERE error_type = 'user_fault')
           FROM candidates"""
    )
    cand_row = await cur.fetchone()
    total_candidates = cand_row[0]
    completed_candidates = cand_row[1]
    pending_candidates = cand_row[2]
    failed_candidates = cand_row[3]
    system_faults = cand_row[4]
    user_faults = cand_row[5]

    # Total Revenue from Razorpay purchases
    await cur.execute(
        """SELECT COALESCE(SUM(amount_inr), 0), count(*) 
           FROM transactions 
           WHERE transaction_type = 'purchase' AND status = 'success'"""
    )
    rev_row = await cur.fetchone()
    total_revenue_inr = rev_row[0]
    total_purchases_count = rev_row[1]

    # Dynamic Token Cost Telemetry (GPT-4o-mini rates)
    # Average 2,875 input tokens + 700 output tokens per completed candidate
    avg_input_tokens = 2875
    avg_output_tokens = 700
    usd_to_inr = 85.50

    input_cost_usd_per_token = 0.15 / 1_000_000
    output_cost_usd_per_token = 0.60 / 1_000_000

    cost_per_eval_usd = (avg_input_tokens * input_cost_usd_per_token) + (avg_output_tokens * output_cost_usd_per_token)
    cost_per_eval_inr = round(cost_per_eval_usd * usd_to_inr, 4)

    total_tokens_used = completed_candidates * (avg_input_tokens + avg_output_tokens)
    total_llm_cost_inr = round(completed_candidates * cost_per_eval_inr, 2)

    # Unit Economics & Gross Profit Margins
    gross_profit_inr = round(total_revenue_inr - total_llm_cost_inr, 2)
    gross_margin_pct = (
        round((gross_profit_inr / total_revenue_inr) * 100, 1)
        if total_revenue_inr > 0
        else 0.0
    )

    return {
        "overview": {
            "total_recruiters": total_recruiters,
            "total_jobs": total_jobs,
            "total_candidates": total_candidates,
            "completed_screenings": completed_candidates,
            "pending_screenings": pending_candidates,
            "failed_screenings": failed_candidates,
            "system_fault_rate": round((system_faults / total_candidates * 100), 2) if total_candidates > 0 else 0.0,
            "user_fault_rate": round((user_faults / total_candidates * 100), 2) if total_candidates > 0 else 0.0,
        },
        "financials": {
            "total_revenue_inr": total_revenue_inr,
            "total_purchases_count": total_purchases_count,
            "total_tokens_used": total_tokens_used,
            "total_llm_cost_inr": total_llm_cost_inr,
            "gross_profit_inr": gross_profit_inr,
            "gross_margin_pct": gross_margin_pct,
            "avg_cost_per_resume_inr": cost_per_eval_inr,
            "avg_selling_price_per_credit_inr": round(total_revenue_inr / (total_purchases_count or 1), 2),
            "model_telemetry": {
                "active_model": "gpt-4o-mini",
                "input_rate_per_1m_usd": 0.15,
                "output_rate_per_1m_usd": 0.60,
                "usd_to_inr_peg": usd_to_inr
            }
        }
    }


@router.get("/users")
async def list_admin_users(
    admin=Depends(verify_admin_user),
    db=Depends(get_db)
):
    """List all registered users with credit balances and usage stats."""
    conn, cur = db
    await cur.execute(
        """SELECT 
               u.id, 
               u.email, 
               COALESCE(u.credits, 0),
               COALESCE(u.role, 'recruiter'), 
               COALESCE(u.is_active, TRUE),
               u.created_at,
               (SELECT count(*) FROM jobs j WHERE j.user_id = u.id) as job_count,
               (SELECT count(*) FROM candidates c JOIN jobs j ON c.job_id = j.id WHERE j.user_id = u.id) as cand_count,
               (SELECT COALESCE(SUM(amount_inr), 0) FROM transactions t WHERE t.user_id = u.id AND t.transaction_type = 'purchase' AND t.status = 'success') as total_spent
           FROM users u
           ORDER BY u.created_at DESC"""
    )
    rows = await cur.fetchall()

    return [
        {
            "id": str(r[0]),
            "email": r[1],
            "credits": r[2],
            "role": r[3],
            "is_active": r[4],
            "created_at": r[5].isoformat() if r[5] else None,
            "job_count": r[6],
            "candidate_count": r[7],
            "total_spent_inr": r[8]
        }
        for r in rows
    ]


@router.post("/users/{user_id}/credits")
async def adjust_user_credits(
    user_id: uuid.UUID,
    req: AdjustCreditsRequest,
    admin=Depends(verify_admin_user),
    db=Depends(get_db)
):
    """Manually grant or deduct credits for a user."""
    conn, cur = db
    await cur.execute("SELECT id, credits, email FROM users WHERE id = %s", (str(user_id),))
    user_row = await cur.fetchone()
    if not user_row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    new_credits = max(0, user_row[1] + req.amount_credits)
    await cur.execute("UPDATE users SET credits = %s WHERE id = %s", (new_credits, str(user_id)))

    # Log administrative transaction
    await cur.execute(
        """INSERT INTO transactions
           (user_id, amount_credits, amount_inr, transaction_type, status, description)
           VALUES (%s, %s, 0, 'admin_adjustment', 'success', %s)""",
        (
            str(user_id),
            req.amount_credits,
            f"Admin adjustment by {admin['email']}: {req.reason}"
        )
    )
    await conn.commit()

    return {
        "success": True,
        "user_id": str(user_id),
        "previous_credits": user_row[1],
        "new_credits": new_credits,
        "adjustment": req.amount_credits,
        "message": f"Updated balance for {user_row[2]} to {new_credits} credits."
    }


@router.post("/users/{user_id}/status")
async def update_user_status(
    user_id: uuid.UUID,
    req: UpdateUserStatusRequest,
    admin=Depends(verify_admin_user),
    db=Depends(get_db)
):
    """Activate or suspend a user account."""
    conn, cur = db
    await cur.execute("SELECT id, email FROM users WHERE id = %s", (str(user_id),))
    user_row = await cur.fetchone()
    if not user_row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    if user_row[1] in ("sanyam.karnavat5@gmail.com", "admin@resumeai.com") and not req.is_active:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot deactivate the superadmin account.")

    await cur.execute("UPDATE users SET is_active = %s WHERE id = %s", (req.is_active, str(user_id)))
    await conn.commit()

    return {
        "success": True,
        "user_id": str(user_id),
        "is_active": req.is_active,
        "message": f"User {user_row[1]} is now {'active' if req.is_active else 'suspended'}."
    }
