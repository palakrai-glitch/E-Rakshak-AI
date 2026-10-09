from sqlalchemy import Column, String, Integer, Float, JSON, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from app.core.database import Base
import enum

class AmbulanceType(str, enum.Enum):
    BLS = "BLS"
    ALS = "ALS"
    ICU = "ICU"
    NEONATAL = "NEONATAL"

class AmbulanceStatus(str, enum.Enum):
    AVAILABLE = "AVAILABLE"
    ON_ROUTE = "ON_ROUTE"
    AT_HOSPITAL = "AT_HOSPITAL"
    BUSY = "BUSY"
    MAINTENANCE = "MAINTENANCE"

class Ambulance(Base):
    __tablename__ = "ambulances"

    id = Column(Integer, primary_key=True, index=True)
    ambulance_id = Column(String, unique=True, index=True, nullable=False)
    vehicle_number = Column(String, nullable=True)
    operator_password_hash = Column(String, nullable=True)
    data_type = Column(String, default="REAL", nullable=False)
    
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)
    
    type = Column(String, nullable=False)
    status = Column(String, default=AmbulanceStatus.AVAILABLE.value, nullable=False)
    
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)

    current_latitude = Column(Float, nullable=True)
    current_longitude = Column(Float, nullable=True)
    location_updated_at = Column(DateTime(timezone=True), nullable=True)

    equipment = Column(JSON, default=list, nullable=False)
    
    current_case_id = Column(String, nullable=True)
    patient_capacity = Column(Integer, default=1, nullable=False)
    crew_type = Column(String, nullable=False)

    base_hospital_id = Column(Integer, ForeignKey("hospitals.id"), nullable=True)
    base_hospital = relationship("Hospital", backref="ambulances")
