import json
import os

hospitals = [
    {
        "type": "Feature",
        "properties": {
            "hospital_id": "H001",
            "name": "All India Institute of Medical Sciences (AIIMS), Raipur",
            "address": "Gate No. 1, Great Eastern Rd, Tatibandh, Raipur, Chhattisgarh 492099",
            "locality": "Tatibandh",
            "district": "Raipur",
            "state": "Chhattisgarh",
            "source_url": "https://aiimsraipur.edu.in/",
            "verification_status": "VERIFIED"
        },
        "geometry": {
            "type": "Point",
            "coordinates": [81.57862, 21.25651]
        }
    },
    {
        "type": "Feature",
        "properties": {
            "hospital_id": "H002",
            "name": "Dr. B.R. Ambedkar Memorial Hospital",
            "address": "Medical College Campus, Great Eastern Rd, Raipur, Chhattisgarh 492001",
            "locality": "Moudhapara",
            "district": "Raipur",
            "state": "Chhattisgarh",
            "source_url": "http://www.bramh.in/",
            "verification_status": "VERIFIED"
        },
        "geometry": {
            "type": "Point",
            "coordinates": [81.63733, 21.24151]
        }
    },
    {
        "type": "Feature",
        "properties": {
            "hospital_id": "H003",
            "name": "Ramkrishna CARE Hospital",
            "address": "Aurobindo Enclave, Pachpedi Naka, Raipur, Chhattisgarh 492001",
            "locality": "Pachpedi Naka",
            "district": "Raipur",
            "state": "Chhattisgarh",
            "source_url": "https://www.carehospitals.com/hospital/raipur",
            "verification_status": "VERIFIED"
        },
        "geometry": {
            "type": "Point",
            "coordinates": [81.64412, 21.21856]
        }
    },
    {
        "type": "Feature",
        "properties": {
            "hospital_id": "H004",
            "name": "NH MMI Narayana Superspeciality Hospital",
            "address": "Dhamtari Rd, Lalpur, Raipur, Chhattisgarh 492001",
            "locality": "Lalpur",
            "district": "Raipur",
            "state": "Chhattisgarh",
            "source_url": "https://www.narayanahealth.org/hospitals/raipur/mmi-narayana-superspeciality-hospital",
            "verification_status": "VERIFIED"
        },
        "geometry": {
            "type": "Point",
            "coordinates": [81.64658, 21.21321]
        }
    },
    {
        "type": "Feature",
        "properties": {
            "hospital_id": "H005",
            "name": "Shri Medishine Hospital",
            "address": "Sector 4, Pt. Deen Dayal Upadhyay Nagar, Raipur, Chhattisgarh 492010",
            "locality": "DDU Nagar",
            "district": "Raipur",
            "state": "Chhattisgarh",
            "source_url": "https://shrimedishine.com/",
            "verification_status": "VERIFIED"
        },
        "geometry": {
            "type": "Point",
            "coordinates": [81.59765, 21.24032]
        }
    },
    {
        "type": "Feature",
        "properties": {
            "hospital_id": "H006",
            "name": "Balco Medical Centre",
            "address": "Sector 36, Uparwara, Naya Raipur, Chhattisgarh 493661",
            "locality": "Naya Raipur",
            "district": "Raipur",
            "state": "Chhattisgarh",
            "source_url": "https://balcomedicalcentre.com/",
            "verification_status": "VERIFIED"
        },
        "geometry": {
            "type": "Point",
            "coordinates": [81.79255, 21.16434]
        }
    },
    {
        "type": "Feature",
        "properties": {
            "hospital_id": "H007",
            "name": "Suyash Hospital",
            "address": "Kota-Gudhiyari Road, Kota, Raipur, Chhattisgarh 492010",
            "locality": "Kota",
            "district": "Raipur",
            "state": "Chhattisgarh",
            "source_url": "http://suyashhospitalraipur.com/",
            "verification_status": "VERIFIED"
        },
        "geometry": {
            "type": "Point",
            "coordinates": [81.60421, 21.25881]
        }
    },
    {
        "type": "Feature",
        "properties": {
            "hospital_id": "H008",
            "name": "Vidya Hospital",
            "address": "Vidya Nagar, Bilaspur Road, Raipur, Chhattisgarh 492005",
            "locality": "Vidya Nagar",
            "district": "Raipur",
            "state": "Chhattisgarh",
            "source_url": "https://www.vidyahospitalraipur.com/",
            "verification_status": "VERIFIED"
        },
        "geometry": {
            "type": "Point",
            "coordinates": [81.65982, 21.26733]
        }
    }
]

