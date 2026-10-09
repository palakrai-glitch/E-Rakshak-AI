from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime

class AmbulanceLoginRequest(BaseModel):
    ambulance_id: str = Field(..., description="The unique ambulance ID, e.g., AMB-001")
    password: str = Field(..., description="The operator password")

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    ambulance_id: str

class AmbulanceAssignmentResponse(BaseModel):
    case_id: str
    status: str
    ambulance_assignment_status: str
    chief_complaint: str
    patient_name: Optional[str]
    address: Optional[str]
    latitude: Optional[float]
    longitude: Optional[float]
    created_at: datetime
    
class AssignmentRespondRequest(BaseModel):
    response: str = Field(..., description="ACCEPTED or REJECTED")
    reason: Optional[str] = None

class LocationUpdateRequest(BaseModel):
    latitude: float
    longitude: float
    source: str = Field("DEVICE_GPS", description="Source of the location data: DEVICE_GPS, SIMULATION, etc.")
    accuracy: Optional[float] = None
    
class MissionTransitionRequest(BaseModel):
    status: str = Field(..., description="DISPATCHED, EN_ROUTE, ON_SCENE, TRANSPORTING, ARRIVED_AT_HOSPITAL, COMPLETED")
    reason: Optional[str] = None
