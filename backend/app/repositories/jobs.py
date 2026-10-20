import uuid

from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.core.errors import NotFoundError
from app.models import Analysis, JobDescription


def get_owned_job(db: Session, user_id: uuid.UUID, job_id: uuid.UUID) -> JobDescription:
    job = db.scalar(select(JobDescription).where(JobDescription.id == job_id, JobDescription.user_id == user_id))
    if job is None:
        raise NotFoundError("Job description not found.")
    return job


def get_owned_jobs(db: Session, user_id: uuid.UUID, job_ids: list[uuid.UUID]) -> list[JobDescription]:
    jobs = db.scalars(
        select(JobDescription).where(JobDescription.id.in_(job_ids), JobDescription.user_id == user_id)
    ).all()
    by_id = {j.id: j for j in jobs}
    missing = [str(j) for j in job_ids if j not in by_id]
    if missing:
        raise NotFoundError("One or more job descriptions were not found.", details={"job_ids": missing})
    return [by_id[j] for j in dict.fromkeys(job_ids)]


def find_by_hash(db: Session, user_id: uuid.UUID, description_hash: str) -> JobDescription | None:
    return db.scalar(
        select(JobDescription).where(
            JobDescription.user_id == user_id, JobDescription.description_hash == description_hash
        )
    )


def list_jobs(
    db: Session, user_id: uuid.UUID, *, q: str | None, offset: int, limit: int
) -> tuple[list[tuple[JobDescription, int, int | None]], int]:
    """Return (job, analysis_count, best_score) rows."""
    base = select(JobDescription).where(JobDescription.user_id == user_id)
    if q:
        pattern = f"%{q.strip()}%"
        base = base.where(or_(JobDescription.title.ilike(pattern), JobDescription.company.ilike(pattern)))
    total = db.scalar(select(func.count()).select_from(base.subquery())) or 0
    stats = (
        select(Analysis.job_id, func.count(Analysis.id).label("n"), func.max(Analysis.overall_score).label("best"))
        .where(Analysis.user_id == user_id)
        .group_by(Analysis.job_id)
        .subquery()
    )
    stmt = base.add_columns(func.coalesce(stats.c.n, 0), stats.c.best).outerjoin(
        stats, stats.c.job_id == JobDescription.id
    )
    rows = db.execute(stmt.order_by(JobDescription.created_at.desc()).offset(offset).limit(limit)).all()
    return [(r[0], int(r[1]), r[2]) for r in rows], total
