import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

from app.schemas.ai import MatchInsights, Priority

ComponentKey = Literal["required_skills", "preferred_skills", "experience", "responsibilities", "education", "keywords"]
AIStatus = Literal["completed", "failed", "skipped_no_consent", "not_requested"]


class ScoreComponent(BaseModel):
    key: ComponentKey
    label: str
    weight: float
    score: float | None  # None when not applicable
    applicable: bool
    explanation: str


class MatchedSkill(BaseModel):
    skill: str
    requirement: Literal["required", "preferred"]
    evidence: list[str]


class RelevantExperience(BaseModel):
    title: str
    company: str
    relevance: float
    matched_terms: list[str]
    reason: str


class ResponsibilityAlignment(BaseModel):
    responsibility: str
    best_match: str | None
    similarity: float
    aligned: bool


class ExperienceCheck(BaseModel):
    required_years: float | None
    candidate_years: float | None
    explanation: str


class EducationCheck(BaseModel):
    required_level: str | None
    candidate_level: str | None
    equivalent_experience_accepted: bool
    matched_certifications: list[str]
    missing_certifications: list[str]
    explanation: str


class KeywordCoverage(BaseModel):
    matched: list[str]
    missing: list[str]
    coverage: float


class ImprovementArea(BaseModel):
    area: str
    detail: str
    priority: Priority


class MatchResult(BaseModel):
    methodology_version: str
    overall_score: int = Field(ge=0, le=100)
    components: list[ScoreComponent]
    matched_skills: list[MatchedSkill]
    missing_required_skills: list[str]
    missing_preferred_skills: list[str]
    relevant_experience: list[RelevantExperience]
    responsibility_alignment: list[ResponsibilityAlignment]
    experience: ExperienceCheck
    education: EducationCheck
    keyword_coverage: KeywordCoverage
    improvement_areas: list[ImprovementArea]


class AnalysisCreate(BaseModel):
    resume_version_id: uuid.UUID
    job_ids: list[uuid.UUID] = Field(min_length=1, max_length=10)
    include_ai_insights: bool = True


class AnalysisJobRef(BaseModel):
    id: uuid.UUID
    title: str
    company: str | None


class AnalysisResumeRef(BaseModel):
    resume_id: uuid.UUID
    resume_title: str
    version_id: uuid.UUID
    version_number: int
    version_label: str


class AnalysisSummary(BaseModel):
    id: uuid.UUID
    overall_score: int
    created_at: datetime
    job: AnalysisJobRef
    resume: AnalysisResumeRef
    ai_status: AIStatus
    missing_required_count: int
    is_stale: bool


class AnalysisOut(AnalysisSummary):
    match_result: MatchResult
    ai_insights: MatchInsights | None
    ai_provider: str | None
    ai_model: str | None
    ai_is_mock: bool
    ai_message: str | None = None


class AnalysisFilters(BaseModel):
    q: str | None = Field(default=None, max_length=100)
    resume_id: uuid.UUID | None = None
    resume_version_id: uuid.UUID | None = None
    job_id: uuid.UUID | None = None
    min_score: int | None = Field(default=None, ge=0, le=100)
    max_score: int | None = Field(default=None, ge=0, le=100)
    sort: Literal["newest", "oldest", "score_desc", "score_asc"] = "newest"
