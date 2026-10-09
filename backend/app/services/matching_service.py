from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.emergency_case import EmergencyCase
from app.schemas.triage import TriageResultSchema
from app.schemas.matching import MatchingResultSchema
from app.services.resource_service import ResourceService
from app.matching.engine import derive_required_capabilities, rank_matches
from app.matching.ambulance_matcher import match_ambulances
from app.matching.hospital_matcher import match_hospitals
from app.matching.doctor_matcher import match_doctors

class MatchingService:
    @staticmethod
    async def match_resources(db: AsyncSession, case: EmergencyCase, triage: TriageResultSchema) -> MatchingResultSchema:
        # 1. Derive Required Capabilities
        capabilities = derive_required_capabilities(case, triage)
        
        # 2. Fetch Registry
        all_ambulances = await ResourceService.get_ambulances(db)
        all_hospitals = await ResourceService.get_hospitals(db)
        all_doctors = await ResourceService.get_doctors(db)
        
        # 3. Match Ambulances
        ambulance_matches = match_ambulances(all_ambulances, capabilities)
        ranked_ambulances = rank_matches(ambulance_matches)
        
        # 4. Match Hospitals
        hospital_matches = match_hospitals(all_hospitals, capabilities)
        ranked_hospitals = rank_matches(hospital_matches)
        
        # Extract top hospital IDs to boost doctors at those hospitals
        top_hospital_ids = [h.resource_id for h in ranked_hospitals[:5]]
        
        # 5. Match Doctors
        doctor_matches = match_doctors(all_doctors, capabilities, top_hospital_ids)
        ranked_doctors = rank_matches(doctor_matches)
        
        # 6. Construct Result
        return MatchingResultSchema(
            case_id=case.case_id,
            priority=triage.priority,
            required_capabilities=capabilities,
            ambulances=ranked_ambulances,
            hospitals=ranked_hospitals,
            doctors=ranked_doctors,
            generated_at=datetime.now(timezone.utc)
        )
