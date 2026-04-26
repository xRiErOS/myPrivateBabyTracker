import React, { useState, useEffect, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import StatusBadge from '../components/StatusBadge.jsx'

// Allowed PO-visible transitions (Archon-only transitions excluded)
const ALLOWED_TRANSITIONS = {
  new: ['refined', 'cancelled'],
  refined: ['new', 'planned', 'cancelled'],
  planned: ['refined', 'cancelled'],
  in_progress: [], // Archon only
  to_review: ['passed', 'cancelled'],
  passed: ['cancelled'],
  done: [],
  cancelled: ['refined'],
}

const TRANSITION_LABELS = {
  new: 'Neu',
  refined: 'Refined',
  planned: 'Geplant',
  in_progress: 'In Arbeit',
  to_review: 'Review',
  passed: 'Bestanden',
  done: 'Done',
  cancelled: 'Storniert',
}

// Accordion section
function Accordion({ title, defaultOpen = false, children }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="rounded-xl mb-4" style={{ background: 'var(--mantle)' }}>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-4 text-left"
      >
        <h2 className="font-bold text-sm" style={{ color: 'var(--subtext0)' }}>{title}</h2>
        <span className="text-xs" style={{ color: 'var(--overlay0)' }}>{open ? '▲' : '▼'}</span>
      </button>
      {open && <div className="px-4 pb-4">{children}</div>}
    </div>
  )
}

