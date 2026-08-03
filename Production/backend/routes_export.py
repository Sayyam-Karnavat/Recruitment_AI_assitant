import csv
import io
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer

from database import get_db
from models import User, Job, Candidate, Evaluation
from auth import get_current_user

router = APIRouter()


@router.get("/{job_id}/export/csv")
async def export_csv(
    job_id: UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Verify job
    result = await db.execute(select(Job).where(Job.id == job_id, Job.user_id == user.id))
    job = result.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found")

    # Get evaluated candidates
    stmt = (
        select(Candidate)
        .options(selectinload(Candidate.profile), selectinload(Candidate.evaluation))
        .where(Candidate.job_id == job_id, Candidate.status == "evaluated")
    )
    result = await db.execute(stmt)
    candidates = result.scalars().all()

    # Sort by score descending
    candidates = sorted(candidates, key=lambda c: c.evaluation.overall_score if c.evaluation else 0, reverse=True)

    # Build CSV
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Rank", "Name", "Score", "Recommendation", "Summary", "Skills", "Experience (Years)", "Email", "Phone"])

    for rank, c in enumerate(candidates, 1):
        profile = c.profile
        evaluation = c.evaluation
        writer.writerow([
            rank,
            profile.name if profile else c.filename,
            evaluation.overall_score if evaluation else "N/A",
            evaluation.recommendation if evaluation else "N/A",
            evaluation.summary if evaluation else "",
            ", ".join(profile.skills) if profile and profile.skills else "",
            profile.total_experience_years if profile else "",
            profile.email if profile else "",
            profile.phone if profile else "",
        ])

    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={job.title}_candidates.csv"}
    )


@router.get("/{job_id}/export/pdf")
async def export_pdf(
    job_id: UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Verify job
    result = await db.execute(select(Job).where(Job.id == job_id, Job.user_id == user.id))
    job = result.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found")

    # Get evaluated candidates
    stmt = (
        select(Candidate)
        .options(selectinload(Candidate.profile), selectinload(Candidate.evaluation))
        .where(Candidate.job_id == job_id, Candidate.status == "evaluated")
    )
    result = await db.execute(stmt)
    candidates = result.scalars().all()
    candidates = sorted(candidates, key=lambda c: c.evaluation.overall_score if c.evaluation else 0, reverse=True)

    # Build PDF
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4)
    styles = getSampleStyleSheet()
    elements = []

    # Title
    title_style = ParagraphStyle("Title", parent=styles["Heading1"], fontSize=16, spaceAfter=12)
    elements.append(Paragraph(f"Shortlist Report: {job.title}", title_style))
    elements.append(Spacer(1, 12))

    # Table data
    table_data = [["#", "Name", "Score", "Recommendation", "Experience"]]
    for rank, c in enumerate(candidates, 1):
        profile = c.profile
        evaluation = c.evaluation
        table_data.append([
            str(rank),
            profile.name if profile else c.filename,
            str(evaluation.overall_score) if evaluation else "N/A",
            evaluation.recommendation if evaluation else "N/A",
            f"{profile.total_experience_years} yrs" if profile else "—",
        ])

    table = Table(table_data, colWidths=[30, 150, 50, 100, 70])
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#2563eb")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("ALIGN", (0, 0), (-1, -1), "LEFT"),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f9fafb")]),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
    ]))
    elements.append(table)

    doc.build(elements)
    buffer.seek(0)

    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={job.title}_shortlist.pdf"}
    )
