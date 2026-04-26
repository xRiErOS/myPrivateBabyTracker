import http from 'node:http'
import os from 'node:os'
import path from 'node:path'
import express from 'express'
import cors from 'cors'
import Database from 'better-sqlite3'
import multer from 'multer'
import { dirname, join, resolve } from 'path'
import { fileURLToPath } from 'url'
import { existsSync, mkdirSync } from 'fs'
import { spawn } from 'child_process'
import { randomUUID } from 'crypto'
import { WebSocketServer } from 'ws'
import { canTransition } from './lib/lifecycle.js'
import { attachStream, subscribe } from './lib/archonStream.js'

const ARCHON_TOKEN = process.env.ARCHON_INTERNAL_TOKEN || 'dev-archon-token'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DB_PATH = resolve(__dirname, '../../data/project.db')
const UPLOADS_DIR = resolve(__dirname, '../uploads')

if (!existsSync(UPLOADS_DIR)) mkdirSync(UPLOADS_DIR, { recursive: true })

const db = new Database(DB_PATH)
db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

// Ensure review tables exist
db.exec(`
  CREATE TABLE IF NOT EXISTS review_feedback (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    backlog_id INTEGER NOT NULL REFERENCES backlog(id),
    status TEXT NOT NULL DEFAULT 'pending',
    comment TEXT,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS review_screenshots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    feedback_id INTEGER NOT NULL REFERENCES review_feedback(id) ON DELETE CASCADE,
    file_path TEXT NOT NULL,
    caption TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`)

const app = express()
app.use(cors())
app.use(express.json())
app.use('/uploads', express.static(UPLOADS_DIR))

