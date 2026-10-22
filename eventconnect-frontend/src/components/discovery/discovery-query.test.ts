import { describe, expect, it } from 'vitest'
import { DEFAULT_CONTENT_PREFERENCES } from './ContentFilterModal'
import { discoveryQuery } from './discovery-query'

const base = { categories: [], vibe: null, preferences: DEFAULT_CONTENT_PREFERENCES, maximum: null, currency: 'DOP', moment: null, now: new Date(2026, 9, 18, 12), authenticated: false }
describe('catalogue query before pagination', () => {
  it('keeps the public default unrestricted and includes canonical and legacy names for a selected category', () => {
    expect(discoveryQuery(base)).toEqual({})
    expect(String(discoveryQuery({ ...base, categories: ['music'] }).categories).split(',')).toEqual(expect.arrayContaining(['music', 'música']))
  })
  it('does not turn an empty whitelist or an incompatible vibe/category intersection into all events', () => {
    expect(discoveryQuery({ ...base, preferences: { ...base.preferences, contentFilterMode: 'whitelist', preferredCategories: [] } }).categories).toBe('__no_match__')
    expect(discoveryQuery({ ...base, categories: ['education'], vibe: 'aventura' }).categories).toBe('__no_match__')
  })
  it('sends budget and currency together, preserves zero, and ignores invalid budgets', () => {
    expect(discoveryQuery({ ...base, maximum: 0, currency: 'USD' })).toMatchObject({ priceMax: 0, currency: 'USD' })
    for (const maximum of [-1, NaN, Infinity, 100000001]) expect(discoveryQuery({ ...base, maximum })).not.toHaveProperty('priceMax')
  })
  it('sends live, free, secret and adult preferences to the server', () => {
    expect(discoveryQuery({ ...base, moment: 'now' }).liveOnly).toBe(true)
    expect(discoveryQuery({ ...base, moment: 'free' }).freeOnly).toBe(true)
    expect(discoveryQuery({ ...base, moment: 'secret' }).secretOnly).toBe(true)
    expect(discoveryQuery({ ...base, authenticated: true }).hideAdultOnly).toBe(true)
  })
  it('uses this weekend on Sunday and sends explicit ISO bounds for the viewer calendar', () => {
    const query = discoveryQuery({ ...base, moment: 'weekend' })
    expect(new Date(String(query.startsAfter)).getTime()).toBe(new Date(2026, 9, 17).getTime())
    expect(new Date(String(query.startsBefore)).getTime()).toBe(new Date(2026, 9, 19).getTime())
    expect(String(query.startsAfter)).toMatch(/Z$/)
  })
})
