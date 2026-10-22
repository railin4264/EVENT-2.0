const record = (value: unknown): Record<string, any> =>
  value && typeof value === 'object' && !Array.isArray(value) ? value : {}

const text = (value: unknown, fallback = '') => typeof value === 'string' ? value : fallback
const count = (value: unknown) => typeof value === 'number' && Number.isFinite(value) ? Math.max(0, value) : 0

export interface EventExportData {
  timeZone?: string
  _id: string
  title: string
  category?: string
  date?: string | Date
  location?: { address?: string; venue?: string }
  price?: { amount: number; currency: string }
  isSoloFriendly?: boolean
}

export function safeEventLink(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  try {
    const url = new URL(value)
    return ['https:', 'http:'].includes(url.protocol) && !url.username && !url.password ? url.href : undefined
  } catch {
    return undefined
  }
}

// Public events can outlive their organizer's account or have incomplete legacy fields.
export function normalizeEventDetail(value: unknown) {
  const event = record(value)
  const creator = record(event.createdBy)
  const location = record(event.location)
  const price = record(event.price)
  return {
    ...event,
    _id: text(event._id),
    title: text(event.title, 'Evento'),
    description: text(event.description),
    category: text(event.category, 'General'),
    date: text(event.date),
    createdBy: {
      ...creator,
      _id: text(creator._id),
      firstName: text(creator.firstName, 'Organizador'),
      lastName: text(creator.lastName),
      username: text(creator.username, 'organizador'),
    },
    location: { ...location, address: text(location.address), venue: text(location.venue) },
    price: { amount: count(price.amount), currency: text(price.currency, 'DOP') },
    tags: Array.isArray(event.tags) ? event.tags.filter((tag): tag is string => typeof tag === 'string') : [],
    images: Array.isArray(event.images) ? event.images.map(image => typeof image === 'string' ? image : text(record(image).url)).filter(Boolean) : [],
    accessibility: Array.isArray(event.accessibility) ? event.accessibility.filter((item): item is string => typeof item === 'string') : [],
    attendeesCount: count(event.attendeesCount),
    maxAttendees: count(event.maxAttendees),
    ticketUrl: safeEventLink(event.ticketUrl),
    virtualLink: safeEventLink(event.virtualLink),
  }
}

export function eventOccupancy(attendees: number, capacity: number) {
  return capacity > 0 ? Math.min(100, Math.max(0, attendees / capacity * 100)) : 0
}

export function eventDateLabel(value: unknown, timeZone?: string) {
  const date = new Date(typeof value === 'string' ? value : '')
  if (timeZone && !Number.isNaN(date.getTime())) {
    try { return date.toLocaleDateString('es-DO', { timeZone, timeZoneName: 'short', weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }) } catch { /* Legacy invalid zones fall back to device time. */ }
  }
  return Number.isNaN(date.getTime()) ? 'Fecha por confirmar' : date.toLocaleDateString('es-DO', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

export function eventSignInHref(eventId: string) {
  return `/login?redirect=${encodeURIComponent(`/events/${eventId}`)}`
}

export function eventMapHref(event: { isSecretLocation?: boolean; isAttending?: boolean; location?: { address?: string; venue?: string; coordinates?: unknown } }) {
  if (event.isSecretLocation && !event.isAttending) return undefined
  const coordinates = event.location?.coordinates
  if (Array.isArray(coordinates) && coordinates.length === 2 && coordinates.every(value => typeof value === 'number' && Number.isFinite(value)) &&
      Math.abs(coordinates[0]) <= 180 && Math.abs(coordinates[1]) <= 90 && coordinates.some(Boolean)) {
    return `https://www.google.com/maps/search/?api=1&query=${coordinates[1]},${coordinates[0]}`
  }
  const address = event.location?.address || event.location?.venue
  return address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}` : undefined
}
