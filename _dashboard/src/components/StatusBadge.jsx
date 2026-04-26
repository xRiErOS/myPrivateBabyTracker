import React from 'react'

const STATUS_LABELS = {
  new: 'Neu',
  refined: 'Refined',
  planned: 'Geplant',
  in_progress: 'In Arbeit',
  to_review: 'Review',
  passed: 'Bestanden',
  done: 'Done',
  cancelled: 'Storniert',
}

const STATUS_COLORS = {
  new: '--yellow',
  refined: '--blue',
  planned: '--lavender',
  in_progress: '--peach',
  to_review: '--mauve',
  passed: '--green',
  done: '--teal',
  cancelled: '--overlay0',
}

export default function StatusBadge({ status }) {
  const label = STATUS_LABELS[status] || status
  const colorVar = STATUS_COLORS[status] || '--overlay0'

  return (
    <span
      className="inline-flex items-center font-medium text-xs rounded-full px-2 py-0.5"
      style={{ background: `var(${colorVar})`, color: 'white' }}
    >
      {label}
    </span>
  )
}
