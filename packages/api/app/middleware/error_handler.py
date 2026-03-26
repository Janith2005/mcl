"""Global exception handling with structured error responses."""
import uuid
import structlog
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError

logger = structlog.get_logger(__name__)


# ---------------------------------------------------------------------------
# Custom exception hierarchy
# ---------------------------------------------------------------------------

class AppError(Exception):
    """Base application error."""
    status_code: int = 500
    error_code: str = "internal_error"

    def __init__(self, message: str = "An unexpected error occurred"):
        self.message = message
        super().__init__(message)


class NotFoundError(AppError):
    status_code = 404
    error_code = "not_found"

    def __init__(self, message: str = "Resource not found"):
        super().__init__(message)


class ValidationError(AppError):
    status_code = 422
    error_code = "validation_error"

    def __init__(self, message: str = "Validation failed"):
        super().__init__(message)


class ForbiddenError(AppError):
    status_code = 403
    error_code = "forbidden"

    def __init__(self, message: str = "Access denied"):
        super().__init__(message)


class RateLimitError(AppError):
    status_code = 429
    error_code = "rate_limit_exceeded"

    def __init__(self, message: str = "Rate limit exceeded"):
        super().__init__(message)


class ConflictError(AppError):
    status_code = 409
    error_code = "conflict"

    def __init__(self, message: str = "Resource conflict"):
        super().__init__(message)


# ---------------------------------------------------------------------------
# Sentry helper — graceful no-op when sentry-sdk is not installed
# ---------------------------------------------------------------------------

def _capture_to_sentry(exc: Exception) -> None:
    try:
        import sentry_sdk  # noqa: F811
        sentry_sdk.capture_exception(exc)
    except ImportError:
        pass


# ---------------------------------------------------------------------------
# Handler registration
# ---------------------------------------------------------------------------

def register_error_handlers(app: FastAPI) -> None:
    """Attach exception handlers to the FastAPI application."""

    @app.exception_handler(AppError)
    async def app_error_handler(request: Request, exc: AppError) -> JSONResponse:
        error_id = uuid.uuid4().hex
        logger.warning(
            "app_error",
            error_code=exc.error_code,
            status_code=exc.status_code,
            message=exc.message,
            error_id=error_id,
            path=str(request.url),
            method=request.method,
        )
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "error": exc.error_code,
                "message": exc.message,
                "error_id": error_id,
            },
        )

    @app.exception_handler(RequestValidationError)
    async def validation_error_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
        error_id = uuid.uuid4().hex
        logger.warning(
            "validation_error",
            error_id=error_id,
            path=str(request.url),
            detail=str(exc.errors()),
        )
        return JSONResponse(
            status_code=422,
            content={
                "error": "validation_error",
                "message": "Request validation failed",
                "error_id": error_id,
            },
        )

    @app.exception_handler(Exception)
    async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
        error_id = uuid.uuid4().hex
        logger.error(
            "unhandled_exception",
            error_id=error_id,
            path=str(request.url),
            method=request.method,
            exc_type=type(exc).__name__,
            exc_message=str(exc),
        )
        _capture_to_sentry(exc)
        return JSONResponse(
            status_code=500,
            content={
                "error": "internal_error",
                "message": "An unexpected error occurred",
                "error_id": error_id,
            },
        )
