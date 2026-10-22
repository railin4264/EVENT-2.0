import { afterEach, describe, expect, it, vi } from 'vitest'
import { createEventPayload, deviceTimeZone, eventSchedule, eventSchema } from './create-event-form'
import { COUNTRY_CODES, countryName, locationMetadata } from './country-catalog'

const valid = {
  title: 'Encuentro de fotografía', description: 'Una tarde para aprender fotografía urbana.', category: 'photography',
  date: '2027-04-15', time: '18:30', endTime: '20:30', timeZone: deviceTimeZone(),
  location: { address: 'Plaza central, Madrid, España', venue: 'Plaza central', coordinates: [-3.7038, 40.4168],
    city: 'Madrid', country: 'España', countryCode: 'ES' },
  price: { amount: 0, currency: 'EUR' }, maxAttendees: 40, isPrivate: false, tags: [],
}
afterEach(() => vi.useRealTimers())

describe('worldwide event creation', () => {
  it('includes the complete country code catalogue and translated names', () => {
    expect(COUNTRY_CODES).toHaveLength(249)
    expect(new Set(COUNTRY_CODES).size).toBe(249)
    expect(countryName('DO')).toBe('República Dominicana')
    expect(countryName('ZZ')).toBe('')
  })

  it('preserves location metadata and explicitly uses the device time zone', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-10-17T12:00:00Z'))
    const data = eventSchema.parse(valid)
    const payload = createEventPayload(data)
    expect(payload.location).toMatchObject({ city: 'Madrid', country: 'España', countryCode: 'ES', type: 'Point' })
    expect(payload.timeZone).toBe(deviceTimeZone())
    expect(payload.date).toBe(new Date('2027-04-15T18:30').toISOString())
    expect(payload.endDate).toBe(new Date('2027-04-15T20:30').toISOString())
    expect(() => createEventPayload({ ...data, timeZone: 'Invalid/Time_Zone' })).toThrow('zona')
  })

  it('requires a real destination for physical events but does not invent one for virtual events', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-10-17T12:00:00Z'))
    for (const location of [{ ...valid.location, city: '' }, { ...valid.location, countryCode: '' }, { ...valid.location, countryCode: 'ZZ' }]) {
      expect(eventSchema.safeParse({ ...valid, location }).success).toBe(false)
    }
    const virtual = eventSchema.parse({ ...valid, isVirtual: true, virtualLink: 'https://example.test/meeting', location: { address: '' } })
    expect(createEventPayload(virtual).location).toBeUndefined()
    for (const category of ['science', 'religion', 'politics', 'charity']) expect(eventSchema.safeParse({ ...valid, category }).success).toBe(true)
  })

  it('extracts structured Google metadata and clears unknown previous values', () => {
    expect(locationMetadata([
      { long_name: 'Tokyo', short_name: 'Tokyo', types: ['locality'] },
      { long_name: 'Japan', short_name: 'JP', types: ['country'] },
    ])).toEqual({ city: 'Tokyo', country: 'Japón', countryCode: 'JP' })
    expect(locationMetadata([{ long_name: 'London', short_name: 'London', types: ['postal_town'] }]))
      .toEqual({ city: 'London', country: '', countryCode: '' })
    expect(locationMetadata()).toEqual({ city: '', country: '', countryCode: '' })
  })

  it('validates calendar dates and preserves overnight end times in the device zone', () => {
    const now = new Date('2026-10-17T12:00:00Z')
    expect(() => eventSchedule({ date: '2027-02-30', time: '18:30' }, now)).toThrow()
    const schedule = eventSchedule({ date: '2027-04-15', time: '23:30', endTime: '01:30' }, now)
    expect(schedule.endDate).toBe(new Date('2027-04-16T01:30').toISOString())
    expect(Date.parse(schedule.endDate)).toBeGreaterThan(Date.parse(schedule.date))
  })

  it.runIf(deviceTimeZone() === 'America/New_York')('rejects missing DST hours instead of silently moving the event', () => {
    const now = new Date('2026-10-17T12:00:00Z')
    expect(() => eventSchedule({ date: '2027-03-14', time: '02:30' }, now)).toThrow()
    expect(() => eventSchedule({ date: '2027-03-13', time: '23:30', endTime: '02:30' }, now)).toThrow('hora final')
    const afterChange = eventSchedule({ date: '2027-03-14', time: '03:30', endTime: '05:30' }, now)
    expect(afterChange.date).toBe('2027-03-14T07:30:00.000Z')
    expect(afterChange.endDate).toBe('2027-03-14T09:30:00.000Z')
  })
})

it('creates an event in its chosen destination zone, independent of the device zone', () => {
  const now = new Date('2026-10-20T12:00:00Z')
  const madrid = eventSchedule({ date: '2027-04-15', time: '18:30', endTime: '20:30', timeZone: 'Europe/Madrid' }, now)
  expect(madrid.date).toBe('2027-04-15T16:30:00.000Z')
  expect(madrid.endDate).toBe('2027-04-15T18:30:00.000Z')
  const tokyo = eventSchedule({ date: '2027-04-15', time: '23:30', endTime: '01:30', timeZone: 'Asia/Tokyo' }, now)
  expect(tokyo.endDate).toBe('2027-04-15T16:30:00.000Z')
  expect(() => eventSchedule({ date: '2027-03-14', time: '02:30', timeZone: 'America/New_York' }, now)).toThrow('no existe')
  expect(() => eventSchedule({ date: '2027-11-07', time: '01:30', timeZone: 'America/New_York' }, now)).toThrow('se repite')
})
