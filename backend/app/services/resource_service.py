from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from sqlalchemy import func
from app.models.hospital import Hospital
from app.models.doctor import Doctor
from app.models.ambulance import Ambulance

class ResourceService:
    # --- Hospitals ---
    @staticmethod
    async def get_hospitals(db: AsyncSession, emergency_status: Optional[str] = None) -> List[Hospital]:
        query = select(Hospital)
        if emergency_status:
            query = query.where(Hospital.emergency_status == emergency_status)
        result = await db.execute(query)
        return list(result.scalars().all())

    @staticmethod
    async def get_hospital_by_id(db: AsyncSession, hospital_id: str) -> Optional[Hospital]:
        query = select(Hospital).where(Hospital.hospital_id == hospital_id)
        result = await db.execute(query)
        return result.scalars().first()

    # --- Doctors ---
    @staticmethod
    async def get_doctors(db: AsyncSession, specialization: Optional[str] = None) -> List[Doctor]:
        query = select(Doctor).options(selectinload(Doctor.hospital))
        if specialization:
            query = query.where(Doctor.specialization == specialization)
        result = await db.execute(query)
        return list(result.scalars().all())

    @staticmethod
    async def get_doctor_by_id(db: AsyncSession, doctor_id: str) -> Optional[Doctor]:
        query = select(Doctor).options(selectinload(Doctor.hospital)).where(Doctor.doctor_id == doctor_id)
        result = await db.execute(query)
        return result.scalars().first()

    # --- Ambulances ---
    @staticmethod
    async def get_ambulances(db: AsyncSession, status: Optional[str] = None) -> List[Ambulance]:
        query = select(Ambulance).options(selectinload(Ambulance.base_hospital))
        if status:
            query = query.where(Ambulance.status == status)
        result = await db.execute(query)
        return list(result.scalars().all())

    @staticmethod
    async def get_ambulance_by_id(db: AsyncSession, ambulance_id: str) -> Optional[Ambulance]:
        query = select(Ambulance).options(selectinload(Ambulance.base_hospital)).where(Ambulance.ambulance_id == ambulance_id)
        result = await db.execute(query)
        return result.scalars().first()

    # --- Summary ---
    @staticmethod
    async def get_summary(db: AsyncSession) -> dict:
        hospitals_count = await db.scalar(select(func.count(Hospital.id)))
        doctors_count = await db.scalar(select(func.count(Doctor.id)))
        ambulances_count = await db.scalar(select(func.count(Ambulance.id)))
        
        return {
            "hospitals": hospitals_count or 0,
            "doctors": doctors_count or 0,
            "ambulances": ambulances_count or 0
        }
