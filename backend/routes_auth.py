from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from google.oauth2 import id_token
from google.auth.transport import requests

from database import get_db
from schemas import TokenResponse, UserResponse
from auth import create_access_token, get_current_user
from config import settings
import logging

logger = logging.getLogger(__name__)

router = APIRouter()

class GoogleAuthRequest(BaseModel):
    token: str

@router.post("/google", response_model=TokenResponse)
async def google_auth(body: GoogleAuthRequest, db=Depends(get_db)):
    conn, cur = db
    try:
        # Verify Google token
        idinfo = id_token.verify_oauth2_token(body.token, requests.Request(), settings.GOOGLE_CLIENT_ID)
        email = idinfo.get("email")
        if not email:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No email found in token")
            
    except ValueError as e:
        logger.error(f"Google token verification failed: {e}")
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid Google token")

    # Check if user exists
    await cur.execute("SELECT id FROM users WHERE email = %s", (email,))
    row = await cur.fetchone()
    
    if row:
        user_id = row[0]
    else:
        # Create new user
        await cur.execute(
            "INSERT INTO users (email) VALUES (%s) RETURNING id",
            (email,)
        )
        new_row = await cur.fetchone()
        await conn.commit()
        user_id = new_row[0]
        
    token = create_access_token(user_id)
    return TokenResponse(access_token=token)

@router.get("/me", response_model=UserResponse)
async def get_me(user=Depends(get_current_user)):
    return UserResponse(id=user["id"], email=user["email"], created_at=user["created_at"])
