-- schema_migrations tracking
CREATE TABLE IF NOT EXISTS schema_migrations (
  version TEXT PRIMARY KEY,
  applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- backlog: neue Spalten für Lifecycle
ALTER TABLE backlog ADD COLUMN plugin_key TEXT;
ALTER TABLE backlog ADD COLUMN goal TEXT;
ALTER TABLE backlog ADD COLUMN background TEXT;
ALTER TABLE backlog ADD COLUMN relevant_files TEXT;
ALTER TABLE backlog ADD COLUMN context_notes TEXT;
ALTER TABLE backlog ADD COLUMN refined_at DATETIME;

-- sprints: Reihenfolge
ALTER TABLE sprints ADD COLUMN position INTEGER;

-- review_feedback: Review-Runden
ALTER TABLE review_feedback ADD COLUMN round_number INTEGER DEFAULT 1;
ALTER TABLE review_feedback ADD COLUMN review_status TEXT DEFAULT 'pending';
ALTER TABLE review_feedback ADD COLUMN submitted_to_archon_at DATETIME;

-- Neue Tabelle: Abhängigkeiten
CREATE TABLE IF NOT EXISTS issue_dependencies (
  id INTEGER PRIMARY KEY,
  issue_id INTEGER NOT NULL REFERENCES backlog(id) ON DELETE CASCADE,
  depends_on_id INTEGER NOT NULL REFERENCES backlog(id) ON DELETE CASCADE,
  note TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(issue_id, depends_on_id),
  CHECK(issue_id != depends_on_id)
);
CREATE INDEX IF NOT EXISTS idx_deps_issue ON issue_dependencies(issue_id);
CREATE INDEX IF NOT EXISTS idx_deps_depends ON issue_dependencies(depends_on_id);

-- Neue Tabelle: Archon-Run-Tracking
CREATE TABLE IF NOT EXISTS archon_runs (
  id INTEGER PRIMARY KEY,
  run_id TEXT UNIQUE NOT NULL,
  workflow TEXT NOT NULL,
  sprint_id INTEGER REFERENCES sprints(id),
  backlog_id INTEGER REFERENCES backlog(id),
  status TEXT DEFAULT 'running',
  started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  finished_at DATETIME,
  log_path TEXT
);

-- Performance-Indizes
CREATE INDEX IF NOT EXISTS idx_backlog_sprint ON backlog(assigned_sprint);
CREATE INDEX IF NOT EXISTS idx_backlog_status ON backlog(status);
CREATE INDEX IF NOT EXISTS idx_tasks_backlog ON tasks(backlog_id);
CREATE INDEX IF NOT EXISTS idx_tasks_sprint ON tasks(sprint_id);
