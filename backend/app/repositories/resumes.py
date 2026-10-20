"""Every query here is scoped to the owning user. A resource owned by someone else is reported as
not found (404) rather than forbidden, so IDs cannot be probed for existence."""

import uuid

from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session, selectinload

from app.core.errors import NotFoundError
from app.models import Resume, ResumeVersion


def get_owned_resume(db: Session, user_id: uuid.UUID, resume_id: uuid.UUID) -> Resume:
    resume = db.scalar(
        select(Resume).options(selectinload(Resume.versions)).where(Resume.id == resume_id, Resume.user_id == user_id)
    )
    if resume is None:
        raise NotFoundError("Resume not found.")
    return resume


def get_owned_version(db: Session, user_id: uuid.UUID, version_id: uuid.UUID) -> ResumeVersion:
    version = db.scalar(
        select(ResumeVersion)
        .join(Resume)
        .options(selectinload(ResumeVersion.resume))
        .where(ResumeVersion.id == version_id, Resume.user_id == user_id)
    )
    if version is None:
        raise NotFoundError("Resume version not found.")
    return version


def list_resumes(
    db: Session, user_id: uuid.UUID, *, q: str | None, offset: int, limit: int
) -> tuple[list[Resume], int]:
    stmt = select(Resume).where(Resume.user_id == user_id)
    if q:
        pattern = f"%{q.strip()}%"
        stmt = stmt.where(or_(Resume.title.ilike(pattern), Resume.original_filename.ilike(pattern)))
    total = db.scalar(select(func.count()).select_from(stmt.subquery())) or 0
    rows = db.scalars(
        stmt.options(selectinload(Resume.versions)).order_by(Resume.created_at.desc()).offset(offset).limit(limit)
    ).all()
    return list(rows), total


def find_by_hash(db: Session, user_id: uuid.UUID, sha256: str) -> Resume | None:
    return db.scalar(select(Resume).where(Resume.user_id == user_id, Resume.file_sha256 == sha256))
