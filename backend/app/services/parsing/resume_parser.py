"""Heuristic, deterministic resume parser.

Resumes have no standard layout, so this parser aims for a good first draft that users review and
correct in the editor. It runs fully locally: no resume content is sent anywhere during parsing.
"""

import re
from dataclasses import dataclass, field

from app.schemas.resume_data import (
    CertificationItem,
    ContactInfo,
    EducationItem,
    ExperienceItem,
    ProjectItem,
    ResumeData,
)
from app.services.parsing.skills_taxonomy import find_skills
from app.services.parsing.text_utils import (
    DATE_RANGE_RE,
    EMAIL_RE,
    PHONE_RE,
    URL_RE,
    is_bullet,
    strip_bullet,
)

SECTION_ALIASES: dict[str, tuple[str, ...]] = {
    "summary": (
        "summary",
        "professional summary",
        "profile",
        "professional profile",
        "about me",
        "about",
        "objective",
        "career objective",
        "career summary",
        "personal statement",
    ),
    "skills": (
        "skills",
        "technical skills",
        "core skills",
        "key skills",
        "core competencies",
        "competencies",
        "technologies",
        "tech stack",
        "tools and technologies",
        "skills and tools",
        "expertise",
    ),
    "experience": (
        "experience",
        "work experience",
        "professional experience",
        "employment history",
        "employment",
        "work history",
        "career history",
        "relevant experience",
        "internships",
    ),
    "education": (
        "education",
        "academic background",
        "education and training",
        "academic qualifications",
        "qualifications",
    ),
    "projects": (
        "projects",
        "personal projects",
        "selected projects",
        "key projects",
        "academic projects",
        "side projects",
        "portfolio",
    ),
    "certifications": (
        "certifications",
        "certificates",
        "licenses and certifications",
        "certifications and licenses",
        "courses",
        "training",
        "licenses",
    ),
    "other": (
        "languages",
        "interests",
        "hobbies",
        "awards",
        "achievements",
        "honors",
        "volunteering",
        "volunteer experience",
        "publications",
        "references",
        "activities",
        "additional information",
    ),
}
_HEADING_LOOKUP = {alias: section for section, aliases in SECTION_ALIASES.items() for alias in aliases}

TITLE_WORDS = re.compile(
    r"\b(engineer|developer|manager|analyst|intern|designer|lead|consultant|specialist|architect|scientist|"
    r"administrator|officer|assistant|coordinator|director|programmer|technician|associate|head|founder|"
    r"freelancer|contractor|researcher|tester|devops|sre|teacher|instructor)\b",
    re.IGNORECASE,
)
DEGREE_RE = re.compile(
    r"\b(bachelor(?:'s)?|master(?:'s)?|ph\.?d|doctorate|mba|associate(?:'s)? degree|diploma|b\.?\s?sc|m\.?\s?sc|"
    r"b\.?\s?s\.?|m\.?\s?s\.?|b\.?\s?a\.?|m\.?\s?a\.?|b\.?\s?tech|m\.?\s?tech|b\.?\s?e\.?|m\.?\s?e\.?|bca|mca|bba|"
    r"high school|a-levels?)(?=\W|$)",
    re.IGNORECASE,
)
INSTITUTION_RE = re.compile(r"\b(university|college|institute|school|academy|polytechnic|campus)\b", re.IGNORECASE)
SEPARATOR_RE = re.compile(r"\s+(?:\||—|–|-|@|at)\s+|,\s+")


@dataclass
class ParseOutcome:
    data: ResumeData
    warnings: list[str] = field(default_factory=list)


def _heading_section(line: str) -> str | None:
    cleaned = re.sub(r"[^a-z& ]", "", line.lower().replace("&", " and ")).strip()
    cleaned = re.sub(r"\s+", " ", cleaned)
    if not cleaned or len(cleaned.split()) > 5 or len(line) > 50:
        return None
    return _HEADING_LOOKUP.get(cleaned)


def split_sections(text: str) -> tuple[list[str], dict[str, list[str]]]:
    header: list[str] = []
    sections: dict[str, list[str]] = {}
    current: str | None = None
    for raw in text.split("\n"):
        line = raw.strip()
        if not line:
            continue
        section = _heading_section(line)
        if section:
            current = section
            sections.setdefault(section, [])
            continue
        if current is None:
            header.append(line)
        else:
            sections[current].append(line)
    return header, sections


