import httpx
import logging
from typing import Optional, Dict, Any
from app.core.config import settings

logger = logging.getLogger(__name__)

async def get_osrm_route(origin_lat: float, origin_lon: float, dest_lat: float, dest_lon: float) -> Optional[Dict[str, Any]]:
    """
    Fetches a route from OSRM.
    OSRM coordinates are passed as lon,lat.
    """
    if settings.ROUTING_PROVIDER != "osrm":
        return None
        
    url = f"{settings.OSRM_BASE_URL}/route/v1/driving/{origin_lon},{origin_lat};{dest_lon},{dest_lat}?overview=full&geometries=geojson"
    
    try:
        async with httpx.AsyncClient(timeout=3.0) as client:
            response = await client.get(url)
            if response.status_code == 200:
                data = response.json()
                if data.get("code") == "Ok" and data.get("routes"):
                    route = data["routes"][0]
                    distance_m = route.get("distance", 0)
                    duration_s = route.get("duration", 0)
                    geometry = route.get("geometry")
                    
                    return {
                        "distance_km": round(distance_m / 1000.0, 2),
                        "duration_minutes": int(round(duration_s / 60.0)),
                        "geometry": geometry,
                        "source": "OSRM",
                        "available": True
                    }
            return None
    except Exception as e:
        logger.warning(f"OSRM routing failed: {e}")
        return None
