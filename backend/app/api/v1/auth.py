from typing import Annotated

from fastapi import APIRouter, Depends, Request, Response, status
from fastapi.security import OAuth2PasswordRequestForm

from app.api.deps import CurrentUser, DbSession
from app.api.session_cookie import clear_session_cookie, set_session_cookie
from app.core.config import get_settings
from app.core.rate_limit import rate_limiter
from app.core.security import create_access_token
from app.models import User
from app.schemas.auth import (
    LoginRequest,
    PasswordResetConfirm,
    PasswordResetRequest,
    RegisterRequest,
    TokenResponse,
    UserOut,
)
from app.schemas.common import MessageResponse
from app.services import auth_service

router = APIRouter(prefix="/auth", tags=["Authentication"])


def _client_ip(request: Request) -> str:
    return request.client.host if request.client else "unknown"


def _limit_login(request: Request, email: str) -> None:
    limit = get_settings().login_rate_limit_per_minute
    rate_limiter.hit(
        f"login:ip:{_client_ip(request)}", limit * 3, 60, "Too many sign-in attempts. Please wait a minute."
    )
    rate_limiter.hit(f"login:email:{email.lower()}", limit, 60, "Too many sign-in attempts. Please wait a minute.")


@router.post("/register", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def register(payload: RegisterRequest, request: Request, response: Response, db: DbSession) -> User:
    rate_limiter.hit(f"register:{_client_ip(request)}", 10, 3600, "Too many accounts created. Try again later.")
    user = auth_service.register(db, payload)
    set_session_cookie(response, user)
    return user


@router.post("/login", response_model=UserOut, summary="Sign in and receive an httpOnly session cookie")
def login(payload: LoginRequest, request: Request, response: Response, db: DbSession) -> User:
    _limit_login(request, payload.email)
    user = auth_service.authenticate(db, payload.email, payload.password)
    set_session_cookie(response, user)
    return user


@router.post("/token", response_model=TokenResponse, summary="OAuth2 password flow (for Swagger UI and API clients)")
def token(form: Annotated[OAuth2PasswordRequestForm, Depends()], request: Request, db: DbSession) -> TokenResponse:
    _limit_login(request, form.username)
    user = auth_service.authenticate(db, form.username, form.password)
    return TokenResponse(access_token=create_access_token(user.id, user.token_version))


@router.post("/logout", response_model=MessageResponse)
def logout(response: Response) -> MessageResponse:
    clear_session_cookie(response)
    return MessageResponse(message="Signed out.")


@router.get("/me", response_model=UserOut)
def me(user: CurrentUser) -> User:
    return user


@router.post("/password-reset/request", response_model=MessageResponse, status_code=status.HTTP_202_ACCEPTED)
def password_reset_request(payload: PasswordResetRequest, request: Request, db: DbSession) -> MessageResponse:
    rate_limiter.hit(f"reset:{_client_ip(request)}", 5, 3600, "Too many reset requests. Try again later.")
    auth_service.request_password_reset(db, payload.email)
    return MessageResponse(message="If an account exists for that email, a reset link has been sent.")


@router.post("/password-reset/confirm", response_model=MessageResponse)
def password_reset_confirm(payload: PasswordResetConfirm, request: Request, db: DbSession) -> MessageResponse:
    rate_limiter.hit(f"reset-confirm:{_client_ip(request)}", 10, 3600, "Too many attempts. Try again later.")
    auth_service.confirm_password_reset(db, payload.token, payload.new_password)
    return MessageResponse(message="Your password has been reset. Please sign in.")
