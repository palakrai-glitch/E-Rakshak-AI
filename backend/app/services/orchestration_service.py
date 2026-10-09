from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException
from app.services.emergency_case_service import EmergencyCaseService
from app.services.triage_service import TriageService
from app.services.matching_service import MatchingService
from app.orchestration.engine import orchestrate_pathways
from app.schemas.orchestration import OrchestrationResult
from typing import Optional

async def generate_orchestration(
    db: AsyncSession,
    case_id: str,
    previous_pathway_id: Optional[str] = None
) -> OrchestrationResult:
    case = await EmergencyCaseService.get_case_by_id(db, case_id)
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
        
    triage = await TriageService.run_triage(db, case_id)
    if not triage:
        raise HTTPException(status_code=404, detail="Triage failed")
        
    matching_result = await MatchingService.match_resources(db, case, triage)
    
    from app.services.resource_service import ResourceService
    hospitals = await ResourceService.get_hospitals(db)
    ambulances = await ResourceService.get_ambulances(db)
    
    resource_locations = {}
    for h in hospitals:
        if h.latitude is not None and h.longitude is not None:
            resource_locations[h.hospital_id] = (float(h.latitude), float(h.longitude))
            
    for a in ambulances:
        if a.latitude is not None and a.longitude is not None:
            resource_locations[a.ambulance_id] = (float(a.latitude), float(a.longitude))

    case_lat = float(case.latitude) if case.latitude is not None else 0.0
    case_lon = float(case.longitude) if case.longitude is not None else 0.0

    # We pass the matching result to the Orchestration Engine
    result = await orchestrate_pathways(
        case_id=case_id,
        priority=matching_result.priority,
        capabilities=matching_result.required_capabilities,
        matching_result=matching_result,
        case_location=(case_lat, case_lon),
        resource_locations=resource_locations,
        previous_pathway_id=previous_pathway_id
    )
    
    # Persist assignment minimally
    if result.recommended_pathway and result.recommended_pathway.ambulance:
        amb_id = result.recommended_pathway.ambulance.resource_id
        if case.assigned_ambulance_id != amb_id:
            case.assigned_ambulance_id = amb_id
            case.ambulance_assignment_status = "PENDING"
            case.patient_pathway_confirmed = False
            db.add(case)
            await db.commit()
    
    return result
