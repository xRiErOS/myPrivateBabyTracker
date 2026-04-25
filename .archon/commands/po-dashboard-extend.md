---
description: "Erweiterungen für das PO-Dashboard (_dashboard/) — eigenständig, nicht im App-Build."
argument-hint: "<feature-beschreibung>"
---

# PO Dashboard Extend

Ergänzt das separate Sprint-Planungstool unter `_dashboard/`. Liest aus `data/project.db` (Source of Truth). **Kein** Bestandteil des App-Builds.

## Stack & Lokales Setup

- React + Express
- Vite-Port: `5555` (UI)
- Express-API-Port: `5556` (startet automatisch über `npm run dev`)
- Pfad: `_dashboard/`
- Start: `cd _dashboard && npm run dev`

## Bekannte Views

- `RoadmapBoard.jsx` — Backlog-Übersicht, Drag-Drop in Sprints
- `SprintReview.jsx` — Sprint-Status, Burn-Down, Done-Tasks
- `ItemDetail.jsx` — Einzelne Backlog-Item-Detailansicht

## Eingabe

- `$ARGUMENTS` → Beschreibung der Erweiterung (z.B. neue View, Filter, KPI)

## Aufgaben

1. Backlog-Eintrag prüfen — falls noch nicht erfasst, erst `bug-capture`/`scrum-master` durchlaufen.
2. Kontext laden:
   - `_dashboard/server.js` (Express-Routes)
   - `_dashboard/src/views/*` (bestehende Views)
   - `data/project.db`-Schema
3. Implementieren:
   - Neue Express-Route in `_dashboard/server.js` (read-only, sofern möglich)
   - Neue React-View in `_dashboard/src/views/`
   - Routing in `_dashboard/src/App.jsx`
4. Smoke-Test im Browser auf `http://localhost:5555`.
5. Keine Tests im klassischen Sinn — manueller Smoke reicht (PO-Tool, kein App-Code).

## Konventionen (abweichend von App)

- Catppuccin-Tokens **nicht** Pflicht — Dashboard ist Tool, nicht Produkt.
- Read-Only auf der Main-Repo-DB — kein Schreibzugriff aus dem Dashboard heraus.
- DB-Pfad: Express-Server muss im Hauptrepo gestartet werden (nicht im Worktree). Falls Worktree-Lauf gewünscht, DB-Pfad via `git rev-parse --git-common-dir` auflösen.
- `_dashboard/` ist **lokales Tool** und kann committet werden, hat aber keine Tests/CI-Pflicht.

## Output

- Neue/geänderte Dateien unter `_dashboard/`
- Kurzbeschreibung in `$ARTIFACTS_DIR/dashboard/changes.md`
- Manueller Smoke-Bericht: "View geladen, Daten angezeigt, keine Konsolen-Fehler"

## Regel

- **Niemals** App-Code (`backend/` oder `frontend/`) hier ändern.
- Bei DB-Schema-Erweiterung: nicht hier — nur via `coding-lead` mit Alembic-Migration.
