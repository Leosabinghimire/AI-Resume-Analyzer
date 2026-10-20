import uuid
from typing import Any

from sqlalchemy import Select, func, or_, select
from sqlalchemy.orm import Session, joinedload
from sqlalchemy.sql.elements import UnaryExpression

from app.core.errors import NotFoundError
from app.models import AIFeedback, Analysis, InterviewPrep, JobDescription, Resume, ResumeVersion
from app.schemas.analysis import AnalysisFilters

_ANALYSIS_LOAD = (joinedload(Analysis.job), joinedload(Analysis.resume_version).joinedload(ResumeVersion.resume))


def get_owned_analysis(db: Session, user_id: uuid.UUID, analysis_id: uuid.UUID) -> Analysis:
    analysis = db.scalar(
        select(Analysis).options(*_ANALYSIS_LOAD).where(Analysis.id == analysis_id, Analysis.user_id == user_id)
    )
    if analysis is None:
        raise NotFoundError("Analysis not found.")
    return analysis


def get_owned_analyses(db: Session, user_id: uuid.UUID, ids: list[uuid.UUID]) -> list[Analysis]:
    rows = (
        db.scalars(select(Analysis).options(*_ANALYSIS_LOAD).where(Analysis.id.in_(ids), Analysis.user_id == user_id))
        .unique()
        .all()
    )
    if len(rows) != len(set(ids)):
        raise NotFoundError("One or more analyses were not found.")
    order = {i: n for n, i in enumerate(ids)}
    return sorted(rows, key=lambda a: order[a.id])


def _filtered(user_id: uuid.UUID, f: AnalysisFilters) -> Select[tuple[Analysis]]:
    stmt = (
        select(Analysis)
        .join(Analysis.job)
        .join(Analysis.resume_version)
        .join(ResumeVersion.resume)
        .where(Analysis.user_id == user_id)
    )
    if f.q:
        pattern = f"%{f.q.strip()}%"
        stmt = stmt.where(
            or_(JobDescription.title.ilike(pattern), JobDescription.company.ilike(pattern), Resume.title.ilike(pattern))
        )
    if f.resume_id:
        stmt = stmt.where(Resume.id == f.resume_id)
    if f.resume_version_id:
        stmt = stmt.where(Analysis.resume_version_id == f.resume_version_id)
    if f.job_id:
        stmt = stmt.where(Analysis.job_id == f.job_id)
    if f.min_score is not None:
        stmt = stmt.where(Analysis.overall_score >= f.min_score)
    if f.max_score is not None:
        stmt = stmt.where(Analysis.overall_score <= f.max_score)
    return stmt


SORT_ORDERS: dict[str, UnaryExpression[Any]] = {
    "newest": Analysis.created_at.desc(),
    "oldest": Analysis.created_at.asc(),
    "score_desc": Analysis.overall_score.desc(),
    "score_asc": Analysis.overall_score.asc(),
}


def list_analyses(
    db: Session, user_id: uuid.UUID, f: AnalysisFilters, *, offset: int, limit: int
) -> tuple[list[Analysis], int]:
    stmt = _filtered(user_id, f)
    total = db.scalar(select(func.count()).select_from(stmt.subquery())) or 0
    order = SORT_ORDERS[f.sort]
    rows = db.scalars(stmt.options(*_ANALYSIS_LOAD).order_by(order, Analysis.id).offset(offset).limit(limit)).unique()
    return list(rows), total


def get_owned_feedback(db: Session, user_id: uuid.UUID, feedback_id: uuid.UUID) -> AIFeedback:
    fb = db.scalar(select(AIFeedback).where(AIFeedback.id == feedback_id, AIFeedback.user_id == user_id))
    if fb is None:
        raise NotFoundError("Feedback report not found.")
    return fb


def list_feedback_for_version(db: Session, user_id: uuid.UUID, version_id: uuid.UUID) -> list[AIFeedback]:
    return list(
        db.scalars(
            select(AIFeedback)
            .where(AIFeedback.user_id == user_id, AIFeedback.resume_version_id == version_id)
            .order_by(AIFeedback.created_at.desc())
            .limit(20)
        )
    )


_PREP_LOAD = (joinedload(InterviewPrep.job), joinedload(InterviewPrep.resume_version).joinedload(ResumeVersion.resume))


def get_owned_prep(db: Session, user_id: uuid.UUID, prep_id: uuid.UUID) -> InterviewPrep:
    prep = db.scalar(
        select(InterviewPrep).options(*_PREP_LOAD).where(InterviewPrep.id == prep_id, InterviewPrep.user_id == user_id)
    )
    if prep is None:
        raise NotFoundError("Interview preparation not found.")
    return prep


def list_preps(db: Session, user_id: uuid.UUID, *, offset: int, limit: int) -> tuple[list[InterviewPrep], int]:
    base = select(InterviewPrep).where(InterviewPrep.user_id == user_id)
    total = db.scalar(select(func.count()).select_from(base.subquery())) or 0
    rows = db.scalars(
        base.options(*_PREP_LOAD).order_by(InterviewPrep.created_at.desc()).offset(offset).limit(limit)
    ).unique()
    return list(rows), total
