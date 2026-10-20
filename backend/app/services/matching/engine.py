"""Deterministic resume-to-job matching.

Score = weighted average of the applicable components below (weights renormalized when a component
does not apply, e.g. the job states no years of experience). See docs/scoring.md for the full
formula and its limitations. This is a transparent heuristic, not an ATS score or hiring prediction.
"""

import re
from dataclasses import dataclass

from app.schemas.analysis import (
    EducationCheck,
    ExperienceCheck,
    ImprovementArea,
    KeywordCoverage,
    MatchedSkill,
    MatchResult,
    RelevantExperience,
    ResponsibilityAlignment,
    ScoreComponent,
)
from app.schemas.job import JobParsed
from app.schemas.resume_data import ResumeData
from app.services.parsing.skills_taxonomy import canonicalize, find_skills, skill_weight
from app.services.parsing.text_utils import (
    contains_phrase,
    parse_date,
    set_similarity,
    stem,
    stemmed_terms,
    total_years,
)

METHODOLOGY_VERSION = "1.0"

WEIGHTS: dict[str, float] = {
    "required_skills": 35,
    "preferred_skills": 10,
    "experience": 15,
    "responsibilities": 20,
    "education": 5,
    "keywords": 15,
}
LABELS = {
    "required_skills": "Required skills",
    "preferred_skills": "Preferred skills",
    "experience": "Years of experience",
    "responsibilities": "Responsibility alignment",
    "education": "Education & certifications",
    "keywords": "Keyword coverage",
}
# A responsibility counts as fully covered once its best bullet reaches this similarity.
FULL_CREDIT_SIMILARITY = 0.35
ALIGNED_SIMILARITY = 0.2
EDUCATION_RANK = {"associate": 1, "bachelor": 2, "master": 3, "phd": 4}
_DEGREE_PATTERNS = (
    ("phd", re.compile(r"\b(ph\.?\s?d|doctor(ate)? of)\b", re.IGNORECASE)),
    (
        "master",
        re.compile(r"\b(master|m\.?\s?sc|m\.?\s?s\b|m\.?\s?a\b|mba|m\.?\s?tech|m\.?\s?e\b|mca|meng)", re.IGNORECASE),
    ),
    (
        "bachelor",
        re.compile(
            r"\b(bachelor|b\.?\s?sc|b\.?\s?s\b|b\.?\s?a\b|b\.?\s?tech|b\.?\s?e\b|bca|bba|beng|"
            r"undergraduate)",
            re.IGNORECASE,
        ),
    ),
    ("associate", re.compile(r"\b(associate|diploma|foundation degree)", re.IGNORECASE)),
)


@dataclass
class JobRequirements:
    required_skills: list[str]
    preferred_skills: list[str]
    parsed: JobParsed


@dataclass
class _ResumeIndex:
    text_lower: str
    skills: set[str]
    evidence: dict[str, list[str]]
    units: list[tuple[str, set[str]]]  # (bullet/summary text, terms)
    stems: set[str]


def degree_level(text: str) -> str | None:
    for level, pattern in _DEGREE_PATTERNS:
        if pattern.search(text):
            return level
    return None


def candidate_years(data: ResumeData) -> float | None:
    ranges = []
    for item in data.experience:
        start = parse_date(item.start_date) if item.start_date else None
        end = parse_date(item.end_date) if item.end_date else None
        if start and end:
            ranges.append((start, end))
    return total_years(ranges) if ranges else None


def _terms_with_skills(text: str) -> set[str]:
    return stemmed_terms(text) | {f"skill:{s.canonical.lower()}" for s in find_skills(text)}


