from typing import Optional
from dataclasses import dataclass
from app.models.emergency_case import EmergencyCase

@dataclass
class RuleResult:
    rule_id: str
    category: str
    description: str
    score_contribution: int

class BaseRule:
    rule_id = "BASE_RULE"
    category = "BASE"

    def evaluate(self, case: EmergencyCase) -> Optional[RuleResult]:
        raise NotImplementedError

class BreathingObservationRule(BaseRule):
    rule_id = "OBS_BREATHING_ABSENT"
    category = "OBSERVATION"

    def evaluate(self, case: EmergencyCase) -> Optional[RuleResult]:
        if case.breathing is False:
            return RuleResult(
                rule_id=self.rule_id,
                category=self.category,
                description="Reported absence of normal breathing",
                score_contribution=85
            )
        return None

class ConsciousnessObservationRule(BaseRule):
    rule_id = "OBS_UNCONSCIOUS"
    category = "OBSERVATION"

    def evaluate(self, case: EmergencyCase) -> Optional[RuleResult]:
        if case.conscious is False:
            return RuleResult(
                rule_id=self.rule_id,
                category=self.category,
                description="Reported unconsciousness",
                score_contribution=60
            )
        return None

class SevereBleedingRule(BaseRule):
    rule_id = "OBS_SEVERE_BLEEDING"
    category = "OBSERVATION"

    def evaluate(self, case: EmergencyCase) -> Optional[RuleResult]:
        if case.bleeding is True:
            return RuleResult(
                rule_id=self.rule_id,
                category=self.category,
                description="Reported severe or active bleeding",
                score_contribution=40
            )
        return None

class LowSpO2Rule(BaseRule):
    rule_id = "VITAL_SPO2_LOW"
    category = "VITAL_SIGN"

    def evaluate(self, case: EmergencyCase) -> Optional[RuleResult]:
        if case.spo2 is not None and case.spo2 < 92:
            return RuleResult(
                rule_id=self.rule_id,
                category=self.category,
                description=f"Reported SpO2 ({case.spo2}%) falls within configured concerning range (<92%)",
                score_contribution=40
            )
        return None

class HeartRateRule(BaseRule):
    rule_id = "VITAL_HR_ABNORMAL"
    category = "VITAL_SIGN"

    def evaluate(self, case: EmergencyCase) -> Optional[RuleResult]:
        if case.heart_rate is not None:
            if case.heart_rate > 130:
                return RuleResult(
                    rule_id=self.rule_id,
                    category=self.category,
                    description=f"Reported heart rate ({case.heart_rate} bpm) is critically elevated",
                    score_contribution=35
                )
            elif case.heart_rate < 40:
                return RuleResult(
                    rule_id=self.rule_id,
                    category=self.category,
                    description=f"Reported heart rate ({case.heart_rate} bpm) is critically low",
                    score_contribution=40
                )
        return None

class SymptomChestPainRule(BaseRule):
    rule_id = "SYMPTOM_CHEST_PAIN"
    category = "SYMPTOM"

    def evaluate(self, case: EmergencyCase) -> Optional[RuleResult]:
        text_to_search = str(case.chief_complaint or "").lower() + " " + str(case.incident_description or "").lower()
        if case.symptoms:
            text_to_search += " " + " ".join([s.lower() for s in case.symptoms])
            
        if "chest pain" in text_to_search or "heart attack" in text_to_search:
            return RuleResult(
                rule_id=self.rule_id,
                category=self.category,
                description="Reported chest pain or cardiac-related symptoms",
                score_contribution=45
            )
        return None

class SymptomDifficultyBreathingRule(BaseRule):
    rule_id = "SYMPTOM_DIFFICULTY_BREATHING"
    category = "SYMPTOM"

    def evaluate(self, case: EmergencyCase) -> Optional[RuleResult]:
        text_to_search = str(case.chief_complaint or "").lower() + " " + str(case.incident_description or "").lower()
        if case.symptoms:
            text_to_search += " " + " ".join([s.lower() for s in case.symptoms])
            
        if "difficulty breathing" in text_to_search or "shortness of breath" in text_to_search or "choking" in text_to_search:
            return RuleResult(
                rule_id=self.rule_id,
                category=self.category,
                description="Reported difficulty breathing",
                score_contribution=40
            )
        return None

class TraumaIncidentRule(BaseRule):
    rule_id = "INCIDENT_MAJOR_TRAUMA"
    category = "INCIDENT_CONTEXT"

    def evaluate(self, case: EmergencyCase) -> Optional[RuleResult]:
        text_to_search = str(case.chief_complaint or "").lower() + " " + str(case.incident_description or "").lower()
        if "accident" in text_to_search or "crash" in text_to_search or "fall" in text_to_search or "trauma" in text_to_search:
            return RuleResult(
                rule_id=self.rule_id,
                category=self.category,
                description="Incident description indicates potential major trauma",
                score_contribution=30
            )
        return None

# List of all registered rules
REGISTERED_RULES = [
    BreathingObservationRule(),
    ConsciousnessObservationRule(),
    SevereBleedingRule(),
    LowSpO2Rule(),
    HeartRateRule(),
    SymptomChestPainRule(),
    SymptomDifficultyBreathingRule(),
    TraumaIncidentRule()
]
