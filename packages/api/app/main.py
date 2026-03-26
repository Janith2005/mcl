"""MCL API - FastAPI application factory."""
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

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["http://localhost:5173"],  # Vite dev server
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    from app.routes import register_routes
    register_routes(app)

    return app


app = create_app()
