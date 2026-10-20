"""Seed an explicitly labeled DEMO account with fictional sample data.

Usage (from backend/):  python -m scripts.seed_demo
Creates demo@example.com / DemoPassword1 with the fictional "Alex Rivera" resume, two sample jobs
and analyses. Every title is prefixed with [Demo]. Refuses to run when ENVIRONMENT=production.
"""

import sys
from pathlib import Path

from app.core.config import get_settings
from app.db.session import SessionLocal
from app.schemas.analysis import AnalysisCreate
from app.schemas.auth import RegisterRequest
from app.schemas.job import JobCreate
from app.services import analysis_service, auth_service, job_service, resume_service

FIXTURES = Path(__file__).resolve().parents[1] / "tests" / "fixtures"
DEMO_EMAIL = "demo@example.com"
DEMO_PASSWORD = "DemoPassword1"

DATA_JOB = """Data Engineer

Responsibilities
- Build batch and streaming data pipelines with Spark and Kafka
- Model data in Snowflake and maintain dbt transformations
- Monitor pipeline reliability and data quality

Requirements
- 3+ years of experience as a data engineer
- Strong Python and SQL
- Experience with Airflow

Nice to have
- Experience with AWS and Terraform
"""


def main() -> None:
    if get_settings().environment == "production":
        sys.exit("Refusing to seed demo data in production.")
    with SessionLocal() as db:
        if auth_service.get_user_by_email(db, DEMO_EMAIL):
            sys.exit(f"{DEMO_EMAIL} already exists; delete the account in Settings to re-seed.")
        user = auth_service.register(
            db, RegisterRequest(email=DEMO_EMAIL, full_name="Demo User", password=DEMO_PASSWORD)
        )
        _, version, _ = resume_service.upload_resume(
            db,
            user,
            "sample_resume.pdf",
            (FIXTURES / "sample_resume.pdf").read_bytes(),
            "[Demo] Alex Rivera (fictional)",
        )
        jobs = [
            job_service.create_job(
                db,
                user,
                JobCreate(
                    title="[Demo] Senior Full-Stack Engineer",
                    company="Sample Company",
                    description=(FIXTURES / "sample_job.txt").read_text(encoding="utf-8"),
                ),
            ),
            job_service.create_job(
                db, user, JobCreate(title="[Demo] Data Engineer", company="Sample Company", description=DATA_JOB)
            ),
        ]
        analysis_service.run_analyses(
            db,
            user,
            AnalysisCreate(resume_version_id=version.id, job_ids=[j.id for j in jobs], include_ai_insights=True),
        )
    print(f"Demo account ready: {DEMO_EMAIL} / {DEMO_PASSWORD}  (fictional sample data)")


if __name__ == "__main__":
    main()
