import uuid
from typing import Any

from sqlalchemy import Boolean, ForeignKey, Index, Integer, String, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, Timestamps, UUIDPrimaryKey
from app.models.job import JobDescription
from app.models.resume import ResumeVersion

# user_id is stored on each row (although derivable through the resume) so ownership filters and
# per-user dashboard queries hit a single indexed column instead of a join chain.


class Analysis(UUIDPrimaryKey, Timestamps, Base):
    """A resume-version vs job comparison: deterministic match result plus optional AI insights."""

    __tablename__ = "analyses"
    __table_args__ = (
        Index("ix_analyses_user_created", "user_id", "created_at"),
        Index("ix_analyses_user_job", "user_id", "job_id"),
        Index("ix_analyses_user_version", "user_id", "resume_version_id"),
    )

    user_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("users.id", ondelete="CASCADE"))
    resume_version_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("resume_versions.id", ondelete="CASCADE"))
    job_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("job_descriptions.id", ondelete="CASCADE"))
    overall_score: Mapped[int] = mapped_column(Integer)
    match_result: Mapped[dict[str, Any]]
    ai_status: Mapped[str] = mapped_column(String(30))  # completed | failed | skipped_no_consent | not_requested
    ai_insights: Mapped[dict[str, Any] | None]
    ai_error: Mapped[str | None] = mapped_column(String(300))
    ai_provider: Mapped[str | None] = mapped_column(String(30))
    ai_model: Mapped[str | None] = mapped_column(String(100))

    resume_version: Mapped[ResumeVersion] = relationship()
    job: Mapped[JobDescription] = relationship()


class AIFeedback(UUIDPrimaryKey, Timestamps, Base):
    """Resume quality feedback for a resume version, optionally targeted at a job."""

    __tablename__ = "ai_feedback"
    __table_args__ = (Index("ix_ai_feedback_user_version", "user_id", "resume_version_id"),)

    user_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("users.id", ondelete="CASCADE"))
    resume_version_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("resume_versions.id", ondelete="CASCADE"))
    job_id: Mapped[uuid.UUID | None] = mapped_column(Uuid, ForeignKey("job_descriptions.id", ondelete="SET NULL"))
    provider: Mapped[str] = mapped_column(String(30))
    model: Mapped[str] = mapped_column(String(100))
    is_mock: Mapped[bool] = mapped_column(Boolean)
    metrics: Mapped[dict[str, Any]]
    result: Mapped[dict[str, Any]]


class InterviewPrep(UUIDPrimaryKey, Timestamps, Base):
    __tablename__ = "interview_preps"
    __table_args__ = (Index("ix_interview_preps_user_created", "user_id", "created_at"),)

    user_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("users.id", ondelete="CASCADE"))
    job_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("job_descriptions.id", ondelete="CASCADE"))
    resume_version_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("resume_versions.id", ondelete="CASCADE"))
    provider: Mapped[str] = mapped_column(String(30))
    model: Mapped[str] = mapped_column(String(100))
    is_mock: Mapped[bool] = mapped_column(Boolean)
    result: Mapped[dict[str, Any]]

    job: Mapped[JobDescription] = relationship()
    resume_version: Mapped[ResumeVersion] = relationship()
