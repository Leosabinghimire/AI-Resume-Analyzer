from app.schemas.job import JobParsed
from app.schemas.resume_data import EducationItem, ExperienceItem, ResumeData
from app.services.matching.engine import WEIGHTS, JobRequirements, candidate_years, degree_level, match_resume_to_job
from app.services.parsing.job_parser import analyze_job_description
from app.services.parsing.resume_parser import parse_resume
from app.services.parsing.text_extraction import extract_text
from tests.conftest import FIXTURES


def _sample_resume() -> ResumeData:
    doc = extract_text("r.pdf", (FIXTURES / "sample_resume.pdf").read_bytes(), max_pages=10)
    return parse_resume(doc.text).data


def _job(required: list[str], preferred: list[str] | None = None, **parsed: object) -> JobRequirements:
    return JobRequirements(
        required_skills=required, preferred_skills=preferred or [], parsed=JobParsed.model_validate(parsed)
    )


def test_sample_resume_matches_sample_job(sample_job_text: str) -> None:
    analysis = analyze_job_description(sample_job_text)
    result = match_resume_to_job(
        _sample_resume(), JobRequirements(analysis.required_skills, analysis.preferred_skills, analysis.parsed)
    )
    assert 70 <= result.overall_score <= 95
    assert set(result.missing_preferred_skills) == {"Kubernetes", "GraphQL", "Terraform"}
    assert "Python" in {m.skill for m in result.matched_skills}
    assert result.experience.candidate_years and result.experience.candidate_years >= 4
    assert all(a.aligned for a in result.responsibility_alignment[:2])
    assert result.relevant_experience[0].company == "Northwind Analytics"
    python = next(m for m in result.matched_skills if m.skill == "Python")
    assert "Skills section" in python.evidence


def test_score_is_weighted_average_of_applicable_components() -> None:
    resume = ResumeData(skills=["Python", "React"])
    result = match_resume_to_job(resume, _job(["Python", "React", "Go", "Rust"]))
    components = {c.key: c for c in result.components}
    assert components["required_skills"].score == 50.0
    assert not components["experience"].applicable and not components["responsibilities"].applicable
    # Only required skills apply, so the overall score equals that component.
    assert result.overall_score == 50
    assert result.missing_required_skills == ["Go", "Rust"]


def test_renormalization_with_two_components() -> None:
    resume = ResumeData(skills=["Python"])
    result = match_resume_to_job(resume, _job(["Python"], ["Docker"]))
    expected = round(
        (WEIGHTS["required_skills"] * 100 + WEIGHTS["preferred_skills"] * 0)
        / (WEIGHTS["required_skills"] + WEIGHTS["preferred_skills"])
    )
    assert result.overall_score == expected


def test_soft_skills_have_half_weight() -> None:
    result = match_resume_to_job(ResumeData(skills=["Python"]), _job(["Python", "Communication"]))
    assert result.components[0].score == round(100 * 1 / 1.5, 1)


def test_empty_job_requirements_score_zero_with_explanation() -> None:
    result = match_resume_to_job(ResumeData(skills=["Python"]), _job([]))
    assert result.overall_score == 0
    assert not any(c.applicable for c in result.components)


def test_experience_component() -> None:
    resume = ResumeData(experience=[ExperienceItem(title="Dev", start_date="Jan 2020", end_date="Dec 2021")])
    assert candidate_years(resume) == 2.0
    result = match_resume_to_job(resume, _job([], min_years_experience=4))
    exp = next(c for c in result.components if c.key == "experience")
    assert exp.score == 50.0
    assert any(a.area == "Experience level" for a in result.improvement_areas)


def test_missing_dates_gives_actionable_explanation() -> None:
    result = match_resume_to_job(ResumeData(experience=[ExperienceItem(title="Dev")]), _job([], min_years_experience=2))
    assert result.experience.candidate_years is None
    assert "Add start and end dates" in result.experience.explanation


def test_education_levels() -> None:
    assert degree_level("Bachelor of Science") == "bachelor"
    assert degree_level("MSc Data Science") == "master"
    assert degree_level("Ph.D. in Physics") == "phd"
    assert degree_level("High school") is None
    resume = ResumeData(education=[EducationItem(degree="BSc", field_of_study="CS")])
    strict = match_resume_to_job(resume, _job([], education_level="master"))
    lenient = match_resume_to_job(resume, _job([], education_level="master", education_equivalent_accepted=True))
    strict_score = next(c.score for c in strict.components if c.key == "education")
    lenient_score = next(c.score for c in lenient.components if c.key == "education")
    assert strict_score is not None and lenient_score is not None and strict_score < lenient_score


def test_custom_non_taxonomy_skill_matches_by_phrase() -> None:
    resume = ResumeData(experience=[ExperienceItem(bullets=["Integrated the Stripe API for subscription billing"])])
    result = match_resume_to_job(resume, _job(["Stripe API"]))
    assert result.missing_required_skills == []


def test_score_is_deterministic() -> None:
    resume = _sample_resume()
    job = _job(["Python", "AWS"], ["Kafka"], responsibilities=["Build APIs in Python"], keywords=["Python", "APIs"])
    assert match_resume_to_job(resume, job) == match_resume_to_job(resume, job)
