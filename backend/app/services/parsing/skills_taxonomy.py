"""Curated skill taxonomy used for deterministic skill extraction.

Each entry: canonical name -> (category, aliases). Aliases are matched case-insensitively with
word boundaries, except entries listed in CASE_SENSITIVE_ALIASES (short or ambiguous words).
"""

import re
from dataclasses import dataclass
from functools import lru_cache

SKILLS: dict[str, tuple[str, tuple[str, ...]]] = {
    # Languages
    "Python": ("language", ("python", "python3")),
    "JavaScript": ("language", ("javascript", "js", "es6", "ecmascript")),
    "TypeScript": ("language", ("typescript", "ts")),
    "Java": ("language", ("java",)),
    "C#": ("language", ("c#", "csharp", "c sharp")),
    "C++": ("language", ("c++", "cpp")),
    "Go": ("language", ("golang",)),
    "Rust": ("language", ("rust",)),
    "Ruby": ("language", ("ruby",)),
    "PHP": ("language", ("php",)),
    "Kotlin": ("language", ("kotlin",)),
    "Swift": ("language", ()),
    "Scala": ("language", ("scala",)),
    "R": ("language", ("r programming", "rstudio")),
    "SQL": ("language", ("sql",)),
    "Bash": ("language", ("bash", "shell scripting", "shell script")),
    "PowerShell": ("language", ("powershell",)),
    "Dart": ("language", ("dart",)),
    "HTML": ("language", ("html", "html5")),
    "CSS": ("language", ("css", "css3")),
    "Sass": ("language", ("sass", "scss")),
    # Frontend
    "React": ("frontend", ("react", "react.js", "reactjs")),
    "Next.js": ("frontend", ("next.js", "nextjs")),
    "Vue.js": ("frontend", ("vue", "vue.js", "vuejs")),
    "Nuxt": ("frontend", ("nuxt", "nuxt.js")),
    "Angular": ("frontend", ("angular", "angularjs")),
    "Svelte": ("frontend", ("svelte", "sveltekit")),
    "Redux": ("frontend", ("redux", "redux toolkit")),
    "Tailwind CSS": ("frontend", ("tailwind", "tailwind css", "tailwindcss")),
    "Bootstrap": ("frontend", ("bootstrap",)),
    "Material UI": ("frontend", ("material ui", "material-ui", "mui")),
    "Webpack": ("frontend", ("webpack",)),
    "Vite": ("frontend", ("vite",)),
    "jQuery": ("frontend", ("jquery",)),
    "React Native": ("mobile", ("react native",)),
    "Flutter": ("mobile", ("flutter",)),
    "Android": ("mobile", ("android",)),
    "iOS": ("mobile", ("ios",)),
    "Accessibility": ("frontend", ("accessibility", "a11y", "wcag")),
    "Responsive Design": ("frontend", ("responsive design", "responsive web design", "mobile-first")),
    # Backend
    "Node.js": ("backend", ("node", "node.js", "nodejs")),
    "Express": ("backend", ("express.js", "expressjs")),
    "NestJS": ("backend", ("nestjs", "nest.js")),
    "Django": ("backend", ("django",)),
    "Flask": ("backend", ("flask",)),
    "FastAPI": ("backend", ("fastapi",)),
    "Spring Boot": ("backend", ("spring boot", "spring framework", "springboot")),
    ".NET": ("backend", (".net", "dotnet", ".net core", "asp.net", "asp.net core")),
    "Ruby on Rails": ("backend", ("rails", "ruby on rails")),
    "Laravel": ("backend", ("laravel",)),
    "GraphQL": ("backend", ("graphql",)),
    "REST APIs": ("backend", ("restful", "rest api", "rest apis", "restful api", "restful apis")),
    "gRPC": ("backend", ("grpc",)),
    "Microservices": ("backend", ("microservices", "microservice", "micro-services")),
    "WebSockets": ("backend", ("websocket", "websockets", "socket.io")),
    "SQLAlchemy": ("backend", ("sqlalchemy",)),
    "Pydantic": ("backend", ("pydantic",)),
    "Celery": ("backend", ("celery",)),
    "OAuth": ("security", ("oauth", "oauth2", "oauth 2.0", "openid connect", "oidc")),
    "JWT": ("security", ("jwt", "json web token", "json web tokens")),
    # Data stores
    "PostgreSQL": ("database", ("postgresql", "postgres", "psql")),
    "MySQL": ("database", ("mysql",)),
    "SQLite": ("database", ("sqlite",)),
    "SQL Server": ("database", ("sql server", "mssql", "t-sql")),
    "Oracle Database": ("database", ("oracle database", "oracle db", "pl/sql")),
    "MongoDB": ("database", ("mongodb", "mongo")),
    "Redis": ("database", ("redis",)),
    "Elasticsearch": ("database", ("elasticsearch", "elastic search", "opensearch")),
    "DynamoDB": ("database", ("dynamodb",)),
    "Cassandra": ("database", ("cassandra",)),
    "Firebase": ("database", ("firebase", "firestore")),
    "Supabase": ("database", ("supabase",)),
    "Prisma": ("database", ("prisma",)),
    "Kafka": ("data", ("kafka", "apache kafka")),
    "RabbitMQ": ("data", ("rabbitmq",)),
    # Cloud & DevOps
    "AWS": ("cloud", ("aws", "amazon web services")),
    "Azure": ("cloud", ("azure", "microsoft azure")),
    "Google Cloud": ("cloud", ("gcp", "google cloud", "google cloud platform")),
    "AWS Lambda": ("cloud", ("lambda", "aws lambda")),
    "Serverless": ("cloud", ("serverless",)),
    "Docker": ("devops", ("docker", "containerization", "containers")),
    "Kubernetes": ("devops", ("kubernetes", "k8s")),
    "Terraform": ("devops", ("terraform",)),
    "Ansible": ("devops", ("ansible",)),
    "CI/CD": ("devops", ("ci/cd", "ci cd", "continuous integration", "continuous delivery", "continuous deployment")),
    "GitHub Actions": ("devops", ("github actions",)),
    "GitLab CI": ("devops", ("gitlab ci", "gitlab-ci")),
    "Jenkins": ("devops", ("jenkins",)),
    "Linux": ("devops", ("linux", "unix", "ubuntu")),
    "Nginx": ("devops", ("nginx",)),
    "Vercel": ("cloud", ("vercel",)),
    "Heroku": ("cloud", ("heroku",)),
    "Prometheus": ("devops", ("prometheus",)),
    "Grafana": ("devops", ("grafana",)),
    "Datadog": ("devops", ("datadog",)),
    "Observability": ("devops", ("observability", "monitoring", "logging and monitoring")),
    "Git": ("tool", ("git", "github", "gitlab", "bitbucket", "version control")),
    "Jira": ("tool", ("jira",)),
    "Figma": ("tool", ("figma",)),
    "Postman": ("tool", ("postman",)),
    "Excel": ("tool", ("excel", "microsoft excel")),
    "Tableau": ("data", ("tableau",)),
    "Power BI": ("data", ("power bi", "powerbi")),
    # Testing & quality
    "Unit Testing": ("testing", ("unit testing", "unit tests", "tdd", "test-driven development")),
    "Pytest": ("testing", ("pytest",)),
    "Jest": ("testing", ("jest",)),
    "Vitest": ("testing", ("vitest",)),
    "Cypress": ("testing", ("cypress",)),
    "Playwright": ("testing", ("playwright",)),
    "Selenium": ("testing", ("selenium",)),
    "React Testing Library": ("testing", ("react testing library", "testing library")),
    "JUnit": ("testing", ("junit",)),
    "Integration Testing": (
        "testing",
        ("integration testing", "integration tests", "end-to-end testing", "e2e testing", "e2e tests"),
    ),
    # Data & AI
    "Machine Learning": ("ai", ("machine learning", "ml")),
    "Deep Learning": ("ai", ("deep learning",)),
    "NLP": ("ai", ("nlp", "natural language processing")),
    "LLMs": (
        "ai",
        (
            "llm",
            "llms",
            "large language models",
            "large language model",
            "generative ai",
            "genai",
            "gpt",
            "openai api",
            "prompt engineering",
        ),
    ),
    "RAG": ("ai", ("rag", "retrieval augmented generation", "retrieval-augmented generation")),
    "TensorFlow": ("ai", ("tensorflow",)),
    "PyTorch": ("ai", ("pytorch",)),
    "scikit-learn": ("ai", ("scikit-learn", "sklearn")),
    "Pandas": ("data", ("pandas",)),
    "NumPy": ("data", ("numpy",)),
    "Spark": ("data", ("spark", "pyspark", "apache spark")),
    "Airflow": ("data", ("airflow", "apache airflow")),
    "dbt": ("data", ("dbt",)),
    "Snowflake": ("data", ("snowflake",)),
    "BigQuery": ("data", ("bigquery",)),
    "ETL": ("data", ("etl", "elt", "data pipelines", "data pipeline")),
    "Data Analysis": ("data", ("data analysis", "data analytics")),
    "Data Visualization": ("data", ("data visualization", "data visualisation")),
    "Statistics": ("data", ("statistics", "statistical analysis")),
    # Practices & concepts
    "System Design": ("concept", ("system design", "distributed systems", "scalable systems")),
    "Software Architecture": ("concept", ("software architecture", "architecture design", "design patterns")),
    "Data Structures & Algorithms": ("concept", ("data structures", "algorithms")),
    "Object-Oriented Programming": ("concept", ("oop", "object-oriented", "object oriented programming")),
    "Performance Optimization": ("concept", ("performance optimization", "performance tuning", "web performance")),
    "Security Best Practices": (
        "security",
        ("application security", "owasp", "secure coding", "security best practices"),
    ),
    "Agile": ("methodology", ("agile", "agile methodologies")),
    "Scrum": ("methodology", ("scrum", "sprint planning")),
    "Kanban": ("methodology", ("kanban",)),
    "Code Review": ("methodology", ("code review", "code reviews", "peer review")),
    "UI/UX Design": ("design", ("ui/ux", "ux design", "ui design", "user experience", "user interface design")),
    "SEO": ("frontend", ("seo", "search engine optimization")),
    "Technical Writing": ("soft", ("technical writing", "documentation")),
    # Soft skills
    "Communication": ("soft", ("communication", "communication skills", "communicator")),
    "Teamwork": ("soft", ("teamwork", "collaboration", "collaborative", "cross-functional")),
    "Leadership": ("soft", ("leadership", "mentoring", "mentorship", "mentored")),
    "Problem Solving": ("soft", ("problem solving", "problem-solving", "analytical skills")),
    "Project Management": ("soft", ("project management", "stakeholder management")),
    "Time Management": ("soft", ("time management", "prioritization")),
    # Certifications
    "AWS Certified Solutions Architect": (
        "certification",
        ("aws certified solutions architect", "aws solutions architect"),
    ),
    "AWS Certified Developer": ("certification", ("aws certified developer",)),
    "Azure Fundamentals": ("certification", ("az-900", "azure fundamentals")),
    "CKA": ("certification", ("certified kubernetes administrator", "cka")),
    "PMP": ("certification", ("pmp", "project management professional")),
    "Certified ScrumMaster": ("certification", ("certified scrummaster", "csm", "professional scrum master", "psm")),
    "CompTIA Security+": ("certification", ("security+", "comptia security+")),
}

