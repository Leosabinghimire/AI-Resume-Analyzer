"""Test configuration. Tests run against a real PostgreSQL database (TEST_DATABASE_URL) migrated with
Alembic, so the migration itself is exercised. The AI provider is always the mock: no paid API calls."""

import os
import tempfile
from collections.abc import Iterator
from pathlib import Path

import pytest

os.environ["ENVIRONMENT"] = "test"
os.environ["DATABASE_URL"] = os.environ.get(
    "TEST_DATABASE_URL", "postgresql+psycopg://resume_app:resume_app_dev_pw@localhost:5432/resume_analyzer_test"
)
os.environ["SECRET_KEY"] = "test-secret-key-that-is-long-enough-for-hs256-signing"
os.environ["AI_PROVIDER"] = "mock"
os.environ["AI_API_KEY"] = ""
os.environ["UPLOAD_DIR"] = tempfile.mkdtemp(prefix="resume-uploads-")
os.environ["AI_RATE_LIMIT_PER_MINUTE"] = "100"

from alembic import command
from alembic.config import Config
from fastapi.testclient import TestClient
from sqlalchemy import text

from app.core.rate_limit import rate_limiter
from app.db.base import Base
from app.db.session import engine
from app.main import app

BACKEND_DIR = Path(__file__).resolve().parents[1]
FIXTURES = Path(__file__).parent / "fixtures"
CSRF = {"X-Requested-With": "fetch"}


@pytest.fixture(scope="session", autouse=True)
def _migrated_database() -> Iterator[None]:
    with engine.begin() as conn:
        conn.execute(text("DROP SCHEMA public CASCADE; CREATE SCHEMA public;"))
    cfg = Config(str(BACKEND_DIR / "alembic.ini"))
    cfg.set_main_option("script_location", str(BACKEND_DIR / "alembic"))
    command.upgrade(cfg, "head")
    yield


@pytest.fixture(autouse=True)
def _clean_state() -> Iterator[None]:
    rate_limiter.reset()
    yield
    tables = ", ".join(t.name for t in Base.metadata.sorted_tables)
    with engine.begin() as conn:
        conn.execute(text(f"TRUNCATE {tables} CASCADE"))


def make_client() -> TestClient:
    return TestClient(app, headers=CSRF)


def register(
    client: TestClient, email: str = "user@example.com", password: str = "Password123", name: str = "Test User"
) -> dict[str, object]:
    response = client.post("/api/v1/auth/register", json={"email": email, "password": password, "full_name": name})
    assert response.status_code == 201, response.text
    return response.json()


@pytest.fixture
def client() -> TestClient:
    c = make_client()
    register(c)
    return c


@pytest.fixture
def anon_client() -> TestClient:
    return make_client()


@pytest.fixture
def sample_pdf() -> bytes:
    return (FIXTURES / "sample_resume.pdf").read_bytes()


@pytest.fixture
def sample_docx() -> bytes:
    return (FIXTURES / "sample_resume.docx").read_bytes()


@pytest.fixture
def sample_job_text() -> str:
    return (FIXTURES / "sample_job.txt").read_text(encoding="utf-8")


def upload(client: TestClient, content: bytes, filename: str = "resume.pdf", mime: str = "application/pdf") -> dict:  # type: ignore[type-arg]
    response = client.post("/api/v1/resumes", files={"file": (filename, content, mime)})
    assert response.status_code == 201, response.text
    return response.json()


def create_job(client: TestClient, description: str, title: str = "Senior Full-Stack Engineer") -> dict:  # type: ignore[type-arg]
    response = client.post("/api/v1/jobs", json={"title": title, "company": "Acme", "description": description})
    assert response.status_code == 201, response.text
    return response.json()
