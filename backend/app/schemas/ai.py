"""Structured outputs requested from the LLM provider. Every AI response is validated against these."""

from typing import Literal

from pydantic import BaseModel, Field

Priority = Literal["high", "medium", "low"]


class TransferableSkill(BaseModel):
    missing_skill: str = Field(max_length=100)
    related_evidence: str = Field(max_length=400, description="Exact phrase from the resume that supports this")
    explanation: str = Field(max_length=500)


class MatchInsights(BaseModel):
    summary: str = Field(max_length=1500)
    strengths: list[str] = Field(max_length=8)
    gaps: list[str] = Field(max_length=8)
    transferable_skills: list[TransferableSkill] = Field(max_length=8)
    recommendations: list[str] = Field(max_length=8)


class WeakBullet(BaseModel):
    original: str = Field(max_length=1000, description="The bullet copied verbatim from the resume")
    issues: list[str] = Field(max_length=5)
    suggestion: str = Field(max_length=1000)
    requires_verification: bool


class KeywordRecommendation(BaseModel):
    keyword: str = Field(max_length=80)
    reason: str = Field(max_length=400)


class SummarySuggestion(BaseModel):
    suggested_summary: str = Field(max_length=2000)
    rationale: str = Field(max_length=600)
    requires_verification: bool


class GrammarSuggestion(BaseModel):
    original: str = Field(max_length=1000)
    suggestion: str = Field(max_length=1000)
    explanation: str = Field(max_length=400)


class ChecklistItem(BaseModel):
    item: str = Field(max_length=400)
    priority: Priority


class ResumeFeedbackAI(BaseModel):
    overall_summary: str = Field(max_length=2000)
    structure_feedback: list[str] = Field(max_length=10)
    readability_feedback: list[str] = Field(max_length=10)
    weak_bullets: list[WeakBullet] = Field(max_length=15)
    keyword_recommendations: list[KeywordRecommendation] = Field(max_length=15)
    summary_suggestion: SummarySuggestion | None
    grammar_suggestions: list[GrammarSuggestion] = Field(max_length=15)
    checklist: list[ChecklistItem] = Field(max_length=15)


class InterviewQuestion(BaseModel):
    question: str = Field(max_length=600)
    why_asked: str = Field(max_length=400)
    answer_outline: list[str] = Field(max_length=6)
    resume_evidence: str | None = Field(
        default=None, max_length=400, description="Resume fact the answer can draw on, or null"
    )


class StudyTopic(BaseModel):
    topic: str = Field(max_length=120)
    reason: str = Field(max_length=400)
    priority: Priority


class InterviewPrepAI(BaseModel):
    technical_questions: list[InterviewQuestion] = Field(max_length=10)
    behavioral_questions: list[InterviewQuestion] = Field(max_length=8)
    project_questions: list[InterviewQuestion] = Field(max_length=8)
    study_topics: list[StudyTopic] = Field(max_length=12)
