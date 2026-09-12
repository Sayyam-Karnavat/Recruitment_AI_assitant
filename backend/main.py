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

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
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
app.include_router(ws_router, tags=["WebSockets"])


@app.get("/api/health")
async def health_check():
    return {"status": "ok"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host=settings.HOST, port=settings.PORT, reload=True)
