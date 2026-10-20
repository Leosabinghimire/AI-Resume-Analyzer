import uuid
from typing import TYPE_CHECKING, Any

from sqlalchemy import ForeignKey, Index, Integer, String, Text, UniqueConstraint, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, Timestamps, UUIDPrimaryKey

if TYPE_CHECKING:
    from app.models.user import User


class Resume(UUIDPrimaryKey, Timestamps, Base):
    """An uploaded resume file. The file and its extracted text are never modified after upload."""

    __tablename__ = "resumes"
    __table_args__ = (
        UniqueConstraint("user_id", "file_sha256", name="uq_resumes_user_file"),
        Index("ix_resumes_user_created", "user_id", "created_at"),
    )

    user_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("users.id", ondelete="CASCADE"))
    title: Mapped[str] = mapped_column(String(150))
    original_filename: Mapped[str] = mapped_column(String(255))
    stored_filename: Mapped[str] = mapped_column(String(255))
    content_type: Mapped[str] = mapped_column(String(100))
    file_size: Mapped[int] = mapped_column(Integer)
    file_sha256: Mapped[str] = mapped_column(String(64))
    page_count: Mapped[int | None] = mapped_column(Integer)
    raw_text: Mapped[str] = mapped_column(Text)

    user: Mapped["User"] = relationship(back_populates="resumes")
    versions: Mapped[list["ResumeVersion"]] = relationship(
        back_populates="resume",
        cascade="all, delete-orphan",
        passive_deletes=True,
        order_by="ResumeVersion.version_number",
    )


class ResumeVersion(UUIDPrimaryKey, Timestamps, Base):
    """Structured resume content. Version 1 is created from parsing; later versions come from edits."""

    __tablename__ = "resume_versions"
    __table_args__ = (UniqueConstraint("resume_id", "version_number", name="uq_resume_versions_number"),)

    resume_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("resumes.id", ondelete="CASCADE"), index=True)
    version_number: Mapped[int] = mapped_column(Integer)
    label: Mapped[str] = mapped_column(String(100))
    source: Mapped[str] = mapped_column(String(20))  # parsed | manual | ai_assisted
    data: Mapped[dict[str, Any]]

    resume: Mapped[Resume] = relationship(back_populates="versions")
