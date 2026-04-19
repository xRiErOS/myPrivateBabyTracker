"""Custom exceptions and global error handlers.

Provides consistent JSON error responses:
    {"detail": "message", "error_code": "NOT_FOUND"}
"""

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from pydantic import ValidationError as PydanticValidationError

from app.logging import get_logger

logger = get_logger("errors")


class NotFoundError(Exception):
    """Resource not found."""

    def __init__(self, detail: str = "Resource not found"):
        self.detail = detail


class ValidationError(Exception):
    """Business logic validation error."""

    def __init__(self, detail: str = "Validation error"):
        self.detail = detail


async def not_found_handler(request: Request, exc: NotFoundError) -> JSONResponse:
    """Handle NotFoundError with 404 JSON response."""
    logger.warning("not_found", detail=exc.detail, path=str(request.url))
    return JSONResponse(
        status_code=404,
        content={"detail": exc.detail, "error_code": "NOT_FOUND"},
    )


async def validation_error_handler(
    request: Request, exc: ValidationError
) -> JSONResponse:
    """Handle ValidationError with 422 JSON response."""
    logger.warning("validation_error", detail=exc.detail, path=str(request.url))
    return JSONResponse(
        status_code=422,
        content={"detail": exc.detail, "error_code": "VALIDATION_ERROR"},
    )


async def unhandled_exception_handler(
    request: Request, exc: Exception
) -> JSONResponse:
    """Catch-all handler for unhandled exceptions. Logs full traceback."""
    logger.exception("unhandled_error", path=str(request.url), error=str(exc))
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error", "error_code": "INTERNAL_ERROR"},
    )


def register_exception_handlers(app: FastAPI) -> None:
    """Register all custom exception handlers on the app."""
    app.add_exception_handler(NotFoundError, not_found_handler)
    app.add_exception_handler(ValidationError, validation_error_handler)
    app.add_exception_handler(Exception, unhandled_exception_handler)
