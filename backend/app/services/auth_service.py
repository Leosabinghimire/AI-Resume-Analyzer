import uuid
from datetime import UTC, datetime, timedelta

from sqlalchemy import select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.errors import AppError, AuthenticationError, ConflictError
from app.core.security import generate_reset_token, hash_password, hash_token, verify_password
from app.models import PasswordResetToken, User
from app.schemas.auth import RegisterRequest
from app.services import email, storage

# Verifying against a dummy hash for unknown emails keeps login timing uniform (no user enumeration).
_DUMMY_HASH = hash_password("timing-equalizer-password-1")


def get_user_by_email(db: Session, email_address: str) -> User | None:
    return db.scalar(select(User).where(User.email == email_address.lower()))


def register(db: Session, data: RegisterRequest) -> User:
    if get_user_by_email(db, data.email):
        raise ConflictError("An account with this email already exists.", code="email_taken")
    user = User(email=data.email.lower(), full_name=data.full_name, password_hash=hash_password(data.password))
    db.add(user)
    try:
        db.commit()
    except IntegrityError as exc:  # concurrent registration with the same email
        db.rollback()
        raise ConflictError("An account with this email already exists.", code="email_taken") from exc
    db.refresh(user)
    return user


def authenticate(db: Session, email_address: str, password: str) -> User:
    user = get_user_by_email(db, email_address)
    if user is None:
        verify_password(password, _DUMMY_HASH)
        raise AuthenticationError("Incorrect email or password.", code="invalid_credentials")
    if not verify_password(password, user.password_hash):
        raise AuthenticationError("Incorrect email or password.", code="invalid_credentials")
    return user


def request_password_reset(db: Session, email_address: str) -> None:
    """Always succeeds from the caller's perspective so the endpoint does not reveal registered emails."""
    user = get_user_by_email(db, email_address)
    if user is None:
        return
    settings = get_settings()
    now = datetime.now(UTC)
    db.execute(
        update(PasswordResetToken)
        .where(PasswordResetToken.user_id == user.id, PasswordResetToken.used_at.is_(None))
        .values(used_at=now)
    )
    raw, token_hash = generate_reset_token()
    db.add(
        PasswordResetToken(
            user_id=user.id,
            token_hash=token_hash,
            created_at=now,
            expires_at=now + timedelta(minutes=settings.password_reset_token_minutes),
        )
    )
    db.commit()
    email.send_password_reset(user.email, f"{settings.frontend_base_url}/reset-password?token={raw}")


def confirm_password_reset(db: Session, raw_token: str, new_password: str) -> None:
    record = db.scalar(select(PasswordResetToken).where(PasswordResetToken.token_hash == hash_token(raw_token)))
    now = datetime.now(UTC)
    expires = record.expires_at.replace(tzinfo=record.expires_at.tzinfo or UTC) if record else None
    if record is None or record.used_at is not None or expires is None or expires < now:
        raise AppError("This reset link is invalid or has expired.", code="invalid_reset_token")
    user = db.get(User, record.user_id)
    if user is None:
        raise AppError("This reset link is invalid or has expired.", code="invalid_reset_token")
    user.password_hash = hash_password(new_password)
    user.token_version += 1
    record.used_at = now
    db.commit()


def change_password(db: Session, user: User, current: str, new: str) -> User:
    if not verify_password(current, user.password_hash):
        raise AuthenticationError("Your current password is incorrect.", code="invalid_credentials")
    user.password_hash = hash_password(new)
    user.token_version += 1
    db.commit()
    db.refresh(user)
    return user


def set_ai_consent(db: Session, user: User, consent: bool) -> None:
    user.ai_processing_consent = consent
    user.ai_consent_at = datetime.now(UTC) if consent else None


def delete_account(db: Session, user: User, password: str) -> None:
    if not verify_password(password, user.password_hash):
        raise AuthenticationError("Password is incorrect.", code="invalid_credentials")
    user_id: uuid.UUID = user.id
    db.delete(user)  # rows cascade via foreign keys
    db.commit()
    storage.delete_user_files(user_id)
