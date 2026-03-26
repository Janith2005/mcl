"""Sentry error tracking and performance monitoring."""
import sentry_sdk
from sentry_sdk.integrations.fastapi import FastApiIntegration
from sentry_sdk.integrations.starlette import StarletteIntegration


def _before_send_transaction(event, hint):
    """Filter out health check transactions to reduce noise."""
    if event.get("transaction") in ("/health", "/healthz", "/ready", "/livez"):
        return None
    return event


def init_sentry(dsn: str, environment: str) -> None:
    """Initialise Sentry SDK with FastAPI integration.

    Args:
        dsn: Sentry project DSN.
        environment: Runtime environment name (development, staging, production).
    """
    traces_sample_rate = 1.0 if environment == "development" else 0.2

    sentry_sdk.init(
        dsn=dsn,
        environment=environment,
        integrations=[
            FastApiIntegration(),
            StarletteIntegration(),
        ],
        traces_sample_rate=traces_sample_rate,
        profiles_sample_rate=0.1,
        before_send_transaction=_before_send_transaction,
        send_default_pii=False,
    )
