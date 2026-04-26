import React, { useState, useEffect, useCallback } from 'react'

export default function IssueCreateModal({ open, onClose, onCreated, defaultSprintId }) {
  const [title, setTitle] = useState('')
  const [type, setType] = useState('feature')
  const [pluginKey, setPluginKey] = useState('')
  const [priority, setPriority] = useState(3)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) {
      setTitle('')
      setType('feature')
      setPluginKey('')
      setPriority(3)
      setError('')
    }
  }, [open])

  const handleEsc = useCallback((e) => {
    if (e.key === 'Escape') onClose()
  }, [onClose])

  useEffect(() => {
    if (open) document.addEventListener('keydown', handleEsc)
    return () => document.removeEventListener('keydown', handleEsc)
  }, [open, handleEsc])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!title.trim()) { setError('Titel ist Pflichtfeld'); return }
    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/backlog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          type,
          priority: Number(priority),
          plugin_key: pluginKey.trim() || null,
          status: 'new',
          assigned_sprint: defaultSprintId || null,
        }),
      })
      if (!res.ok) throw new Error(await res.text())
      const newIssue = await res.json()
      onCreated(newIssue)
      onClose()
    } catch (err) {
      setError(err.message || 'Fehler beim Erstellen')
    } finally {
      setSaving(false)
    }
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.5)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="rounded-xl p-6 w-full max-w-md shadow-xl"
        style={{ background: 'var(--base)' }}
      >
        <h2 className="font-bold text-base mb-4">Neues Issue erstellen</h2>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--subtext0)' }}>
              Titel *
            </label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="w-full rounded-lg px-3 py-2 text-base border-0 outline-none"
              style={{ background: 'var(--surface0)', color: 'var(--text)', fontSize: '16px' }}
              placeholder="Issue-Titel..."
              autoFocus
            />
          </div>
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--subtext0)' }}>
                Typ
              </label>
              <select
                value={type}
                onChange={e => setType(e.target.value)}
                className="w-full rounded-lg px-3 py-2 border-0 outline-none"
                style={{ background: 'var(--surface0)', color: 'var(--text)', fontSize: '16px' }}
              >
                <option value="feature">Feature</option>
                <option value="bug">Bug</option>
                <option value="improvement">Improvement</option>
                <option value="chore">Core/Chore</option>
              </select>
            </div>
            <div className="w-28">
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--subtext0)' }}>
                Priorität
              </label>
              <select
                value={priority}
                onChange={e => setPriority(e.target.value)}
                className="w-full rounded-lg px-3 py-2 border-0 outline-none"
                style={{ background: 'var(--surface0)', color: 'var(--text)', fontSize: '16px' }}
              >
                {[1,2,3,4,5].map(p => <option key={p} value={p}>P{p}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--subtext0)' }}>
              Plugin-Key (optional)
            </label>
            <input
              type="text"
              value={pluginKey}
              onChange={e => setPluginKey(e.target.value)}
              className="w-full rounded-lg px-3 py-2 border-0 outline-none"
              style={{ background: 'var(--surface0)', color: 'var(--text)', fontSize: '16px' }}
              placeholder="z.B. sleep, feeding..."
            />
          </div>
          {error && <p className="text-xs" style={{ color: 'var(--red)' }}>{error}</p>}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-lg text-sm font-medium"
              style={{ background: 'var(--surface1)', color: 'var(--text)', minHeight: '44px' }}
            >
              Abbrechen
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-2.5 rounded-lg text-sm font-medium text-white"
              style={{ background: 'var(--blue)', minHeight: '44px', opacity: saving ? 0.7 : 1 }}
            >
              {saving ? 'Erstellen...' : 'Issue erstellen'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
