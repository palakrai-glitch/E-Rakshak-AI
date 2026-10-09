import pytest
from httpx import Response
from app.location.distance import calculate_haversine
from app.location.routing import get_osrm_route
from app.location.service import LocationService

def test_haversine_distance():
    # Test identical coordinates (distance should be 0)
    assert calculate_haversine(21.0, 81.0, 21.0, 81.0) == 0.0
    
    # Test valid coordinates (approximate distance from 21,81 to 21.1,81.1)
    dist = calculate_haversine(21.0, 81.0, 21.1, 81.1)
    assert dist > 10 and dist < 20 # ~15km
    
@pytest.mark.asyncio
async def test_location_service_fallback():
    # If OSRM is disabled or fails, it should fallback to haversine
    # We can mock this by just calling the service, as it will likely fail without mock if no internet, 
    # but the test requirements say "Mock external OSRM requests in automated tests."
    
    class MockResponse:
        def __init__(self, json_data, status_code):
            self.json_data = json_data
            self.status_code = status_code
            
        def json(self):
            return self.json_data
            
    import httpx
    # Store original
    original_get = httpx.AsyncClient.get
    
    # Mock to return success
    async def mock_get(*args, **kwargs):
        return MockResponse({
            "code": "Ok",
            "routes": [{
                "distance": 6100,
                "duration": 840,
                "geometry": "xyz"
            }]
        }, 200)
        
    httpx.AsyncClient.get = mock_get
    
    try:
        route = await LocationService.get_route(21.19, 81.30, 21.22, 81.34)
        assert route.distance_km == 6.1
        assert route.duration_minutes == 14
        assert route.source == "OSRM"
        assert route.available == True
        
        # Mock to return failure
        async def mock_get_fail(*args, **kwargs):
            return MockResponse({}, 500)
            
        httpx.AsyncClient.get = mock_get_fail
        
        fallback = await LocationService.get_route(21.19, 81.30, 21.22, 81.34)
        assert fallback.source == "Geographic Distance (Haversine)"
        assert fallback.available == False
        assert fallback.distance_km > 0
    finally:
        httpx.AsyncClient.get = original_get
