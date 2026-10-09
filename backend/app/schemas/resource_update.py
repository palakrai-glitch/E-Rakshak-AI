from pydantic import BaseModel, Field
from typing import Optional

class HospitalCapacityUpdate(BaseModel):
    available_icu_beds: Optional[int] = Field(None, ge=0)
    general_beds_available: Optional[int] = Field(None, ge=0)

class HospitalStatusUpdate(BaseModel):
    emergency_status: str = Field(..., description="OPEN, LIMITED, CLOSED")

class AmbulanceStatusUpdate(BaseModel):
    status: str = Field(..., description="AVAILABLE, ON_ROUTE, AT_HOSPITAL, BUSY, MAINTENANCE")

class DoctorAvailabilityUpdate(BaseModel):
    availability: str = Field(..., description="AVAILABLE, BUSY, OFF_DUTY")
