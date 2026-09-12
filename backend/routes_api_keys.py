import uuid
import secrets
import hashlib
from fastapi import APIRouter, Depends, HTTPException, status
from database import get_db
from schemas import APIKeyCreate, APIKeyResponse
from auth import get_current_user

router = APIRouter()

def hash_api_key(api_key: str) -> str:
    return hashlib.sha256(api_key.encode()).hexdigest()

@router.post("", response_model=APIKeyResponse)
async def create_api_key(
    req: APIKeyCreate,
    user=Depends(get_current_user),
    db=Depends(get_db)
):
    conn, cur = db
    
    # Check max limit (e.g., 5 keys per user)
    await cur.execute("SELECT count(*) FROM api_keys WHERE user_id = %s", (str(user["id"]),))
    count = (await cur.fetchone())[0]
    if count >= 5:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Maximum 5 API keys allowed")
    
    raw_key = f"sk_{secrets.token_urlsafe(32)}"
    hashed_key = hash_api_key(raw_key)
    
    await cur.execute(
        """
        INSERT INTO api_keys (user_id, api_key_hash, name)
        VALUES (%s, %s, %s)
        RETURNING id, name, created_at
        """,
        (str(user["id"]), hashed_key, req.name)
    )
    row = await cur.fetchone()
    await conn.commit()
    
    return APIKeyResponse(
        id=row[0],
        name=row[1],
        api_key=raw_key,
        created_at=row[2]
    )

@router.get("", response_model=list[APIKeyResponse])
async def list_api_keys(
    user=Depends(get_current_user),
    db=Depends(get_db)
):
    _, cur = db
    await cur.execute(
        "SELECT id, name, created_at FROM api_keys WHERE user_id = %s ORDER BY created_at DESC",
        (str(user["id"]),)
    )
    rows = await cur.fetchall()
    return [
        APIKeyResponse(id=r[0], name=r[1], created_at=r[2]) for r in rows
    ]

@router.delete("/{key_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_api_key(
    key_id: uuid.UUID,
    user=Depends(get_current_user),
    db=Depends(get_db)
):
    conn, cur = db
    await cur.execute("DELETE FROM api_keys WHERE id = %s AND user_id = %s", (str(key_id), str(user["id"])))
    if cur.rowcount == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="API key not found")
    await conn.commit()
    return None
