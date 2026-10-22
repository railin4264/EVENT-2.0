import { authPageHref, safeRedirect } from '@/lib/auth/redirect'
import { getEventTiming } from './event-phase'

const eventIdIsSafe = (value: string) => /^[a-z0-9_-]{1,128}$/i.test(value) && !['create', 'edit', 'check-in', 'undefined', 'null'].includes(value.toLowerCase())

/** An intent only restores a confirmation screen; it never authorizes attendance. */
export function eventRsvpReturnHref(eventId: string): string {
  return eventIdIsSafe(eventId) ? `/events/${eventId}?intent=rsvp` : '/events'
}

export function eventRsvpSignInHref(eventId: string): string {
  return authPageHref('/login', eventRsvpReturnHref(eventId))
}

export function readEventRsvpIntent(destination: string | null | undefined, expectedEventId?: string): { eventId: string } | null {
  const safe = safeRedirect(destination)
  const url = new URL(safe, 'https://eventnow.local')
  const match = /^\/events\/([a-z0-9_-]+)$/i.exec(url.pathname)
  if (!match || !eventIdIsSafe(match[1]) || (expectedEventId !== undefined && match[1] !== expectedEventId)) return null
  const intents = url.searchParams.getAll('intent')
  return intents.length === 1 && intents[0] === 'rsvp' ? { eventId: match[1] } : null
}

/** Recheck an authenticated GET result immediately before the existing protected POST. */
export function checkEventRsvpSnapshot(input: unknown, eventId: string, expectedPrice: 'free' | 'paid', now: number) {
  const event = input && typeof input === 'object' ? input as Record<string, unknown> : {}
  if (event._id !== eventId || event.status !== 'published') throw new Error('Este evento no está disponible para confirmar asistencia.')
  const timing = getEventTiming({ date: typeof event.date === 'string' ? event.date : null, endDate: typeof event.endDate === 'string' ? event.endDate : null, status: 'published' }, now)
  if (timing.startsAt === undefined) throw new Error('La fecha del evento debe confirmarse antes de registrar asistencia.')
  if (timing.phase === 'ended' || timing.phase === 'cancelled') throw new Error('Este evento ya no acepta nuevas confirmaciones.')
  const price = event.price && typeof event.price === 'object' ? event.price as Record<string, unknown> : {}
  const amount = price.amount
  if (typeof amount !== 'number' || !Number.isFinite(amount) || amount < 0) throw new Error('El precio no está confirmado. Revisa la información del organizador.')
  if (expectedPrice === 'free' && amount !== 0) throw new Error('El precio cambió. Revisa las opciones de entrada antes de confirmar.')
  return { amount, alreadyConfirmed: event.isAttending === true }
}
