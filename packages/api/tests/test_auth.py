"""Test authentication."""
import pytest


@pytest.mark.asyncio
async def test_unauthenticated_returns_401(client):
    response = await client.get("/api/v1/workspaces")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_invalid_jwt_returns_401(client, mock_supabase):
    mock_supabase.auth.get_user.side_effect = Exception("Invalid token")
    response = await client.get(
        "/api/v1/workspaces",
        headers={"Authorization": "Bearer invalid-token"},
    )
    assert response.status_code == 401