const upload = multer({
  storage: multer.diskStorage({
    destination: UPLOADS_DIR,
    filename: (_, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
  }),
  limits: { fileSize: 10 * 1024 * 1024 },
})

// --- Sprints ---
app.get('/api/sprints', (req, res) => {
  const sprints = db.prepare(`
    SELECT s.*,
      (SELECT COUNT(*) FROM backlog b WHERE b.assigned_sprint = s.id) as item_count,
      (SELECT COUNT(*) FROM backlog b WHERE b.assigned_sprint = s.id AND b.status = 'done') as done_count
    FROM sprints s ORDER BY s.id
  `).all()
  res.json(sprints)
})

app.get('/api/sprints/:id', (req, res) => {
  const sprint = db.prepare('SELECT * FROM sprints WHERE id = ?').get(req.params.id)
  if (!sprint) return res.status(404).json({ error: 'Sprint not found' })
  const items = db.prepare(`
    SELECT b.*, rf.id as feedback_id, rf.status as review_status, rf.comment as review_comment, rf.notes as review_notes
    FROM backlog b
    LEFT JOIN review_feedback rf ON rf.backlog_id = b.id
      AND rf.id = (SELECT MAX(id) FROM review_feedback WHERE backlog_id = b.id)
    WHERE b.assigned_sprint = ?
    ORDER BY b.priority, b.id
  `).all(req.params.id)

  // Attach screenshot file_paths per item
  for (const item of items) {
    if (item.feedback_id) {
      item.screenshot_files = db.prepare(
        'SELECT id, file_path FROM review_screenshots WHERE feedback_id = ?'
      ).all(item.feedback_id).map(s => s.file_path)
    } else {
      item.screenshot_files = []
    }
  }

  res.json({ ...sprint, items })
})

// --- Backlog ---
app.get('/api/backlog', (req, res) => {
  const items = db.prepare(`
    SELECT b.*, s.name as sprint_name,
      rf.status as review_status
    FROM backlog b
    LEFT JOIN sprints s ON s.id = b.assigned_sprint
    LEFT JOIN review_feedback rf ON rf.backlog_id = b.id
      AND rf.id = (SELECT MAX(id) FROM review_feedback WHERE backlog_id = b.id)
    ORDER BY b.priority, b.id
  `).all()
  res.json(items)
})

app.get('/api/backlog/:id', (req, res) => {
  const item = db.prepare(`
    SELECT b.*, s.name as sprint_name
    FROM backlog b
    LEFT JOIN sprints s ON s.id = b.assigned_sprint
    WHERE b.id = ?
  `).get(req.params.id)
  if (!item) return res.status(404).json({ error: 'Item not found' })

  const tasks = db.prepare('SELECT * FROM tasks WHERE backlog_id = ? ORDER BY id').all(req.params.id)
  const feedback = db.prepare('SELECT * FROM review_feedback WHERE backlog_id = ? ORDER BY created_at DESC').all(req.params.id)

  for (const fb of feedback) {
    fb.screenshots = db.prepare('SELECT * FROM review_screenshots WHERE feedback_id = ?').all(fb.id)
  }

  res.json({ ...item, tasks, feedback })
})

// Update backlog item notes (PO notes field)
app.patch('/api/backlog/:id', (req, res) => {
  const { notes } = req.body
  // Use the description field for now, or add a po_notes column
  // For simplicity, we store PO notes in review_feedback
  const item = db.prepare('SELECT * FROM backlog WHERE id = ?').get(req.params.id)
  if (!item) return res.status(404).json({ error: 'Item not found' })

  if (notes !== undefined) {
    // Store as latest review feedback with status 'note'
    const existing = db.prepare(
      'SELECT * FROM review_feedback WHERE backlog_id = ? ORDER BY id DESC LIMIT 1'
    ).get(req.params.id)

    if (existing) {
      db.prepare('UPDATE review_feedback SET notes = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
        .run(notes, existing.id)
    } else {
      db.prepare('INSERT INTO review_feedback (backlog_id, status, notes) VALUES (?, ?, ?)')
        .run(req.params.id, 'pending', notes)
    }
  }
  res.json({ ok: true })
})

// --- Review Feedback ---
app.post('/api/review', (req, res) => {
  const { backlog_id, status, comment } = req.body
  if (!backlog_id || !status) return res.status(400).json({ error: 'backlog_id and status required' })

  const result = db.prepare(
    'INSERT INTO review_feedback (backlog_id, status, comment) VALUES (?, ?, ?)'
  ).run(backlog_id, status, comment || null)

  res.json({ id: result.lastInsertRowid })
})

app.patch('/api/review/:id', (req, res) => {
  const { status, comment, notes } = req.body
  const sets = []
  const vals = []
  if (status) { sets.push('status = ?'); vals.push(status) }
  if (comment !== undefined) { sets.push('comment = ?'); vals.push(comment) }
  if (notes !== undefined) { sets.push('notes = ?'); vals.push(notes) }
  if (sets.length === 0) return res.status(400).json({ error: 'Nothing to update' })

  sets.push('updated_at = CURRENT_TIMESTAMP')
  vals.push(req.params.id)

  db.prepare(`UPDATE review_feedback SET ${sets.join(', ')} WHERE id = ?`).run(...vals)
  res.json({ ok: true })
})

// --- Screenshots ---
app.post('/api/review/:id/screenshots', upload.array('files', 10), (req, res) => {
  const feedbackId = req.params.id
  const insert = db.prepare('INSERT INTO review_screenshots (feedback_id, file_path, caption) VALUES (?, ?, ?)')

  const screenshots = []
  for (const file of req.files) {
    const result = insert.run(feedbackId, file.filename, null)
    screenshots.push({ id: result.lastInsertRowid, file_path: file.filename })
  }
  res.json(screenshots)
})

app.delete('/api/screenshots/:id', (req, res) => {
  db.prepare('DELETE FROM review_screenshots WHERE id = ?').run(req.params.id)
  res.json({ ok: true })
})

// ============================================================
// PHASE 2 — New Endpoints
// ============================================================

// Helper: write to audit_log using actual schema
function auditLog(tableNameVal, recordId, action, oldValue, newValue, changedBy) {
  try {
    db.prepare(
      `INSERT INTO audit_log (table_name, record_id, action, old_value, new_value, agent_id)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).run(tableNameVal, recordId, action, oldValue ? JSON.stringify(oldValue) : null, newValue ? JSON.stringify(newValue) : null, changedBy)
  } catch (_) {
    // audit_log failures must never break the main request
  }
}

// ---- Issues (Backlog) ----

// POST /api/backlog — Create issue
app.post('/api/backlog', (req, res) => {
  const { title, type, description, priority, milestone, status, plugin_key, goal, background, context_notes, relevant_files } = req.body
  if (!title) return res.status(400).json({ error: 'title ist Pflichtfeld' })
  if (!type) return res.status(400).json({ error: 'type ist Pflichtfeld' })
  const validTypes = ['bug', 'feature', 'improvement', 'core']
  if (!validTypes.includes(type)) return res.status(400).json({ error: `type muss einer von ${validTypes.join('|')} sein` })

  let finalStatus = 'new'
  if (status === 'refined') {
    if (!goal || !background) return res.status(400).json({ error: 'goal und background erforderlich für status refined' })
    finalStatus = 'refined'
  } else if (status && status !== 'new') {
    return res.status(400).json({ error: 'status bei Anlage darf nur new oder refined sein' })
  }

  const result = db.prepare(`
    INSERT INTO backlog (title, type, description, priority, milestone, status, plugin_key, goal, background, context_notes, relevant_files)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(title, type, description || null, priority || 3, milestone || null, finalStatus, plugin_key || null, goal || null, background || null, context_notes || null, relevant_files || null)

  const item = db.prepare('SELECT * FROM backlog WHERE id = ?').get(result.lastInsertRowid)
  auditLog('backlog', result.lastInsertRowid, 'create', null, item, 'dashboard-po')
  res.status(201).json(item)
})

// PUT /api/backlog/:id — Edit issue fields (not status or sprint)
app.put('/api/backlog/:id', (req, res) => {
  const item = db.prepare('SELECT * FROM backlog WHERE id = ?').get(req.params.id)
  if (!item) return res.status(404).json({ error: 'Item not found' })

  const { title, type, description, priority, milestone, plugin_key, goal, background, context_notes, relevant_files } = req.body
  if (type) {
    const validTypes = ['bug', 'feature', 'improvement', 'core']
    if (!validTypes.includes(type)) return res.status(400).json({ error: `type muss einer von ${validTypes.join('|')} sein` })
  }

  db.prepare(`
    UPDATE backlog SET
      title = COALESCE(?, title),
      type = COALESCE(?, type),
      description = COALESCE(?, description),
      priority = COALESCE(?, priority),
      milestone = COALESCE(?, milestone),
      plugin_key = COALESCE(?, plugin_key),
      goal = COALESCE(?, goal),
      background = COALESCE(?, background),
      context_notes = COALESCE(?, context_notes),
      relevant_files = COALESCE(?, relevant_files)
    WHERE id = ?
  `).run(title || null, type || null, description !== undefined ? description : null, priority || null, milestone !== undefined ? milestone : null, plugin_key !== undefined ? plugin_key : null, goal !== undefined ? goal : null, background !== undefined ? background : null, context_notes !== undefined ? context_notes : null, relevant_files !== undefined ? relevant_files : null, req.params.id)

  const updated = db.prepare('SELECT * FROM backlog WHERE id = ?').get(req.params.id)
  res.json(updated)
})

// PATCH /api/backlog/:id/status — Status transition
app.patch('/api/backlog/:id/status', (req, res) => {
  const item = db.prepare('SELECT * FROM backlog WHERE id = ?').get(req.params.id)
  if (!item) return res.status(404).json({ error: 'Item not found' })

  const { status: newStatus, notes } = req.body
  if (!newStatus) return res.status(400).json({ error: 'status ist Pflichtfeld' })

  const isArchon = req.headers['x-archon-token'] === ARCHON_TOKEN

  // Build ctx for lifecycle check
  const latestFeedback = db.prepare(
    'SELECT * FROM review_feedback WHERE backlog_id = ? ORDER BY id DESC LIMIT 1'
  ).get(req.params.id)

  const ctx = {
    goal: item.goal,
    background: item.background,
    assigned_sprint: item.assigned_sprint,
    isArchon,
    hasPassedReview: latestFeedback?.review_status === 'passed',
    hasRejectedReview: latestFeedback?.review_status === 'rejected',
    submittedToArchon: !!latestFeedback?.submitted_to_archon_at,
    cancellationNotes: newStatus === 'cancelled' ? notes : null,
  }

  const { allowed, reason } = canTransition(item.status, newStatus, ctx)
  if (!allowed) return res.status(422).json({ error: reason })

  const sets = ['status = ?']
  const vals = [newStatus]

  if (newStatus === 'refined' && (item.status === 'new')) {
    sets.push('refined_at = CURRENT_TIMESTAMP')
  }
  if (newStatus === 'done' || newStatus === 'cancelled') {
    sets.push('completed_at = CURRENT_TIMESTAMP')
  }
  if ((item.status === 'done' && newStatus === 'planned') || (item.status === 'passed' && newStatus === 'planned')) {
    sets.push('completed_at = NULL')
  }

  vals.push(req.params.id)
  db.prepare(`UPDATE backlog SET ${sets.join(', ')} WHERE id = ?`).run(...vals)

  auditLog('backlog', Number(req.params.id), 'status_change', { status: item.status }, { status: newStatus, notes }, isArchon ? 'archon' : 'dashboard-po')

  const updated = db.prepare('SELECT * FROM backlog WHERE id = ?').get(req.params.id)
  res.json(updated)
})

// PATCH /api/backlog/:id/sprint — Assign or remove sprint
app.patch('/api/backlog/:id/sprint', (req, res) => {
  const item = db.prepare('SELECT * FROM backlog WHERE id = ?').get(req.params.id)
  if (!item) return res.status(404).json({ error: 'Item not found' })

  if (item.status === 'in_progress') {
    return res.status(409).json({ error: 'Issue ist in Bearbeitung' })
  }

  const { sprint_id } = req.body

  const assignSprint = db.transaction(() => {
    if (sprint_id != null) {
      const sprint = db.prepare('SELECT id FROM sprints WHERE id = ?').get(sprint_id)
      if (!sprint) throw new Error('Sprint not found')
      db.prepare('UPDATE backlog SET assigned_sprint = ? WHERE id = ?').run(sprint_id, req.params.id)
      if (item.status === 'refined') {
        db.prepare("UPDATE backlog SET status = 'planned' WHERE id = ?").run(req.params.id)
      }
    } else {
      db.prepare('UPDATE backlog SET assigned_sprint = NULL WHERE id = ?').run(req.params.id)
      if (item.status === 'planned') {
        db.prepare("UPDATE backlog SET status = 'refined' WHERE id = ?").run(req.params.id)
      }
    }
  })

  try {
    assignSprint()
  } catch (e) {
    return res.status(404).json({ error: e.message })
  }

  const updated = db.prepare('SELECT * FROM backlog WHERE id = ?').get(req.params.id)
  res.json(updated)
})

// DELETE /api/backlog/:id — Hard delete
app.delete('/api/backlog/:id', (req, res) => {
  const item = db.prepare('SELECT * FROM backlog WHERE id = ?').get(req.params.id)
  if (!item) return res.status(404).json({ error: 'Item not found' })

  const doDelete = db.transaction(() => {
    db.prepare('DELETE FROM issue_dependencies WHERE issue_id = ? OR depends_on_id = ?').run(req.params.id, req.params.id)
    db.prepare('DELETE FROM review_feedback WHERE backlog_id = ?').run(req.params.id)
    db.prepare('DELETE FROM backlog WHERE id = ?').run(req.params.id)
  })
  doDelete()

  auditLog('backlog', Number(req.params.id), 'delete', item, null, 'dashboard-po')
  res.status(204).end()
})

// ---- Dependencies ----

// GET /api/backlog/:id/dependencies
app.get('/api/backlog/:id/dependencies', (req, res) => {
  const blockers = db.prepare(`
    SELECT d.id as dep_id, d.note, b.id, b.title, b.status, b.type, b.priority
    FROM issue_dependencies d
    JOIN backlog b ON b.id = d.depends_on_id
    WHERE d.issue_id = ?
  `).all(req.params.id)

  const blocked_by = db.prepare(`
    SELECT d.id as dep_id, d.note, b.id, b.title, b.status, b.type, b.priority
    FROM issue_dependencies d
    JOIN backlog b ON b.id = d.issue_id
    WHERE d.depends_on_id = ?
  `).all(req.params.id)

  res.json({ blockers, blocked_by })
})

// POST /api/backlog/:id/dependencies
app.post('/api/backlog/:id/dependencies', (req, res) => {
  const issueId = Number(req.params.id)
  const { depends_on_id, note } = req.body
  if (!depends_on_id) return res.status(400).json({ error: 'depends_on_id ist Pflichtfeld' })
  if (issueId === Number(depends_on_id)) return res.status(400).json({ error: 'Self-Reference nicht erlaubt' })

  const existing = db.prepare(
    'SELECT id FROM issue_dependencies WHERE issue_id = ? AND depends_on_id = ?'
  ).get(issueId, depends_on_id)
  if (existing) return res.status(409).json({ error: 'Dependency existiert bereits' })

  const result = db.prepare(
    'INSERT INTO issue_dependencies (issue_id, depends_on_id, note) VALUES (?, ?, ?)'
  ).run(issueId, depends_on_id, note || null)

  const dep = db.prepare('SELECT * FROM issue_dependencies WHERE id = ?').get(result.lastInsertRowid)
  res.status(201).json(dep)
})

// DELETE /api/dependencies/:id
app.delete('/api/dependencies/:id', (req, res) => {
  db.prepare('DELETE FROM issue_dependencies WHERE id = ?').run(req.params.id)
  res.status(204).end()
})

// ---- Sprints (new endpoints) ----

// POST /api/sprints — Create sprint
app.post('/api/sprints', (req, res) => {
  const { name, start_date, end_date, capacity, notes } = req.body
  if (!name) return res.status(400).json({ error: 'name ist Pflichtfeld' })

  const maxPos = db.prepare('SELECT MAX(position) as mp FROM sprints').get()
  const position = (maxPos?.mp ?? 0) + 1

  const result = db.prepare(`
    INSERT INTO sprints (name, start_date, end_date, capacity, notes, status, position)
    VALUES (?, ?, ?, ?, ?, 'planning', ?)
  `).run(name, start_date || null, end_date || null, capacity || null, notes || null, position)

  const sprint = db.prepare('SELECT * FROM sprints WHERE id = ?').get(result.lastInsertRowid)
  res.status(201).json(sprint)
})

// PATCH /api/sprints/reorder — MUST be before /:id routes
app.patch('/api/sprints/reorder', (req, res) => {
  const { ordered_ids } = req.body
  if (!Array.isArray(ordered_ids)) return res.status(400).json({ error: 'ordered_ids muss ein Array sein' })

  const reorder = db.transaction(() => {
    for (let i = 0; i < ordered_ids.length; i++) {
      db.prepare('UPDATE sprints SET position = ? WHERE id = ?').run(i, ordered_ids[i])
    }
  })
  reorder()
  res.json({ success: true })
})

// PUT /api/sprints/:id — Edit sprint fields
app.put('/api/sprints/:id', (req, res) => {
  const sprint = db.prepare('SELECT * FROM sprints WHERE id = ?').get(req.params.id)
  if (!sprint) return res.status(404).json({ error: 'Sprint not found' })

  const { name, start_date, end_date, capacity, notes, status } = req.body
  db.prepare(`
    UPDATE sprints SET
      name = COALESCE(?, name),
      start_date = COALESCE(?, start_date),
      end_date = COALESCE(?, end_date),
      capacity = COALESCE(?, capacity),
      notes = COALESCE(?, notes),
      status = COALESCE(?, status)
    WHERE id = ?
  `).run(name || null, start_date || null, end_date || null, capacity || null, notes !== undefined ? notes : null, status || null, req.params.id)

  const updated = db.prepare('SELECT * FROM sprints WHERE id = ?').get(req.params.id)
  res.json(updated)
})

// Helper: spawn detached archon process
function spawnArchon(args) {
  const child = spawn('archon', args, {
    detached: true,
    env: { ...process.env, CLAUDECODE: undefined },
    stdio: ['ignore', 'pipe', 'ignore'],
  })
  child.unref()
  return child
}

// Helper: parse run_id from archon stdout
function parseRunId(child) {
  return new Promise((resolve) => {
    let output = ''
    child.stdout.on('data', (chunk) => { output += chunk.toString() })
    child.stdout.on('end', () => {
      try {
        for (const line of output.split('\n')) {
          const parsed = JSON.parse(line)
          if (parsed.run_id) { resolve(parsed.run_id); return }
        }
      } catch (_) {}
      resolve(null)
    })
    setTimeout(() => resolve(null), 3000)
  })
}

// POST /api/sprints/:id/run-archon
app.post('/api/sprints/:id/run-archon', async (req, res) => {
  const sprintId = req.params.id
  const child = spawnArchon(['workflow', 'run', 'mybaby-sprint-execute', String(sprintId)])
  const runId = (await parseRunId(child)) || randomUUID()

  const logPath = path.join(
    os.homedir(),
    '.archon/workspaces/xRiErOS/myPrivateBabyTracker/logs',
    `${runId}.jsonl`,
  )

  try {
    db.prepare(
      `INSERT OR IGNORE INTO archon_runs (run_id, workflow, sprint_id, status, log_path) VALUES (?, ?, ?, 'running', ?)`
    ).run(runId, 'mybaby-sprint-execute', sprintId, logPath)
  } catch (_) {}

  attachStream(runId, logPath, db)
  res.json({ run_id: runId, status: 'running' })
})

// POST /api/sprints/:id/run-refinement
app.post('/api/sprints/:id/run-refinement', async (req, res) => {
  const sprintId = req.params.id
  const child = spawnArchon(['workflow', 'run', 'mybaby-refinement', String(sprintId)])
  const runId = (await parseRunId(child)) || randomUUID()

  const logPath = path.join(
    os.homedir(),
    '.archon/workspaces/xRiErOS/myPrivateBabyTracker/logs',
    `${runId}.jsonl`,
  )

  try {
    db.prepare(
      `INSERT OR IGNORE INTO archon_runs (run_id, workflow, sprint_id, status, log_path) VALUES (?, ?, ?, 'running', ?)`
    ).run(runId, 'mybaby-refinement', sprintId, logPath)
  } catch (_) {}

  attachStream(runId, logPath, db)
  res.json({ run_id: runId, status: 'running' })
})

// POST /api/sprints/:id/submit-feedback
app.post('/api/sprints/:id/submit-feedback', (req, res) => {
  const { run_id, feedback_items } = req.body
  if (!run_id || !Array.isArray(feedback_items)) {
    return res.status(400).json({ error: 'run_id und feedback_items sind Pflicht' })
  }

  const writeFeedback = db.transaction(() => {
    for (const item of feedback_items) {
      const { backlog_id, notes, review_status } = item
      const maxRound = db.prepare(
        'SELECT MAX(round_number) as mr FROM review_feedback WHERE backlog_id = ?'
      ).get(backlog_id)
      const roundNumber = (maxRound?.mr ?? 0) + 1

      db.prepare(`
        INSERT INTO review_feedback (backlog_id, round_number, review_status, notes)
        VALUES (?, ?, ?, ?)
      `).run(backlog_id, roundNumber, review_status, notes || null)
    }
  })
  writeFeedback()

  const allPassed = feedback_items.every(i => i.review_status === 'passed')
  const action = allPassed ? 'approved' : 'rejected'

  if (allPassed) {
    const child = spawnArchon(['workflow', 'approve', run_id])
    child.unref()
  } else {
    const rejected = feedback_items.filter(i => i.review_status === 'rejected')
    const summary = rejected.map(i => `#${i.backlog_id}: ${i.notes || 'rejected'}`).join('; ')
    const child = spawnArchon(['workflow', 'reject', run_id, summary])
    child.unref()
  }

  res.json({ action, run_id })
})

// GET /api/sprints/:id/active-run
app.get('/api/sprints/:id/active-run', (req, res) => {
  const row = db
    .prepare(
      "SELECT run_id, status FROM archon_runs WHERE sprint_id=? AND status IN ('running','awaiting_approval') ORDER BY started_at DESC LIMIT 1",
    )
    .get(req.params.id)
  res.json(row ?? null)
})

// GET /api/archon-runs
app.get('/api/archon-runs', (req, res) => {
  const { sprint_id } = req.query
  let query = 'SELECT * FROM archon_runs'
  const params = []
  if (sprint_id) {
    query += ' WHERE sprint_id = ?'
    params.push(sprint_id)
  }
  query += ' ORDER BY started_at DESC'
  const runs = db.prepare(query).all(...params)
  res.json(runs)
})

// ---- Reviews ----

// POST /api/backlog/:id/reviews — New review round
app.post('/api/backlog/:id/reviews', (req, res) => {
  const { notes } = req.body
  const maxRound = db.prepare(
    'SELECT MAX(round_number) as mr FROM review_feedback WHERE backlog_id = ?'
  ).get(req.params.id)
  const roundNumber = (maxRound?.mr ?? 0) + 1

  const result = db.prepare(
    `INSERT INTO review_feedback (backlog_id, round_number, review_status, notes) VALUES (?, ?, 'pending', ?)`
  ).run(req.params.id, roundNumber, notes || null)

  const entry = db.prepare('SELECT * FROM review_feedback WHERE id = ?').get(result.lastInsertRowid)
  res.status(201).json(entry)
})

// GET /api/backlog/:id/reviews — All review rounds
app.get('/api/backlog/:id/reviews', (req, res) => {
  const rows = db.prepare(
    'SELECT * FROM review_feedback WHERE backlog_id = ? ORDER BY round_number ASC'
  ).all(req.params.id)

  for (const row of rows) {
    row.screenshots = db.prepare(
      'SELECT * FROM review_screenshots WHERE feedback_id = ?'
    ).all(row.id)
  }

  res.json(rows)
})

// PATCH /api/reviews/:id — Set review status/notes
app.patch('/api/reviews/:id', (req, res) => {
  const { review_status, notes } = req.body
  const sets = []
  const vals = []

  if (review_status !== undefined) { sets.push('review_status = ?'); vals.push(review_status) }
  if (notes !== undefined) { sets.push('notes = ?'); vals.push(notes) }
  if (sets.length === 0) return res.status(400).json({ error: 'Nichts zu aktualisieren' })

  sets.push('updated_at = CURRENT_TIMESTAMP')
  vals.push(req.params.id)

  db.prepare(`UPDATE review_feedback SET ${sets.join(', ')} WHERE id = ?`).run(...vals)
  const updated = db.prepare('SELECT * FROM review_feedback WHERE id = ?').get(req.params.id)
  res.json(updated)
})

const PORT = 5556
const server = http.createServer(app)
const wss = new WebSocketServer({ noServer: true })

server.on('upgrade', (req, socket, head) => {
  const m = req.url.match(/^\/ws\/archon\/([^/?]+)/)
  if (!m) { socket.destroy(); return }
  const runId = decodeURIComponent(m[1])
  wss.handleUpgrade(req, socket, head, ws => {
    subscribe(runId, ws, db)
  })
})

server.listen(PORT, () => console.log(`API + WSS running on http://localhost:${PORT}`))
