"""Post-validation of AI output against the user's actual resume.

Pydantic guarantees the shape; these checks enforce grounding: quoted resume text must exist, and any
suggestion that introduces numbers or skills absent from the resume is flagged for user verification.
"""

import re
from difflib import SequenceMatcher

from app.schemas.ai import InterviewPrepAI, MatchInsights, ResumeFeedbackAI
from app.schemas.resume_data import ResumeData
from app.services.parsing.skills_taxonomy import find_skills

_NUM = re.compile(r"\d+(?:[.,]\d+)?")
FUZZY_THRESHOLD = 0.85


def _norm(text: str) -> str:
    return re.sub(r"\s+", " ", re.sub(r"[^\w\s%+#.]", " ", text.lower())).strip()


def _best_match(quote: str, candidates: list[str]) -> str | None:
    target = _norm(quote)
    if not target:
        return None
    best, best_ratio = None, 0.0
    for candidate in candidates:
        norm = _norm(candidate)
        if target == norm or (len(target) > 20 and target in norm):
            return candidate
        ratio = SequenceMatcher(None, target, norm).ratio()
        if ratio > best_ratio:
            best, best_ratio = candidate, ratio
    return best if best_ratio >= FUZZY_THRESHOLD else None


def _appears_in(quote: str, text: str) -> bool:
    quote_tokens = set(_norm(quote).split())
    if not quote_tokens:
        return False
    return len(quote_tokens & set(_norm(text).split())) / len(quote_tokens) >= 0.7


def introduces_unverified_facts(suggestion: str, source: str, resume_skills: set[str]) -> bool:
    new_numbers = set(_NUM.findall(suggestion)) - set(_NUM.findall(source))
    new_skills = {s.canonical for s in find_skills(suggestion)} - resume_skills
    return bool(new_numbers or new_skills or "[" in suggestion)


def _resume_skills(resume: ResumeData) -> set[str]:
    return {s.canonical for s in find_skills(resume.to_text(include_contact=False))}


def ground_feedback(result: ResumeFeedbackAI, resume: ResumeData) -> ResumeFeedbackAI:
    bullets = resume.all_bullets()
    text = resume.to_text(include_contact=False)
    skills = _resume_skills(resume)
    grounded = []
    for wb in result.weak_bullets:
        actual = _best_match(wb.original, bullets)
        if actual is None:
            continue  # the model quoted something that is not in the resume
        wb.original = actual
        wb.requires_verification = wb.requires_verification or introduces_unverified_facts(
            wb.suggestion, actual, skills
        )
        grounded.append(wb)
    result.weak_bullets = grounded
    result.grammar_suggestions = [g for g in result.grammar_suggestions if _appears_in(g.original, text)]
    if result.summary_suggestion:
        s = result.summary_suggestion
        s.requires_verification = s.requires_verification or introduces_unverified_facts(
            s.suggested_summary, text, skills
        )
    return result


def ground_match_insights(result: MatchInsights, resume: ResumeData) -> MatchInsights:
    text = resume.to_text(include_contact=False)
    result.transferable_skills = [t for t in result.transferable_skills if _appears_in(t.related_evidence, text)]
    return result


def ground_interview_prep(result: InterviewPrepAI, resume: ResumeData) -> InterviewPrepAI:
    text = resume.to_text(include_contact=False)
    for q in [*result.technical_questions, *result.behavioral_questions, *result.project_questions]:
        if q.resume_evidence and not _appears_in(q.resume_evidence, text):
            q.resume_evidence = None
    return result
