from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.schemas.emergency_case import EmergencyCaseCreate, EmergencyCaseResponse, EmergencyCaseListResponse
from app.services.emergency_case_service import EmergencyCaseService

router = APIRouter(prefix="/cases", tags=["Emergency Cases"])

@router.post("", response_model=EmergencyCaseResponse, status_code=status.HTTP_201_CREATED)
async def create_case(case_data: EmergencyCaseCreate, db: AsyncSession = Depends(get_db)):
    """Create a new emergency case intake record."""
    new_case = await EmergencyCaseService.create_case(db, case_data)
    return new_case

from app.api.dependencies import get_current_admin

@router.get("", response_model=EmergencyCaseListResponse)
async def list_cases(
    db: AsyncSession = Depends(get_db),
    search: str = None,
    status: str = None,
    sort_by: str = "newest",
    limit: int = 50
):
    """List recent emergency cases."""
    cases = await EmergencyCaseService.list_cases(db, limit, search, status, sort_by)
    return {"cases": cases}

@router.get("/{case_id}", response_model=EmergencyCaseResponse)
async def get_case(case_id: str, db: AsyncSession = Depends(get_db)):
    """Retrieve an emergency case by its Case ID."""
    db_case = await EmergencyCaseService.get_case_by_id(db, case_id)
    if not db_case:
        raise HTTPException(status_code=404, detail="Emergency Case not found")
    return db_case

from app.schemas.emergency_case import EmergencyCaseUpdate, CaseRecoveryRequest

from app.api.realtime import manager

@router.patch("/{case_id}", response_model=EmergencyCaseResponse)
async def update_case(case_id: str, update_data: EmergencyCaseUpdate, db: AsyncSession = Depends(get_db)):
    """Update an existing emergency case intake record."""
    updated_case = await EmergencyCaseService.update_case(db, case_id, update_data)
    if not updated_case:
        raise HTTPException(status_code=404, detail="Emergency Case not found")
        
    if update_data.patient_pathway_confirmed is not None:
        await manager.broadcast_to_case(case_id, {
            "type": "PATHWAY_CONFIRMATION_CHANGED",
            "case_id": case_id,
            "patient_pathway_confirmed": updated_case.patient_pathway_confirmed
        })
        
    return updated_case

@router.post("/verify", response_model=EmergencyCaseResponse)
async def verify_case(request: CaseRecoveryRequest, db: AsyncSession = Depends(get_db)):
    """Verify an ER Token and reporter phone to recover a case."""
    verified_case = await EmergencyCaseService.verify_case(db, request.case_id, request.reporter_phone)
    if not verified_case:
        raise HTTPException(status_code=403, detail="Invalid ER Token or verification details")
    return verified_case
