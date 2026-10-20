from fastapi.testclient import TestClient

from tests.conftest import create_job, upload

SECOND_JOB = """Data Engineer

Responsibilities
- Build batch and streaming data pipelines with Spark and Kafka
- Model data in Snowflake and maintain dbt transformations

Requirements
- 3+ years of experience as a data engineer
- Strong Python and SQL
- Experience with Airflow
"""


def _setup(client: TestClient, pdf: bytes, job_text: str) -> tuple[str, str, str, str]:
    result = upload(client, pdf)
    job_a = create_job(client, job_text)["id"]
    job_b = create_job(client, SECOND_JOB, title="Data Engineer")["id"]
    return result["resume"]["id"], result["version"]["id"], job_a, job_b


def test_match_one_resume_against_multiple_jobs(client: TestClient, sample_pdf: bytes, sample_job_text: str) -> None:
    _, vid, job_a, job_b = _setup(client, sample_pdf, sample_job_text)
    response = client.post("/api/v1/analyses", json={"resume_version_id": vid, "job_ids": [job_a, job_b]})
    assert response.status_code == 201
    a, b = response.json()
    assert a["job"]["id"] == job_a and b["job"]["id"] == job_b
    assert a["overall_score"] > b["overall_score"]  # the full-stack resume fits the full-stack job better
    assert a["ai_status"] == "completed" and a["ai_is_mock"] is True
    assert (
        "Spark" in b["match_result"]["missing_required_skills"]
        or "Airflow" in b["match_result"]["missing_required_skills"]
    )
    assert {c["key"] for c in a["match_result"]["components"]} == {
        "required_skills",
        "preferred_skills",
        "experience",
        "responsibilities",
        "education",
        "keywords",
    }


def test_duplicate_submission_returns_existing_analysis(
    client: TestClient, sample_pdf: bytes, sample_job_text: str
) -> None:
    _, vid, job_a, _ = _setup(client, sample_pdf, sample_job_text)
    first = client.post("/api/v1/analyses", json={"resume_version_id": vid, "job_ids": [job_a]}).json()[0]
    second = client.post("/api/v1/analyses", json={"resume_version_id": vid, "job_ids": [job_a]}).json()[0]
    assert first["id"] == second["id"]
    assert client.get("/api/v1/analyses").json()["total"] == 1


def test_history_filter_search_compare_delete(client: TestClient, sample_pdf: bytes, sample_job_text: str) -> None:
    rid, vid, job_a, job_b = _setup(client, sample_pdf, sample_job_text)
    a, b = client.post(
        "/api/v1/analyses", json={"resume_version_id": vid, "job_ids": [job_a, job_b], "include_ai_insights": False}
    ).json()
    assert a["ai_status"] == "not_requested"

    assert client.get("/api/v1/analyses", params={"q": "data eng"}).json()["total"] == 1
    assert client.get("/api/v1/analyses", params={"job_id": job_a}).json()["items"][0]["id"] == a["id"]
    assert client.get("/api/v1/analyses", params={"resume_id": rid}).json()["total"] == 2
    assert client.get("/api/v1/analyses", params={"min_score": 101}).status_code == 422
    by_score = client.get("/api/v1/analyses", params={"sort": "score_desc"}).json()["items"]
    assert [i["overall_score"] for i in by_score] == sorted([a["overall_score"], b["overall_score"]], reverse=True)
    assert client.get("/api/v1/analyses", params={"q": "nothing-matches"}).json() == {
        "items": [],
        "total": 0,
        "page": 1,
        "page_size": 20,
    }

    compared = client.get("/api/v1/analyses/compare", params={"ids": [a["id"], b["id"]]}).json()
    assert [c["id"] for c in compared] == [a["id"], b["id"]]
    assert client.get("/api/v1/analyses/compare", params={"ids": [a["id"]]}).status_code == 400

    detail = client.get(f"/api/v1/analyses/{a['id']}").json()
    assert detail["match_result"]["overall_score"] == a["overall_score"]
    assert client.delete(f"/api/v1/analyses/{a['id']}").status_code == 204
    assert client.get(f"/api/v1/analyses/{a['id']}").status_code == 404


def test_compare_resume_versions_against_same_job(client: TestClient, sample_pdf: bytes, sample_job_text: str) -> None:
    rid, vid, job_a, _ = _setup(client, sample_pdf, sample_job_text)
    original = client.get(f"/api/v1/resumes/{rid}/versions/{vid}").json()["data"]
    original["skills"] += ["Kubernetes", "GraphQL", "Terraform"]
    v2 = client.post(f"/api/v1/resumes/{rid}/versions", json={"label": "Infra", "data": original}).json()
    first = client.post("/api/v1/analyses", json={"resume_version_id": vid, "job_ids": [job_a]}).json()[0]
    second = client.post("/api/v1/analyses", json={"resume_version_id": v2["id"], "job_ids": [job_a]}).json()[0]
    assert second["overall_score"] > first["overall_score"]
    assert second["match_result"]["missing_preferred_skills"] == []
    assert second["resume"]["version_number"] == 2


