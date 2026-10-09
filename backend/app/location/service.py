from app.location.distance import calculate_haversine
from app.location.routing import get_osrm_route
from app.location.schemas import RouteEstimate

class LocationService:
    @staticmethod
    async def get_route(origin_lat: float, origin_lon: float, dest_lat: float, dest_lon: float) -> RouteEstimate:
        """
        Gets the route between two points.
        Attempts to use OSRM for road distance and ETA.
        Falls back to Haversine geographic distance if OSRM fails or is disabled.
        """
        # Attempt road routing
        osrm_data = await get_osrm_route(origin_lat, origin_lon, dest_lat, dest_lon)
        if osrm_data:
            return RouteEstimate(**osrm_data)
            
        # Fallback to geographic distance
        geo_dist = calculate_haversine(origin_lat, origin_lon, dest_lat, dest_lon)
        return RouteEstimate(
            distance_km=round(geo_dist, 2),
            duration_minutes=None,
            geometry=None,
            source="Geographic Distance (Haversine)",
            available=False  # Indicates full routing info is unavailable
        )
