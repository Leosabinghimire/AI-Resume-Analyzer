import json

import httpx
import pytest
from fastapi.testclient import TestClient

from app.core.errors import AIServiceError
from app.schemas.ai import MatchInsights, ResumeFeedbackAI, SummarySuggestion, TransferableSkill, WeakBullet
from app.schemas.analysis import MatchResult
from app.schemas.job import JobParsed
from app.schemas.resume_data import ContactInfo, ExperienceItem, ResumeData
from app.services import analysis_service, coaching_service
from app.services.ai.base import JobContext, MatchInsightsContext
from app.services.ai.guardrails import ground_feedback, ground_match_insights
from app.services.ai.mock_provider import MockAIProvider, rewrite_bullet
from app.services.ai.openai_provider import OpenAIProvider, to_strict_schema
from app.services.ai.redaction import redact_resume
from app.services.matching.engine import JobRequirements, match_resume_to_job
from tests.conftest import create_job, upload

RESUME = ResumeData(
    contact=ContactInfo(name="Jordan Lee", email="jordan@example.com", phone="+1 555 123 4567"),
    summary="Jordan Lee is a backend developer. Contact jordan@example.com or github.com/jlee.",
    skills=["Python", "Django"],
    experience=[
        ExperienceItem(
            title="Developer",
            company="Acme",
            bullets=[
                "Responsible for building Django APIs for the billing team",
                "Reduced report generation time by 40% using PostgreSQL indexes",
            ],
        )
    ],
)
VALID_INSIGHTS = {
    "summary": "Good fit.",
    "strengths": ["Django APIs"],
    "gaps": [],
    "recommendations": [],
    "transferable_skills": [
        {
            "missing_skill": "FastAPI",
            "related_evidence": "building Django APIs",
            "explanation": "Both are Python web frameworks.",
        }
    ],
}


def _ctx() -> MatchInsightsContext:
    match = match_resume_to_job(RESUME, JobRequirements(["Python", "FastAPI"], [], JobParsed()))
    return MatchInsightsContext(redact_resume(RESUME), JobContext("Backend", None, "desc", ["Python"], []), match)


def _provider(handler) -> OpenAIProvider:  # type: ignore[no-untyped-def]
    return OpenAIProvider(
        api_key="test",
        model="test-model",
        base_url="https://ai.test/v1",
        timeout=5,
        max_retries=1,
        transport=httpx.MockTransport(handler),
    )


def _completion(content: dict) -> httpx.Response:  # type: ignore[type-arg]
    return httpx.Response(200, json={"choices": [{"message": {"content": json.dumps(content)}}]})


def test_strict_schema_closes_objects_and_requires_all_fields() -> None:
    schema = to_strict_schema(ResumeFeedbackAI)
    assert schema["additionalProperties"] is False
    assert set(schema["required"]) == set(ResumeFeedbackAI.model_fields)
    weak = schema["$defs"]["WeakBullet"]
    assert weak["additionalProperties"] is False and "maxLength" not in weak["properties"]["original"]


def test_openai_provider_sends_redacted_prompt_and_validates_output() -> None:
    seen: dict[str, object] = {}

    def handler(request: httpx.Request) -> httpx.Response:
        body = json.loads(request.content)
        seen["body"] = body
        seen["auth"] = request.headers["authorization"]
        return _completion(VALID_INSIGHTS)

    result = _provider(handler).match_insights(_ctx())
    assert isinstance(result, MatchInsights) and result.summary == "Good fit."
    prompt = json.dumps(seen["body"])
    assert "jordan@example.com" not in prompt and "Jordan" not in prompt and "555 123" not in prompt
    assert seen["body"]["response_format"]["json_schema"]["strict"] is True  # type: ignore[index]
    assert seen["auth"] == "Bearer test"


def test_openai_provider_rejects_invalid_json_shape() -> None:
    provider = _provider(lambda r: _completion({"summary": "missing fields"}))
    with pytest.raises(AIServiceError) as exc:
        provider.match_insights(_ctx())
    assert exc.value.code == "ai_invalid_response"


def test_openai_provider_retries_then_reports_rate_limit() -> None:
    calls = {"n": 0}

    def handler(request: httpx.Request) -> httpx.Response:
        calls["n"] += 1
        return httpx.Response(429, headers={"retry-after": "0"}, json={"error": "slow down"})

    with pytest.raises(AIServiceError) as exc:
        _provider(handler).match_insights(_ctx())
    assert exc.value.code == "ai_rate_limited" and calls["n"] == 2


def test_openai_provider_timeout() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        raise httpx.ReadTimeout("timed out", request=request)

    with pytest.raises(AIServiceError) as exc:
        _provider(handler).match_insights(_ctx())
    assert exc.value.code == "ai_timeout"


def test_openai_provider_recovers_after_transient_error() -> None:
    responses = iter([httpx.Response(503), _completion(VALID_INSIGHTS)])
    assert _provider(lambda r: next(responses)).match_insights(_ctx()).summary == "Good fit."


def test_redaction_removes_identifiers() -> None:
    redacted = redact_resume(RESUME)
    text = redacted.to_text()
    assert redacted.contact == ContactInfo()
    assert "jordan@example.com" not in text and "github.com" not in text and "Jordan" not in text
    assert "[EMAIL]" in redacted.summary and "[NAME]" in redacted.summary
    assert "40%" in text  # ordinary numbers survive


