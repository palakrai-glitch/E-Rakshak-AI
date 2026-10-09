from typing import List, Optional, Tuple, Dict
from datetime import datetime, timezone
from app.schemas.orchestration import OrchestrationResult, PathwayStatus, CarePathway
from app.schemas.matching import MatchingResultSchema
from app.orchestration.constants import ORCHESTRATION_WEIGHTS
from app.orchestration.evaluator import evaluate_pathways
from app.location.service import LocationService

async def orchestrate_pathways(
    case_id: str,
    priority: str,
    capabilities: List[str],
    matching_result: MatchingResultSchema,
    case_location: Tuple[float, float],
    resource_locations: Dict[str, Tuple[float, float]],
    previous_pathway_id: Optional[str] = None
) -> OrchestrationResult:
    """
    Main entry point for generating the orchestration result from Phase 5 matchings.
    """
    pathways = evaluate_pathways(
        matching_result.ambulances,
        matching_result.hospitals,
        matching_result.doctors,
        ORCHESTRATION_WEIGHTS,
        case_location,
        resource_locations
    )
    
    if not pathways:
        return OrchestrationResult(
            case_id=case_id,
            priority=priority,
            required_capabilities=capabilities,
            recommended_pathway=None,
            alternative_pathways=[],
            status=PathwayStatus.NO_FEASIBLE_PATHWAY,
            generated_at=datetime.now(timezone.utc)
        )
        
    recommended = pathways[0]
    alternatives = pathways[1:]
    
    status = PathwayStatus.FEASIBLE
    change_reason = None
    change_explanation = None
    
    if previous_pathway_id and previous_pathway_id != recommended.pathway_id:
        # A change has occurred since the last known pathway!
        status = PathwayStatus.DEGRADED
        
        # Build explanation
        prev_parts = previous_pathway_id.split("::")
        prev_amb, prev_hosp, prev_doc = prev_parts if len(prev_parts) == 3 else ("?", "?", "?")
        
        change_reason = "Resource capacity or availability changed, making the previous pathway suboptimal or invalid."
        explanation = []
        if prev_amb != recommended.ambulance.resource_id:
            explanation.append(f"Ambulance switched from {prev_amb} to {recommended.ambulance.resource_id}.")
        if prev_hosp != recommended.hospital.resource_id:
            explanation.append(f"Hospital switched from {prev_hosp} to {recommended.hospital.resource_id}.")
        if prev_doc != recommended.doctor.resource_id:
            explanation.append(f"Doctor switched from {prev_doc} to {recommended.doctor.resource_id}.")
        
        explanation.append("The new pathway offers a better feasible score based on current resource states.")
        change_explanation = explanation

    # Fetch OSRM Route for the recommended pathway
    # Patient -> Recommended Hospital
    hosp_loc = resource_locations.get(recommended.hospital.resource_id)
    if hosp_loc:
        route = await LocationService.get_route(
            case_location[0], case_location[1],
            hosp_loc[0], hosp_loc[1]
        )
        recommended.total_distance_km = route.distance_km
        recommended.total_eta_minutes = route.duration_minutes
        recommended.route_geometry = route.geometry
        recommended.hospital.distance_km = route.distance_km
        recommended.hospital.eta_minutes = route.duration_minutes
        
    # Ambulance -> Patient
    amb_loc = resource_locations.get(recommended.ambulance.resource_id)
    if amb_loc:
        amb_route = await LocationService.get_route(
            amb_loc[0], amb_loc[1],
            case_location[0], case_location[1]
        )
        recommended.ambulance.distance_km = amb_route.distance_km
        recommended.ambulance.eta_minutes = amb_route.duration_minutes

    return OrchestrationResult(
        case_id=case_id,
        priority=priority,
        required_capabilities=capabilities,
        recommended_pathway=recommended,
        alternative_pathways=alternatives[:3], # Return top 3 alternatives
        status=status,
        previous_pathway_id=previous_pathway_id,
        change_reason=change_reason,
        change_explanation=change_explanation,
        generated_at=datetime.now(timezone.utc)
    )
