import io

import pymupdf
from fastapi.testclient import TestClient
from reportlab.pdfgen import canvas

from tests.conftest import upload

DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"


def _blank_pdf() -> bytes:
    buffer = io.BytesIO()
    c = canvas.Canvas(buffer)
    c.rect(100, 100, 200, 200, fill=1)  # an "image-only" page with no text
    c.showPage()
    c.save()
    return buffer.getvalue()


def test_upload_pdf_extracts_structured_data(client: TestClient, sample_pdf: bytes) -> None:
    result = upload(client, sample_pdf, "Alex Rivera CV.pdf")
    assert result["resume"]["title"] == "Alex Rivera CV"
    assert result["resume"]["page_count"] == 1
    data = result["version"]["data"]
    assert data["contact"]["email"] == "alex.rivera@example.com"
    assert data["contact"]["name"] == "Alex Rivera"
    assert {"Python", "React", "FastAPI"} <= set(data["skills"])
    assert data["experience"][0]["company"] == "Northwind Analytics"
    assert data["experience"][0]["start_date"] == "Jan 2022"
    assert len(data["experience"][0]["bullets"]) == 4
    assert data["education"][0]["degree"] == "Bachelor of Science"
    assert result["version"]["version_number"] == 1


def test_upload_docx(client: TestClient, sample_docx: bytes) -> None:
    result = upload(client, sample_docx, "resume.docx", DOCX_MIME)
    data = result["version"]["data"]
    assert result["resume"]["content_type"] == DOCX_MIME
    assert len(data["experience"]) == 2
    assert data["experience"][1]["title"] == "Software Engineer"


def _upload_error(client: TestClient, content: bytes, name: str) -> tuple[int, str]:
    response = client.post("/api/v1/resumes", files={"file": (name, content, "application/octet-stream")})
    return response.status_code, response.json()["error"]["code"]


def test_rejects_unsupported_and_mismatched_files(client: TestClient, sample_pdf: bytes) -> None:
    assert _upload_error(client, b"plain text resume", "resume.txt") == (422, "unsupported_file_type")
    assert _upload_error(client, sample_pdf, "resume.docx") == (422, "file_type_mismatch")
    assert _upload_error(client, b"\xd0\xcf\x11\xe0legacy", "resume.doc") == (422, "unsupported_file_type")
    assert _upload_error(client, b"", "resume.pdf") == (422, "empty_document")


def test_malformed_files_do_not_crash(client: TestClient) -> None:
    assert _upload_error(client, b"%PDF-1.7\n garbage that is not a pdf", "bad.pdf")[0] == 422
    assert _upload_error(client, b"PK\x03\x04 not really a zip", "bad.docx")[0] == 422


def test_scanned_pdf_gets_clear_message(client: TestClient) -> None:
    status, code = _upload_error(client, _blank_pdf(), "scan.pdf")
    assert (status, code) == (422, "no_text_found")


def test_encrypted_pdf_rejected(client: TestClient, sample_pdf: bytes) -> None:
    doc = pymupdf.open(stream=sample_pdf, filetype="pdf")
    encrypted = doc.tobytes(encryption=pymupdf.PDF_ENCRYPT_AES_256, user_pw="secret", owner_pw="owner")
    assert _upload_error(client, encrypted, "locked.pdf") == (422, "encrypted_document")


def test_file_size_limit(client: TestClient) -> None:
    big = b"%PDF-1.4\n" + b"0" * (5 * 1024 * 1024 + 10)
    assert _upload_error(client, big, "big.pdf") == (413, "file_too_large")


def test_duplicate_upload_conflict(client: TestClient, sample_pdf: bytes) -> None:
    first = upload(client, sample_pdf)
    response = client.post("/api/v1/resumes", files={"file": ("again.pdf", sample_pdf, "application/pdf")})
    assert response.status_code == 409
    assert response.json()["error"]["details"]["resume_id"] == first["resume"]["id"]


