import uuid
from datetime import datetime

from pydantic import BaseModel, EmailStr, Field, field_validator

from app.schemas.common import ORMModel


def _validate_password_strength(value: str) -> str:
    if not any(c.isalpha() for c in value) or not any(c.isdigit() for c in value):
        raise ValueError("Password must contain at least one letter and one number")
    return value


class RegisterRequest(BaseModel):
    email: EmailStr
    full_name: str = Field(min_length=1, max_length=120)
    password: str = Field(min_length=8, max_length=128)

    _strength = field_validator("password")(_validate_password_strength)

    @field_validator("full_name")
    @classmethod
    def _strip_name(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Name is required")
        return v.strip()


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"  # noqa: S105


class PasswordResetRequest(BaseModel):
    email: EmailStr


class PasswordResetConfirm(BaseModel):
    token: str = Field(min_length=10, max_length=200)
    new_password: str = Field(min_length=8, max_length=128)

    _strength = field_validator("new_password")(_validate_password_strength)


class ChangePasswordRequest(BaseModel):
    current_password: str = Field(min_length=1, max_length=128)
    new_password: str = Field(min_length=8, max_length=128)

    _strength = field_validator("new_password")(_validate_password_strength)


class UserOut(ORMModel):
    id: uuid.UUID
    email: str
    full_name: str
    ai_processing_consent: bool
    ai_consent_at: datetime | None
    created_at: datetime


class UserUpdate(BaseModel):
    full_name: str | None = Field(default=None, min_length=1, max_length=120)
    ai_processing_consent: bool | None = None


class DeleteAccountRequest(BaseModel):
    password: str = Field(min_length=1, max_length=128)


class AIConfigOut(BaseModel):
    provider: str
    model: str
    is_mock: bool
    is_external: bool
    requires_consent: bool
