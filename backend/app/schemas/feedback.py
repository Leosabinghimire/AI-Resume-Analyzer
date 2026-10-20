import uuid
from datetime import datetime

from pydantic import BaseModel

from app.schemas.ai import InterviewPrepAI, ResumeFeedbackAI


class BulletIssue(BaseModel):
    bullet: str
    issues: list[str]


class ResumeMetrics(BaseModel):
    """Deterministic measurements computed locally, independent of the AI provider."""

    word_count: int
    bullet_count: int
    quantified_bullet_ratio: float
    action_verb_ratio: float
    avg_bullet_words: float
    long_bullets: int
    short_bullets: int
    vague_phrase_count: int
    first_person_count: int
    missing_sections: list[str]
    summary_word_count: int
    skills_count: int
    flagged_bullets: list[BulletIssue]


class FeedbackCreate(BaseModel):
    resume_version_id: uuid.UUID
    job_id: uuid.UUID | None = None


class FeedbackOut(BaseModel):
    id: uuid.UUID
    resume_version_id: uuid.UUID
    job_id: uuid.UUID | None
    provider: str
    model: str
    is_mock: bool
    metrics: ResumeMetrics
    result: ResumeFeedbackAI
    created_at: datetime


class InterviewPrepCreate(BaseModel):
    resume_version_id: uuid.UUID
    job_id: uuid.UUID


class InterviewPrepSummary(BaseModel):
    id: uuid.UUID
    job_id: uuid.UUID
    job_title: str
    company: str | None
    resume_title: str
    version_label: str
    provider: str
    is_mock: bool
    created_at: datetime


class InterviewPrepOut(InterviewPrepSummary):
    resume_version_id: uuid.UUID
    result: InterviewPrepAI
    disclaimer: str