def test_list_rename_download_delete(client: TestClient, sample_pdf: bytes) -> None:
    resume_id = upload(client, sample_pdf)["resume"]["id"]
    listing = client.get("/api/v1/resumes").json()
    assert listing["total"] == 1 and listing["items"][0]["version_count"] == 1
    assert client.get("/api/v1/resumes", params={"q": "zzz"}).json()["total"] == 0

    renamed = client.patch(f"/api/v1/resumes/{resume_id}", json={"title": "Backend focus"}).json()
    assert renamed["title"] == "Backend focus"

    download = client.get(f"/api/v1/resumes/{resume_id}/file")
    assert download.status_code == 200 and download.content == sample_pdf
    assert "Alex Rivera" in client.get(f"/api/v1/resumes/{resume_id}/text").json()["raw_text"]

    assert client.delete(f"/api/v1/resumes/{resume_id}").status_code == 204
    assert client.get(f"/api/v1/resumes/{resume_id}").status_code == 404


def test_versions_create_update_compare_and_export(client: TestClient, sample_pdf: bytes) -> None:
    result = upload(client, sample_pdf)
    rid, original = result["resume"]["id"], result["version"]
    data = original["data"]
    data["summary"] = "Full-stack engineer focused on reliable Python APIs and React interfaces."
    data["skills"].append("Kubernetes")
    created = client.post(
        f"/api/v1/resumes/{rid}/versions", json={"label": "Tailored", "source": "ai_assisted", "data": data}
    )
    assert created.status_code == 201
    v2 = created.json()
    assert v2["version_number"] == 2 and v2["source"] == "ai_assisted"

    original_again = client.get(f"/api/v1/resumes/{rid}/versions/{original['id']}").json()
    assert original_again["data"]["summary"] != data["summary"]  # original preserved

    diff = client.get(
        f"/api/v1/resumes/{rid}/versions/compare", params={"base": original["id"], "target": v2["id"]}
    ).json()
    sections = {s["section"]: s for s in diff["sections"]}
    assert sections["skills"]["added"] == ["Kubernetes"]
    assert sections["summary"]["changed"]
    assert any(seg["op"] == "insert" for seg in sections["summary"]["segments"])
    assert not sections["education"]["changed"]

    renamed = client.patch(f"/api/v1/resumes/{rid}/versions/{v2['id']}", json={"label": "Tailored v2"})
    assert renamed.json()["label"] == "Tailored v2"

    pdf = client.get(f"/api/v1/resumes/{rid}/versions/{v2['id']}/export.pdf")
    assert pdf.status_code == 200 and pdf.content.startswith(b"%PDF")
    text = "".join(page.get_text() for page in pymupdf.open(stream=pdf.content, filetype="pdf"))
    assert "Kubernetes" in text and "Northwind Analytics" in text

    assert client.delete(f"/api/v1/resumes/{rid}/versions/{v2['id']}").status_code == 204
    last = client.delete(f"/api/v1/resumes/{rid}/versions/{original['id']}")
    assert last.status_code == 400 and last.json()["error"]["code"] == "last_version"


def test_placeholders_must_be_replaced_before_saving(client: TestClient, sample_pdf: bytes) -> None:
    result = upload(client, sample_pdf)
    data = result["version"]["data"]
    data["experience"][0]["bullets"][0] = "Built APIs, resulting in [add a measurable outcome you can verify]"
    response = client.post(f"/api/v1/resumes/{result['resume']['id']}/versions", json={"label": "Draft", "data": data})
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "unresolved_placeholders"


def test_version_payload_validation(client: TestClient, sample_pdf: bytes) -> None:
    result = upload(client, sample_pdf)
    data = result["version"]["data"]
    data["summary"] = "x" * 5000
    response = client.post(f"/api/v1/resumes/{result['resume']['id']}/versions", json={"label": "Long", "data": data})
    assert response.status_code == 422 and response.json()["error"]["code"] == "validation_error"


def test_reparse_creates_new_version(client: TestClient, sample_pdf: bytes) -> None:
    rid = upload(client, sample_pdf)["resume"]["id"]
    response = client.post(f"/api/v1/resumes/{rid}/reparse")
    assert response.status_code == 201 and response.json()["version_number"] == 2
