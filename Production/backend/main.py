from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from config import settings
from database import open_pool, close_pool, init_db
from routes_auth import router as auth_router
from routes_jobs import router as jobs_router
from routes_upload import router as upload_router
from routes_candidates import router as candidates_router
from routes_export import router as export_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: create tables + open pool
    await init_db()
    await open_pool()
    yield
    # Shutdown: close connection pool
    await close_pool()


app = FastAPI(title="Resume Shortlisting Platform", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router, prefix="/api/auth", tags=["Auth"])
app.include_router(jobs_router, prefix="/api/jobs", tags=["Jobs"])
app.include_router(upload_router, prefix="/api/jobs", tags=["Upload"])
app.include_router(candidates_router, prefix="/api", tags=["Candidates"])
app.include_router(export_router, prefix="/api/jobs", tags=["Export"])


@app.get("/api/health")
async def health_check():
    return {"status": "ok"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host=settings.HOST, port=settings.PORT, reload=True)
