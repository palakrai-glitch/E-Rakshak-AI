from typing import List, Dict, Any
from app.schemas.orchestration import CarePathway, ResourceReference, PathwayStatus

def generate_pathway_id(ambulance_id: str, hospital_id: str, doctor_id: str) -> str:
    return f"{ambulance_id}::{hospital_id}::{doctor_id}"

from app.location.distance import calculate_haversine
from typing import Tuple

def evaluate_pathways(
    ambulances: List[Any],
    hospitals: List[Any],
    doctors: List[Any],
    weights: Dict[str, float],
    case_location: Tuple[float, float],
    resource_locations: Dict[str, Tuple[float, float]]
) -> List[CarePathway]:
    """
    Evaluates compatible combinations of Phase 5 matches to form a complete Care Pathway.
    Compatibility:
    - Ambulance is independent but needs to be eligible (handled by Phase 5, we just take top N).
    - Doctor MUST belong to the selected Hospital.
    """
    pathways = []
    
    # Only take top 3 ambulances and top 5 hospitals to avoid combinatorial explosion
    top_ambulances = ambulances[:3]
    top_hospitals = hospitals[:5]
    
    for amb in top_ambulances:
        if amb.score < 20: # Arbitrary minimum threshold
            continue
            
        for hosp in top_hospitals:
            if hosp.score < 20:
                continue
                
            # Find the best doctor that belongs to this hospital
            compatible_doctors = [d for d in doctors if d.associated_hospital_id == hosp.resource_id]
            
            if not compatible_doctors:
                continue
                
            # Take the best doctor for this hospital
            best_doc = compatible_doctors[0]
            
            if best_doc.score < 10:
                continue
            
            # Geographic Scoring
            amb_loc = resource_locations.get(amb.resource_id)
            hosp_loc = resource_locations.get(hosp.resource_id)
            
            geo_score = 0
            geo_distance_total = 0
            if amb_loc and hosp_loc:
                # Ambulance -> Patient distance
                dist_amb = calculate_haversine(amb_loc[0], amb_loc[1], case_location[0], case_location[1])
                # Patient -> Hospital distance
                dist_hosp = calculate_haversine(case_location[0], case_location[1], hosp_loc[0], hosp_loc[1])
                
                geo_distance_total = dist_amb + dist_hosp
                
                # Scoring: 100 for < 5km total, degrades linearly to 0 at 50km
                geo_score = max(0, min(100, 100 - (geo_distance_total - 5) * (100 / 45)))
                
            # Calculate composite pathway score
            pathway_score = (
                amb.score * weights["ambulance"] +
                hosp.score * weights["hospital"] +
                best_doc.score * weights["doctor"] +
                geo_score * weights["geographic"]
            )
            
            reasons = [
                f"✓ Ambulance ({amb.resource_id}) brings score {amb.score}",
                f"✓ Hospital ({hosp.resource_id}) brings score {hosp.score}",
                f"✓ Specialist ({best_doc.resource_id}) at this hospital brings score {best_doc.score}",
                "✓ Selected resources are operationally compatible"
            ]
            
            if geo_distance_total > 0:
                reasons.append(f"✓ Closest feasible combination (approx {geo_distance_total:.1f} km direct)")
            
            pathway = CarePathway(
                pathway_id=generate_pathway_id(amb.resource_id, hosp.resource_id, best_doc.resource_id),
                ambulance=ResourceReference(
                    resource_id=amb.resource_id,
                    name=amb.resource_id, # Fallback name
                    score=amb.score,
                    details=[f.description for f in amb.factors]
                ),
                hospital=ResourceReference(
                    resource_id=hosp.resource_id,
                    name=hosp.resource_id, # Fallback name
                    score=hosp.score,
                    details=[f.description for f in hosp.factors]
                ),
                doctor=ResourceReference(
                    resource_id=best_doc.resource_id,
                    name=best_doc.resource_id, # Fallback name
                    score=best_doc.score,
                    details=[f.description for f in best_doc.factors]
                ),
                pathway_score=int(pathway_score),
                status=PathwayStatus.FEASIBLE,
                reasons=reasons
            )
            pathways.append(pathway)
            
    # Sort pathways by score descending
    pathways.sort(key=lambda p: p.pathway_score, reverse=True)
    return pathways