def _parse_contact(header: list[str], full_text: str) -> ContactInfo:
    contact = ContactInfo()
    search_zone = "\n".join(header) or full_text[:1500]
    if m := EMAIL_RE.search(search_zone) or EMAIL_RE.search(full_text):
        contact.email = m.group(0)
    phone_zone = EMAIL_RE.sub(" ", search_zone)
    for m in PHONE_RE.finditer(phone_zone):
        if sum(c.isdigit() for c in m.group(0)) >= 7 and not DATE_RANGE_RE.search(m.group(0)):
            contact.phone = m.group(0).strip()
            break
    contact.links = list(dict.fromkeys(u.rstrip(".") for u in URL_RE.findall(search_zone)))[:10]
    for line in header[:5]:
        candidate = URL_RE.sub("", EMAIL_RE.sub("", line)).strip(" |,•")
        words = candidate.split()
        if (
            2 <= len(words) <= 4
            and not any(c.isdigit() for c in candidate)
            and all(w[0].isupper() for w in words)
            and not TITLE_WORDS.search(candidate)
        ):
            contact.name = candidate[:200]
            break
    for line in header[:8]:
        for part in re.split(r"\s*[|•·]\s*", line):
            part = part.strip()
            if (
                re.fullmatch(r"[A-Z][A-Za-z .'-]+,\s*[A-Z][A-Za-z .'-]+", part)
                and not EMAIL_RE.search(part)
                and part != contact.name
            ):
                contact.location = part[:200]
                break
        if contact.location:
            break
    return contact


def _join_wrapped(lines: list[str]) -> list[str]:
    """Merge PDF line-wraps back into their bullet: a non-bullet line that continues a sentence."""
    merged: list[str] = []
    for line in lines:
        if (
            merged
            and is_bullet(merged[-1])
            and not is_bullet(line)
            and not DATE_RANGE_RE.search(line)
            and (line[:1].islower() or not merged[-1].rstrip().endswith((".", "!", "?", ":")))
            and len(line.split()) > 3
            and not TITLE_WORDS.search(line[:40])
        ):
            merged[-1] = f"{merged[-1].rstrip()} {line}"
        else:
            merged.append(line)
    return merged


def _split_title_company(text: str) -> tuple[str, str]:
    parts = [p.strip() for p in SEPARATOR_RE.split(text, maxsplit=1) if p and p.strip()]
    if len(parts) == 2:
        first, second = parts
        if TITLE_WORDS.search(second) and not TITLE_WORDS.search(first):
            return second, first
        return first, second
    return (text, "") if TITLE_WORDS.search(text) else ("", text)


def _parse_experience(lines: list[str]) -> list[ExperienceItem]:
    items: list[ExperienceItem] = []
    current: ExperienceItem | None = None
    header_lines: list[str] = []

    def finalize_header(item: ExperienceItem, headers: list[str]) -> None:
        texts = [h for h in headers if h]
        if not texts:
            return
        title, company = _split_title_company(texts[0])
        if len(texts) > 1 and (not title or not company):
            other_title, other_company = _split_title_company(texts[1])
            title = title or other_title or texts[1]
            company = company or other_company or texts[1]
            if title == company:
                company = "" if TITLE_WORDS.search(title) else company
        item.title, item.company = title[:200], company[:200]

    for line in _join_wrapped(lines):
        if is_bullet(line):
            if current is None:
                current = ExperienceItem()
                items.append(current)
            if header_lines:
                finalize_header(current, header_lines)
                header_lines = []
            current.bullets.append(strip_bullet(line)[:1000])
            continue
        date_match = DATE_RANGE_RE.search(line)
        if current is None or current.bullets or (date_match and current.start_date):
            current = ExperienceItem()
            items.append(current)
            header_lines = []
        if date_match:
            current.start_date = date_match.group("start")[:30]
            current.end_date = date_match.group("end")[:30]
            remainder = (line[: date_match.start()] + line[date_match.end() :]).strip(" |,–—-()")
            if remainder:
                header_lines.append(remainder)
        elif len(header_lines) < 3:
            header_lines.append(line)
    if current is not None and header_lines:
        finalize_header(current, header_lines)
    return [i for i in items if i.title or i.company or i.bullets][:40]


def _parse_education(lines: list[str]) -> list[EducationItem]:
    items: list[EducationItem] = []
    current: EducationItem | None = None
    for line in lines:
        text = strip_bullet(line)
        date_match = DATE_RANGE_RE.search(text) or re.search(r"\b(19|20)\d{2}\b", text)
        degree = DEGREE_RE.search(text)
        institution = INSTITUTION_RE.search(text)
        starts_new = (degree and (current is None or current.degree)) or (
            institution and (current is None or current.institution)
        )
        if current is None or starts_new:
            current = EducationItem()
            items.append(current)
        if isinstance(date_match, re.Match) and date_match.re is DATE_RANGE_RE:
            current.start_date, current.end_date = date_match.group("start")[:30], date_match.group("end")[:30]
            text = (text[: date_match.start()] + text[date_match.end() :]).strip(" |,–—-()")
        elif date_match and not current.end_date:
            current.end_date = date_match.group(0)
            text = text.replace(date_match.group(0), "").strip(" |,–—-()")
        if degree and not current.degree:
            head = re.split(r"\s+(?:\||—|–|-|at)\s+|,\s+(?=[A-Z])", text, maxsplit=1)
            degree_text, tail = head[0], (head[1] if len(head) > 1 else "")
            if " in " in degree_text:
                degree_text, _, field_of_study = degree_text.partition(" in ")
                current.field_of_study = field_of_study.strip()[:200]
            current.degree = degree_text.strip()[:200]
            if tail and INSTITUTION_RE.search(tail):
                current.institution = tail.strip(" ,|")[:200]
        elif institution and not current.institution:
            current.institution = text[:200]
        elif text:
            current.details = f"{current.details} {text}".strip()[:1000]
    return [i for i in items if i.degree or i.institution][:20]


