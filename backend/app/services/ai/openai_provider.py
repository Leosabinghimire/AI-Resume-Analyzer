"""OpenAI-compatible Chat Completions provider using JSON-schema structured outputs.

Works with OpenAI and with other services exposing the same API (set AI_BASE_URL). Uses plain HTTP
so the provider has no SDK coupling; responses are always validated with Pydantic.
"""

import copy
import json
import logging
import time
from typing import Any, TypeVar

import httpx
from pydantic import BaseModel, ValidationError

from app.core.errors import AIServiceError
from app.schemas.ai import InterviewPrepAI, MatchInsights, ResumeFeedbackAI
from app.services.ai import prompts
from app.services.ai.base import AIProvider, FeedbackContext, InterviewContext, MatchInsightsContext

logger = logging.getLogger(__name__)
T = TypeVar("T", bound=BaseModel)
_UNSUPPORTED_KEYWORDS = ("default", "maxLength", "minLength", "maxItems", "minItems", "pattern", "format", "title")
RETRYABLE_STATUS = {408, 409, 429, 500, 502, 503, 504}


def to_strict_schema(model: type[BaseModel]) -> dict[str, Any]:
    """Convert a Pydantic JSON schema to the subset accepted by strict structured outputs:
    every object closed (additionalProperties false) with all properties required."""
    schema = copy.deepcopy(model.model_json_schema())

    def visit(node: Any) -> None:
        if isinstance(node, dict):
            for key in _UNSUPPORTED_KEYWORDS:
                node.pop(key, None)
            if node.get("type") == "object" and "properties" in node:
                node["additionalProperties"] = False
                node["required"] = list(node["properties"].keys())
                for prop in node["properties"].values():  # keys here are field names, not keywords
                    visit(prop)
            for key, value in node.items():
                if key != "properties":
                    visit(value)
        elif isinstance(node, list):
            for item in node:
                visit(item)

    visit(schema)
    return schema


class OpenAIProvider(AIProvider):
    name = "openai"
    is_mock = False

    def __init__(
        self,
        api_key: str,
        model: str,
        base_url: str,
        timeout: float,
        max_retries: int,
        transport: httpx.BaseTransport | None = None,
    ) -> None:
        self.model = model
        self._max_retries = max_retries
        self._client = httpx.Client(
            base_url=base_url.rstrip("/"),
            timeout=httpx.Timeout(timeout, connect=10.0),
            transport=transport,
            headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
        )

    def _generate(self, user_prompt: str, output: type[T]) -> T:
        payload = {
            "model": self.model,
            "messages": [
                {"role": "system", "content": prompts.SYSTEM_PROMPT},
                {"role": "user", "content": user_prompt},
            ],
            "response_format": {
                "type": "json_schema",
                "json_schema": {"name": output.__name__, "strict": True, "schema": to_strict_schema(output)},
            },
        }
        response = self._post_with_retries(payload)
        try:
            message = response.json()["choices"][0]["message"]
        except (ValueError, KeyError, IndexError) as exc:
            raise AIServiceError(
                "The AI provider returned an unexpected response.", code="ai_invalid_response"
            ) from exc
        if message.get("refusal"):
            raise AIServiceError("The AI provider declined to process this request.", code="ai_refused")
        try:
            return output.model_validate(json.loads(message.get("content") or ""))
        except (json.JSONDecodeError, ValidationError) as exc:
            logger.warning("AI response failed validation for %s", output.__name__)
            raise AIServiceError(
                "The AI response was incomplete or invalid. Please try again.", code="ai_invalid_response"
            ) from exc

    def _post_with_retries(self, payload: dict[str, Any]) -> httpx.Response:
        attempt = 0
        while True:
            try:
                response = self._client.post("/chat/completions", json=payload)
            except httpx.TimeoutException as exc:
                if attempt < self._max_retries:
                    attempt += 1
                    continue
                raise AIServiceError("The AI provider timed out. Please try again.", code="ai_timeout") from exc
            except httpx.HTTPError as exc:
                logger.warning("AI provider connection error: %s", type(exc).__name__)
                raise AIServiceError("Could not reach the AI provider.", code="ai_unavailable") from exc
            if response.status_code < 400:
                return response
            if response.status_code in RETRYABLE_STATUS and attempt < self._max_retries:
                attempt += 1
                time.sleep(min(2.0 * attempt, float(response.headers.get("retry-after", 2) or 2)))
                continue
            # Only the status code is logged; provider error bodies can echo prompt content.
            logger.warning("AI provider returned HTTP %s", response.status_code)
            if response.status_code == 429:
                raise AIServiceError(
                    "The AI provider is rate limiting requests. Please try again shortly.", code="ai_rate_limited"
                )
            if response.status_code in (401, 403):
                raise AIServiceError("The AI provider rejected the server's credentials.", code="ai_auth_error")
            raise AIServiceError("The AI provider could not complete the request.", code="ai_unavailable")

    def match_insights(self, ctx: MatchInsightsContext) -> MatchInsights:
        return self._generate(prompts.match_insights_prompt(ctx), MatchInsights)

    def resume_feedback(self, ctx: FeedbackContext) -> ResumeFeedbackAI:
        return self._generate(prompts.feedback_prompt(ctx), ResumeFeedbackAI)

    def interview_prep(self, ctx: InterviewContext) -> InterviewPrepAI:
        return self._generate(prompts.interview_prompt(ctx), InterviewPrepAI)
