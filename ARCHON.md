# Archon — MyBaby Workflow-Setup

Diese Datei beschreibt das in `.archon/` eingecheckte Workflow-System für das MyBaby-Projekt. Quelle: `Archon Setup — MyBaby Projekt` (Setup-Dokument).

## TL;DR — Vor jedem Lauf

```bash
# 1. Claude Code SCHLIESSEN (Issue #1067 — CLAUDECODE=1 lässt Workflows hängen)
# 2. In separatem Terminal:
archon serve                                    # Web UI auf http://localhost:3090
archon workflow run <name> "<args>"
# 3. Im Browser approven oder via CLI: archon workflow approve <run-id>
```

## Workflows (Kurzreferenz)

| Workflow | Beschreibung | Aufruf |
|---|---|---|
| `mybaby-scrum` | Sprint planen, Tasks erzeugen, Sprint aktivieren | `archon workflow run mybaby-scrum --no-worktree ""` |
| `mybaby-sprint-execute` | **Aktiven Sprint** sequentiell abarbeiten (Loop, eine Task pro Iteration) | `archon workflow run mybaby-sprint-execute ""` |
| `mybaby-feature` | Einzelne Feature-Task (TDD → Tests → Review → Push) | `archon workflow run mybaby-feature "<task-id>"` |
| `mybaby-bug-fix` | Einzelnen Bug fixen mit Root-Cause + Regressionstest | `archon workflow run mybaby-bug-fix "<task-id>"` |
| `mybaby-direct-issue` | Backlog-Item per ID direkt implementieren | `archon workflow run mybaby-direct-issue "<issue-id>"` |
| `mybaby-bug-capture` | Bug in `project.db` erfassen (kein Worktree) | `archon workflow run mybaby-bug-capture --no-worktree "<beschreibung>"` |
| `mybaby-dashboard` | PO-Dashboard (`_dashboard/`) erweitern | `archon workflow run mybaby-dashboard "<beschreibung>"` |

## Commands (Kurzreferenz)

| Command | Zweck |
|---|---|
| `load-sprint-context` | Aktiven Sprint, offene Tasks, letzten Snapshot laden — Pflicht-Start |
| `load-issue-by-id` | Backlog-Item per ID — ignoriert Sprint-Zuweisung |
| `bug-capture` | Bug-Eintrag in `backlog` (`type=bug`, `source=ai-agent`) |
| `scrum-master` | Sprints planen, Tasks erzeugen, Decisions pflegen — **kein Code** |
| `coding-lead` | TDD-Implementierung mit Plugin-Struktur und Catppuccin-Tokens |
| `bug-fixer` | Root-Cause + Regressionstest + Fix |
| `code-reviewer` | Read-Only Review: Security K1-K4, DESIGN.md, Plugin-Struktur |
| `tester` | Read-Only Test-Audit: Coverage, Edge Cases, K-Tests |
| `save-session-snapshot` | Pflicht-Abschluss: `conversation_snapshots` + selektiv memory.db |
| `po-dashboard-extend` | Erweiterungen für `_dashboard/` (lokales PO-Tool, Port 5555/5556) |

## Sprint-Lifecycle (Workflow-Wahl)

Standard-Reihenfolge für einen kompletten Sprint:

1. **Plan** — `mybaby-scrum --no-worktree ""`
   Backlog reviewen, Tasks erzeugen, Sprint von `planning` auf `active`.

2. **Execute** — `mybaby-sprint-execute ""`
   Loop-basiert: pro Iteration eine offene Task aus dem aktiven Sprint, TDD,
   Commit, DB-Update. Bei keiner Task mehr → Promise `SPRINT_COMPLETE`.
   Anschließend Review + AI-Test parallel, Telegram, Approval, Push, Sprint-Close.

3. **Einzeleingriffe** während des Sprints (parallele Worktrees):
   - `mybaby-feature "<task-id>"` — eine geplante Task isoliert abarbeiten
   - `mybaby-bug-fix "<task-id>"` — einen Bug isoliert fixen
   - `mybaby-direct-issue "<issue-id>"` — Backlog-Item ohne Sprint

