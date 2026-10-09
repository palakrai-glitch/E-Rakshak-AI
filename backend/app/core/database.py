"""
Database connection infrastructure for E-Rakshak AI.

Phase 1 — Foundation only.

This module sets up the SQLAlchemy async engine and session factory so that
later phases can import ``AsyncSession`` and ``Base`` without restructuring
the project.

No application-specific tables are created here.  Domain models (hospitals,
ambulances, cases, etc.) will be introduced in later phases by extending
``Base`` and running Alembic migrations.

PostGIS support will be added when the geospatial extensions are required.
"""

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from app.core.config import settings

# ── Engine ─────────────────────────────────────────────────────────────────────
# Replace the sync postgresql:// scheme with postgresql+asyncpg:// for the
# async driver.  This keeps the DATABASE_URL in .env human-readable while
# still using the async engine under the hood.
_async_database_url = settings.DATABASE_URL.replace(
    "postgresql://", "postgresql+asyncpg://", 1
)

engine = create_async_engine(
    _async_database_url,
    echo=(settings.APP_ENV == "development"),
    future=True,
)

# ── Session factory ────────────────────────────────────────────────────────────
AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
    autocommit=False,
)


# ── Declarative base ───────────────────────────────────────────────────────────
class Base(DeclarativeBase):
    """Shared declarative base for all ORM models.

    Future domain models should inherit from this class and will be
    auto-discovered by Alembic migrations.
    """


# ── Dependency ─────────────────────────────────────────────────────────────────
async def get_db() -> AsyncSession:  # type: ignore[return]
    """FastAPI dependency that yields an async database session.

    Usage (in route handlers)::

        @router.get("/example")
        async def example(db: AsyncSession = Depends(get_db)):
            ...
    """
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
