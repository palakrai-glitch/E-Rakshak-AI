from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from app.services.emergency_case_service import EmergencyCaseService
from app.triage.engine import TriageEngine
from app.schemas.triage import TriageResultSchema, TriageFactorSchema
from app.triage.constants import DISCLAIMER_TEXT

class TriageService:
    @staticmethod
    async def run_triage(db: AsyncSession, case_id: str) -> TriageResultSchema | None:
        case = await EmergencyCaseService.get_case_by_id(db, case_id)
        if not case:
            return None
            
        priority, score, raw_factors, completeness = TriageEngine.evaluate_case(case)
        
        # Convert raw rule results to schema
        factors = [
            TriageFactorSchema(
                rule_id=f.rule_id,
                category=f.category,
                description=f.description,
                score_contribution=f.score_contribution
            ) for f in raw_factors
        ]
        
        return TriageResultSchema(
            case_id=case.case_id,
            priority=priority,
            score=score,
            factors=factors,
            data_completeness=completeness,
            generated_at=datetime.now(timezone.utc),
            disclaimer=DISCLAIMER_TEXT
        )
