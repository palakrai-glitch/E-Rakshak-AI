from typing import List, Optional
from pydantic import BaseModel, Field
from datetime import datetime

class EmergencyCaseCreate(BaseModel):
    source: str = Field(..., description="Source of the report, e.g. CALLER, PATIENT")
    
    reporter_name: Optional[str] = None
    reporter_phone: Optional[str] = None
    reporter_relationship: Optional[str] = None
    
    patient_name: Optional[str] = None
    patient_age: Optional[int] = Field(None, ge=0, le=150)
    patient_gender: Optional[str] = None
    
    chief_complaint: str
    incident_description: Optional[str] = None
    
    symptoms: Optional[List[str]] = None
    
    heart_rate: Optional[float] = None
    systolic_bp: Optional[float] = None
    diastolic_bp: Optional[float] = None
    spo2: Optional[float] = Field(None, ge=0, le=100)
    respiratory_rate: Optional[float] = None
    temperature: Optional[float] = None
    
    conscious: Optional[bool] = None
    breathing: Optional[bool] = None
    bleeding: Optional[bool] = None
    mobility: Optional[bool] = None
    
    address: Optional[str] = None
    landmark: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    latitude: Optional[float] = Field(None, ge=-90, le=90)
    longitude: Optional[float] = Field(None, ge=-180, le=180)
    
    additional_notes: Optional[str] = None

class EmergencyCaseResponse(EmergencyCaseCreate):
    case_id: str
    status: str
    assigned_ambulance_id: Optional[str] = None
    ambulance_assignment_status: str = "PENDING"
    patient_pathway_confirmed: bool = False
    created_at: datetime
    message: Optional[str] = "Emergency case created successfully"

    model_config = {"from_attributes": True}

class EmergencyCaseListResponse(BaseModel):
    cases: List[EmergencyCaseResponse]

class EmergencyCaseUpdate(BaseModel):
    reporter_name: Optional[str] = None
    reporter_phone: Optional[str] = None
    reporter_relationship: Optional[str] = None
    
    patient_name: Optional[str] = None
    patient_age: Optional[int] = Field(None, ge=0, le=150)
    patient_gender: Optional[str] = None
    
    chief_complaint: Optional[str] = None
    incident_description: Optional[str] = None
    symptoms: Optional[List[str]] = None
    
    heart_rate: Optional[float] = None
    systolic_bp: Optional[float] = None
    diastolic_bp: Optional[float] = None
    spo2: Optional[float] = Field(None, ge=0, le=100)
    respiratory_rate: Optional[float] = None
    temperature: Optional[float] = None
    
    conscious: Optional[bool] = None
    breathing: Optional[bool] = None
    bleeding: Optional[bool] = None
    mobility: Optional[bool] = None
    
    address: Optional[str] = None
    landmark: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    latitude: Optional[float] = Field(None, ge=-90, le=90)
    longitude: Optional[float] = Field(None, ge=-180, le=180)
    
    additional_notes: Optional[str] = None
    status: Optional[str] = None
    patient_pathway_confirmed: Optional[bool] = None

class CaseRecoveryRequest(BaseModel):
    case_id: str = Field(..., description="The ER Token")
    reporter_phone: str = Field(..., description="Phone number used during intake")
