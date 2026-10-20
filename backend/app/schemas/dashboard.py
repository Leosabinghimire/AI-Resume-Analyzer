import uuid
from datetime import datetime

from pydantic import BaseModel

from app.schemas.analysis import AnalysisSummary


class DashboardCounts(BaseModel):
    resumes: int
    resume_versions: int
    jobs: int
    analyses: int
    feedback_reports: int
    interview_preps: int
    average_score: float | None


class ScoreTrendPoint(BaseModel):
    analysis_id: uuid.UUID
    created_at: datetime
    score: int
    job_title: str


class SkillGap(BaseModel):
    skill: str
    job_count: int


class RecentVersion(BaseModel):
    id: uuid.UUID
    resume_id: uuid.UUID
    resume_title: str
    version_number: int
    label: str
    source: str
    updated_at: datetime


class DashboardSummary(BaseModel):
    counts: DashboardCounts
    recent_analyses: list[AnalysisSummary]
    recent_versions: list[RecentVersion]
    score_trend: list[ScoreTrendPoint]
    skill_gaps: list[SkillGap]
