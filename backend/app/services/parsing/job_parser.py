"""Deterministic job description analysis: sections, skills, experience and education requirements."""

import re
from collections import Counter
from dataclasses import dataclass

from app.schemas.job import JobParsed
from app.services.parsing.skills_taxonomy import find_skills
from app.services.parsing.text_utils import (
    GENERIC_JOB_WORDS,
    STOPWORDS,
    content_tokens,
    is_bullet,
    normalize_text,
    strip_bullet,
)

JOB_SECTION_ALIASES: dict[str, tuple[str, ...]] = {
    "responsibilities": (
        "responsibilities",
        "key responsibilities",
        "what you'll do",
        "what you will do",
        "your responsibilities",
        "the role",
        "role overview",
        "duties",
        "your role",
        "day to day",
        "in this role you will",
        "what you will be doing",
        "job duties",
        "your impact",
        "what you'll be doing",
    ),
    "required": (
        "requirements",
        "qualifications",
        "required qualifications",
        "minimum qualifications",
        "basic qualifications",
        "must have",
        "must haves",
        "what you'll need",
        "what you will need",
        "what we're looking for",
        "what we are looking for",
        "who you are",
        "your profile",
        "required skills",
        "skills and experience",
        "requirements and qualifications",
        "you have",
        "about you",
        "what you bring",
        "required experience",
    ),
    "preferred": (
        "preferred",
        "preferred qualifications",
        "nice to have",
        "nice to haves",
        "bonus points",
        "bonus",
        "good to have",
        "desired skills",
        "pluses",
        "preferred skills",
        "it's a plus if",
        "extra credit",
        "desirable",
    ),
    "other": (
        "about us",
        "about the company",
        "benefits",
        "perks",
        "what we offer",
        "why join us",
        "compensation",
        "how to apply",
        "equal opportunity",
        "our culture",
        "location",
    ),
}
_LOOKUP = {a: s for s, aliases in JOB_SECTION_ALIASES.items() for a in aliases}
PREFERRED_MARKER = re.compile(
    r"\b(preferred|nice to have|a plus|is a plus|bonus|desirable|good to have|ideally|"
    r"familiarity with .* is a plus)\b",
    re.IGNORECASE,
)
YEARS_RE = re.compile(r"(\d{1,2})(?:\.\d)?\s*(?:\+|plus)?\s*(?:-|–|to)?\s*(?:\d{1,2})?\s*\+?\s*years?", re.IGNORECASE)
EDUCATION_LEVELS = (
    ("phd", re.compile(r"\b(ph\.?d|doctorate|doctoral)\b", re.IGNORECASE)),
    ("master", re.compile(r"\b(master'?s?|m\.?sc|m\.?s\.? degree|mba)\b", re.IGNORECASE)),
    (
        "bachelor",
        re.compile(
            r"\b(bachelor'?s?|b\.?sc|b\.?s\.? degree|undergraduate degree|b\.?tech|"
            r"bs/ms|bs or ms|degree in computer science|cs degree)\b",
            re.IGNORECASE,
        ),
    ),
    ("associate", re.compile(r"\b(associate'?s? degree|diploma)\b", re.IGNORECASE)),
)
EQUIVALENT_RE = re.compile(
    r"\b(or equivalent|equivalent (practical |work )?experience|or related experience)\b", re.IGNORECASE
)


@dataclass
class JobAnalysis:
    required_skills: list[str]
    preferred_skills: list[str]
    parsed: JobParsed


def _heading(line: str) -> str | None:
    cleaned = re.sub(r"[#*_:]", "", line).strip().lower()
    cleaned = re.sub(r"\s+", " ", cleaned.replace("’", "'"))
    if not cleaned or len(cleaned.split()) > 8 or len(line) > 70:
        return None
    if cleaned in _LOOKUP:
        return _LOOKUP[cleaned]
    if line.rstrip().endswith(":"):
        for alias, section in _LOOKUP.items():
            if cleaned.startswith(alias):
                return section
    return None


