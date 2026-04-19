-- MyBaby Project DB Schema v1.0
-- Based on: "SQLite für KI-Agent-Projekte" (Vault: 800 Bank/)
-- Purpose: Scrum-Board + Decision Log + Session Tracking for AI agents

CREATE TABLE IF NOT EXISTS sprints (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  start_date DATE,
  end_date DATE,
  status TEXT DEFAULT 'planning',  -- planning, active, closed
  capacity INTEGER,
  notes TEXT
);

CREATE TABLE IF NOT EXISTS backlog (
  id INTEGER PRIMARY KEY,
  title TEXT NOT NULL,
  type TEXT NOT NULL,  -- feature, bug, refactor, chore, security
  description TEXT,
  priority INTEGER DEFAULT 3,  -- 1 (critical) to 5 (low)
  milestone TEXT,  -- v0.1.0, v0.2.0, etc.
  assigned_sprint INTEGER REFERENCES sprints(id),
  status TEXT DEFAULT 'open',  -- open, in_progress, done, blocked, deferred
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  completed_at DATETIME
);

CREATE TABLE IF NOT EXISTS tasks (
  id INTEGER PRIMARY KEY,
  backlog_id INTEGER REFERENCES backlog(id),
  sprint_id INTEGER REFERENCES sprints(id),
  title TEXT NOT NULL,
  assignee TEXT,  -- agent name or sub-agent ID
  status TEXT DEFAULT 'todo',  -- todo, in_progress, blocked, done
  effort INTEGER,  -- story points
  started_at DATETIME,
  completed_at DATETIME,
  validation_output TEXT,  -- proof of completion
  notes TEXT
);

CREATE TABLE IF NOT EXISTS decisions (
  id INTEGER PRIMARY KEY,
  title TEXT NOT NULL,
  decision TEXT NOT NULL,
  rationale TEXT,
  alternatives TEXT,  -- JSON
  status TEXT DEFAULT 'active',  -- active, reversed, superseded
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS conversation_snapshots (
  id INTEGER PRIMARY KEY,
  agent_id TEXT,
  session_timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  summary TEXT,
  decisions_made TEXT,  -- JSON array
  next_session_goals TEXT
);

CREATE TABLE IF NOT EXISTS audit_log (
  id INTEGER PRIMARY KEY,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  agent_id TEXT,
  action TEXT,
  table_name TEXT,
  record_id INTEGER,
  old_value TEXT,
  new_value TEXT
);
