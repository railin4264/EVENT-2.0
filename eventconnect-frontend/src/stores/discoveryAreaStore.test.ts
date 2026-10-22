// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AREA_STORAGE_KEY, WORLD_AREA, type DiscoveryArea } from '@/lib/discovery-area'
import { useDiscoveryAreaStore } from './discoveryAreaStore'

const city: DiscoveryArea = { kind: 'city', label: 'Santiago, Chile', city: 'Santiago', country: 'Chile', countryCode: 'CL', lat: -33.448, lng: -70.669 }
const country: DiscoveryArea = { kind: 'country', label: 'México', country: 'México', countryCode: 'MX', lat: 23, lng: -102 }
const reset = () => useDiscoveryAreaStore.setState({ area: WORLD_AREA, initialized: false })

describe('Discovery area persistence', () => {
  beforeEach(() => {
    const values = new Map<string, string>()
    vi.stubGlobal('localStorage', { getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => { values.set(key, value) }, clear: () => values.clear() })
    reset()
  })
  afterEach(() => { vi.restoreAllMocks(); reset(); vi.unstubAllGlobals() })

  it('starts in Mundial and initializes only once', () => {
    expect(useDiscoveryAreaStore.getState().area).toEqual(WORLD_AREA)
    useDiscoveryAreaStore.getState().initialize()
    expect(useDiscoveryAreaStore.getState().initialized).toBe(true)
    localStorage.setItem(AREA_STORAGE_KEY, JSON.stringify(city))
    useDiscoveryAreaStore.getState().initialize()
    expect(useDiscoveryAreaStore.getState().area).toEqual(WORLD_AREA)
  })

  it.each([country, city])('restores an explicitly selected $kind with its exact identity', selection => {
    useDiscoveryAreaStore.getState().setArea(selection)
    expect(JSON.parse(localStorage.getItem(AREA_STORAGE_KEY)!)).toEqual(selection)
    reset()
    useDiscoveryAreaStore.getState().initialize()
    expect(useDiscoveryAreaStore.getState().area).toEqual(selection)
  })

  it('keeps GPS only in memory and restores Mundial after a reload', () => {
    const gps: DiscoveryArea = { kind: 'nearby', label: 'Cerca de ti', lat: 18.48, lng: -69.93, radius: 50 }
    useDiscoveryAreaStore.getState().setArea(gps)
    expect(useDiscoveryAreaStore.getState().area).toEqual(gps)
    expect(JSON.parse(localStorage.getItem(AREA_STORAGE_KEY)!)).toEqual(WORLD_AREA)
    reset()
    useDiscoveryAreaStore.getState().initialize()
    expect(useDiscoveryAreaStore.getState().area).toEqual(WORLD_AREA)
    localStorage.setItem(AREA_STORAGE_KEY, JSON.stringify(gps))
    reset()
    useDiscoveryAreaStore.getState().initialize()
    expect(useDiscoveryAreaStore.getState().area).toEqual(WORLD_AREA)
  })

  it('does not persist a map-selected nearby area as a user GPS position', () => {
    const area: DiscoveryArea = { kind: 'nearby', source: 'map', label: 'Zona explorada', lat: 0, lng: 0, radius: 50 }
    useDiscoveryAreaStore.getState().setArea(area)
    expect(useDiscoveryAreaStore.getState().area).toEqual(area)
    expect(JSON.parse(localStorage.getItem(AREA_STORAGE_KEY)!)).toEqual(WORLD_AREA)
  })

  it('falls back safely when storage is corrupt, invalid or unavailable', () => {
    for (const value of ['not-json', JSON.stringify({ ...city, countryCode: 'invalid' })]) {
      localStorage.setItem(AREA_STORAGE_KEY, value)
      reset()
      useDiscoveryAreaStore.getState().initialize()
      expect(useDiscoveryAreaStore.getState().area).toEqual(WORLD_AREA)
    }
    vi.spyOn(localStorage, 'getItem').mockImplementation(() => { throw new Error('Storage denied') })
    vi.spyOn(localStorage, 'setItem').mockImplementation(() => { throw new Error('Storage denied') })
    reset()
    expect(() => useDiscoveryAreaStore.getState().initialize()).not.toThrow()
    expect(() => useDiscoveryAreaStore.getState().setArea(city)).not.toThrow()
    expect(useDiscoveryAreaStore.getState().area).toEqual(city)
  })
})
