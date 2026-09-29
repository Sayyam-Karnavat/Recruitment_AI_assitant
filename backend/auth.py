from datetime import datetime, timedelta
from uuid import UUID

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
import hashlib

from config import settings
from database import get_db

from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials, APIKeyHeader

security = HTTPBearer()
api_key_header = APIKeyHeader(name="Authorization", auto_error=False)

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
    api_key_header: str = Depends(api_key_header),
    db=Depends(get_db)
):
    if not api_key_header:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing API Key")
    
    # Check if they sent "Bearer sk_..."
    if api_key_header.startswith("Bearer "):
        api_key = api_key_header.replace("Bearer ", "")
    else:
        api_key = api_key_header

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

