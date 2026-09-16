"""
Wallet & Razorpay monetization routes.
Provides balance check, package orders, payment verification, and audit logs.
"""

import uuid
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from auth import get_current_user
from config import settings
from database import get_db

router = APIRouter()

PACKAGES = {
    "tier_50": {"credits": 50, "amount_inr": 250, "label": "Starter (50 Credits)"},
    "tier_100": {"credits": 100, "amount_inr": 500, "label": "Standard (100 Credits - Recommended)"},
    "tier_250": {"credits": 250, "amount_inr": 1100, "label": "Growth (250 Credits)"},
    "tier_500": {"credits": 500, "amount_inr": 2000, "label": "Enterprise (500 Credits)"},
}


class CreateOrderRequest(BaseModel):
    package_id: str


class VerifyPaymentRequest(BaseModel):
    package_id: str
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: Optional[str] = None


@router.get("/balance")
async def get_wallet_balance(
    user=Depends(get_current_user),
    db=Depends(get_db)
):
    """Retrieve user's current credit balance and purchase tiers."""
    conn, cur = db
    user_email = (user.get("email") or "").lower()
    is_unlimited = (user_email == "sanyam.karnavat5@gmail.com")

    if is_unlimited:
        current_credits = 999999
        await cur.execute("UPDATE users SET credits = 999999 WHERE id = %s", (str(user["id"]),))
        await conn.commit()
    else:
        await cur.execute("SELECT credits, email FROM users WHERE id = %s", (str(user["id"]),))
        row = await cur.fetchone()
        current_credits = row[0] if row and row[0] is not None else 0

    packages_list = [
        {
            "id": pid,
            "credits": pkg["credits"],
            "amount_inr": pkg["amount_inr"],
            "label": pkg["label"],
            "cost_per_credit": round(pkg["amount_inr"] / pkg["credits"], 2)
        }
        for pid, pkg in PACKAGES.items()
    ]

    return {
        "credits": current_credits,
        "email": user["email"],
        "is_unlimited": is_unlimited,
        "cost_per_credit_inr": 5,
        "packages": packages_list,
        "is_mock_mode": not bool(settings.RAZORPAY_KEY_ID and settings.RAZORPAY_KEY_SECRET)
    }


@router.get("/transactions")
async def get_wallet_transactions(
    user=Depends(get_current_user),
    db=Depends(get_db)
):
    """Retrieve transaction history and credit audits."""
    conn, cur = db
    await cur.execute(
        """SELECT id, amount_credits, amount_inr, transaction_type, status, reference_id, description, created_at
           FROM transactions
           WHERE user_id = %s
           ORDER BY created_at DESC
           LIMIT 50""",
        (str(user["id"]),)
    )
    rows = await cur.fetchall()

    return [
        {
            "id": str(r[0]),
            "amount_credits": r[1],
            "amount_inr": r[2],
            "transaction_type": r[3],
            "status": r[4],
            "reference_id": r[5],
            "description": r[6],
            "created_at": r[7].isoformat() if r[7] else None
        }
        for r in rows
    ]


@router.post("/create-order")
async def create_razorpay_order(
    req: CreateOrderRequest,
    user=Depends(get_current_user),
):
    """Create a Razorpay order or mock sandbox order for top-up."""
    if req.package_id not in PACKAGES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid package_id. Choose from: {list(PACKAGES.keys())}"
        )

    package = PACKAGES[req.package_id]
    amount_inr = package["amount_inr"]
    amount_paise = amount_inr * 100

    if settings.RAZORPAY_KEY_ID and settings.RAZORPAY_KEY_SECRET:
        try:
            import razorpay
            client = razorpay.Client(auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET))
            order = client.order.create({
                "amount": amount_paise,
                "currency": "INR",
                "receipt": f"rcpt_{uuid.uuid4().hex[:8]}",
                "notes": {
                    "user_id": str(user["id"]),
                    "package_id": req.package_id,
                    "credits": package["credits"]
                }
            })
            return {
                "order_id": order["id"],
                "amount": amount_paise,
                "currency": "INR",
                "key_id": settings.RAZORPAY_KEY_ID,
                "package_id": req.package_id,
                "credits": package["credits"],
                "is_mock": False
            }
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to create Razorpay order: {str(e)}"
            )

    # Sandbox / Mock Mode
    mock_order_id = f"order_mock_{uuid.uuid4().hex[:12]}"
    return {
        "order_id": mock_order_id,
        "amount": amount_paise,
        "currency": "INR",
        "key_id": "rzp_test_mock_sandbox",
        "package_id": req.package_id,
        "credits": package["credits"],
        "is_mock": True
    }


@router.post("/verify-payment")
async def verify_payment(
    req: VerifyPaymentRequest,
    user=Depends(get_current_user),
    db=Depends(get_db)
):
    """Verify payment and credit user's account."""
    if req.package_id not in PACKAGES:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid package_id")

    package = PACKAGES[req.package_id]
    credits_to_add = package["credits"]
    amount_inr = package["amount_inr"]

    # If real Razorpay credentials are set, verify signature
    if settings.RAZORPAY_KEY_ID and settings.RAZORPAY_KEY_SECRET and not req.razorpay_order_id.startswith("order_mock_"):
        try:
            import razorpay
            client = razorpay.Client(auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET))
            client.utility.verify_payment_signature({
                "razorpay_order_id": req.razorpay_order_id,
                "razorpay_payment_id": req.razorpay_payment_id,
                "razorpay_signature": req.razorpay_signature or ""
            })
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Payment signature verification failed: {str(e)}"
            )

    # Ensure idempotency: check if payment_id was already processed
    conn, cur = db
    await cur.execute(
        "SELECT id FROM transactions WHERE reference_id = %s",
        (req.razorpay_payment_id,)
    )
    if await cur.fetchone():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This payment has already been credited."
        )

    # Add credits to user
    await cur.execute(
        "UPDATE users SET credits = credits + %s WHERE id = %s RETURNING credits",
        (credits_to_add, str(user["id"]))
    )
    user_row = await cur.fetchone()
    new_balance = user_row[0] if user_row else credits_to_add

    # Log transaction
    await cur.execute(
        """INSERT INTO transactions
           (user_id, amount_credits, amount_inr, transaction_type, status, reference_id, description)
           VALUES (%s, %s, %s, 'purchase', 'success', %s, %s)""",
        (
            str(user["id"]),
            credits_to_add,
            amount_inr,
            req.razorpay_payment_id,
            f"Wallet Top-Up: {credits_to_add} Credits (₹{amount_inr})"
        )
    )
    await conn.commit()

    return {
        "success": True,
        "credits_added": credits_to_add,
        "new_balance": new_balance,
        "message": f"Successfully added {credits_to_add} credits to your wallet!"
    }
