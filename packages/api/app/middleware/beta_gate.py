"""Beta access gate middleware.

Checks whether the authenticated user's email is in the Redis-backed
beta allowlist.  Unauthenticated or non-allowlisted users receive a 403
for any path that is not explicitly exempt.
"""
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse

# Paths that are accessible without beta access
EXEMPT_PREFIXES = (
    "/api/v1/health",
    "/api/v1/auth",
    "/login",
    "/signup",
    "/webhooks",
    "/docs",
    "/openapi.json",
)

BETA_ALLOWLIST_KEY = "beta:allowlist"


class BetaGateMiddleware(BaseHTTPMiddleware):
    """Block requests from users not on the beta allowlist.

    The allowlist is stored in a Redis set keyed by ``beta:allowlist``.
    If Redis is unavailable the middleware fails open so it never brings
    down production traffic.
    """

    async def dispatch(self, request: Request, call_next):
        # Skip exempt paths
        path = request.url.path
        if any(path.startswith(prefix) for prefix in EXEMPT_PREFIXES):
            return await call_next(request)

        # Extract email from the request state set by the auth layer.
        # If no user info is present we let the downstream auth middleware
        # handle the 401.
        auth_header = request.headers.get("authorization", "")
        if not auth_header:
            return await call_next(request)

        redis = getattr(request.app.state, "redis", None)
        if redis is None:
            # Fail open when Redis is unavailable
            return await call_next(request)

        # We need to resolve the user email. We peek at the JWT through
        # Supabase, but to keep the middleware lightweight we look up the
        # email from a mirror set or rely on the auth middleware having
        # stashed it.  For MVP we decode the token via supabase client.
        try:
            from app.deps import get_settings
            from supabase import create_client

            settings = get_settings()
            sb = create_client(settings.supabase_url, settings.supabase_service_role_key)
            token = auth_header.replace("Bearer ", "")
            user = sb.auth.get_user(token)
            email = user.user.email

            if not email:
                return await call_next(request)

            is_allowed = await redis.sismember(BETA_ALLOWLIST_KEY, email)
            if not is_allowed:
                return JSONResponse(
                    status_code=403,
                    content={
                        "error": "beta_access_required",
                        "message": "Beta access required. Contact support to request an invite.",
                    },
                )
        except Exception:
            # Fail open on any error so we never block legitimate traffic
            pass

        return await call_next(request)