def test_guardrails_drop_fabricated_quotes_and_flag_new_facts() -> None:
    feedback = ResumeFeedbackAI(
        overall_summary="ok",
        structure_feedback=[],
        readability_feedback=[],
        keyword_recommendations=[],
        grammar_suggestions=[],
        checklist=[],
        weak_bullets=[
            WeakBullet(
                original="Responsible for building Django APIs for the billing team",
                issues=["vague"],
                suggestion="Built Django APIs for the billing team",
                requires_verification=False,
            ),
            WeakBullet(
                original="Managed a team of 12 engineers at Google",
                issues=["x"],
                suggestion="Led 12 engineers",
                requires_verification=False,
            ),
            WeakBullet(
                original="responsible for building django apis for the billing team.",
                issues=["vague"],
                suggestion="Built Django APIs serving 2M users with Kubernetes",
                requires_verification=False,
            ),
        ],
        summary_suggestion=SummarySuggestion(
            suggested_summary="Backend developer with 10 years of experience",
            rationale="r",
            requires_verification=False,
        ),
    )
    grounded = ground_feedback(feedback, RESUME)
    assert len(grounded.weak_bullets) == 2  # the invented Google bullet is removed
    assert grounded.weak_bullets[0].requires_verification is False
    assert grounded.weak_bullets[1].requires_verification is True  # adds "2M" and Kubernetes
    assert grounded.summary_suggestion and grounded.summary_suggestion.requires_verification is True


def test_guardrails_drop_unsupported_transferable_skills() -> None:
    insights = MatchInsights(
        summary="s",
        strengths=[],
        gaps=[],
        recommendations=[],
        transferable_skills=[
            TransferableSkill(missing_skill="FastAPI", related_evidence="building Django APIs", explanation="e"),
            TransferableSkill(missing_skill="Go", related_evidence="wrote Go microservices at Uber", explanation="e"),
        ],
    )
    assert [t.missing_skill for t in ground_match_insights(insights, RESUME).transferable_skills] == ["FastAPI"]


def test_mock_rewrite_never_invents_numbers() -> None:
    suggestion, verify = rewrite_bullet("Responsible for building Django APIs")
    assert suggestion.startswith("Built Django APIs") and verify and "[add" in suggestion
    suggestion, _ = rewrite_bullet("Responsible for code reviews for the platform team")
    assert suggestion.startswith("Owned code reviews for the platform team")
    suggestion, verify = rewrite_bullet("Reduced costs by 20% through caching")
    assert suggestion == "Reduced costs by 20% through caching" and not verify


class ExternalProvider(MockAIProvider):
    """Behaves like a real external provider for consent checks, without network calls."""

    name = "fake-external"
    is_mock = False


def test_external_ai_requires_consent(client: TestClient, sample_pdf: bytes, sample_job_text: str, monkeypatch) -> None:  # type: ignore[no-untyped-def]
    monkeypatch.setattr(coaching_service, "get_ai_provider", ExternalProvider)
    monkeypatch.setattr(analysis_service, "get_ai_provider", ExternalProvider)
    vid = upload(client, sample_pdf)["version"]["id"]
    job_id = create_job(client, sample_job_text)["id"]

    blocked = client.post("/api/v1/feedback", json={"resume_version_id": vid})
    assert blocked.status_code == 403 and blocked.json()["error"]["code"] == "ai_consent_required"
    analysis = client.post("/api/v1/analyses", json={"resume_version_id": vid, "job_ids": [job_id]}).json()[0]
    assert analysis["ai_status"] == "skipped_no_consent" and analysis["ai_insights"] is None
    assert analysis["overall_score"] > 0  # deterministic matching still works

    assert client.patch("/api/v1/users/me", json={"ai_processing_consent": True}).json()["ai_consent_at"]
    allowed = client.post("/api/v1/feedback", json={"resume_version_id": vid})
    assert allowed.status_code == 201 and allowed.json()["is_mock"] is False


def test_ai_failure_keeps_deterministic_analysis(
    client: TestClient, sample_pdf: bytes, sample_job_text: str, monkeypatch
) -> None:  # type: ignore[no-untyped-def]
    class Failing(MockAIProvider):
        def match_insights(self, ctx: MatchInsightsContext) -> MatchInsights:
            raise AIServiceError("The AI provider timed out. Please try again.", code="ai_timeout")

    monkeypatch.setattr(analysis_service, "get_ai_provider", Failing)
    vid = upload(client, sample_pdf)["version"]["id"]
    job_id = create_job(client, sample_job_text)["id"]
    analysis = client.post("/api/v1/analyses", json={"resume_version_id": vid, "job_ids": [job_id]}).json()[0]
    assert analysis["ai_status"] == "failed" and "timed out" in analysis["ai_message"]
    assert MatchResult.model_validate(analysis["match_result"]).overall_score == analysis["overall_score"]

    monkeypatch.setattr(analysis_service, "get_ai_provider", MockAIProvider)
    retried = client.post(f"/api/v1/analyses/{analysis['id']}/insights").json()
    assert retried["ai_status"] == "completed" and retried["ai_insights"]["summary"]


def test_ai_endpoints_are_rate_limited(client: TestClient, sample_pdf: bytes, monkeypatch) -> None:  # type: ignore[no-untyped-def]
    from app.core.config import get_settings

    monkeypatch.setattr(get_settings(), "ai_rate_limit_per_minute", 2)
    vid = upload(client, sample_pdf)["version"]["id"]
    codes = [client.post("/api/v1/feedback", json={"resume_version_id": vid}).status_code for _ in range(3)]
    assert codes == [201, 201, 429]
