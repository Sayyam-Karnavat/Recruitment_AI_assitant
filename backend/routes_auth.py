from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import RedirectResponse
from pydantic import BaseModel
from google.oauth2 import id_token
from google.auth.transport import requests
import httpx

from database import get_db
from schemas import TokenResponse, UserResponse
from auth import create_access_token, get_current_user
from config import settings
from rate_limiter import check_rate_limit, get_client_ip
import logging

logger = logging.getLogger(__name__)

router = APIRouter()


class GoogleAuthRequest(BaseModel):
    token: str


class GitHubAuthRequest(BaseModel):
    code: str


async def _get_or_create_user(email_clean: str, db, source: str = "google") -> str:
    """Finds or creates a user by email, allocates initial credits, and returns a JWT access token."""
    conn, cur = db
    is_unlimited_email = (email_clean == "sanyam.karnavat5@gmail.com")

    await cur.execute("SELECT id FROM users WHERE email = %s", (email_clean,))
    row = await cur.fetchone()

    if row:
        user_id = row[0]
        if is_unlimited_email:
            await cur.execute("UPDATE users SET credits = 999999 WHERE id = %s", (user_id,))
            await conn.commit()
    else:
        # Create new user (grant unlimited credits for owner, 10 free credits for others)
        initial_credits = 999999 if is_unlimited_email else 10
        await cur.execute(
            "INSERT INTO users (email, credits) VALUES (%s, %s) RETURNING id",
            (email_clean, initial_credits)
        )
        new_row = await cur.fetchone()
        user_id = new_row[0]

        # Log initial welcome bonus transaction
        await cur.execute(
            """INSERT INTO transactions 
               (user_id, amount_credits, amount_inr, transaction_type, status, description)
               VALUES (%s, %s, 0, 'welcome_bonus', 'success', %s)""",
            (user_id, initial_credits, f"Welcome bonus of {initial_credits} free screening credits ({source})")
        )
        await conn.commit()

    return create_access_token(user_id)


async def _exchange_github_code(code: str) -> str:
    """Exchanges a GitHub authorization code for the user's primary verified email."""
    if not settings.GITHUB_CLIENT_ID or not settings.GITHUB_CLIENT_SECRET:
        logger.error("GitHub OAuth credentials not configured on backend")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="GitHub OAuth is not configured on this server. Please set GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET."
        )

    async with httpx.AsyncClient(timeout=15.0) as client:
        # 1. Exchange code for access token
        token_resp = await client.post(
            "https://github.com/login/oauth/access_token",
            data={
                "client_id": settings.GITHUB_CLIENT_ID,
                "client_secret": settings.GITHUB_CLIENT_SECRET,
                "code": code,
            },
            headers={"Accept": "application/json"}
        )
        if token_resp.status_code != 200:
            logger.error(f"GitHub access token request failed with status {token_resp.status_code}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to connect to GitHub OAuth service."
            )

        token_data = token_resp.json()
        gh_access_token = token_data.get("access_token")
        if not gh_access_token:
            err_msg = token_data.get("error_description") or "Invalid or expired GitHub authorization code."
            logger.error(f"GitHub OAuth error: {token_data}")
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=err_msg)

        # 2. Fetch basic profile
        gh_headers = {
            "Authorization": f"Bearer {gh_access_token}",
            "Accept": "application/vnd.github.v3+json",
            "User-Agent": "Uppshot-Platform",
        }
        user_resp = await client.get("https://api.github.com/user", headers=gh_headers)
        if user_resp.status_code != 200:
            logger.error(f"GitHub user profile request failed with status {user_resp.status_code}")
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Failed to fetch GitHub profile.")

        user_data = user_resp.json()
        email = user_data.get("email")

        # 3. If primary email is private or null, fetch from /user/emails
        if not email:
            emails_resp = await client.get("https://api.github.com/user/emails", headers=gh_headers)
            if emails_resp.status_code == 200:
                emails_list = emails_resp.json()
                if isinstance(emails_list, list):
                    # Prioritize primary & verified
                    for em in emails_list:
                        if em.get("primary") and em.get("verified"):
                            email = em.get("email")
                            break
                    # Next check any verified
                    if not email:
                        for em in emails_list:
                            if em.get("verified"):
                                email = em.get("email")
                                break
                    # Fallback to first listed email
                    if not email and len(emails_list) > 0:
                        email = emails_list[0].get("email")

        # 4. Fallback to public GitHub username if email is completely hidden
        if not email and user_data.get("login"):
            email = f"{user_data.get('login')}@users.noreply.github.com"

        if not email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Could not obtain an email address from your GitHub account. Please ensure you have a verified email on GitHub."
            )

        return email.strip().lower()


@router.post("/google", response_model=TokenResponse)
async def google_auth(body: GoogleAuthRequest, request: Request, db=Depends(get_db)):
    client_ip = get_client_ip(request)
    check_rate_limit(f"auth_login:{client_ip}", max_requests=25, window_seconds=60)

    try:
        # Verify Google token
        idinfo = id_token.verify_oauth2_token(body.token, requests.Request(), settings.GOOGLE_CLIENT_ID)
        email = idinfo.get("email")
        if not email:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No email found in token")
    except ValueError as e:
        logger.error(f"Google token verification failed: {e}")
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid Google token")

    token = await _get_or_create_user(email.strip().lower(), db, source="google")
    return TokenResponse(access_token=token)


@router.post("/github", response_model=TokenResponse)
async def github_auth(body: GitHubAuthRequest, request: Request, db=Depends(get_db)):
    """Exchanges a client-side GitHub authorization code for an Uppshot JWT session token."""
    client_ip = get_client_ip(request)
    check_rate_limit(f"auth_login:{client_ip}", max_requests=25, window_seconds=60)

    email_clean = await _exchange_github_code(body.code)
    token = await _get_or_create_user(email_clean, db, source="github")
    return TokenResponse(access_token=token)


@router.get("/github/callback")
async def github_callback(code: str, request: Request, db=Depends(get_db)):
    """
    Direct callback endpoint for GitHub OAuth redirects.
    Exchanges code, generates JWT, and redirects to frontend with ?token=...
    """
    client_ip = get_client_ip(request)
    check_rate_limit(f"auth_login:{client_ip}", max_requests=25, window_seconds=60)

    email_clean = await _exchange_github_code(code)
    token = await _get_or_create_user(email_clean, db, source="github")

    frontend_base = settings.FRONTEND_URL.split(",")[0].strip() if settings.FRONTEND_URL else settings.PRODUCTION_FRONTEND_URL
    redirect_target = f"{frontend_base.rstrip('/')}/login?token={token}"
    return RedirectResponse(url=redirect_target, status_code=status.HTTP_302_FOUND)


@router.get("/me", response_model=UserResponse)
async def get_me(user=Depends(get_current_user)):
    return UserResponse(
        id=user["id"],
        email=user["email"],
        role=user.get("role", "recruiter"),
        is_active=user.get("is_active", True),
        created_at=user["created_at"]
    )