`mybaby-sprint-execute` ersetzt den manuellen "Lead-Coding-Agent-Session"-Prompt
(`500 CONTEXTS/Home Lab Wiki/20 - Projekte/MyBabyTracker/Prompt-Lead-Coding-Agent-Session.md`).
Parallele Sprints (Coordinator-Pattern aus Sprint 19+20) können bei Bedarf als
zweiter Workflow `mybaby-sprint-coordinate.yaml` ergänzt werden — heute nicht enthalten.

## Approval-Mechanik

Zwei verschiedene Primitive — **nicht vermischen**:

### `approval`-Node (in diesem Projekt verwendet)
- Kein Loop, kein Promise-Tag
- Approven via Web UI **oder** CLI: `archon workflow approve <run-id>`
- Mit Rückweisung: `archon workflow approve <run-id> "Feedback"` → triggert `on_reject.prompt`

### `loop`-Node mit `interactive: true` (NICHT verwendet)
- Erfordert Promise-Tag wie `<promise>PLAN_APPROVED</promise>`
- Nicht Teil dieses Setups

## Wichtige Variablen

| Variable | Bedeutung |
|---|---|
| `$ARGUMENTS` | CLI-Input vom `workflow run`-Aufruf |
| `$ARTIFACTS_DIR` | Einziger Mechanismus zur Node-zu-Node-Dateiübergabe (`context: fresh`) |
| `$REJECTION_REASON` | User-Feedback bei `on_reject` |
| `$LOOP_USER_INPUT` | (nur bei interaktiven Loops — nicht hier) |

## Telegram-Benachrichtigung

Jeder interaktive Workflow sendet vor dem `gate`-Node eine Telegram-Nachricht an Chat `96239239`. Bot-Token aus:
```
/Users/erik/Obsidian/Vault/400 AI Agent/430 Claude-Telegram-Bot/claude-telegram-bot.env
→ CLAUDE_TELEGRAM_BOT_API
```

Der Bot unterstützt `/approve <run-id>`, `/reject <run-id> Feedback` und `/workflows` — Approval ist somit aus jedem Terminal möglich, ohne die Web UI im Blick zu haben.

## Worktree-Cleanup (`archon isolation`)

Hinweis: Das Setup-Dokument verwendet `archon worktree …` — die echte CLI nennt das Subkommando `isolation`.

```bash
archon isolation list                # aktive Worktrees anzeigen
archon isolation cleanup 7           # Worktrees älter als 7 Tage entfernen (default)
archon isolation cleanup --merged    # Worktrees mit gemergten Branches entfernen
```

Worktrees werden **nicht** automatisch bereinigt — regelmäßig manuell ausführen.

## Vite-Proxy-Guardrail

Implementiert als Inline-Bash-Prüfung im `push`-Node jedes Workflows:
```bash
if grep -q '100\.71\.39\.53' frontend/vite.config.ts; then
  echo "FEHLER: NAS-IP in vite.config.ts — Proxy auf localhost zurücksetzen!"
  exit 1
fi
```

Hintergrund: NAS-IP `100.71.39.53` (Tailscale) im Container nicht erreichbar — bricht den Build.

## Echtes DB-Schema (Source of Truth: `data/schema.sql`)

Zentrale Referenz, damit Commands konsistent bleiben. Mehrfach im Setup-Dokument abweichend dokumentiert — diese Tabelle ist verifiziert per `PRAGMA table_info`:

```
sprints                  id, name, start_date, end_date, status, capacity, notes
tasks                    id, backlog_id, sprint_id, title, assignee, status, effort,
                         started_at, completed_at, validation_output, notes
backlog                  id, title, type, description, priority, milestone,
                         assigned_sprint, status, created_at, completed_at
decisions                id, title, decision, rationale, alternatives, status, created_at
conversation_snapshots   id, agent_id, session_timestamp, summary,
                         decisions_made, next_session_goals
```

Häufige Stolpersteine — Felder, die im Setup-Dokument erwähnt werden, aber **nicht existieren**:
- `sprints.goal` → in `notes` schreiben (Freitext)
- `backlog.acceptance_criteria` → in `description` einbetten
- `backlog.source` → als `[Quelle: ai-agent]`-Prefix in `description`
- `tasks.created_at` → existiert nicht; Tasks haben nur `started_at`/`completed_at`
- `conversation_snapshots.sprint_id`/`task_id`/`artifacts_path` → in `summary` als Freitext einbetten

