import re
import unicodedata
from datetime import date

BULLET_CHARS = "•●▪■◦○◆◇►▶➢➤✓✔∙·*-–—"
BULLET_RE = re.compile(rf"^\s*[{re.escape(BULLET_CHARS)}]\s*|^\s*\d{{1,2}}[.)]\s+")

STOPWORDS = frozenset(
    """
a about above across after again against all also am an and any are as at be because been before being below
between both but by can could did do does doing down during each either etc few for from further had has have
having he her here hers him his how i if in into is it its itself just me more most my no nor not of off on
once only or other our ours out over own per same she should so some such than that the their them then there
these they this those through to too under until up upon us very via was we were what when where which while
who whom why will with within without would you your yours
""".split()
)

# Generic job-posting vocabulary that carries no signal for keyword coverage.
GENERIC_JOB_WORDS = frozenset(
    """
ability able candidate candidates company work working team teams role roles position job jobs year years
experience experienced strong excellent good great new including include includes includes required
requirement requirements preferred plus bonus responsibilities responsibility qualifications qualification
skills skill knowledge understanding opportunity opportunities environment looking join us we you our will
must well using use used make help ensure across within based level etc other others related relevant
equivalent degree minimum high highly day days time including benefits salary apply application hiring etc
ideal successful build building design designing develop developing maintain maintaining improve improving
write writing create support supporting manage deliver drive own partner collaborate participate implement
implementing join software
""".split()
)

MONTHS = {
    "jan": 1,
    "feb": 2,
    "mar": 3,
    "apr": 4,
    "may": 5,
    "jun": 6,
    "jul": 7,
    "aug": 8,
    "sep": 9,
    "sept": 9,
    "oct": 10,
    "nov": 11,
    "dec": 12,
}
_MONTH_NAMES = (
    r"jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|"
    r"sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?"
)
DATE_TOKEN = rf"(?:(?:{_MONTH_NAMES})\.?\s+\d{{4}}|\d{{1,2}}/\d{{4}}|\d{{4}}-\d{{2}}|\d{{4}})"
PRESENT_TOKEN = r"(?:present|current|now|today|ongoing)"  # noqa: S105
DATE_RANGE_RE = re.compile(
    rf"(?P<start>{DATE_TOKEN})\s*(?:-|–|—|to|until)\s*(?P<end>{DATE_TOKEN}|{PRESENT_TOKEN})", re.IGNORECASE
)
EMAIL_RE = re.compile(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}")
PHONE_RE = re.compile(r"(?<!\w)(?:\+?\d{1,3}[\s.-]?)?(?:\(\d{2,4}\)[\s.-]?)?\d{2,4}[\s.-]?\d{3,4}[\s.-]?\d{3,4}(?!\w)")
URL_RE = re.compile(r"(?:https?://|www\.)[^\s,;|]+|(?:linkedin\.com|github\.com|gitlab\.com)/[^\s,;|]+", re.IGNORECASE)
NUMBER_RE = re.compile(r"\d+(?:[.,]\d+)?\s*(?:%|\+|k|m|x)?", re.IGNORECASE)
WORD_RE = re.compile(r"[A-Za-z][A-Za-z0-9+#.\-/]*[A-Za-z0-9+#]|[A-Za-z]")


def normalize_text(text: str) -> str:
    text = unicodedata.normalize("NFKC", text).replace("\x00", "")
    text = text.replace("\r\n", "\n").replace("\r", "\n").replace("\t", " ")
    text = re.sub(r"[​‌‍﻿]", "", text)
    lines = [re.sub(r" {2,}", " ", line).strip() for line in text.split("\n")]
    return re.sub(r"\n{3,}", "\n\n", "\n".join(lines)).strip()


def is_bullet(line: str) -> bool:
    return bool(BULLET_RE.match(line))


def strip_bullet(line: str) -> str:
    return BULLET_RE.sub("", line, count=1).strip()


def stem(word: str) -> str:
    """Very light suffix stripping so 'developing', 'developed' and 'develops' compare equal."""
    w = word.lower()
    for suffix in ("ations", "ation", "ments", "ment", "ings", "ing", "ies", "ied", "ers", "er", "ed", "es", "s"):
        if len(w) > len(suffix) + 3 and w.endswith(suffix):
            return w[: -len(suffix)] + ("y" if suffix in ("ies", "ied") else "")
    return w


def content_tokens(text: str) -> list[str]:
    return [t.lower().strip(".-/") for t in WORD_RE.findall(text) if t.lower() not in STOPWORDS and len(t) > 1]


def stemmed_terms(text: str) -> set[str]:
    return {stem(t) for t in content_tokens(text) if t not in GENERIC_JOB_WORDS and len(t) > 2}


def set_similarity(a: set[str], b: set[str]) -> float:
    """Ochiai coefficient: |A∩B| / sqrt(|A|·|B|). Symmetric, 0..1, robust to length differences."""
    if not a or not b:
        return 0.0
    return float(len(a & b) / (len(a) * len(b)) ** 0.5)


def parse_date(token: str, *, today: date | None = None) -> tuple[int, int] | None:
    """Parse a resume date token into (year, month)."""
    token = token.strip().lower().rstrip(".")
    today = today or date.today()
    if re.fullmatch(PRESENT_TOKEN, token):
        return today.year, today.month
    if m := re.fullmatch(r"(\d{1,2})/(\d{4})", token):
        month, year = int(m.group(1)), int(m.group(2))
        return (year, month) if 1 <= month <= 12 else None
    if m := re.fullmatch(r"(\d{4})-(\d{2})", token):
        year, month = int(m.group(1)), int(m.group(2))
        return (year, month) if 1 <= month <= 12 else None
    if m := re.fullmatch(r"([a-z]+)\.?\s+(\d{4})", token):
        named = MONTHS.get(m.group(1)[:4] if m.group(1).startswith("sept") else m.group(1)[:3])
        return (int(m.group(2)), named) if named else None
    if re.fullmatch(r"\d{4}", token):
        return int(token), 1
    return None


def total_years(ranges: list[tuple[tuple[int, int], tuple[int, int]]]) -> float:
    """Sum date ranges in years after merging overlaps, so concurrent roles are not double counted."""
    intervals = sorted((s[0] * 12 + s[1], e[0] * 12 + e[1]) for s, e in ranges if e >= s)
    merged: list[list[int]] = []
    for start, end in intervals:
        if merged and start <= merged[-1][1]:
            merged[-1][1] = max(merged[-1][1], end)
        else:
            merged.append([start, end])
    months = sum(end - start + 1 for start, end in merged)
    return round(months / 12, 1)


def contains_phrase(text_lower: str, phrase: str) -> bool:
    return re.search(r"(?<![a-z0-9])" + re.escape(phrase.lower()) + r"(?![a-z0-9])", text_lower) is not None
