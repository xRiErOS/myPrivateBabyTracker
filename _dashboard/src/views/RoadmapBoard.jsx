import React, { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  closestCenter,
} from '@dnd-kit/core'
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import StatusBadge from '../components/StatusBadge.jsx'
import IssueCreateModal from '../components/IssueCreateModal.jsx'
import SprintCreateModal from '../components/SprintCreateModal.jsx'

const TYPE_ICONS = { feature: 'F', bug: 'B', improvement: 'I', chore: 'C', refactor: 'R', security: 'S' }
const DONE_STATUSES = ['done', 'passed', 'cancelled']

// Toast notification
function Toast({ message, onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, 3000)
    return () => clearTimeout(t)
  }, [onDone])
  return (
    <div
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-lg text-sm font-medium text-white shadow-lg"
      style={{ background: 'var(--red)' }}
    >
      {message}
    </div>
  )
}

// Draggable issue card
function IssueCard({ item, isDragging = false }) {
  return (
    <Link
      to={`/item/${item.id}`}
      className={`block p-3 rounded-lg mb-2 transition-shadow cursor-pointer ${isDragging ? 'opacity-50' : 'hover:shadow-md'}`}
      style={{ background: 'var(--base)' }}
    >
      <div className="flex items-center gap-1.5 mb-1 flex-wrap">
        <span className={`badge-p${item.priority} text-xs px-1.5 py-0.5 rounded font-mono shrink-0`}>
          P{item.priority}
        </span>
        <span
          className="text-xs px-1.5 py-0.5 rounded font-mono shrink-0"
          style={{ background: 'var(--surface1)', color: 'var(--text)' }}
        >
          {TYPE_ICONS[item.type] || '?'}
        </span>
        <span className="text-xs ml-auto shrink-0" style={{ color: 'var(--subtext0)' }}>
          #{item.id}
        </span>
      </div>
      <p className="text-sm font-medium leading-snug line-clamp-2">{item.title}</p>
      <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
        <StatusBadge status={item.status} />
        {item.plugin_key && (
          <span
            className="text-xs px-1.5 py-0.5 rounded"
            style={{ background: 'var(--surface0)', color: 'var(--subtext1)' }}
          >
            {item.plugin_key}
          </span>
        )}
        {item.dependencies_count > 0 && (
          <span
            className="text-xs px-1.5 py-0.5 rounded"
            style={{ background: 'var(--surface0)', color: 'var(--mauve)' }}
            title={`${item.dependencies_count} Abhängigkeit(en)`}
          >
            [dep:{item.dependencies_count}]
          </span>
        )}
      </div>
    </Link>
  )
}

// Sortable wrapper
function SortableIssueCard({ item }) {
  const isDisabled = item.status === 'in_progress'
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: String(item.id),
    disabled: isDisabled,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  }

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <IssueCard item={item} />
    </div>
  )
}

