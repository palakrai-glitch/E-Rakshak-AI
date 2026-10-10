"""
E-Rakshak AI — Voice Emergency Intake API

POST /api/voice-intake/extract

Accepts a plain-text transcript from the browser (transcribed client-side via
the Web Speech API) and uses the Gemini model to extract structured data that
matches the existing EmergencyCaseCreate schema.

Security rules
--------------
- GEMINI_API_KEY is read from the server-side environment variable only.
- The raw transcript is never logged at INFO level.
- No audio is accepted or stored here — only text.
- If the key is absent or the model call fails, a graceful JSON error is
  returned; the frontend can fall back to the manual intake workflow.

Gemini boundaries
-----------------
- Gemini may only extract / normalise information already present in the
  transcript.
- It must NOT diagnose, prescribe, assign triage priority, or invent details.
- All extracted values must be flagged as "uncertain" when the transcript is
  ambiguous.
- Missing mandatory fields are surfaced explicitly so the user can fill them in.
"""

from __future__ import annotations

import json
import logging
from typing import Any, Optional

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field

log = logging.getLogger(__name__)

router = APIRouter(prefix="/voice-intake", tags=["Voice Emergency Intake"])

# ── Request / Response models ────────────────────────────────────────────────

class VoiceExtractRequest(BaseModel):
    transcript: str = Field(
        ...,
        min_length=3,
        max_length=5000,
        description="Plain-text transcript from the browser's speech recognition",
    )


class ExtractedCaseData(BaseModel):
    """Mirrors EmergencyCaseCreate fields that Gemini may populate."""
    source: Optional[str] = "CALLER"
    chief_complaint: Optional[str] = None
    incident_description: Optional[str] = None
    symptoms: Optional[list[str]] = None
    reporter_name: Optional[str] = None
    reporter_phone: Optional[str] = None
    reporter_relationship: Optional[str] = None
    patient_name: Optional[str] = None
    patient_age: Optional[int] = None
    patient_gender: Optional[str] = None
    heart_rate: Optional[float] = None
    systolic_bp: Optional[float] = None
    diastolic_bp: Optional[float] = None
    spo2: Optional[float] = None
    respiratory_rate: Optional[float] = None
    temperature: Optional[float] = None
    conscious: Optional[bool] = None
    breathing: Optional[bool] = None
    bleeding: Optional[bool] = None
    mobility: Optional[bool] = None
    address: Optional[str] = None
    landmark: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    additional_notes: Optional[str] = None


class VoiceExtractResponse(BaseModel):
    extracted: ExtractedCaseData
    missing_required: list[str] = Field(
        default_factory=list,
        description="Required fields that could not be extracted from the transcript",
    )
    uncertain_fields: list[str] = Field(
        default_factory=list,
        description="Fields that were extracted but the transcript was ambiguous",
    )
    summary: str = Field(
        default="",
        description="A brief, neutral summary of the reported emergency (Gemini-generated)",
    )
    raw_transcript: str = Field(default="", description="Echo of the submitted transcript")


# ── Gemini system prompt ──────────────────────────────────────────────────────

_SYSTEM_PROMPT = """You are a structured data extraction assistant for an emergency dispatch system called E-Rakshak AI.

Your ONLY job is to extract patient and incident information from the caller's spoken description and return it as structured JSON. 

ABSOLUTE RULES — NEVER violate these:
1. Do NOT diagnose the patient or suggest any medical treatment.
2. Do NOT assign or suggest an emergency priority or triage score.
3. Do NOT invent, guess, or assume any detail that is not explicitly stated in the transcript.
4. If a field is not mentioned, leave it as null.
5. Do NOT assume a symptom is absent just because it was not mentioned.
6. Preserve the caller's original incident description verbatim in the incident_description field.
7. Only populate fields you are confident about. Flag uncertain ones.

OUTPUT FORMAT — You must return valid JSON with exactly this structure:
{
  "extracted": {
    "source": "CALLER" | "PATIENT" | "ATTENDANT" | "OPERATOR" | "OTHER",
    "chief_complaint": "<string or null>",
    "incident_description": "<verbatim caller description or null>",
    "symptoms": ["<symptom1>", ...] or null,
    "reporter_name": "<string or null>",
    "reporter_phone": "<string or null>",
    "reporter_relationship": "<string or null>",
    "patient_name": "<string or null>",
    "patient_age": <integer or null>,
    "patient_gender": "MALE" | "FEMALE" | "OTHER" | null,
    "heart_rate": <number or null>,
    "systolic_bp": <number or null>,
    "diastolic_bp": <number or null>,
    "spo2": <number 0-100 or null>,
    "respiratory_rate": <number or null>,
    "temperature": <number or null>,
    "conscious": <true | false | null>,
    "breathing": <true | false | null>,
    "bleeding": <true | false | null>,
    "mobility": <true | false | null>,
    "address": "<string or null>",
    "landmark": "<string or null>",
    "city": "<string or null>",
    "state": "<string or null>",
    "latitude": <number or null>,
    "longitude": <number or null>,
    "additional_notes": "<string or null>"
  },
  "missing_required": ["chief_complaint"] if chief_complaint could not be extracted else [],
  "uncertain_fields": ["<field_name>", ...],
  "summary": "<2-3 sentence neutral factual summary of the reported emergency>"
}

Return ONLY the JSON object. No markdown, no explanation, no code blocks."""


