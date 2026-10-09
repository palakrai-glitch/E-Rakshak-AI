"""
Health-check API route.

Endpoint: GET /api/health

Returns a simple JSON payload that confirms the backend service is running.
This endpoint contains NO emergency-care logic — it is infrastructure only.
"""

from fastapi import APIRouter
from pydantic import BaseModel

from app.core.config import settings

router = APIRouter()


class HealthResponse(BaseModel):
    """Schema for the health-check response."""

    status: str
    service: str
    version: str
    environment: str


class RootResponse(BaseModel):
    """Schema for the root API response."""

    message: str
    version: str


@router.get(
    "/health",
    response_model=HealthResponse,
    summary="Health Check",
    description="Returns the operational status of the E-Rakshak AI backend service.",
    tags=["System"],
)
async def health_check() -> HealthResponse:
    """Return 200 OK when the service is up and accepting requests."""
    return HealthResponse(
        status="ok",
        service="e-rakshak-ai-backend",
        version=settings.API_VERSION,
        environment=settings.APP_ENV,
    )


@router.get(
    "",
    response_model=RootResponse,
    summary="API Root",
    description="Informational root endpoint for the E-Rakshak AI API.",
    tags=["System"],
)
async def api_root() -> RootResponse:
    """Return basic API metadata."""
    return RootResponse(
        message="E-Rakshak AI API",
        version=settings.API_VERSION,
    )
