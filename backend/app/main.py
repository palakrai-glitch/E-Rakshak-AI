"""
E-Rakshak AI — FastAPI application entry point.

Phase 1: Project Foundation & System Setup

This module creates and configures the FastAPI application instance.
It registers the CORS middleware, mounts the versioned API router, and
installs a global exception handler so that internal errors never leak raw
Python tracebacks to API consumers.

No domain logic (triage, resources, orchestration, etc.) is implemented here.
"""

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.health import router as health_router
from app.api.cases import router as cases_router
from app.api.triage import router as triage_router
from app.api.resources import router as resources_router
from app.api.matching import router as matching_router
from app.api.orchestration import router as orchestration_router
from app.api.realtime import router as realtime_router
from app.api.location import router as location_router
from app.api.ambulance_portal import router as ambulance_portal_router
from app.core.config import settings

# ── Application factory ────────────────────────────────────────────────────────

app = FastAPI(
    title=settings.APP_NAME,
    description=(
        "Emergency Care Resource Orchestration Platform — "
        "Phase 7: Real-Time Emergency Dashboard & WebSockets"
    ),
    version=settings.API_VERSION,
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
)

# ── CORS ───────────────────────────────────────────────────────────────────────
# Allow the Next.js development server to call the API.
# The allowed origins are driven by the FRONTEND_URL environment variable so
# that different deployment environments can be configured without code changes.
_allowed_origins: list[str] = [settings.FRONTEND_URL]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins,
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1)(:[0-9]+)?$",
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# ── Global exception handler ───────────────────────────────────────────────────


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """Catch any unhandled exception and return a structured JSON error.

    This prevents raw Python tracebacks from being exposed to API consumers in
    non-development environments.
    """
    return JSONResponse(
        status_code=500,
        content={
            "error": "internal_server_error",
            "message": "An unexpected error occurred. Please try again later.",
        },
    )


from app.api.admin import router as admin_router

# ── Routers ────────────────────────────────────────────────────────────────────
app.include_router(health_router, prefix="/api")
app.include_router(cases_router, prefix="/api")
app.include_router(triage_router, prefix="/api")
app.include_router(resources_router, prefix="/api")
app.include_router(matching_router, prefix="/api")
app.include_router(orchestration_router, prefix="/api")
app.include_router(location_router, prefix="/api")
app.include_router(realtime_router)
app.include_router(ambulance_portal_router, prefix="/api")
app.include_router(admin_router, prefix="/api")
