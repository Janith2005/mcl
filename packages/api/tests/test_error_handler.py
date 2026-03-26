"""Tests for global error handling."""
import pytest
from app.middleware.error_handler import (
    AppError,
    NotFoundError,
    ValidationError,
    ForbiddenError,
    RateLimitError,
    ConflictError,
)


# ---------------------------------------------------------------------------
# Exception class unit tests
# ---------------------------------------------------------------------------


class TestExceptionClasses:
    def test_app_error_defaults(self):
        err = AppError()
        assert err.status_code == 500
        assert err.error_code == "internal_error"
        assert err.message == "An unexpected error occurred"

    def test_not_found_error(self):
        err = NotFoundError("User missing")
        assert err.status_code == 404
        assert err.error_code == "not_found"
        assert err.message == "User missing"

    def test_validation_error(self):
        err = ValidationError()
        assert err.status_code == 422
        assert err.error_code == "validation_error"

    def test_forbidden_error(self):
        err = ForbiddenError()
        assert err.status_code == 403
        assert err.error_code == "forbidden"

    def test_rate_limit_error(self):
        err = RateLimitError()
        assert err.status_code == 429
        assert err.error_code == "rate_limit_exceeded"

    def test_conflict_error(self):
        err = ConflictError("Duplicate slug")
        assert err.status_code == 409
        assert err.error_code == "conflict"
        assert err.message == "Duplicate slug"


# ---------------------------------------------------------------------------
# Integration: error handler returns correct JSON
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_not_found_error_response(app, client):
    """Raising NotFoundError should produce a 404 JSON response."""
    from fastapi import APIRouter

    router = APIRouter()

    @router.get("/api/v1/_test/not-found")
    async def _raise():
        raise NotFoundError("Widget not found")

    app.include_router(router)

    response = await client.get("/api/v1/_test/not-found")
    assert response.status_code == 404
    body = response.json()
    assert body["error"] == "not_found"
    assert body["message"] == "Widget not found"
    assert "error_id" in body


@pytest.mark.asyncio
async def test_forbidden_error_response(app, client):
    from fastapi import APIRouter

    router = APIRouter()

    @router.get("/api/v1/_test/forbidden")
    async def _raise():
        raise ForbiddenError()

    app.include_router(router)

    response = await client.get("/api/v1/_test/forbidden")
    assert response.status_code == 403
    body = response.json()
    assert body["error"] == "forbidden"


@pytest.mark.asyncio
async def test_conflict_error_response(app, client):
    from fastapi import APIRouter

    router = APIRouter()

    @router.get("/api/v1/_test/conflict")
    async def _raise():
        raise ConflictError("Already exists")

    app.include_router(router)

    response = await client.get("/api/v1/_test/conflict")
    assert response.status_code == 409


@pytest.mark.asyncio
async def test_unhandled_exception_propagates(app, client):
    """Unhandled exceptions propagate through BaseHTTPMiddleware in test.

    In production, uvicorn's ServerErrorMiddleware returns 500.
    In test with httpx ASGI transport + BaseHTTPMiddleware, the exception
    re-raises. We verify it propagates (and is logged by our handler).
    """
    from fastapi import APIRouter

    router = APIRouter()

    @router.get("/api/v1/_test/boom")
    async def _raise():
        raise RuntimeError("kaboom")

    app.include_router(router)

    with pytest.raises(RuntimeError, match="kaboom"):
        await client.get("/api/v1/_test/boom")


@pytest.mark.asyncio
async def test_request_validation_error(client):
    """FastAPI request-validation errors should return structured JSON."""
    # POST to a route that expects a body — sending invalid JSON triggers validation
    response = await client.post(
        "/api/v1/auth/signup",
        content="not json",
        headers={"content-type": "application/json"},
    )
    assert response.status_code == 422
    body = response.json()
    assert body["error"] == "validation_error"
    assert "error_id" in body
