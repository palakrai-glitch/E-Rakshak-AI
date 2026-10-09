from sqlalchemy import Column, String, Integer, Float, Boolean, Enum, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from app.core.database import Base
import enum

class EmergencyStatus(str, enum.Enum):
    OPEN = "OPEN"
    LIMITED = "LIMITED"
    CLOSED = "CLOSED"

class Hospital(Base):
    __tablename__ = "hospitals"

    id = Column(Integer, primary_key=True, index=True)
    hospital_id = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=False)
    address = Column(String, nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)

    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    emergency_department = Column(Boolean, default=True, nullable=False)
    emergency_status = Column(String, default=EmergencyStatus.OPEN.value, nullable=False)

    icu_capacity = Column(Integer, default=0, nullable=False)
    available_icu_beds = Column(Integer, default=0, nullable=False)
    general_beds = Column(Integer, default=0, nullable=False)
    current_occupancy = Column(Integer, default=0, nullable=False)

    trauma_capability = Column(Boolean, default=False, nullable=False)
    cardiac_capability = Column(Boolean, default=False, nullable=False)
    neurology_capability = Column(Boolean, default=False, nullable=False)

    ventilator_available = Column(Boolean, default=False, nullable=False)
    blood_bank_available = Column(Boolean, default=False, nullable=False)

    doctors = relationship("Doctor", back_populates="hospital")
