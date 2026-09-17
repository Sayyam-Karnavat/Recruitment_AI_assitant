"""
Background processing: parse files, extract structured data, evaluate candidates.
Features:
- Guarded credit deductions & automatic refunds on system faults
- User fault vs. System fault categorization
- WebSocket real-time progress broadcasting
- Webhook notifications
"""

import asyncio
import json
import logging
from uuid import UUID

from database import get_pool
from file_parser import extract_text
from llm_pipeline import screen_candidate_unified, extract_profile, evaluate_candidate
from routes_ws import ws_manager

logger = logging.getLogger(__name__)


async def process_batch(
    batch_id: str,
    candidate_ids: list[str],
    job_id: str,
    user_id: str,
    job_description: str,
    custom_prompt: str = None
):
    """Process all candidates in a batch concurrently with parallel async workers and real-time events."""
    pool = await get_pool()
    total_files = len(candidate_ids)
    processed_count = 0
    progress_lock = asyncio.Lock()

    # Semaphore to bound in-app parallel async concurrency (up to 15 concurrent resumes)
    sem = asyncio.Semaphore(15)

    async def _process_candidate_task(candidate_id: str):
        nonlocal processed_count
        async with sem:
            async with pool.connection() as conn:
                async with conn.cursor() as cur:
                    try:
                        await process_single_candidate(
                            conn, cur,
                            candidate_id=candidate_id,
                            job_id=job_id,
                            user_id=user_id,
                            job_description=job_description,
                            custom_prompt=custom_prompt,
                            batch_progress=(0, total_files)
                        )
                    except Exception as e:
                        logger.error(f"Unexpected error processing candidate {candidate_id}: {e}", exc_info=True)
                        await handle_system_fault(conn, cur, candidate_id, user_id, f"Unexpected worker error: {str(e)}", job_id=job_id, batch_progress=(0, total_files))

                    async with progress_lock:
                        processed_count += 1
                        current_processed = processed_count
                        try:
                            await cur.execute(
                                "UPDATE upload_batches SET processed_files = %s WHERE id = %s",
                                (current_processed, batch_id)
                            )
                            await conn.commit()
                        except Exception as pe:
                            logger.warning(f"Failed to update batch progress: {pe}")

    try:
        tasks = [_process_candidate_task(cid) for cid in candidate_ids]
        await asyncio.gather(*tasks, return_exceptions=True)

        # Mark batch complete
        async with pool.connection() as conn:
            async with conn.cursor() as cur:
                await cur.execute(
                    "UPDATE upload_batches SET status = 'completed', processed_files = total_files WHERE id = %s",
                    (batch_id,)
                )
                await conn.commit()

        # Broadcast batch completed via WebSocket
        await ws_manager.broadcast_to_job(str(job_id), {
            "type": "batch_completed",
            "batch_id": str(batch_id),
            "total_files": total_files,
            "processed_files": total_files,
            "status": "completed"
        })

    except Exception as e:
        logger.error(f"Batch {batch_id} catastrophic failure: {e}", exc_info=True)
        async with pool.connection() as conn:
            async with conn.cursor() as cur:
                await cur.execute(
                    "UPDATE upload_batches SET status = 'failed' WHERE id = %s",
                    (batch_id,)
                )
                await conn.commit()

        await ws_manager.broadcast_to_job(str(job_id), {
            "type": "batch_failed",
            "batch_id": str(batch_id),
            "error": str(e)
        })


async def handle_user_fault(conn, cur, candidate_id: str, job_id: str, reason: str, batch_progress: tuple[int, int]):
    """
    Handle user fault (e.g. blank document, unreadable scan, corrupted/nonsensical file).
    Credits ARE consumed (no refund) because user submitted invalid data.
    """
    await cur.execute(
        """UPDATE candidates
           SET status = 'failed', error_type = 'user_fault', error_reason = %s
           WHERE id = %s""",
        (reason, candidate_id)
    )
    await conn.commit()

    processed_files, total_files = batch_progress
    await ws_manager.broadcast_to_job(str(job_id), {
        "type": "candidate_update",
        "candidate_id": str(candidate_id),
        "status": "failed",
        "error_type": "user_fault",
        "error_reason": reason,
        "processed_files": processed_files,
        "total_files": total_files,
    })


