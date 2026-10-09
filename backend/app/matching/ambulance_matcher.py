from typing import List
from app.models.ambulance import Ambulance, AmbulanceStatus, AmbulanceType
from app.schemas.matching import ResourceMatch, MatchFactor
from app.matching.constants import (
    RequiredCapability,
    AMBULANCE_WEIGHT_STATUS_AVAILABLE,
    AMBULANCE_WEIGHT_REQUIRED_EQUIPMENT,
    AMBULANCE_WEIGHT_TYPE_SUITABILITY,
    AMBULANCE_WEIGHT_CREW_SUITABILITY,
    AMBULANCE_WEIGHT_PATIENT_CAPACITY
)

def match_ambulances(ambulances: List[Ambulance], capabilities: List[RequiredCapability]) -> List[ResourceMatch]:
    matches = []
    
    for amb in ambulances:
        # Check eligibility
        if amb.status in [AmbulanceStatus.MAINTENANCE.value, AmbulanceStatus.BUSY.value]:
            continue
            
        score = 0
        factors = []
        
        # 1. Availability
        if amb.status == AmbulanceStatus.AVAILABLE.value:
            score += AMBULANCE_WEIGHT_STATUS_AVAILABLE
            factors.append(MatchFactor(rule="STATUS_AVAILABLE", description="Ambulance is immediately available", score=AMBULANCE_WEIGHT_STATUS_AVAILABLE))
        
        # 2. Equipment Suitability based on RequiredCapabilities
        equip_score = 0
        equip_reasons = []
        
        if RequiredCapability.RESPIRATORY_SUPPORT in capabilities:
            if "OXYGEN" in amb.equipment or "VENTILATOR" in amb.equipment:
                equip_score += 15
                equip_reasons.append("Respiratory equipment found")
        
        if RequiredCapability.CARDIAC_SUPPORT in capabilities:
            if "DEFIBRILLATOR" in amb.equipment or "CARDIAC_MONITOR" in amb.equipment:
                equip_score += 15
                equip_reasons.append("Cardiac equipment found")
                
        if RequiredCapability.CRITICAL_CARE in capabilities:
            if "VENTILATOR" in amb.equipment:
                equip_score += 10
                equip_reasons.append("Ventilator found for critical care")
                
        # Cap equipment score at max weight
        equip_score = min(equip_score, AMBULANCE_WEIGHT_REQUIRED_EQUIPMENT)
        if equip_score > 0:
            score += equip_score
            factors.append(MatchFactor(rule="EQUIPMENT_MATCH", description=", ".join(equip_reasons), score=equip_score))
            
        # 3. Type Suitability
        type_score = 0
        if RequiredCapability.CRITICAL_CARE in capabilities and amb.type == AmbulanceType.ICU.value:
            type_score += AMBULANCE_WEIGHT_TYPE_SUITABILITY
            factors.append(MatchFactor(rule="TYPE_SUITABILITY", description="ICU Ambulance matches critical care requirement", score=AMBULANCE_WEIGHT_TYPE_SUITABILITY))
        elif RequiredCapability.TRAUMA_SUPPORT in capabilities and amb.type in [AmbulanceType.ALS.value, AmbulanceType.ICU.value]:
            type_score += AMBULANCE_WEIGHT_TYPE_SUITABILITY
            factors.append(MatchFactor(rule="TYPE_SUITABILITY", description="ALS/ICU matches trauma requirement", score=AMBULANCE_WEIGHT_TYPE_SUITABILITY))
        elif amb.type == AmbulanceType.BLS.value and not (RequiredCapability.CRITICAL_CARE in capabilities or RequiredCapability.TRAUMA_SUPPORT in capabilities):
            type_score += AMBULANCE_WEIGHT_TYPE_SUITABILITY
            factors.append(MatchFactor(rule="TYPE_SUITABILITY", description="BLS suitable for non-critical case", score=AMBULANCE_WEIGHT_TYPE_SUITABILITY))
        elif amb.type == AmbulanceType.ALS.value:
             # ALS is a good fallback
             type_score += AMBULANCE_WEIGHT_TYPE_SUITABILITY // 2
             factors.append(MatchFactor(rule="TYPE_SUITABILITY", description="ALS provides general advanced support", score=type_score))
             
        score += type_score

        # 4. Patient Capacity (Just a baseline score if they have capacity)
        if amb.patient_capacity >= 1:
            score += AMBULANCE_WEIGHT_PATIENT_CAPACITY
            factors.append(MatchFactor(rule="CAPACITY_MATCH", description="Has patient capacity", score=AMBULANCE_WEIGHT_PATIENT_CAPACITY))

        matches.append(ResourceMatch(
            resource_id=amb.ambulance_id,
            resource_type="AMBULANCE",
            rank=0, # Computed later
            score=score,
            eligibility="ELIGIBLE",
            factors=factors
        ))
        
    return matches