// Sprint column header
function SprintHeader({ sprint, sprintCount, onReorder, onAddIssue, onRunArchon }) {
  const [archonRunning, setArchonRunning] = useState(false)
  const [archonResult, setArchonResult] = useState(null)

  const handleRunArchon = async () => {
    setArchonRunning(true)
    setArchonResult(null)
    try {
      const res = await fetch(`/api/sprints/${sprint.id}/run-archon`, { method: 'POST' })
      const data = await res.json()
      setArchonResult(data.run_id ? `run_id: ${data.run_id}` : 'Gestartet')
    } catch {
      setArchonResult('Fehler')
    } finally {
      setArchonRunning(false)
    }
    if (onRunArchon) onRunArchon()
  }

  const itemCount = sprint._itemCount || 0
  const capacityPct = sprint.capacity ? Math.min(100, Math.round((itemCount / sprint.capacity) * 100)) : null

  return (
    <div className="mb-3">
      <div className="flex items-start justify-between gap-2 mb-1">
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-sm truncate">{sprint.name}</h3>
          <div className="flex items-center gap-1.5 mt-0.5">
            <StatusBadge status={sprint.status === 'active' ? 'in_progress' : sprint.status === 'planning' ? 'new' : sprint.status} />
            <span className="text-xs" style={{ color: 'var(--subtext0)' }}>
              {sprint.done_count || 0}/{sprint.item_count || 0}
              {sprint.capacity ? ` (cap: ${sprint.capacity})` : ''}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => onReorder(sprint.id, 'up')}
            className="w-7 h-7 rounded flex items-center justify-center text-xs"
            style={{ background: 'var(--surface1)', color: 'var(--subtext0)', minHeight: '28px' }}
            title="Nach links schieben"
          >
            &larr;
          </button>
          <button
            onClick={() => onReorder(sprint.id, 'down')}
            className="w-7 h-7 rounded flex items-center justify-center text-xs"
            style={{ background: 'var(--surface1)', color: 'var(--subtext0)', minHeight: '28px' }}
            title="Nach rechts schieben"
          >
            &rarr;
          </button>
        </div>
      </div>

      {capacityPct !== null && (
        <div className="h-1.5 rounded-full overflow-hidden mb-1.5" style={{ background: 'var(--surface1)' }}>
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${capacityPct}%`,
              background: capacityPct >= 100 ? 'var(--red)' : capacityPct >= 80 ? 'var(--yellow)' : 'var(--green)',
            }}
          />
        </div>
      )}

      <div className="flex gap-1.5 flex-wrap">
        <button
          onClick={onAddIssue}
          className="text-xs px-2 py-1 rounded font-medium"
          style={{ background: 'var(--blue)', color: 'white', minHeight: '28px' }}
        >
          + Issue
        </button>
        {sprint.status !== 'cancelled' && (
          <Link
            to={`/review/${sprint.id}`}
            className="text-xs px-2 py-1 rounded font-medium"
            style={{ background: 'var(--surface1)', color: 'var(--text)', minHeight: '28px', display: 'inline-flex', alignItems: 'center' }}
          >
            Review
          </Link>
        )}
        <button
          onClick={handleRunArchon}
          disabled={archonRunning}
          className="text-xs px-2 py-1 rounded font-medium"
          style={{ background: 'var(--mauve)', color: 'white', minHeight: '28px', opacity: archonRunning ? 0.7 : 1 }}
          title="Archon-Workflow starten"
        >
          {archonRunning ? '...' : 'Archon'}
        </button>
      </div>
      {archonResult && (
        <p className="text-xs mt-1" style={{ color: 'var(--green)' }}>{archonResult}</p>
      )}
    </div>
  )
}

// Droppable column wrapper (plain div with data-column-id)
function DroppableColumn({ columnId, children, style, className }) {
  return (
    <div
      data-column-id={columnId}
      className={className}
      style={style}
    >
      {children}
    </div>
  )
}

export default function RoadmapBoard() {
  const [sprints, setSprints] = useState([])
  const [backlog, setBacklog] = useState([])
  const [loading, setLoading] = useState(true)
  const [hideCompleted, setHideCompleted] = useState(true)
  const [showCancelled, setShowCancelled] = useState(false)
  const [filterPlugin, setFilterPlugin] = useState('')
  const [filterType, setFilterType] = useState('')
  const [toast, setToast] = useState(null)
  const [activeId, setActiveId] = useState(null)

  // Modals
  const [sprintModal, setSprintModal] = useState(false)
  const [issueModal, setIssueModal] = useState({ open: false, sprintId: null })

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  )

  useEffect(() => {
    Promise.all([
      fetch('/api/sprints').then(r => r.json()),
      fetch('/api/backlog').then(r => r.json()),
    ]).then(([s, b]) => {
      setSprints(s)
      setBacklog(b)
      setLoading(false)
    })
  }, [])

  const showToast = (msg) => setToast(msg)

  // Collect distinct plugin_keys and types
  const allPluginKeys = [...new Set(backlog.map(b => b.plugin_key).filter(Boolean))].sort()
  const allTypes = [...new Set(backlog.map(b => b.type).filter(Boolean))].sort()

  // Filter logic
  const filterItem = (item) => {
    if (filterPlugin && item.plugin_key !== filterPlugin) return false
    if (filterType && item.type !== filterType) return false
    return true
  }

  // Sprints: only planning + active (not closed)
  const visibleSprints = sprints
    .filter(s => s.status === 'active' || s.status === 'planning')
    .sort((a, b) => (a.position ?? a.id) - (b.position ?? b.id))

  const completedCount = sprints.filter(s => s.status === 'closed' || s.status === 'cancelled').length

  // Group items
  const newItems = backlog.filter(b =>
    b.status === 'new' && !b.assigned_sprint && filterItem(b) &&
    (!hideCompleted || !DONE_STATUSES.includes(b.status))
  )

  const backlogItems = backlog.filter(b =>
    b.status === 'refined' && !b.assigned_sprint && filterItem(b) &&
    (!hideCompleted || !DONE_STATUSES.includes(b.status))
  )

  const cancelledItems = backlog.filter(b => b.status === 'cancelled' && filterItem(b))

  const sprintItems = {}
  for (const s of visibleSprints) {
    sprintItems[s.id] = backlog.filter(b =>
      b.assigned_sprint === s.id &&
      filterItem(b) &&
      (!hideCompleted || !DONE_STATUSES.includes(b.status))
    )
  }

  // Enrich sprints with _itemCount for capacity bar
  const enrichedSprints = visibleSprints.map(s => ({
    ...s,
    _itemCount: (sprintItems[s.id] || []).length,
  }))

  const handleReorder = async (sprintId, direction) => {
    try {
      const res = await fetch('/api/sprints/reorder', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sprint_id: sprintId, direction }),
      })
      if (!res.ok) throw new Error()
      const updated = await res.json()
      setSprints(prev => prev.map(s => {
        const u = updated.find(u => u.id === s.id)
        return u ? { ...s, position: u.position } : s
      }))
    } catch {
      showToast('Reorder fehlgeschlagen')
    }
  }

  const handleDragStart = ({ active }) => {
    setActiveId(active.id)
  }

  const handleDragEnd = async ({ active, over }) => {
    setActiveId(null)
    if (!over) return

    const draggedId = parseInt(active.id, 10)
    const draggedItem = backlog.find(b => b.id === draggedId)
    if (!draggedItem) return

    // Determine target column
    // over.id can be a column id (string) or another item id
    let targetColumnId = over.id

    // If dropped on an item, find which column it belongs to
    const overItem = backlog.find(b => String(b.id) === String(over.id))
    if (overItem) {
      if (overItem.status === 'new') targetColumnId = 'new'
      else if (overItem.status === 'refined' && !overItem.assigned_sprint) targetColumnId = 'backlog'
      else if (overItem.assigned_sprint) targetColumnId = String(overItem.assigned_sprint)
    }

    const sprintId = ['new', 'backlog'].includes(targetColumnId)
      ? null
      : parseInt(targetColumnId, 10)

    if (draggedItem.assigned_sprint === sprintId) return // No change

    // Optimistic update
    const prevBacklog = backlog
    setBacklog(prev => prev.map(b =>
      b.id === draggedId
        ? { ...b, assigned_sprint: sprintId, status: sprintId ? (b.status === 'new' ? 'refined' : b.status) : b.status }
        : b
    ))

    try {
      const res = await fetch(`/api/backlog/${draggedId}/sprint`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sprint_id: sprintId }),
      })
      if (!res.ok) throw new Error()
    } catch {
      setBacklog(prevBacklog)
      showToast('Verschieben fehlgeschlagen')
    }
  }

  const handleIssueCreated = (newIssue) => {
    setBacklog(prev => [newIssue, ...prev])
  }

  const handleSprintCreated = (newSprint) => {
    setSprints(prev => [...prev, newSprint])
  }

  const activeItem = activeId ? backlog.find(b => String(b.id) === String(activeId)) : null

  if (loading) return <p className="text-center py-12" style={{ color: 'var(--subtext0)' }}>Laden...</p>

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      {/* Top bar */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <button
          onClick={() => setSprintModal(true)}
          className="px-3 py-1.5 rounded-lg text-sm font-medium text-white"
          style={{ background: 'var(--green)', minHeight: '36px' }}
        >
          + Sprint
        </button>

        <select
          value={filterPlugin}
          onChange={e => setFilterPlugin(e.target.value)}
          className="px-3 py-1.5 rounded-lg text-sm border-0 outline-none"
          style={{ background: 'var(--surface1)', color: 'var(--text)', fontSize: '16px', minHeight: '36px' }}
        >
          <option value="">Alle Plugins</option>
          {allPluginKeys.map(k => <option key={k} value={k}>{k}</option>)}
        </select>

        <select
          value={filterType}
          onChange={e => setFilterType(e.target.value)}
          className="px-3 py-1.5 rounded-lg text-sm border-0 outline-none"
          style={{ background: 'var(--surface1)', color: 'var(--text)', fontSize: '16px', minHeight: '36px' }}
        >
          <option value="">Alle Typen</option>
          {allTypes.map(t => <option key={t} value={t}>{t}</option>)}
        </select>

        <button
          onClick={() => setHideCompleted(!hideCompleted)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
          style={{
            background: hideCompleted ? 'var(--blue)' : 'var(--surface1)',
            color: hideCompleted ? 'white' : 'var(--text)',
            minHeight: '36px',
          }}
        >
          {hideCompleted ? `Abgeschlossene ausgeblendet (${completedCount})` : 'Alle anzeigen'}
        </button>

        <span className="text-xs ml-auto" style={{ color: 'var(--subtext0)' }}>
          {enrichedSprints.length} Sprints | {backlog.length} Items gesamt
        </span>
      </div>

      {/* Board columns */}
      <div className="flex gap-4 overflow-x-auto pb-4" style={{ minHeight: 'calc(100vh - 160px)', alignItems: 'flex-start' }}>

        {/* Neu column */}
        <div className="flex-shrink-0 w-72 rounded-xl p-4" style={{ background: 'var(--mantle)' }}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-sm">Neu</h3>
            <button
              onClick={() => setIssueModal({ open: true, sprintId: null })}
              className="text-xs px-2 py-1 rounded font-medium"
              style={{ background: 'var(--blue)', color: 'white', minHeight: '28px' }}
            >
              + Issue
            </button>
          </div>
          <SortableContext items={newItems.map(i => String(i.id))} strategy={verticalListSortingStrategy}>
            {newItems.map(item => <SortableIssueCard key={item.id} item={item} />)}
            {newItems.length === 0 && (
              <p className="text-xs py-4 text-center" style={{ color: 'var(--overlay0)' }}>Leer</p>
            )}
          </SortableContext>
        </div>

        {/* Backlog column */}
        <div className="flex-shrink-0 w-72 rounded-xl p-4" style={{ background: 'var(--mantle)' }}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-sm">Backlog</h3>
            <button
              onClick={() => setIssueModal({ open: true, sprintId: null })}
              className="text-xs px-2 py-1 rounded font-medium"
              style={{ background: 'var(--blue)', color: 'white', minHeight: '28px' }}
            >
              + Issue
            </button>
          </div>
          <SortableContext items={backlogItems.map(i => String(i.id))} strategy={verticalListSortingStrategy}>
            {backlogItems.map(item => <SortableIssueCard key={item.id} item={item} />)}
            {backlogItems.length === 0 && (
              <p className="text-xs py-4 text-center" style={{ color: 'var(--overlay0)' }}>
                {filterPlugin || filterType ? 'Kein Treffer' : 'Keine verfeinerten Items'}
              </p>
            )}
          </SortableContext>
        </div>

        {/* Sprint columns */}
        {enrichedSprints.map(sprint => (
          <div
            key={sprint.id}
            className="flex-shrink-0 w-72 rounded-xl p-4"
            style={{ background: 'var(--mantle)' }}
          >
            <SprintHeader
              sprint={sprint}
              sprintCount={enrichedSprints.length}
              onReorder={handleReorder}
              onAddIssue={() => setIssueModal({ open: true, sprintId: sprint.id })}
            />
            <SortableContext
              items={(sprintItems[sprint.id] || []).map(i => String(i.id))}
              strategy={verticalListSortingStrategy}
            >
              {(sprintItems[sprint.id] || []).map(item => (
                <SortableIssueCard key={item.id} item={item} />
              ))}
              {(sprintItems[sprint.id] || []).length === 0 && (
                <p className="text-xs py-4 text-center" style={{ color: 'var(--overlay0)' }}>
                  {hideCompleted ? 'Keine offenen Items' : 'Keine Items'}
                </p>
              )}
            </SortableContext>
          </div>
        ))}

        {/* Cancelled column (collapsible) */}
        {cancelledItems.length > 0 && (
          <div className="flex-shrink-0 w-72 rounded-xl p-4" style={{ background: 'var(--mantle)', opacity: 0.75 }}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-sm" style={{ color: 'var(--subtext0)' }}>
                Storniert ({cancelledItems.length})
              </h3>
              <button
                onClick={() => setShowCancelled(!showCancelled)}
                className="text-xs px-2 py-1 rounded"
                style={{ background: 'var(--surface1)', color: 'var(--subtext0)', minHeight: '28px' }}
              >
                {showCancelled ? 'Einklappen' : 'Anzeigen'}
              </button>
            </div>
            {showCancelled && cancelledItems.map(item => (
              <IssueCard key={item.id} item={item} />
            ))}
          </div>
        )}
      </div>

      {/* Drag overlay */}
      <DragOverlay>
        {activeItem ? (
          <div className="opacity-90 rotate-1 shadow-xl">
            <IssueCard item={activeItem} />
          </div>
        ) : null}
      </DragOverlay>

      {/* Modals */}
      <SprintCreateModal
        open={sprintModal}
        onClose={() => setSprintModal(false)}
        onCreated={handleSprintCreated}
      />
      <IssueCreateModal
        open={issueModal.open}
        defaultSprintId={issueModal.sprintId}
        onClose={() => setIssueModal({ open: false, sprintId: null })}
        onCreated={handleIssueCreated}
      />

      {/* Toast */}
      {toast && <Toast message={toast} onDone={() => setToast(null)} />}
    </DndContext>
  )
}
