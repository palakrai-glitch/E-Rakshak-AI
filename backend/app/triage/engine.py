from typing import List
from app.models.emergency_case import EmergencyCase
from app.triage.rules import REGISTERED_RULES, RuleResult
from app.triage.constants import PRIORITY_THRESHOLDS, PriorityLevel, DataCompleteness

class TriageEngine:
    @staticmethod
    def evaluate_case(case: EmergencyCase) -> tuple[PriorityLevel, int, List[RuleResult], DataCompleteness]:
        factors = []
        total_score = 0
        
        # Deduplication tracking (prevent double counting similar semantic rules)
        # E.g. if OBS_BREATHING_ABSENT is triggered, we might want to reduce impact of SYMPTOM_DIFFICULTY_BREATHING
        # For this prototype, we just cap the total score safely and rely on explicit rules.
        
        for rule in REGISTERED_RULES:
            result = rule.evaluate(case)
            if result:
                factors.append(result)
                total_score += result.score_contribution
                
        # Cap score at 100 for normalization
        final_score = min(total_score, 100)
        
        priority = PriorityLevel.LOW
        if final_score >= PRIORITY_THRESHOLDS[PriorityLevel.CRITICAL]:
            priority = PriorityLevel.CRITICAL
        elif final_score >= PRIORITY_THRESHOLDS[PriorityLevel.HIGH]:
            priority = PriorityLevel.HIGH
        elif final_score >= PRIORITY_THRESHOLDS[PriorityLevel.MODERATE]:
            priority = PriorityLevel.MODERATE

        completeness = TriageEngine._assess_completeness(case)

        return priority, final_score, factors, completeness

    @staticmethod
    def _assess_completeness(case: EmergencyCase) -> DataCompleteness:
        has_obs = any(v is not None for v in [case.conscious, case.breathing, case.bleeding, case.mobility])
        has_vitals = any(v is not None for v in [case.heart_rate, case.systolic_bp, case.spo2, case.temperature])
        
        if has_obs and has_vitals:
            return DataCompleteness.AVAILABLE
        elif has_obs or has_vitals or case.symptoms:
            return DataCompleteness.PARTIAL
        return DataCompleteness.LIMITED
