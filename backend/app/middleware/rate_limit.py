"""Rate limiting middleware via slowapi.

Default: 60 requests/minute per IP.
Auth endpoints: 5 requests/minute per IP.
"""

from slowapi import Limiter
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address
from starlette.requests import Request
from starlette.responses import JSONResponse

from app.logging import get_logger

logger = get_logger("rate_limit")

# Global limiter instance — shared across the app
limiter = Limiter(key_func=get_remote_address)


def rate_limit_exceeded_handler(request: Request, exc: RateLimitExceeded) -> JSONResponse:
    """Custom handler for 429 responses with Retry-After header."""
    logger.warning(
        "rate_limit_exceeded",
        client_ip=request.client.host if request.client else "unknown",
        path=request.url.path,
    )
    response = JSONResponse(
        {"detail": "Rate limit exceeded. Please try again later."},
        status_code=429,
    )
    response.headers["Retry-After"] = str(exc.detail)
    return response
