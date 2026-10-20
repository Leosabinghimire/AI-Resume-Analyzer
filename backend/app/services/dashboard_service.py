import uuid
from collections import Counter

from sqlalchemy import func, select
from sqlalchemy.orm import Session, joinedload

from app.models import AIFeedback, Analysis, InterviewPrep, JobDescription, Resume, ResumeVersion
from app.repositories.analyses import list_analyses
from app.schemas.analysis import AnalysisFilters
from app.schemas.dashboard import DashboardCounts, DashboardSummary, RecentVersion, ScoreTrendPoint, SkillGap
from app.services.analysis_service import to_summary

TREND_POINTS = 30
GAP_SAMPLE = 200


def _count(db: Session, model: type, user_id: uuid.UUID) -> int:
    return db.scalar(select(func.count()).select_from(model).where(model.user_id == user_id)) or 0  # type: ignore[attr-defined]


def get_summary(db: Session, user_id: uuid.UUID) -> DashboardSummary:
    version_count = db.scalar(select(func.count(ResumeVersion.id)).join(Resume).where(Resume.user_id == user_id)) or 0
    average = db.scalar(select(func.avg(Analysis.overall_score)).where(Analysis.user_id == user_id))
    counts = DashboardCounts(
        resumes=_count(db, Resume, user_id),
        resume_versions=version_count,
        jobs=_count(db, JobDescription, user_id),
        analyses=_count(db, Analysis, user_id),
        feedback_reports=_count(db, AIFeedback, user_id),
        interview_preps=_count(db, InterviewPrep, user_id),
        average_score=round(float(average), 1) if average is not None else None,
    )

    recent, _ = list_analyses(db, user_id, AnalysisFilters(), offset=0, limit=5)

    versions = db.scalars(
        select(ResumeVersion)
        .join(Resume)
        .options(joinedload(ResumeVersion.resume))
        .where(Resume.user_id == user_id)
        .order_by(ResumeVersion.updated_at.desc())
        .limit(5)
    )
    recent_versions = [
        RecentVersion(
            id=v.id,
            resume_id=v.resume_id,
            resume_title=v.resume.title,
            version_number=v.version_number,
            label=v.label,
            source=v.source,
            updated_at=v.updated_at,
        )
        for v in versions
    ]

    trend_rows = db.execute(
        select(Analysis.id, Analysis.created_at, Analysis.overall_score, JobDescription.title)
        .join(JobDescription, JobDescription.id == Analysis.job_id)
        .where(Analysis.user_id == user_id)
        .order_by(Analysis.created_at.desc())
        .limit(TREND_POINTS)
    ).all()
    trend = [
        ScoreTrendPoint(analysis_id=r[0], created_at=r[1], score=r[2], job_title=r[3]) for r in reversed(trend_rows)
    ]

    # Skill gaps: count each missing required skill once per job, using that job's latest analysis.
    latest_per_job: dict[uuid.UUID, list[str]] = {}
    for job_id, result in db.execute(
        select(Analysis.job_id, Analysis.match_result)
        .where(Analysis.user_id == user_id)
        .order_by(Analysis.created_at.desc())
        .limit(GAP_SAMPLE)
    ):
        latest_per_job.setdefault(job_id, result.get("missing_required_skills", []))
    gaps = Counter(skill for skills in latest_per_job.values() for skill in set(skills))
    skill_gaps = [SkillGap(skill=s, job_count=n) for s, n in gaps.most_common(10)]

    return DashboardSummary(
        counts=counts,
        recent_analyses=[to_summary(a) for a in recent],
        recent_versions=recent_versions,
        score_trend=trend,
        skill_gaps=skill_gaps,
    )
