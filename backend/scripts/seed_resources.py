import asyncio
import os
import sys
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from sqlalchemy.future import select

# Add backend directory to Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.config import settings
from app.models.hospital import Hospital, EmergencyStatus
from app.models.doctor import Doctor, DoctorAvailability
from app.models.ambulance import Ambulance, AmbulanceType, AmbulanceStatus

# Create an independent engine and session for the script
engine = create_async_engine(settings.DATABASE_URL, echo=False)
AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False)

HOSPITALS = [
    {
        "hospital_id": "HOSP-001",
        "name": "Central Trauma & Cardiac Center",
        "address": "120 Medical District, Downtown",
        "latitude": 28.6139,
        "longitude": 77.2090,
        "emergency_department": True,
        "emergency_status": EmergencyStatus.OPEN.value,
        "icu_capacity": 50,
        "available_icu_beds": 12,
        "general_beds": 200,
        "current_occupancy": 150,
        "trauma_capability": True,
        "cardiac_capability": True,
        "neurology_capability": True,
        "ventilator_available": True,
        "blood_bank_available": True,
    },
    {
        "hospital_id": "HOSP-002",
        "name": "Northside Cardiac Hospital",
        "address": "45 North Avenue, Uptown",
        "latitude": 28.6250,
        "longitude": 77.2100,
        "emergency_department": True,
        "emergency_status": EmergencyStatus.OPEN.value,
        "icu_capacity": 30,
        "available_icu_beds": 5,
        "general_beds": 100,
        "current_occupancy": 85,
        "trauma_capability": False,
        "cardiac_capability": True,
        "neurology_capability": False,
        "ventilator_available": True,
        "blood_bank_available": True,
    },
    {
        "hospital_id": "HOSP-003",
        "name": "City General Orthopedics",
        "address": "88 East Ring Road",
        "latitude": 28.6300,
        "longitude": 77.2200,
        "emergency_department": True,
        "emergency_status": EmergencyStatus.OPEN.value,
        "icu_capacity": 15,
        "available_icu_beds": 2,
        "general_beds": 300,
        "current_occupancy": 280,
        "trauma_capability": True,
        "cardiac_capability": False,
        "neurology_capability": False,
        "ventilator_available": False,
        "blood_bank_available": True,
    },
    {
        "hospital_id": "HOSP-004",
        "name": "West End Community Hospital",
        "address": "202 Western Marg",
        "latitude": 28.6100,
        "longitude": 77.1800,
        "emergency_department": True,
        "emergency_status": EmergencyStatus.OPEN.value,
        "icu_capacity": 10,
        "available_icu_beds": 4,
        "general_beds": 150,
        "current_occupancy": 90,
        "trauma_capability": False,
        "cardiac_capability": False,
        "neurology_capability": False,
        "ventilator_available": True,
        "blood_bank_available": False,
    },
    {
        "hospital_id": "HOSP-005",
        "name": "Neuro-Spine Institute",
        "address": "33 Brainway Avenue",
        "latitude": 28.6400,
        "longitude": 77.2000,
        "emergency_department": True,
        "emergency_status": EmergencyStatus.LIMITED.value,
        "icu_capacity": 25,
        "available_icu_beds": 0,
        "general_beds": 100,
        "current_occupancy": 100,
        "trauma_capability": False,
        "cardiac_capability": False,
        "neurology_capability": True,
        "ventilator_available": True,
        "blood_bank_available": True,
    },
    {
        "hospital_id": "HOSP-006",
        "name": "Apex Critical Care Center",
        "address": "90 Apex Road",
        "latitude": 28.6000,
        "longitude": 77.2100,
        "emergency_department": True,
        "emergency_status": EmergencyStatus.OPEN.value,
        "icu_capacity": 40,
        "available_icu_beds": 8,
        "general_beds": 120,
        "current_occupancy": 110,
        "trauma_capability": True,
        "cardiac_capability": True,
        "neurology_capability": True,
        "ventilator_available": True,
        "blood_bank_available": True,
    },
    {
        "hospital_id": "HOSP-007",
        "name": "Suburban Memorial",
        "address": "55 Outer Ring",
        "latitude": 28.5800,
        "longitude": 77.2500,
        "emergency_department": True,
        "emergency_status": EmergencyStatus.OPEN.value,
        "icu_capacity": 20,
        "available_icu_beds": 5,
        "general_beds": 200,
        "current_occupancy": 160,
        "trauma_capability": True,
        "cardiac_capability": False,
        "neurology_capability": False,
        "ventilator_available": True,
        "blood_bank_available": True,
    },
    {
        "hospital_id": "HOSP-008",
        "name": "Southpoint Emergency Dept",
        "address": "12 Southway",
        "latitude": 28.5500,
        "longitude": 77.2000,
        "emergency_department": True,
        "emergency_status": EmergencyStatus.CLOSED.value,
        "icu_capacity": 5,
        "available_icu_beds": 0,
        "general_beds": 50,
        "current_occupancy": 50,
        "trauma_capability": False,
        "cardiac_capability": False,
        "neurology_capability": False,
        "ventilator_available": False,
        "blood_bank_available": False,
    }
]

