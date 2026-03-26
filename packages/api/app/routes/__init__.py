"""API route registration."""
from fastapi import FastAPI
from app.routes import health, auth, workspaces, brain, topics, angles, hooks, scripts, analytics, pipeline, recon, webhooks, admin, monitoring, feedback


def register_routes(app: FastAPI) -> None:
    app.include_router(health.router)
    app.include_router(auth.router)
    app.include_router(workspaces.router)
    app.include_router(brain.router)
    app.include_router(topics.router)
    app.include_router(angles.router)
    app.include_router(hooks.router)
    app.include_router(scripts.router)
    app.include_router(analytics.router)
    app.include_router(pipeline.router)
    app.include_router(recon.router)
    app.include_router(webhooks.router)
    app.include_router(admin.router)
    app.include_router(monitoring.router)
    app.include_router(feedback.router)