def _index_resume(data: ResumeData) -> _ResumeIndex:
    evidence: dict[str, list[str]] = {}

    def add(skills: list[str], where: str) -> None:
        for skill in skills:
            places = evidence.setdefault(skill, [])
            if where not in places and len(places) < 4:
                places.append(where)

    add([canonicalize(s) for s in data.skills], "Skills section")
    if data.summary:
        add([s.canonical for s in find_skills(data.summary)], "Professional summary")
    for exp in data.experience:
        where = "Experience: " + " at ".join(x for x in (exp.title, exp.company) if x)
        add([s.canonical for s in find_skills(" ".join([exp.title, *exp.bullets]))], where)
    for proj in data.projects:
        add(
            [canonicalize(t) for t in proj.technologies]
            + [s.canonical for s in find_skills(" ".join([proj.name, *proj.bullets]))],
            f"Project: {proj.name}",
        )
    for cert in data.certifications:
        add([s.canonical for s in find_skills(cert.name)] or [cert.name], "Certifications")

    units = [(b, _terms_with_skills(b)) for b in data.all_bullets()]
    if data.summary:
        units.append((data.summary, _terms_with_skills(data.summary)))
    text_lower = data.to_text(include_contact=False).lower()
    return _ResumeIndex(
        text_lower=text_lower, skills=set(evidence), evidence=evidence, units=units, stems=stemmed_terms(text_lower)
    )


def _has_skill(index: _ResumeIndex, skill: str) -> bool:
    return skill in index.skills or contains_phrase(index.text_lower, skill)


def _skill_component(
    skills: list[str], index: _ResumeIndex, requirement: str
) -> tuple[float | None, list[MatchedSkill], list[str]]:
    if not skills:
        return None, [], []
    matched: list[MatchedSkill] = []
    missing: list[str] = []
    earned = total = 0.0
    for skill in skills:
        weight = skill_weight(skill)
        total += weight
        if _has_skill(index, skill):
            earned += weight
            matched.append(
                MatchedSkill(
                    skill=skill,
                    requirement=requirement,
                    evidence=index.evidence.get(skill, ["Mentioned in resume text"]),
                )
            )
        else:
            missing.append(skill)
    return round(100 * earned / total, 1), matched, missing


def _responsibilities(
    responsibilities: list[str], index: _ResumeIndex
) -> tuple[float | None, list[ResponsibilityAlignment]]:
    if not responsibilities:
        return None, []
    rows: list[ResponsibilityAlignment] = []
    credit = 0.0
    for resp in responsibilities:
        terms = _terms_with_skills(resp)
        best_text, best = None, 0.0
        for text, unit_terms in index.units:
            sim = set_similarity(terms, unit_terms)
            if sim > best:
                best_text, best = text, sim
        credit += min(1.0, best / FULL_CREDIT_SIMILARITY)
        rows.append(
            ResponsibilityAlignment(
                responsibility=resp,
                best_match=best_text if best > 0 else None,
                similarity=round(best, 3),
                aligned=best >= ALIGNED_SIMILARITY,
            )
        )
    return round(100 * credit / len(responsibilities), 1), rows


def _relevant_experience(data: ResumeData, job_terms: set[str], job_skills: list[str]) -> list[RelevantExperience]:
    results: list[RelevantExperience] = []
    for exp in data.experience:
        text = " ".join([exp.title, *exp.bullets])
        entry_skills = {s.canonical for s in find_skills(text)}
        matched_skills = [s for s in job_skills if s in entry_skills]
        relevance = set_similarity(_terms_with_skills(text), job_terms)
        if not matched_skills and relevance < 0.05:
            continue
        reason = (
            f"Uses {', '.join(matched_skills[:6])} which the job asks for."
            if matched_skills
            else "Shares relevant terminology with the job's responsibilities."
        )
        results.append(
            RelevantExperience(
                title=exp.title or "Untitled role",
                company=exp.company,
                relevance=round(relevance, 3),
                matched_terms=matched_skills,
                reason=reason,
            )
        )
    return sorted(results, key=lambda r: (len(r.matched_terms), r.relevance), reverse=True)[:6]


def _experience(required: float | None, data: ResumeData) -> tuple[float | None, ExperienceCheck]:
    years = candidate_years(data)
    if required is None:
        return None, ExperienceCheck(
            required_years=None, candidate_years=years, explanation="The job does not state a minimum number of years."
        )
    if years is None:
        return 0.0, ExperienceCheck(
            required_years=required,
            candidate_years=None,
            explanation=f"The job asks for {required:g}+ years, but no dated experience entries were found. "
            "Add start and end dates to your roles so experience can be measured.",
        )
    score = min(100.0, 100 * years / required)
    verdict = "meets" if years >= required else "is below"
    return round(score, 1), ExperienceCheck(
        required_years=required,
        candidate_years=years,
        explanation=f"About {years:g} years of dated experience {verdict} the {required:g}+ years requested. "
        "Overlapping roles are counted once.",
    )


