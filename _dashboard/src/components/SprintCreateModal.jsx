import React, { useState, useEffect, useCallback } from 'react'

export default function SprintCreateModal({ open, onClose, onCreated }) {
  const [name, setName] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [capacity, setCapacity] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) {
      setName('')
      setStartDate('')
      setEndDate('')
      setCapacity('')
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
    if (!name.trim()) { setError('Name ist Pflichtfeld'); return }
    setSaving(true)
    setError('')
    try {
      const body = { name: name.trim() }
      if (startDate) body.start_date = startDate
      if (endDate) body.end_date = endDate
      if (capacity) body.capacity = Number(capacity)
      const res = await fetch('/api/sprints', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error(await res.text())
      const newSprint = await res.json()
      onCreated(newSprint)
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
        <h2 className="font-bold text-base mb-4">Neuen Sprint erstellen</h2>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--subtext0)' }}>
              Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full rounded-lg px-3 py-2 border-0 outline-none"
              style={{ background: 'var(--surface0)', color: 'var(--text)', fontSize: '16px' }}
              placeholder="Sprint 21..."
              autoFocus
            />
          </div>
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--subtext0)' }}>
                Start
              </label>
              <input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="w-full rounded-lg px-3 py-2 border-0 outline-none"
                style={{ background: 'var(--surface0)', color: 'var(--text)', fontSize: '16px' }}
              />
            </div>
            <div className="flex-1">
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--subtext0)' }}>
                Ende
              </label>
              <input
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                className="w-full rounded-lg px-3 py-2 border-0 outline-none"
                style={{ background: 'var(--surface0)', color: 'var(--text)', fontSize: '16px' }}
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--subtext0)' }}>
              Kapazität (Issues)
            </label>
            <input
              type="number"
              value={capacity}
              onChange={e => setCapacity(e.target.value)}
              min="1"
              max="50"
              className="w-full rounded-lg px-3 py-2 border-0 outline-none"
              style={{ background: 'var(--surface0)', color: 'var(--text)', fontSize: '16px' }}
              placeholder="z.B. 10"
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
              style={{ background: 'var(--green)', minHeight: '44px', opacity: saving ? 0.7 : 1 }}
            >
              {saving ? 'Erstellen...' : 'Sprint erstellen'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
