import asyncio

from httpx import ASGITransport, AsyncClient, Response

from app.main import app


async def get(path: str) -> Response:
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        return await client.get(path)


def test_health_endpoint() -> None:
    response = asyncio.run(get("/api/v1/health"))
    assert response.status_code == 200
    assert response.json() == {"status": "ok", "service": "masterz-gym-api"}


def test_openapi_exposes_health_endpoint() -> None:
    response = asyncio.run(get("/openapi.json"))
    assert "/api/v1/health" in response.json()["paths"]
    assert "/api/v1/auth/login" in response.json()["paths"]
    assert "/api/v1/payments/memberships" in response.json()["paths"]
    assert "/api/v1/attendance/check-ins" in response.json()["paths"]