## DB-Pfad im Worktree (Worktree-sicher)

`data/project.db` ist via `.gitignore` (`*.db`) ausgeschlossen — Worktrees haben **keine** Kopie der DB. Alle DB-zugreifenden Commands lösen den Main-Repo-Pfad via `git rev-parse --git-common-dir` auf:

```bash
COMMON=$(git rev-parse --git-common-dir)
case "$COMMON" in
  /*) MAIN_REPO=$(dirname "$COMMON") ;;
  *)  MAIN_REPO=$(cd "$COMMON/.." && pwd) ;;
esac
DB="$MAIN_REPO/data/project.db"
```

- Im **Hauptrepo** liefert `git rev-parse --git-common-dir` `.git` (relativ) → `MAIN_REPO=$(pwd)`.
- Im **Worktree** liefert es einen **absoluten** Pfad zum Main-`.git`-Ordner → `MAIN_REPO` zeigt aufs Hauptrepo.

Betroffene Commands (alle `sqlite3`-Aufrufe verwenden `$DB`):
- `load-sprint-context`, `load-issue-by-id`, `bug-capture`, `scrum-master`, `coding-lead`, `bug-fixer`, `save-session-snapshot`, `po-dashboard-extend`

Read-only Commands ohne DB-Zugriff: `code-reviewer`, `tester`.

> Hinweis: Da alle Workflows aus demselben Hauptrepo gegen dieselbe DB schreiben, ist die DB ein **shared resource** zwischen parallel laufenden Workflows. SQLite WAL-Modus reicht für die zu erwartende Last (sequentielle Sprint-/Task-Updates), bei parallelen `coding-lead`-Läufen sollten Tasks nicht gleichzeitig dieselbe Zeile updaten.

## Memory-Integration (selektiv)

| Schreibt in memory.db | Wann |
|---|---|
| `scrum-master` | Sprint-Retrospektiven, Architekturentscheidungen |
| `save-session-snapshot` | Wiederkehrende Patterns, gelöste Probleme |
| `coding-lead`, `bug-fixer` | **Nicht** schreiben (Rauschen vermeiden) |

Standard: Domain `mybaby`, Area `architecture` / `sprint` / `pattern`. Interface: `mcp__memory__add_memory`.

## Smoke-Tests

```bash
# 1. Sanftester Test (kein Worktree, kein Gate)
archon workflow run mybaby-bug-capture --no-worktree "Smoke-Test"

# 2. Status prüfen
archon workflow list

# 3. Worktree-Test (mit Telegram + Gate)
archon workflow run mybaby-direct-issue "<harmlose issue id>"
```

## Troubleshooting

