"""Middleware package — security, CSRF, auth, rate limiting."""

from app.middleware.auth import get_current_user, require_role
from app.middleware.csrf import CSRFMiddleware
from app.middleware.rate_limit import limiter, rate_limit_exceeded_handler
from app.middleware.security import (
    HeaderStrippingMiddleware,
    RequestSizeLimitMiddleware,
    SecurityHeadersMiddleware,
)

__all__ = [
    "CSRFMiddleware",
    "HeaderStrippingMiddleware",
    "RequestSizeLimitMiddleware",
    "SecurityHeadersMiddleware",
    "get_current_user",
    "limiter",
    "rate_limit_exceeded_handler",
    "require_role",
]
