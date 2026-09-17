"""
Background processing: parse files, extract structured data, evaluate candidates.
Features:
- Guarded credit deductions & automatic refunds on system faults
- User fault vs. System fault categorization
- WebSocket real-time progress broadcasting
- Webhook notifications
"""

import json
import logging
from uuid import UUID

from database import get_pool
from file_parser import extract_text
from llm_pipeline import extract_profile, evaluate_candidate
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
    """Process all candidates in a batch with error handling and real-time events."""
    pool = await get_pool()
    total_files = len(candidate_ids)
    processed_files = 0

    async with pool.connection() as conn:
        async with conn.cursor() as cur:
            try:
                for candidate_id in candidate_ids:
                    processed_files += 1
                    try:
                        await process_single_candidate(
                            conn, cur,
                            candidate_id=candidate_id,
                            job_id=job_id,
                            user_id=user_id,
                            job_description=job_description,
                            custom_prompt=custom_prompt,
                            batch_progress=(processed_files, total_files)
                        )
                    except Exception as e:
                        logger.error(f"Unexpected error processing candidate {candidate_id}: {e}", exc_info=True)
                        await handle_system_fault(conn, cur, candidate_id, user_id, f"Unexpected worker error: {str(e)}")

                    # Update batch progress in DB
                    await cur.execute(
                        "UPDATE upload_batches SET processed_files = %s WHERE id = %s",
                        (processed_files, batch_id)
                    )
                    await conn.commit()

                # Mark batch complete
                await cur.execute(
                    "UPDATE upload_batches SET status = 'completed' WHERE id = %s",
                    (batch_id,)
                )
                await conn.commit()

                # Broadcast batch completed via WebSocket
                await ws_manager.broadcast_to_job(str(job_id), {
                    "type": "batch_completed",
                    "batch_id": str(batch_id),
                    "total_files": total_files,
                    "processed_files": processed_files,
                    "status": "completed"
                })

            except Exception as e:
                logger.error(f"Batch {batch_id} catastrophic failure: {e}", exc_info=True)
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
    """Full pipeline for one candidate: text extraction → LLM extraction → LLM evaluation."""

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

    # Step 2: LLM structured extraction
    try:
        profile_data = await extract_profile(raw_text)
    except Exception as e:
        # System fault during LLM extraction
        await handle_system_fault(
            conn, cur, candidate_id, user_id,
            reason=f"LLM Parsing Error: {str(e)}",
            job_id=job_id,
            batch_progress=batch_progress
        )
        return

    if not profile_data or profile_data.is_valid_resume is False or not profile_data.name or (not profile_data.skills and not profile_data.work_experience and not profile_data.education):
        # User fault: document is a bill, invoice, or non-resume document
        reason = (
            profile_data.rejection_reason
            if (profile_data and profile_data.rejection_reason)
            else "File was rejected because it was not a valid resume document (e.g. utility bill, invoice, receipt, or non-resume document)."
        )
        await handle_user_fault(
            conn, cur, candidate_id, job_id,
            reason=reason,
            batch_progress=batch_progress
        )
        return

    await cur.execute("UPDATE candidates SET status = 'parsed' WHERE id = %s", (candidate_id,))

    # Insert or update profile
    profile_dump = profile_data.model_dump()
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
            candidate_id, profile_data.name, profile_data.email, profile_data.phone,
            profile_data.location, profile_data.current_role, profile_data.total_experience_years,
            json.dumps(profile_dump.get("skills", [])), json.dumps(profile_dump.get("work_experience", [])),
            json.dumps(profile_dump.get("education", [])), json.dumps(profile_dump.get("projects", [])),
            json.dumps(profile_dump.get("certifications", [])), json.dumps(profile_dump.get("achievements", [])),
        )
    )
    await conn.commit()

    # Step 3: LLM evaluation against JD
    try:
        eval_result = await evaluate_candidate(profile_data, job_description, custom_prompt)
    except Exception as e:
        # System fault during LLM evaluation
        await handle_system_fault(
            conn, cur, candidate_id, user_id,
            reason=f"LLM Evaluation Error: {str(e)}",
            job_id=job_id,
            batch_progress=batch_progress
        )
        return

    if not eval_result:
        await handle_system_fault(
            conn, cur, candidate_id, user_id,
            reason="Evaluation pipeline returned null result.",
            job_id=job_id,
            batch_progress=batch_progress
        )
        return

    # Fetch job min_passing_score threshold
    await cur.execute("SELECT min_passing_score FROM jobs WHERE id = %s", (job_id,))
    job_threshold_row = await cur.fetchone()
    min_passing_score = (job_threshold_row[0] if job_threshold_row and job_threshold_row[0] is not None else 50)

    final_score = eval_result.overall_score
    # Proportional dynamic scaling applied consistently
    final_recommendation = compute_proportional_recommendation(final_score, min_passing_score)
    final_summary = eval_result.summary or ""
    final_weaknesses = list(eval_result.weaknesses or [])

    # Enforce minimum passing threshold explanation if below cutoff
    if final_score < min_passing_score:
        rejection_reason = f"Candidate scored {final_score}/100, which is below the employer's minimum required passing threshold of {min_passing_score}/100."
        if not final_summary:
            final_summary = rejection_reason
        else:
            final_summary = f"{final_summary} (Auto-Rejected: {rejection_reason})"
        if rejection_reason not in final_weaknesses:
            final_weaknesses.append(rejection_reason)

    await cur.execute("UPDATE candidates SET status = 'evaluated' WHERE id = %s", (candidate_id,))

    # Insert evaluation
    await cur.execute(
        """INSERT INTO evaluations
           (candidate_id, overall_score, recommendation, summary, strengths, weaknesses, missing_skills)
           VALUES (%s, %s, %s, %s, %s, %s, %s)
           RETURNING id""",
        (
            candidate_id, final_score, final_recommendation,
            final_summary, json.dumps(eval_result.strengths),
            json.dumps(final_weaknesses), json.dumps(eval_result.missing_skills),
        )
    )
    eval_row = await cur.fetchone()
    evaluation_id = str(eval_row[0])

    # Insert category scores
    for cat in (eval_result.categories or []):
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
        "name": profile_data.name,
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
            "name": profile_data.name,
            "overall_score": eval_result.overall_score,
            "recommendation": eval_result.recommendation,
            "status": "evaluated"
        }
        try:
            async with httpx.AsyncClient() as client:
                await client.post(webhook_url, json=payload, timeout=5.0)
        except Exception as e:
            logger.error(f"Webhook delivery failed for {webhook_url}: {e}")