TECH_LINE_RE = re.compile(r"^(tech(nologies)?|tech stack|stack|tools|built with)\s*:", re.IGNORECASE)


def _parse_projects(lines: list[str]) -> list[ProjectItem]:
    items: list[ProjectItem] = []
    tech_text: dict[int, list[str]] = {}
    current: ProjectItem | None = None
    for line in _join_wrapped(lines):
        if is_bullet(line):
            if current is None:
                current = ProjectItem(name="Project")
                items.append(current)
            current.bullets.append(strip_bullet(line)[:1000])
        elif current is not None and TECH_LINE_RE.match(line):
            tech_text.setdefault(len(items) - 1, []).append(line)
        elif current is None or current.bullets or len(line) <= 120:
            without_urls = URL_RE.sub("", line).strip(" |")
            parts = re.split(r"\s+[|–—-]\s+|:\s+", without_urls, maxsplit=1)
            # A short tail ("Recipe Planner - personal project") belongs to the name; a long one is a description.
            describes = len(parts) > 1 and len(parts[1].split()) >= 5
            current = ProjectItem(name=(parts[0] if describes else without_urls)[:200] or "Project")
            if urls := URL_RE.findall(line):
                current.url = urls[0][:300]
            if describes:
                current.bullets.append(parts[1].strip()[:1000])
            items.append(current)
        else:
            current.bullets.append(line[:1000])
    for index, project in enumerate(items):
        text = " ".join([project.name, *project.bullets, *tech_text.get(index, [])])
        project.technologies = [s.canonical for s in find_skills(text) if s.category != "soft"][:40]
    return items[:40]


def _parse_certifications(lines: list[str]) -> list[CertificationItem]:
    items: list[CertificationItem] = []
    for line in lines:
        text = strip_bullet(line)
        if len(text) < 3:
            continue
        year = re.search(r"\b(19|20)\d{2}\b", text)
        date = year.group(0) if year else ""
        if year:
            text = text.replace(date, "").strip(" ,|–—-()")
        parts = re.split(r"\s+[|–—-]\s+|,\s+", text, maxsplit=1)
        items.append(
            CertificationItem(name=parts[0][:200], issuer=(parts[1] if len(parts) > 1 else "")[:200], date=date)
        )
    return items[:40]


def _parse_skills(lines: list[str], full_text: str) -> list[str]:
    skills: list[str] = []
    for line in lines:
        text = strip_bullet(line)
        if ":" in text and text.index(":") < 40:
            text = text.split(":", 1)[1]
        for item in re.split(r"[,;|•·/]|\s{2,}|\s+-\s+", text):
            item = item.strip(" .()")
            if 1 <= len(item) <= 40 and len(item.split()) <= 4:
                skills.append(item)
    known = {s.lower() for s in skills}
    skills += [
        m.canonical
        for m in find_skills(full_text)
        if m.canonical.lower() not in known and m.category not in ("soft", "certification")
    ]
    return skills[:150]


def parse_resume(text: str) -> ParseOutcome:
    header, sections = split_sections(text)
    warnings: list[str] = []
    contact = _parse_contact(header, text)
    data = ResumeData(
        contact=contact,
        summary=" ".join(sections.get("summary", []))[:3000],
        skills=_parse_skills(sections.get("skills", []), text),
        experience=_parse_experience(sections.get("experience", [])),
        education=_parse_education(sections.get("education", [])),
        projects=_parse_projects(sections.get("projects", [])),
        certifications=_parse_certifications(sections.get("certifications", [])),
    )
    if not sections:
        warnings.append(
            "No standard section headings were found, so the structure could not be detected. "
            "Please review and fill in the sections manually."
        )
    for key, label in (("experience", "work experience"), ("education", "education"), ("skills", "skills")):
        if key not in sections:
            warnings.append(f"No {label} section was detected.")
    if not contact.email:
        warnings.append("No email address was found.")
    if not contact.name:
        warnings.append("The candidate name could not be detected.")
    return ParseOutcome(data=data, warnings=warnings)
