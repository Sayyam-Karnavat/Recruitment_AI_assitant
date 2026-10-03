from datetime import datetime, timedelta
from uuid import UUID

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials, APIKeyHeader
from jose import JWTError, jwt
import hashlib

from config import settings
from database import get_db

from typing import Optional

security = HTTPBearer()
x_api_key_header = APIKeyHeader(name="X-API-Key", auto_error=False)
auth_header = APIKeyHeader(name="Authorization", auto_error=False)

def hash_api_key(api_key: str) -> str:
    return hashlib.sha256(api_key.encode()).hexdigest()

def create_access_token(user_id: UUID) -> str:
    expire = datetime.utcnow() + timedelta(minutes=settings.JWT_EXPIRY_MINUTES)
    payload = {"sub": str(user_id), "exp": expire}
    return jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db=Depends(get_db),
):
    """Decode JWT and return user row as dict."""
    conn, cur = db
    token = credentials.credentials
    try:
        payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
        user_id = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

    await cur.execute(
        "SELECT id, email, created_at, COALESCE(role, 'recruiter'), COALESCE(is_active, TRUE) FROM users WHERE id = %s",
        (user_id,)
    )
    user = await cur.fetchone()
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")

    if not user[4]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account has been suspended. Please contact support.")

    return {"id": user[0], "email": user[1], "created_at": user[2], "role": user[3], "is_active": user[4]}


async def get_api_key_user(
    x_api_key: Optional[str] = Depends(x_api_key_header),
    auth_val: Optional[str] = Depends(auth_header),
    db=Depends(get_db)
):
    raw_key = x_api_key or auth_val
    if not raw_key:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing API Key. Provide via 'X-API-Key' or 'Authorization: Bearer <key>' header.")
    
    # Check if they sent "Bearer sk_..."
    if raw_key.startswith("Bearer "):
        api_key = raw_key.replace("Bearer ", "").strip()
    else:
        api_key = raw_key.strip()

    hashed_key = hash_api_key(api_key)
    conn, cur = db
    
    await cur.execute(
        """SELECT u.id, u.email, u.created_at, COALESCE(u.role, 'recruiter'), COALESCE(u.is_active, TRUE)
           FROM api_keys a JOIN users u ON a.user_id = u.id WHERE a.api_key_hash = %s""", 
        (hashed_key,)
    )
    user = await cur.fetchone()
    
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid API Key")

    if not user[4]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account has been suspended.")

    return {"id": user[0], "email": user[1], "created_at": user[2], "role": user[3], "is_active": user[4]}


async def verify_admin_user(
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> dict:
    """Dependency that ensures the request contains a valid, dedicated Admin Portal token."""
    token = credentials.credentials
    try:
        payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
        role = payload.get("role")
        if role != "admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Administrative privileges required to access this endpoint."
            )
        return {
            "id": payload.get("sub", "admin-root"),
            "role": "admin",
            "username": payload.get("username", settings.ADMIN_USERNAME)
        }
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired admin session. Please log in to Admin Portal."
        )


def verify_google_token_payload(token_str: str) -> dict:
    """Verify a Google OAuth ID token, supporting single or comma-separated client IDs with dynamic .env fallback."""
    import logging
    import os
    from pathlib import Path
    from google.oauth2 import id_token
    from google.auth.transport import requests as google_requests

    log = logging.getLogger("auth.google")

    # Read latest GOOGLE_CLIENT_ID from backend/.env directly, OS env, or settings
    env_cids = ""
    env_path = Path(__file__).resolve().parent / ".env"
    if env_path.exists():
        try:
            for line in env_path.read_text(encoding="utf-8").splitlines():
                line = line.strip()
                if line.startswith("GOOGLE_CLIENT_ID="):
                    env_cids = line.split("=", 1)[1].strip().strip('"').strip("'")
                    break
        except Exception as e:
            log.warning(f"Could not read .env for GOOGLE_CLIENT_ID: {e}")

    raw_cids = env_cids or os.environ.get("GOOGLE_CLIENT_ID") or getattr(settings, "GOOGLE_CLIENT_ID", "") or ""
    allowed_cids = [cid.strip() for cid in raw_cids.split(",") if cid.strip()]

    # Verify cryptographic signature using Google's public certificates with clock skew tolerance
    try:
        idinfo = id_token.verify_oauth2_token(
            token_str,
            google_requests.Request(),
            None,
            clock_skew_in_seconds=60
        )
    except TypeError:
        idinfo = id_token.verify_oauth2_token(token_str, google_requests.Request(), None)
    token_aud = idinfo.get("aud")

    if allowed_cids:
        if token_aud not in allowed_cids:
            log.error(f"Google token audience mismatch! Token aud: '{token_aud}' | Allowed CIDs: {allowed_cids}")
            raise ValueError(f"Token audience {token_aud} does not match allowed client IDs: {allowed_cids}")
        log.info(f"Google token verified successfully for aud: {token_aud}")

    return idinfo
