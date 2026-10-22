import { describe, expect, it } from 'vitest'
import { eventDateLabel, eventOccupancy, eventSignInHref, normalizeEventDetail, safeEventLink } from './event-detail-utils'

describe('event detail compatibility', () => {
  it('renders legacy public events after an organizer account has been deleted', () => {
    const event = normalizeEventDetail({ _id: 'event', createdBy: null, tags: null, images: null, price: null, location: null })
    expect(event.createdBy.firstName).toBe('Organizador')
    expect(event.createdBy._id).toBe('')
    expect(event.tags).toEqual([])
    expect(event.images).toEqual([])
    expect(event.price).toEqual({ amount: 0, currency: 'DOP' })
    expect(event.location.address).toBe('')
  })

  it('keeps valid fields and rejects malformed arrays and numeric totals', () => {
    const event = normalizeEventDetail({ title: 'Concierto', tags: [null, 'música', {}], images: ['', null, '/poster.jpg'], attendeesCount: -2, maxAttendees: Infinity })
    expect(event.title).toBe('Concierto')
    expect(event.tags).toEqual(['música'])
    expect(event.images).toEqual(['/poster.jpg'])
    expect(event.attendeesCount).toBe(0)
    expect(event.maxAttendees).toBe(0)
  })

  it('does not divide by zero or exceed the attendance bar bounds', () => {
    expect(eventOccupancy(8, 0)).toBe(0)
    expect(eventOccupancy(12, 10)).toBe(100)
    expect(eventOccupancy(3, 10)).toBe(30)
  })

  it('uses a clear label for missing dates instead of Invalid Date', () => {
    expect(eventDateLabel(undefined)).toBe('Fecha por confirmar')
    expect(eventDateLabel('not-a-date')).toBe('Fecha por confirmar')
    expect(eventDateLabel('2026-10-23T23:00:00Z')).not.toContain('Invalid')
  })

  it('keeps visitors on the same event after sign in', () => {
    expect(eventSignInHref('abc123')).toBe('/login?redirect=%2Fevents%2Fabc123')
  })

  it('only exposes ordinary web links for tickets and livestreams', () => {
    expect(safeEventLink('javascript:alert(1)')).toBeUndefined()
    expect(safeEventLink('https://user:password@example.com/')).toBeUndefined()
    expect(safeEventLink('https://tickets.example.com/event')).toBe('https://tickets.example.com/event')
    expect(normalizeEventDetail({ virtualLink: 'data:text/html,alert(1)' }).virtualLink).toBeUndefined()
  })
})
