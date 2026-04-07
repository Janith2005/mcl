"""MCL API - FastAPI application factory."""
# Load the root .env before any other imports so os.environ is populated
from pathlib import Path as _Path
from dotenv import load_dotenv as _load_dotenv
_load_dotenv(_Path(__file__).resolve().parent.parent.parent.parent / ".env", override=False)

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from redis.asyncio import Redis

from app.config import Settings
from app.middleware.rate_limit import RateLimitMiddleware
from app.middleware.beta_gate import BetaGateMiddleware
from app.middleware.error_handler import register_error_handlers


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup / shutdown lifecycle: initialise Redis pool in app.state."""
    settings = Settings()
    app.state.redis = Redis.from_url(settings.redis_url, decode_responses=True)
    yield
    await app.state.redis.aclose()


def create_app() -> FastAPI:
    app = FastAPI(
        title="Influence Pirates API",
        version="0.1.0",
        description="Content pipeline orchestration API",
        lifespan=lifespan,
    )

    # --- Error handlers (must be registered before middleware) ---
    register_error_handlers(app)

    # --- Middleware (outermost first) ---
    app.add_middleware(BetaGateMiddleware)
    app.add_middleware(RateLimitMiddleware)

    import os
    default_origins = "http://localhost:5173,http://127.0.0.1:5173,http://localhost:4173,http://127.0.0.1:4173"
    raw_origins = os.environ.get("ALLOWED_ORIGINS", default_origins)
    allow_origin_regex = os.environ.get("ALLOWED_ORIGIN_REGEX", r"https://.*\.vercel\.app")
    allowed_origins = [o.strip() for o in raw_origins.split(",") if o.strip()]
    app.add_middleware(
        CORSMiddleware,
        allow_origins=allowed_origins,
        allow_origin_regex=allow_origin_regex,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # --- Sentry (init before routes so it captures startup errors) ---
    import os
    sentry_dsn = os.environ.get("SENTRY_DSN", "")
    if sentry_dsn:
        try:
            from app.integrations.sentry import init_sentry
            init_sentry(sentry_dsn, os.environ.get("ENVIRONMENT", "development"))
        except Exception:
            pass  # Non-fatal if sentry-sdk not installed

    from app.routes import register_routes
    register_routes(app)

    return app


app = create_app()
