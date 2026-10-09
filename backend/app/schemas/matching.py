from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
from app.matching.constants import RequiredCapability

class MatchFactor(BaseModel):
    rule: str
    description: str
    score: int

class ResourceMatch(BaseModel):
    resource_id: str
    resource_type: str
    rank: int
    score: int
    eligibility: str  # e.g., "ELIGIBLE", "NOT_ELIGIBLE"
    associated_hospital_id: Optional[str] = None
    factors: List[MatchFactor]

class MatchingResultSchema(BaseModel):
    case_id: str
    priority: str
    required_capabilities: List[RequiredCapability]
    ambulances: List[ResourceMatch]
    hospitals: List[ResourceMatch]
    doctors: List[ResourceMatch]
    generated_at: datetime
