from datetime import date

from app.services.parsing.job_parser import analyze_job_description
from app.services.parsing.resume_parser import parse_resume, split_sections
from app.services.parsing.skills_taxonomy import canonicalize, find_skills
from app.services.parsing.text_utils import parse_date, total_years


def test_find_skills_handles_aliases_and_boundaries() -> None:
    found = [s.canonical for s in find_skills("Built React.js apps with Node, TS and Postgres on k8s using C# and C++")]
    assert found == ["React", "Node.js", "TypeScript", "PostgreSQL", "Kubernetes", "C#", "C++"]
    assert [s.canonical for s in find_skills("Expressed interest in the rest of the javascript ecosystem")] == [
        "JavaScript"
    ]  # "Express"/"REST"/"Java" must not match inside other words
    assert [s.canonical for s in find_skills("Written in Go, deployed with Golang tooling")] == ["Go"]
    assert find_skills("Let's go to the meeting") == []


def test_canonicalize() -> None:
    assert canonicalize("reactjs") == "React"
    assert canonicalize("Postgres") == "PostgreSQL"
    assert canonicalize("Stripe API") == "Stripe API"


def test_parse_date_formats() -> None:
    today = date(2026, 10, 1)
    assert parse_date("Jan 2022") == (2022, 1)
    assert parse_date("September 2020") == (2020, 9)
    assert parse_date("03/2021") == (2021, 3)
    assert parse_date("2019-07") == (2019, 7)
    assert parse_date("2018") == (2018, 1)
    assert parse_date("Present", today=today) == (2026, 10)
    assert parse_date("13/2020") is None


def test_total_years_merges_overlaps() -> None:
    assert total_years([((2020, 1), (2020, 12)), ((2020, 6), (2021, 12))]) == 2.0
    assert total_years([((2020, 1), (2020, 12)), ((2022, 1), (2022, 12))]) == 2.0


def test_section_detection_ignores_long_lines() -> None:
    _, sections = split_sections("EXPERIENCE\nEducation is a lifelong process that I deeply value in my work\n")
    assert list(sections) == ["experience"]


def test_parser_warns_when_structure_missing() -> None:
    outcome = parse_resume("Just a paragraph of text without any headings at all, describing some work. " * 3)
    assert any("No standard section headings" in w for w in outcome.warnings)


def test_parser_joins_wrapped_pdf_lines() -> None:
    text = (
        "EXPERIENCE\nEngineer | Acme\nJan 2020 - Present\n• Built a data pipeline that ingests events from\n"
        "mobile clients and stores them in PostgreSQL\n• Led code reviews."
    )
    exp = parse_resume(text).data.experience[0]
    assert exp.bullets[0].endswith("stores them in PostgreSQL")
    assert len(exp.bullets) == 2
    assert (exp.title, exp.company) == ("Engineer", "Acme")


def test_job_parser_sections(sample_job_text: str) -> None:
    job = analyze_job_description(sample_job_text)
    assert {"Python", "React", "TypeScript", "PostgreSQL", "Docker"} <= set(job.required_skills)
    assert set(job.preferred_skills) == {"Kubernetes", "GraphQL", "Terraform"}
    assert job.parsed.min_years_experience == 4
    assert job.parsed.education_level == "bachelor"
    assert job.parsed.education_equivalent_accepted
    assert len(job.parsed.responsibilities) == 4
    assert "build" not in job.parsed.keywords


def test_job_parser_marks_inline_preferred_lines() -> None:
    text = (
        "Requirements\n- 3+ years with Java and Spring Boot\n- Experience with Kafka is a plus\n"
        "- Strong SQL knowledge and solid testing habits for backend services\n"
    )
    job = analyze_job_description(text)
    assert "Kafka" in job.preferred_skills and "Kafka" not in job.required_skills
    assert {"Java", "Spring Boot", "SQL"} <= set(job.required_skills)


def test_job_without_sections_treats_skills_as_required() -> None:
    job = analyze_job_description(
        "We need a developer who knows Python and Django to build internal tools "
        "for our operations team, working closely with designers."
    )
    assert job.required_skills == ["Python", "Django"]
    assert job.parsed.min_years_experience is None


def test_hosted_database_urls_use_psycopg_driver() -> None:
    from app.core.config import Settings

    secret = "x" * 40
    neon = Settings(secret_key=secret, database_url="postgresql://u:p@ep-x.neon.tech/db?sslmode=require")
    assert neon.database_url == "postgresql+psycopg://u:p@ep-x.neon.tech/db?sslmode=require"
    assert Settings(secret_key=secret, database_url="postgres://u:p@h/db").database_url.startswith(
        "postgresql+psycopg://"
    )
    explicit = "postgresql+psycopg://u:p@h/db"
    assert Settings(secret_key=secret, database_url=explicit).database_url == explicit
