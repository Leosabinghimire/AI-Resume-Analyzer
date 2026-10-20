import hashlib
import re
import uuid
from difflib import SequenceMatcher
from pathlib import PurePath

from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.errors import AppError, ConflictError, UnprocessableError
from app.models import Resume, ResumeVersion, User
from app.repositories import resumes as repo
from app.schemas.resume import SectionDiff, TextDiffSegment
from app.schemas.resume_data import ResumeData
from app.services import storage
from app.services.parsing.resume_parser import parse_resume
from app.services.parsing.text_extraction import CONTENT_TYPES, DocumentError, extract_text


def safe_filename(name: str) -> str:
    base = PurePath(name.replace("\\", "/")).name
    base = re.sub(r"[\x00-\x1f\x7f<>:\"|?*]", "", base).strip() or "resume"
    return base[:255]


def upload_resume(
    db: Session, user: User, filename: str, content: bytes, title: str | None
) -> tuple[Resume, ResumeVersion, list[str]]:
    settings = get_settings()
    try:
        document = extract_text(filename, content, max_pages=settings.max_pdf_pages)
    except DocumentError as exc:
        raise UnprocessableError(exc.message, code=exc.code) from exc

    digest = hashlib.sha256(content).hexdigest()
    if existing := repo.find_by_hash(db, user.id, digest):
        raise ConflictError(
            "You have already uploaded this file.", code="duplicate_resume", details={"resume_id": str(existing.id)}
        )

    outcome = parse_resume(document.text)
    clean_name = safe_filename(filename)
    stored = storage.save(user.id, content, document.kind)
    resume = Resume(
        user_id=user.id,
        title=(title or PurePath(clean_name).stem or "Resume").strip()[:150],
        original_filename=clean_name,
        stored_filename=stored,
        content_type=CONTENT_TYPES[document.kind],
        file_size=len(content),
        file_sha256=digest,
        page_count=document.page_count,
        raw_text=document.text,
    )
    version = ResumeVersion(
        version_number=1, label="Original (parsed)", source="parsed", data=outcome.data.model_dump()
    )
    resume.versions.append(version)
    db.add(resume)
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        storage.delete(user.id, stored)
        raise ConflictError("You have already uploaded this file.", code="duplicate_resume") from exc
    except Exception:
        db.rollback()
        storage.delete(user.id, stored)
        raise
    db.refresh(resume)
    return resume, version, outcome.warnings


def _next_version_number(db: Session, resume_id: uuid.UUID) -> int:
    return (
        db.scalar(select(func.max(ResumeVersion.version_number)).where(ResumeVersion.resume_id == resume_id)) or 0
    ) + 1


def _reject_placeholders(data: ResumeData) -> None:
    if placeholders := data.find_placeholders():
        raise UnprocessableError(
            "Replace the bracketed placeholders with real information before saving.",
            code="unresolved_placeholders",
            details={"placeholders": placeholders},
        )


def create_version(db: Session, resume: Resume, label: str, source: str, data: ResumeData) -> ResumeVersion:
    _reject_placeholders(data)
    for attempt in range(3):  # retry if a concurrent save took the same version number
        version = ResumeVersion(
            resume_id=resume.id,
            version_number=_next_version_number(db, resume.id),
            label=label,
            source=source,
            data=data.model_dump(),
        )
        db.add(version)
        try:
            db.commit()
        except IntegrityError:
            db.rollback()
            if attempt == 2:
                raise ConflictError("Another save is in progress. Please retry.", code="version_conflict") from None
            continue
        db.refresh(version)
        resume.updated_at = version.created_at
        db.commit()
        return version
    raise AssertionError("unreachable")


def update_version(db: Session, version: ResumeVersion, label: str | None, data: ResumeData | None) -> ResumeVersion:
    if data is not None:
        _reject_placeholders(data)
        version.data = data.model_dump()
    if label is not None:
        version.label = label
    db.commit()
    db.refresh(version)
    return version


def delete_version(db: Session, resume: Resume, version: ResumeVersion) -> None:
    if len(resume.versions) <= 1:
        raise AppError("A resume must keep at least one version. Delete the resume instead.", code="last_version")
    db.delete(version)
    db.commit()


def reparse(db: Session, resume: Resume) -> ResumeVersion:
    outcome = parse_resume(resume.raw_text)
    return create_version(db, resume, "Re-parsed from original", "parsed", outcome.data)


def delete_resume(db: Session, resume: Resume) -> None:
    user_id, stored = resume.user_id, resume.stored_filename
    db.delete(resume)
    db.commit()
    storage.delete(user_id, stored)


def _text_segments(a: str, b: str) -> list[TextDiffSegment]:
    a_words, b_words = a.split(), b.split()
    segments: list[TextDiffSegment] = []
    for op, i1, i2, j1, j2 in SequenceMatcher(None, a_words, b_words, autojunk=False).get_opcodes():
        if op == "equal":
            segments.append(TextDiffSegment(op="equal", text=" ".join(a_words[i1:i2])))
            continue
        if i2 > i1:
            segments.append(TextDiffSegment(op="delete", text=" ".join(a_words[i1:i2])))
        if j2 > j1:
            segments.append(TextDiffSegment(op="insert", text=" ".join(b_words[j1:j2])))
    return segments


def _list_diff(section: str, label: str, base: list[str], target: list[str]) -> SectionDiff:
    base_set, target_set = set(base), set(target)
    added = [x for x in target if x not in base_set]
    removed = [x for x in base if x not in target_set]
    return SectionDiff(section=section, label=label, changed=bool(added or removed), added=added, removed=removed)


def compare_versions(base: ResumeData, target: ResumeData) -> list[SectionDiff]:
    def exp_lines(d: ResumeData) -> list[str]:
        return [f"{e.title} — {e.company}: {b}" for e in d.experience for b in (e.bullets or [""])]

    def proj_lines(d: ResumeData) -> list[str]:
        return [f"{p.name}: {b}" for p in d.projects for b in (p.bullets or [""])]

    summary = SectionDiff(
        section="summary",
        label="Professional summary",
        changed=base.summary != target.summary,
        segments=_text_segments(base.summary, target.summary),
    )
    return [
        summary,
        _list_diff("skills", "Skills", base.skills, target.skills),
        _list_diff("experience", "Experience", exp_lines(base), exp_lines(target)),
        _list_diff("projects", "Projects", proj_lines(base), proj_lines(target)),
        _list_diff(
            "education",
            "Education",
            [f"{e.degree} {e.field_of_study} — {e.institution}" for e in base.education],
            [f"{e.degree} {e.field_of_study} — {e.institution}" for e in target.education],
        ),
        _list_diff(
            "certifications",
            "Certifications",
            [c.name for c in base.certifications],
            [c.name for c in target.certifications],
        ),
    ]
