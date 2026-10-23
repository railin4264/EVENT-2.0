import { describe, expect, it } from 'vitest'
import { eventStructuredData, serializeStructuredData } from './event-structured-data'

const page = 'https://eventnow.example/events/abc'
const base = { _id: 'abc', title: 'Noche de jazz', date: '2027-06-01T23:00:00Z', status: 'published',
  location: { venue: 'Sala Azul', address: 'Calle Mayor 1', city: 'Madrid', countryCode: 'ES', coordinates: [-3.7, 40.4] },
  price: { amount: 18, currency: 'EUR' }, ticketUrl: 'https://tickets.example/jazz' }

describe('eventStructuredData', () => {
  it('describes an in-person event with its real place and price', () => {
    const data = eventStructuredData(base, page)!
    expect(data).toMatchObject({ '@type': 'Event', name: 'Noche de jazz', eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
      location: { '@type': 'Place', name: 'Sala Azul', geo: { latitude: 40.4, longitude: -3.7 } },
      offers: { price: 18, priceCurrency: 'EUR', url: 'https://tickets.example/jazz' } })
  })

  it('publishes nothing for private, draft or undated events', () => {
    expect(eventStructuredData({ ...base, isPrivate: true }, page)).toBeNull()
    expect(eventStructuredData({ ...base, status: 'draft' }, page)).toBeNull()
    expect(eventStructuredData({ ...base, date: undefined }, page)).toBeNull()
  })

  it('never reveals a secret address or guesses an unknown price', () => {
    expect(eventStructuredData({ ...base, isSecretLocation: true }, page)).toBeNull()
    const unknown = eventStructuredData({ ...base, price: { amount: 0, currency: 'EUR' }, paymentMode: 'external' }, page)!
    expect(unknown.offers).toEqual({ '@type': 'Offer', url: 'https://tickets.example/jazz' })
  })

  it('marks online and cancelled events', () => {
    const data = eventStructuredData({ ...base, isVirtual: true, status: 'cancelled', virtualLink: 'https://stream.example/live' }, page)!
    expect(data).toMatchObject({ eventStatus: 'https://schema.org/EventCancelled', location: { '@type': 'VirtualLocation', url: 'https://stream.example/live' } })
  })

  it('cannot be used to close the script tag', () => {
    const json = serializeStructuredData(eventStructuredData({ ...base, title: '</script><script>alert(1)</script>' }, page))
    expect(json).not.toContain('</script>')
    expect(JSON.parse(json).name).toBe('</script><script>alert(1)</script>')
  })
})
