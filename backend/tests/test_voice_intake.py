"""
E-Rakshak AI — Voice Emergency Intake Regression Tests

Tests the /api/voice-intake/extract endpoint with mocked Gemini responses
for deterministic unit tests, plus a clearly-marked live integration test.

Run with:  pytest tests/test_voice_intake.py -v
"""
import json
from unittest.mock import patch, MagicMock

import pytest
from httpx import AsyncClient


# ─── Helper: mock Gemini response ─────────────────────────────────────────────

def _mock_gemini_response(extracted: dict, missing: list | None = None,
                          uncertain: list | None = None, summary: str = ""):
    """Build a mock object that looks like google.generativeai response."""
    payload = {
        "extracted": extracted,
        "missing_required": missing or [],
        "uncertain_fields": uncertain or [],
        "summary": summary,
    }
    mock_resp = MagicMock()
    mock_resp.text = json.dumps(payload)
    return mock_resp


# ─── A. Route exists and is reachable ──────────────────────────────────────────

@pytest.mark.asyncio
async def test_voice_extract_route_exists(async_client: AsyncClient):
    """The /api/voice-intake/extract POST route must be registered."""
    # OPTIONS or an empty-body POST should return 422 (validation error)
    # — NOT 404.
    resp = await async_client.post("/api/voice-intake/extract", json={})
    assert resp.status_code != 404, "Voice extract route must be registered"


# ─── B. Valid transcript → structured data ─────────────────────────────────────

@pytest.mark.asyncio
async def test_valid_transcript_extraction(async_client: AsyncClient):
    """A valid transcript should return extracted structured fields."""
    fake_extracted = {
        "chief_complaint": "Road accident, head injury",
        "patient_name": "Rajesh Kumar",
        "patient_age": 55,
        "patient_gender": "MALE",
        "conscious": False,
        "bleeding": True,
        "city": "Raipur",
        "landmark": "Main bus stand",
        "source": "CALLER",
        "incident_description": "Father was in a road accident near bus stand.",
    }

    mock_resp = _mock_gemini_response(
        extracted=fake_extracted,
        summary="55-year-old male in road accident, head injury, unconscious.",
    )

    with patch("app.api.voice_intake.genai", create=True) as mock_genai:
        # Patch at the import location within the endpoint
        mock_model = MagicMock()
        mock_model.generate_content.return_value = mock_resp
        mock_genai.GenerativeModel.return_value = mock_model
        mock_genai.types.GenerationConfig = MagicMock()
        mock_genai.configure = MagicMock()

        # Also patch the lazy import inside the endpoint
        with patch.dict("sys.modules", {"google.generativeai": mock_genai}):
            with patch("app.core.config.settings") as mock_settings:
                mock_settings.GEMINI_API_KEY = "test-key-not-real"
                resp = await async_client.post(
                    "/api/voice-intake/extract",
                    json={"transcript": "My father was in a road accident near the main bus stand. Head bleeding, unconscious. Name Rajesh Kumar, 55 years old."},
                )

    assert resp.status_code == 200
    data = resp.json()
    assert "extracted" in data
    assert data["extracted"]["chief_complaint"] == "Road accident, head injury"
    assert data["extracted"]["patient_name"] == "Rajesh Kumar"
    assert data["extracted"]["patient_age"] == 55
    assert data["extracted"]["conscious"] is False
    assert data["extracted"]["bleeding"] is True


# ─── C. Empty transcript → validation error ───────────────────────────────────

@pytest.mark.asyncio
async def test_empty_transcript_rejected(async_client: AsyncClient):
    """An empty or too-short transcript should be rejected."""
    resp = await async_client.post(
        "/api/voice-intake/extract",
        json={"transcript": ""},
    )
    assert resp.status_code == 422  # Pydantic validation error


@pytest.mark.asyncio
async def test_very_short_transcript_rejected(async_client: AsyncClient):
    """A transcript shorter than 3 characters should be rejected."""
    resp = await async_client.post(
        "/api/voice-intake/extract",
        json={"transcript": "ab"},
    )
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_missing_transcript_field_rejected(async_client: AsyncClient):
    """Missing the transcript field entirely should return 422."""
    resp = await async_client.post(
        "/api/voice-intake/extract",
        json={"description": "some text"},
    )
    assert resp.status_code == 422


