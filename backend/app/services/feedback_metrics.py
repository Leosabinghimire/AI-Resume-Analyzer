"""Locally computed resume quality measurements. These are facts about the text, not AI opinions."""

import re

from app.schemas.feedback import BulletIssue, ResumeMetrics
from app.schemas.resume_data import ResumeData

ACTION_VERBS = frozenset(
    """
accelerated achieved administered analyzed architected automated built championed coached collaborated
configured consolidated created cut debugged decreased defined delivered deployed designed developed devised
directed drove eliminated enabled engineered established evaluated executed expanded facilitated founded
generated grew guided identified implemented improved increased initiated integrated introduced launched led
maintained managed mentored migrated modernized monitored negotiated optimized orchestrated organized owned
partnered pioneered planned presented prioritized produced programmed proposed prototyped published raised
redesigned reduced refactored resolved restructured revamped saved scaled secured shipped simplified solved
spearheaded standardized streamlined strengthened supervised supported tested trained transformed troubleshot
upgraded wrote coordinated documented researched contributed handled operated assisted
""".split()
)

VAGUE_PHRASES = (
    "responsible for",
    "worked on",
    "helped with",
    "helped to",
    "assisted with",
    "involved in",
    "duties included",
    "tasked with",
    "participated in",
    "various",
    "etc",
    "stuff",
    "things",
)
FIRST_PERSON = re.compile(r"\b(i|me|my|myself)\b", re.IGNORECASE)
HAS_NUMBER = re.compile(r"\d")
LONG_BULLET_WORDS = 35
SHORT_BULLET_WORDS = 5


def bullet_issues(bullet: str) -> list[str]:
    issues: list[str] = []
    words = bullet.split()
    lower = bullet.lower()
    first = re.sub(r"[^a-z]", "", words[0].lower()) if words else ""
    if first not in ACTION_VERBS:
        issues.append("Does not start with a strong action verb")
    if any(p in lower for p in VAGUE_PHRASES):
        issues.append("Uses vague wording")
    if not HAS_NUMBER.search(bullet):
        issues.append("No measurable result or scope")
    if len(words) > LONG_BULLET_WORDS:
        issues.append("Too long; consider splitting or tightening")
    if len(words) < SHORT_BULLET_WORDS:
        issues.append("Too short to show impact")
    if FIRST_PERSON.search(bullet):
        issues.append("Uses first-person pronouns")
    return issues


def compute_metrics(data: ResumeData) -> ResumeMetrics:
    bullets = data.all_bullets()
    text = data.to_text(include_contact=False)
    flagged: list[BulletIssue] = []
    action = quantified = vague = long_b = short_b = 0
    for bullet in bullets:
        issues = bullet_issues(bullet)
        action += "Does not start with a strong action verb" not in issues
        quantified += "No measurable result or scope" not in issues
        vague += "Uses vague wording" in issues
        long_b += any(i.startswith("Too long") for i in issues)
        short_b += any(i.startswith("Too short") for i in issues)
        # A missing number alone is common and not always fixable, so only flag bullets with other problems.
        if [i for i in issues if i != "No measurable result or scope"]:
            flagged.append(BulletIssue(bullet=bullet, issues=issues))
    missing = [
        label
        for label, present in (
            ("Professional summary", bool(data.summary)),
            ("Skills", bool(data.skills)),
            ("Work experience", bool(data.experience)),
            ("Education", bool(data.education)),
        )
        if not present
    ]
    count = len(bullets) or 1
    return ResumeMetrics(
        word_count=len(text.split()),
        bullet_count=len(bullets),
        quantified_bullet_ratio=round(quantified / count, 3) if bullets else 0,
        action_verb_ratio=round(action / count, 3) if bullets else 0,
        avg_bullet_words=round(sum(len(b.split()) for b in bullets) / count, 1) if bullets else 0,
        long_bullets=long_b,
        short_bullets=short_b,
        vague_phrase_count=vague,
        first_person_count=len(FIRST_PERSON.findall(text)),
        missing_sections=missing,
        summary_word_count=len(data.summary.split()),
        skills_count=len(data.skills),
        flagged_bullets=flagged[:20],
    )
