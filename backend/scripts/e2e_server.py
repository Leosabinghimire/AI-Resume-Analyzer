"""Start an isolated API server for Playwright end-to-end tests.

Resets the E2E database schema, applies migrations, and serves the API with the mock AI provider so
tests never make paid API calls. Never point E2E_DATABASE_URL at a database with real data.
"""

import os
import subprocess
import sys
import tempfile
from pathlib import Path

BACKEND = Path(__file__).resolve().parents[1]

env = {
    **os.environ,
    "ENVIRONMENT": "test",
    "DATABASE_URL": os.environ.get(
        "E2E_DATABASE_URL", "postgresql+psycopg://resume_app:resume_app_dev_pw@localhost:5432/resume_analyzer_e2e"
    ),
    "SECRET_KEY": "e2e-secret-key-long-enough-for-hs256-signing-only",
    "AI_PROVIDER": "mock",
    "AI_API_KEY": "",
    "UPLOAD_DIR": tempfile.mkdtemp(prefix="resume-e2e-"),
    "FRONTEND_ORIGINS": "http://127.0.0.1:3100",
    "LOGIN_RATE_LIMIT_PER_MINUTE": "100",
    "AI_RATE_LIMIT_PER_MINUTE": "100",
}

reset = (
    "from sqlalchemy import create_engine, text; import os; "
    "e = create_engine(os.environ['DATABASE_URL']); "
    "c = e.connect(); c.execute(text('DROP SCHEMA public CASCADE; CREATE SCHEMA public;')); c.commit()"
)
subprocess.run([sys.executable, "-c", reset], cwd=BACKEND, env=env, check=True)
subprocess.run([sys.executable, "-m", "alembic", "upgrade", "head"], cwd=BACKEND, env=env, check=True)
port = os.environ.get("E2E_API_PORT", "8100")
sys.exit(subprocess.call([sys.executable, "-m", "uvicorn", "app.main:app", "--port", port], cwd=BACKEND, env=env))
