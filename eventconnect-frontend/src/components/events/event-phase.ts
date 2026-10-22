export type EventPhase = 'upcoming' | 'live' | 'ended' | 'cancelled'

export interface EventSchedule {
  date?: string | Date | null
  endDate?: string | Date | null
  status?: string
}

export const ESTIMATED_EVENT_DURATION_MS = 2 * 60 * 60 * 1000

function timestamp(value: string | Date | null | undefined) {
  if (!value) return undefined
  const time = new Date(value).getTime()
  return Number.isFinite(time) ? time : undefined
}

/**
 * Presentation convention: without a valid endDate at or after the start, estimate a
 * two-hour duration. This matches discovery's live window; it never changes an
 * event, validates attendance, or grants access. Comparisons use ISO instants,
 * so an explicit UTC offset is respected independently of the device timezone.
 */
export function getEventTiming(event: EventSchedule, now: number | Date = Date.now()) {
  const start = timestamp(event.date)
  const explicitEnd = timestamp(event.endDate)
  const hasExplicitEnd = start !== undefined && explicitEnd !== undefined && explicitEnd >= start
  const end = start === undefined ? undefined : hasExplicitEnd ? explicitEnd : start + ESTIMATED_EVENT_DURATION_MS
  const current = now instanceof Date ? now.getTime() : now
  let phase: EventPhase = 'upcoming'
  if (event.status === 'cancelled') phase = 'cancelled'
  else if (['completed', 'expired'].includes(event.status || '')) phase = 'ended'
  else if (event.status !== 'draft' && start !== undefined && end !== undefined && Number.isFinite(current)) {
    if (current >= end) phase = 'ended'
    else if (current >= start) phase = 'live'
  }
  return { phase, startsAt: start, endsAt: end, endIsEstimated: start !== undefined && !hasExplicitEnd }
}

export function getEventPhase(event: EventSchedule, now: number | Date = Date.now()): EventPhase {
  return getEventTiming(event, now).phase
}
