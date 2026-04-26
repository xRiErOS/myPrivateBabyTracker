#!/bin/bash
# capture-findings.sh
# Parst stdout-Markers aus Workflow-Logs und legt Issues in der DB an.
# Usage: source this script or inline as bash: node in YAML
# Pattern: <<<FINDING>>>{"type":"bug","title":"...","description":"..."}<<<END>>>

DB="/Users/erik/Obsidian/tools/myPrivateBabyTracker/data/project.db"
ARTIFACTS="${ARTIFACTS_DIR:-/tmp}"
FINDINGS_FILE="$ARTIFACTS/findings.jsonl"
ERRORS_FILE="$ARTIFACTS/findings.errors"
COUNT=0
ERR_COUNT=0

if [ ! -f "$FINDINGS_FILE" ]; then
  echo "No findings.jsonl found — skipping capture."
  exit 0
fi

while IFS= read -r line; do
  # Validierung mit jq
  if echo "$line" | jq -e 'select(.type and .title and (.title | length <= 120) and (.type == "bug" or .type == "improvement" or .type == "core"))' > /dev/null 2>&1; then
    TYPE=$(echo "$line" | jq -r '.type')
    TITLE=$(echo "$line" | jq -r '.title' | sed "s/'/''/g")
    DESC=$(echo "$line" | jq -r '.description // ""' | sed "s/'/''/g")
    sqlite3 "$DB" "INSERT INTO backlog (title, type, description, status, created_at) VALUES ('$TITLE', '$TYPE', '$DESC', 'new', datetime('now'));"
    COUNT=$((COUNT + 1))
  else
    echo "$line" >> "$ERRORS_FILE"
    ERR_COUNT=$((ERR_COUNT + 1))
  fi
done < "$FINDINGS_FILE"

echo "capture-findings: $COUNT issues created, $ERR_COUNT errors"
echo "$COUNT" > "$ARTIFACTS/findings.count"
