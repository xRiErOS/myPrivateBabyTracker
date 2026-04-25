#!/bin/bash
# Pending mem0-Einträge für MyBaby-Archon-Setup.
# Voraussetzung: mem0-Stack läuft (Portainer → Stacks → mem0 → Start).
# Test: nc -z -G 2 100.71.39.53 8888 && echo OK
#
# Aufruf:
#   bash .archon/mem0-pending.sh
# Optional mit API-Key:
#   MEM0_API_KEY=xxx bash .archon/mem0-pending.sh
set -e

BASE="http://100.71.39.53:8888"
HEADERS=(-H "Content-Type: application/json")
[ -n "$MEM0_API_KEY" ] && HEADERS+=(-H "X-API-Key: $MEM0_API_KEY")

post() {
  local content="$1"
  local domain="$2"
  local area="$3"
  local wichtigkeit="$4"
  local tags="$5"
  curl -sS -X POST "$BASE/memories" "${HEADERS[@]}" -d "$(jq -n \
    --arg c "$content" --arg d "$domain" --arg a "$area" \
    --arg w "$wichtigkeit" --argjson t "$tags" \
    '{messages:[{role:"user",content:$c}],user_id:"erik",
      metadata:{domain:$d,area:$a,wichtigkeit:$w,schlagwoerter:$t}}')"
  echo
}

echo "[1/3] Schema project.db..."
post "MyBaby Projekt-DB Schema (data/project.db) — verifizierte Felder. \
sprints: id, name, start_date, end_date, status, capacity, notes (KEIN goal). \
tasks: id, backlog_id, sprint_id, title, assignee, status, effort, started_at, completed_at, validation_output, notes (KEIN created_at). \
backlog: id, title, type, description, priority, milestone, assigned_sprint, status, created_at, completed_at (KEIN acceptance_criteria, KEIN source). \
decisions: id, title, decision, rationale, alternatives, status, created_at. \
conversation_snapshots: id, agent_id, session_timestamp, summary, decisions_made, next_session_goals (KEIN sprint_id/task_id/artifacts_path). \
Source of Truth: data/schema.sql." \
"Wissen" "MyBaby" "Wichtig" '["Schema","Sqlite","MyBaby","Archon"]'

echo "[2/3] Worktree-DB-Pattern..."
post "MyBaby Archon Worktree-DB-Pattern: data/project.db ist via .gitignore (*.db) ausgeschlossen — Worktrees haben keine eigene Kopie. \
Alle DB-zugreifenden Commands lösen den Main-Repo-Pfad via 'git rev-parse --git-common-dir' auf. \
Im Hauptrepo liefert das '.git' (relativ), im Worktree den absoluten Pfad zum Main-.git-Ordner. \
Dieselbe sqlite3-Logik funktioniert in beiden Kontexten ohne Sonderfall." \
"Wissen" "MyBaby" "Wichtig" '["Archon","Worktree","Git","MyBaby"]'

echo "[3/3] Archon-Setup..."
post "MyBaby Archon-Setup unter /Users/erik/Obsidian/tools/myPrivateBabyTracker/.archon/ eingecheckt. \
CLI-Installation: 'brew install coleam00/archon/archon'. \
CLAUDE_BIN_PATH=/Users/erik/.local/bin/claude in ~/.archon/config.yaml unter assistants.claude.claudeBinaryPath. \
Workflows: mybaby-scrum (planen), mybaby-sprint-execute (Sprint loopen, eine Task pro Iteration), \
mybaby-feature/bug-fix/direct-issue (einzelne Tasks), mybaby-bug-capture, mybaby-dashboard. \
CLI-Subkommando heißt 'isolation', NICHT 'worktree'. Telegram-Bot-Notify pre-gate via Chat 96239239. \
Issue #1067: Archon nie innerhalb einer aktiven Claude-Code-Session starten." \
"Wissen" "MyBaby" "Zentral" '["Archon","Setup","MyBaby","CLI"]'

echo "Fertig."
