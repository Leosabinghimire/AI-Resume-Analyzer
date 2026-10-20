import uuid
from datetime import datetime

from pydantic import BaseModel, Field, HttpUrl, field_validator

from app.schemas.common import ORMModel

MIN_DESCRIPTION_CHARS = 80


def _clean_skills(skills: list[str] | None) -> list[str] | None:
    if skills is None:
        return None
    seen: set[str] = set()
    out: list[str] = []
    for s in (s.strip()[:60] for s in skills):
        if s and s.lower() not in seen:
            seen.add(s.lower())
            out.append(s)
    return out


class JobParsed(BaseModel):
    responsibilities: list[str] = []
    required_qualifications: list[str] = []
    preferred_qualifications: list[str] = []
    min_years_experience: float | None = None
    education_level: str | None = None
    education_equivalent_accepted: bool = False
    certifications: list[str] = []
    keywords: list[str] = []


class JobBase(BaseModel):
    title: str = Field(min_length=1, max_length=150)
    company: str | None = Field(default=None, max_length=150)
    url: HttpUrl | None = None
    description: str = Field(min_length=MIN_DESCRIPTION_CHARS, max_length=30000)

    @field_validator("title", "company")
    @classmethod
    def _strip(cls, v: str | None) -> str | None:
        return v.strip() if v else v

    @field_validator("description")
    @classmethod
    def _meaningful(cls, v: str) -> str:
        if len(set(v.lower().split())) < 15:
            raise ValueError("The job description is too short or repetitive to analyze")
        return v.strip()


class JobCreate(JobBase):
    pass


class JobUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=150)
    company: str | None = Field(default=None, max_length=150)
    url: HttpUrl | None = None
    description: str | None = Field(default=None, min_length=MIN_DESCRIPTION_CHARS, max_length=30000)
    required_skills: list[str] | None = Field(default=None, max_length=80)
    preferred_skills: list[str] | None = Field(default=None, max_length=80)

    _skills = field_validator("required_skills", "preferred_skills")(_clean_skills)


class JobSummary(ORMModel):
    id: uuid.UUID
    title: str
    company: str | None
    url: str | None
    required_skills: list[str]
    preferred_skills: list[str]
    created_at: datetime
    updated_at: datetime
    analysis_count: int = 0
    best_score: int | None = None


class JobOut(JobSummary):
    description: str
    skills_customized: bool
    parsed: JobParsed
