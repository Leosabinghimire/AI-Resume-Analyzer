"""AI resume feedback and interview preparation."""

from sqlalchemy.orm import Session

from app.models import AIFeedback, InterviewPrep, User
from app.repositories import jobs as job_repo
from app.repositories import resumes as resume_repo
from app.schemas.ai import InterviewPrepAI, ResumeFeedbackAI
from app.schemas.feedback import (
    FeedbackCreate,
    FeedbackOut,
    InterviewPrepCreate,
    InterviewPrepOut,
    InterviewPrepSummary,
    ResumeMetrics,
)
from app.schemas.resume_data import ResumeData
from app.services.ai.base import FeedbackContext, InterviewContext
from app.services.ai.factory import get_ai_provider
from app.services.ai.guardrails import ground_feedback, ground_interview_prep
from app.services.ai.redaction import redact_resume
from app.services.ai_access import require_ai_access
from app.services.analysis_service import job_context
from app.services.feedback_metrics import compute_metrics
from app.services.job_service import requirements_for
from app.services.matching.engine import match_resume_to_job

INTERVIEW_DISCLAIMER = (
    "These are practice questions generated from the job description and your resume. They are "
    "not the questions the employer will ask, and answer outlines are starting points to "
    "complete with your own real experience."
)


def create_feedback(db: Session, user: User, payload: FeedbackCreate) -> AIFeedback:
    version = resume_repo.get_owned_version(db, user.id, payload.resume_version_id)
    job = job_repo.get_owned_job(db, user.id, payload.job_id) if payload.job_id else None
    provider = get_ai_provider()
    require_ai_access(user, provider)

    data = ResumeData.model_validate(version.data)
    metrics = compute_metrics(data)
    match = match_resume_to_job(data, requirements_for(job)) if job else None
    result = provider.resume_feedback(
        FeedbackContext(resume=redact_resume(data), metrics=metrics, job=job_context(job) if job else None, match=match)
    )
    result = ground_feedback(result, data)

    feedback = AIFeedback(
        user_id=user.id,
        resume_version_id=version.id,
        job_id=job.id if job else None,
        provider=provider.name,
        model=provider.model,
        is_mock=provider.is_mock,
        metrics=metrics.model_dump(),
        result=result.model_dump(),
    )
    db.add(feedback)
    db.commit()
    db.refresh(feedback)
    return feedback


def feedback_out(fb: AIFeedback) -> FeedbackOut:
    return FeedbackOut(
        id=fb.id,
        resume_version_id=fb.resume_version_id,
        job_id=fb.job_id,
        provider=fb.provider,
        model=fb.model,
        is_mock=fb.is_mock,
        metrics=ResumeMetrics.model_validate(fb.metrics),
        result=ResumeFeedbackAI.model_validate(fb.result),
        created_at=fb.created_at,
    )


def create_interview_prep(db: Session, user: User, payload: InterviewPrepCreate) -> InterviewPrep:
    version = resume_repo.get_owned_version(db, user.id, payload.resume_version_id)
    job = job_repo.get_owned_job(db, user.id, payload.job_id)
    provider = get_ai_provider()
    require_ai_access(user, provider)

    data = ResumeData.model_validate(version.data)
    match = match_resume_to_job(data, requirements_for(job))
    result = provider.interview_prep(InterviewContext(resume=redact_resume(data), job=job_context(job), match=match))
    result = ground_interview_prep(result, data)

    prep = InterviewPrep(
        user_id=user.id,
        job_id=job.id,
        resume_version_id=version.id,
        provider=provider.name,
        model=provider.model,
        is_mock=provider.is_mock,
        result=result.model_dump(),
    )
    db.add(prep)
    db.commit()
    db.refresh(prep)
    return prep


def prep_summary(prep: InterviewPrep) -> InterviewPrepSummary:
    return InterviewPrepSummary(
        id=prep.id,
        job_id=prep.job_id,
        job_title=prep.job.title,
        company=prep.job.company,
        resume_title=prep.resume_version.resume.title,
        version_label=prep.resume_version.label,
        provider=prep.provider,
        is_mock=prep.is_mock,
        created_at=prep.created_at,
    )


def prep_out(prep: InterviewPrep) -> InterviewPrepOut:
    return InterviewPrepOut(
        **prep_summary(prep).model_dump(),
        resume_version_id=prep.resume_version_id,
        result=InterviewPrepAI.model_validate(prep.result),
        disclaimer=INTERVIEW_DISCLAIMER,
    )