# We will generate doctors programmatically to save space
DOCTOR_TEMPLATES = [
    ("Emergency Medicine", "AVAILABLE", "DAY", 0),
    ("Emergency Medicine", "BUSY", "DAY", 3),
    ("Cardiology", "AVAILABLE", "DAY", 1),
    ("Cardiology", "OFF_DUTY", "NIGHT", 0),
    ("Neurology", "BUSY", "DAY", 2),
    ("Trauma Surgery", "AVAILABLE", "DAY", 0),
    ("General Surgery", "AVAILABLE", "NIGHT", 1),
    ("Critical Care", "BUSY", "DAY", 4),
    ("Anesthesiology", "AVAILABLE", "NIGHT", 0),
    ("Orthopedics", "OFF_DUTY", "DAY", 0)
]

AMBULANCES = [
    {
        "ambulance_id": "AMB-001",
        "type": AmbulanceType.ALS.value,
        "status": AmbulanceStatus.AVAILABLE.value,
        "latitude": 28.6140,
        "longitude": 77.2095,
        "equipment": ["OXYGEN", "DEFIBRILLATOR", "CARDIAC_MONITOR"],
        "crew_type": "PARAMEDIC",
        "patient_capacity": 1
    },
    {
        "ambulance_id": "AMB-002",
        "type": AmbulanceType.ICU.value,
        "status": AmbulanceStatus.ON_ROUTE.value,
        "latitude": 28.6180,
        "longitude": 77.2150,
        "equipment": ["OXYGEN", "DEFIBRILLATOR", "CARDIAC_MONITOR", "VENTILATOR", "INFUSION_PUMP"],
        "crew_type": "CRITICAL_CARE",
        "patient_capacity": 1
    },
    {
        "ambulance_id": "AMB-003",
        "type": AmbulanceType.BLS.value,
        "status": AmbulanceStatus.AVAILABLE.value,
        "latitude": 28.6255,
        "longitude": 77.2120,
        "equipment": ["OXYGEN", "STRETCHER"],
        "crew_type": "EMT",
        "patient_capacity": 1
    },
    {
        "ambulance_id": "AMB-004",
        "type": AmbulanceType.BLS.value,
        "status": AmbulanceStatus.BUSY.value,
        "latitude": 28.6300,
        "longitude": 77.2250,
        "equipment": ["OXYGEN", "STRETCHER", "FIRST_AID"],
        "crew_type": "EMT",
        "patient_capacity": 2
    },
    {
        "ambulance_id": "AMB-005",
        "type": AmbulanceType.ALS.value,
        "status": AmbulanceStatus.AT_HOSPITAL.value,
        "latitude": 28.6105,
        "longitude": 77.1805,
        "equipment": ["OXYGEN", "DEFIBRILLATOR", "SUCTION"],
        "crew_type": "PARAMEDIC",
        "patient_capacity": 1
    },
    {
        "ambulance_id": "AMB-006",
        "type": AmbulanceType.NEONATAL.value,
        "status": AmbulanceStatus.AVAILABLE.value,
        "latitude": 28.6405,
        "longitude": 77.2005,
        "equipment": ["INCUBATOR", "OXYGEN", "NEONATAL_VENTILATOR"],
        "crew_type": "NEONATAL_SPECIALIST",
        "patient_capacity": 1
    },
    {
        "ambulance_id": "AMB-007",
        "type": AmbulanceType.ICU.value,
        "status": AmbulanceStatus.AVAILABLE.value,
        "latitude": 28.6050,
        "longitude": 77.2150,
        "equipment": ["OXYGEN", "VENTILATOR", "DEFIBRILLATOR", "CARDIAC_MONITOR"],
        "crew_type": "CRITICAL_CARE",
        "patient_capacity": 1
    },
    {
        "ambulance_id": "AMB-008",
        "type": AmbulanceType.ALS.value,
        "status": AmbulanceStatus.MAINTENANCE.value,
        "latitude": 28.5805,
        "longitude": 77.2550,
        "equipment": ["OXYGEN", "DEFIBRILLATOR"],
        "crew_type": "PARAMEDIC",
        "patient_capacity": 1
    },
    {
        "ambulance_id": "AMB-009",
        "type": AmbulanceType.BLS.value,
        "status": AmbulanceStatus.AVAILABLE.value,
        "latitude": 28.5550,
        "longitude": 77.2050,
        "equipment": ["OXYGEN", "STRETCHER"],
        "crew_type": "EMT",
        "patient_capacity": 1
    },
    {
        "ambulance_id": "AMB-010",
        "type": AmbulanceType.ALS.value,
        "status": AmbulanceStatus.AVAILABLE.value,
        "latitude": 28.6100,
        "longitude": 77.2000,
        "equipment": ["OXYGEN", "DEFIBRILLATOR", "CARDIAC_MONITOR"],
        "crew_type": "PARAMEDIC",
        "patient_capacity": 1
    },
    {
        "ambulance_id": "AMB-011",
        "type": AmbulanceType.BLS.value,
        "status": AmbulanceStatus.ON_ROUTE.value,
        "latitude": 28.6350,
        "longitude": 77.2100,
        "equipment": ["OXYGEN", "STRETCHER"],
        "crew_type": "EMT",
        "patient_capacity": 1
    },
    {
        "ambulance_id": "AMB-012",
        "type": AmbulanceType.ICU.value,
        "status": AmbulanceStatus.AVAILABLE.value,
        "latitude": 28.6250,
        "longitude": 77.2250,
        "equipment": ["OXYGEN", "VENTILATOR", "DEFIBRILLATOR", "CARDIAC_MONITOR", "INFUSION_PUMP"],
        "crew_type": "CRITICAL_CARE",
        "patient_capacity": 1
    }
]