def test_editing_resume_marks_analysis_stale(client: TestClient, sample_pdf: bytes, sample_job_text: str) -> None:
    rid, vid, job_a, _ = _setup(client, sample_pdf, sample_job_text)
    analysis = client.post("/api/v1/analyses", json={"resume_version_id": vid, "job_ids": [job_a]}).json()[0]
    assert analysis["is_stale"] is False
    client.patch(f"/api/v1/resumes/{rid}/versions/{vid}", json={"label": "Original (edited)"})
    assert client.get(f"/api/v1/analyses/{analysis['id']}").json()["is_stale"] is True


def test_job_crud_and_skill_editing(client: TestClient, sample_job_text: str) -> None:
    job = create_job(client, sample_job_text)
    assert job["parsed"]["min_years_experience"] == 4
    duplicate = client.post("/api/v1/jobs", json={"title": "Copy", "description": sample_job_text})
    assert duplicate.status_code == 409 and duplicate.json()["error"]["code"] == "duplicate_job"
    too_short = client.post("/api/v1/jobs", json={"title": "x", "description": "short"})
    assert too_short.status_code == 422
    bad_url = client.post("/api/v1/jobs", json={"title": "x", "url": "not a url", "description": SECOND_JOB})
    assert bad_url.status_code == 422

    edited = client.patch(
        f"/api/v1/jobs/{job['id']}", json={"required_skills": ["Python", "Rust", "python"], "company": "Northwind"}
    ).json()
    assert edited["required_skills"] == ["Python", "Rust"] and edited["skills_customized"] is True
    reset = client.post(f"/api/v1/jobs/{job['id']}/reset-skills").json()
    assert "React" in reset["required_skills"] and reset["skills_customized"] is False

    listing = client.get("/api/v1/jobs", params={"q": "northwind"}).json()
    assert listing["total"] == 1 and listing["items"][0]["analysis_count"] == 0
    assert client.delete(f"/api/v1/jobs/{job['id']}").status_code == 204
    assert client.get("/api/v1/jobs").json()["total"] == 0


def test_feedback_and_interview_prep(client: TestClient, sample_pdf: bytes, sample_job_text: str) -> None:
    rid, vid, job_a, _ = _setup(client, sample_pdf, sample_job_text)
    feedback = client.post("/api/v1/feedback", json={"resume_version_id": vid, "job_id": job_a}).json()
    assert feedback["is_mock"] is True and feedback["metrics"]["bullet_count"] == 8
    originals = {w["original"] for w in feedback["result"]["weak_bullets"]}
    assert "Worked on Django services for customer onboarding" in originals
    assert all(w["requires_verification"] for w in feedback["result"]["weak_bullets"] if "[" in w["suggestion"])
    assert {k["keyword"] for k in feedback["result"]["keyword_recommendations"]} == {"Integration Testing"}
    listed = client.get(f"/api/v1/resumes/{rid}/versions/{vid}/feedback").json()
    assert [f["id"] for f in listed] == [feedback["id"]]

    prep = client.post("/api/v1/interview-prep", json={"resume_version_id": vid, "job_id": job_a}).json()
    assert prep["result"]["technical_questions"] and prep["result"]["behavioral_questions"]
    assert "not the questions the employer will ask" in prep["disclaimer"]
    assert prep["result"]["study_topics"][0]["topic"] == "Integration Testing"
    assert client.get("/api/v1/interview-prep").json()["total"] == 1
    assert client.delete(f"/api/v1/interview-prep/{prep['id']}").status_code == 204


def test_dashboard_reflects_database(client: TestClient, sample_pdf: bytes, sample_job_text: str) -> None:
    empty = client.get("/api/v1/dashboard").json()
    assert empty["counts"]["analyses"] == 0 and empty["counts"]["average_score"] is None
    assert empty["score_trend"] == [] and empty["skill_gaps"] == []

    _, vid, job_a, job_b = _setup(client, sample_pdf, sample_job_text)
    created = client.post("/api/v1/analyses", json={"resume_version_id": vid, "job_ids": [job_a, job_b]}).json()
    dash = client.get("/api/v1/dashboard").json()
    assert dash["counts"] | {"average_score": None} == {
        "resumes": 1,
        "resume_versions": 1,
        "jobs": 2,
        "analyses": 2,
        "feedback_reports": 0,
        "interview_preps": 0,
        "average_score": None,
    }
    assert dash["counts"]["average_score"] == round(sum(a["overall_score"] for a in created) / 2, 1)
    assert len(dash["score_trend"]) == 2 and len(dash["recent_analyses"]) == 2
    assert dash["recent_versions"][0]["version_number"] == 1
    gap_skills = {g["skill"] for g in dash["skill_gaps"]}
    assert "Integration Testing" in gap_skills
