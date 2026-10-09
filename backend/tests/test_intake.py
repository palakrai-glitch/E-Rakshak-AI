import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_intake_create_and_recover(async_client: AsyncClient):
    # Create Case (ER Token equivalent)
    response = await async_client.post("/api/cases", json={
        "reporter_phone": "1234567890",
        "city": "Raipur",
        "source": "CALLER",
        "chief_complaint": "Pending"
    })
    assert response.status_code == 201
    data = response.json()
    case_id = data.get("case_id")
    assert case_id is not None
    
    # Save incremental data
    response = await async_client.patch(f"/api/cases/{case_id}", json={
        "chief_complaint": "Severe chest pain",
        "patient_name": "Test Patient",
        "patient_age": 45
    })
    assert response.status_code == 200
    
    # Recover Case
    response = await async_client.post("/api/cases/verify", json={
        "case_id": case_id,
        "reporter_phone": "1234567890"
    })
    assert response.status_code == 200
    recover_data = response.json()
    assert recover_data.get("chief_complaint") == "Severe chest pain"
    assert recover_data.get("patient_name") == "Test Patient"
    assert recover_data.get("patient_age") == 45
    
@pytest.mark.asyncio
async def test_intake_recover_invalid_token(async_client: AsyncClient):
    response = await async_client.post("/api/cases/verify", json={
        "case_id": "INVALID-CASE-ID",
        "reporter_phone": "1234567890"
    })
    assert response.status_code == 403
