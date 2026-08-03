"""
Database connection pool using psycopg (async) + table initialization.
"""

import psycopg
import psycopg_pool
from config import settings

pool: psycopg_pool.AsyncConnectionPool | None = None

SCHEMA = """
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    target_shortlist_count INT DEFAULT 10,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS candidates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    file_hash VARCHAR(64) NOT NULL,
    filename VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    raw_text TEXT,
    status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS candidate_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    candidate_id UUID UNIQUE NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
    "name" VARCHAR(200),
    "email" VARCHAR(255),
    phone VARCHAR(50),
    "location" VARCHAR(200),
    "current_role" VARCHAR(200),
    total_experience_years INT DEFAULT 0,
    skills JSONB,
    work_experience JSONB,
    education JSONB,
    projects JSONB,
    certifications JSONB,
    achievements JSONB
);

CREATE TABLE IF NOT EXISTS evaluations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    candidate_id UUID UNIQUE NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
    overall_score INT NOT NULL CHECK (overall_score >= 0 AND overall_score <= 100),
    recommendation VARCHAR(50) NOT NULL,
    summary TEXT,
    strengths JSONB,
    weaknesses JSONB,
    missing_skills JSONB
);

CREATE TABLE IF NOT EXISTS evaluation_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    evaluation_id UUID NOT NULL REFERENCES evaluations(id) ON DELETE CASCADE,
    category VARCHAR(50) NOT NULL,
    score INT NOT NULL CHECK (score >= 0 AND score <= 10),
    rationale TEXT
);

CREATE TABLE IF NOT EXISTS upload_batches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    total_files INT NOT NULL,
    processed_files INT DEFAULT 0,
    status VARCHAR(20) DEFAULT 'processing',
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_jobs_user_id ON jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_candidates_job_id ON candidates(job_id);
CREATE INDEX IF NOT EXISTS idx_candidates_file_hash ON candidates(file_hash);
CREATE INDEX IF NOT EXISTS idx_candidate_profiles_candidate_id ON candidate_profiles(candidate_id);
CREATE INDEX IF NOT EXISTS idx_evaluations_candidate_id ON evaluations(candidate_id);
CREATE INDEX IF NOT EXISTS idx_evaluation_categories_evaluation_id ON evaluation_categories(evaluation_id);
CREATE INDEX IF NOT EXISTS idx_upload_batches_job_id ON upload_batches(job_id);
"""


async def init_db():
    """Create all tables if they don't exist. Uses a direct connection (not pool)."""
    async with await psycopg.AsyncConnection.connect(settings.DATABASE_URL) as conn:
        async with conn.cursor() as cur:
            await cur.execute(SCHEMA)
        await conn.commit()


async def get_pool() -> psycopg_pool.AsyncConnectionPool:
    global pool
    if pool is None:
        pool = psycopg_pool.AsyncConnectionPool(
            conninfo=settings.DATABASE_URL, min_size=2, max_size=10
        )
        await pool.wait()
    return pool


async def get_db():
    """FastAPI dependency that yields an async connection + cursor from the pool."""
    p = await get_pool()
    async with p.connection() as conn:
        async with conn.cursor() as cur:
            yield conn, cur


async def close_pool():
    global pool
    if pool:
        await pool.close()
        pool = None
