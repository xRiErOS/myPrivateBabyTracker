import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import StatusBadge from '../components/StatusBadge.jsx'
import ArchonLogPanel from '../components/ArchonLogPanel.jsx'

const REVIEW_STATUSES = [
  { value: 'passed', label: 'Passed', bg: 'var(--green)' },
  { value: 'partially_passed', label: 'Partially', bg: 'var(--yellow)' },
  { value: 'not_passed', label: 'Not Passed', bg: 'var(--red)' },
]

function ReviewCard({ item, onUpdate }) {
  const [comment, setComment] = useState('')
  const [status, setStatus] = useState(item.review_status || 'pending')
  const [uploading, setUploading] = useState(false)
  const [screenshots, setScreenshots] = useState([])
  const [feedbackId, setFeedbackId] = useState(null)
  const [dragOver, setDragOver] = useState(false)

  // New review rounds
  const [rounds, setRounds] = useState([])
  const [showHistory, setShowHistory] = useState(false)
  const [rejectMode, setRejectMode] = useState(false)
  const [rejectText, setRejectText] = useState('')
  const [loadingRounds, setLoadingRounds] = useState(false)

  const fileRef = useRef()
  const cardRef = useRef()

  useEffect(() => {
    fetch(`/api/backlog/${item.id}`)
      .then(r => r.json())
      .then(data => {
        const latest = data.feedback?.[0]
        if (latest) {
          setFeedbackId(latest.id)
          setComment(latest.comment || '')
          setStatus(latest.status)
          setScreenshots(latest.screenshots || [])
        }
      })
  }, [item.id])

  useEffect(() => {
    setLoadingRounds(true)
    fetch(`/api/backlog/${item.id}/reviews`)
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) setRounds(data)
        setLoadingRounds(false)
      })
      .catch(() => setLoadingRounds(false))
  }, [item.id])

  const ensureFeedbackId = useCallback(async () => {
    if (feedbackId) return feedbackId
    const res = await fetch('/api/review', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ backlog_id: item.id, status: 'pending', comment }),
    })
    const data = await res.json()
    setFeedbackId(data.id)
    return data.id
  }, [feedbackId, item.id, comment])

  const saveComment = useCallback(async () => {
    if (!feedbackId) return
    await fetch(`/api/review/${feedbackId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ comment }),
    })
    onUpdate()
  }, [feedbackId, comment, onUpdate])

  const submitReview = async (newStatus) => {
    setStatus(newStatus)
    const fbId = await ensureFeedbackId()
    await fetch(`/api/review/${fbId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus, comment }),
    })
    onUpdate()
  }

  const doUpload = async (files) => {
    if (!files || files.length === 0) return
    setUploading(true)
    const fbId = await ensureFeedbackId()
    const form = new FormData()
    for (const f of files) form.append('files', f)
    const res = await fetch(`/api/review/${fbId}/screenshots`, { method: 'POST', body: form })
    const newScreenshots = await res.json()
    setScreenshots(prev => [...prev, ...newScreenshots])
    setUploading(false)
  }

  const removeScreenshot = async (screenshotId) => {
    await fetch(`/api/screenshots/${screenshotId}`, { method: 'DELETE' })
    setScreenshots(prev => prev.filter(s => s.id !== screenshotId))
  }

  const handleDragOver = (e) => { e.preventDefault(); e.stopPropagation(); setDragOver(true) }
  const handleDragLeave = (e) => { e.preventDefault(); e.stopPropagation(); setDragOver(false) }
  const handleDrop = (e) => {
    e.preventDefault(); e.stopPropagation(); setDragOver(false)
    const files = [...e.dataTransfer.files].filter(f => f.type.startsWith('image/'))
    if (files.length > 0) doUpload(files)
  }
  const handlePaste = (e) => {
    const items = e.clipboardData?.items
    if (!items) return
    const imageFiles = []
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile()
        if (file) imageFiles.push(file)
      }
    }
    if (imageFiles.length > 0) { e.preventDefault(); doUpload(imageFiles) }
  }

  const startReview = async () => {
    const res = await fetch(`/api/backlog/${item.id}/reviews`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })
    const newRound = await res.json()
    setRounds(prev => [newRound, ...prev])
  }

  const passRound = async (reviewId) => {
    await fetch(`/api/reviews/${reviewId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ review_status: 'passed' }),
    })
    setRounds(prev => prev.map(r => r.id === reviewId ? { ...r, review_status: 'passed' } : r))
    onUpdate()
  }

  const rejectRound = async (reviewId) => {
    await fetch(`/api/reviews/${reviewId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ review_status: 'rejected', notes: rejectText }),
    })
    setRounds(prev => prev.map(r => r.id === reviewId ? { ...r, review_status: 'rejected', notes: rejectText } : r))
    setRejectMode(false)
    setRejectText('')
    onUpdate()
  }

  const activeRound = rounds[0] // Most recent
  const olderRounds = rounds.slice(1)

  return (
    <div
      ref={cardRef}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onPaste={handlePaste}
      tabIndex={0}
      className={`rounded-xl p-5 mb-4 review-${status} transition-all outline-none`}
      style={{
        background: 'var(--mantle)',
        border: dragOver ? '2px dashed var(--blue)' : '2px solid transparent',
      }}
    >
      {/* Item header */}
      <div className="flex items-start gap-3 mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className={`badge-p${item.priority} text-xs px-1.5 py-0.5 rounded font-mono`}>P{item.priority}</span>
            <span className="text-xs" style={{ color: 'var(--subtext0)' }}>#{item.id}</span>
            <StatusBadge status={item.status} />
            <Link to={`/item/${item.id}`} className="text-xs hover:underline ml-auto" style={{ color: 'var(--blue)' }}>
              Details
            </Link>
          </div>
          <h3 className="font-semibold text-sm">{item.title}</h3>
          {item.description && (
            <p className="text-xs mt-1 line-clamp-2" style={{ color: 'var(--subtext0)' }}>{item.description}</p>
          )}
        </div>
      </div>

      {/* New review round section */}
      <div className="mb-4 p-3 rounded-lg" style={{ background: 'var(--base)' }}>
        <p className="text-xs font-semibold mb-2" style={{ color: 'var(--subtext0)' }}>Review-Runden</p>

        {rounds.length === 0 && (
          <button
            onClick={startReview}
            className="text-xs px-3 py-1.5 rounded-lg font-medium"
            style={{ background: 'var(--peach)', color: 'white', minHeight: '36px' }}
          >
            + Review starten
          </button>
        )}

        {activeRound && (
          <div className="mb-2">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-medium">Aktuelle Runde #{rounds.length}</span>
              {activeRound.review_status && activeRound.review_status !== 'pending' && (
                <StatusBadge status={activeRound.review_status === 'passed' ? 'passed' : 'cancelled'} />
              )}
              {(!activeRound.review_status || activeRound.review_status === 'pending') && (
                <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'var(--surface1)', color: 'var(--text)' }}>
                  Ausstehend
                </span>
              )}
            </div>

            {(!activeRound.review_status || activeRound.review_status === 'pending') && (
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => passRound(activeRound.id)}
                  className="text-xs px-3 py-1.5 rounded-lg font-medium text-white"
                  style={{ background: 'var(--green)', minHeight: '36px' }}
                >
                  Passed
                </button>
                {!rejectMode ? (
                  <button
                    onClick={() => setRejectMode(true)}
                    className="text-xs px-3 py-1.5 rounded-lg font-medium text-white"
                    style={{ background: 'var(--red)', minHeight: '36px' }}
                  >
                    Reject
                  </button>
                ) : (
                  <div className="w-full mt-2">
                    <textarea
                      value={rejectText}
                      onChange={e => setRejectText(e.target.value)}
                      className="w-full rounded-lg px-3 py-2 text-sm border-0 resize-y mb-2"
                      style={{ background: 'var(--surface0)', color: 'var(--text)', fontSize: '16px', minHeight: '80px' }}
                      placeholder="Ablehnungsbegruendung und Verbesserungshinweise..."
                      autoFocus
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => { setRejectMode(false); setRejectText('') }}
                        className="text-xs px-3 py-1.5 rounded-lg"
                        style={{ background: 'var(--surface1)', color: 'var(--text)', minHeight: '36px' }}
                      >
                        Abbrechen
                      </button>
                      <button
                        onClick={() => rejectRound(activeRound.id)}
                        disabled={!rejectText.trim()}
                        className="text-xs px-3 py-1.5 rounded-lg font-medium text-white"
                        style={{ background: 'var(--red)', minHeight: '36px', opacity: !rejectText.trim() ? 0.5 : 1 }}
                      >
                        Ablehnen
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeRound.notes && (
              <p className="text-xs mt-2 whitespace-pre-wrap" style={{ color: 'var(--subtext1)' }}>{activeRound.notes}</p>
            )}
          </div>
        )}

        {olderRounds.length > 0 && (
          <div>
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="text-xs mt-1"
              style={{ color: 'var(--blue)' }}
            >
              {showHistory ? 'Verlauf ausblenden' : `${olderRounds.length} aeltere Runde(n) anzeigen`}
            </button>
            {showHistory && olderRounds.map((r, idx) => (
              <div key={r.id} className="mt-2 p-2 rounded" style={{ background: 'var(--surface0)' }}>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-medium">Runde #{rounds.length - 1 - idx}</span>
                  {r.review_status && (
                    <StatusBadge status={r.review_status === 'passed' ? 'passed' : r.review_status === 'rejected' ? 'cancelled' : 'in_progress'} />
                  )}
                </div>
                {r.notes && <p className="text-xs" style={{ color: 'var(--subtext1)' }}>{r.notes}</p>}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Comment textarea */}
      <textarea
        value={comment}
        onChange={e => setComment(e.target.value)}
        onBlur={saveComment}
        onPaste={handlePaste}
        className="w-full p-3 rounded-lg text-sm border-0 resize-y mb-3"
        style={{ background: 'var(--base)', color: 'var(--text)', minHeight: '80px', fontSize: '16px' }}
        placeholder="Kommentar zum Review..."
      />

      {/* Screenshots */}
      {screenshots.length > 0 && (
        <div className="flex gap-2 mb-3 flex-wrap">
          {screenshots.map(s => (
            <div key={s.id} className="relative group">
              <a href={`/uploads/${s.file_path}`} target="_blank" rel="noreferrer">
                <img src={`/uploads/${s.file_path}`} alt="Screenshot" className="w-20 h-20 object-cover rounded" />
              </a>
              <button
                onClick={() => removeScreenshot(s.id)}
                className="absolute -top-1 -right-1 w-5 h-5 rounded-full text-white text-xs hidden group-hover:flex items-center justify-center"
                style={{ background: 'var(--red)' }}
              >
                x
              </button>
            </div>
          ))}
        </div>
      )}

      {dragOver && (
        <div
          className="flex items-center justify-center py-4 mb-3 rounded-lg border-2 border-dashed"
          style={{ borderColor: 'var(--blue)', background: 'color-mix(in srgb, var(--blue) 10%, transparent)' }}
        >
          <span className="text-sm font-medium" style={{ color: 'var(--blue)' }}>Bild hier ablegen</span>
        </div>
      )}

      {/* Legacy review status buttons */}
      <div className="flex items-center gap-2 flex-wrap">
        {REVIEW_STATUSES.map(rs => (
          <button
            key={rs.value}
            onClick={() => submitReview(rs.value)}
            className="px-3 py-1.5 rounded-lg text-xs font-medium text-white transition-opacity"
            style={{ background: rs.bg, opacity: status === rs.value ? 1 : 0.5, minHeight: '36px' }}
          >
            {rs.label}
          </button>
        ))}

        <button
          onClick={() => fileRef.current?.click()}
          className="px-3 py-1.5 rounded-lg text-xs font-medium"
          style={{ background: 'var(--surface1)', color: 'var(--text)', minHeight: '36px' }}
          disabled={uploading}
        >
          {uploading ? 'Upload...' : 'Screenshot'}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={e => doUpload([...e.target.files])}
        />

        <span className="text-xs ml-auto" style={{ color: 'var(--overlay0)' }}>
          Drop / Paste / Klick
        </span>
      </div>
    </div>
  )
}

export default function SprintReview() {
  const { sprintId } = useParams()
  const [sprint, setSprint] = useState(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [promptPreview, setPromptPreview] = useState(false)
  const [runId, setRunId] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitResult, setSubmitResult] = useState(null)

  const loadSprint = useCallback(() => {
    fetch(`/api/sprints/${sprintId}`)
      .then(r => r.json())
      .then(data => {
        setSprint(data)
        setLoading(false)
      })
  }, [sprintId])

  useEffect(() => { loadSprint() }, [loadSprint])

  // Load latest active archon run_id for this sprint
  useEffect(() => {
    fetch(`/api/sprints/${sprintId}/active-run`)
      .then(r => r.json())
      .then(data => { if (data?.run_id) setRunId(data.run_id) })
      .catch(() => {})
  }, [sprintId])

  const buildPrompt = () => {
    if (!sprint?.items) return ''
    const reviewed = sprint.items.filter(i => i.review_status && i.review_status !== 'pending')
    if (reviewed.length === 0) return ''
    const lines = [`Sprint-Review: ${sprint.name}`, '']
    for (const item of reviewed) {
      lines.push(`#${item.id} — ${item.title}`)
      lines.push(`Status: ${item.review_status.replace(/_/g, ' ')}`)
      if (item.review_comment) lines.push(`Kommentar: ${item.review_comment}`)
      if (item.review_notes) lines.push(`Notizen: ${item.review_notes}`)
      if (item.screenshot_files?.length > 0) {
        lines.push(`Screenshots: ${item.screenshot_files.map(f => `_dashboard/uploads/${f}`).join(', ')}`)
      }
      lines.push('')
    }
    return lines.join('\n').trim()
  }

  const copyPrompt = async () => {
    const prompt = buildPrompt()
    if (!prompt) return
    await navigator.clipboard.writeText(prompt)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const hasPendingItems = sprint?.items?.some(i =>
    !i.review_status || i.review_status === 'pending'
  )

  const submitFeedbackToArchon = async () => {
    setSubmitting(true)
    setSubmitResult(null)
    try {
      const feedbackItems = sprint.items.map(i => ({
        backlog_id: i.id,
        review_status: i.review_status || 'pending',
        comment: i.review_comment || '',
        notes: i.review_notes || '',
      }))
      const res = await fetch(`/api/sprints/${sprintId}/submit-feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ run_id: runId, feedback_items: feedbackItems }),
      })
      const data = await res.json()
      if (data.approved) {
        setSubmitResult({ type: 'success', message: 'Sprint genehmigt' })
      } else {
        setSubmitResult({ type: 'info', message: 'Feedback gesendet — Archon arbeitet an Ueberarbeitung' })
      }
    } catch (err) {
      setSubmitResult({ type: 'error', message: 'Fehler beim Senden' })
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <p className="text-center py-12" style={{ color: 'var(--subtext0)' }}>Laden...</p>
  if (!sprint) return <p>Sprint nicht gefunden</p>

  const summary = {
    total: sprint.items?.length || 0,
    passed: sprint.items?.filter(i => i.review_status === 'passed').length || 0,
    partial: sprint.items?.filter(i => i.review_status === 'partially_passed').length || 0,
    failed: sprint.items?.filter(i => i.review_status === 'not_passed').length || 0,
  }
  summary.pending = summary.total - summary.passed - summary.partial - summary.failed
  const hasReviews = summary.passed + summary.partial + summary.failed > 0
  const prompt = buildPrompt()

  return (
    <div className="max-w-3xl mx-auto">
      <Link to="/" className="text-sm hover:underline mb-4 inline-block" style={{ color: 'var(--blue)' }}>
        &larr; Roadmap
      </Link>

      {/* Header */}
      <div className="rounded-xl p-6 mb-6" style={{ background: 'var(--mantle)' }}>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold mb-2">Review: {sprint.name}</h1>
            <div className="flex gap-4 text-sm flex-wrap">
              <span>{summary.total} Items</span>
              <span style={{ color: 'var(--green)' }}>{summary.passed} passed</span>
              <span style={{ color: 'var(--yellow)' }}>{summary.partial} partial</span>
              <span style={{ color: 'var(--red)' }}>{summary.failed} failed</span>
              <span style={{ color: 'var(--overlay0)' }}>{summary.pending} pending</span>
            </div>
          </div>
          {hasReviews && (
            <div className="flex gap-2">
              <button
                onClick={() => setPromptPreview(!promptPreview)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium"
                style={{ background: 'var(--surface1)', color: 'var(--text)', minHeight: '36px' }}
              >
                {promptPreview ? 'Vorschau aus' : 'Prompt'}
              </button>
              <button
                onClick={copyPrompt}
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-white"
                style={{ background: copied ? 'var(--green)' : 'var(--peach)', minHeight: '36px' }}
              >
                {copied ? 'Kopiert' : 'Kopieren'}
              </button>
            </div>
          )}
        </div>

        {summary.total > 0 && (
          <div className="flex h-2 rounded-full overflow-hidden mt-3 gap-0.5">
            {summary.passed > 0 && <div style={{ background: 'var(--green)', flex: summary.passed }} />}
            {summary.partial > 0 && <div style={{ background: 'var(--yellow)', flex: summary.partial }} />}
            {summary.failed > 0 && <div style={{ background: 'var(--red)', flex: summary.failed }} />}
            {summary.pending > 0 && <div style={{ background: 'var(--surface1)', flex: summary.pending }} />}
          </div>
        )}
      </div>

      {promptPreview && prompt && (
        <div className="rounded-xl p-4 mb-6" style={{ background: 'var(--crust)' }}>
          <pre className="text-xs whitespace-pre-wrap font-mono" style={{ color: 'var(--text)' }}>{prompt}</pre>
        </div>
      )}

      {/* Review cards */}
      {sprint.items?.map(item => (
        <ReviewCard key={item.id} item={item} onUpdate={loadSprint} />
      ))}

      {/* Archon Live Log */}
      {runId && (
        <div className="mt-4">
          <ArchonLogPanel runId={runId} defaultOpen={false} />
        </div>
      )}

      {/* Footer: Submit to Archon */}
      <div className="rounded-xl p-5 mt-4" style={{ background: 'var(--mantle)' }}>
        <h2 className="font-bold text-sm mb-3" style={{ color: 'var(--subtext0)' }}>Feedback an Archon senden</h2>
        <div className="flex gap-3 mb-3">
          <div className="flex-1">
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--subtext0)' }}>
              Archon run_id
            </label>
            <input
              type="text"
              value={runId}
              onChange={e => setRunId(e.target.value)}
              className="w-full rounded-lg px-3 py-2 border-0 outline-none"
              style={{ background: 'var(--surface0)', color: 'var(--text)', fontSize: '16px' }}
              placeholder="run_id aus Telegram-Notify..."
            />
          </div>
        </div>

        {hasPendingItems && (
          <p className="text-xs mb-3" style={{ color: 'var(--yellow)' }}>
            Noch ausstehende Items — alle Items reviewen bevor absenden
          </p>
        )}

        <button
          onClick={submitFeedbackToArchon}
          disabled={hasPendingItems || submitting || !runId.trim()}
          className="px-4 py-2.5 rounded-lg text-sm font-medium text-white"
          style={{
            background: 'var(--peach)',
            minHeight: '44px',
            opacity: (hasPendingItems || submitting || !runId.trim()) ? 0.5 : 1,
          }}
        >
          {submitting ? 'Senden...' : 'Feedback senden'}
        </button>

        {submitResult && (
          <div
            className="mt-3 p-3 rounded-lg text-sm font-medium"
            style={{
              background: submitResult.type === 'success' ? 'color-mix(in srgb, var(--green) 15%, transparent)' :
                          submitResult.type === 'error' ? 'color-mix(in srgb, var(--red) 15%, transparent)' :
                          'color-mix(in srgb, var(--blue) 15%, transparent)',
              color: submitResult.type === 'success' ? 'var(--green)' :
                     submitResult.type === 'error' ? 'var(--red)' : 'var(--blue)',
            }}
          >
            {submitResult.message}
          </div>
        )}
      </div>
    </div>
  )
}
