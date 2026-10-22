import { getEventPhase } from '@/components/events/event-phase'
import { formatEventDate } from '@/lib/event-display'

type RecordValue = Record<string, unknown>
const record = (value: unknown): RecordValue => value && typeof value === 'object' && !Array.isArray(value) ? value as RecordValue : {}
const line = (value: unknown, limit = 200) => typeof value === 'string' ? value.replace(/[\u0000-\u001f\u007f]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, limit) : ''

/** The API accepts attending and confirmed as registrations; neither proves presence. */
export function countVerifiedEventRegistrations(attendees: unknown, summary?: unknown): number | undefined {
  const confirmed = record(summary).confirmedCount
  if (typeof confirmed === 'number' && Number.isSafeInteger(confirmed) && confirmed >= 0) return confirmed
  if (!Array.isArray(attendees)) return undefined
  const unique = new Set<string>()
  for (const entry of attendees) {
    const attendee = record(entry)
    if (!['attending', 'confirmed'].includes(String(attendee.status))) continue
    const user = typeof attendee.user === 'string' ? attendee.user : record(attendee.user)._id || record(attendee.user).id
    const id = line(user)
    if (id && !['undefined', 'null'].includes(id)) unique.add(id)
  }
  return unique.size
}

/** Fail closed when public visibility is unknown. Never construct a private event link. */
export function publicEventShareUrl(input: unknown, origin: string): string | null {
  const event = record(input)
  const privacy = event.privacy || event.visibility || record(event.settings).privacy
  if ((event.isPrivate !== undefined && event.isPrivate !== false) || (privacy !== undefined && privacy !== 'public') || event.status !== 'published') return null
  if (event.isPrivate !== false && privacy !== 'public') return null
  const id = line(event._id)
  if (!id || ['undefined', 'null'].includes(id)) return null
  try {
    const base = new URL(origin)
    if (!['http:', 'https:'].includes(base.protocol) || base.username || base.password) return null
    return new URL(`/events/${encodeURIComponent(id)}`, base.origin).href
  } catch { return null }
}

function invitePrice(value: unknown, currencyValue?: unknown): string {
  const price = record(value)
  const amount = typeof value === 'number' ? value : price.amount
  if (typeof amount !== 'number' || !Number.isFinite(amount) || amount < 0 || amount > Number.MAX_SAFE_INTEGER) return 'Precio por confirmar'
  if (amount === 0) return 'Gratis'
  const currency = line(price.currency || currencyValue).toUpperCase()
  if (!/^[A-Z]{3}$/.test(currency)) return `${amount.toLocaleString('es-DO')} · moneda por confirmar`
  try { return new Intl.NumberFormat('es-DO', { style: 'currency', currency, currencyDisplay: 'code' }).format(amount) }
  catch { return `${amount.toLocaleString('es-DO')} ${currency}` }
}

function inviteDate(value: unknown, timeZoneValue: unknown): string {
  const suppliedZone = line(timeZoneValue)
  let zone = 'UTC'
  if (suppliedZone) {
    try { new Intl.DateTimeFormat('es', { timeZone: suppliedZone }).format(0); zone = suppliedZone } catch { /* Explicit UTC fallback, never a guessed event location. */ }
  }
  const dateValue = value instanceof Date ? value : typeof value === 'string' ? value : ''
  const date = new Date(dateValue)
  if (!dateValue || Number.isNaN(date.getTime())) return 'Fecha por confirmar'
  if (typeof dateValue === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
    return `${date.toLocaleDateString('es-DO', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' })} · hora por confirmar`
  }
  // ISO strings without an offset would be interpreted in the sharer's device zone.
  if (typeof dateValue === 'string' && !/(?:Z|[+-]\d{2}:?\d{2})$/i.test(dateValue)) return 'Fecha y hora por confirmar'
  const label = formatEventDate(date, zone)
  return `${label} · ${zone}${zone === 'UTC' && suppliedZone !== 'UTC' ? ' (zona del evento por confirmar)' : ''}`
}

export interface WhatsAppEventInvitation { text: string; href: string; eventUrl: string; confirmedRegistrations?: number }

/** No I/O. The caller supplies the origin and clock; this only prepares a draft. */
export function buildWhatsAppEventInvitation(input: unknown, origin: string, now: number | Date): WhatsAppEventInvitation | null {
  const event = record(input)
  const eventUrl = publicEventShareUrl(event, origin)
  if (!eventUrl || ['cancelled', 'canceled'].includes(String(event.status))) return null
  const phase = getEventPhase({ date: typeof event.date === 'string' || event.date instanceof Date ? event.date : null,
    endDate: typeof event.endDate === 'string' || event.endDate instanceof Date ? event.endDate : null,
    status: typeof event.status === 'string' ? event.status : undefined }, now)
  if (phase === 'ended' || phase === 'cancelled') return null
  const location = record(event.location)
  const secret = event.isSecretLocation === true || location.isSecret === true || event.locationVisibility === 'secret'
  const place = secret ? 'Ubicación reservada · consulta las indicaciones en EventNow'
    : event.isVirtual === true ? 'Evento virtual · instrucciones en EventNow'
    : line(location.venue || location.address || location.city, 240) || 'Lugar por confirmar'
  const confirmedRegistrations = countVerifiedEventRegistrations(event.attendees, event.attendanceSummary)
  const text = [
    '¿Armamos el coro para este evento?',
    line(event.title, 160) || 'Evento en EventNow',
    `Cuándo: ${inviteDate(event.date, event.timeZone || event.timezone)}`,
    `Dónde: ${place}`,
    `Entrada: ${invitePrice(event.price, event.currency)}`,
    ...(confirmedRegistrations ? [`Inscripciones confirmadas: ${confirmedRegistrations.toLocaleString('es-DO')}`] : []),
    eventUrl,
    'Coordinemos por aquí. Cada persona confirma su asistencia en EventNow.',
  ].join('\n')
  return { text, href: `https://wa.me/?text=${encodeURIComponent(text)}`, eventUrl, confirmedRegistrations }
}