async def seed_resources():
    async with AsyncSessionLocal() as db:
        print("Starting seed script...")
        
        # 1. Seed Hospitals
        hospital_map = {}
        for h_data in HOSPITALS:
            result = await db.execute(select(Hospital).where(Hospital.hospital_id == h_data["hospital_id"]))
            existing = result.scalars().first()
            if existing:
                for k, v in h_data.items():
                    setattr(existing, k, v)
                hospital_map[h_data["hospital_id"]] = existing
            else:
                new_hospital = Hospital(**h_data)
                db.add(new_hospital)
                hospital_map[h_data["hospital_id"]] = new_hospital
        
        await db.commit()
        print(f"Seeded {len(HOSPITALS)} hospitals.")
        
        # Reload hospitals to get their internal IDs
        all_hospitals = (await db.execute(select(Hospital))).scalars().all()
        
        # 2. Seed Doctors
        doc_count = 1
        created_docs = 0
        for hospital in all_hospitals:
            # Add 4-6 doctors per hospital based on index to be deterministic
            num_docs = 4 + (hospital.id % 3)
            
            for i in range(num_docs):
                doc_id = f"DOC-{str(doc_count).zfill(3)}"
                template = DOCTOR_TEMPLATES[(doc_count - 1) % len(DOCTOR_TEMPLATES)]
                
                doc_data = {
                    "doctor_id": doc_id,
                    "name": f"Dr. Fictional {doc_count}",
                    "hospital_id": hospital.id,
                    "specialization": template[0],
                    "availability": template[1],
                    "shift": template[2],
                    "current_emergency_load": template[3],
                    "contact_extension": f"Ext-{1000 + doc_count}"
                }
                
                result = await db.execute(select(Doctor).where(Doctor.doctor_id == doc_id))
                existing = result.scalars().first()
                if existing:
                    for k, v in doc_data.items():
                        setattr(existing, k, v)
                else:
                    db.add(Doctor(**doc_data))
                    created_docs += 1
                
                doc_count += 1
                
        await db.commit()
        print(f"Seeded doctors (Total: {doc_count - 1}).")

        # 3. Seed Ambulances
        for a_data in AMBULANCES:
            result = await db.execute(select(Ambulance).where(Ambulance.ambulance_id == a_data["ambulance_id"]))
            existing = result.scalars().first()
            if existing:
                for k, v in a_data.items():
                    setattr(existing, k, v)
            else:
                db.add(Ambulance(**a_data))
                
        await db.commit()
        print(f"Seeded {len(AMBULANCES)} ambulances.")
        
        print("Seed script completed successfully!")

if __name__ == "__main__":
    asyncio.run(seed_resources())