# ─── D. Missing mandatory fields → flagged ────────────────────────────────────

@pytest.mark.asyncio
async def test_missing_chief_complaint_flagged(async_client: AsyncClient):
    """When chief_complaint cannot be extracted, it should be in missing_required."""
    fake_extracted = {
        "patient_name": "Unknown caller",
        "chief_complaint": None,
    }
    mock_resp = _mock_gemini_response(
        extracted=fake_extracted,
        missing=["chief_complaint"],
        summary="Caller reported an emergency but did not describe the complaint.",
    )

    with patch("app.api.voice_intake.genai", create=True) as mock_genai:
        mock_model = MagicMock()
        mock_model.generate_content.return_value = mock_resp
        mock_genai.GenerativeModel.return_value = mock_model
        mock_genai.types.GenerationConfig = MagicMock()
        mock_genai.configure = MagicMock()

        with patch.dict("sys.modules", {"google.generativeai": mock_genai}):
            with patch("app.core.config.settings") as mock_settings:
                mock_settings.GEMINI_API_KEY = "test-key-not-real"
                resp = await async_client.post(
                    "/api/voice-intake/extract",
                    json={"transcript": "Please send help, it is urgent"},
                )

    assert resp.status_code == 200
    data = resp.json()
    assert "chief_complaint" in data["missing_required"]


# ─── E. Gemini timeout/failure → controlled error ─────────────────────────────

@pytest.mark.asyncio
async def test_gemini_api_failure_returns_502(async_client: AsyncClient):
    """When Gemini raises an exception, the endpoint should return 502."""
    with patch("app.api.voice_intake.genai", create=True) as mock_genai:
        mock_model = MagicMock()
        mock_model.generate_content.side_effect = Exception("API quota exceeded")
        mock_genai.GenerativeModel.return_value = mock_model
        mock_genai.types.GenerationConfig = MagicMock()
        mock_genai.configure = MagicMock()

        with patch.dict("sys.modules", {"google.generativeai": mock_genai}):
            with patch("app.core.config.settings") as mock_settings:
                mock_settings.GEMINI_API_KEY = "test-key-not-real"
                resp = await async_client.post(
                    "/api/voice-intake/extract",
                    json={"transcript": "Patient having chest pain at home"},
                )

    assert resp.status_code == 502
    data = resp.json()
    assert data["detail"]["error"] == "gemini_api_error"


# ─── F. Malformed model output → rejected safely ──────────────────────────────

@pytest.mark.asyncio
async def test_malformed_gemini_output_returns_502(async_client: AsyncClient):
    """When Gemini returns invalid JSON, the endpoint should return 502."""
    mock_resp = MagicMock()
    mock_resp.text = "Sorry, I cannot process this request."

    with patch("app.api.voice_intake.genai", create=True) as mock_genai:
        mock_model = MagicMock()
        mock_model.generate_content.return_value = mock_resp
        mock_genai.GenerativeModel.return_value = mock_model
        mock_genai.types.GenerationConfig = MagicMock()
        mock_genai.configure = MagicMock()

        with patch.dict("sys.modules", {"google.generativeai": mock_genai}):
            with patch("app.core.config.settings") as mock_settings:
                mock_settings.GEMINI_API_KEY = "test-key-not-real"
                resp = await async_client.post(
                    "/api/voice-intake/extract",
                    json={"transcript": "This is an emergency situation"},
                )

    assert resp.status_code == 502
    data = resp.json()
    assert data["detail"]["error"] == "gemini_invalid_json"


# ─── G. Missing API key → 503 ─────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_missing_api_key_returns_503(async_client: AsyncClient):
    """When GEMINI_API_KEY is empty, the endpoint should return 503."""
    with patch("app.core.config.settings") as mock_settings:
        mock_settings.GEMINI_API_KEY = ""
        resp = await async_client.post(
            "/api/voice-intake/extract",
            json={"transcript": "Emergency at sector 21"},
        )

    assert resp.status_code == 503
    data = resp.json()
    assert data["detail"]["error"] == "gemini_not_configured"


# ─── H. Response schema matches frontend expectations ─────────────────────────

