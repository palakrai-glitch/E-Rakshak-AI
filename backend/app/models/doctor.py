from sqlalchemy import Column, String, Integer, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from app.core.database import Base
import enum

class DoctorAvailability(str, enum.Enum):
    AVAILABLE = "AVAILABLE"
    BUSY = "BUSY"
    OFF_DUTY = "OFF_DUTY"

class Doctor(Base):
    __tablename__ = "doctors"

    id = Column(Integer, primary_key=True, index=True)
    doctor_id = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=False)
    
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)
    
    hospital_id = Column(Integer, ForeignKey("hospitals.id"), nullable=False)
    
    specialization = Column(String, nullable=False)
    availability = Column(String, default=DoctorAvailability.AVAILABLE.value, nullable=False)
    
    current_emergency_load = Column(Integer, default=0, nullable=False)
    shift = Column(String, nullable=False)
    contact_extension = Column(String, nullable=True)

    hospital = relationship("Hospital", back_populates="doctors")
