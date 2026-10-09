from typing import List
from app.models.emergency_case import EmergencyCase
from app.schemas.triage import TriageResultSchema
from app.matching.constants import RequiredCapability

def derive_required_capabilities(case: EmergencyCase, triage: TriageResultSchema) -> List[RequiredCapability]:
    capabilities = set()
    
    # 1. Evaluate Symptoms and Chief Complaint for broad capabilities
    complaint = (case.chief_complaint or "").lower()
    symptoms = (case.symptoms or [])
    symptoms_lower = [s.lower() for s in symptoms]
    
    if "chest pain" in complaint or "heart" in complaint or "chest tightness" in complaint or "chest pain" in symptoms_lower:
        capabilities.add(RequiredCapability.CARDIAC_SUPPORT)
        
    if "breathing" in complaint or "breath" in complaint or "difficulty breathing" in symptoms_lower or not case.breathing:
        capabilities.add(RequiredCapability.RESPIRATORY_SUPPORT)
        
    if "accident" in complaint or "trauma" in complaint or "bleeding" in complaint or case.bleeding or "severe bleeding" in symptoms_lower:
        capabilities.add(RequiredCapability.TRAUMA_SUPPORT)
        
    if "stroke" in complaint or "seizure" in complaint or "head" in complaint:
        capabilities.add(RequiredCapability.NEURO_SUPPORT)
        
    # 2. Evaluate Triage Factors / Priority
    if triage.priority in ["CRITICAL", "HIGH"]:
        # High likelihood of needing critical care
        capabilities.add(RequiredCapability.CRITICAL_CARE)
        
    for factor in triage.factors:
        rule = factor.rule_id.lower()
        if "spo2" in rule or "breathing" in rule:
            capabilities.add(RequiredCapability.RESPIRATORY_SUPPORT)
        if "heart_rate" in rule or "blood_pressure" in rule:
            capabilities.add(RequiredCapability.CARDIAC_SUPPORT)
        if "unconscious" in rule:
            capabilities.add(RequiredCapability.CRITICAL_CARE)
            capabilities.add(RequiredCapability.NEURO_SUPPORT)
            
    return list(capabilities)

def rank_matches(matches: list) -> list:
    """Sorts resource matches by score (DESC) and then resource_id (ASC) for determinism."""
    # Secondary sort by resource_id to ensure determinism
    sorted_matches = sorted(matches, key=lambda x: (-x.score, x.resource_id))
    
    # Assign ranks
    for i, match in enumerate(sorted_matches):
        match.rank = i + 1
        
    return sorted_matches