def _education(parsed: JobParsed, data: ResumeData, index: _ResumeIndex) -> tuple[float | None, EducationCheck]:
    levels = [lvl for ed in data.education if (lvl := degree_level(f"{ed.degree} {ed.field_of_study}"))]
    candidate = max(levels, key=lambda lvl: EDUCATION_RANK[lvl]) if levels else None
    scores: list[float] = []
    notes: list[str] = []
    if parsed.education_level:
        required_rank = EDUCATION_RANK[parsed.education_level]
        candidate_rank = EDUCATION_RANK.get(candidate or "", 0)
        if candidate_rank >= required_rank:
            scores.append(100.0)
            notes.append(f"Your {candidate} degree meets the {parsed.education_level} level mentioned.")
        elif parsed.education_equivalent_accepted:
            scores.append(70.0)
            notes.append(f"The job mentions a {parsed.education_level} degree but accepts equivalent experience.")
        else:
            scores.append(100 * candidate_rank / required_rank * 0.6)
            notes.append(
                f"The job mentions a {parsed.education_level} degree; "
                f"{'your highest detected level is ' + candidate if candidate else 'no degree was detected'}."
            )
    matched_certs = [c for c in parsed.certifications if _has_skill(index, c)]
    missing_certs = [c for c in parsed.certifications if c not in matched_certs]
    if parsed.certifications:
        scores.append(100 * len(matched_certs) / len(parsed.certifications))
        notes.append(f"{len(matched_certs)} of {len(parsed.certifications)} mentioned certifications found.")
    check = EducationCheck(
        required_level=parsed.education_level,
        candidate_level=candidate,
        equivalent_experience_accepted=parsed.education_equivalent_accepted,
        matched_certifications=matched_certs,
        missing_certifications=missing_certs,
        explanation=" ".join(notes) or "The job does not mention degree or certification requirements.",
    )
    return (round(sum(scores) / len(scores), 1) if scores else None), check


def _keywords(keywords: list[str], index: _ResumeIndex) -> tuple[float | None, KeywordCoverage]:
    if not keywords:
        return None, KeywordCoverage(matched=[], missing=[], coverage=0)
    matched = [
        k
        for k in keywords
        if _has_skill(index, canonicalize(k))
        or contains_phrase(index.text_lower, k)
        or (" " not in k and stem(k) in index.stems)
    ]
    missing = [k for k in keywords if k not in matched]
    coverage = len(matched) / len(keywords)
    return round(100 * coverage, 1), KeywordCoverage(matched=matched, missing=missing, coverage=round(coverage, 3))


def _improvements(
    missing_required: list[str],
    missing_preferred: list[str],
    experience: ExperienceCheck,
    alignment: list[ResponsibilityAlignment],
    keywords: KeywordCoverage,
    data: ResumeData,
    education: EducationCheck,
) -> list[ImprovementArea]:
    areas: list[ImprovementArea] = []
    if missing_required:
        areas.append(
            ImprovementArea(
                area="Missing required skills",
                priority="high",
                detail=f"The job lists {', '.join(missing_required[:8])} as required, but they were not found in your "
                "resume. If you have this experience, describe where you used it; if not, consider it a "
                "learning goal rather than adding it.",
            )
        )
    unaligned = [a.responsibility for a in alignment if not a.aligned]
    if unaligned:
        areas.append(
            ImprovementArea(
                area="Responsibilities without matching evidence",
                priority="high" if len(unaligned) > 2 else "medium",
                detail=f"{len(unaligned)} of {len(alignment)} responsibilities have no closely related bullet, e.g. "
                f'"{unaligned[0][:140]}". Add bullets that show comparable work you have actually done.',
            )
        )
    if experience.required_years and (experience.candidate_years or 0) < experience.required_years:
        areas.append(
            ImprovementArea(
                area="Experience level",
                priority="medium",
                detail=experience.explanation + " Emphasize scope and impact of the experience you do have.",
            )
        )
    if missing_preferred:
        areas.append(
            ImprovementArea(
                area="Preferred skills",
                priority="low",
                detail=f"Preferred but not found: {', '.join(missing_preferred[:8])}.",
            )
        )
    if keywords.missing and keywords.coverage < 0.6:
        areas.append(
            ImprovementArea(
                area="Keyword coverage",
                priority="medium",
                detail=f"Terms from the posting that do not appear in your resume: {', '.join(keywords.missing[:10])}. "
                "Use the posting's wording where it truthfully describes your experience.",
            )
        )
    if education.missing_certifications:
        areas.append(
            ImprovementArea(
                area="Certifications",
                priority="low",
                detail=f"Mentioned in the posting: {', '.join(education.missing_certifications)}.",
            )
        )
    if not data.summary:
        areas.append(
            ImprovementArea(
                area="Professional summary",
                priority="low",
                detail="Add a 2–3 sentence summary that reflects this role's focus.",
            )
        )
    return areas


