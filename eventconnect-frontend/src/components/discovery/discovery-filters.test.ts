import { describe, expect, it } from 'vitest'
import { distanceKm, matchesBudget, matchesMoment, validCoordinates } from './discovery-filters'
import { formatPrice } from '@/lib/event-display'

// Calendar filters intentionally follow the viewer's local calendar. Construct
// local instants before serializing them so the tests do not depend on host TZ.
const local = (day: number, hour = 0, minute = 0, second = 0, millisecond = 0) =>
  new Date(2026, 9, day, hour, minute, second, millisecond)
const dated = (start: Date, end?: Date) => ({ date: start.toISOString(), endDate: end?.toISOString(), status: 'published' })

describe('discovery calendar and phase filters', () => {
  it('keeps the current Saturday and Sunday when today is Sunday', () => {
    const sunday = local(18, 12)
    expect(sunday.getDay()).toBe(0)
    expect(matchesMoment(dated(local(17, 18)), 'weekend', sunday)).toBe(true)
    expect(matchesMoment(dated(local(18, 23, 59)), 'weekend', sunday)).toBe(true)
    expect(matchesMoment(dated(local(24, 18)), 'weekend', sunday)).toBe(false)
  })

  it('includes Saturday midnight but excludes Friday night and Monday midnight', () => {
    const sunday = local(18, 12)
    expect(matchesMoment(dated(local(16, 23, 59, 59, 999)), 'weekend', sunday)).toBe(false)
    expect(matchesMoment(dated(local(17)), 'weekend', sunday)).toBe(true)
    expect(matchesMoment(dated(local(18, 23, 59, 59, 999)), 'weekend', sunday)).toBe(true)
    expect(matchesMoment(dated(local(19)), 'weekend', sunday)).toBe(false)
  })

  it('selects the coming weekend on weekdays instead of retaining the previous one', () => {
    const monday = local(19, 12)
    expect(monday.getDay()).toBe(1)
    expect(matchesMoment(dated(local(17, 18)), 'weekend', monday)).toBe(false)
    expect(matchesMoment(dated(local(24)), 'weekend', monday)).toBe(true)
    expect(matchesMoment(dated(local(25, 23, 59)), 'weekend', monday)).toBe(true)
    expect(matchesMoment(dated(local(26)), 'weekend', monday)).toBe(false)
  })

  it('uses an inclusive start and exclusive end for the viewer’s current day', () => {
    const now = local(18, 12)
    expect(matchesMoment(dated(local(18)), 'today', now)).toBe(true)
    expect(matchesMoment(dated(local(19)), 'today', now)).toBe(false)
    expect(matchesMoment(dated(local(17, 23, 59)), 'today', now)).toBe(false)
  })

  it('only matches an event in progress, excluding future, ended and cancelled events', () => {
    const now = local(18, 12)
    expect(matchesMoment(dated(local(18, 11), local(18, 13)), 'now', now)).toBe(true)
    expect(matchesMoment(dated(local(18, 12, 1), local(18, 14)), 'now', now)).toBe(false)
    expect(matchesMoment(dated(local(18, 10), local(18, 11)), 'now', now)).toBe(false)
    expect(matchesMoment({ ...dated(local(18, 11), local(18, 13)), status: 'cancelled' }, 'now', now)).toBe(false)
  })

  it('does not keep a completed event live at its exact end boundary', () => {
    const now = local(18, 12)
    expect(matchesMoment(dated(now, local(18, 13)), 'now', now)).toBe(true)
    expect(matchesMoment(dated(local(18, 11), now), 'now', now)).toBe(false)
    expect(matchesMoment({ date: 'invalid' }, 'now', now)).toBe(false)
    expect(matchesMoment({ date: 'invalid' }, 'weekend', now)).toBe(false)
  })
})

describe('discovery budgets and displayed amounts', () => {
  it('does not treat inexpensive USD or EUR prices as DOP without conversion', () => {
    expect(matchesBudget({ price: { amount: 25, currency: 'USD' } }, 1000, 'DOP')).toBe(false)
    expect(matchesBudget({ price: { amount: 25, currency: 'EUR' } }, 1000, 'DOP')).toBe(false)
    expect(matchesBudget({ price: { amount: 25, currency: 'USD' } }, 1000, 'USD')).toBe(true)
  })

  it('includes the exact budget boundary and excludes the next cent', () => {
    expect(matchesBudget({ price: { amount: 1000, currency: 'DOP' } }, 1000, 'DOP')).toBe(true)
    expect(matchesBudget({ price: { amount: 1000.01, currency: 'DOP' } }, 1000, 'DOP')).toBe(false)
  })

  it('includes free events in every budget without asserting a currency conversion', () => {
    expect(matchesBudget({ price: { amount: 0, currency: 'USD' } }, 0, 'DOP')).toBe(true)
    expect(matchesBudget({}, 0, 'DOP')).toBe(true)
    expect(matchesMoment({ price: { amount: 0, currency: 'EUR' } }, 'free')).toBe(true)
    expect(matchesMoment({ price: { amount: 0.01, currency: 'EUR' } }, 'free')).toBe(false)
    expect(matchesBudget({ price: { amount: 2500, currency: 'EUR' } }, null, 'DOP')).toBe(true)
  })

  it('preserves cents in the actual event currency instead of rounding to whole units', () => {
    const usd = formatPrice({ price: { amount: 25.99, currency: 'USD' } })
    expect(usd).toContain('25.99')
    expect(usd).not.toContain('RD$')
    expect(formatPrice({ price: { amount: 1000.5, currency: 'DOP' } })).toContain('1,000.50')
    expect(formatPrice({ price: { amount: 0, currency: 'USD' } })).toBe('Gratis')
  })
})

describe('discovery coordinates and distance', () => {
  it('accepts zero coordinates and valid GeoJSON range boundaries', () => {
    expect(validCoordinates([0, 0])).toBe(true)
    expect(validCoordinates([-180, -90])).toBe(true)
    expect(validCoordinates([180, 90])).toBe(true)
  })

  it.each([undefined, null, [], [0], [0, 0, 0], ['0', 0], [NaN, 0], [0, Infinity], [180.01, 0], [0, -90.01]].map(coordinates => ({ coordinates })))(
    'rejects invalid coordinate case %#', ({ coordinates }) => {
      expect(validCoordinates(coordinates)).toBe(false)
    }
  )

  it('returns an exact zero distance for identical locations, including the equator', () => {
    expect(distanceKm({ lat: 0, lng: 0 }, [0, 0])).toBe(0)
    expect(distanceKm({ lat: 18.4721, lng: -69.9192 }, [-69.9192, 18.4721])).toBe(0)
  })
})
