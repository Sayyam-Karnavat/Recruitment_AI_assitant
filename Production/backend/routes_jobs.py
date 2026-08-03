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
        """INSERT INTO jobs (user_id, title, description, target_shortlist_count)
           VALUES (%s, %s, %s, %s)
           RETURNING id, title, description, target_shortlist_count, status, created_at""",
        (str(user["id"]), body.title, body.description, body.target_shortlist_count)
    )
    row = await cur.fetchone()
    await conn.commit()

    return JobResponse(
        id=row[0], title=row[1], description=row[2],
        target_shortlist_count=row[3], status=row[4], created_at=row[5], candidate_count=0
    )


@router.get("", response_model=list[JobResponse])
async def list_jobs(user=Depends(get_current_user), db=Depends(get_db)):
    conn, cur = db
    await cur.execute(
        """SELECT j.id, j.title, j.description, j.target_shortlist_count, j.status, j.created_at,
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
        JobResponse(id=r[0], title=r[1], description=r[2], target_shortlist_count=r[3], status=r[4], created_at=r[5], candidate_count=r[6])
        for r in rows
    ]


@router.get("/{job_id}", response_model=JobResponse)
async def get_job(job_id: UUID, user=Depends(get_current_user), db=Depends(get_db)):
    conn, cur = db
    await cur.execute(
        """SELECT j.id, j.title, j.description, j.target_shortlist_count, j.status, j.created_at,
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

    return JobResponse(id=row[0], title=row[1], description=row[2], target_shortlist_count=row[3], status=row[4], created_at=row[5], candidate_count=row[6])


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
        f"UPDATE jobs SET {', '.join(updates)} WHERE id = %s RETURNING id, title, description, target_shortlist_count, status, created_at",
        values
    )
    row = await cur.fetchone()
    await conn.commit()

    return JobResponse(id=row[0], title=row[1], description=row[2], target_shortlist_count=row[3], status=row[4], created_at=row[5], candidate_count=0)