def _sections(text: str) -> dict[str, list[str]]:
    sections: dict[str, list[str]] = {"intro": []}
    current = "intro"
    for raw in text.split("\n"):
        line = raw.strip()
        if not line:
            continue
        if section := _heading(line):
            current = section
            sections.setdefault(current, [])
            continue
        sections[current].append(line)
    return sections


def _min_years(lines: list[str]) -> float | None:
    for line in lines:
        if "experience" not in line.lower() and "years" not in line.lower():
            continue
        if m := YEARS_RE.search(line):
            years = float(m.group(1))
            if 0 < years <= 25:
                return years
    return None


def _education(text: str) -> tuple[str | None, bool]:
    for level, pattern in EDUCATION_LEVELS:
        if pattern.search(text):
            # The lowest level mentioned is the requirement ("Bachelor's required, Master's preferred").
            lowest = level
            for lower_level, lower_pattern in EDUCATION_LEVELS[EDUCATION_LEVELS.index((level, pattern)) + 1 :]:
                if lower_pattern.search(text):
                    lowest = lower_level
            return lowest, bool(EQUIVALENT_RE.search(text))
    return None, False


def extract_keywords(text: str, limit: int = 25) -> list[str]:
    """Most frequent meaningful terms plus every taxonomy skill, used for keyword coverage."""
    skills = [s.canonical for s in find_skills(text)]
    counts = Counter(
        t
        for t in content_tokens(text)
        if t not in STOPWORDS and t not in GENERIC_JOB_WORDS and len(t) > 3 and not t.isdigit()
    )
    skill_lower = {s.lower() for s in skills}
    terms = [t for t, c in counts.most_common(limit * 2) if c >= 2 and t not in skill_lower]
    keywords = list(dict.fromkeys(skills + terms))
    return keywords[:limit]


def analyze_job_description(description: str) -> JobAnalysis:
    text = normalize_text(description)
    sections = _sections(text)
    responsibilities_lines = sections.get("responsibilities", [])
    required_lines = sections.get("required", [])
    preferred_lines = sections.get("preferred", [])

    # Lines inside the requirements section that say "a plus"/"preferred" are preferred, not required.
    marked_preferred = [line for line in required_lines + sections["intro"] if PREFERRED_MARKER.search(line)]
    required_lines = [line for line in required_lines if line not in marked_preferred]
    preferred_lines = preferred_lines + marked_preferred

    preferred_skills = [s.canonical for s in find_skills("\n".join(preferred_lines))]
    if required_lines:
        required_skills = [s.canonical for s in find_skills("\n".join(required_lines + responsibilities_lines))]
    else:
        # No explicit requirements section: treat every skill mentioned outside preferred lines as required.
        non_preferred = [line for lines in sections.values() for line in lines if line not in preferred_lines]
        required_skills = [s.canonical for s in find_skills("\n".join(non_preferred))]
    preferred_skills = [s for s in preferred_skills if s not in required_skills]

    all_skills = find_skills(text)
    certifications = [s.canonical for s in all_skills if s.category == "certification"]
    required_skills = [s for s in required_skills if s not in certifications]
    preferred_skills = [s for s in preferred_skills if s not in certifications]

    responsibilities = [strip_bullet(line) for line in responsibilities_lines if len(line.split()) >= 4]
    if not responsibilities:
        responsibilities = [
            strip_bullet(line) for line in sections["intro"] if is_bullet(line) and len(line.split()) >= 4
        ]

    education_text = "\n".join(required_lines or [line for lines in sections.values() for line in lines])
    education_level, equivalent = _education(education_text)

    parsed = JobParsed(
        responsibilities=responsibilities[:25],
        required_qualifications=[strip_bullet(line) for line in required_lines][:30],
        preferred_qualifications=[strip_bullet(line) for line in preferred_lines][:30],
        min_years_experience=_min_years(required_lines or text.split("\n")),
        education_level=education_level,
        education_equivalent_accepted=equivalent,
        certifications=certifications,
        keywords=extract_keywords(text),
    )
    return JobAnalysis(required_skills=required_skills[:80], preferred_skills=preferred_skills[:80], parsed=parsed)
