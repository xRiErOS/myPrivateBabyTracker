"""Structured logging configuration via structlog.

JSON output with ISO 8601 UTC timestamps. Falls log_file gesetzt ist,
wird zusätzlich eine rotierende NDJSON-Datei geschrieben (für /admin/logs).

Auch stdlib-Logger (alembic, sqlalchemy, uvicorn, ...) werden via
structlog.stdlib.ProcessorFormatter zu NDJSON-Zeilen gerendert, damit der
Admin-Log-Viewer alle Einträge parsen kann.
"""

import logging
import sys
from logging.handlers import RotatingFileHandler
from pathlib import Path

import structlog


# Shared processors für structlog UND stdlib-Logger via ProcessorFormatter.
# add_log_level ist in shared_processors NICHT enthalten, weil ProcessorFormatter
# das Level über structlog.stdlib.add_log_level injiziert.
_SHARED_PROCESSORS: list = [
    structlog.contextvars.merge_contextvars,
    structlog.processors.TimeStamper(fmt="iso", utc=True),
    structlog.processors.StackInfoRenderer(),
    structlog.processors.format_exc_info,
]


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

    # ProcessorFormatter rendert sowohl structlog- als auch stdlib-LogRecords
    # einheitlich als JSON. Das ist die offizielle structlog-Empfehlung.
    formatter = structlog.stdlib.ProcessorFormatter(
        foreign_pre_chain=[
            structlog.stdlib.add_log_level,
            structlog.stdlib.ExtraAdder(),
            *_SHARED_PROCESSORS,
        ],
        processors=[
            structlog.stdlib.ProcessorFormatter.remove_processors_meta,
            structlog.processors.JSONRenderer(),
        ],
    )

    stream_handler = logging.StreamHandler(sys.stdout)
    stream_handler.setFormatter(formatter)
    handlers: list[logging.Handler] = [stream_handler]

    if log_file and log_file.strip():
        log_path = Path(log_file)
        log_path.parent.mkdir(parents=True, exist_ok=True)
        file_handler = RotatingFileHandler(
            log_path,
            maxBytes=max_bytes,
            backupCount=backup_count,
            encoding="utf-8",
        )
        file_handler.setFormatter(formatter)
        handlers.append(file_handler)

    # Root-Logger neu konfigurieren — alle existierenden Handler ersetzen.
    root = logging.getLogger()
    for h in list(root.handlers):
        root.removeHandler(h)
    root.setLevel(numeric_level)
    for h in handlers:
        root.addHandler(h)

    structlog.configure(
        processors=[
            structlog.contextvars.merge_contextvars,
            structlog.stdlib.add_log_level,
            *_SHARED_PROCESSORS[1:],  # ohne merge_contextvars (schon oben)
            structlog.stdlib.ProcessorFormatter.wrap_for_formatter,
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
