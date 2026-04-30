"""Changelog service — Pfad 1 (Container-getriggert).

Beim Backend-Startup wird geprueft, ob fuer die aktuelle App-Version bereits ein
Eintrag in `data/changelog.json` existiert. Falls nein, wird automatisch ein
Default-Eintrag angelegt.

Pfad 2 (manuelles Anlegen via Frontend) bleibt unberuehrt und teilt sich die
gleiche JSON-Datei. Reihenfolge: Pfad 1 laeuft beim Container-Start, Pfad 2 ist
ein normaler API-Call zur Laufzeit. Beide sind idempotent.
"""

from __future__ import annotations

import json
from datetime import date
from pathlib import Path

from app.logging import get_logger
from app.version import APP_VERSION

logger = get_logger("changelog_service")

# Same persistent path as routers.changelog (volume-mounted in container).
_CHANGELOG_PATH = Path("data") / "changelog.json"


def _load() -> list[dict]:
    if not _CHANGELOG_PATH.exists():
        return []
    try:
        with _CHANGELOG_PATH.open("r", encoding="utf-8") as f:
            data = json.load(f)
            if isinstance(data, list):
                return data
            logger.warning("changelog_invalid_root", type=type(data).__name__)
            return []
    except (json.JSONDecodeError, OSError) as e:
        logger.error("changelog_load_failed", error=str(e))
        return []


def _save(data: list[dict]) -> None:
    _CHANGELOG_PATH.parent.mkdir(parents=True, exist_ok=True)
    with _CHANGELOG_PATH.open("w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def ensure_release_note_for_current_version() -> None:
    """Idempotent: legt einen Default-Release-Note fuer APP_VERSION an, falls
    noch keiner existiert. Wird beim Container-Start aufgerufen.

    Failure-Modus: Fehler werden geloggt, NIEMALS propagiert — ein kaputter
    Changelog darf nicht das Hochfahren der App blockieren.
    """
    try:
        data = _load()
        if any(e.get("version") == APP_VERSION for e in data):
            logger.info(
                "changelog_auto_publish_skip",
                version=APP_VERSION,
                reason="entry_already_exists",
            )
            return

        entry = {
            "version": APP_VERSION,
            "date": date.today().isoformat(),
            "title": f"MyBaby v{APP_VERSION}",
            "variant": "update",
            "entries": [
                f"Version {APP_VERSION} wurde deployed.",
                "Details zu dieser Version: siehe GitHub Release Notes oder das Admin-Changelog.",
            ],
        }
        # Newest first (Frontend sortiert ohnehin nach Version desc, aber konsistent).
        data.insert(0, entry)
        _save(data)
        logger.info("changelog_auto_published", version=APP_VERSION)
    except Exception as e:  # pragma: no cover — defensive
        logger.error("changelog_auto_publish_failed", error=str(e))
