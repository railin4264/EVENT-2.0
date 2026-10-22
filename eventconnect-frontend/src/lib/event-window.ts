import { getEventTiming, type EventSchedule } from '@/components/events/event-phase'

export const NEXT_PLAN_HOURS = 12
export const NEXT_PLAN_WINDOW_MS = NEXT_PLAN_HOURS * 60 * 60 * 1000

/** Rolling instants, rather than calendar days, so a plan survives midnight. */
export function isInNextPlanWindow(event: EventSchedule & { isPrivate?: boolean }, now: Date | number) {
  const current = now instanceof Date ? now.getTime() : now
  if (!Number.isFinite(current) || event.status !== 'published' || event.isPrivate) return false
  const { startsAt, endsAt, phase } = getEventTiming(event, current)
  return startsAt !== undefined && endsAt !== undefined &&
    (phase === 'upcoming' || phase === 'live') &&
    startsAt < current + NEXT_PLAN_WINDOW_MS && endsAt > current
}

export function nextPlanQuery(now: Date | number) {
  const current = now instanceof Date ? now.getTime() : now
  return { startsBefore: new Date(current + NEXT_PLAN_WINDOW_MS).toISOString() }
}
