from pydantic import BaseModel, ConfigDict
from typing import List
from datetime import datetime
from app.triage.constants import PriorityLevel, DataCompleteness, DISCLAIMER_TEXT

class TriageFactorSchema(BaseModel):
    rule_id: str
    category: str
    description: str
    score_contribution: int

class TriageResultSchema(BaseModel):
    case_id: str
    priority: PriorityLevel
    score: int
    factors: List[TriageFactorSchema]
    data_completeness: DataCompleteness
    generated_at: datetime
    disclaimer: str = DISCLAIMER_TEXT

    model_config = ConfigDict(from_attributes=True)
