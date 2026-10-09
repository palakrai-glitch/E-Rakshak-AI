from pydantic import BaseModel
from typing import List, Optional, Any

class RouteEstimate(BaseModel):
    distance_km: float
    duration_minutes: Optional[int] = None
    geometry: Optional[Any] = None
    source: str
    available: bool
