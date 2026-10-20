from fastapi import APIRouter, Response, status

from app.api.deps import CurrentUser, DbSession
from app.api.session_cookie import clear_session_cookie, set_session_cookie
from app.models import User
from app.schemas.auth import AIConfigOut, ChangePasswordRequest, DeleteAccountRequest, UserOut, UserUpdate
from app.services import auth_service
from app.services.ai.factory import get_ai_provider

router = APIRouter(prefix="/users", tags=["User profile"])


@router.patch("/me", response_model=UserOut)
def update_me(payload: UserUpdate, user: CurrentUser, db: DbSession) -> User:
    if payload.full_name is not None:
        user.full_name = payload.full_name.strip()
    if payload.ai_processing_consent is not None:
        auth_service.set_ai_consent(db, user, payload.ai_processing_consent)
    db.commit()
    db.refresh(user)
    return user


@router.post("/me/password", response_model=UserOut)
def change_password(payload: ChangePasswordRequest, response: Response, user: CurrentUser, db: DbSession) -> User:
    user = auth_service.change_password(db, user, payload.current_password, payload.new_password)
    set_session_cookie(response, user)  # other sessions are invalidated; keep this one signed in
    return user


@router.delete(
    "/me",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Permanently delete the account, all resumes, files, jobs and analyses",
)
def delete_me(payload: DeleteAccountRequest, user: CurrentUser, db: DbSession) -> Response:
    auth_service.delete_account(db, user, payload.password)
    response = Response(status_code=status.HTTP_204_NO_CONTENT)
    clear_session_cookie(response)
    return response


@router.get("/ai-config", response_model=AIConfigOut, summary="Which AI provider processes requests")
def ai_config(user: CurrentUser) -> AIConfigOut:
    provider = get_ai_provider()
    return AIConfigOut(
        provider=provider.name,
        model=provider.model,
        is_mock=provider.is_mock,
        is_external=not provider.is_mock,
        requires_consent=not provider.is_mock and not user.ai_processing_consent,
    )