async def handle_system_fault(conn, cur, candidate_id: str, user_id: str, reason: str, job_id: str = None, batch_progress: tuple[int, int] = (0, 0)):
    """
    Handle system fault (LLM timeout, API quota error, server failure).
    Credits ARE NOT consumed -> 1 credit is automatically refunded with transaction audit!
    """
    await cur.execute(
        """UPDATE candidates
           SET status = 'failed', error_type = 'system_fault', error_reason = %s
           WHERE id = %s""",
        (reason, candidate_id)
    )

    # 1. Refund 1 credit to user's wallet
    await cur.execute(
        "UPDATE users SET credits = credits + 1 WHERE id = %s",
        (user_id,)
    )

    # 2. Insert audit transaction record
    await cur.execute(
        """INSERT INTO transactions
           (user_id, amount_credits, transaction_type, status, reference_id, description)
           VALUES (%s, 1, 'refund', 'success', %s, %s)""",
        (user_id, candidate_id, f"Refund: System processing fault ({reason[:100]})")
    )
    await conn.commit()
    logger.info(f"System fault for candidate {candidate_id}: refunded 1 credit to user {user_id}.")

    if job_id:
        processed_files, total_files = batch_progress
        await ws_manager.broadcast_to_job(str(job_id), {
            "type": "candidate_update",
            "candidate_id": str(candidate_id),
            "status": "failed",
            "error_type": "system_fault",
            "error_reason": reason,
            "refunded": True,
            "processed_files": processed_files,
            "total_files": total_files,
        })


def compute_proportional_recommendation(score: int, min_passing_score: int = 50) -> str:
    """
    Proportional Dynamic Scaling:
    - Below cutoff: Reject
    - Lower 30% of passing range [cutoff, 100]: Maybe (Lineup / Potential)
    - Middle 45% of passing range: Shortlist
    - Top 25% of passing range: Strong Shortlist
    """
    if score is None:
        return "Reject"
    cutoff = min_passing_score if min_passing_score is not None else 50
    if score < cutoff:
        return "Reject"
    passing_range = 100 - cutoff
    if passing_range <= 0:
        return "Strong Shortlist" if score >= 100 else "Reject"

    maybe_limit = cutoff + int(round(0.30 * passing_range))
    strong_limit = cutoff + int(round(0.75 * passing_range))

    if score < maybe_limit:
        return "Maybe"
    elif score < strong_limit:
        return "Shortlist"
    else:
        return "Strong Shortlist"