@pytest.mark.asyncio
async def test_response_schema_structure(async_client: AsyncClient):
    """The response must contain extracted, missing_required, uncertain_fields,
    summary, and raw_transcript — matching what the frontend expects."""
    fake_extracted = {"chief_complaint": "Burns", "source": "CALLER"}
    mock_resp = _mock_gemini_response(
        extracted=fake_extracted,
        missing=[],
        uncertain=["patient_age"],
        summary="A burn injury was reported.",
    )

    with patch("app.api.voice_intake.genai", create=True) as mock_genai:
        mock_model = MagicMock()
        mock_model.generate_content.return_value = mock_resp
        mock_genai.GenerativeModel.return_value = mock_model
        mock_genai.types.GenerationConfig = MagicMock()
        mock_genai.configure = MagicMock()

        with patch.dict("sys.modules", {"google.generativeai": mock_genai}):
            with patch("app.core.config.settings") as mock_settings:
                mock_settings.GEMINI_API_KEY = "test-key-not-real"
                resp = await async_client.post(
                    "/api/voice-intake/extract",
                    json={"transcript": "Someone got burned at a factory"},
                )

    assert resp.status_code == 200
    data = resp.json()
    # All required top-level keys must be present
    assert "extracted" in data
    assert "missing_required" in data
    assert "uncertain_fields" in data
    assert "summary" in data
    assert "raw_transcript" in data
    # raw_transcript must echo what was sent
    assert data["raw_transcript"] == "Someone got burned at a factory"


# ─── I. Transcript preserved on extraction (echo check) ───────────────────────

@pytest.mark.asyncio
async def test_transcript_preserved_in_response(async_client: AsyncClient):
    """The original transcript should be echoed back for retry support."""
    original = "Heart attack at shop near railway station"
    mock_resp = _mock_gemini_response(
        extracted={"chief_complaint": "Heart attack", "source": "CALLER"},
    )

    with patch("app.api.voice_intake.genai", create=True) as mock_genai:
        mock_model = MagicMock()
        mock_model.generate_content.return_value = mock_resp
        mock_genai.GenerativeModel.return_value = mock_model
        mock_genai.types.GenerationConfig = MagicMock()
        mock_genai.configure = MagicMock()

        with patch.dict("sys.modules", {"google.generativeai": mock_genai}):
            with patch("app.core.config.settings") as mock_settings:
                mock_settings.GEMINI_API_KEY = "test-key-not-real"
                resp = await async_client.post(
                    "/api/voice-intake/extract",
                    json={"transcript": original},
                )

    assert resp.status_code == 200
    assert resp.json()["raw_transcript"] == original


# ─── J. Existing case creation still works ─────────────────────────────────────

@pytest.mark.asyncio
async def test_manual_case_creation_unaffected(async_client: AsyncClient):
    """The existing manual intake endpoint must still work correctly."""
    resp = await async_client.post("/api/cases", json={
        "source": "OPERATOR",
        "chief_complaint": "Chest pain",
        "reporter_phone": "9876543210",
        "city": "Raipur",
    })
    assert resp.status_code == 201
    data = resp.json()
    assert data["case_id"].startswith("ER-")
    assert data["chief_complaint"] == "Chest pain"


# ─── LIVE INTEGRATION TEST (requires valid GEMINI_API_KEY) ─────────────────────
# This test is skipped by default. Run with:
#   pytest tests/test_voice_intake.py -v -k live --no-header

@pytest.mark.asyncio
@pytest.mark.skipif(
    True,  # Set to False when you want to run with real credentials
    reason="Live Gemini API test — requires valid GEMINI_API_KEY in .env"
)
async def test_live_gemini_extraction(async_client: AsyncClient):
    """Live test: calls actual Gemini API with the configured key."""
    resp = await async_client.post(
        "/api/voice-intake/extract",
        json={
            "transcript": "My mother fell down the stairs. She is 60 years old. "
                          "Her name is Anita Sharma. She is conscious but her leg "
                          "looks broken. We are near Shastri Nagar, Raipur."
        },
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["extracted"]["chief_complaint"] is not None
    assert len(data["extracted"]["chief_complaint"]) > 3
    print("Live extraction result:", json.dumps(data, indent=2))
