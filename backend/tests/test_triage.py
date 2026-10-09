import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_triage_critical_observation(async_client: AsyncClient):
    # Create case
    case_response = await async_client.post("/api/cases", json={
        "source": "CALLER",
        "chief_complaint": "Patient collapsed",
        "conscious": False,
        "breathing": False
    })
    case_id = case_response.json()["case_id"]

    # Run triage
    triage_response = await async_client.get(f"/api/cases/{case_id}/triage")
    assert triage_response.status_code == 200
    
    data = triage_response.json()
    assert data["case_id"] == case_id
    assert data["priority"] == "CRITICAL"
    assert data["score"] >= 80
    assert len(data["factors"]) >= 2
    
    rule_ids = [f["rule_id"] for f in data["factors"]]
    assert "OBS_UNCONSCIOUS" in rule_ids
    assert "OBS_BREATHING_ABSENT" in rule_ids

@pytest.mark.asyncio
async def test_triage_concerning_vital(async_client: AsyncClient):
    case_response = await async_client.post("/api/cases", json={
        "source": "CALLER",
        "chief_complaint": "Difficulty breathing",
        "spo2": 85
    })
    case_id = case_response.json()["case_id"]

    triage_response = await async_client.get(f"/api/cases/{case_id}/triage")
    assert triage_response.status_code == 200
    data = triage_response.json()
    
    rule_ids = [f["rule_id"] for f in data["factors"]]
    assert "VITAL_SPO2_LOW" in rule_ids
    assert data["priority"] in ["HIGH", "CRITICAL"]

@pytest.mark.asyncio
async def test_triage_missing_vitals_not_penalized(async_client: AsyncClient):
    # Only a chief complaint, no vitals
    case_response = await async_client.post("/api/cases", json={
        "source": "CALLER",
        "chief_complaint": "Chest pain and sweating",
        "symptoms": ["chest pain"]
    })
    case_id = case_response.json()["case_id"]

    triage_response = await async_client.get(f"/api/cases/{case_id}/triage")
    assert triage_response.status_code == 200
    data = triage_response.json()
    
    assert data["data_completeness"] == "PARTIAL"
    assert data["priority"] == "MODERATE" or data["priority"] == "HIGH"
    assert data["score"] > 0
    rule_ids = [f["rule_id"] for f in data["factors"]]
    assert "SYMPTOM_CHEST_PAIN" in rule_ids

@pytest.mark.asyncio
async def test_triage_normal_case(async_client: AsyncClient):
    case_response = await async_client.post("/api/cases", json={
        "source": "CALLER",
        "chief_complaint": "Minor cut on finger",
        "conscious": True,
        "breathing": True,
        "bleeding": False
    })
    case_id = case_response.json()["case_id"]

    triage_response = await async_client.get(f"/api/cases/{case_id}/triage")
    assert triage_response.status_code == 200
    data = triage_response.json()
    
    assert data["priority"] == "LOW"
    assert data["score"] == 0
    assert len(data["factors"]) == 0

@pytest.mark.asyncio
async def test_triage_not_found(async_client: AsyncClient):
    triage_response = await async_client.get("/api/cases/INVALID-ID/triage")
    assert triage_response.status_code == 404

@pytest.mark.asyncio
async def test_triage_recalculate_determinism(async_client: AsyncClient):
    case_response = await async_client.post("/api/cases", json={
        "source": "CALLER",
        "chief_complaint": "Difficulty breathing",
        "symptoms": ["difficulty breathing"]
    })
    case_id = case_response.json()["case_id"]

    get_response = await async_client.get(f"/api/cases/{case_id}/triage")
    recalc_response = await async_client.post(f"/api/cases/{case_id}/triage/recalculate")
    
    assert get_response.json()["score"] == recalc_response.json()["score"]
    assert get_response.json()["priority"] == recalc_response.json()["priority"]
    assert len(get_response.json()["factors"]) == len(recalc_response.json()["factors"])

@pytest.mark.asyncio
async def test_triage_schema_contains_no_diagnosis(async_client: AsyncClient):
    case_response = await async_client.post("/api/cases", json={
        "source": "CALLER",
        "chief_complaint": "Minor cut"
    })
    case_id = case_response.json()["case_id"]
    triage_response = await async_client.get(f"/api/cases/{case_id}/triage")
    data = triage_response.json()
    
    assert "diagnosis" not in data
    assert "treatment" not in data
    assert "recommended_ambulance" not in data
    assert "disclaimer" in data
