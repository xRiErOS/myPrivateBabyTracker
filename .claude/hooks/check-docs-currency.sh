#!/usr/bin/env bash
# Doku-Konsistenz-Check (Sprint 25)
# Wird via SessionEnd-Hook und SessionStart-Hook aufgerufen.
# Pruefe: gibt es Code-Aenderungen ohne entsprechende Doku-Updates?
# Wenn ja: Reminder via stderr (SessionEnd) bzw. additionalContext (SessionStart).

set -euo pipefail

EVENT="${1:-session-end}"

ROOT="$(git rev-parse --show-toplevel 2>/dev/null || true)"
[ -z "$ROOT" ] && exit 0
cd "$ROOT"

# Code-Pfade, deren Aenderung eine Doku-Aktualisierung ausloesen sollte.
CODE_PATHS=(
  "backend/app/plugins"
  "backend/app/api"
  "backend/app/middleware"
  "backend/app/models"
  "backend/app/services"
  "backend/app/routers"
  "frontend/src/plugins"
  "frontend/src/pages"
  "frontend/src/components"
  "frontend/src/hooks"
  "frontend/src/api"
  "frontend/src/lib/pluginRegistry.ts"
  "frontend/src/lib/pluginConfig.ts"
  "backend/requirements.txt"
  "backend/pyproject.toml"
  "frontend/package.json"
)

# Doku-Dateien, die im selben Commit/Sprint mitgepflegt werden muessen.
DOC_PATHS=(
  "docs/FEATURES.md"
  "docs/DEPENDENCIES.md"
  "docs/SECURITY-AUDIT.md"
)

# Working-Tree-Aenderungen (uncommitted + staged).
CHANGED=$(git status --porcelain | awk '{print $2}')
[ -z "$CHANGED" ] && exit 0

code_hit=0
doc_hit=0
hit_files=""

while IFS= read -r f; do
  [ -z "$f" ] && continue
  for p in "${CODE_PATHS[@]}"; do
    case "$f" in
      "$p"*) code_hit=1; hit_files="${hit_files}\n  - $f"; break ;;
    esac
  done
  for p in "${DOC_PATHS[@]}"; do
    case "$f" in
      "$p"*) doc_hit=1; break ;;
    esac
  done
done <<< "$CHANGED"

if [ "$code_hit" -eq 1 ] && [ "$doc_hit" -eq 0 ]; then
  msg="DOKU-REMINDER: Code-Aenderungen ohne entsprechende Updates an docs/FEATURES.md, docs/DEPENDENCIES.md oder docs/SECURITY-AUDIT.md erkannt. Bitte vor Sprint-Close synchronisieren.\n\nBetroffene Pfade:${hit_files}\n\nQuelle: .claude/hooks/check-docs-currency.sh"

  case "$EVENT" in
    session-start)
      # JSON-Output fuer Claude (additionalContext wird in System-Reminder injiziert).
      python3 - "$msg" <<'PY'
import json, sys
msg = sys.argv[1].replace("\\n", "\n")
print(json.dumps({
    "hookSpecificOutput": {
        "hookEventName": "SessionStart",
        "additionalContext": msg,
    }
}))
PY
      ;;
    *)
      # SessionEnd / Stop: Stderr-Reminder fuer den Nutzer (CLI-sichtbar).
      printf "\n=== DOKU-REMINDER ===\n" >&2
      printf "%b\n" "$msg" >&2
      printf "=====================\n\n" >&2
      ;;
  esac
fi

exit 0
