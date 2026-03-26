"""Redis-backed sliding window rate limiter middleware."""
import time
import uuid
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse


# Paths exempt from rate limiting
EXEMPT_PATHS = {"/api/v1/health"}

# Limits
ANON_RPM = 100  # requests per minute for anonymous (per IP)
AUTH_RPM = 500   # requests per minute for authenticated (per API key / JWT)


def _extract_identifier(request: Request) -> tuple[str, int]:
    """Return (rate-limit key, allowed requests-per-minute).

    If the request carries an Authorization header we treat it as
    authenticated traffic and grant a higher limit.  Otherwise we
    fall back to the client IP.
    """
    auth = request.headers.get("authorization", "")
    if auth.startswith("Bearer ") and len(auth) > 7:
        token = auth[7:]
        # Use a hash of the token so we never store raw credentials in Redis
        import hashlib
        key = f"rl:auth:{hashlib.sha256(token.encode()).hexdigest()[:32]}"
        return key, AUTH_RPM

    # Anonymous – key by forwarded IP or direct IP
    forwarded = request.headers.get("x-forwarded-for")
    ip = forwarded.split(",")[0].strip() if forwarded else (request.client.host if request.client else "unknown")
    return f"rl:ip:{ip}", ANON_RPM


class RateLimitMiddleware(BaseHTTPMiddleware):
    """Sliding-window rate limiter backed by Redis sorted sets.

    Uses MULTI/EXEC to atomically:
    1. Remove entries older than the 60-second window.
    2. Add the current request timestamp.
    3. Count entries in the set.
    4. Set a TTL so the key self-cleans.
    """

    async def dispatch(self, request: Request, call_next):
        # Skip exempt paths
        if request.url.path in EXEMPT_PATHS:
            return await call_next(request)

        redis = getattr(request.app.state, "redis", None)
        if redis is None:
            # If Redis is unavailable, allow the request (fail open)
            return await call_next(request)

        key, rpm = _extract_identifier(request)
        now = time.time()
        window_start = now - 60  # 60-second sliding window

        try:
            pipe = redis.pipeline(transaction=True)
            pipe.zremrangebyscore(key, 0, window_start)
            member = f"{now}:{uuid.uuid4().hex[:8]}"
            pipe.zadd(key, {member: now})
            pipe.zcard(key)
            pipe.expire(key, 120)  # TTL longer than window for safety
            results = await pipe.execute()

            current_count = results[2]

            if current_count > rpm:
                retry_after = 60 - int(now - window_start)
                if retry_after < 1:
                    retry_after = 1
                return JSONResponse(
                    status_code=429,
                    content={
                        "error": "rate_limit_exceeded",
                        "message": f"Rate limit exceeded. Max {rpm} requests per minute.",
                    },
                    headers={"Retry-After": str(retry_after)},
                )
        except Exception:
            # If Redis errors, fail open
            pass

        response = await call_next(request)

        # Add informational rate-limit headers
        try:
            remaining = max(0, rpm - current_count) if 'current_count' in dir() else rpm
            response.headers["X-RateLimit-Limit"] = str(rpm)
            response.headers["X-RateLimit-Remaining"] = str(remaining)
        except Exception:
            pass

        return response
