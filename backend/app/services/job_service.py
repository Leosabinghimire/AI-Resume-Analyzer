import hashlib
import re

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.errors import ConflictError
from app.models import JobDescription, User
from app.repositories import jobs as repo
from app.schemas.job import JobCreate, JobParsed, JobUpdate
from app.services.matching.engine import JobRequirements
from app.services.parsing.job_parser import analyze_job_description


def description_hash(description: str) -> str:
    normalized = re.sub(r"\s+", " ", description.lower()).strip()
    return hashlib.sha256(normalized.encode()).hexdigest()


def _apply_analysis(job: JobDescription, description: str, *, keep_skills: bool) -> None:
    analysis = analyze_job_description(description)
    job.description = description
    job.description_hash = description_hash(description)
    job.parsed = analysis.parsed.model_dump()
    if not keep_skills:
        job.required_skills = analysis.required_skills
        job.preferred_skills = analysis.preferred_skills


def _commit_unique(db: Session, job: JobDescription) -> JobDescription:
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise ConflictError("You have already saved a job with this description.", code="duplicate_job") from exc
    db.refresh(job)
    return job


def create_job(db: Session, user: User, data: JobCreate) -> JobDescription:
    if existing := repo.find_by_hash(db, user.id, description_hash(data.description)):
        raise ConflictError(
            "You have already saved a job with this description.",
            code="duplicate_job",
            details={"job_id": str(existing.id)},
        )
    job = JobDescription(
        user_id=user.id,
        title=data.title,
        company=data.company,
        url=str(data.url) if data.url else None,
        required_skills=[],
        preferred_skills=[],
    )
    _apply_analysis(job, data.description, keep_skills=False)
    db.add(job)
    return _commit_unique(db, job)


def update_job(db: Session, job: JobDescription, data: JobUpdate) -> JobDescription:
    fields = data.model_fields_set
    if "title" in fields and data.title:
        job.title = data.title
    if "company" in fields:
        job.company = data.company or None
    if "url" in fields:
        job.url = str(data.url) if data.url else None
    skills_edited = data.required_skills is not None or data.preferred_skills is not None
    if data.description is not None and data.description != job.description:
        _apply_analysis(job, data.description, keep_skills=job.skills_customized or skills_edited)
    if data.required_skills is not None:
        job.required_skills = data.required_skills
    if data.preferred_skills is not None:
        job.preferred_skills = [s for s in data.preferred_skills if s not in job.required_skills]
    if skills_edited:
        job.skills_customized = True
    return _commit_unique(db, job)


def reset_skills(db: Session, job: JobDescription) -> JobDescription:
    job.skills_customized = False
    _apply_analysis(job, job.description, keep_skills=False)
    db.commit()
    db.refresh(job)
    return job


def requirements_for(job: JobDescription) -> JobRequirements:
    return JobRequirements(
        required_skills=list(job.required_skills),
        preferred_skills=list(job.preferred_skills),
        parsed=JobParsed.model_validate(job.parsed),
    )
