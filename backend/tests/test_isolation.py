"""User data isolation: another user's resources must be invisible (404), never readable or writable."""

from fastapi.testclient import TestClient

from tests.conftest import create_job, make_client, register, upload


def test_users_cannot_access_each_others_data(client: TestClient, sample_pdf: bytes, sample_job_text: str) -> None:
    owner = upload(client, sample_pdf)
    rid, vid = owner["resume"]["id"], owner["version"]["id"]
    job = create_job(client, sample_job_text)
    job2 = create_job(client, sample_job_text + "\nWe value teamwork and clear written communication.", "Second")
    analysis, analysis2 = client.post(
        "/api/v1/analyses", json={"resume_version_id": vid, "job_ids": [job["id"], job2["id"]]}
    ).json()
    prep = client.post("/api/v1/interview-prep", json={"resume_version_id": vid, "job_id": job["id"]}).json()
    feedback = client.post("/api/v1/feedback", json={"resume_version_id": vid}).json()

    intruder = make_client()
    register(intruder, "intruder@example.com")
    forbidden_reads = [
        f"/api/v1/resumes/{rid}",
        f"/api/v1/resumes/{rid}/file",
        f"/api/v1/resumes/{rid}/text",
        f"/api/v1/resumes/{rid}/versions/{vid}",
        f"/api/v1/resumes/{rid}/versions/{vid}/export.pdf",
        f"/api/v1/jobs/{job['id']}",
        f"/api/v1/analyses/{analysis['id']}",
        f"/api/v1/interview-prep/{prep['id']}",
        f"/api/v1/feedback/{feedback['id']}",
    ]
    for path in forbidden_reads:
        assert intruder.get(path).status_code == 404, path

    assert intruder.patch(f"/api/v1/resumes/{rid}", json={"title": "hacked"}).status_code == 404
    assert intruder.delete(f"/api/v1/jobs/{job['id']}").status_code == 404
    assert intruder.delete(f"/api/v1/analyses/{analysis['id']}").status_code == 404
    # Using someone else's resume version or job as input is also rejected.
    assert intruder.post("/api/v1/analyses", json={"resume_version_id": vid, "job_ids": [job["id"]]}).status_code == 404
    assert intruder.post("/api/v1/feedback", json={"resume_version_id": vid}).status_code == 404
    assert (
        intruder.get("/api/v1/analyses/compare", params={"ids": [analysis["id"], analysis2["id"]]}).status_code == 404
    )

    assert intruder.get("/api/v1/resumes").json()["total"] == 0
    assert intruder.get("/api/v1/analyses").json()["total"] == 0
    assert intruder.get("/api/v1/dashboard").json()["counts"]["resumes"] == 0
    assert client.get(f"/api/v1/resumes/{rid}").json()["title"] != "hacked"


def test_version_must_belong_to_resume_in_path(client: TestClient, sample_pdf: bytes, sample_docx: bytes) -> None:
    a = upload(client, sample_pdf)
    b = upload(client, sample_docx, "b.docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document")
    response = client.get(f"/api/v1/resumes/{a['resume']['id']}/versions/{b['version']['id']}")
    assert response.status_code == 404
