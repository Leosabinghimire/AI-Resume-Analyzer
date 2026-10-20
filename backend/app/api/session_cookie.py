from fastapi import Response

from app.core.config import get_settings
from app.core.security import create_access_token
from app.models import User


def set_session_cookie(response: Response, user: User) -> None:
    settings = get_settings()
    response.set_cookie(
        settings.cookie_name,
        create_access_token(user.id, user.token_version),
        max_age=settings.access_token_expire_minutes * 60,
        httponly=True,
        secure=settings.cookie_secure,
        samesite="lax",
        path="/",
    )


def clear_session_cookie(response: Response) -> None:
    settings = get_settings()
    response.delete_cookie(settings.cookie_name, path="/", httponly=True, secure=settings.cookie_secure, samesite="lax")
