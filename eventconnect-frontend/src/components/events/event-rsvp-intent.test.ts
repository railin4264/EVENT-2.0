import { describe, expect, it } from 'vitest'
import { checkEventRsvpSnapshot, eventRsvpReturnHref, eventRsvpSignInHref, readEventRsvpIntent } from './event-rsvp-intent'

const now = Date.parse('2026-10-19T12:00:00Z')
const fixture = (overrides = {}) => ({ _id: 'event123', status: 'published', date: '2026-10-20T18:00:00Z', endDate: '2026-10-20T20:00:00Z', price: { amount: 0, currency: 'DOP' }, ...overrides })

describe('explicit RSVP login return intent', () => {
  it('round trips through the safe login redirect without containing an attendance action URL', () => {
    const url = new URL(eventRsvpSignInHref('event123'), 'https://eventnow.test')
    expect(url.pathname).toBe('/login')
    expect(url.searchParams.get('redirect')).toBe('/events/event123?intent=rsvp')
    expect(readEventRsvpIntent(url.searchParams.get('redirect'))).toEqual({ eventId: 'event123' })
    expect(eventRsvpReturnHref('event123')).not.toMatch(/\/(join|attend)/)
  })
  it.each(['https://other.test/events/event123?intent=rsvp', '//other.test/events/event123?intent=rsvp', '/events/create?intent=rsvp', '/events/a/b?intent=rsvp', '/events/event123?intent=join', '/events/event123?intent=rsvp&intent=delete', '/events/event123?intent=RSVP', '/events/event123', '/admin?intent=rsvp'])('ignores unsafe or unrelated intent %s', target => {
    expect(readEventRsvpIntent(target)).toBeNull()
  })
  it('binds the intent to the current event and refuses unsafe event IDs', () => {
    expect(readEventRsvpIntent('/events/event123?intent=rsvp', 'other')).toBeNull()
    expect(eventRsvpReturnHref('../admin')).toBe('/events')
    expect(eventRsvpReturnHref('undefined')).toBe('/events')
    expect(eventRsvpReturnHref('a?intent=join')).toBe('/events')
  })
})

describe('fresh RSVP snapshot checks', () => {
  it('allows a published free event and recognizes a confirmation already made elsewhere', () => {
    expect(checkEventRsvpSnapshot(fixture(), 'event123', 'free', now)).toEqual({ amount: 0, alreadyConfirmed: false })
    expect(checkEventRsvpSnapshot(fixture({ isAttending: true }), 'event123', 'free', now).alreadyConfirmed).toBe(true)
  })
  it.each(['draft', 'pending', 'rejected', 'cancelled', undefined])('does not confirm unpublished status %s', status => {
    expect(() => checkEventRsvpSnapshot(fixture({ status }), 'event123', 'free', now)).toThrow('no está disponible')
  })
  it('stops when the free event became paid, the date is invalid, or the event ended', () => {
    expect(() => checkEventRsvpSnapshot(fixture({ price: { amount: 20, currency: 'USD' } }), 'event123', 'free', now)).toThrow('El precio cambió')
    expect(() => checkEventRsvpSnapshot(fixture({ date: 'invalid' }), 'event123', 'free', now)).toThrow('fecha')
    expect(() => checkEventRsvpSnapshot(fixture({ date: '2026-10-18T12:00:00Z', endDate: '2026-10-18T14:00:00Z' }), 'event123', 'free', now)).toThrow('ya no acepta')
    expect(() => checkEventRsvpSnapshot(fixture(), 'different-event', 'free', now)).toThrow('no está disponible')
  })
  it.each([null, {}, { amount: NaN }, { amount: -1 }, { amount: '0' }])('does not infer free admission from malformed price %j', price => {
    expect(() => checkEventRsvpSnapshot(fixture({ price }), 'event123', 'free', now)).toThrow('precio no está confirmado')
  })
})
