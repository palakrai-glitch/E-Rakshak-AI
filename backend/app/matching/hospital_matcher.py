from typing import List
from app.models.hospital import Hospital, EmergencyStatus
from app.schemas.matching import ResourceMatch, MatchFactor
from app.matching.constants import (
    RequiredCapability,
    HOSPITAL_WEIGHT_CAPABILITY_MATCH,
    HOSPITAL_WEIGHT_ICU_AVAILABILITY,
    HOSPITAL_WEIGHT_EMERGENCY_STATUS,
    HOSPITAL_WEIGHT_SUPPORT_AVAILABILITY,
    HOSPITAL_WEIGHT_CAPACITY_AVAILABILITY
)

def match_hospitals(hospitals: List[Hospital], capabilities: List[RequiredCapability]) -> List[ResourceMatch]:
    matches = []
    
    for hosp in hospitals:
        # Check eligibility
        if hosp.emergency_status == EmergencyStatus.CLOSED.value:
            continue
            
        score = 0
        factors = []
        
        # 1. Emergency Status
        if hosp.emergency_status == EmergencyStatus.OPEN.value:
            score += HOSPITAL_WEIGHT_EMERGENCY_STATUS
            factors.append(MatchFactor(rule="EMERGENCY_OPEN", description="Emergency department is OPEN", score=HOSPITAL_WEIGHT_EMERGENCY_STATUS))
        elif hosp.emergency_status == EmergencyStatus.LIMITED.value:
            # Penalize limited status
            limited_score = HOSPITAL_WEIGHT_EMERGENCY_STATUS // 2
            score += limited_score
            factors.append(MatchFactor(rule="EMERGENCY_LIMITED", description="Emergency department has LIMITED capacity", score=limited_score))
            
        # 2. Capability Match
        cap_score = 0
        cap_reasons = []
        if RequiredCapability.TRAUMA_SUPPORT in capabilities and hosp.trauma_capability:
            cap_score += 15
            cap_reasons.append("Trauma capability available")
        if RequiredCapability.CARDIAC_SUPPORT in capabilities and hosp.cardiac_capability:
            cap_score += 15
            cap_reasons.append("Cardiac capability available")
        if RequiredCapability.NEURO_SUPPORT in capabilities and hosp.neurology_capability:
            cap_score += 15
            cap_reasons.append("Neurology capability available")
            
        cap_score = min(cap_score, HOSPITAL_WEIGHT_CAPABILITY_MATCH)
        if cap_score > 0:
            score += cap_score
            factors.append(MatchFactor(rule="CAPABILITY_MATCH", description=", ".join(cap_reasons), score=cap_score))
            
        # 3. ICU Availability
        if RequiredCapability.CRITICAL_CARE in capabilities:
            if hosp.available_icu_beds > 0:
                score += HOSPITAL_WEIGHT_ICU_AVAILABILITY
                factors.append(MatchFactor(rule="ICU_AVAILABLE", description="ICU beds are available", score=HOSPITAL_WEIGHT_ICU_AVAILABILITY))
            else:
                # No ICU beds, major penalty for critical care
                pass 
                
        # 4. Support Availability (Ventilator/Blood)
        sup_score = 0
        sup_reasons = []
        if RequiredCapability.VENTILATOR_SUPPORT in capabilities and hosp.ventilator_available:
            sup_score += 10
            sup_reasons.append("Ventilator available")
        if RequiredCapability.BLOOD_SUPPORT in capabilities and hosp.blood_bank_available:
            sup_score += 10
            sup_reasons.append("Blood bank available")
            
        # Give points if respiratory support needs ventilators
        if RequiredCapability.RESPIRATORY_SUPPORT in capabilities and hosp.ventilator_available:
            sup_score += 10
            sup_reasons.append("Ventilator available for respiratory support")

        sup_score = min(sup_score, HOSPITAL_WEIGHT_SUPPORT_AVAILABILITY)
        if sup_score > 0:
            score += sup_score
            factors.append(MatchFactor(rule="SUPPORT_MATCH", description=", ".join(list(set(sup_reasons))), score=sup_score))

        # 5. General Capacity Availability
        if hosp.general_beds > hosp.current_occupancy:
            score += HOSPITAL_WEIGHT_CAPACITY_AVAILABILITY
            factors.append(MatchFactor(rule="CAPACITY_AVAILABLE", description="General beds available", score=HOSPITAL_WEIGHT_CAPACITY_AVAILABILITY))

        matches.append(ResourceMatch(
            resource_id=hosp.hospital_id,
            resource_type="HOSPITAL",
            rank=0,
            score=score,
            eligibility="ELIGIBLE",
            factors=factors
        ))
        
    return matches
