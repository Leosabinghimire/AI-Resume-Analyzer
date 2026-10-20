import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, Query, Response, status

from app.api.deps import CurrentUser, DbSession, Pagination
from app.core.errors import AppError
from app.repositories import analyses as repo
from app.schemas.analysis import AnalysisCreate, AnalysisFilters, AnalysisOut, AnalysisSummary
from app.schemas.common import Page
from app.services import analysis_service

router = APIRouter(prefix="/analyses", tags=["Resume-job matching & history"])
MAX_COMPARE = 4


@router.post(
    "",
    response_model=list[AnalysisOut],
    status_code=status.HTTP_201_CREATED,
    summary="Match one resume version against one or more saved jobs",
)
def create_analyses(payload: AnalysisCreate, user: CurrentUser, db: DbSession) -> list[AnalysisOut]:
    return [analysis_service.to_out(a) for a in analysis_service.run_analyses(db, user, payload)]


@router.get("", response_model=Page[AnalysisSummary], summary="Search and filter saved analyses")
def list_analyses(
    user: CurrentUser, db: DbSession, pagination: Pagination, filters: Annotated[AnalysisFilters, Depends()]
) -> Page[AnalysisSummary]:
    rows, total = repo.list_analyses(db, user.id, filters, offset=pagination.offset, limit=pagination.page_size)
    return Page(
        items=[analysis_service.to_summary(a) for a in rows],
        total=total,
        page=pagination.page,
        page_size=pagination.page_size,
    )


@router.get("/compare", response_model=list[AnalysisOut], summary="Fetch 2–4 analyses side by side")
def compare(user: CurrentUser, db: DbSession, ids: Annotated[list[uuid.UUID], Query()]) -> list[AnalysisOut]:
    unique = list(dict.fromkeys(ids))
    if not 2 <= len(unique) <= MAX_COMPARE:
        raise AppError(f"Select between 2 and {MAX_COMPARE} analyses to compare.", code="invalid_comparison")
    return [analysis_service.to_out(a) for a in repo.get_owned_analyses(db, user.id, unique)]


@router.get("/{analysis_id}", response_model=AnalysisOut)
def get_analysis(analysis_id: uuid.UUID, user: CurrentUser, db: DbSession) -> AnalysisOut:
    return analysis_service.to_out(repo.get_owned_analysis(db, user.id, analysis_id))


@router.post(
    "/{analysis_id}/insights", response_model=AnalysisOut, summary="Retry or regenerate the AI insights for an analysis"
)
def regenerate_insights(analysis_id: uuid.UUID, user: CurrentUser, db: DbSession) -> AnalysisOut:
    analysis = repo.get_owned_analysis(db, user.id, analysis_id)
    return analysis_service.to_out(analysis_service.regenerate_insights(db, user, analysis))


@router.delete("/{analysis_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_analysis(analysis_id: uuid.UUID, user: CurrentUser, db: DbSession) -> Response:
    db.delete(repo.get_owned_analysis(db, user.id, analysis_id))
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
