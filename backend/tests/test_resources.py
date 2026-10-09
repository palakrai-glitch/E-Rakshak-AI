import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_get_resource_summary(async_client: AsyncClient):
    response = await async_client.get("/api/resources/summary")
    assert response.status_code == 200
    data = response.json()
    assert "hospitals" in data
    assert "doctors" in data
    assert "ambulances" in data
    # We don't assert > 0 here strictly in case tests are run before seed,
    # but the API contract is validated.

@pytest.mark.asyncio
async def test_get_hospitals(async_client: AsyncClient):
    response = await async_client.get("/api/resources/hospitals")
    assert response.status_code == 200
    assert isinstance(response.json(), list)

@pytest.mark.asyncio
async def test_get_doctors(async_client: AsyncClient):
    response = await async_client.get("/api/resources/doctors")
    assert response.status_code == 200
    assert isinstance(response.json(), list)

@pytest.mark.asyncio
async def test_get_ambulances(async_client: AsyncClient):
    response = await async_client.get("/api/resources/ambulances")
    assert response.status_code == 200
    assert isinstance(response.json(), list)

@pytest.mark.asyncio
async def test_get_nonexistent_hospital(async_client: AsyncClient):
    response = await async_client.get("/api/resources/hospitals/HOSP-99999")
    assert response.status_code == 404

@pytest.mark.asyncio
async def test_get_nonexistent_doctor(async_client: AsyncClient):
    response = await async_client.get("/api/resources/doctors/DOC-99999")
    assert response.status_code == 404

@pytest.mark.asyncio
async def test_get_nonexistent_ambulance(async_client: AsyncClient):
    response = await async_client.get("/api/resources/ambulances/AMB-99999")
    assert response.status_code == 404
