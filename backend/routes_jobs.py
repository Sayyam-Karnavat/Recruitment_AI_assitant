from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status

from database import get_db
from schemas import JobCreate, JobUpdate, JobResponse
from auth import get_current_user

router = APIRouter()


@router.post("", response_model=JobResponse, status_code=status.HTTP_201_CREATED)
async def create_job(body: JobCreate, user=Depends(get_current_user), db=Depends(get_db)):
    conn, cur = db
    await cur.execute(
        """INSERT INTO jobs (user_id, title, description, target_shortlist_count, custom_prompt, active_days_limit, max_applications, min_passing_score)
           VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
           RETURNING id, title, description, target_shortlist_count, status, created_at, custom_prompt, active_days_limit, max_applications, min_passing_score""",
        (str(user["id"]), body.title, body.description, body.target_shortlist_count, body.custom_prompt, body.active_days_limit, body.max_applications, body.min_passing_score or 50)
    )
    row = await cur.fetchone()
    await conn.commit()

    return JobResponse(
        id=row[0], title=row[1], description=row[2],
        target_shortlist_count=row[3], status=row[4], created_at=row[5],
        custom_prompt=row[6], active_days_limit=row[7], max_applications=row[8],
        min_passing_score=row[9] or 50,
        candidate_count=0
    )


@router.get("", response_model=list[JobResponse])
async def list_jobs(user=Depends(get_current_user), db=Depends(get_db)):
    conn, cur = db
    await cur.execute(
        """SELECT j.id, j.title, j.description, j.target_shortlist_count, j.status, j.created_at,
                  j.custom_prompt, j.active_days_limit, j.max_applications, j.min_passing_score,
                  COUNT(c.id) as candidate_count
           FROM jobs j
           LEFT JOIN candidates c ON c.job_id = j.id
           WHERE j.user_id = %s
           GROUP BY j.id
           ORDER BY j.created_at DESC""",
        (str(user["id"]),)
    )
    rows = await cur.fetchall()

    return [
        JobResponse(id=r[0], title=r[1], description=r[2], target_shortlist_count=r[3], status=r[4], created_at=r[5],
                    custom_prompt=r[6], active_days_limit=r[7], max_applications=r[8], min_passing_score=r[9] or 50, candidate_count=r[10])
        for r in rows
    ]


@router.get("/{job_id}", response_model=JobResponse)
async def get_job(job_id: UUID, user=Depends(get_current_user), db=Depends(get_db)):
    conn, cur = db
    await cur.execute(
        """SELECT j.id, j.title, j.description, j.target_shortlist_count, j.status, j.created_at,
                  j.custom_prompt, j.active_days_limit, j.max_applications, j.min_passing_score,
                  COUNT(c.id) as candidate_count
           FROM jobs j
           LEFT JOIN candidates c ON c.job_id = j.id
           WHERE j.id = %s AND j.user_id = %s
           GROUP BY j.id""",
        (str(job_id), str(user["id"]))
    )
    row = await cur.fetchone()

    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found")

    return JobResponse(id=row[0], title=row[1], description=row[2], target_shortlist_count=row[3], status=row[4], created_at=row[5], custom_prompt=row[6], active_days_limit=row[7], max_applications=row[8], min_passing_score=row[9] or 50, candidate_count=row[10])


@router.patch("/{job_id}", response_model=JobResponse)
async def update_job(job_id: UUID, body: JobUpdate, user=Depends(get_current_user), db=Depends(get_db)):
    conn, cur = db

    # Check ownership
    await cur.execute("SELECT id FROM jobs WHERE id = %s AND user_id = %s", (str(job_id), str(user["id"])))
    if not await cur.fetchone():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found")

    # Build dynamic update
    updates = []
    values = []
    data = body.model_dump(exclude_unset=True)
    for key, value in data.items():
        updates.append(f"{key} = %s")
        values.append(value)

    if not updates:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No fields to update")

    values.append(str(job_id))
    await cur.execute(
        f"UPDATE jobs SET {', '.join(updates)} WHERE id = %s RETURNING id, title, description, target_shortlist_count, status, created_at, custom_prompt, active_days_limit, max_applications, min_passing_score",
        values
    )
    row = await cur.fetchone()
    new_min_score = row[9] or 50

    # If min_passing_score changed or was provided, recompute candidate recommendations dynamically
    if body.min_passing_score is not None:
        from background_tasks import compute_proportional_recommendation
        await cur.execute(
            """SELECT e.id, e.overall_score 
               FROM evaluations e 
               JOIN candidates c ON e.candidate_id = c.id 
               WHERE c.job_id = %s""",
            (str(job_id),)
        )
        eval_rows = await cur.fetchall()
        for e_id, score in eval_rows:
            if score is not None:
                new_rec = compute_proportional_recommendation(score, new_min_score)
                await cur.execute(
                    "UPDATE evaluations SET recommendation = %s WHERE id = %s",
                    (new_rec, str(e_id))
                )

    # We also need candidate_count for the response
    await cur.execute("SELECT COUNT(id) FROM candidates WHERE job_id = %s", (str(job_id),))
    c_count = (await cur.fetchone())[0]

    await conn.commit()
    return JobResponse(id=row[0], title=row[1], description=row[2], target_shortlist_count=row[3], status=row[4], created_at=row[5], custom_prompt=row[6], active_days_limit=row[7], max_applications=row[8], min_passing_score=new_min_score, candidate_count=c_count)


@router.delete("/{job_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_job(job_id: UUID, user=Depends(get_current_user), db=Depends(get_db)):
    conn, cur = db
    await cur.execute("DELETE FROM jobs WHERE id = %s AND user_id = %s RETURNING id", (str(job_id), str(user["id"])))
    if not await cur.fetchone():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found")
    await conn.commit()
    return None
