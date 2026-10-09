from typing import List
from app.models.doctor import Doctor, DoctorAvailability
from app.schemas.matching import ResourceMatch, MatchFactor
from app.matching.constants import (
    RequiredCapability,
    DOCTOR_WEIGHT_SPECIALIZATION_MATCH,
    DOCTOR_WEIGHT_AVAILABILITY,
    DOCTOR_WEIGHT_LOW_LOAD,
    DOCTOR_WEIGHT_RELEVANT_HOSPITAL
)

def get_target_specializations(capabilities: List[RequiredCapability]) -> List[str]:
    specs = []
    if RequiredCapability.CARDIAC_SUPPORT in capabilities:
        specs.append("Cardiology")
    if RequiredCapability.NEURO_SUPPORT in capabilities:
        specs.append("Neurology")
    if RequiredCapability.TRAUMA_SUPPORT in capabilities:
        specs.extend(["Trauma Surgery", "Orthopedics"])
    if RequiredCapability.CRITICAL_CARE in capabilities:
        specs.extend(["Critical Care", "Anesthesiology", "Emergency Medicine"])
    if RequiredCapability.RESPIRATORY_SUPPORT in capabilities:
        specs.extend(["Pulmonology", "Emergency Medicine"])
        
    if not specs:
        # Default fallback
        specs.append("Emergency Medicine")
        
    return list(set(specs))

def match_doctors(doctors: List[Doctor], capabilities: List[RequiredCapability], matched_hospital_ids: List[str] = None) -> List[ResourceMatch]:
    matches = []
    target_specs = get_target_specializations(capabilities)
    
    for doc in doctors:
        if doc.availability == DoctorAvailability.OFF_DUTY.value:
            continue
            
        score = 0
        factors = []
        
        # 1. Specialization Match
        if doc.specialization in target_specs:
            score += DOCTOR_WEIGHT_SPECIALIZATION_MATCH
            factors.append(MatchFactor(rule="SPECIALIZATION_MATCH", description=f"Matches required specialization: {doc.specialization}", score=DOCTOR_WEIGHT_SPECIALIZATION_MATCH))
        else:
            # If specialization doesn't match the required capabilities, they aren't a strong match.
            # But we don't strictly exclude them, they just score very low.
            pass
            
        # 2. Availability
        if doc.availability == DoctorAvailability.AVAILABLE.value:
            score += DOCTOR_WEIGHT_AVAILABILITY
            factors.append(MatchFactor(rule="DOCTOR_AVAILABLE", description="Doctor is available", score=DOCTOR_WEIGHT_AVAILABILITY))
            
        # 3. Emergency Load
        if doc.current_emergency_load == 0:
            score += DOCTOR_WEIGHT_LOW_LOAD
            factors.append(MatchFactor(rule="LOW_LOAD", description="Doctor currently has no emergency cases", score=DOCTOR_WEIGHT_LOW_LOAD))
        elif doc.current_emergency_load <= 2:
            score += DOCTOR_WEIGHT_LOW_LOAD // 2
            factors.append(MatchFactor(rule="MODERATE_LOAD", description="Doctor has a manageable load", score=DOCTOR_WEIGHT_LOW_LOAD // 2))
            
        # 4. Relevant Hospital (If we passed down matched hospital IDs, we can boost doctors from top hospitals)
        if matched_hospital_ids and doc.hospital and doc.hospital.hospital_id in matched_hospital_ids[:3]:
            score += DOCTOR_WEIGHT_RELEVANT_HOSPITAL
            factors.append(MatchFactor(rule="RELEVANT_HOSPITAL", description="Doctor works at a top-matched hospital", score=DOCTOR_WEIGHT_RELEVANT_HOSPITAL))

        # Only include if they scored something (i.e. relevant spec or at least available)
        if score > 0:
            matches.append(ResourceMatch(
                resource_id=doc.doctor_id,
                resource_type="DOCTOR",
                rank=0,
                score=score,
                eligibility="ELIGIBLE",
                associated_hospital_id=doc.hospital.hospital_id if doc.hospital else None,
                factors=factors
            ))
            
    return matches
