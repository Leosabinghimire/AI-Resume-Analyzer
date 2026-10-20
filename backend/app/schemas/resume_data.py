"""Structured resume content stored in ResumeVersion.data."""

import re
import uuid

from pydantic import BaseModel, Field, field_validator

ShortText = Field(default="", max_length=200)

# Placeholders such as "[add metric]" come from suggestions and must be replaced by real facts before saving.
PLACEHOLDER_PATTERN = re.compile(r"\[(?:add|insert|verify|your|x+|number|metric)[^\]]*\]", re.IGNORECASE)


def _new_id() -> str:
    return uuid.uuid4().hex[:12]


class ContactInfo(BaseModel):
    name: str = ShortText
    email: str = ShortText
    phone: str = Field(default="", max_length=50)
    location: str = ShortText
    links: list[str] = Field(default_factory=list, max_length=10)


class ExperienceItem(BaseModel):
    id: str = Field(default_factory=_new_id, max_length=40)
    title: str = ShortText
    company: str = ShortText
    location: str = ShortText
    start_date: str = Field(default="", max_length=30)
    end_date: str = Field(default="", max_length=30)
    bullets: list[str] = Field(default_factory=list, max_length=40)


class EducationItem(BaseModel):
    id: str = Field(default_factory=_new_id, max_length=40)
    institution: str = ShortText
    degree: str = ShortText
    field_of_study: str = ShortText
    start_date: str = Field(default="", max_length=30)
    end_date: str = Field(default="", max_length=30)
    details: str = Field(default="", max_length=1000)


class ProjectItem(BaseModel):
    id: str = Field(default_factory=_new_id, max_length=40)
    name: str = ShortText
    url: str = Field(default="", max_length=300)
    technologies: list[str] = Field(default_factory=list, max_length=40)
    bullets: list[str] = Field(default_factory=list, max_length=40)


class CertificationItem(BaseModel):
    id: str = Field(default_factory=_new_id, max_length=40)
    name: str = ShortText
    issuer: str = ShortText
    date: str = Field(default="", max_length=30)


class ResumeData(BaseModel):
    contact: ContactInfo = Field(default_factory=ContactInfo)
    summary: str = Field(default="", max_length=3000)
    skills: list[str] = Field(default_factory=list, max_length=150)
    experience: list[ExperienceItem] = Field(default_factory=list, max_length=40)
    education: list[EducationItem] = Field(default_factory=list, max_length=20)
    projects: list[ProjectItem] = Field(default_factory=list, max_length=40)
    certifications: list[CertificationItem] = Field(default_factory=list, max_length=40)

    @field_validator("skills")
    @classmethod
    def _dedupe_skills(cls, skills: list[str]) -> list[str]:
        seen: set[str] = set()
        result: list[str] = []
        for s in (s.strip()[:60] for s in skills):
            if s and s.lower() not in seen:
                seen.add(s.lower())
                result.append(s)
        return result

    def all_bullets(self) -> list[str]:
        return [b for e in self.experience for b in e.bullets] + [b for p in self.projects for b in p.bullets]

    def find_placeholders(self) -> list[str]:
        texts = [self.summary, *self.all_bullets()]
        return sorted({m.group(0) for t in texts for m in PLACEHOLDER_PATTERN.finditer(t)})

    def to_text(self, include_contact: bool = True) -> str:
        """Flatten to plain text for keyword matching and AI prompts."""
        parts: list[str] = []
        if include_contact and self.contact.name:
            parts.append(self.contact.name)
        if self.summary:
            parts += ["SUMMARY", self.summary]
        if self.skills:
            parts += ["SKILLS", ", ".join(self.skills)]
        if self.experience:
            parts.append("EXPERIENCE")
            for e in self.experience:
                parts.append(
                    " | ".join(x for x in (e.title, e.company, f"{e.start_date} - {e.end_date}".strip(" -")) if x)
                )
                parts += [f"- {b}" for b in e.bullets]
        if self.projects:
            parts.append("PROJECTS")
            for p in self.projects:
                parts.append(p.name + (f" ({', '.join(p.technologies)})" if p.technologies else ""))
                parts += [f"- {b}" for b in p.bullets]
        if self.education:
            parts.append("EDUCATION")
            for ed in self.education:
                parts.append(" | ".join(x for x in (ed.degree, ed.field_of_study, ed.institution, ed.end_date) if x))
                if ed.details:
                    parts.append(ed.details)
        if self.certifications:
            parts.append("CERTIFICATIONS")
            parts += [" | ".join(x for x in (c.name, c.issuer, c.date) if x) for c in self.certifications]
        return "\n".join(parts)
