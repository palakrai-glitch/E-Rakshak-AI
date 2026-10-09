from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Float, Text, JSON
from app.core.database import Base

class EmergencyCase(Base):
    __tablename__ = "emergency_cases"

    id = Column(Integer, primary_key=True, index=True)
    case_id = Column(String, unique=True, index=True, nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    status = Column(String, default="OPEN", nullable=False)
    source = Column(String, nullable=False)

    reporter_name = Column(String, nullable=True)
    reporter_phone = Column(String, nullable=True)
    reporter_relationship = Column(String, nullable=True)

    patient_name = Column(String, nullable=True)
    patient_age = Column(Integer, nullable=True)
    patient_gender = Column(String, nullable=True)

    chief_complaint = Column(String, nullable=False)
    incident_description = Column(Text, nullable=True)

    symptoms = Column(JSON, nullable=True)

    heart_rate = Column(Float, nullable=True)
    systolic_bp = Column(Float, nullable=True)
    diastolic_bp = Column(Float, nullable=True)
    spo2 = Column(Float, nullable=True)
    respiratory_rate = Column(Float, nullable=True)
    temperature = Column(Float, nullable=True)

    conscious = Column(Boolean, nullable=True)
    breathing = Column(Boolean, nullable=True)
    bleeding = Column(Boolean, nullable=True)
    mobility = Column(Boolean, nullable=True)

    address = Column(String, nullable=True)
    landmark = Column(String, nullable=True)
    city = Column(String, nullable=True)
    state = Column(String, nullable=True)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)

    additional_notes = Column(Text, nullable=True)

    assigned_ambulance_id = Column(String, nullable=True)
    ambulance_assignment_status = Column(String, default="PENDING", nullable=False)
    patient_pathway_confirmed = Column(Boolean, default=False, nullable=False)