def match_resume_to_job(data: ResumeData, job: JobRequirements) -> MatchResult:
    index = _index_resume(data)
    req_score, req_matched, req_missing = _skill_component(job.required_skills, index, "required")
    pref_score, pref_matched, pref_missing = _skill_component(job.preferred_skills, index, "preferred")
    resp_score, alignment = _responsibilities(job.parsed.responsibilities, index)
    exp_score, experience = _experience(job.parsed.min_years_experience, data)
    edu_score, education = _education(job.parsed, data, index)
    kw_score, keywords = _keywords(job.parsed.keywords, index)

    scores: dict[str, float | None] = {
        "required_skills": req_score,
        "preferred_skills": pref_score,
        "experience": exp_score,
        "responsibilities": resp_score,
        "education": edu_score,
        "keywords": kw_score,
    }
    explanations = {
        "required_skills": (
            f"{len(req_matched)} of {len(job.required_skills)} required skills found."
            if job.required_skills
            else "No required skills were identified in the job."
        ),
        "preferred_skills": (
            f"{len(pref_matched)} of {len(job.preferred_skills)} preferred skills found."
            if job.preferred_skills
            else "No preferred skills were identified."
        ),
        "experience": experience.explanation,
        "responsibilities": (
            f"{sum(a.aligned for a in alignment)} of {len(alignment)} responsibilities have a "
            "closely related bullet in your resume."
            if alignment
            else "No responsibilities section was identified in the job."
        ),
        "education": education.explanation,
        "keywords": (
            f"{len(keywords.matched)} of {len(job.parsed.keywords)} key terms appear in your resume."
            if job.parsed.keywords
            else "No keywords extracted."
        ),
    }
    components = [
        ScoreComponent(
            key=key,
            label=LABELS[key],
            weight=WEIGHTS[key],
            score=scores[key],
            applicable=scores[key] is not None,
            explanation=explanations[key],
        )
        for key in WEIGHTS
    ]
    applicable = [c for c in components if c.score is not None]
    total_weight = sum(c.weight for c in applicable)
    overall = round(sum(c.weight * (c.score or 0) for c in applicable) / total_weight) if total_weight else 0

    job_terms = (
        set().union(*(_terms_with_skills(r) for r in job.parsed.responsibilities))
        if job.parsed.responsibilities
        else _terms_with_skills(" ".join(job.parsed.keywords))
    )
    return MatchResult(
        methodology_version=METHODOLOGY_VERSION,
        overall_score=max(0, min(100, overall)),
        components=components,
        matched_skills=req_matched + pref_matched,
        missing_required_skills=req_missing,
        missing_preferred_skills=pref_missing,
        relevant_experience=_relevant_experience(data, job_terms, job.required_skills + job.preferred_skills),
        responsibility_alignment=alignment,
        experience=experience,
        education=education,
        keyword_coverage=keywords,
        improvement_areas=_improvements(req_missing, pref_missing, experience, alignment, keywords, data, education),
    )