export default function ItemDetail() {
  const { id } = useParams()
  const [item, setItem] = useState(null)
  const [loading, setLoading] = useState(true)

  // Edit state
  const [editing, setEditing] = useState(false)
  const [editFields, setEditFields] = useState({})
  const [savingEdit, setSavingEdit] = useState(false)
  const [editError, setEditError] = useState('')

  // Notes (PO)
  const [notes, setNotes] = useState('')
  const [savingNotes, setSavingNotes] = useState(false)
  const [savedNotes, setSavedNotes] = useState(false)

  // Status transition
  const [transitioning, setTransitioning] = useState(false)
  const [cancelNotes, setCancelNotes] = useState('')
  const [showCancelInput, setShowCancelInput] = useState(false)
  const [pendingToStatus, setPendingToStatus] = useState(null)
  const [statusError, setStatusError] = useState('')

  // Dependencies
  const [deps, setDeps] = useState({ blocks: [], blocked_by: [] })
  const [allBacklog, setAllBacklog] = useState([])
  const [depSearch, setDepSearch] = useState('')
  const [addingDep, setAddingDep] = useState(false)
  const [depDirection, setDepDirection] = useState('blocked_by') // which direction to add

  // Reviews
  const [reviews, setReviews] = useState([])
  const [creatingReview, setCreatingReview] = useState(false)

  const loadItem = useCallback(() => {
    setLoading(true)
    fetch(`/api/backlog/${id}`)
      .then(r => r.json())
      .then(data => {
        setItem(data)
        const latest = data.feedback?.[0]
        if (latest?.notes) setNotes(latest.notes)
        setLoading(false)
      })
  }, [id])

  const loadDeps = useCallback(() => {
    fetch(`/api/backlog/${id}/dependencies`)
      .then(r => r.json())
      .then(data => {
        if (data && !data.error) setDeps(data)
      })
      .catch(() => {})
  }, [id])

  const loadReviews = useCallback(() => {
    fetch(`/api/backlog/${id}/reviews`)
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) setReviews(data)
      })
      .catch(() => {})
  }, [id])

  useEffect(() => {
    loadItem()
    loadDeps()
    loadReviews()
    fetch('/api/backlog').then(r => r.json()).then(setAllBacklog).catch(() => {})
  }, [loadItem, loadDeps, loadReviews])

  // Edit handlers
  const startEdit = () => {
    setEditFields({
      title: item.title || '',
      type: item.type || 'feature',
      priority: item.priority || 3,
      plugin_key: item.plugin_key || '',
      description: item.description || '',
      goal: item.goal || '',
      background: item.background || '',
      context_notes: item.context_notes || '',
      relevant_files: item.relevant_files ? JSON.stringify(item.relevant_files, null, 2) : '',
    })
    setEditing(true)
    setEditError('')
  }

  const cancelEdit = () => {
    setEditing(false)
    setEditError('')
  }

  const saveEdit = async () => {
    setSavingEdit(true)
    setEditError('')
    try {
      let relevant_files = undefined
      if (editFields.relevant_files.trim()) {
        try {
          relevant_files = JSON.parse(editFields.relevant_files)
        } catch {
          setEditError('relevant_files ist kein gueltiges JSON-Array')
          setSavingEdit(false)
          return
        }
      }
      const body = {
        title: editFields.title,
        type: editFields.type,
        priority: Number(editFields.priority),
        plugin_key: editFields.plugin_key.trim() || null,
        description: editFields.description.trim() || null,
        goal: editFields.goal.trim() || null,
        background: editFields.background.trim() || null,
        context_notes: editFields.context_notes.trim() || null,
      }
      if (relevant_files !== undefined) body.relevant_files = relevant_files
      const res = await fetch(`/api/backlog/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error(await res.text())
      await loadItem()
      setEditing(false)
    } catch (err) {
      setEditError(err.message || 'Fehler beim Speichern')
    } finally {
      setSavingEdit(false)
    }
  }

  // Notes
  const saveNotes = async () => {
    setSavingNotes(true)
    await fetch(`/api/backlog/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notes }),
    })
    setSavingNotes(false)
    setSavedNotes(true)
    setTimeout(() => setSavedNotes(false), 2000)
  }

  // Status transitions
  const handleTransitionClick = (toStatus) => {
    if (toStatus === 'cancelled') {
      setPendingToStatus(toStatus)
      setShowCancelInput(true)
      return
    }
    doTransition(toStatus, null)
  }

  const doTransition = async (toStatus, notes) => {
    setTransitioning(true)
    setStatusError('')
    try {
      const body = { status: toStatus }
      if (notes) body.notes = notes
      const res = await fetch(`/api/backlog/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.detail || err.reason || 'Uebergang abgelehnt')
      }
      setShowCancelInput(false)
      setCancelNotes('')
      setPendingToStatus(null)
      await loadItem()
    } catch (err) {
      setStatusError(err.message)
    } finally {
      setTransitioning(false)
    }
  }

  // Dependencies
  const filteredBacklog = depSearch.trim()
    ? allBacklog.filter(b =>
        b.id !== Number(id) &&
        (b.title.toLowerCase().includes(depSearch.toLowerCase()) ||
         String(b.id).includes(depSearch))
      ).slice(0, 10)
    : []

  const addDependency = async (targetId) => {
    try {
      // depDirection: 'blocked_by' means current item is blocked by targetId
      const body = depDirection === 'blocked_by'
        ? { blocker_id: targetId, blocked_id: Number(id) }
        : { blocker_id: Number(id), blocked_id: targetId }
      const res = await fetch('/api/dependencies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error()
      setDepSearch('')
      setAddingDep(false)
      loadDeps()
    } catch {
      // silent
    }
  }

  const removeDependency = async (depId) => {
    await fetch(`/api/dependencies/${depId}`, { method: 'DELETE' })
    loadDeps()
  }

  // Reviews
  const createReview = async () => {
    setCreatingReview(true)
    try {
      await fetch(`/api/backlog/${id}/reviews`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) })
      loadReviews()
    } catch {}
    setCreatingReview(false)
  }

  if (loading) return <p className="text-center py-12" style={{ color: 'var(--subtext0)' }}>Laden...</p>
  if (!item) return <p className="text-center py-12">Item nicht gefunden</p>

  const allowedTransitions = ALLOWED_TRANSITIONS[item.status] || []

  return (
    <div className="max-w-3xl mx-auto">
      <Link to="/" className="text-sm hover:underline mb-4 inline-block" style={{ color: 'var(--blue)' }}>
        &larr; Roadmap
      </Link>

      {/* Header card */}
      <div className="rounded-xl p-6 mb-4" style={{ background: 'var(--mantle)' }}>
        <div className="flex items-start gap-3 mb-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className={`badge-p${item.priority} text-sm px-2 py-1 rounded font-mono`}>P{item.priority}</span>
              <span className="text-sm px-2 py-1 rounded" style={{ background: 'var(--surface1)' }}>{item.type}</span>
              <StatusBadge status={item.status} />
              <span className="text-sm ml-auto" style={{ color: 'var(--subtext0)' }}>#{item.id}</span>
            </div>
            {!editing && <h1 className="text-xl font-bold">{item.title}</h1>}
          </div>
          <button
            onClick={editing ? cancelEdit : startEdit}
            className="shrink-0 px-3 py-1.5 rounded-lg text-sm font-medium"
            style={{ background: 'var(--surface1)', color: 'var(--text)', minHeight: '36px' }}
          >
            {editing ? 'Abbrechen' : 'Bearbeiten'}
          </button>
        </div>

        {item.milestone && (
          <span className="text-xs px-2 py-1 rounded mr-2" style={{ background: 'var(--surface0)', color: 'var(--subtext1)' }}>
            {item.milestone}
          </span>
        )}
        {item.sprint_name && (
          <span className="text-xs px-2 py-1 rounded" style={{ background: 'var(--sapphire)', color: 'white' }}>
            {item.sprint_name}
          </span>
        )}

        {/* Edit form */}
        {editing && (
          <div className="mt-4 space-y-3 border-t pt-4" style={{ borderColor: 'var(--surface0)' }}>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--subtext0)' }}>Titel *</label>
              <input
                type="text"
                value={editFields.title}
                onChange={e => setEditFields(f => ({ ...f, title: e.target.value }))}
                className="w-full rounded-lg px-3 py-2 border-0 outline-none"
                style={{ background: 'var(--surface0)', color: 'var(--text)', fontSize: '16px' }}
              />
            </div>
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-xs font-medium mb-1" style={{ color: 'var(--subtext0)' }}>Typ</label>
                <select
                  value={editFields.type}
                  onChange={e => setEditFields(f => ({ ...f, type: e.target.value }))}
                  className="w-full rounded-lg px-3 py-2 border-0 outline-none"
                  style={{ background: 'var(--surface0)', color: 'var(--text)', fontSize: '16px' }}
                >
                  <option value="feature">Feature</option>
                  <option value="bug">Bug</option>
                  <option value="improvement">Improvement</option>
                  <option value="chore">Chore</option>
                </select>
              </div>
              <div className="w-28">
                <label className="block text-xs font-medium mb-1" style={{ color: 'var(--subtext0)' }}>Priorität</label>
                <select
                  value={editFields.priority}
                  onChange={e => setEditFields(f => ({ ...f, priority: e.target.value }))}
                  className="w-full rounded-lg px-3 py-2 border-0 outline-none"
                  style={{ background: 'var(--surface0)', color: 'var(--text)', fontSize: '16px' }}
                >
                  {[1,2,3,4,5].map(p => <option key={p} value={p}>P{p}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--subtext0)' }}>Plugin-Key</label>
              <input
                type="text"
                value={editFields.plugin_key}
                onChange={e => setEditFields(f => ({ ...f, plugin_key: e.target.value }))}
                className="w-full rounded-lg px-3 py-2 border-0 outline-none"
                style={{ background: 'var(--surface0)', color: 'var(--text)', fontSize: '16px' }}
                placeholder="z.B. sleep"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--subtext0)' }}>Beschreibung</label>
              <textarea
                value={editFields.description}
                onChange={e => setEditFields(f => ({ ...f, description: e.target.value }))}
                className="w-full rounded-lg px-3 py-2 border-0 outline-none resize-y"
                style={{ background: 'var(--surface0)', color: 'var(--text)', fontSize: '16px', minHeight: '80px' }}
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--subtext0)' }}>Goal</label>
              <textarea
                value={editFields.goal}
                onChange={e => setEditFields(f => ({ ...f, goal: e.target.value }))}
                className="w-full rounded-lg px-3 py-2 border-0 outline-none resize-y"
                style={{ background: 'var(--surface0)', color: 'var(--text)', fontSize: '16px', minHeight: '60px' }}
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--subtext0)' }}>Background</label>
              <textarea
                value={editFields.background}
                onChange={e => setEditFields(f => ({ ...f, background: e.target.value }))}
                className="w-full rounded-lg px-3 py-2 border-0 outline-none resize-y"
                style={{ background: 'var(--surface0)', color: 'var(--text)', fontSize: '16px', minHeight: '60px' }}
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--subtext0)' }}>Context Notes</label>
              <textarea
                value={editFields.context_notes}
                onChange={e => setEditFields(f => ({ ...f, context_notes: e.target.value }))}
                className="w-full rounded-lg px-3 py-2 border-0 outline-none resize-y"
                style={{ background: 'var(--surface0)', color: 'var(--text)', fontSize: '16px', minHeight: '60px' }}
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--subtext0)' }}>
                Relevant Files (JSON-Array)
              </label>
              <textarea
                value={editFields.relevant_files}
                onChange={e => setEditFields(f => ({ ...f, relevant_files: e.target.value }))}
                className="w-full rounded-lg px-3 py-2 border-0 outline-none resize-y font-mono text-xs"
                style={{ background: 'var(--surface0)', color: 'var(--text)', fontSize: '14px', minHeight: '60px' }}
                placeholder='["backend/app/...", "frontend/src/..."]'
              />
            </div>
            {editError && <p className="text-xs" style={{ color: 'var(--red)' }}>{editError}</p>}
            <button
              onClick={saveEdit}
              disabled={savingEdit}
              className="w-full py-2.5 rounded-lg text-sm font-medium text-white"
              style={{ background: 'var(--blue)', minHeight: '44px', opacity: savingEdit ? 0.7 : 1 }}
            >
              {savingEdit ? 'Speichern...' : 'Speichern'}
            </button>
          </div>
        )}
      </div>

      {/* Status transition */}
      <div className="rounded-xl p-5 mb-4" style={{ background: 'var(--mantle)' }}>
        <h2 className="font-bold text-sm mb-3" style={{ color: 'var(--subtext0)' }}>Status-Uebergang</h2>
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <span className="text-sm">Aktuell:</span>
          <StatusBadge status={item.status} />
        </div>

        {allowedTransitions.length > 0 ? (
          <div className="flex gap-2 flex-wrap">
            {allowedTransitions.map(toStatus => (
              <button
                key={toStatus}
                onClick={() => handleTransitionClick(toStatus)}
                disabled={transitioning}
                className="px-3 py-2 rounded-lg text-sm font-medium"
                style={{
                  background: toStatus === 'cancelled' ? 'var(--red)' : 'var(--blue)',
                  color: 'white',
                  minHeight: '40px',
                  opacity: transitioning ? 0.6 : 1,
                }}
              >
                {TRANSITION_LABELS[toStatus]}
              </button>
            ))}
          </div>
        ) : (
          <p className="text-xs" style={{ color: 'var(--overlay0)' }}>
            Keine PO-Uebergaenge verfuegbar (Archon-gesteuert)
          </p>
        )}

        {showCancelInput && (
          <div className="mt-3 p-3 rounded-lg" style={{ background: 'var(--base)' }}>
            <p className="text-sm font-medium mb-2" style={{ color: 'var(--red)' }}>
              Stornierungsbegruendung (Pflicht)
            </p>
            <textarea
              value={cancelNotes}
              onChange={e => setCancelNotes(e.target.value)}
              className="w-full rounded-lg px-3 py-2 border-0 outline-none resize-y mb-2"
              style={{ background: 'var(--surface0)', color: 'var(--text)', fontSize: '16px', minHeight: '80px' }}
              placeholder="Warum wird dieses Issue storniert?"
            />
            <div className="flex gap-2">
              <button
                onClick={() => { setShowCancelInput(false); setPendingToStatus(null); setCancelNotes('') }}
                className="px-3 py-2 rounded-lg text-sm"
                style={{ background: 'var(--surface1)', color: 'var(--text)', minHeight: '40px' }}
              >
                Abbrechen
              </button>
              <button
                onClick={() => doTransition(pendingToStatus, cancelNotes)}
                disabled={!cancelNotes.trim() || transitioning}
                className="px-3 py-2 rounded-lg text-sm font-medium text-white"
                style={{ background: 'var(--red)', minHeight: '40px', opacity: (!cancelNotes.trim() || transitioning) ? 0.5 : 1 }}
              >
                Stornieren
              </button>
            </div>
          </div>
        )}

        {statusError && (
          <p className="text-xs mt-2" style={{ color: 'var(--red)' }}>{statusError}</p>
        )}
      </div>

      {/* Description (read-only if not editing) */}
      {!editing && item.description && (
        <div className="rounded-xl p-5 mb-4" style={{ background: 'var(--mantle)' }}>
          <h2 className="font-bold text-sm mb-2" style={{ color: 'var(--subtext0)' }}>Beschreibung</h2>
          <p className="text-sm whitespace-pre-wrap">{item.description}</p>
        </div>
      )}

      {!editing && (item.goal || item.background || item.context_notes) && (
        <Accordion title="Goal / Background / Context">
          {item.goal && (
            <div className="mb-3">
              <h3 className="text-xs font-semibold mb-1" style={{ color: 'var(--subtext0)' }}>Goal</h3>
              <p className="text-sm whitespace-pre-wrap">{item.goal}</p>
            </div>
          )}
          {item.background && (
            <div className="mb-3">
              <h3 className="text-xs font-semibold mb-1" style={{ color: 'var(--subtext0)' }}>Background</h3>
              <p className="text-sm whitespace-pre-wrap">{item.background}</p>
            </div>
          )}
          {item.context_notes && (
            <div>
              <h3 className="text-xs font-semibold mb-1" style={{ color: 'var(--subtext0)' }}>Context Notes</h3>
              <p className="text-sm whitespace-pre-wrap">{item.context_notes}</p>
            </div>
          )}
        </Accordion>
      )}

      {/* Tasks */}
      {item.tasks?.length > 0 && (
        <div className="rounded-xl p-5 mb-4" style={{ background: 'var(--mantle)' }}>
          <h2 className="font-bold text-sm mb-3" style={{ color: 'var(--subtext0)' }}>Tasks</h2>
          <div className="space-y-2">
            {item.tasks.map(t => (
              <div key={t.id} className={`p-2 rounded text-sm status-${t.status}`} style={{ background: 'var(--base)' }}>
                <span className="font-medium">{t.title}</span>
                <span className="ml-2 text-xs" style={{ color: 'var(--subtext0)' }}>{t.status}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Dependencies */}
      <Accordion title={`Abhaengigkeiten (blockiert durch: ${deps.blocked_by?.length || 0}, blockiert: ${deps.blocks?.length || 0})`}>
        {deps.blocked_by?.length > 0 && (
          <div className="mb-3">
            <p className="text-xs font-semibold mb-1" style={{ color: 'var(--red)' }}>Blockiert durch:</p>
            {deps.blocked_by.map(d => (
              <div key={d.id} className="flex items-center gap-2 mb-1">
                <Link to={`/item/${d.blocker_id}`} className="text-sm hover:underline" style={{ color: 'var(--blue)' }}>
                  #{d.blocker_id} — {d.blocker_title || '...'}
                </Link>
                <button
                  onClick={() => removeDependency(d.id)}
                  className="text-xs px-1.5 py-0.5 rounded"
                  style={{ background: 'var(--red)', color: 'white', minHeight: '24px' }}
                >
                  x
                </button>
              </div>
            ))}
          </div>
        )}
        {deps.blocks?.length > 0 && (
          <div className="mb-3">
            <p className="text-xs font-semibold mb-1" style={{ color: 'var(--yellow)' }}>Blockiert:</p>
            {deps.blocks.map(d => (
              <div key={d.id} className="flex items-center gap-2 mb-1">
                <Link to={`/item/${d.blocked_id}`} className="text-sm hover:underline" style={{ color: 'var(--blue)' }}>
                  #{d.blocked_id} — {d.blocked_title || '...'}
                </Link>
                <button
                  onClick={() => removeDependency(d.id)}
                  className="text-xs px-1.5 py-0.5 rounded"
                  style={{ background: 'var(--red)', color: 'white', minHeight: '24px' }}
                >
                  x
                </button>
              </div>
            ))}
          </div>
        )}

        {!addingDep ? (
          <button
            onClick={() => setAddingDep(true)}
            className="text-xs px-3 py-1.5 rounded-lg font-medium"
            style={{ background: 'var(--surface1)', color: 'var(--text)', minHeight: '36px' }}
          >
            + Abhaengigkeit hinzufuegen
          </button>
        ) : (
          <div className="mt-2">
            <div className="flex gap-2 mb-2">
              <select
                value={depDirection}
                onChange={e => setDepDirection(e.target.value)}
                className="rounded-lg px-2 py-1.5 border-0 outline-none text-xs"
                style={{ background: 'var(--surface0)', color: 'var(--text)', fontSize: '14px' }}
              >
                <option value="blocked_by">Blockiert durch (anderes Item blockt dieses)</option>
                <option value="blocks">Blockiert (dieses blockiert anderes)</option>
              </select>
            </div>
            <input
              type="text"
              value={depSearch}
              onChange={e => setDepSearch(e.target.value)}
              className="w-full rounded-lg px-3 py-2 border-0 outline-none mb-2"
              style={{ background: 'var(--surface0)', color: 'var(--text)', fontSize: '16px' }}
              placeholder="Issue suchen (#ID oder Titel)..."
              autoFocus
            />
            {filteredBacklog.length > 0 && (
              <div className="rounded-lg overflow-hidden" style={{ background: 'var(--base)' }}>
                {filteredBacklog.map(b => (
                  <button
                    key={b.id}
                    onClick={() => addDependency(b.id)}
                    className="w-full text-left px-3 py-2 text-sm hover:opacity-80 border-b"
                    style={{ borderColor: 'var(--surface0)', minHeight: '40px' }}
                  >
                    #{b.id} — {b.title}
                  </button>
                ))}
              </div>
            )}
            <button
              onClick={() => { setAddingDep(false); setDepSearch('') }}
              className="mt-2 text-xs px-3 py-1.5 rounded-lg"
              style={{ background: 'var(--surface1)', color: 'var(--text)', minHeight: '32px' }}
            >
              Abbrechen
            </button>
          </div>
        )}
      </Accordion>

      {/* PO Notes */}
      <div className="rounded-xl p-5 mb-4" style={{ background: 'var(--mantle)' }}>
        <h2 className="font-bold text-sm mb-3" style={{ color: 'var(--subtext0)' }}>Meine Notizen (PO)</h2>
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          className="w-full p-3 rounded-lg text-sm border-0 resize-y"
          style={{ background: 'var(--base)', color: 'var(--text)', minHeight: '120px', fontSize: '16px' }}
          placeholder="Notizen, Hinweise, Kontext fuer den KI-Agenten..."
        />
        <div className="flex items-center gap-3 mt-3">
          <button
            onClick={saveNotes}
            disabled={savingNotes}
            className="px-4 py-2 rounded-lg text-sm font-medium text-white"
            style={{ background: 'var(--blue)', minHeight: '40px' }}
          >
            {savingNotes ? 'Speichern...' : 'Speichern'}
          </button>
          {savedNotes && <span className="text-sm" style={{ color: 'var(--green)' }}>Gespeichert</span>}
        </div>
      </div>

      {/* Review rounds */}
      <Accordion title={`Review-Runden (${reviews.length})`} defaultOpen={reviews.length > 0}>
        {reviews.map((r, idx) => (
          <div key={r.id} className="mb-3 p-3 rounded-lg" style={{ background: 'var(--base)' }}>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-semibold">Runde {reviews.length - idx}</span>
              {r.review_status && <StatusBadge status={r.review_status === 'passed' ? 'passed' : r.review_status === 'rejected' ? 'cancelled' : 'in_progress'} />}
              <span className="text-xs ml-auto" style={{ color: 'var(--overlay0)' }}>
                {r.created_at ? new Date(r.created_at).toLocaleString('de-DE') : ''}
              </span>
            </div>
            {r.notes && <p className="text-xs whitespace-pre-wrap" style={{ color: 'var(--subtext1)' }}>{r.notes}</p>}
            {r.screenshots?.length > 0 && (
              <div className="flex gap-2 mt-2 flex-wrap">
                {r.screenshots.map(s => (
                  <a key={s.id} href={`/uploads/${s.file_path}`} target="_blank" rel="noreferrer">
                    <img src={`/uploads/${s.file_path}`} alt="Screenshot" className="w-20 h-20 object-cover rounded" />
                  </a>
                ))}
              </div>
            )}
          </div>
        ))}
        <button
          onClick={createReview}
          disabled={creatingReview}
          className="text-xs px-3 py-1.5 rounded-lg font-medium mt-1"
          style={{ background: 'var(--peach)', color: 'white', minHeight: '36px', opacity: creatingReview ? 0.7 : 1 }}
        >
          {creatingReview ? '...' : '+ Neue Review-Runde'}
        </button>
      </Accordion>

      {/* Legacy feedback history */}
      {item.feedback?.length > 0 && (
        <Accordion title="Aeltere Review-Historie">
          <div className="space-y-3">
            {item.feedback.map(fb => (
              <div key={fb.id} className={`p-3 rounded-lg review-${fb.status}`}>
                <div className="flex items-center gap-2 text-xs mb-1" style={{ color: 'var(--subtext0)' }}>
                  <span className="font-semibold uppercase">{fb.status.replace('_', ' ')}</span>
                  <span>{new Date(fb.created_at).toLocaleString('de-DE')}</span>
                </div>
                {fb.comment && <p className="text-sm">{fb.comment}</p>}
                {fb.screenshots?.length > 0 && (
                  <div className="flex gap-2 mt-2 flex-wrap">
                    {fb.screenshots.map(s => (
                      <a key={s.id} href={`/uploads/${s.file_path}`} target="_blank" rel="noreferrer">
                        <img src={`/uploads/${s.file_path}`} alt="Screenshot" className="w-20 h-20 object-cover rounded" />
                      </a>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </Accordion>
      )}
    </div>
  )
}
