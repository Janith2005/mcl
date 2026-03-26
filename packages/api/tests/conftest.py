"""API test fixtures."""
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from httpx import AsyncClient, ASGITransport
from app.main import create_app
from app.deps import get_supabase, get_redis


@pytest.fixture
def mock_supabase():
    """Mock Supabase client."""
    client = MagicMock()
    client.auth.get_user.return_value = MagicMock(
        user=MagicMock(id="user-123", email="test@mcl.dev")
    )
    client.table.return_value = MagicMock()
    return client


@pytest.fixture
def mock_redis():
    """Mock Redis client with pipeline support."""
    redis = AsyncMock()
    pipe = AsyncMock()
    # Default pipeline behaviour: 0 removed, True zadd, 1 count, True expire
    pipe.execute = AsyncMock(return_value=[0, True, 1, True])
    redis.pipeline = MagicMock(return_value=pipe)
    redis.aclose = AsyncMock()
    return redis


@pytest.fixture
def app(mock_supabase, mock_redis):
    """Create test app with mocked dependencies and Redis in app.state.

    ASGITransport (used by httpx) does NOT trigger the ASGI lifespan
    protocol, so we patch the lifespan to a no-op and manually set
    app.state.redis after creation.
    """
    from contextlib import asynccontextmanager

    @asynccontextmanager
    async def _noop_lifespan(app):
        yield

    with patch("app.main.lifespan", _noop_lifespan):
        test_app = create_app()

    # Manually inject what lifespan would have provided
    test_app.state.redis = mock_redis

    async def override_supabase():
        return mock_supabase

    async def override_redis():
        return mock_redis

    test_app.dependency_overrides[get_supabase] = override_supabase
    test_app.dependency_overrides[get_redis] = override_redis
    return test_app


@pytest.fixture
async def client(app):
    """Async test client."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


@pytest.fixture
def auth_headers():
    """Auth headers with a fake JWT."""
    return {"Authorization": "Bearer fake-jwt-token"}
