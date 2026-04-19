"""Structured logging configuration via structlog.

JSON output with ISO 8601 UTC timestamps, log level filtering,
and uvicorn integration. See Spec W6.
"""

import logging

import structlog


def setup_logging(log_level: str = "INFO") -> None:
    """Configure structlog for JSON output with request correlation.

    Args:
        log_level: One of DEBUG, INFO, WARNING, ERROR.
    """
    # Convert string level to numeric
    numeric_level = getattr(logging, log_level.upper(), logging.INFO)

    # Configure structlog
    structlog.configure(
        processors=[
            structlog.contextvars.merge_contextvars,
            structlog.processors.add_log_level,
            structlog.processors.TimeStamper(fmt="iso", utc=True),
            structlog.processors.StackInfoRenderer(),
            structlog.processors.format_exc_info,
            structlog.processors.JSONRenderer(),
        ],
        wrapper_class=structlog.make_filtering_bound_logger(numeric_level),
        context_class=dict,
        logger_factory=structlog.PrintLoggerFactory(),
        cache_logger_on_first_use=True,
    )

    # Route stdlib logging through structlog (for uvicorn)
    logging.basicConfig(
        format="%(message)s",
        level=numeric_level,
        handlers=[logging.StreamHandler()],
        force=True,
    )


def get_logger(name: str | None = None) -> structlog.stdlib.BoundLogger:
    """Get a structured logger instance.

    Args:
        name: Optional logger name, added as 'logger' key to events.

    Returns:
        A bound structlog logger.
    """
    logger = structlog.get_logger()
    if name:
        logger = logger.bind(logger=name)
    return logger
