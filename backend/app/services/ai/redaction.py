"""Remove direct identifiers before resume content leaves the server."""

import re

from app.schemas.resume_data import ContactInfo, ResumeData
from app.services.parsing.text_utils import EMAIL_RE, PHONE_RE, URL_RE


def _scrub(text: str, name_pattern: re.Pattern[str] | None) -> str:
    text = EMAIL_RE.sub("[EMAIL]", text)
    text = URL_RE.sub("[LINK]", text)
    text = PHONE_RE.sub(lambda m: "[PHONE]" if sum(c.isdigit() for c in m.group(0)) >= 9 else m.group(0), text)
    if name_pattern:
        text = name_pattern.sub("[NAME]", text)
    return text


def redact_resume(data: ResumeData) -> ResumeData:
    """Return a copy without contact details; names, emails, phones and links are masked in all text."""
    name_parts = [p for p in data.contact.name.split() if len(p) > 2]
    name_pattern = (
        re.compile(r"\b(" + "|".join(map(re.escape, [data.contact.name, *name_parts])) + r")\b") if name_parts else None
    )
    redacted = data.model_copy(deep=True)
    redacted.contact = ContactInfo()
    redacted.summary = _scrub(redacted.summary, name_pattern)
    for exp in redacted.experience:
        exp.bullets = [_scrub(b, name_pattern) for b in exp.bullets]
    for proj in redacted.projects:
        proj.url = ""
        proj.bullets = [_scrub(b, name_pattern) for b in proj.bullets]
    for ed in redacted.education:
        ed.details = _scrub(ed.details, name_pattern)
    return redacted
