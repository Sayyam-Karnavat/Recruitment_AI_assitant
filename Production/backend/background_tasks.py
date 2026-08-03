"""
Background processing: parse files, extract structured data, evaluate candidates.
Uses psycopg async directly (opens its own connection from pool).
"""

import json
import logging

from database import get_pool
from file_parser import extract_text
from llm_pipeline import extract_profile, evaluate_candidate

logger = logging.getLogger(__name__)


async def process_batch(batch_id: str, candidate_ids: list[str], job_description: str):
    """Process all candidates in a batch: extract text → LLM parse → LLM evaluate."""
    pool = await get_pool()

    async with pool.connection() as conn:
        async with conn.cursor() as cur:
            try:
                for candidate_id in candidate_ids:
                    try:
                        await process_single_candidate(conn, cur, candidate_id, job_description)
                    except Exception as e:
                        logger.error(f"Failed to process candidate {candidate_id}: {e}")
                        await cur.execute(
                            "UPDATE candidates SET status = 'failed' WHERE id = %s",
                            (candidate_id,)
                        )
                        await conn.commit()

                    # Update batch progress
                    await cur.execute(
                        "UPDATE upload_batches SET processed_files = processed_files + 1 WHERE id = %s",
                        (batch_id,)
                    )
                    await conn.commit()

                # Mark batch complete
                await cur.execute(
                    "UPDATE upload_batches SET status = 'completed' WHERE id = %s",
                    (batch_id,)
                )
                await conn.commit()

            except Exception as e:
                logger.error(f"Batch {batch_id} failed: {e}")
                await cur.execute(
                    "UPDATE upload_batches SET status = 'failed' WHERE id = %s",
                    (batch_id,)
                )
                await conn.commit()


async def process_single_candidate(conn, cur, candidate_id: str, job_description: str):
    """Full pipeline for one candidate: text extraction → LLM extraction → LLM evaluation."""

    # Get candidate file path
    await cur.execute("SELECT file_path FROM candidates WHERE id = %s", (candidate_id,))
    row = await cur.fetchone()
    if not row:
        return

    file_path = row[0]

    # Step 1: Extract raw text from file
    raw_text = extract_text(file_path)
    if not raw_text or len(raw_text) < 50:
        await cur.execute("UPDATE candidates SET status = 'failed' WHERE id = %s", (candidate_id,))
        await conn.commit()
        return

    await cur.execute("UPDATE candidates SET raw_text = %s WHERE id = %s", (raw_text, candidate_id))
    await conn.commit()

    # Step 2: LLM structured extraction
    profile_data = await extract_profile(raw_text)
    if not profile_data:
        await cur.execute("UPDATE candidates SET status = 'failed' WHERE id = %s", (candidate_id,))
        await conn.commit()
        return

    await cur.execute("UPDATE candidates SET status = 'parsed' WHERE id = %s", (candidate_id,))

    # Insert profile
    await cur.execute(
        """INSERT INTO candidate_profiles
           (candidate_id, prof_name, prof_email, phone, prof_location, role_title, total_experience_years,
            skills, work_experience, education, projects, certifications, achievements)
           VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)""",
        (
            candidate_id, profile_data.name, profile_data.email, profile_data.phone,
            profile_data.location, profile_data.current_role, profile_data.total_experience_years,
            json.dumps(profile_data.skills), json.dumps(profile_data.work_experience),
            json.dumps(profile_data.education), json.dumps(profile_data.projects),
            json.dumps(profile_data.certifications), json.dumps(profile_data.achievements),
        )
    )
    await conn.commit()

    # Step 3: LLM evaluation against JD
    eval_result = await evaluate_candidate(profile_data, job_description)
    if not eval_result:
        await conn.commit()
        return

    await cur.execute("UPDATE candidates SET status = 'evaluated' WHERE id = %s", (candidate_id,))

    # Insert evaluation
    await cur.execute(
        """INSERT INTO evaluations
           (candidate_id, overall_score, recommendation, summary, strengths, weaknesses, missing_skills)
           VALUES (%s, %s, %s, %s, %s, %s, %s) RETURNING id""",
        (
            candidate_id, eval_result.overall_score, eval_result.recommendation,
            eval_result.summary, json.dumps(eval_result.strengths),
            json.dumps(eval_result.weaknesses), json.dumps(eval_result.missing_skills),
        )
    )
    eval_row = await cur.fetchone()
    evaluation_id = str(eval_row[0])

    # Insert category scores
    for cat in eval_result.categories:
        await cur.execute(
            """INSERT INTO evaluation_categories (evaluation_id, category, score, rationale)
               VALUES (%s, %s, %s, %s)""",
            (evaluation_id, cat.category, cat.score, cat.rationale)
        )

    await conn.commit()
