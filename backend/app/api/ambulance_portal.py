from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.core.security import verify_password, create_access_token, decode_access_token
from app.models.ambulance import Ambulance
from app.models.emergency_case import EmergencyCase
from app.schemas.ambulance_portal import AmbulanceLoginRequest, TokenResponse, AmbulanceAssignmentResponse, AssignmentRespondRequest

router = APIRouter(prefix="/ambulance-portal", tags=["Ambulance Portal"])
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/ambulance-portal/login")

async def get_current_ambulance(token: str = Depends(oauth2_scheme), db: AsyncSession = Depends(get_db)):
    payload = decode_access_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    ambulance_id = payload.get("sub")
    if not ambulance_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    query = select(Ambulance).options(selectinload(Ambulance.base_hospital)).where(Ambulance.ambulance_id == ambulance_id)
    result = await db.execute(query)
    ambulance = result.scalar_one_or_none()
    
    if not ambulance:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Ambulance not found",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    return ambulance

@router.post("/login", response_model=TokenResponse)
async def login_ambulance(request: AmbulanceLoginRequest, db: AsyncSession = Depends(get_db)):
    query = select(Ambulance).where(Ambulance.ambulance_id == request.ambulance_id)
    result = await db.execute(query)
    ambulance = result.scalar_one_or_none()
    
    if not ambulance or not ambulance.operator_password_hash:
        raise HTTPException(status_code=401, detail="Invalid ambulance ID or password")
        
    if not verify_password(request.password, ambulance.operator_password_hash):
        raise HTTPException(status_code=401, detail="Invalid ambulance ID or password")
        
    access_token = create_access_token(data={"sub": ambulance.ambulance_id})
    return {"access_token": access_token, "token_type": "bearer", "ambulance_id": ambulance.ambulance_id}

@router.get("/me")
async def get_my_profile(ambulance: Ambulance = Depends(get_current_ambulance)):
    return {
        "ambulance_id": ambulance.ambulance_id,
        "vehicle_number": ambulance.vehicle_number,
        "type": ambulance.type,
        "status": ambulance.status,
        "base_hospital_name": ambulance.base_hospital.name if ambulance.base_hospital else None
    }

@router.get("/requests", response_model=list[AmbulanceAssignmentResponse])
async def get_my_requests(ambulance: Ambulance = Depends(get_current_ambulance), db: AsyncSession = Depends(get_db)):
    query = select(EmergencyCase).where(EmergencyCase.assigned_ambulance_id == ambulance.ambulance_id).order_by(EmergencyCase.created_at.desc())
    result = await db.execute(query)
    cases = result.scalars().all()
    
    return [
        {
            "case_id": c.case_id,
            "status": c.status,
            "ambulance_assignment_status": c.ambulance_assignment_status,
            "chief_complaint": c.chief_complaint,
            "patient_name": c.patient_name,
            "address": c.address,
            "latitude": c.latitude,
            "longitude": c.longitude,
            "created_at": c.created_at
        } for c in cases
    ]

@router.post("/requests/{case_id}/respond", response_model=AmbulanceAssignmentResponse)
async def respond_to_request(
    case_id: str, 
    request: AssignmentRespondRequest, 
    ambulance: Ambulance = Depends(get_current_ambulance),
    db: AsyncSession = Depends(get_db)
):
    query = select(EmergencyCase).where(EmergencyCase.case_id == case_id)
    result = await db.execute(query)
    case = result.scalar_one_or_none()
    
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
        
    if case.assigned_ambulance_id != ambulance.ambulance_id:
        raise HTTPException(status_code=403, detail="Not authorized to respond to this case")
        
    if case.ambulance_assignment_status != "PENDING":
        raise HTTPException(status_code=400, detail=f"Case is already {case.ambulance_assignment_status}")
        
    if request.response not in ["ACCEPTED", "REJECTED"]:
        raise HTTPException(status_code=400, detail="Invalid response")
        
    case.ambulance_assignment_status = request.response
    
    db.add(case)
    await db.commit()
    await db.refresh(case)
    
    from app.realtime.manager import manager
    await manager.broadcast_to_case(case_id, {
        "event": "AMBULANCE_ASSIGNMENT_CHANGED",
        "data": {
            "case_id": case_id,
            "ambulance_id": ambulance.ambulance_id,
            "status": request.response,
            "reason": request.reason
        }
    })
    
    return {
        "case_id": case.case_id,
        "status": case.status,
        "ambulance_assignment_status": case.ambulance_assignment_status,
        "chief_complaint": case.chief_complaint,
        "patient_name": case.patient_name,
        "address": case.address,
        "latitude": case.latitude,
        "longitude": case.longitude,
        "created_at": case.created_at
    }

