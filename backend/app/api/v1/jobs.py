import uuid
from typing import Annotated

from fastapi import APIRouter, Query, Response, status

from app.api.deps import CurrentUser, DbSession, Pagination
from app.models import JobDescription
from app.repositories import jobs as repo
from app.schemas.common import Page
from app.schemas.job import JobCreate, JobOut, JobParsed, JobSummary, JobUpdate
from app.services import job_service

router = APIRouter(prefix="/jobs", tags=["Job descriptions"])


def _out(job: JobDescription) -> JobOut:
    return JobOut(
        id=job.id,
        title=job.title,
        company=job.company,
        url=job.url,
        required_skills=job.required_skills,
        preferred_skills=job.preferred_skills,
        created_at=job.created_at,
        updated_at=job.updated_at,
        description=job.description,
        skills_customized=job.skills_customized,
        parsed=JobParsed.model_validate(job.parsed),
    )


@router.post(
    "",
    response_model=JobOut,
    status_code=status.HTTP_201_CREATED,
    summary="Save a job description; requirements and skills are extracted automatically",
)
def create_job(payload: JobCreate, user: CurrentUser, db: DbSession) -> JobOut:
    return _out(job_service.create_job(db, user, payload))


@router.get("", response_model=Page[JobSummary])
def list_jobs(
    user: CurrentUser, db: DbSession, pagination: Pagination, q: Annotated[str | None, Query(max_length=100)] = None
) -> Page[JobSummary]:
    rows, total = repo.list_jobs(db, user.id, q=q, offset=pagination.offset, limit=pagination.page_size)
    items = [
        JobSummary(
            id=j.id,
            title=j.title,
            company=j.company,
            url=j.url,
            required_skills=j.required_skills,
            preferred_skills=j.preferred_skills,
            created_at=j.created_at,
            updated_at=j.updated_at,
            analysis_count=count,
            best_score=best,
        )
        for j, count, best in rows
    ]
    return Page(items=items, total=total, page=pagination.page, page_size=pagination.page_size)


@router.get("/{job_id}", response_model=JobOut)
def get_job(job_id: uuid.UUID, user: CurrentUser, db: DbSession) -> JobOut:
    return _out(repo.get_owned_job(db, user.id, job_id))


@router.patch("/{job_id}", response_model=JobOut)
def update_job(job_id: uuid.UUID, payload: JobUpdate, user: CurrentUser, db: DbSession) -> JobOut:
    return _out(job_service.update_job(db, repo.get_owned_job(db, user.id, job_id), payload))


@router.post(
    "/{job_id}/reset-skills",
    response_model=JobOut,
    summary="Discard manual skill edits and re-extract skills from the description",
)
def reset_skills(job_id: uuid.UUID, user: CurrentUser, db: DbSession) -> JobOut:
    return _out(job_service.reset_skills(db, repo.get_owned_job(db, user.id, job_id)))


@router.delete("/{job_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Delete a job description and its analyses")
def delete_job(job_id: uuid.UUID, user: CurrentUser, db: DbSession) -> Response:
    job = repo.get_owned_job(db, user.id, job_id)
    db.delete(job)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
