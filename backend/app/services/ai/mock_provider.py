"""Rule-based stand-in for an LLM, used when no AI provider is configured and in automated tests.

Output is generated from templates and the deterministic analysis, so it is grounded but generic.
Every response is labeled is_mock=True and the UI shows it as demo output, never as real AI analysis.
"""

import re

from app.schemas.ai import (
    ChecklistItem,
    GrammarSuggestion,
    InterviewPrepAI,
    InterviewQuestion,
    KeywordRecommendation,
    MatchInsights,
    ResumeFeedbackAI,
    StudyTopic,
    SummarySuggestion,
    TransferableSkill,
    WeakBullet,
)
from app.services.ai.base import AIProvider, FeedbackContext, InterviewContext, MatchInsightsContext
from app.services.feedback_metrics import bullet_issues
from app.services.parsing.skills_taxonomy import SKILLS, category_of

VAGUE_OPENERS = (
    (re.compile(r"^(was |am )?responsible for\s+", re.I), ""),
    (re.compile(r"^worked on\s+", re.I), "Developed "),
    (re.compile(r"^(helped|assisted)( with| to| in)?\s+", re.I), "Contributed to "),
    (re.compile(r"^(was )?involved in\s+", re.I), "Contributed to "),
    (re.compile(r"^participated in\s+", re.I), "Took part in "),
    (re.compile(r"^tasked with\s+", re.I), ""),
)
IRREGULAR_PAST = {
    "building": "Built",
    "writing": "Wrote",
    "leading": "Led",
    "running": "Ran",
    "making": "Made",
    "teaching": "Taught",
    "setting": "Set",
    "keeping": "Kept",
    "doing": "Did",
}
COMMON_FIXES = (
    (re.compile(r"\butilized\b", re.I), "used", '"Used" is clearer than "utilized".'),
    (re.compile(r"\s{2,}"), " ", "Remove repeated spaces."),
    (re.compile(r"\bteh\b", re.I), "the", "Spelling."),
)


def _lower_first(text: str) -> str:
    return text[:1].lower() + text[1:]


def _gerund_to_past(word: str) -> str:
    lower = word.lower()
    if lower in IRREGULAR_PAST:
        return IRREGULAR_PAST[lower]
    if lower.endswith("ing") and len(lower) > 5:
        stem = lower[:-3]
        if stem.endswith(("at", "iz", "us", "uc", "ag", "ov")):
            stem += "e"
        return (stem + ("d" if stem.endswith("e") else "ed")).capitalize()
    return word.capitalize()


def rewrite_bullet(bullet: str) -> tuple[str, bool]:
    """Return (suggestion, requires_verification). Keeps the original facts; never adds numbers."""
    text = bullet.strip().rstrip(".")
    for pattern, replacement in VAGUE_OPENERS:
        if pattern.match(text):
            text = pattern.sub(replacement, text, count=1)
            if replacement == "":
                first, _, rest = text.partition(" ")
                # "Responsible for building X" -> "Built X"; "Responsible for code reviews" -> "Owned code reviews"
                is_gerund = first.lower().endswith("ing") and len(first) > 5
                text = f"{_gerund_to_past(first)} {rest}".strip() if is_gerund else f"Owned {text}"
            break
    text = text[:1].upper() + text[1:]
    if not re.search(r"\d", text):
        return f"{text}, resulting in [add a measurable outcome you can verify]", True
    return text, False


