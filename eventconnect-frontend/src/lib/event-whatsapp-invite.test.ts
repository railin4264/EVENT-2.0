import { describe, expect, it } from 'vitest'
import { buildWhatsAppEventInvitation, countVerifiedEventRegistrations, publicEventShareUrl } from './event-whatsapp-invite'

const now = Date.parse('2026-10-19T12:00:00Z')
const event = (overrides: any = {}) => ({
  _id: 'event-1', title: 'Café & Jazz #1 🥁', isPrivate: false, status: 'published',
  date: '2026-10-22T22:00:00Z', endDate: '2026-10-23T00:00:00Z', timeZone: 'America/Santo_Domingo',
  price: { amount: 12.5, currency: 'USD' }, location: { venue: 'Teatro central', address: 'Calle 12', coordinates: [-69.9, 18.4] },
  ...overrides,
})
const build = (data = event()) => buildWhatsAppEventInvitation(data, 'https://eventnow.test', now)

describe('WhatsApp event draft', () => {
  it('uses the server total when private profiles are omitted', () => {
    const result = build(event({ attendees: [{ user: null, status: 'confirmed' }], attendanceSummary: { confirmedCount: 3 } }))!
    expect(result.confirmedRegistrations).toBe(3)
    expect(result.text).toContain('Inscripciones confirmadas: 3')
    expect(countVerifiedEventRegistrations([], { confirmedCount: -1 })).toBe(0)
  })
  it('prepares a draft with real title, event timezone, currency and public place', () => {
    const result = build()!
    expect(result.text).toContain('Café & Jazz #1 🥁')
    expect(result.text).toContain('America/Santo_Domingo')
    expect(result.text).toContain(new Date('2026-10-22T22:00:00Z').toLocaleTimeString('es-DO', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Santo_Domingo' }))
    expect(result.text).toMatch(/USD\s*12\.50/)
    expect(result.text).toContain('Teatro central')
    expect(result.text).toContain('Cada persona confirma su asistencia en EventNow')
    expect(result.eventUrl).toBe('https://eventnow.test/events/event-1')
  })
  it('encodes Unicode, ampersands, hashtags and newlines as a single text parameter', () => {
    const result = build()!
    const url = new URL(result.href)
    expect(url.origin).toBe('https://wa.me')
    expect([...url.searchParams.keys()]).toEqual(['text'])
    expect(url.searchParams.get('text')).toBe(result.text)
    expect(url.hash).toBe('')
    expect(result.href).not.toContain('Café &')
  })
  it.each([{ isPrivate: true }, { privacy: 'private' }, { visibility: 'secret' }, { isPrivate: undefined }, { isPrivate: 'true' }, { status: 'draft' }, { status: 'pending' }, { status: 'rejected' }, { status: undefined }])('does not expose any data when privacy/publication is unsafe: %j', override => {
    expect(build(event(override))).toBeNull()
    expect(publicEventShareUrl(event(override), 'https://eventnow.test')).toBeNull()
  })
  it('never invites to cancelled or finished events', () => {
    expect(build(event({ status: 'cancelled' }))).toBeNull()
    expect(build(event({ status: 'completed' }))).toBeNull()
    expect(build(event({ date: '2026-10-18T12:00:00Z', endDate: '2026-10-18T14:00:00Z' }))).toBeNull()
  })
  it('redacts a secret location even when its precise address has been revealed to the sharer', () => {
    const result = build(event({ isSecretLocation: true, isAttending: true, description: 'Calle secreta 999', location: { venue: 'Casa confidencial', address: 'Calle secreta 999', coordinates: [-69.987654, 18.876543] } }))!
    expect(result.text).toContain('Ubicación reservada')
    expect(result.text).not.toMatch(/Casa confidencial|Calle secreta|69\.987654|18\.876543/)
    expect(decodeURIComponent(result.href)).not.toContain('Calle secreta')
  })
  it('keeps virtual meeting credentials out of the invitation', () => {
    const result = build(event({ isVirtual: true, virtualLink: 'https://meeting.test/secret-password', location: { address: 'Private room code' } }))!
    expect(result.text).toContain('Evento virtual')
    expect(result.text).not.toMatch(/secret-password|Private room code/)
  })
  it('omits opaque totals and includes only unique confirmed/attending registrations without claiming physical presence', () => {
    expect(build(event({ attendeesCount: 9999 }))!.text).not.toContain('9999')
    const result = build(event({ attendees: [
      { user: 'a', status: 'confirmed' }, { user: { _id: 'a' }, status: 'attending' },
      { user: 'b', status: 'attending' }, { user: 'pending', status: 'pending' },
      { user: 'maybe', status: 'maybe' }, { user: 'cancelled', status: 'not-attending' },
      { user: '', status: 'confirmed' }, { status: 'confirmed' },
    ] }))!
    expect(result.confirmedRegistrations).toBe(2)
    expect(result.text).toContain('Inscripciones confirmadas: 2')
    expect(result.text).not.toMatch(/ya están|allí|personas aquí|presencia|check.?in/i)
    expect(countVerifiedEventRegistrations(undefined)).toBeUndefined()
    expect(countVerifiedEventRegistrations(100)).toBeUndefined()
    expect(countVerifiedEventRegistrations([])).toBe(0)
  })
  it('handles free, fractional and invalid prices without inventing a currency or free admission', () => {
    expect(build(event({ price: { amount: 0, currency: 'DOP' } }))!.text).toContain('Entrada: Gratis')
    expect(build(event({ price: { amount: 0.99, currency: 'EUR' } }))!.text).toMatch(/EUR\s*0\.99/)
    for (const amount of [NaN, Infinity, -1, '20', null]) {
      expect(build(event({ price: { amount, currency: 'DOP' } }))!.text).toContain('Precio por confirmar')
    }
    expect(build(event({ price: { amount: 25 } }))!.text).toContain('moneda por confirmar')
    expect(build(event({ price: undefined }))!.text).not.toContain('Gratis')
  })
  it('uses the supplied IANA timezone through DST, and labels UTC fallback explicitly', () => {
    const summer = build(event({ date: '2027-07-01T18:00:00Z', endDate: undefined, timeZone: 'America/New_York' }))!
    expect(summer.text).toContain(new Date('2027-07-01T18:00:00Z').toLocaleTimeString('es-DO', { hour: '2-digit', minute: '2-digit', timeZone: 'America/New_York' }))
    const fallback = build(event({ timeZone: 'invalid/zone' }))!
    expect(fallback.text).toContain('UTC (zona del evento por confirmar)')
    expect(build(event({ date: 'not-a-date' }))!.text).toContain('Fecha por confirmar')
    expect(build(event({ date: '2026-10-22' }))!.text).toContain('hora por confirmar')
  })
  it('uses a clean public origin and an encoded event path, rejecting unusable IDs/origins', () => {
    expect(publicEventShareUrl(event({ _id: 'a/b?token=x#y' }), 'https://eventnow.test/?secret=token')).toBe('https://eventnow.test/events/a%2Fb%3Ftoken%3Dx%23y')
    expect(publicEventShareUrl(event({ _id: undefined }), 'https://eventnow.test')).toBeNull()
    expect(publicEventShareUrl(event(), 'javascript:alert(1)')).toBeNull()
    expect(publicEventShareUrl(event(), 'https://user:password@eventnow.test')).toBeNull()
  })
})