### Workflow hängt still, kein Output
- **Ursache (häufig)**: Workflow läuft innerhalb einer aktiven Claude-Code-Session — bekanntes Issue [#1067](https://github.com/coleam00/Archon/issues/1067). `CLAUDECODE=1` ist gesetzt.
- **Fix**: Claude Code schließen, separates Terminal öffnen, dort `archon workflow run …` starten.

### Approval-Gate erscheint nicht in Web UI
- **Ursache**: `archon serve` läuft nicht.
- **Fix**: Im Hintergrund-Terminal `archon serve` starten, Browser auf `http://localhost:3090`.
- **Alternative**: CLI-Approval mit `archon workflow approve <run-id>`.

### Push-Node bricht mit "FEHLER: NAS-IP"
- **Ursache**: `frontend/vite.config.ts` enthält `100.71.39.53` (lokale Test-Konfig versehentlich committet).
- **Fix**: Proxy auf `http://localhost:8080` zurücksetzen, neuer Commit, Workflow erneut starten.

### Worktrees häufen sich an
- `archon worktree clean` — abgeschlossene Runs werden nicht automatisch entfernt.

### Telegram-Benachrichtigung kommt nicht an
- Token in env-Datei prüfen: `CLAUDE_TELEGRAM_BOT_API`.
- Manueller Test:
  ```bash
  TOKEN=$(grep CLAUDE_TELEGRAM_BOT_API \
    "/Users/erik/Obsidian/Vault/400 AI Agent/430 Claude-Telegram-Bot/claude-telegram-bot.env" \
    | cut -d'=' -f2 | tr -d '"')
  curl -s "https://api.telegram.org/bot${TOKEN}/sendMessage" \
    -d "chat_id=96239239&text=Test"
  ```

### `command: load-sprint-context` findet keine DB
- DB-Pfad: `data/project.db` relativ zum Repo-Root. Fallback: `backend/data/project.db`.
- Bei leerer DB nicht abbrechen — Sektionen leer zurückgeben.

### `archon` schlägt fehl mit "Not in a git repository"
- Aufruf nur innerhalb von `/Users/erik/Obsidian/tools/myPrivateBabyTracker/` oder per `--cwd <pfad>` möglich.

### `notify`-Node sendet keine Telegram-Nachricht
- **Gelöst**: Archon stellt `$RUN_ID` als Environment-Variable im Bash-Node bereit. Verwende `${RUN_ID:-unknown}`.
- **Nicht** funktionierend: `archon workflow list --format id | head -1` aus dem ursprünglichen Setup-Dokument — das CLI gibt Pino-JSON-Logs aus, kein stabiles `--format id`.
- Aktuelle Notify-Node-Vorlage (alle 5 Workflows):
  ```yaml
  bash: |
    TOKEN=$(grep CLAUDE_TELEGRAM_BOT_API \
      "/Users/erik/Obsidian/Vault/400 AI Agent/430 Claude-Telegram-Bot/claude-telegram-bot.env" \
      | cut -d'=' -f2 | tr -d '"')
    RID="${RUN_ID:-unknown}"
    MSG="MyBaby%20<workflow>%20bereit.%0AApprove%3A%20archon%20workflow%20approve%20${RID}"
    curl -fsS "https://api.telegram.org/bot${TOKEN}/sendMessage" \
      -d "chat_id=96239239&text=${MSG}" > /dev/null || echo "Telegram-Notify übersprungen"
  ```
- Failsafe `|| echo …`: Wenn Telegram nicht erreichbar (Netzwerk, Token), bricht der Node nicht ab — Workflow läuft zum Approval-Gate.

### `Claude Code not found` im Workflow-Log
- Quick-Install-Binary bündelt Claude Code nicht. Symptom in `~/.archon/workspaces/.../logs/<run-id>.jsonl`:
  ```
  "type":"node_error","error":"Claude Code not found. Archon requires the Claude Code executable..."
  ```
- **Robuster Fix (shell-unabhängig)** — Pfad in `~/.archon/config.yaml`:
  ```yaml
  assistants:
    claude:
      claudeBinaryPath: /Users/erik/.local/bin/claude
  ```
  Bereits gesetzt. Greift sofort, ohne Shell-Reload.
- Alternative (env-basiert) — `~/.zshrc`:
  ```bash
  export CLAUDE_BIN_PATH="$HOME/.local/bin/claude"
  ```
  Greift erst in **neuen** Shells. Bereits gesetzt.

### Run-Logs finden
Pro Run ein JSONL-Log unter:
```
~/.archon/workspaces/<workspace-hash>/<repo-name>/logs/<run-id>.jsonl
```
Artifacts:
```
~/.archon/workspaces/<workspace-hash>/<repo-name>/artifacts/runs/<run-id>/
```

## Validierung

```bash
archon validate workflows           # alle 6 mybaby-Workflows + Defaults
archon validate workflows mybaby-feature   # einzelner Workflow
archon validate commands            # alle Commands
archon workflow list                # listet auch Bundled Defaults mit
archon workflow status              # laufende Workflows
```

Hinweis: `archon commands list` existiert nicht — das CLI bietet nur `validate commands [name]`. Die mybaby-Commands erscheinen in der Workflow-Validierung, sobald sie referenziert werden.

## Weiterführend

- Setup-Dokument: `.archon/SETUP.md` (falls separat hinterlegt)
- Agent-Definitionen: `~/.claude/agents/*.md`
- Projekt-DB-Schema: `data/schema.sql`
- UI-Tokens: `DESIGN.md`
- Plugin-Konventionen: `MyBaby_Agent_Context.md`
