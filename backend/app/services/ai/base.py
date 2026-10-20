"""Provider-agnostic AI interface. Business services depend only on this module."""

from abc import ABC, abstractmethod
from dataclasses import dataclass

from app.schemas.ai import InterviewPrepAI, MatchInsights, ResumeFeedbackAI
from app.schemas.analysis import MatchResult
from app.schemas.feedback import ResumeMetrics
from app.schemas.resume_data import ResumeData


@dataclass(frozen=True)
class JobContext:
    title: str
    company: str | None
    description: str
    required_skills: list[str]
    preferred_skills: list[str]


@dataclass(frozen=True)
class MatchInsightsContext:
    resume: ResumeData  # always redacted
    job: JobContext
    match: MatchResult


@dataclass(frozen=True)
class FeedbackContext:
    resume: ResumeData
    metrics: ResumeMetrics
    job: JobContext | None
    match: MatchResult | None


@dataclass(frozen=True)
class InterviewContext:
    resume: ResumeData
    job: JobContext
    match: MatchResult


class AIProvider(ABC):
    name: str
    model: str
    is_mock: bool

    @abstractmethod
    def match_insights(self, ctx: MatchInsightsContext) -> MatchInsights: ...

    @abstractmethod
    def resume_feedback(self, ctx: FeedbackContext) -> ResumeFeedbackAI: ...

    @abstractmethod
    def interview_prep(self, ctx: InterviewContext) -> InterviewPrepAI: ...