hospital_geojson = {
    "type": "FeatureCollection",
    "name": "Raipur Hospitals",
    "features": hospitals
}

# Generate Resources
resources = []
for h in hospitals:
    props = h["properties"]
    resources.append({
        "type": "Feature",
        "properties": {
            "hospital_id": props["hospital_id"],
            "name": props["name"],
            # ALL BELOW ARE SYNTHETIC FOR DEMO PURPOSES
            "SYNTHETIC_DEMO_available_beds": 10 + (hash(props["name"]) % 40),
            "SYNTHETIC_DEMO_icu_availability": "AVAILABLE",
            "SYNTHETIC_DEMO_oxygen_availability": "AVAILABLE",
            "SYNTHETIC_DEMO_emergency_capability": True,
            "SYNTHETIC_DEMO_trauma_capability": True if "AIIMS" in props["name"] or "CARE" in props["name"] or "Ambedkar" in props["name"] else False,
            "SYNTHETIC_DEMO_status": "AVAILABLE",
            "SYNTHETIC_DEMO_current_load": "LOW",
            "SYNTHETIC_DEMO_specialties": ["Cardiology", "Neurology", "Orthopedics"] if "AIIMS" in props["name"] or "CARE" in props["name"] else ["General Medicine"]
        },
        "geometry": h["geometry"]
    })

resource_geojson = {
    "type": "FeatureCollection",
    "name": "Hospital Resources (SYNTHETIC DEMO DATA)",
    "features": resources
}

# Generate Doctors
doctors = [
    {
        "doctor_id": "D001",
        "name": "Dr. Rajesh Sharma",
        "specialty": "Cardiology",
        "hospital_id": "H001",
        "verification_status": "SYNTHETIC_DEMO",
        "qualifications": "MD, DM (Cardiology)"
    },
    {
        "doctor_id": "D002",
        "name": "Dr. Anita Verma",
        "specialty": "Neurology",
        "hospital_id": "H001",
        "verification_status": "SYNTHETIC_DEMO",
        "qualifications": "MD, DM (Neurology)"
    },
    {
        "doctor_id": "D003",
        "name": "Dr. Prakash Patel",
        "specialty": "Orthopedics",
        "hospital_id": "H002",
        "verification_status": "SYNTHETIC_DEMO",
        "qualifications": "MS (Orthopedics)"
    },
    {
        "doctor_id": "D004",
        "name": "Dr. Sunita Deshmukh",
        "specialty": "General Surgery",
        "hospital_id": "H003",
        "verification_status": "SYNTHETIC_DEMO",
        "qualifications": "MS (Surgery)"
    },
    {
        "doctor_id": "D005",
        "name": "Dr. Rakesh Singh",
        "specialty": "Emergency Medicine",
        "hospital_id": "H003",
        "verification_status": "SYNTHETIC_DEMO",
        "qualifications": "MD (Emergency Medicine)"
    },
    {
        "doctor_id": "D006",
        "name": "Dr. Meenakshi Iyer",
        "specialty": "Pediatrics",
        "hospital_id": "H004",
        "verification_status": "SYNTHETIC_DEMO",
        "qualifications": "MD (Pediatrics)"
    },
    {
        "doctor_id": "D007",
        "name": "Dr. Vikas Agarwal",
        "specialty": "Trauma Surgery",
        "hospital_id": "H005",
        "verification_status": "SYNTHETIC_DEMO",
        "qualifications": "MS, MCh (Trauma)"
    },
    {
        "doctor_id": "D008",
        "name": "Dr. Neha Gupta",
        "specialty": "Oncology",
        "hospital_id": "H006",
        "verification_status": "SYNTHETIC_DEMO",
        "qualifications": "MD, DM (Oncology)"
    }
]

with open(r'c:\Users\PALAK RAI\Desktop\E-RakshakAI\data\gis\raipur_hospitals.geojson', 'w', encoding='utf-8') as f:
    json.dump(hospital_geojson, f, indent=4)

with open(r'c:\Users\PALAK RAI\Desktop\E-RakshakAI\data\gis\hospital_resources.geojson', 'w', encoding='utf-8') as f:
    json.dump(resource_geojson, f, indent=4)

with open(r'c:\Users\PALAK RAI\Desktop\E-RakshakAI\data\gis\doctors.json', 'w', encoding='utf-8') as f:
    json.dump(doctors, f, indent=4)
