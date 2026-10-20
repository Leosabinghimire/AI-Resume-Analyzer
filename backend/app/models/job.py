import uuid
from typing import Any

from sqlalchemy import Boolean, ForeignKey, Index, String, Text, UniqueConstraint, Uuid
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, Timestamps, UUIDPrimaryKey


class JobDescription(UUIDPrimaryKey, Timestamps, Base):
    __tablename__ = "job_descriptions"
    __table_args__ = (
        UniqueConstraint("user_id", "description_hash", name="uq_jobs_user_description"),
        Index("ix_jobs_user_created", "user_id", "created_at"),
    )

    user_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("users.id", ondelete="CASCADE"))
    title: Mapped[str] = mapped_column(String(150))
    company: Mapped[str | None] = mapped_column(String(150))
    url: Mapped[str | None] = mapped_column(String(500))
    description: Mapped[str] = mapped_column(Text)
    description_hash: Mapped[str] = mapped_column(String(64))
    required_skills: Mapped[list[Any]]
    preferred_skills: Mapped[list[Any]]
    # True once the user edits the skill lists, so re-parsing the description does not overwrite them.
    skills_customized: Mapped[bool] = mapped_column(Boolean, default=False, server_default="false")
    # Deterministically extracted requirements: responsibilities, years, education, keywords.
    parsed: Mapped[dict[str, Any]]
