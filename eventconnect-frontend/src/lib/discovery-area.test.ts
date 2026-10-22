import { describe, expect, it } from 'vitest'
import { areaCenter, areaParams, validArea, WORLD_AREA, type DiscoveryArea } from './discovery-area'

const country: DiscoveryArea = { kind: 'country', label: 'México', country: 'México', countryCode: 'MX', lat: 23, lng: -102 }
const city: DiscoveryArea = { kind: 'city', label: 'Santiago, Chile', city: 'Santiago', country: 'Chile', countryCode: 'CL', lat: -33.448, lng: -70.669 }

describe('Discovery area contracts', () => {
  it('uses worldwide discovery without imposing a country, city or radius', () => {
    expect(areaParams(WORLD_AREA)).toEqual({})
    expect(areaCenter(WORLD_AREA)).toBeNull()
    expect(validArea({ kind: 'world', label: 'Untrusted label' })).toEqual(WORLD_AREA)
  })

  it('uses exact manual country and disambiguated city parameters instead of centroid coordinates', () => {
    expect(areaParams(country)).toEqual({ countryCode: 'MX' })
    expect(areaParams(city)).toEqual({ countryCode: 'CL', city: 'Santiago' })
    expect(areaCenter(city)).toEqual({ lat: -33.448, lng: -70.669, address: 'Santiago, Chile' })
    expect(validArea(country)).toEqual(country)
    expect(validArea(city)).toEqual(city)
  })

  it('uses a user-selected GPS radius and supports zero coordinates, without restoring GPS from storage', () => {
    const gps: DiscoveryArea = { kind: 'nearby', label: 'Cerca de ti', lat: 0, lng: 0, radius: 50 }
    expect(areaParams(gps)).toEqual({ lat: 0, lng: 0, radius: 50 })
    expect(validArea(gps)).toBeNull()
    expect(areaParams({ ...gps, source: 'map' })).toEqual({ lat: 0, lng: 0, radius: 50 })
    expect(validArea({ ...gps, source: 'map' })).toBeNull()
    expect(validArea({ ...country, lat: 0, lng: 0 })).not.toBeNull()
  })

  it('rejects invalid or ambiguous persisted places and strips unrelated stored fields', () => {
    for (const input of [null, {}, { ...city, city: '' }, { ...city, countryCode: 'CL.*' }, { ...country, countryCode: 'mx' }, { ...country, country: ' ' },
      { ...city, lat: 91 }, { ...city, lng: 181 }, { ...city, lat: NaN }, { ...city, lng: '0' }, { ...country, label: 'x'.repeat(201) }]) expect(validArea(input)).toBeNull()
    expect(validArea({ ...city, arbitrary: 'discard' })).toEqual(city)
  })
})