# Words that are only treated as skills when they appear with this exact casing.
CASE_SENSITIVE_ALIASES: dict[str, str] = {
    "Go": "Go",
    "Swift": "Swift",
    "Express": "Express",
    "Spring": "Spring Boot",
}
# Canonical names whose lowercase form is a common word or letter, so it is never used as an alias.
_UNSAFE_CANONICAL_ALIASES = {"Go", "Swift", "Express", "R"}

# Category weighting used by the matching engine; soft skills are hard to evidence from a resume.
CATEGORY_WEIGHTS: dict[str, float] = {"soft": 0.5}


@dataclass(frozen=True)
class SkillMatch:
    canonical: str
    category: str
    start: int


def _alias_pattern(alias: str) -> str:
    return r"(?<![A-Za-z0-9+#])" + re.escape(alias) + r"(?![A-Za-z0-9+#]|\.[A-Za-z])"


@lru_cache
def _compiled() -> tuple[re.Pattern[str], re.Pattern[str], dict[str, str]]:
    alias_to_canonical: dict[str, str] = {}
    for canonical, (_, aliases) in SKILLS.items():
        names = aliases if canonical in _UNSAFE_CANONICAL_ALIASES else (canonical.lower(), *aliases)
        for alias in names:
            alias_to_canonical.setdefault(alias.lower(), canonical)
    # Longest aliases first so "react native" wins over "react".
    ordered = sorted(alias_to_canonical, key=len, reverse=True)
    insensitive = re.compile("|".join(f"(?P<a{i}>{_alias_pattern(a)})" for i, a in enumerate(ordered)), re.IGNORECASE)
    sensitive = re.compile("|".join(_alias_pattern(a) for a in CASE_SENSITIVE_ALIASES))
    index = {f"a{i}": alias_to_canonical[a] for i, a in enumerate(ordered)}
    return insensitive, sensitive, index


