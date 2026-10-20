"""Local file storage for uploaded resumes.

Files are stored under UPLOAD_DIR/<user_id>/<random name>. User-supplied filenames are never used in
paths. Swap this module for object storage (S3, GCS) in multi-instance deployments.
"""

import shutil
import uuid
from contextlib import suppress
from pathlib import Path

from app.core.config import get_settings


def _root() -> Path:
    root = get_settings().upload_dir.resolve()
    root.mkdir(parents=True, exist_ok=True)
    return root


def _user_dir(user_id: uuid.UUID) -> Path:
    return _root() / user_id.hex


def save(user_id: uuid.UUID, content: bytes, extension: str) -> str:
    directory = _user_dir(user_id)
    directory.mkdir(parents=True, exist_ok=True)
    name = f"{uuid.uuid4().hex}.{extension}"
    (directory / name).write_bytes(content)
    return name


def path_for(user_id: uuid.UUID, stored_name: str) -> Path:
    path = (_user_dir(user_id) / stored_name).resolve()
    if path.parent != _user_dir(user_id).resolve():
        raise ValueError("Invalid stored file path")
    return path


def delete(user_id: uuid.UUID, stored_name: str) -> None:
    with suppress(ValueError):
        path_for(user_id, stored_name).unlink(missing_ok=True)


def delete_user_files(user_id: uuid.UUID) -> None:
    shutil.rmtree(_user_dir(user_id), ignore_errors=True)
