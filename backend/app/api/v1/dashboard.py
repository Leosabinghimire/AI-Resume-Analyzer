from fastapi import APIRouter

from app.api.deps import CurrentUser, DbSession
from app.schemas.dashboard import DashboardSummary
from app.services import dashboard_service

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("", response_model=DashboardSummary, summary="Counts, recent activity, score trend and skill gaps")
def summary(user: CurrentUser, db: DbSession) -> DashboardSummary:
    return dashboard_service.get_summary(db, user.id)
