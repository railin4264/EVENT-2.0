import { describe, expect, it } from 'vitest'
import { distanceKm, filterEvents, isLive } from './discovery-utils'
import type { Event } from '@/types/models'

const event = (id: string, date: Date, overrides: Partial<Event> = {}): Event => ({
  _id: id, title: 'Concierto', description: 'Música en vivo', category: 'music', date,
  location: { type: 'Point', coordinates: [-69.93, 18.48], address: 'Santo Domingo' },
  images: [], attendees: [], createdBy: 'host', status: 'published', isPrivate: false,
  tags: [], createdAt: date, updatedAt: date, ...overrides,
})
const defaults = { category: '', date: '', query: '', sort: 'soon', location: null }

describe('event discovery', () => {
  it('limits a weekend filter to Saturday and Sunday instead of including weekdays', () => {
    const now = new Date(2026, 9, 7, 12)
    const events = [event('wed', now), event('sat', new Date(2026, 9, 10, 18)), event('sun', new Date(2026, 9, 11, 18)), event('mon', new Date(2026, 9, 12, 18))]
    expect(filterEvents(events, { ...defaults, date: 'weekend' }, now).map(e => e._id)).toEqual(['sat', 'sun'])
  })
  it('keeps the current Sunday in the weekend filter', () => {
    const now = new Date(2026, 9, 11, 12)
    const events = [event('today', new Date(2026, 9, 11, 18)), event('next', new Date(2026, 9, 17, 18))]
    expect(filterEvents(events, { ...defaults, date: 'weekend' }, now).map(e => e._id)).toEqual(['today'])
  })
  it('does not call a future event live', () => {
    const now = new Date(2026, 9, 9, 12)
    expect(isLive(event('future', new Date(2026, 9, 9, 13)), now)).toBe(false)
    expect(isLive(event('live', new Date(2026, 9, 9, 11)), now)).toBe(true)
    expect(isLive(event('ended', new Date(2026, 9, 9, 8)), now)).toBe(false)
  })
  it('honors an explicit end date and a cancellation', () => {
    const now = new Date(2026, 9, 9, 12)
    expect(isLive(event('ended', new Date(2026, 9, 9, 11), { endDate: new Date(2026, 9, 9, 11, 30) }), now)).toBe(false)
    expect(isLive(event('cancelled', new Date(2026, 9, 9, 11), { status: 'cancelled' }), now)).toBe(false)
  })
  it('filters categories, text, and non-public records without mutating the source array', () => {
    const date = new Date(2026, 9, 10)
    const events = [event('music', date), event('sports', date, { category: 'sports' }), event('private', date, { isPrivate: true }), event('draft', date, { status: 'draft' })]
    const before = JSON.stringify(events)
    expect(filterEvents(events, { ...defaults, query: 'SANTO DOMINGO', category: 'music' }).map(e => e._id)).toEqual(['music'])
    expect(JSON.stringify(events)).toBe(before)
  })
  it('sorts by actual attendance and never mutates API event objects with distance data', () => {
    const date = new Date(2026, 9, 10)
    const events = [event('small', date, { attendeesCount: 2 }), event('large', date, { attendeesCount: 20 })]
    expect(filterEvents(events, { ...defaults, sort: 'popular' }).map(e => e._id)).toEqual(['large', 'small'])
    expect(distanceKm({ lat: 18.48, lng: -69.93 }, events[0])).toBe(0)
    expect(events[0]).not.toHaveProperty('_distance')
  })
  it('filters out political and religious events when restriction toggles are active', () => {
    const date = new Date(2026, 9, 10)
    const events = [
      event('ev-music', date, { category: 'music' }),
      event('ev-politics', date, { category: 'politics' }),
      event('ev-religion', date, { category: 'religion' }),
      event('ev-art', date, { category: 'art' }),
    ]
    // Hide political only
    const withoutPolitics = filterEvents(events, { ...defaults, hidePolitical: true })
    expect(withoutPolitics.map(e => e._id)).toEqual(['ev-music', 'ev-religion', 'ev-art'])

    // Hide religious only
    const withoutReligion = filterEvents(events, { ...defaults, hideReligious: true })
    expect(withoutReligion.map(e => e._id)).toEqual(['ev-music', 'ev-politics', 'ev-art'])

    // Hide both
    const neutral = filterEvents(events, { ...defaults, hidePolitical: true, hideReligious: true })
    expect(neutral.map(e => e._id)).toEqual(['ev-music', 'ev-art'])
  })
  it('respects whitelist and custom hidden category filters', () => {
    const date = new Date(2026, 9, 10)
    const events = [
      event('ev-music', date, { category: 'music' }),
      event('ev-sports', date, { category: 'sports' }),
      event('ev-food', date, { category: 'food' }),
    ]
    // Blacklist custom category
    const withoutSports = filterEvents(events, { ...defaults, hiddenCategories: ['sports'] })
    expect(withoutSports.map(e => e._id)).toEqual(['ev-music', 'ev-food'])

    // Whitelist only
    const onlyMusicAndFood = filterEvents(events, {
      ...defaults,
      contentFilterMode: 'whitelist',
      preferredCategories: ['music', 'food']
    })
    expect(onlyMusicAndFood.map(e => e._id)).toEqual(['ev-music', 'ev-food'])
  })
})
