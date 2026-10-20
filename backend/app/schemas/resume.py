import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

from app.schemas.common import ORMModel
from app.schemas.resume_data import ResumeData

VersionSource = Literal["parsed", "manual", "ai_assisted"]


class ResumeVersionSummary(ORMModel):
    id: uuid.UUID
    version_number: int
    label: str
    source: str
    created_at: datetime
    updated_at: datetime


class ResumeVersionOut(ResumeVersionSummary):
    resume_id: uuid.UUID
    data: ResumeData


class ResumeOut(ORMModel):
    id: uuid.UUID
    title: str
    original_filename: str
    content_type: str
    file_size: int
    page_count: int | None
    created_at: datetime
    updated_at: datetime
    version_count: int
    latest_version: ResumeVersionSummary | None


class ResumeDetail(ResumeOut):
    versions: list[ResumeVersionSummary]
    parse_warnings: list[str] = Field(default_factory=list)


class ResumeUploadResult(BaseModel):
    resume: ResumeDetail
    version: ResumeVersionOut
    warnings: list[str]


class ResumeUpdate(BaseModel):
    title: str = Field(min_length=1, max_length=150)


class ResumeTextOut(BaseModel):
    raw_text: str


class VersionCreate(BaseModel):
    label: str = Field(min_length=1, max_length=100)
    source: Literal["manual", "ai_assisted"] = "manual"
    data: ResumeData


class VersionUpdate(BaseModel):
    label: str | None = Field(default=None, min_length=1, max_length=100)
    data: ResumeData | None = None


class TextDiffSegment(BaseModel):
    op: Literal["equal", "insert", "delete"]
    text: str


class SectionDiff(BaseModel):
    section: str
    label: str
    changed: bool
    segments: list[TextDiffSegment] = []
    added: list[str] = []
    removed: list[str] = []


class VersionComparison(BaseModel):
    base: ResumeVersionSummary
    target: ResumeVersionSummary
    sections: list[SectionDiff]
