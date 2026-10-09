from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional
from app.core.database import get_db
from app.schemas.orchestration import OrchestrationResult
from app.services.orchestration_service import generate_orchestration

router = APIRouter(prefix="/cases", tags=["Orchestration"])

@router.get("/{case_id}/orchestration", response_model=OrchestrationResult)
async def get_orchestration(
    case_id: str,
    previous_pathway_id: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db)
):
    """
    Get the dynamically evaluated emergency care pathway for a case.
    """
    return await generate_orchestration(db, case_id, previous_pathway_id)
