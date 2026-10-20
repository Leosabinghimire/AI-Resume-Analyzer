import uuid
from typing import Annotated

from fastapi import Depends, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.errors import AuthenticationError, PermissionDeniedError
from app.core.security import decode_access_token
from app.db.session import get_db
from app.models import User
from app.schemas.common import PaginationParams

UNSAFE_METHODS = {"POST", "PUT", "PATCH", "DELETE"}
CSRF_HEADER = "x-requested-with"

_bearer = HTTPBearer(auto_error=False, description="JWT from POST /api/v1/auth/token")

DbSession = Annotated[Session, Depends(get_db)]


def get_current_user(
    request: Request, db: DbSession, credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(_bearer)]
) -> User:
    settings = get_settings()
    if credentials is not None:
        token = credentials.credentials
    else:
        token = request.cookies.get(settings.cookie_name, "")
        # Cookie-authenticated writes must carry a custom header. Browsers cannot add it cross-site
        # without a CORS preflight, which this API rejects for untrusted origins (CSRF defence in
        # depth alongside SameSite=Lax cookies).
        if token and request.method in UNSAFE_METHODS and not request.headers.get(CSRF_HEADER):
            raise PermissionDeniedError("Missing CSRF protection header.", code="csrf_failed")
    if not token:
        raise AuthenticationError("Please sign in to continue.")
    payload = decode_access_token(token)
    if payload is None:
        raise AuthenticationError("Your session has expired. Please sign in again.", code="session_expired")
    try:
        user_id = uuid.UUID(str(payload["sub"]))
    except ValueError as exc:
        raise AuthenticationError("Invalid session.", code="session_expired") from exc
    user = db.get(User, user_id)
    if user is None or user.token_version != payload.get("ver"):
        raise AuthenticationError("Your session has expired. Please sign in again.", code="session_expired")
    return user


CurrentUser = Annotated[User, Depends(get_current_user)]
Pagination = Annotated[PaginationParams, Depends()]
