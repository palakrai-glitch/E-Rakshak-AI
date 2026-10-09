from pydantic import BaseModel, ConfigDict
from typing import List, Optional
from datetime import datetime

class HospitalBase(BaseModel):
    hospital_id: str
    name: str
    address: str
    latitude: float
    longitude: float

    emergency_department: bool
    emergency_status: str

    icu_capacity: int
    available_icu_beds: int
    general_beds: int
    current_occupancy: int

    trauma_capability: bool
    cardiac_capability: bool
    neurology_capability: bool

    ventilator_available: bool
    blood_bank_available: bool

class HospitalSchema(HospitalBase):
    id: int
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)

class DoctorBase(BaseModel):
    doctor_id: str
    name: str
    hospital_id: int
    specialization: str
    availability: str
    current_emergency_load: int
    shift: str
    contact_extension: Optional[str] = None

class DoctorSchema(DoctorBase):
    id: int
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)

class DoctorWithHospitalSchema(DoctorSchema):
    hospital: HospitalSchema

class AmbulanceBase(BaseModel):
    ambulance_id: str
    type: str
    status: str
    latitude: float
    longitude: float
    current_latitude: Optional[float] = None
    current_longitude: Optional[float] = None
    location_updated_at: Optional[datetime] = None
    equipment: List[str]
    current_case_id: Optional[str] = None
    patient_capacity: int
    crew_type: str
    vehicle_number: Optional[str] = None
    data_type: str = "REAL"
    base_hospital_id: Optional[int] = None

class AmbulanceSchema(AmbulanceBase):
    id: int
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)

class AmbulanceWithHospitalSchema(AmbulanceSchema):
    base_hospital: Optional[HospitalSchema] = None

class ResourceSummarySchema(BaseModel):
    hospitals: int
    doctors: int
    ambulances: int