def find_skills(text: str) -> list[SkillMatch]:
    """Return canonical skills mentioned in text, in order of first appearance."""
    insensitive, sensitive, index = _compiled()
    found: dict[str, SkillMatch] = {}
    for m in insensitive.finditer(text):
        canonical = index[m.lastgroup or ""]
        if canonical not in found:
            found[canonical] = SkillMatch(canonical, SKILLS[canonical][0], m.start())
    for m in sensitive.finditer(text):
        canonical = CASE_SENSITIVE_ALIASES[m.group(0)]
        if canonical not in found:
            found[canonical] = SkillMatch(canonical, SKILLS[canonical][0], m.start())
    return sorted(found.values(), key=lambda s: s.start)


@lru_cache
def _canonical_lookup() -> dict[str, str]:
    lookup: dict[str, str] = {}
    for canonical, (_, aliases) in SKILLS.items():
        for alias in (canonical.lower(), *aliases):
            lookup.setdefault(alias.lower(), canonical)
    return lookup


def canonicalize(skill: str) -> str:
    """Map a free-text skill to its canonical taxonomy name when known."""
    cleaned = skill.strip()
    if cleaned in CASE_SENSITIVE_ALIASES:
        return CASE_SENSITIVE_ALIASES[cleaned]
    return _canonical_lookup().get(cleaned.lower(), cleaned)


def category_of(skill: str) -> str:
    entry = SKILLS.get(skill)
    return entry[0] if entry else "other"


def skill_weight(skill: str) -> float:
    return CATEGORY_WEIGHTS.get(category_of(skill), 1.0)
