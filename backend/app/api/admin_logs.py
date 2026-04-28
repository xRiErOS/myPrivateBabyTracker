"""Admin Log-Viewer — listet, downloadet und löscht die NDJSON-Logs.

Nur admin-Rolle. Quelle: settings.log_file (RotatingFileHandler).
"""

import json
from datetime import datetime, timezone
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from fastapi.responses import FileResponse
from pydantic import BaseModel

from app.config import get_settings
from app.logging import get_logger
from app.middleware.auth import require_role
from app.models.user import User

logger = get_logger("admin_logs")

router = APIRouter(prefix="/admin/logs", tags=["admin", "logs"])


class LogEntry(BaseModel):
    timestamp: str | None = None
    level: str | None = None
    event: str | None = None
    logger: str | None = None
    extras: dict = {}


class LogListResponse(BaseModel):
    items: list[LogEntry]
    total: int
    file_size: int
    file_exists: bool


def _parse_log_line(line: str) -> LogEntry | None:
    """Parse einer NDJSON-Zeile in eine LogEntry. None bei ungültigem JSON."""
    line = line.strip()
    if not line:
        return None
    try:
        raw = json.loads(line)
    except json.JSONDecodeError:
        return None
    if not isinstance(raw, dict):
        return None
    known = {"timestamp", "level", "event", "logger"}
    extras = {k: v for k, v in raw.items() if k not in known}
    return LogEntry(
        timestamp=raw.get("timestamp"),
        level=raw.get("level"),
        event=raw.get("event"),
        logger=raw.get("logger"),
        extras=extras,
    )


def _read_log_entries(log_path: Path) -> list[LogEntry]:
    """Liest die aktuelle Log-Datei und parst alle gültigen JSON-Zeilen."""
    if not log_path.exists():
        return []
    entries: list[LogEntry] = []
    with log_path.open("r", encoding="utf-8") as f:
        for line in f:
            entry = _parse_log_line(line)
            if entry is not None:
                entries.append(entry)
    return entries


@router.get("/", response_model=LogListResponse)
async def list_logs(
    level: str | None = Query(default=None),
    since: str | None = Query(default=None, description="ISO 8601 timestamp"),
    until: str | None = Query(default=None, description="ISO 8601 timestamp"),
    limit: int = Query(default=100, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
    user: User = Depends(require_role("admin")),
) -> LogListResponse:
    """Liste der Log-Einträge — neueste zuerst, paginiert, optional gefiltert."""
    settings = get_settings()
    log_path = Path(settings.log_file) if settings.log_file else None

    if log_path is None:
        return LogListResponse(items=[], total=0, file_size=0, file_exists=False)

    file_exists = log_path.exists()
    file_size = log_path.stat().st_size if file_exists else 0

    entries = _read_log_entries(log_path)

    if level:
        wanted = level.upper()
        entries = [e for e in entries if (e.level or "").upper() == wanted]
    if since:
        entries = [e for e in entries if (e.timestamp or "") >= since]
    if until:
        entries = [e for e in entries if (e.timestamp or "") <= until]

    entries.reverse()
    total = len(entries)
    page = entries[offset : offset + limit]

    return LogListResponse(
        items=page, total=total, file_size=file_size, file_exists=file_exists
    )


@router.get("/download")
async def download_logs(
    user: User = Depends(require_role("admin")),
):
    """Lädt die aktuelle Log-Datei als NDJSON herunter."""
    settings = get_settings()
    if not settings.log_file:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Logging in Datei ist deaktiviert (log_file leer).",
        )
    log_path = Path(settings.log_file)
    if not log_path.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Es liegen keine Log-Daten vor.",
        )
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    filename = f"mybaby-logs-{today}.ndjson"
    logger.info("admin_logs_downloaded", admin_user_id=user.id, file_size=log_path.stat().st_size)
    return FileResponse(
        log_path,
        media_type="application/x-ndjson",
        filename=filename,
    )


@router.delete("/clear", status_code=status.HTTP_204_NO_CONTENT)
async def clear_logs(
    user: User = Depends(require_role("admin")),
) -> Response:
    """Leert die Log-Datei (Truncate). Backup-Dateien bleiben unverändert."""
    settings = get_settings()
    if not settings.log_file:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Logging in Datei ist deaktiviert (log_file leer).",
        )
    log_path = Path(settings.log_file)
    if log_path.exists():
        log_path.write_text("", encoding="utf-8")
    logger.warning("admin_logs_cleared", admin_user_id=user.id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
