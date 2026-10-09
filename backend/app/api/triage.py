from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.schemas.triage import TriageResultSchema
from app.services.triage_service import TriageService

router = APIRouter(prefix="/cases/{case_id}/triage", tags=["Triage"])

@router.get("", response_model=TriageResultSchema)
async def get_triage(case_id: str, db: AsyncSession = Depends(get_db)):
    """Run preliminary triage assessment for a case."""
    result = await TriageService.run_triage(db, case_id)
    if not result:
        raise HTTPException(status_code=404, detail="Emergency Case not found")
    return result

@router.post("/recalculate", response_model=TriageResultSchema)
async def recalculate_triage(case_id: str, db: AsyncSession = Depends(get_db)):
    """Explicitly rerun preliminary triage assessment."""
    result = await TriageService.run_triage(db, case_id)
    if not result:
        raise HTTPException(status_code=404, detail="Emergency Case not found")
    return result
