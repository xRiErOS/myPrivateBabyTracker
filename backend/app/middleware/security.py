"""Security middleware: Header stripping (K1), CSP headers (K2), request size limit (K3).

K1: Strips Remote-* headers from untrusted IPs to prevent header spoofing.
K2: Adds CSP and security headers to all responses.
K3: Enforces request body size limit.
"""

import ipaddress
from typing import Sequence

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

from app.logging import get_logger

logger = get_logger("security")

# Headers that only a trusted proxy may set
PROTECTED_HEADERS = frozenset({
    "remote-user",
    "remote-groups",
    "remote-name",
    "remote-email",
    "x-forwarded-user",
    "x-forwarded-email",
    "x-forwarded-groups",
})


def _parse_trusted_networks(proxies: str) -> list[ipaddress.IPv4Network | ipaddress.IPv6Network]:
    """Parse comma-separated CIDR notation into network objects."""
    networks = []
    for entry in proxies.split(","):
        entry = entry.strip()
        if entry:
            try:
                networks.append(ipaddress.ip_network(entry, strict=False))
            except ValueError:
                logger.warning("invalid_trusted_proxy", entry=entry)
    return networks


class HeaderStrippingMiddleware(BaseHTTPMiddleware):
    """K1: Strip forwarded-auth headers from untrusted sources.

    MUST be the first middleware in the chain so no downstream
    middleware or route handler sees spoofed headers.
    """

    def __init__(self, app, trusted_proxies: str = "", trust_all: bool = False):
        super().__init__(app)
        self.trusted_networks = _parse_trusted_networks(trusted_proxies)
        self.trust_all = trust_all

    def _is_trusted(self, client_ip: str) -> bool:
        if self.trust_all:
            return True
        try:
            ip = ipaddress.ip_address(client_ip)
            return any(ip in net for net in self.trusted_networks)
        except ValueError:
            return False

    async def dispatch(self, request: Request, call_next) -> Response:
        client_ip = request.client.host if request.client else "unknown"
        is_trusted = self._is_trusted(client_ip)

        if not is_trusted:
            # Check if someone is trying to spoof protected headers
            for header_name in request.headers.keys():
                if header_name.lower() in PROTECTED_HEADERS:
                    logger.warning(
                        "header_spoofing_attempt",
                        client_ip=client_ip,
                        header=header_name,
                    )
            # Build new headers without protected ones
            new_headers = [
                (k, v)
                for k, v in request.headers.raw
                if k.decode("latin-1").lower() not in PROTECTED_HEADERS
            ]
            request.scope["headers"] = new_headers

        return await call_next(request)


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """K2: Add security headers (CSP, X-Content-Type-Options, etc.) to all responses."""

    CSP = (
        "default-src 'self'; "
        "script-src 'self'; "
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
        "img-src 'self' data:; "
        "font-src 'self' https://fonts.gstatic.com"
    )

    async def dispatch(self, request: Request, call_next) -> Response:
        response = await call_next(request)
        response.headers["Content-Security-Policy"] = self.CSP
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        return response


class RequestSizeLimitMiddleware(BaseHTTPMiddleware):
    """K3: Reject requests with body larger than max_size bytes."""

    def __init__(self, app, max_size: int = 1_048_576):
        super().__init__(app)
        self.max_size = max_size

    async def dispatch(self, request: Request, call_next) -> Response:
        content_length = request.headers.get("content-length")
        if content_length and int(content_length) > self.max_size:
            from starlette.responses import JSONResponse
            return JSONResponse(
                {"detail": f"Request body too large. Max {self.max_size} bytes."},
                status_code=413,
            )
        return await call_next(request)
