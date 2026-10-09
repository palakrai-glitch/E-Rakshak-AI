from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.schemas.matching import MatchingResultSchema
from app.services.emergency_case_service import EmergencyCaseService
from app.services.triage_service import TriageService
from app.services.matching_service import MatchingService

router = APIRouter(prefix="/cases", tags=["Matching"])

@router.get("/{case_id}/matching", response_model=MatchingResultSchema)
async def get_matching_options(case_id: str, db: AsyncSession = Depends(get_db)):
    """Evaluate and return ranked matching resources for an emergency case."""
    
    # 1. Load Emergency Case
    case = await EmergencyCaseService.get_case_by_id(db, case_id)
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
        
    # 2. Load Triage Result (Re-calculating it on the fly to ensure we have the latest)
    triage = await TriageService.run_triage(db, case_id)
    if not triage:
        raise HTTPException(status_code=404, detail="Triage failed")
    
    # 3. Match Resources
    result = await MatchingService.match_resources(db, case, triage)
    
    return result

@router.post("/{case_id}/matching/recalculate", response_model=MatchingResultSchema)
async def recalculate_matching_options(case_id: str, db: AsyncSession = Depends(get_db)):
    """Force recalculation of matching resources."""
    return await get_matching_options(case_id, db)
