import json
from uuid import UUID
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status

from database import get_db
from schemas import CandidateListItem, CandidateDetailResponse, CandidateProfileResponse, EvaluationResponse, EvaluationCategoryResponse, CandidateFeedbackCreate, CandidateFeedbackResponse
from auth import get_current_user

router = APIRouter()


@router.get("/jobs/{job_id}/candidates", response_model=list[CandidateListItem])
async def list_candidates(
    job_id: UUID,
    sort_by: Optional[str] = Query("score", pattern="^(score|name|date)$"),
    recommendation: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    user=Depends(get_current_user),
    db=Depends(get_db),
):
    conn, cur = db

    # Verify job belongs to user
    await cur.execute("SELECT id FROM jobs WHERE id = %s AND user_id = %s", (str(job_id), str(user["id"])))
    if not await cur.fetchone():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found")

    await cur.execute(
        """SELECT c.id, c.filename, c.status, c.created_at,
                  cp.prof_name, e.overall_score, e.recommendation
           FROM candidates c
           LEFT JOIN candidate_profiles cp ON cp.candidate_id = c.id
           LEFT JOIN evaluations e ON e.candidate_id = c.id
           WHERE c.job_id = %s""",
        (str(job_id),)
    )
    rows = await cur.fetchall()

    items = [
        CandidateListItem(
            id=r[0], filename=r[1], status=r[2], created_at=r[3],
            name=r[4], overall_score=r[5], recommendation=r[6]
        )
        for r in rows
    ]

    # Filter by search keyword (name or filename)
    if search:
        s = search.strip().lower()
        items = [i for i in items if (i.name and s in i.name.lower()) or (i.filename and s in i.filename.lower())]

    # Filter by recommendation
    if recommendation:
        items = [i for i in items if i.recommendation and i.recommendation.lower() == recommendation.lower()]

    # Sort
    if sort_by == "score":
        items.sort(key=lambda x: x.overall_score or 0, reverse=True)
    elif sort_by == "name":
        items.sort(key=lambda x: (x.name or "").lower())
    elif sort_by == "date":
        items.sort(key=lambda x: x.created_at, reverse=True)

    return items


@router.get("/candidates/{candidate_id}", response_model=CandidateDetailResponse)
async def get_candidate_detail(
    candidate_id: UUID,
    user=Depends(get_current_user),
    db=Depends(get_db),
):
    conn, cur = db

    # Get candidate
    await cur.execute(
        "SELECT id, job_id, filename, status, raw_text, created_at FROM candidates WHERE id = %s",
        (str(candidate_id),)
    )
    c = await cur.fetchone()
    if not c:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Candidate not found")

    # Verify ownership through job
    await cur.execute("SELECT id FROM jobs WHERE id = %s AND user_id = %s", (str(c[1]), str(user["id"])))
    if not await cur.fetchone():
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    # Get profile
    profile_response = None
    await cur.execute(
        """SELECT prof_name, prof_email, phone, prof_location, role_title, total_experience_years,
                  skills, work_experience, education, projects, certifications, achievements
           FROM candidate_profiles WHERE candidate_id = %s""",
        (str(candidate_id),)
    )
    p = await cur.fetchone()
    if p:
        profile_response = CandidateProfileResponse(
            name=p[0], email=p[1], phone=p[2], location=p[3],
            current_role=p[4], total_experience_years=p[5],
            skills=p[6], work_experience=p[7], education=p[8],
            projects=p[9], certifications=p[10], achievements=p[11],
        )

    # Get evaluation
    evaluation_response = None
    await cur.execute(
        """SELECT id, overall_score, recommendation, summary, strengths, weaknesses, missing_skills
           FROM evaluations WHERE candidate_id = %s""",
        (str(candidate_id),)
    )
    e = await cur.fetchone()
    if e:
        # Get categories
        await cur.execute(
            "SELECT category, score, rationale FROM evaluation_categories WHERE evaluation_id = %s",
            (str(e[0]),)
        )
        cat_rows = await cur.fetchall()
        categories = [EvaluationCategoryResponse(category=cr[0], score=cr[1], rationale=cr[2]) for cr in cat_rows]

        evaluation_response = EvaluationResponse(
            overall_score=e[1], recommendation=e[2], summary=e[3],
            strengths=e[4], weaknesses=e[5], missing_skills=e[6],
            categories=categories,
        )

    return CandidateDetailResponse(
        id=c[0], filename=c[2], status=c[3], raw_text=c[4], created_at=c[5],
        profile=profile_response, evaluation=evaluation_response,
    )

@router.post("/candidates/{candidate_id}/feedback", response_model=CandidateFeedbackResponse)
async def submit_candidate_feedback(
    candidate_id: UUID,
    feedback: CandidateFeedbackCreate,
    user=Depends(get_current_user),
    db=Depends(get_db),
):
    conn, cur = db
    # Verify candidate and ownership
    await cur.execute(
        "SELECT c.id FROM candidates c JOIN jobs j ON c.job_id = j.id WHERE c.id = %s AND j.user_id = %s",
        (str(candidate_id), str(user["id"]))
    )
    if not await cur.fetchone():
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    await cur.execute(
        """INSERT INTO candidate_feedback (candidate_id, expected_score, expected_recommendation, comment)
           VALUES (%s, %s, %s, %s) RETURNING id, created_at""",
        (str(candidate_id), feedback.expected_score, feedback.expected_recommendation, feedback.comment)
    )
    row = await cur.fetchone()
    await conn.commit()

    return CandidateFeedbackResponse(
        id=row[0],
        candidate_id=candidate_id,
        expected_score=feedback.expected_score,
        expected_recommendation=feedback.expected_recommendation,
        comment=feedback.comment,
        created_at=row[1]
    )
