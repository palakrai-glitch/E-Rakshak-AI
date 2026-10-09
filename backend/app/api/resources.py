from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional
from app.core.database import get_db
from app.schemas.resources import (
    HospitalSchema, DoctorWithHospitalSchema, AmbulanceSchema, AmbulanceWithHospitalSchema, ResourceSummarySchema
)
from app.schemas.resource_update import HospitalCapacityUpdate, HospitalStatusUpdate, AmbulanceStatusUpdate, DoctorAvailabilityUpdate
from app.services.resource_service import ResourceService
from sqlalchemy.future import select
from app.models.hospital import Hospital
from app.models.ambulance import Ambulance
from app.models.doctor import Doctor
from app.realtime.events import trigger_resource_update
from app.api.dependencies import get_current_admin

router = APIRouter(prefix="/resources", tags=["Resources"])

# --- Hospitals ---
@router.get("/hospitals", response_model=List[HospitalSchema])
async def list_hospitals(
    emergency_status: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    """Retrieve simulated hospitals"""
    return await ResourceService.get_hospitals(db, emergency_status)

@router.get("/hospitals/{hospital_id}", response_model=HospitalSchema)
async def get_hospital(hospital_id: str, db: AsyncSession = Depends(get_db)):
    hospital = await ResourceService.get_hospital_by_id(db, hospital_id)
    if not hospital:
        raise HTTPException(status_code=404, detail="Hospital not found")
    return hospital

@router.patch("/hospitals/{hospital_id}/capacity")
async def update_hospital_capacity(
    hospital_id: str,
    update_data: HospitalCapacityUpdate,
    db: AsyncSession = Depends(get_db),
    admin: dict = Depends(get_current_admin)
):
    result = await db.execute(select(Hospital).where(Hospital.hospital_id == hospital_id))
    hospital = result.scalar_one_or_none()
    if not hospital:
        raise HTTPException(status_code=404, detail="Hospital not found")
        
    if update_data.available_icu_beds is not None:
        if update_data.available_icu_beds > hospital.icu_capacity:
            raise HTTPException(status_code=400, detail="Available beds cannot exceed capacity")
        hospital.available_icu_beds = update_data.available_icu_beds
        
    if update_data.general_beds_available is not None:
        if update_data.general_beds_available > hospital.general_beds:
            raise HTTPException(status_code=400, detail="Available beds cannot exceed capacity")
        hospital.current_occupancy = hospital.general_beds - update_data.general_beds_available
        
    await db.commit()
    
    changes = {}
    if update_data.available_icu_beds is not None:
        changes["available_icu_beds"] = update_data.available_icu_beds
    if update_data.general_beds_available is not None:
        changes["general_beds_available"] = update_data.general_beds_available
    await trigger_resource_update(db, "hospital", hospital_id, changes)
    
    return {"message": "Capacity updated successfully"}

@router.patch("/hospitals/{hospital_id}/status")
async def update_hospital_status(
    hospital_id: str,
    update_data: HospitalStatusUpdate,
    db: AsyncSession = Depends(get_db),
    admin: dict = Depends(get_current_admin)
):
    result = await db.execute(select(Hospital).where(Hospital.hospital_id == hospital_id))
    hospital = result.scalar_one_or_none()
    if not hospital:
        raise HTTPException(status_code=404, detail="Hospital not found")
        
    hospital.emergency_status = update_data.emergency_status
    await db.commit()
    await trigger_resource_update(db, "hospital", hospital_id, {"emergency_status": update_data.emergency_status})
    return {"message": "Status updated successfully"}

# --- Doctors ---
@router.get("/doctors", response_model=List[DoctorWithHospitalSchema])
async def list_doctors(
    specialization: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    """Retrieve simulated doctors"""
    return await ResourceService.get_doctors(db, specialization)

@router.get("/doctors/{doctor_id}", response_model=DoctorWithHospitalSchema)
async def get_doctor(doctor_id: str, db: AsyncSession = Depends(get_db)):
    doctor = await ResourceService.get_doctor_by_id(db, doctor_id)
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor not found")
    return doctor

@router.patch("/doctors/{doctor_id}/availability")
async def update_doctor_availability(
    doctor_id: str,
    update_data: DoctorAvailabilityUpdate,
    db: AsyncSession = Depends(get_db),
    admin: dict = Depends(get_current_admin)
):
    result = await db.execute(select(Doctor).where(Doctor.doctor_id == doctor_id))
    doctor = result.scalar_one_or_none()
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor not found")
        
    doctor.availability = update_data.availability
    await db.commit()
    await trigger_resource_update(db, "doctor", doctor_id, {"availability": update_data.availability})
    return {"message": "Availability updated successfully"}

# --- Ambulances ---
@router.get("/ambulances", response_model=List[AmbulanceWithHospitalSchema])
async def list_ambulances(
    status: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    """Retrieve simulated ambulances"""
    return await ResourceService.get_ambulances(db, status)

@router.get("/ambulances/{ambulance_id}", response_model=AmbulanceWithHospitalSchema)
async def get_ambulance(ambulance_id: str, db: AsyncSession = Depends(get_db)):
    ambulance = await ResourceService.get_ambulance_by_id(db, ambulance_id)
    if not ambulance:
        raise HTTPException(status_code=404, detail="Ambulance not found")
    return ambulance

@router.patch("/ambulances/{ambulance_id}/status")
async def update_ambulance_status(
    ambulance_id: str,
    update_data: AmbulanceStatusUpdate,
    db: AsyncSession = Depends(get_db),
    admin: dict = Depends(get_current_admin)
):
    result = await db.execute(select(Ambulance).where(Ambulance.ambulance_id == ambulance_id))
    ambulance = result.scalar_one_or_none()
    if not ambulance:
        raise HTTPException(status_code=404, detail="Ambulance not found")
        
    ambulance.status = update_data.status
    await db.commit()
    await trigger_resource_update(db, "ambulance", ambulance_id, {"status": update_data.status})
    return {"message": "Status updated successfully"}

# --- Summary ---
@router.get("/summary", response_model=ResourceSummarySchema)
async def get_summary(db: AsyncSession = Depends(get_db)):
    """Summary counts of all synthetic resources"""
    return await ResourceService.get_summary(db)