from datetime import datetime, timezone
from app.schemas.ambulance_portal import LocationUpdateRequest, MissionTransitionRequest

@router.post("/location")
async def update_location(
    request: LocationUpdateRequest,
    ambulance: Ambulance = Depends(get_current_ambulance),
    db: AsyncSession = Depends(get_db)
):
    ambulance.current_latitude = request.latitude
    ambulance.current_longitude = request.longitude
    ambulance.location_updated_at = datetime.now(timezone.utc)
    
    db.add(ambulance)
    await db.commit()
    
    # Broadcast to case if on an active mission
    # For now, we assume if they are actively logging location, it might be related to a case. 
    # The ambulance model needs to know its current_case_id which is updated in respond_to_request if accepted.
    if ambulance.current_case_id:
        from app.realtime.manager import manager
        await manager.broadcast_to_case(ambulance.current_case_id, {
            "event": "AMBULANCE_LOCATION_UPDATED",
            "type": "AMBULANCE_LOCATION_UPDATED",
            "data": {
                "ambulance_id": ambulance.ambulance_id,
                "latitude": request.latitude,
                "longitude": request.longitude,
                "source": request.source,
                "timestamp": ambulance.location_updated_at.isoformat()
            }
        })
        
    return {"status": "ok"}

@router.post("/requests/{case_id}/transition", response_model=AmbulanceAssignmentResponse)
async def transition_mission(
    case_id: str,
    request: MissionTransitionRequest,
    ambulance: Ambulance = Depends(get_current_ambulance),
    db: AsyncSession = Depends(get_db)
):
    query = select(EmergencyCase).where(EmergencyCase.case_id == case_id)
    result = await db.execute(query)
    case = result.scalar_one_or_none()
    
    if not case or case.assigned_ambulance_id != ambulance.ambulance_id:
        raise HTTPException(status_code=403, detail="Not authorized for this case")
        
    valid_transitions = ["DISPATCHED", "EN_ROUTE", "ON_SCENE", "TRANSPORTING", "ARRIVED_AT_HOSPITAL", "COMPLETED"]
    if request.status not in valid_transitions:
        raise HTTPException(status_code=400, detail="Invalid transition status")
        
    case.ambulance_assignment_status = request.status
    
    if request.status == "COMPLETED":
        ambulance.status = "AVAILABLE"
        ambulance.current_case_id = None
        case.status = "RESOLVED"
        
    db.add(case)
    db.add(ambulance)
    await db.commit()
    
    from app.realtime.manager import manager
    await manager.broadcast_to_case(case_id, {
        "event": "MISSION_STATUS_CHANGED",
        "type": "MISSION_STATUS_CHANGED",
        "data": {
            "case_id": case_id,
            "ambulance_id": ambulance.ambulance_id,
            "status": case.ambulance_assignment_status
        }
    })
    
    return {
        "case_id": case.case_id,
        "status": case.status,
        "ambulance_assignment_status": case.ambulance_assignment_status,
        "chief_complaint": case.chief_complaint,
        "patient_name": case.patient_name,
        "address": case.address,
        "latitude": float(case.latitude) if case.latitude else None,
        "longitude": float(case.longitude) if case.longitude else None,
        "created_at": case.created_at
    }
