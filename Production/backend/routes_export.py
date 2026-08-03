import csv
import io
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse

from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer

from database import get_db
from auth import get_current_user

router = APIRouter()


@router.get("/{job_id}/export/csv")
async def export_csv(job_id: UUID, user=Depends(get_current_user), db=Depends(get_db)):
    conn, cur = db

    # Verify job
    await cur.execute("SELECT title FROM jobs WHERE id = %s AND user_id = %s", (str(job_id), str(user["id"])))
    job_row = await cur.fetchone()
    if not job_row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found")

    job_title = job_row[0]

    # Get evaluated candidates
    await cur.execute(
        """SELECT cp.prof_name, e.overall_score, e.recommendation, e.summary,
                  cp.skills, cp.total_experience_years, cp.prof_email, cp.phone, c.filename
           FROM candidates c
           JOIN candidate_profiles cp ON cp.candidate_id = c.id
           JOIN evaluations e ON e.candidate_id = c.id
           WHERE c.job_id = %s AND c.status = 'evaluated'
           ORDER BY e.overall_score DESC""",
        (str(job_id),)
    )
    rows = await cur.fetchall()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Rank", "Name", "Score", "Recommendation", "Summary", "Skills", "Experience (Years)", "Email", "Phone"])

    for rank, r in enumerate(rows, 1):
        skills_str = ", ".join(r[4]) if r[4] else ""
        writer.writerow([rank, r[0] or r[8], r[1], r[2], r[3] or "", skills_str, r[5], r[6] or "", r[7] or ""])

    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={job_title}_candidates.csv"}
    )


@router.get("/{job_id}/export/pdf")
async def export_pdf(job_id: UUID, user=Depends(get_current_user), db=Depends(get_db)):
    conn, cur = db

    # Verify job
    await cur.execute("SELECT title FROM jobs WHERE id = %s AND user_id = %s", (str(job_id), str(user["id"])))
    job_row = await cur.fetchone()
    if not job_row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found")

    job_title = job_row[0]

    # Get evaluated candidates
    await cur.execute(
        """SELECT cp.prof_name, e.overall_score, e.recommendation, cp.total_experience_years, c.filename
           FROM candidates c
           JOIN candidate_profiles cp ON cp.candidate_id = c.id
           JOIN evaluations e ON e.candidate_id = c.id
           WHERE c.job_id = %s AND c.status = 'evaluated'
           ORDER BY e.overall_score DESC""",
        (str(job_id),)
    )
    rows = await cur.fetchall()

    # Build PDF
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4)
    styles = getSampleStyleSheet()
    elements = []

    title_style = ParagraphStyle("Title", parent=styles["Heading1"], fontSize=16, spaceAfter=12)
    elements.append(Paragraph(f"Shortlist Report: {job_title}", title_style))
    elements.append(Spacer(1, 12))

    table_data = [["#", "Name", "Score", "Recommendation", "Experience"]]
    for rank, r in enumerate(rows, 1):
        table_data.append([
            str(rank), r[0] or r[4], str(r[1]), r[2], f"{r[3]} yrs"
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
        headers={"Content-Disposition": f"attachment; filename={job_title}_shortlist.pdf"}
    )
