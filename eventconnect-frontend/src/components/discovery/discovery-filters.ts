import { getEventPhase, type EventSchedule } from '@/components/events/event-phase'

export type MomentFilter = 'now' | 'today' | 'weekend' | 'free' | 'popular' | 'secret' | 'virtual' | null
type Filterable = EventSchedule & { price?: { amount?: number; currency?: string }; isSecretLocation?: boolean; isVirtual?: boolean }

export function validCoordinates(value: unknown): value is [number, number] {
  return Array.isArray(value) && value.length === 2 && value.every(n => typeof n === 'number' && Number.isFinite(n)) && Math.abs(value[0]) <= 180 && Math.abs(value[1]) <= 90
}

export function distanceKm(origin: { lat: number; lng: number }, coordinates: [number, number]) {
  const rad = Math.PI / 180
  const a = Math.sin((coordinates[1] - origin.lat) * rad / 2) ** 2 + Math.cos(origin.lat * rad) * Math.cos(coordinates[1] * rad) * Math.sin((coordinates[0] - origin.lng) * rad / 2) ** 2
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(Math.max(0, 1 - a)))
}

/** Calendar filters use the viewer's local calendar; live compares absolute instants. */
export function matchesMoment(event: Filterable, filter: MomentFilter, now = new Date()) {
  if (filter === 'free') return (event.price?.amount || 0) <= 0
  if (filter === 'secret') return Boolean(event.isSecretLocation)
  if (filter === 'virtual') return Boolean(event.isVirtual)
  if (filter === 'now') return getEventPhase(event, now) === 'live'
  if (filter !== 'today' && filter !== 'weekend') return true
  const start = new Date(event.date || '').getTime()
  if (!Number.isFinite(start)) return false
  const from = new Date(now); from.setHours(0, 0, 0, 0)
  const until = new Date(from)
  if (filter === 'weekend') {
    const day = from.getDay()
    from.setDate(from.getDate() + (day === 0 ? -1 : (6 - day + 7) % 7))
    until.setTime(from.getTime()); until.setDate(until.getDate() + 2)
  } else until.setDate(until.getDate() + 1)
  return start >= from.getTime() && start < until.getTime()
}

export function matchesBudget(event: Filterable, maximum: number | null, currency: string) {
  if (maximum === null) return true
  const amount = event.price?.amount || 0
  return amount <= 0 || ((event.price?.currency || 'DOP') === currency && amount <= maximum)
}
