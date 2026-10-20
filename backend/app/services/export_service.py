"""Render a resume version to a clean single-column PDF with ReportLab.

The layout uses real text (no images), standard fonts and conventional headings, which keeps it
readable by most applicant tracking systems. No ATS compatibility is guaranteed.
"""

import io
from xml.sax.saxutils import escape

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import HRFlowable, ListFlowable, ListItem, Paragraph, SimpleDocTemplate, Spacer

from app.schemas.resume_data import ResumeData

ACCENT = colors.HexColor("#1f3a5f")


def _styles() -> dict[str, ParagraphStyle]:
    base = getSampleStyleSheet()
    return {
        "name": ParagraphStyle(
            "name", parent=base["Title"], fontSize=18, leading=22, alignment=TA_CENTER, textColor=ACCENT, spaceAfter=2
        ),
        "contact": ParagraphStyle(
            "contact", parent=base["Normal"], fontSize=9, alignment=TA_CENTER, textColor=colors.HexColor("#444444")
        ),
        "heading": ParagraphStyle(
            "heading", parent=base["Heading2"], fontSize=11, leading=14, textColor=ACCENT, spaceBefore=8, spaceAfter=2
        ),
        "role": ParagraphStyle(
            "role", parent=base["Normal"], fontName="Helvetica-Bold", fontSize=10, leading=13, spaceBefore=4
        ),
        "meta": ParagraphStyle(
            "meta", parent=base["Normal"], fontSize=9, leading=12, textColor=colors.HexColor("#555555")
        ),
        "body": ParagraphStyle("body", parent=base["Normal"], fontSize=10, leading=13),
    }


def _bullets(items: list[str], style: ParagraphStyle) -> ListFlowable:
    return ListFlowable(
        [ListItem(Paragraph(escape(b), style), leftIndent=10) for b in items if b.strip()],
        bulletType="bullet",
        start="•",
        leftIndent=12,
        bulletFontSize=8,
    )


def render_pdf(data: ResumeData) -> bytes:
    s = _styles()
    story: list[object] = []

    def section(title: str) -> None:
        story.append(Paragraph(title.upper(), s["heading"]))
        story.append(HRFlowable(width="100%", thickness=0.6, color=ACCENT, spaceAfter=3))

    c = data.contact
    if c.name:
        story.append(Paragraph(escape(c.name), s["name"]))
    contact_line = " | ".join(escape(x) for x in [c.email, c.phone, c.location, *c.links] if x)
    if contact_line:
        story.append(Paragraph(contact_line, s["contact"]))
    story.append(Spacer(1, 4))

    if data.summary:
        section("Professional Summary")
        story.append(Paragraph(escape(data.summary), s["body"]))
    if data.skills:
        section("Skills")
        story.append(Paragraph(escape(", ".join(data.skills)), s["body"]))
    if data.experience:
        section("Experience")
        for e in data.experience:
            story.append(Paragraph(escape(" — ".join(x for x in (e.title, e.company) if x)), s["role"]))
            meta = " | ".join(x for x in (f"{e.start_date} – {e.end_date}".strip(" –"), e.location) if x)
            if meta:
                story.append(Paragraph(escape(meta), s["meta"]))
            if e.bullets:
                story.append(_bullets(e.bullets, s["body"]))
    if data.projects:
        section("Projects")
        for p in data.projects:
            title = p.name + (f" ({', '.join(p.technologies)})" if p.technologies else "")
            story.append(Paragraph(escape(title), s["role"]))
            if p.url:
                story.append(Paragraph(escape(p.url), s["meta"]))
            if p.bullets:
                story.append(_bullets(p.bullets, s["body"]))
    if data.education:
        section("Education")
        for ed in data.education:
            degree = " in ".join(x for x in (ed.degree, ed.field_of_study) if x)
            story.append(Paragraph(escape(" — ".join(x for x in (degree, ed.institution) if x)), s["role"]))
            dates = f"{ed.start_date} – {ed.end_date}".strip(" –")
            if dates:
                story.append(Paragraph(escape(dates), s["meta"]))
            if ed.details:
                story.append(Paragraph(escape(ed.details), s["body"]))
    if data.certifications:
        section("Certifications")
        story.append(
            _bullets(
                [" — ".join(x for x in (ct.name, ct.issuer, ct.date) if x) for ct in data.certifications], s["body"]
            )
        )

    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        leftMargin=18 * mm,
        rightMargin=18 * mm,
        topMargin=15 * mm,
        bottomMargin=15 * mm,
        title=f"{c.name or 'Resume'}",
        author=c.name or "",
    )
    doc.build(story)
    return buffer.getvalue()
