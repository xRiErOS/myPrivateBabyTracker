"""CSRF protection middleware (K2): Double-Submit-Cookie pattern.

Sets a csrf_token cookie on every response. Mutating requests
(POST, PUT, PATCH, DELETE) must include an X-CSRF-Token header
that matches the cookie value.
"""

import secrets

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse, Response

from app.logging import get_logger

logger = get_logger("csrf")

SAFE_METHODS = frozenset({"GET", "HEAD", "OPTIONS"})
CSRF_COOKIE_NAME = "csrf_token"
CSRF_HEADER_NAME = "x-csrf-token"
EXEMPT_PATHS = frozenset({"/health", "/api/docs", "/openapi.json"})


class CSRFMiddleware(BaseHTTPMiddleware):
    """Double-Submit-Cookie CSRF protection.

    - Sets csrf_token cookie (httponly=False so JS can read it)
    - Validates X-CSRF-Token header on mutating requests
    - Safe methods and exempt paths are skipped
    """

    def __init__(self, app, enabled: bool = True):
        super().__init__(app)
        self.enabled = enabled

    async def dispatch(self, request: Request, call_next) -> Response:
        if not self.enabled:
            return await call_next(request)

        # Get or generate CSRF token
        csrf_cookie = request.cookies.get(CSRF_COOKIE_NAME)
        if not csrf_cookie:
            csrf_cookie = secrets.token_urlsafe(32)

        # Validate on mutating methods
        if request.method not in SAFE_METHODS:
            # Skip exempt paths
            if request.url.path not in EXEMPT_PATHS:
                csrf_header = request.headers.get(CSRF_HEADER_NAME)
                if not csrf_header or csrf_header != csrf_cookie:
                    logger.warning(
                        "csrf_validation_failed",
                        path=request.url.path,
                        method=request.method,
                        has_header=bool(csrf_header),
                    )
                    return JSONResponse(
                        {"detail": "CSRF token missing or invalid"},
                        status_code=403,
                    )

        response = await call_next(request)

        # Always set/refresh the cookie
        response.set_cookie(
            key=CSRF_COOKIE_NAME,
            value=csrf_cookie,
            httponly=False,  # JS needs to read this
            samesite="lax",
            secure=False,  # Set to True in production behind HTTPS
            path="/",
        )

        return response
