import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.ambulance import Ambulance, AmbulanceType
from app.core.security import get_password_hash
from tests.conftest import TestingSessionLocal
from app.models.emergency_case import EmergencyCase

@pytest.mark.asyncio
async def test_ambulance_login(async_client: AsyncClient):
    # Setup test ambulance
    async with TestingSessionLocal() as session:
        amb = Ambulance(
            ambulance_id="TEST-AMB-01",
            operator_password_hash=get_password_hash("password123"),
            latitude=21.25,
            longitude=81.62,
            type=AmbulanceType.BLS.value,
            crew_type="Paramedic"
        )
        session.add(amb)
        await session.commit()

    response = await async_client.post("/api/ambulance-portal/login", json={
        "ambulance_id": "TEST-AMB-01",
        "password": "password123"
    })
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["ambulance_id"] == "TEST-AMB-01"

@pytest.mark.asyncio
async def test_ambulance_transitions(async_client: AsyncClient):
    # Setup test ambulance and case
    async with TestingSessionLocal() as session:
        amb = Ambulance(
            ambulance_id="TEST-AMB-01",
            operator_password_hash=get_password_hash("password123"),
            latitude=21.25,
            longitude=81.62,
            type=AmbulanceType.BLS.value,
            crew_type="Paramedic"
        )
        
        case = EmergencyCase(
            case_id="CASE-001",
            source="CALLER",
            status="OPEN",
            chief_complaint="Chest pain",
            assigned_ambulance_id="TEST-AMB-01",
            ambulance_assignment_status="PENDING",
            latitude=21.0,
            longitude=81.0,
            patient_pathway_confirmed=True
        )
        session.add(amb)
        session.add(case)
        await session.commit()
        
    # Login
    response = await async_client.post("/api/ambulance-portal/login", json={
        "ambulance_id": "TEST-AMB-01",
        "password": "password123"
    })
    token = response.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    # Accept Request
    response = await async_client.post("/api/ambulance-portal/requests/CASE-001/respond", json={
        "response": "ACCEPTED"
    }, headers=headers)
    assert response.status_code == 200
    assert response.json()["ambulance_assignment_status"] == "ACCEPTED"
    
    # Transition to dispatched
    response = await async_client.post("/api/ambulance-portal/requests/CASE-001/transition", json={
        "status": "DISPATCHED"
    }, headers=headers)
    assert response.status_code == 200
    assert response.json()["ambulance_assignment_status"] == "DISPATCHED"
    
    # Update location
    response = await async_client.post("/api/ambulance-portal/location", json={
        "latitude": 21.1,
        "longitude": 81.1,
        "source": "SIMULATION"
    }, headers=headers)
    assert response.status_code == 200
