import logging
from concurrent.futures import ThreadPoolExecutor
from datetime import UTC, datetime, timedelta

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.errors import AppError
from app.models import Analysis, JobDescription, ResumeVersion, User
from app.repositories import jobs as job_repo
from app.repositories import resumes as resume_repo
from app.schemas.ai import MatchInsights
from app.schemas.analysis import (
    AnalysisCreate,
    AnalysisJobRef,
    AnalysisOut,
    AnalysisResumeRef,
    AnalysisSummary,
    MatchResult,
)
from app.schemas.resume_data import ResumeData
from app.services.ai.base import AIProvider, JobContext, MatchInsightsContext
from app.services.ai.factory import get_ai_provider
from app.services.ai.guardrails import ground_match_insights
from app.services.ai.redaction import redact_resume
from app.services.ai_access import enforce_ai_rate_limit, needs_consent
from app.services.job_service import requirements_for
from app.services.matching.engine import match_resume_to_job

logger = logging.getLogger(__name__)
DUPLICATE_WINDOW = timedelta(seconds=15)
AI_CONCURRENCY = 4


def job_context(job: JobDescription) -> JobContext:
    return JobContext(
        title=job.title,
        company=job.company,
        description=job.description,
        required_skills=list(job.required_skills),
        preferred_skills=list(job.preferred_skills),
    )


def _generate_insights(
    provider: AIProvider, resume: ResumeData, job: JobDescription, match: MatchResult
) -> tuple[MatchInsights | None, str | None]:
    try:
        insights = provider.match_insights(MatchInsightsContext(redact_resume(resume), job_context(job), match))
        return ground_match_insights(insights, resume), None
    except AppError as exc:
        return None, exc.message


def _apply_ai(user: User, provider: AIProvider, data: ResumeData, pairs: list[tuple[Analysis, JobDescription]]) -> None:
    eligible: list[tuple[Analysis, JobDescription]] = []
    for analysis, job in pairs:
        analysis.ai_provider, analysis.ai_model = provider.name, provider.model
        if needs_consent(user, provider):
            analysis.ai_status = "skipped_no_consent"
            continue
        try:
            enforce_ai_rate_limit(user)
        except AppError as exc:
            analysis.ai_status, analysis.ai_error = "failed", exc.message
            continue
        eligible.append((analysis, job))
    with ThreadPoolExecutor(max_workers=AI_CONCURRENCY) as pool:
        outcomes = list(
            pool.map(
                lambda pair: _generate_insights(
                    provider, data, pair[1], MatchResult.model_validate(pair[0].match_result)
                ),
                eligible,
            )
        )
    for (analysis, _), (insights, error) in zip(eligible, outcomes, strict=True):
        if insights is not None:
            analysis.ai_status, analysis.ai_insights, analysis.ai_error = "completed", insights.model_dump(), None
        else:
            analysis.ai_status, analysis.ai_error = "failed", (error or "AI analysis failed.")[:300]


def _recent_duplicate(db: Session, user: User, version_id: object, job_id: object) -> Analysis | None:
    since = datetime.now(UTC) - DUPLICATE_WINDOW
    return db.scalar(
        select(Analysis).where(
            Analysis.user_id == user.id,
            Analysis.resume_version_id == version_id,
            Analysis.job_id == job_id,
            Analysis.created_at >= since,
        )
    )


def run_analyses(db: Session, user: User, payload: AnalysisCreate) -> list[Analysis]:
    version = resume_repo.get_owned_version(db, user.id, payload.resume_version_id)
    jobs = job_repo.get_owned_jobs(db, user.id, payload.job_ids)
    data = ResumeData.model_validate(version.data)
    results: list[Analysis] = []
    created: list[tuple[Analysis, JobDescription]] = []
    for job in jobs:
        if duplicate := _recent_duplicate(db, user, version.id, job.id):
            results.append(duplicate)  # double-submit protection
            continue
        match = match_resume_to_job(data, requirements_for(job))
        analysis = Analysis(
            user_id=user.id,
            resume_version_id=version.id,
            job_id=job.id,
            overall_score=match.overall_score,
            match_result=match.model_dump(),
            ai_status="not_requested",
        )
        created.append((analysis, job))
        results.append(analysis)
    if payload.include_ai_insights and created:
        _apply_ai(user, get_ai_provider(), data, created)
    db.add_all(a for a, _ in created)
    db.commit()
    return results


def regenerate_insights(db: Session, user: User, analysis: Analysis) -> Analysis:
    data = ResumeData.model_validate(analysis.resume_version.data)
    _apply_ai(user, get_ai_provider(), data, [(analysis, analysis.job)])
    db.commit()
    db.refresh(analysis)
    return analysis


def _refs(analysis: Analysis) -> tuple[AnalysisJobRef, AnalysisResumeRef]:
    job: JobDescription = analysis.job
    version: ResumeVersion = analysis.resume_version
    return (
        AnalysisJobRef(id=job.id, title=job.title, company=job.company),
        AnalysisResumeRef(
            resume_id=version.resume_id,
            resume_title=version.resume.title,
            version_id=version.id,
            version_number=version.version_number,
            version_label=version.label,
        ),
    )


def _is_stale(analysis: Analysis) -> bool:
    return analysis.resume_version.updated_at > analysis.created_at or analysis.job.updated_at > analysis.created_at


def to_summary(analysis: Analysis) -> AnalysisSummary:
    job, resume = _refs(analysis)
    return AnalysisSummary(
        id=analysis.id,
        overall_score=analysis.overall_score,
        created_at=analysis.created_at,
        job=job,
        resume=resume,
        ai_status=analysis.ai_status,
        missing_required_count=len(analysis.match_result.get("missing_required_skills", [])),
        is_stale=_is_stale(analysis),
    )


def to_out(analysis: Analysis) -> AnalysisOut:
    summary = to_summary(analysis)
    return AnalysisOut(
        **summary.model_dump(),
        match_result=MatchResult.model_validate(analysis.match_result),
        ai_insights=MatchInsights.model_validate(analysis.ai_insights) if analysis.ai_insights else None,
        ai_provider=analysis.ai_provider,
        ai_model=analysis.ai_model,
        ai_is_mock=analysis.ai_provider == "mock",
        ai_message=analysis.ai_error,
    )