class MockAIProvider(AIProvider):
    name = "mock"
    model = "rule-based-demo"
    is_mock = True

    def match_insights(self, ctx: MatchInsightsContext) -> MatchInsights:
        match = ctx.match
        strengths = [f"Evidence for {m.skill} in {m.evidence[0].lower()}" for m in match.matched_skills[:5]]
        if (
            match.experience.candidate_years
            and match.experience.required_years
            and match.experience.candidate_years >= match.experience.required_years
        ):
            strengths.append(f"Experience length ({match.experience.candidate_years:g} years) meets the requirement")
        gaps = [f"No evidence of {s} (required)" for s in match.missing_required_skills[:5]]
        gaps += [
            f"Responsibility not clearly covered: {a.responsibility[:120]}"
            for a in match.responsibility_alignment
            if not a.aligned
        ][:3]

        transferable: list[TransferableSkill] = []
        resume_skills = {m.skill for m in match.matched_skills} | set(ctx.resume.skills)
        for missing in match.missing_required_skills + match.missing_preferred_skills:
            category = category_of(missing)
            related = [s for s in resume_skills if s in SKILLS and category_of(s) == category and s != missing]
            if related and category not in ("soft", "other"):
                transferable.append(
                    TransferableSkill(
                        missing_skill=missing,
                        related_evidence=related[0],
                        explanation=f"{related[0]} is in the same category ({category}); describe how that experience "
                        f"would carry over to {missing}.",
                    )
                )
        recommendations = [a.detail for a in match.improvement_areas[:4]]
        return MatchInsights(
            summary=(
                f"Rule-based summary: {len(match.matched_skills)} relevant skills were matched and "
                f"{len(match.missing_required_skills)} required skills were not found. "
                "Configure an AI provider for a semantic interpretation."
            ),
            strengths=strengths[:8],
            gaps=gaps[:8],
            transferable_skills=transferable[:5],
            recommendations=recommendations,
        )

    def resume_feedback(self, ctx: FeedbackContext) -> ResumeFeedbackAI:
        m = ctx.metrics
        resume = ctx.resume
        structure: list[str] = []
        if m.missing_sections:
            structure.append(f"Add the missing sections: {', '.join(m.missing_sections)}.")
        if m.bullet_count < 6:
            structure.append("Describe each role with 3–5 bullet points so reviewers can see your impact.")
        if len(resume.skills) > 40:
            structure.append("Your skills list is long; group it by category and keep the most relevant items.")
        if not structure:
            structure.append("The resume has the standard sections in a scannable order.")

        readability = [f"Average bullet length is {m.avg_bullet_words:g} words (aim for roughly 12–25)."]
        if m.quantified_bullet_ratio < 0.5:
            readability.append(
                f"Only {round(m.quantified_bullet_ratio * 100)}% of bullets include numbers. Add "
                "real metrics such as scale, frequency or results where you know them."
            )
        if m.first_person_count:
            readability.append("Remove first-person pronouns (I, my) from bullets and the summary.")
        if m.vague_phrase_count:
            readability.append(f'{m.vague_phrase_count} bullets use vague phrases such as "responsible for".')

        weak: list[WeakBullet] = []
        for bullet in resume.all_bullets():
            issues = bullet_issues(bullet)
            meaningful = [i for i in issues if i != "No measurable result or scope"]
            if not meaningful:
                continue
            suggestion, verify = rewrite_bullet(bullet)
            weak.append(WeakBullet(original=bullet, issues=issues, suggestion=suggestion, requires_verification=verify))
            if len(weak) == 10:
                break

        keywords: list[KeywordRecommendation] = []
        if ctx.match:
            for skill in ctx.match.missing_required_skills[:8]:
                keywords.append(
                    KeywordRecommendation(
                        keyword=skill,
                        reason="Required by the target job and not found in your resume. Add it only "
                        "if you have genuine experience with it.",
                    )
                )

        summary = None
        top_skills = ", ".join(resume.skills[:5])
        latest = resume.experience[0] if resume.experience else None
        if latest and top_skills:
            role = latest.title or "Professional"
            summary = SummarySuggestion(
                suggested_summary=(
                    f"{role} with hands-on experience in {top_skills}. "
                    "[Add your years of experience and one verified achievement.]"
                ),
                rationale="Built only from your current title and listed skills; complete the bracketed parts.",
                requires_verification=True,
            )

        grammar: list[GrammarSuggestion] = []
        for text in [resume.summary, *resume.all_bullets()]:
            for pattern, repl, why in COMMON_FIXES:
                if text and pattern.search(text):
                    grammar.append(
                        GrammarSuggestion(original=text, suggestion=pattern.sub(repl, text), explanation=why)
                    )
        checklist = [ChecklistItem(item=f'Rewrite: "{w.original[:80]}"', priority="high") for w in weak[:3]]
        if m.quantified_bullet_ratio < 0.5:
            checklist.append(
                ChecklistItem(item="Add verified numbers to at least half of your bullets", priority="medium")
            )
        if not resume.summary:
            checklist.append(ChecklistItem(item="Write a 2–3 sentence professional summary", priority="medium"))
        for section in m.missing_sections:
            checklist.append(ChecklistItem(item=f"Add a {section} section", priority="high"))
        checklist += [
            ChecklistItem(item=f"Add {k.keyword} if you have real experience with it", priority="low")
            for k in keywords[:3]
        ]

        verbs_ok = round(m.action_verb_ratio * 100)
        return ResumeFeedbackAI(
            overall_summary=(
                f"Rule-based review: {m.bullet_count} bullets analyzed, {verbs_ok}% start with an "
                f"action verb and {len(weak)} could be stronger. Configure an AI provider for "
                "nuanced, context-aware feedback."
            ),
            structure_feedback=structure,
            readability_feedback=readability,
            weak_bullets=weak,
            keyword_recommendations=keywords,
            summary_suggestion=summary,
            grammar_suggestions=grammar[:10],
            checklist=checklist[:12],
        )

    def interview_prep(self, ctx: InterviewContext) -> InterviewPrepAI:
        match = ctx.match
        evidence = {m.skill: m.evidence[0] for m in match.matched_skills}
        technical: list[InterviewQuestion] = []
        for skill in ctx.job.required_skills[:8]:
            if skill in evidence:
                technical.append(
                    InterviewQuestion(
                        question=f"Walk me through a technical decision you made while working with {skill}.",
                        why_asked=f"{skill} is a core requirement for this role.",
                        answer_outline=[
                            "Context: the project and its constraints",
                            f"What you built with {skill}",
                            "Trade-offs you considered",
                            "The outcome and what you would change",
                        ],
                        resume_evidence=evidence[skill],
                    )
                )
            else:
                technical.append(
                    InterviewQuestion(
                        question=f"How would you get productive with {skill} in your first weeks?",
                        why_asked=f"{skill} is required but not shown in your resume.",
                        answer_outline=[
                            "Be honest about your current level",
                            "Relate it to tools you know well",
                            "Describe a concrete learning plan",
                        ],
                        resume_evidence=None,
                    )
                )
        behavioral = [
            InterviewQuestion(
                question=f"Tell me about a time you had to {_lower_first(a.responsibility).rstrip('.')}.",
                why_asked="Based on a responsibility listed in the job description.",
                answer_outline=[
                    "Situation",
                    "Task",
                    "Action you personally took",
                    "Result (use real numbers if known)",
                ],
                resume_evidence=a.best_match if a.aligned else None,
            )
            for a in match.responsibility_alignment[:4]
        ]
        behavioral.append(
            InterviewQuestion(
                question="Describe a disagreement with a teammate and how you resolved it.",
                why_asked="Common behavioral question about collaboration.",
                answer_outline=[
                    "Situation",
                    "Your perspective and theirs",
                    "How you reached agreement",
                    "What you learned",
                ],
                resume_evidence=None,
            )
        )
        project_questions: list[InterviewQuestion] = []
        for exp in ctx.resume.experience[:2]:
            if exp.bullets:
                project_questions.append(
                    InterviewQuestion(
                        question=f"As {exp.title or 'a team member'}, what was the hardest problem behind: "
                        f'"{exp.bullets[0][:150]}"?',
                        why_asked="Interviewers probe the details behind resume claims.",
                        answer_outline=["The problem", "Your specific contribution", "Technical details", "Result"],
                        resume_evidence=exp.bullets[0],
                    )
                )
        for proj in ctx.resume.projects[:2]:
            project_questions.append(
                InterviewQuestion(
                    question=f"Why did you build {proj.name}, and what would you improve?",
                    why_asked="Shows ownership and technical judgment.",
                    answer_outline=["Motivation", "Architecture and technology choices", "Challenges", "Next steps"],
                    resume_evidence=proj.name,
                )
            )
        topics = [
            StudyTopic(topic=s, reason="Required by the job and not evidenced in your resume.", priority="high")
            for s in match.missing_required_skills[:6]
        ]
        topics += [
            StudyTopic(topic=s, reason="Preferred by the job.", priority="medium")
            for s in match.missing_preferred_skills[:4]
        ]
        topics += [
            StudyTopic(
                topic=f"Deepen: {s}", reason="Core requirement you already have; expect deep questions.", priority="low"
            )
            for s in list(evidence)[:2]
        ]
        return InterviewPrepAI(
            technical_questions=technical[:10],
            behavioral_questions=behavioral[:8],
            project_questions=project_questions[:8],
            study_topics=topics[:12],
        )
