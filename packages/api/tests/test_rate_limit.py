"""Tests for rate-limiting middleware."""
import pytest
from unittest.mock import AsyncMock


@pytest.mark.asyncio
async def test_health_check_bypasses_rate_limit(client, mock_redis):
    """Health endpoint should never be rate-limited."""
    response = await client.get("/api/v1/health")
    assert response.status_code == 200
    # Health is exempt — Redis pipeline should NOT have been called
    mock_redis.pipeline.assert_not_called()


@pytest.mark.asyncio
async def test_rate_limit_headers_on_auth_endpoint(client, mock_redis, auth_headers):
    """Authenticated requests to non-exempt paths should include rate limit headers."""
    response = await client.get("/api/v1/workspaces", headers=auth_headers)
    # The request goes through rate limiting before reaching the route handler
    assert "x-ratelimit-limit" in response.headers
    assert "x-ratelimit-remaining" in response.headers


@pytest.mark.asyncio
async def test_auth_rate_limit_500(client, mock_redis, auth_headers):
    """Authenticated traffic should have a 500 RPM limit."""
    response = await client.get("/api/v1/workspaces", headers=auth_headers)
    assert response.headers.get("x-ratelimit-limit") == "500"


@pytest.mark.asyncio
async def test_returns_429_when_exceeded(client, mock_redis, auth_headers):
    """Should return 429 with Retry-After when rate limit exceeded."""
    pipe = mock_redis.pipeline.return_value
    # Simulate count exceeding auth limit (501 > 500)
    pipe.execute = AsyncMock(return_value=[0, True, 501, True])

    response = await client.get("/api/v1/workspaces", headers=auth_headers)
    assert response.status_code == 429
    assert "retry-after" in response.headers


@pytest.mark.asyncio
async def test_fail_open_when_redis_unavailable(app, mock_redis):
    """If Redis is None, requests should pass through."""
    from httpx import AsyncClient, ASGITransport

    app.state.redis = None
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        response = await ac.get("/api/v1/health")
        assert response.status_code == 200


@pytest.mark.asyncio
async def test_fail_open_on_redis_error(client, mock_redis, auth_headers):
    """If Redis raises, request should still go through (fail open)."""
    pipe = mock_redis.pipeline.return_value
    pipe.execute = AsyncMock(side_effect=ConnectionError("Redis down"))

    response = await client.get("/api/v1/workspaces", headers=auth_headers)
    # Should not be 429 — fails open
    assert response.status_code != 429
