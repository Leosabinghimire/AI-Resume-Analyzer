import uuid

from fastapi import APIRouter, Response, status

from app.api.deps import CurrentUser, DbSession, Pagination
from app.repositories import analyses as repo
from app.schemas.common import Page
from app.schemas.feedback import (
    FeedbackCreate,
    FeedbackOut,
    InterviewPrepCreate,
    InterviewPrepOut,
    InterviewPrepSummary,
)
from app.services import coaching_service

router = APIRouter(tags=["AI coaching"])


@router.post(
    "/feedback",
    response_model=FeedbackOut,
    status_code=status.HTTP_201_CREATED,
    summary="Generate resume quality feedback, optionally tailored to a saved job",
)
def create_feedback(payload: FeedbackCreate, user: CurrentUser, db: DbSession) -> FeedbackOut:
    return coaching_service.feedback_out(coaching_service.create_feedback(db, user, payload))


@router.get("/feedback/{feedback_id}", response_model=FeedbackOut)
def get_feedback(feedback_id: uuid.UUID, user: CurrentUser, db: DbSession) -> FeedbackOut:
    return coaching_service.feedback_out(repo.get_owned_feedback(db, user.id, feedback_id))


@router.delete("/feedback/{feedback_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_feedback(feedback_id: uuid.UUID, user: CurrentUser, db: DbSession) -> Response:
    db.delete(repo.get_owned_feedback(db, user.id, feedback_id))
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post(
    "/interview-prep",
    response_model=InterviewPrepOut,
    status_code=status.HTTP_201_CREATED,
    summary="Generate practice interview questions for a job and resume version",
)
def create_prep(payload: InterviewPrepCreate, user: CurrentUser, db: DbSession) -> InterviewPrepOut:
    prep = coaching_service.create_interview_prep(db, user, payload)
    return coaching_service.prep_out(repo.get_owned_prep(db, user.id, prep.id))


@router.get("/interview-prep", response_model=Page[InterviewPrepSummary])
def list_preps(user: CurrentUser, db: DbSession, pagination: Pagination) -> Page[InterviewPrepSummary]:
    rows, total = repo.list_preps(db, user.id, offset=pagination.offset, limit=pagination.page_size)
    return Page(
        items=[coaching_service.prep_summary(p) for p in rows],
        total=total,
        page=pagination.page,
        page_size=pagination.page_size,
    )


@router.get("/interview-prep/{prep_id}", response_model=InterviewPrepOut)
def get_prep(prep_id: uuid.UUID, user: CurrentUser, db: DbSession) -> InterviewPrepOut:
    return coaching_service.prep_out(repo.get_owned_prep(db, user.id, prep_id))


@router.delete("/interview-prep/{prep_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_prep(prep_id: uuid.UUID, user: CurrentUser, db: DbSession) -> Response:
    db.delete(repo.get_owned_prep(db, user.id, prep_id))
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
