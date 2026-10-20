import re
import uuid
from typing import Annotated

from fastapi import APIRouter, File, Form, Query, Response, UploadFile, status
from fastapi.responses import FileResponse

from app.api.deps import CurrentUser, DbSession, Pagination
from app.core.config import get_settings
from app.core.errors import NotFoundError, PayloadTooLargeError
from app.core.rate_limit import rate_limiter
from app.models import Resume, ResumeVersion
from app.repositories import analyses as analysis_repo
from app.repositories import resumes as repo
from app.schemas.common import Page
from app.schemas.feedback import FeedbackOut
from app.schemas.resume import (
    ResumeDetail,
    ResumeOut,
    ResumeTextOut,
    ResumeUpdate,
    ResumeUploadResult,
    ResumeVersionOut,
    ResumeVersionSummary,
    VersionComparison,
    VersionCreate,
    VersionUpdate,
)
from app.schemas.resume_data import ResumeData
from app.services import coaching_service, export_service, resume_service, storage

router = APIRouter(prefix="/resumes", tags=["Resumes"])
UPLOAD_CHUNK = 1024 * 256


def _sorted_versions(resume: Resume) -> list[ResumeVersion]:
    return sorted(resume.versions, key=lambda v: v.version_number)


def _resume_out(resume: Resume) -> ResumeOut:
    versions = _sorted_versions(resume)
    return ResumeOut(
        id=resume.id,
        title=resume.title,
        original_filename=resume.original_filename,
        content_type=resume.content_type,
        file_size=resume.file_size,
        page_count=resume.page_count,
        created_at=resume.created_at,
        updated_at=resume.updated_at,
        version_count=len(versions),
        latest_version=ResumeVersionSummary.model_validate(versions[-1]) if versions else None,
    )


def _resume_detail(resume: Resume, warnings: list[str] | None = None) -> ResumeDetail:
    return ResumeDetail(
        **_resume_out(resume).model_dump(),
        parse_warnings=warnings or [],
        versions=[ResumeVersionSummary.model_validate(v) for v in _sorted_versions(resume)],
    )


def _version_in(db: DbSession, user_id: uuid.UUID, resume_id: uuid.UUID, version_id: uuid.UUID) -> ResumeVersion:
    version = repo.get_owned_version(db, user_id, version_id)
    if version.resume_id != resume_id:
        raise NotFoundError("Resume version not found.")
    return version


async def _read_limited(file: UploadFile, limit: int) -> bytes:
    chunks: list[bytes] = []
    size = 0
    while chunk := await file.read(UPLOAD_CHUNK):
        size += len(chunk)
        if size > limit:
            raise PayloadTooLargeError(f"Files must be smaller than {limit // (1024 * 1024)} MB.")
        chunks.append(chunk)
    return b"".join(chunks)


@router.post(
    "",
    response_model=ResumeUploadResult,
    status_code=status.HTTP_201_CREATED,
    summary="Upload a PDF or DOCX resume; text is extracted and parsed locally",
)
async def upload_resume(
    user: CurrentUser,
    db: DbSession,
    file: Annotated[UploadFile, File()],
    title: Annotated[str | None, Form(max_length=150)] = None,
) -> ResumeUploadResult:
    settings = get_settings()
    rate_limiter.hit(
        f"upload:{user.id}", settings.upload_rate_limit_per_hour, 3600, "Upload limit reached. Please try again later."
    )
    content = await _read_limited(file, settings.max_upload_bytes)
    resume, version, warnings = resume_service.upload_resume(db, user, file.filename or "resume", content, title)
    return ResumeUploadResult(
        resume=_resume_detail(resume, warnings), version=ResumeVersionOut.model_validate(version), warnings=warnings
    )


@router.get("", response_model=Page[ResumeOut])
def list_resumes(
    user: CurrentUser, db: DbSession, pagination: Pagination, q: Annotated[str | None, Query(max_length=100)] = None
) -> Page[ResumeOut]:
    rows, total = repo.list_resumes(db, user.id, q=q, offset=pagination.offset, limit=pagination.page_size)
    return Page(items=[_resume_out(r) for r in rows], total=total, page=pagination.page, page_size=pagination.page_size)


@router.get("/{resume_id}", response_model=ResumeDetail)
def get_resume(resume_id: uuid.UUID, user: CurrentUser, db: DbSession) -> ResumeDetail:
    return _resume_detail(repo.get_owned_resume(db, user.id, resume_id))


@router.patch("/{resume_id}", response_model=ResumeDetail, summary="Rename a resume")
def update_resume(resume_id: uuid.UUID, payload: ResumeUpdate, user: CurrentUser, db: DbSession) -> ResumeDetail:
    resume = repo.get_owned_resume(db, user.id, resume_id)
    resume.title = payload.title.strip()
    db.commit()
    db.refresh(resume)
    return _resume_detail(resume)