async def process_single_candidate(
    conn, cur,
    candidate_id: str,
    job_id: str,
    user_id: str,
    job_description: str,
    custom_prompt: str = None,
    batch_progress: tuple[int, int] = (1, 1)
):
    """Full pipeline for one candidate using single-pass unified extraction & evaluation."""

    # Fetch candidate record
    await cur.execute(
        "SELECT raw_text, file_path, filename FROM candidates WHERE id = %s",
        (candidate_id,)
    )
    row = await cur.fetchone()
    if not row:
        return

    raw_text, file_path, filename = row[0], row[1], row[2]

    # Step 1: Text extraction validation
    if not raw_text and file_path:
        # Fallback for existing legacy candidates on disk
        raw_text = extract_text(file_path, filename)
        if raw_text:
            await cur.execute("UPDATE candidates SET raw_text = %s WHERE id = %s", (raw_text, candidate_id))
            await conn.commit()

    if not raw_text or len(raw_text.strip()) < 40:
        # User fault: document has no readable text or is corrupted
        await handle_user_fault(
            conn, cur, candidate_id, job_id,
            reason="File was rejected because it is empty or does not contain readable resume text.",
            batch_progress=batch_progress
        )
        return

    # Step 2: Unified single-pass extraction + evaluation
    try:
        screening_result = await screen_candidate_unified(raw_text, job_description, custom_prompt)
    except Exception as e:
        # System fault during LLM screening
        await handle_system_fault(
            conn, cur, candidate_id, user_id,
            reason=f"LLM Screening Error: {str(e)}",
            job_id=job_id,
            batch_progress=batch_progress
        )
        return

    if not screening_result:
        await handle_system_fault(
            conn, cur, candidate_id, user_id,
            reason="Screening pipeline returned null result.",
            job_id=job_id,
            batch_progress=batch_progress
        )
        return

    # Step 3: Document integrity validation
    if (
        screening_result.is_valid_resume is False
        or not screening_result.name
        or (not screening_result.skills and not screening_result.work_experience and not screening_result.education)
    ):
        # User fault: document is a bill, invoice, receipt, or non-resume document
        reason = (
            screening_result.rejection_reason
            if screening_result.rejection_reason
            else "File was rejected because it was not a valid resume document (detected as a utility bill, invoice, receipt, or non-resume file)."
        )
        await handle_user_fault(
            conn, cur, candidate_id, job_id,
            reason=reason,
            batch_progress=batch_progress
        )
        return

    # Candidate is a valid resume
    # Update candidate basic details
    await cur.execute(
        "UPDATE candidates SET status = 'evaluated', candidate_name = %s, candidate_email = %s WHERE id = %s",
        (screening_result.name, screening_result.email, candidate_id)
    )

    # Insert or update candidate profile
    profile_dump = screening_result.model_dump()
    exp_years = int(round(screening_result.total_experience_years or 0))

    await cur.execute(
        """INSERT INTO candidate_profiles
           (candidate_id, prof_name, prof_email, phone, prof_location, role_title, total_experience_years,
            skills, work_experience, education, projects, certifications, achievements)
           VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
           ON CONFLICT (candidate_id) DO UPDATE SET
            prof_name = EXCLUDED.prof_name,
            prof_email = EXCLUDED.prof_email,
            phone = EXCLUDED.phone,
            prof_location = EXCLUDED.prof_location,
            role_title = EXCLUDED.role_title,
            total_experience_years = EXCLUDED.total_experience_years,
            skills = EXCLUDED.skills,
            work_experience = EXCLUDED.work_experience,
            education = EXCLUDED.education,
            projects = EXCLUDED.projects,
            certifications = EXCLUDED.certifications,
            achievements = EXCLUDED.achievements""",
        (
            candidate_id, screening_result.name, screening_result.email, screening_result.phone,
            screening_result.location, screening_result.current_role, exp_years,
            json.dumps(profile_dump.get("skills", [])), json.dumps(profile_dump.get("work_experience", [])),
            json.dumps(profile_dump.get("education", [])), json.dumps(profile_dump.get("projects", [])),
            json.dumps(profile_dump.get("certifications", [])), json.dumps(profile_dump.get("achievements", [])),
        )
    )

    # Fetch job min_passing_score threshold
    await cur.execute("SELECT min_passing_score FROM jobs WHERE id = %s", (job_id,))
    job_threshold_row = await cur.fetchone()
    min_passing_score = (job_threshold_row[0] if job_threshold_row and job_threshold_row[0] is not None else 50)

    final_score = screening_result.overall_score
    # Proportional dynamic scaling applied consistently
    final_recommendation = compute_proportional_recommendation(final_score, min_passing_score)
    final_summary = screening_result.summary or ""
    final_weaknesses = list(screening_result.weaknesses or [])

    # Enforce minimum passing threshold explanation if below cutoff
    if final_score < min_passing_score:
        rejection_reason = f"Candidate scored {final_score}/100, which is below the employer's minimum required passing threshold of {min_passing_score}/100."
        if not final_summary:
            final_summary = rejection_reason
        else:
            final_summary = f"{final_summary} (Auto-Rejected: {rejection_reason})"
        if rejection_reason not in final_weaknesses:
            final_weaknesses.append(rejection_reason)

    # Insert evaluation
    await cur.execute(
        """INSERT INTO evaluations
           (candidate_id, overall_score, recommendation, summary, strengths, weaknesses, missing_skills)
           VALUES (%s, %s, %s, %s, %s, %s, %s)
           ON CONFLICT (candidate_id) DO UPDATE SET
            overall_score = EXCLUDED.overall_score,
            recommendation = EXCLUDED.recommendation,
            summary = EXCLUDED.summary,
            strengths = EXCLUDED.strengths,
            weaknesses = EXCLUDED.weaknesses,
            missing_skills = EXCLUDED.missing_skills
           RETURNING id""",
        (
            candidate_id, final_score, final_recommendation,
            final_summary, json.dumps(screening_result.strengths or []),
            json.dumps(final_weaknesses), json.dumps(screening_result.missing_skills or []),
        )
    )
    eval_row = await cur.fetchone()
    evaluation_id = str(eval_row[0])

    # Insert category scores
    await cur.execute("DELETE FROM evaluation_categories WHERE evaluation_id = %s", (evaluation_id,))
    for cat in (screening_result.categories or []):
        await cur.execute(
            """INSERT INTO evaluation_categories (evaluation_id, category, score, rationale)
               VALUES (%s, %s, %s, %s)""",
            (evaluation_id, cat.category, cat.score, cat.rationale)
        )

    await conn.commit()

    # Step 4: Broadcast real-time success update over WebSocket
    processed_files, total_files = batch_progress
    await ws_manager.broadcast_to_job(str(job_id), {
        "type": "candidate_update",
        "candidate_id": str(candidate_id),
        "status": "evaluated",
        "name": screening_result.name,
        "overall_score": final_score,
        "recommendation": final_recommendation,
        "processed_files": processed_files,
        "total_files": total_files,
    })

    # Step 5: Webhook dispatch if configured
    await cur.execute("SELECT webhook_url FROM jobs WHERE id = %s", (job_id,))
    webhook_row = await cur.fetchone()
    if webhook_row and webhook_row[0]:
        import httpx
        webhook_url = webhook_row[0]
        payload = {
            "event": "candidate.evaluated",
            "candidate_id": str(candidate_id),
            "job_id": str(job_id),
            "name": screening_result.name,
            "overall_score": final_score,
            "recommendation": final_recommendation,
            "status": "evaluated"
        }
        try:
            async with httpx.AsyncClient() as client:
                await client.post(webhook_url, json=payload, timeout=5.0)
        except Exception as e:
            logger.error(f"Webhook delivery failed for {webhook_url}: {e}")

