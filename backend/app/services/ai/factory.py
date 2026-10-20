from functools import lru_cache

from app.core.config import get_settings
from app.services.ai.base import AIProvider
from app.services.ai.mock_provider import MockAIProvider
from app.services.ai.openai_provider import OpenAIProvider


@lru_cache
def get_ai_provider() -> AIProvider:
    settings = get_settings()
    if settings.ai_provider == "openai" and settings.ai_api_key:
        return OpenAIProvider(
            api_key=settings.ai_api_key,
            model=settings.ai_model,
            base_url=settings.ai_base_url,
            timeout=settings.ai_timeout_seconds,
            max_retries=settings.ai_max_retries,
        )
    return MockAIProvider()
