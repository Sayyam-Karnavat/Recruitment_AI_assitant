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
    credits INT DEFAULT 10,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount_credits INT NOT NULL,
    amount_inr INT DEFAULT 0,
    transaction_type VARCHAR(50) NOT NULL,
    status VARCHAR(20) DEFAULT 'success',
    reference_id VARCHAR(255),
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS api_keys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    api_key_hash VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS candidate_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(200),
    picture VARCHAR(500),
    google_id VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    target_shortlist_count INT DEFAULT 10,
    status VARCHAR(20) DEFAULT 'active',
    custom_prompt TEXT,
    webhook_url VARCHAR(500),
    active_days_limit INT,
    max_applications INT,
    min_passing_score INT DEFAULT 50,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS candidates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    file_hash VARCHAR(64) NOT NULL,
    filename VARCHAR(255) NOT NULL,
    file_path VARCHAR(500),
    raw_text TEXT,
    status VARCHAR(30) DEFAULT 'pending',
    candidate_email VARCHAR(255),
    candidate_name VARCHAR(200),
    error_type VARCHAR(50),
    error_reason TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS candidate_feedback (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    candidate_id UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
    expected_score INT,
    expected_recommendation VARCHAR(50),
    comment TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS candidate_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    candidate_id UUID UNIQUE NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
    prof_name VARCHAR(200),
    prof_email VARCHAR(255),
    phone VARCHAR(50),
    prof_location VARCHAR(200),
    role_title VARCHAR(200),
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
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_candidates_job_id ON candidates(job_id);
CREATE INDEX IF NOT EXISTS idx_candidates_file_hash ON candidates(file_hash);
CREATE INDEX IF NOT EXISTS idx_candidate_profiles_candidate_id ON candidate_profiles(candidate_id);
CREATE INDEX IF NOT EXISTS idx_evaluations_candidate_id ON evaluations(candidate_id);
CREATE INDEX IF NOT EXISTS idx_evaluation_categories_evaluation_id ON evaluation_categories(evaluation_id);
CREATE INDEX IF NOT EXISTS idx_upload_batches_job_id ON upload_batches(job_id);
"""



async def init_db():
    """Create all tables if they don't exist and run dynamic column migrations."""
    conn = await psycopg.AsyncConnection.connect(settings.DATABASE_URL)
    try:
        async with conn.cursor() as cur:
            await cur.execute(SCHEMA)
            
            # Migrations for existing tables
            await cur.execute("ALTER TABLE jobs ADD COLUMN IF NOT EXISTS custom_prompt TEXT;")
            await cur.execute("ALTER TABLE jobs ADD COLUMN IF NOT EXISTS webhook_url VARCHAR(500);")
            await cur.execute("ALTER TABLE jobs ADD COLUMN IF NOT EXISTS active_days_limit INT;")
            await cur.execute("ALTER TABLE jobs ADD COLUMN IF NOT EXISTS max_applications INT;")
            await cur.execute("ALTER TABLE jobs ADD COLUMN IF NOT EXISTS min_passing_score INT DEFAULT 50;")
            await cur.execute("ALTER TABLE candidates ADD COLUMN IF NOT EXISTS candidate_email VARCHAR(255);")
            await cur.execute("ALTER TABLE candidates ADD COLUMN IF NOT EXISTS candidate_name VARCHAR(200);")
            await cur.execute("ALTER TABLE candidates ADD COLUMN IF NOT EXISTS error_type VARCHAR(50);")
            await cur.execute("ALTER TABLE candidates ADD COLUMN IF NOT EXISTS error_reason TEXT;")
            await cur.execute("ALTER TABLE users ALTER COLUMN credits SET DEFAULT 10;")
            
            # Seed admin user if not exists
            await cur.execute("SELECT id FROM users WHERE email = 'admin@resumeai.com'")
            if not await cur.fetchone():
                await cur.execute(
                    "INSERT INTO users (email) VALUES (%s)",
                    ("admin@resumeai.com",)
                )

            # Sync all existing candidate evaluations to proportional dynamic scaling
            await cur.execute(
                """SELECT e.id, e.overall_score, COALESCE(j.min_passing_score, 50) as cutoff
                   FROM evaluations e
                   JOIN candidates c ON e.candidate_id = c.id
                   JOIN jobs j ON c.job_id = j.id
                   WHERE e.overall_score IS NOT NULL"""
            )
            eval_rows = await cur.fetchall()
            for e_id, score, cutoff in eval_rows:
                if score is not None:
                    cutoff_val = cutoff if cutoff is not None else 50
                    if score < cutoff_val:
                        rec = "Reject"
                    else:
                        passing_range = 100 - cutoff_val
                        if passing_range <= 0:
                            rec = "Strong Shortlist" if score >= 100 else "Reject"
                        else:
                            maybe_limit = cutoff_val + int(round(0.30 * passing_range))
                            strong_limit = cutoff_val + int(round(0.75 * passing_range))
                            if score < maybe_limit:
                                rec = "Maybe"
                            elif score < strong_limit:
                                rec = "Shortlist"
                            else:
                                rec = "Strong Shortlist"
                    await cur.execute("UPDATE evaluations SET recommendation = %s WHERE id = %s", (rec, str(e_id)))

        await conn.commit()
    finally:
        await conn.close()


async def open_pool():
    """Open the connection pool. Call during app startup."""
    global pool
    pool = psycopg_pool.AsyncConnectionPool(
        conninfo=settings.DATABASE_URL, min_size=4, max_size=30, open=False
    )
    await pool.open()


async def get_pool() -> psycopg_pool.AsyncConnectionPool:
    global pool
    if pool is None:
        await open_pool()
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
