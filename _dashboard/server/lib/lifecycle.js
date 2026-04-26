// lifecycle.js — ESM (matches api.js ESModule setup)
// Lifecycle state machine for backlog items

export const STATUS_COLORS = {
  new: 'yellow',
  refined: 'blue',
  planned: 'lavender',
  in_progress: 'peach',
  to_review: 'mauve',
  passed: 'green',
  done: 'teal',
  cancelled: 'overlay0',
}

/**
 * canTransition(from, to, ctx) → { allowed: boolean, reason: string }
 *
 * ctx shape:
 *   goal              string|null   — backlog.goal
 *   background        string|null   — backlog.background
 *   assigned_sprint   number|null   — backlog.assigned_sprint
 *   isArchon          boolean       — request carries valid Archon token
 *   hasPassedReview   boolean       — all feedback items passed
 *   hasRejectedReview boolean       — at least one feedback item rejected
 *   submittedToArchon boolean       — submitted_to_archon_at is set
 *   cancellationNotes string|null   — notes field when cancelling
 */
export function canTransition(from, to, ctx = {}) {
  // Wildcard: any status → cancelled
  if (to === 'cancelled') {
    if (!ctx.cancellationNotes) {
      return { allowed: false, reason: 'cancellationNotes ist Pflicht beim Abbrechen' }
    }
    return { allowed: true, reason: '' }
  }

  // Wildcard: cancelled → refined
  if (from === 'cancelled' && to === 'refined') {
    return { allowed: true, reason: '' }
  }

  // done/passed → planned (Reopen)
  if ((from === 'done' || from === 'passed') && to === 'planned') {
    return { allowed: true, reason: '' }
  }

  const transitions = {
    new: {
      refined: () => {
        if (!ctx.goal || !ctx.background) {
          return 'goal und background müssen befüllt sein'
        }
        return null
      },
    },
    refined: {
      new: () => null,
      planned: () => {
        if (ctx.assigned_sprint == null) {
          return 'assigned_sprint muss gesetzt sein'
        }
        return null
      },
    },
    planned: {
      refined: () => null,
      in_progress: () => {
        if (!ctx.isArchon) return 'Nur Archon darf in_progress starten'
        return null
      },
    },
    in_progress: {
      to_review: () => {
        if (!ctx.isArchon) return 'Nur Archon darf to_review setzen'
        return null
      },
      planned: () => {
        if (!ctx.isArchon) return 'Nur Archon darf auf planned zurücksetzen'
        return null
      },
    },
    to_review: {
      passed: () => {
        if (!ctx.hasPassedReview) return 'Review muss bestanden sein'
        return null
      },
      planned: () => {
        if (!ctx.hasRejectedReview) return 'Review muss abgelehnt worden sein'
        if (!ctx.submittedToArchon) return 'submitted_to_archon_at muss gesetzt sein'
        return null
      },
    },
    passed: {
      done: () => {
        if (!ctx.isArchon) return 'Nur Archon darf done setzen'
        return null
      },
    },
  }

  const fromMap = transitions[from]
  if (!fromMap) {
    return { allowed: false, reason: `Unbekannter Ausgangsstatus: ${from}` }
  }

  const check = fromMap[to]
  if (!check) {
    return { allowed: false, reason: `Übergang ${from} → ${to} nicht erlaubt` }
  }

  const reason = check()
  if (reason) {
    return { allowed: false, reason }
  }

  return { allowed: true, reason: '' }
}
