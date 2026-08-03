from fastapi import APIRouter, Depends, HTTPException, status

from database import get_db
from schemas import UserRegister, UserLogin, TokenResponse, UserResponse
from auth import hash_password, verify_password, create_access_token, get_current_user

router = APIRouter()


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(body: UserRegister, db=Depends(get_db)):
    conn, cur = db

    # Check if email exists
    await cur.execute("SELECT id FROM users WHERE email = %s", (body.email,))
    if await cur.fetchone():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")

    # Insert user
    await cur.execute(
        "INSERT INTO users (email, password_hash) VALUES (%s, %s) RETURNING id",
        (body.email, hash_password(body.password))
    )
    row = await cur.fetchone()
    await conn.commit()

    token = create_access_token(row[0])
    return TokenResponse(access_token=token)


@router.post("/login", response_model=TokenResponse)
async def login(body: UserLogin, db=Depends(get_db)):
    conn, cur = db

    await cur.execute("SELECT id, password_hash FROM users WHERE email = %s", (body.email,))
    row = await cur.fetchone()

    if not row:
        # Auto-register if user doesn't exist
        await cur.execute(
            "INSERT INTO users (email, password_hash) VALUES (%s, %s) RETURNING id",
            (body.email, hash_password(body.password))
        )
        new_row = await cur.fetchone()
        await conn.commit()
        token = create_access_token(new_row[0])
        return TokenResponse(access_token=token)

    if not verify_password(body.password, row[1]):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid password")

    token = create_access_token(row[0])
    return TokenResponse(access_token=token)


@router.get("/me", response_model=UserResponse)
async def get_me(user=Depends(get_current_user)):
    return UserResponse(id=user["id"], email=user["email"], created_at=user["created_at"])
