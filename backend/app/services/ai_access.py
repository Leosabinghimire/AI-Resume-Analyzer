"""Gatekeeping for AI calls: user consent for external providers and per-user rate limits."""

from app.core.config import get_settings
from app.core.errors import PermissionDeniedError
from app.core.rate_limit import rate_limiter
from app.models import User
from app.services.ai.base import AIProvider


def needs_consent(user: User, provider: AIProvider) -> bool:
    return not provider.is_mock and not user.ai_processing_consent


def require_ai_access(user: User, provider: AIProvider) -> None:
    if needs_consent(user, provider):
        raise PermissionDeniedError(
            "AI analysis sends a redacted copy of your resume to an external AI provider. "
            "Enable AI processing in Settings to continue.",
            code="ai_consent_required",
        )
    enforce_ai_rate_limit(user)


def enforce_ai_rate_limit(user: User) -> None:
    settings = get_settings()
    rate_limiter.hit(
        f"ai:minute:{user.id}",
        settings.ai_rate_limit_per_minute,
        60,
        "You are sending AI requests too quickly. Please wait a minute.",
    )
    rate_limiter.hit(
        f"ai:day:{user.id}", settings.ai_rate_limit_per_day, 86400, "You have reached today's AI usage limit."
    )