@router.delete(
    "/{resume_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Delete a resume, its file, versions and analyses"
)
def delete_resume(resume_id: uuid.UUID, user: CurrentUser, db: DbSession) -> Response:
    resume_service.delete_resume(db, repo.get_owned_resume(db, user.id, resume_id))
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/{resume_id}/file", summary="Download the originally uploaded file")
def download_original(resume_id: uuid.UUID, user: CurrentUser, db: DbSession) -> FileResponse:
    resume = repo.get_owned_resume(db, user.id, resume_id)
    path = storage.path_for(user.id, resume.stored_filename)
    if not path.exists():
        raise NotFoundError("The original file is no longer available.")
    return FileResponse(
        path,
        media_type=resume.content_type,
        filename=resume.original_filename,
        headers={"Cache-Control": "private, no-store"},
    )


@router.get("/{resume_id}/text", response_model=ResumeTextOut, summary="Raw text extracted at upload")
def extracted_text(resume_id: uuid.UUID, user: CurrentUser, db: DbSession) -> ResumeTextOut:
    return ResumeTextOut(raw_text=repo.get_owned_resume(db, user.id, resume_id).raw_text)


@router.post(
    "/{resume_id}/reparse",
    response_model=ResumeVersionOut,
    status_code=status.HTTP_201_CREATED,
    summary="Parse the original text again into a new version",
)
def reparse(resume_id: uuid.UUID, user: CurrentUser, db: DbSession) -> ResumeVersion:
    return resume_service.reparse(db, repo.get_owned_resume(db, user.id, resume_id))


@router.post("/{resume_id}/versions", response_model=ResumeVersionOut, status_code=status.HTTP_201_CREATED)
def create_version(resume_id: uuid.UUID, payload: VersionCreate, user: CurrentUser, db: DbSession) -> ResumeVersion:
    resume = repo.get_owned_resume(db, user.id, resume_id)
    return resume_service.create_version(db, resume, payload.label, payload.source, payload.data)


@router.get("/{resume_id}/versions/compare", response_model=VersionComparison)
def compare_versions(
    resume_id: uuid.UUID, base: uuid.UUID, target: uuid.UUID, user: CurrentUser, db: DbSession
) -> VersionComparison:
    base_v = _version_in(db, user.id, resume_id, base)
    target_v = _version_in(db, user.id, resume_id, target)
    sections = resume_service.compare_versions(
        ResumeData.model_validate(base_v.data), ResumeData.model_validate(target_v.data)
    )
    return VersionComparison(
        base=ResumeVersionSummary.model_validate(base_v),
        target=ResumeVersionSummary.model_validate(target_v),
        sections=sections,
    )


@router.get("/{resume_id}/versions/{version_id}", response_model=ResumeVersionOut)
def get_version(resume_id: uuid.UUID, version_id: uuid.UUID, user: CurrentUser, db: DbSession) -> ResumeVersion:
    return _version_in(db, user.id, resume_id, version_id)


@router.patch("/{resume_id}/versions/{version_id}", response_model=ResumeVersionOut)
def update_version(
    resume_id: uuid.UUID, version_id: uuid.UUID, payload: VersionUpdate, user: CurrentUser, db: DbSession
) -> ResumeVersion:
    version = _version_in(db, user.id, resume_id, version_id)
    return resume_service.update_version(db, version, payload.label, payload.data)


@router.delete("/{resume_id}/versions/{version_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_version(resume_id: uuid.UUID, version_id: uuid.UUID, user: CurrentUser, db: DbSession) -> Response:
    resume = repo.get_owned_resume(db, user.id, resume_id)
    resume_service.delete_version(db, resume, _version_in(db, user.id, resume_id, version_id))
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get(
    "/{resume_id}/versions/{version_id}/export.pdf",
    summary="Export a version as PDF",
    response_class=Response,
    responses={200: {"content": {"application/pdf": {}}}},
)
def export_pdf(resume_id: uuid.UUID, version_id: uuid.UUID, user: CurrentUser, db: DbSession) -> Response:
    version = _version_in(db, user.id, resume_id, version_id)
    pdf = export_service.render_pdf(ResumeData.model_validate(version.data))
    slug = re.sub(r"[^A-Za-z0-9]+", "-", f"{version.resume.title}-v{version.version_number}").strip("-")[:80]
    return Response(
        pdf,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="{slug or "resume"}.pdf"',
            "Cache-Control": "private, no-store",
        },
    )


@router.get(
    "/{resume_id}/versions/{version_id}/feedback",
    response_model=list[FeedbackOut],
    summary="Feedback reports generated for this version",
)
def version_feedback(
    resume_id: uuid.UUID, version_id: uuid.UUID, user: CurrentUser, db: DbSession
) -> list[FeedbackOut]:
    version = _version_in(db, user.id, resume_id, version_id)
    return [coaching_service.feedback_out(f) for f in analysis_repo.list_feedback_for_version(db, user.id, version.id)]
