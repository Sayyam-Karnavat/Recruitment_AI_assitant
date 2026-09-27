import logging

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from config import settings
from database import open_pool, close_pool, init_db
from queue_manager import start_queue_workers, stop_queue_workers
from routes_auth import router as auth_router
from routes_jobs import router as jobs_router
from routes_upload import router as upload_router
from routes_candidates import router as candidates_router
from routes_export import router as export_router
from routes_api_keys import router as api_keys_router
from routes_v1 import router as v1_router
from routes_wallet import router as wallet_router
from routes_ws import router as ws_router
from routes_public import router as public_router
from routes_admin import router as admin_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: create tables + open pool + start queue workers
    await init_db()
    await open_pool()
    await start_queue_workers(num_workers=3)
    yield
    # Shutdown: stop workers + close connection pool
    await stop_queue_workers()
    await close_pool()


app = FastAPI(title="Resume Shortlisting Platform", version="1.0.0", lifespan=lifespan)

trusted_origins = [
    "http://localhost:5173",
    "http://localhost:3000",
    "http://localhost:8000",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:8000",
    "https://recruitment-ai-assitant-bvqcv4f6s-sanyam-karnavats-projects.vercel.app",
    "https://recruitment-ai-assitant-2n4r.onrender.com",
]
if settings.FRONTEND_URL and settings.FRONTEND_URL not in trusted_origins:
    trusted_origins.append(settings.FRONTEND_URL)

app.add_middleware(
    CORSMiddleware,
    allow_origins=trusted_origins,
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1|.*\.vercel\.app|.*\.onrender\.com)(:\d+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router, prefix="/api/auth", tags=["Auth"])
app.include_router(jobs_router, prefix="/api/jobs", tags=["Jobs"])
app.include_router(upload_router, prefix="/api/jobs", tags=["Upload"])
app.include_router(candidates_router, prefix="/api", tags=["Candidates"])
app.include_router(export_router, prefix="/api/jobs", tags=["Export"])
app.include_router(api_keys_router, prefix="/api/keys", tags=["API Keys"])
app.include_router(v1_router, prefix="/v1", tags=["Developer APIs (v1)"])
app.include_router(wallet_router, prefix="/api/wallet", tags=["Wallet & Monetization"])
app.include_router(public_router, prefix="/api/public", tags=["Public Portal"])
app.include_router(admin_router, prefix="/api/admin", tags=["Admin Portal"])
app.include_router(ws_router, tags=["WebSockets"])


@app.get("/health")
@app.get("/api/health")
async def health_check():
    from queue_manager import get_redis
    redis_client = await get_redis()
    redis_ping = False
    if redis_client:
        try:
            redis_ping = bool(await redis_client.ping())
        except Exception:
            redis_ping = False

    return {
        "status": "ok",
        "environment": settings.APP_ENV,
        "queue_mode": "Upstash Redis" if (redis_client and redis_ping) else "In-Memory Async Queue",
        "redis_connected": redis_ping,
        "database": "connected"
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host=settings.HOST, port=settings.PORT, reload=True)
