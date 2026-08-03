from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import settings
from routes_auth import router as auth_router
from routes_jobs import router as jobs_router
from routes_upload import router as upload_router
from routes_candidates import router as candidates_router
from routes_export import router as export_router

app = FastAPI(title="Resume Shortlisting Platform", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # Vite dev server
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
