import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_create_minimal_case(async_client: AsyncClient):
    response = await async_client.post("/api/cases", json={
        "source": "CALLER",
        "chief_complaint": "Severe headache"
    })
    assert response.status_code == 201
    data = response.json()
    assert "case_id" in data
    assert data["source"] == "CALLER"
    assert data["chief_complaint"] == "Severe headache"
    assert data["status"] == "OPEN"
    assert "created_at" in data

@pytest.mark.asyncio
async def test_create_full_case(async_client: AsyncClient):
    payload = {
        "source": "ATTENDANT",
        "reporter_name": "Rahul Sharma",
        "reporter_phone": "9876543210",
        "reporter_relationship": "Friend",
        "patient_name": "Amit Sharma",
        "patient_age": 45,
        "patient_gender": "Male",
        "chief_complaint": "Severe chest pain",
        "incident_description": "Patient suddenly developed chest pain at home",
        "symptoms": ["chest pain", "sweating"],
        "heart_rate": 96,
        "systolic_bp": 145,
        "diastolic_bp": 90,
        "spo2": 97,
        "respiratory_rate": 18,
        "temperature": 37.1,
        "conscious": True,
        "breathing": True,
        "bleeding": False,
        "mobility": True,
        "address": "Example address",
        "landmark": "Near Main Market",
        "city": "Bhilai",
        "state": "Chhattisgarh",
        "additional_notes": "Patient is currently conscious."
    }
    response = await async_client.post("/api/cases", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data["patient_name"] == "Amit Sharma"
    assert data["patient_age"] == 45
    assert data["symptoms"] == ["chest pain", "sweating"]
    assert "case_id" in data

@pytest.mark.asyncio
async def test_create_invalid_case(async_client: AsyncClient):
    response = await async_client.post("/api/cases", json={
        "source": "CALLER",
        # Missing chief_complaint
    })
    assert response.status_code == 422

@pytest.mark.asyncio
async def test_get_case(async_client: AsyncClient):
    # Create a case
    create_response = await async_client.post("/api/cases", json={
        "source": "CALLER",
        "chief_complaint": "Severe headache"
    })
    case_id = create_response.json()["case_id"]

    # Get the case
    get_response = await async_client.get(f"/api/cases/{case_id}")
    assert get_response.status_code == 200
    assert get_response.json()["case_id"] == case_id

@pytest.mark.asyncio
async def test_get_case_not_found(async_client: AsyncClient):
    response = await async_client.get("/api/cases/INVALID-ID")
    assert response.status_code == 404

@pytest.mark.asyncio
async def test_list_cases(async_client: AsyncClient):
    from app.main import app
    from app.api.dependencies import get_current_admin
    app.dependency_overrides[get_current_admin] = lambda: {"username": "admin", "role": "admin"}
    
    try:
        # Create two cases
        await async_client.post("/api/cases", json={"source": "CALLER", "chief_complaint": "Complaint 1"})
        await async_client.post("/api/cases", json={"source": "CALLER", "chief_complaint": "Complaint 2"})

        response = await async_client.get("/api/cases")
        assert response.status_code == 200
        data = response.json()
        assert "cases" in data
        assert len(data["cases"]) >= 2
    finally:
        app.dependency_overrides.clear()
