from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.location.service import LocationService
from app.location.schemas import RouteEstimate
from app.services.emergency_case_service import EmergencyCaseService
from app.services.resource_service import ResourceService
from app.services.orchestration_service import generate_orchestration
from typing import Dict, Any, List

router = APIRouter(prefix="/location", tags=["Location"])

@router.get("/route", response_model=RouteEstimate)
async def get_route(
    origin_lat: float = Query(..., ge=-90, le=90),
    origin_lon: float = Query(..., ge=-180, le=180),
    dest_lat: float = Query(..., ge=-90, le=90),
    dest_lon: float = Query(..., ge=-180, le=180),
):
    """Get route estimate between two points."""
    return await LocationService.get_route(origin_lat, origin_lon, dest_lat, dest_lon)

@router.get("/cases/{case_id}/location")
async def get_case_location(case_id: str, db: AsyncSession = Depends(get_db)):
    case = await EmergencyCaseService.get_case_by_id(db, case_id)
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
        
    return {
        "case_id": case.case_id,
        "latitude": float(case.latitude),
        "longitude": float(case.longitude)
    }

@router.get("/cases/{case_id}/map")
async def get_case_map_data(case_id: str, db: AsyncSession = Depends(get_db)):
    """
    Returns case location, orchestration pathway, and lists of resources for map rendering.
    """
    case = await EmergencyCaseService.get_case_by_id(db, case_id)
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
        
    # Get all resources for the map
    hospitals = await ResourceService.get_hospitals(db)
    ambulances = await ResourceService.get_ambulances(db)
    
    # Get current orchestration
    # If this fails (e.g. no triage), we still want to return map data, but recommended_pathway might be None
    try:
        orchestration = await generate_orchestration(db, case_id)
        orch_data = orchestration.model_dump(mode="json")
    except Exception:
        orch_data = None
        
    from app.schemas.resources import HospitalSchema, AmbulanceWithHospitalSchema
    return {
        "case": {
            "case_id": case.case_id,
            "latitude": float(case.latitude),
            "longitude": float(case.longitude)
        },
        "hospitals": [HospitalSchema.model_validate(h).model_dump(mode="json") for h in hospitals],
        "ambulances": [AmbulanceWithHospitalSchema.model_validate(a).model_dump(mode="json") for a in ambulances],
        "orchestration": orch_data
    }

import httpx

@router.get("/geocode")
async def geocode_address(query: str = Query(..., min_length=3)):
    """
    Resolve a text address/locality to geographic coordinates using Nominatim (OpenStreetMap).
    """
    url = "https://nominatim.openstreetmap.org/search"
    params = {
        "q": query,
        "format": "json",
        "limit": 5,
        "addressdetails": 1
    }
    headers = {
        "User-Agent": "E-RakshakAI/1.0 (Emergency Care Orchestration Platform)"
    }
    
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(url, params=params, headers=headers, timeout=10.0)
            response.raise_for_status()
            data = response.json()
            
            results = []
            for item in data:
                results.append({
                    "name": item.get("display_name"),
                    "latitude": float(item.get("lat")),
                    "longitude": float(item.get("lon")),
                    "type": item.get("type"),
                    "importance": item.get("importance")
                })
            
            return {"results": results}
        except Exception as e:
            raise HTTPException(status_code=503, detail=f"Geocoding service unavailable: {str(e)}")
