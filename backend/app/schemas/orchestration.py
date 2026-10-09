from pydantic import BaseModel, Field
from typing import List, Optional, Any
from datetime import datetime
from enum import Enum

class PathwayStatus(str, Enum):
    FEASIBLE = "FEASIBLE"
    DEGRADED = "DEGRADED"
    NO_FEASIBLE_PATHWAY = "NO_FEASIBLE_PATHWAY"

class ResourceReference(BaseModel):
    resource_id: str
    name: str
    score: int
    details: List[str]
    distance_km: Optional[float] = None
    eta_minutes: Optional[int] = None

class CarePathway(BaseModel):
    pathway_id: str = Field(..., description="Unique ID for this pathway combination")
    ambulance: ResourceReference
    hospital: ResourceReference
    doctor: ResourceReference
    pathway_score: int
    status: PathwayStatus
    reasons: List[str]
    total_distance_km: Optional[float] = None
    total_eta_minutes: Optional[int] = None
    route_geometry: Optional[Any] = None

class OrchestrationResult(BaseModel):
    case_id: str
    priority: str
    required_capabilities: List[str]
    recommended_pathway: Optional[CarePathway]
    alternative_pathways: List[CarePathway]
    status: PathwayStatus
    
    # Change explanation fields
    previous_pathway_id: Optional[str] = None
    change_reason: Optional[str] = None
    change_explanation: Optional[List[str]] = None
    
    generated_at: datetime