# ── Endpoint ─────────────────────────────────────────────────────────────────

@router.post(
    "/extract",
    response_model=VoiceExtractResponse,
    status_code=status.HTTP_200_OK,
    summary="Extract structured intake data from a voice transcript",
)
async def extract_from_transcript(body: VoiceExtractRequest) -> VoiceExtractResponse:
    """
    Send a plain-text emergency transcript to Gemini and receive structured
    intake fields ready for user review.

    - GEMINI_API_KEY must be set in the backend environment.
    - Returns a graceful error if the key is missing or the model call fails.
    - Never logs the raw transcript at INFO level.
    """
    from app.core.config import settings

    api_key: str = getattr(settings, "GEMINI_API_KEY", "")
    if not api_key:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={
                "error": "gemini_not_configured",
                "message": "GEMINI_API_KEY is not configured on the server. "
                           "Please add it to the backend .env file.",
            },
        )

    try:
        import google.generativeai as genai  # type: ignore[import]
    except ImportError:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={
                "error": "gemini_sdk_missing",
                "message": "google-generativeai package is not installed. "
                           "Run: pip install google-generativeai",
            },
        )

    genai.configure(api_key=api_key)

    model = genai.GenerativeModel(
        model_name="gemini-2.5-flash",
        system_instruction=_SYSTEM_PROMPT,
        generation_config=genai.types.GenerationConfig(
            temperature=0.1,
            max_output_tokens=1500,
        ),
    )

    user_message = (
        "Extract structured emergency intake data from the following caller transcript:\n\n"
        f"{body.transcript}"
    )

    try:
        response = model.generate_content(user_message)
        raw_text: str = response.text.strip()
    except Exception as exc:
        log.error("Gemini API call failed: %s", type(exc).__name__)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail={
                "error": "gemini_api_error",
                "message": f"The Gemini API returned an error: {type(exc).__name__}. "
                           "You can still complete the intake manually.",
            },
        )

    import re
    match = re.search(r"```(?:json)?\s*([\s\S]*?)\s*```", raw_text)
    if match:
        raw_text = match.group(1).strip()
    else:
        # Fallback to finding the first { and last }
        start = raw_text.find("{")
        end = raw_text.rfind("}")
        if start != -1 and end != -1:
            raw_text = raw_text[start:end+1]

    try:
        parsed: dict[str, Any] = json.loads(raw_text)
    except json.JSONDecodeError:
        log.error("Gemini returned non-JSON output (truncated for privacy)")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail={
                "error": "gemini_invalid_json",
                "message": "The AI returned an unexpected response format. "
                           "Please complete the intake manually or retry.",
            },
        )

    # Validate and coerce the extracted sub-object
    extracted_raw: dict[str, Any] = parsed.get("extracted", {})
    try:
        extracted = ExtractedCaseData(**extracted_raw)
    except Exception:
        # Partial extraction — build from what we can
        safe: dict[str, Any] = {}
        for field in ExtractedCaseData.model_fields:
            if field in extracted_raw:
                try:
                    safe[field] = extracted_raw[field]
                except Exception:
                    pass
        extracted = ExtractedCaseData(**safe)

    missing_required: list[str] = parsed.get("missing_required", [])
    # Always ensure chief_complaint is flagged if absent
    if not extracted.chief_complaint and "chief_complaint" not in missing_required:
        missing_required.append("chief_complaint")

    return VoiceExtractResponse(
        extracted=extracted,
        missing_required=missing_required,
        uncertain_fields=parsed.get("uncertain_fields", []),
        summary=parsed.get("summary", ""),
        raw_transcript=body.transcript,
    )
