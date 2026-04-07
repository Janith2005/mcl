"""Test health endpoint."""
import pytest


@pytest.mark.asyncio
async def test_health_check(client):
    response = await client.get("/api/v1/health")
    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] in {"healthy", "degraded"}
    assert "checks" in payload
    assert {"redis", "supabase", "llm"} <= set(payload["checks"].keys())
