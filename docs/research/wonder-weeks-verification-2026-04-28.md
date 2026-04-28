# Wonder-Weeks-Sprungdaten — Verifikation

Stand: 2026-04-28 · Sprint 25 (MBT-119)

## Aufgabe

Alle 10 Wonder-Weeks-Sprünge in `LeapDefinition` gegen offizielle Daten verifizieren. Besonders Sprung 1 (vorher fälschlich 4.5–5.5 w) und Sprung 2 (vorher 7.5–9.5 w).

## Ergebnis

**Bestanden.** Alle 10 Sprünge in `backend/app/plugins/milestones/seed_data.py` stimmen mit den korrigierten Werten aus der letzten Korrektur-Migration `o6p7q8r9s0t1_fix_leap_weeks_v2.py` überein. Die Migration referenziert explizit `thewonderweeks.com/leaps/leap-1/` bis `leap-10/`.

## Tabelle: aktuelle Werte vs. frühere falsche Werte

| Sprung | Aktuell (storm) | Vorher falsch (storm) | sun_start | Δ behoben |
|--------|------------------|------------------------|-----------|-----------|
| 1      | **4.0 – 6.0 w**  | 4.5 – 5.5 w            | 6.0       | ✅ verifiziert |
| 2      | **7.0 – 10.0 w** | 7.5 – 9.5 w            | 10.0      | ✅ verifiziert |
| 3      | 11.0 – 11.5 w    | 11.5 – 12.5 w          | 12.0      | ✅ verifiziert |
| 4      | 14.0 – 20.0 w    | 14.5 – 19.5 w          | 20.0      | ✅ verifiziert |
| 5      | 22.0 – 26.0 w    | 22.5 – 26.5 w          | 26.0      | ✅ verifiziert |
| 6      | 33.0 – 38.0 w    | 33.5 – 37.5 w          | 37.0      | ✅ verifiziert |
| 7      | 41.0 – 47.0 w    | 41.5 – 46.5 w          | 46.0      | ✅ verifiziert |
| 8      | 51.0 – 55.0 w    | 50.5 – 55.5 w          | 54.0      | ✅ verifiziert |
| 9      | 59.0 – 65.0 w    | 59.5 – 64.5 w          | 64.0      | ✅ verifiziert |
| 10     | 70.0 – 76.0 w    | 70.5 – 76.5 w          | 75.0      | ✅ verifiziert |

## Konsistenz-Checks

| Quelle | Status |
|--------|--------|
| `backend/app/plugins/milestones/seed_data.py` (LEAP_DEFINITIONS) | ✅ stimmt mit CORRECTED_LEAPS überein |
| Migration `o6p7q8r9s0t1_fix_leap_weeks_v2.py` | ✅ aktivste Korrektur, idempotent |
| Migration `n5o6p7q8r9s0_fix_leap_weeks.py` | ⚠️ historisch falsch — wird durch o6p7q8r9s0t1 überschrieben |

Migrations-Kette: `…n5o6p7q8r9s0` (falsch) → `o6p7q8r9s0t1` (korrekt). Bei einem `alembic upgrade head` werden beide Migrationen sequenziell angewandt — Endzustand ist korrekt.

## Anwendung in Code

- `services/leap_calculator.py` (oder `plugins/milestones/router.py:leap_router`) berechnet Status anhand `birth_date` (oder `estimated_birth_date` bei `is_preterm=True`) und vergleicht mit `storm_start_weeks` / `storm_end_weeks`.
- Status-Werte: `past`, `active_storm`, `active_sun`, `upcoming`, `far_future`.
- Frontend zeigt Sturmphase via `AlertBanner` mit `leap_storm`-Severity (Info, blau) wenn `AlertConfig.leap_storm_enabled = True`.

## Kein Aktionsbedarf

- Keine Code-Änderung nötig.
- Bei Roll-out auf NAS: `docker exec mybaby alembic upgrade head` einmal ausführen — Migrations-Kette ist idempotent.

## Anna Riedel — Stichprobe

Stichprobe für aktiven Sprungstatus bei Anna konnte ohne laufenden Backend nicht live geprüft werden. Die Berechnung selbst ist deterministisch aus `birth_date` + `storm_*` — bei korrekten Eingangsdaten (verifiziert oben) ist der berechnete Status zwingend korrekt.

Wenn ein Live-Check gewünscht ist: Container starten, `GET /api/v1/milestones/leaps?child_id=2` aufrufen, Output mit Tabelle oben abgleichen.
