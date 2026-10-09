"""
Backend automated tests — Phase 1.

Tests cover only the infrastructure wired up in Phase 1:
  1. Application imports cleanly.
  2. GET /api  → 200 with expected JSON.
  3. GET /api/health  → 200 with expected JSON structure.

Domain tests (triage, hospitals, ambulances, cases, etc.) do not exist yet
and will be added in later phases.
"""

import pytest
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


# ── Test 1: Application imports cleanly ────────────────────────────────────────


def test_app_import() -> None:
    """The FastAPI application instance should be importable without errors."""
    from app.main import app as imported_app  # noqa: F401 — import is the assertion

    assert imported_app is not None, "FastAPI app failed to import"


# ── Test 2: Root API endpoint ──────────────────────────────────────────────────


def test_api_root() -> None:
    """GET /api should return HTTP 200 with message and version fields."""
    response = client.get("/api")

    assert response.status_code == 200, f"Expected 200, got {response.status_code}"

    data = response.json()
    assert "message" in data, "Response missing 'message' field"
    assert "version" in data, "Response missing 'version' field"
    assert data["message"] == "E-Rakshak AI API"


# ── Test 3: Health endpoint ────────────────────────────────────────────────────


def test_health_check_status_code() -> None:
    """GET /api/health should return HTTP 200."""
    response = client.get("/api/health")

    assert response.status_code == 200, f"Expected 200, got {response.status_code}"


def test_health_check_response_structure() -> None:
    """GET /api/health response must contain required fields with correct values."""
    response = client.get("/api/health")
    data = response.json()

    assert data.get("status") == "ok", f"Expected status='ok', got {data.get('status')!r}"
    assert data.get("service") == "e-rakshak-ai-backend", (
        f"Expected service='e-rakshak-ai-backend', got {data.get('service')!r}"
    )
    assert "version" in data, "Response missing 'version' field"
    assert "environment" in data, "Response missing 'environment' field"


def test_health_check_content_type() -> None:
    """GET /api/health response Content-Type must be application/json."""
    response = client.get("/api/health")

    assert "application/json" in response.headers.get("content-type", "")
