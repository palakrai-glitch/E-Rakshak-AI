import asyncio
import os
import sys
import json

# Add backend directory to Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.config import settings
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from sqlalchemy.future import select
from sqlalchemy import delete

from app.models.hospital import Hospital, EmergencyStatus
from app.models.doctor import Doctor, DoctorAvailability
from app.models.ambulance import Ambulance, AmbulanceType, AmbulanceStatus

engine = create_async_engine(settings.DATABASE_URL, echo=False)
AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False)

def load_json(filepath):
    if not os.path.exists(filepath):
        print(f"Error: Required file {filepath} not found.")
        sys.exit(1)
    with open(filepath, 'r', encoding='utf-8') as f:
        return json.load(f)

async def seed_raipur():
    async with AsyncSessionLocal() as db:
        print("=" * 60)
        print("E-Rakshak AI — Raipur GeoJSON Seed Script")
        print("=" * 60)

        # ── 1. Clear old data ──────────────────────────────
        await db.execute(delete(Doctor))
        await db.execute(delete(Ambulance))
        await db.execute(delete(Hospital))
        await db.commit()
        print("✓ Cleared old hospitals, doctors, ambulances.")

        # ── 2. Read GeoJSON Data ────────────────────────────
        base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        hospitals_file = os.path.join(base_dir, 'data', 'gis', 'raipur_hospitals.geojson')
        resources_file = os.path.join(base_dir, 'data', 'gis', 'hospital_resources.geojson')
        doctors_file = os.path.join(base_dir, 'data', 'gis', 'doctors.json')

        hospitals_data = load_json(hospitals_file)
        resources_data = load_json(resources_file)
        doctors_data = load_json(doctors_file)

        # Map resources by hospital ID
        res_map = {}
        for f in resources_data.get("features", []):
            res_map[f["properties"]["hospital_id"]] = f["properties"]

        # ── 3. Insert Hospitals ────────────────────────────
        hospital_id_to_pk = {}
        h_count = 0
        for feature in hospitals_data.get("features", []):
            props = feature["properties"]
            coords = feature["geometry"]["coordinates"]
            hid = props["hospital_id"]
            res = res_map.get(hid, {})
            
            # Map synthetic demo data to our DB schema
            new_hospital = Hospital(
                hospital_id=hid,
                name=props.get("name"),
                address=props.get("address", ""),
                latitude=coords[1],
                longitude=coords[0],
                emergency_department=res.get("SYNTHETIC_DEMO_emergency_capability", True),
                emergency_status=res.get("SYNTHETIC_DEMO_status", "OPEN"),
                icu_capacity=res.get("SYNTHETIC_DEMO_available_beds", 10),
                available_icu_beds=res.get("SYNTHETIC_DEMO_available_beds", 5) // 2,
                general_beds=res.get("SYNTHETIC_DEMO_available_beds", 50) * 2,
                current_occupancy=res.get("SYNTHETIC_DEMO_available_beds", 20),
                trauma_capability=res.get("SYNTHETIC_DEMO_trauma_capability", False),
                cardiac_capability="Cardiology" in res.get("SYNTHETIC_DEMO_specialties", []),
                neurology_capability="Neurology" in res.get("SYNTHETIC_DEMO_specialties", []),
                ventilator_available=res.get("SYNTHETIC_DEMO_oxygen_availability") == "AVAILABLE",
                blood_bank_available=True
            )
            db.add(new_hospital)
            h_count += 1

        await db.commit()

        # Re-fetch to get primary keys
        all_hospitals = (await db.execute(select(Hospital))).scalars().all()
        for h in all_hospitals:
            hospital_id_to_pk[h.hospital_id] = h.id
        print(f"✓ Seeded {h_count} Raipur hospitals with real addresses and geolocations.")

        # ── 4. Insert Doctors ──────────────────────────────
        doc_count = 0
        for doc_obj in doctors_data:
            hosp_id = doc_obj.get("hospital_id")
            pk = hospital_id_to_pk.get(hosp_id)
            if pk is None:
                print(f"  ⚠ Hospital {hosp_id} not found for doctor {doc_obj.get('name')}, skipping.")
                continue
            doc = Doctor(
                doctor_id=doc_obj.get("doctor_id"),
                name=doc_obj.get("name"),
                hospital_id=pk,
                specialization=doc_obj.get("specialty"),
                availability=DoctorAvailability.AVAILABLE.value,
                shift="Morning",
                current_emergency_load=1,
                contact_extension=f"Ext-{1000 + doc_count}"
            )
            db.add(doc)
            doc_count += 1
        await db.commit()
        print(f"✓ Seeded {doc_count} doctors with Indian names and hospital affiliations.")

        # ── 5. Insert Ambulances (Synthetic Demo) ──────────
        # Generate some synthetic ambulances around the first hospital
        import random
        # Ensure consistent relationships
        random.seed(42)
        
        ambulances = []
        ambulance_types = [AmbulanceType.BLS.value, AmbulanceType.ALS.value, AmbulanceType.ICU.value, AmbulanceType.NEONATAL.value]
        ambulance_statuses = [AmbulanceStatus.AVAILABLE.value, AmbulanceStatus.AVAILABLE.value, AmbulanceStatus.BUSY.value, AmbulanceStatus.EN_ROUTE.value if hasattr(AmbulanceStatus, 'EN_ROUTE') else AmbulanceStatus.ON_ROUTE.value, AmbulanceStatus.MAINTENANCE.value]
        
        # We want to create 12 ambulances spread across the existing hospitals
        all_hosp_list = list(all_hospitals)
        
        for i in range(12):
            hosp = all_hosp_list[i % len(all_hosp_list)]
            
            # Generate slight offset for coordinates to simulate parking nearby
            lat_offset = random.uniform(-0.005, 0.005)
            lon_offset = random.uniform(-0.005, 0.005)
            
            amb_type = random.choice(ambulance_types)
            
            ambulances.append({
                "ambulance_id": f"AMB-{101 + i}",
                "vehicle_number": f"CG-04-E-{1000 + i}",
                "type": amb_type,
                "status": random.choice(ambulance_statuses),
                "latitude": hosp.latitude + lat_offset,
                "longitude": hosp.longitude + lon_offset,
                "base_hospital_id": hosp.id,
                "equipment": ["OXYGEN", "FIRST_AID"] if amb_type == "BLS" else ["OXYGEN", "DEFIBRILLATOR", "CARDIAC_MONITOR", "VENTILATOR"],
                "crew_type": "PARAMEDIC" if amb_type in ["ALS", "ICU"] else "EMT",
                "patient_capacity": 1,
                "data_type": "SYNTHETIC_DEMO"
            })
            
        for a_data in ambulances:
            db.add(Ambulance(**a_data))
        await db.commit()
        print(f"✓ Seeded {len(ambulances)} synthetic ambulances.")

        print("=" * 60)
        print("Seed completed successfully!")
        print("=" * 60)


if __name__ == "__main__":
    asyncio.run(seed_raipur())
