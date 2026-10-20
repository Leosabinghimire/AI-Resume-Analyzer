from fastapi import APIRouter

from app.api.v1 import analyses, auth, coaching, dashboard, jobs, resumes, users

api_router = APIRouter()
for module in (auth, users, resumes, jobs, analyses, coaching, dashboard):
    api_router.include_router(module.router)
