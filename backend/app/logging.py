"""Structured logging configuration via structlog.

JSON output with ISO 8601 UTC timestamps. Falls log_file gesetzt ist,
wird zusätzlich eine rotierende NDJSON-Datei geschrieben (für /admin/logs).
"""

import logging
from logging.handlers import RotatingFileHandler
from pathlib import Path

import structlog


def setup_logging(
    log_level: str = "INFO",
    log_file: str | None = None,
    max_bytes: int = 10 * 1024 * 1024,
    backup_count: int = 5,
) -> None:
    """Configure structlog für JSON-Output mit optionaler Datei-Rotation.

    Args:
        log_level: One of DEBUG, INFO, WARNING, ERROR.
        log_file: Pfad zur Log-Datei. Leer/None = nur stdout.
        max_bytes: Rotations-Grenze pro Datei.
        backup_count: Anzahl der vorgehaltenen Backup-Dateien.
    """
    numeric_level = getattr(logging, log_level.upper(), logging.INFO)

    handlers: list[logging.Handler] = [logging.StreamHandler()]

    if log_file and log_file.strip():
        log_path = Path(log_file)
        log_path.parent.mkdir(parents=True, exist_ok=True)
        file_handler = RotatingFileHandler(
            log_path,
            maxBytes=max_bytes,
            backupCount=backup_count,
            encoding="utf-8",
        )
        handlers.append(file_handler)

    logging.basicConfig(
        format="%(message)s",
        level=numeric_level,
        handlers=handlers,
        force=True,
    )

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
        logger_factory=structlog.stdlib.LoggerFactory(),
        cache_logger_on_first_use=True,
    )


def get_logger(name: str | None = None) -> structlog.stdlib.BoundLogger:
    """Get a structured logger instance."""
    logger = structlog.get_logger()
    if name:
        logger = logger.bind(logger=name)
    return logger
