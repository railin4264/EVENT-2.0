import { describe, expect, it } from 'vitest'
import { mapOverview, mapPoint } from './mapViewport'

describe('Map geographic views', () => {
  it('converts valid GeoJSON coordinates including zero and rejects malformed or out-of-range positions', () => {
    expect(mapPoint([0, 0])).toEqual([0, 0])
    expect(mapPoint([-70.669, -33.448])).toEqual([-33.448, -70.669])
    for (const value of [undefined, [], [0], [0, 0, 0], [181, 0], [0, 91], [NaN, 0], [0, Infinity], ['0', 0]]) expect(mapPoint(value)).toBeNull()
  })

  it('frames every event in a worldwide or country overview instead of zooming to a city center', () => {
    const points: [number, number][] = [[-33.448, -70.669], [40.7, -74], [35.68, 139.69]]
    expect(mapOverview(points, 'world', [18.48, -69.93])).toEqual({ bounds: [[-33.448, -74], [40.7, 139.69]], maxZoom: 8 })
    expect(mapOverview(points.slice(0, 1), 'country', [-33.448, -70.669])).toEqual({ bounds: [[-33.448, -70.669], [-33.448, -70.669]], maxZoom: 10 })
  })

  it('keeps a useful country/city fallback when a filter has no events and a real global fallback for world view', () => {
    expect(mapOverview([], 'world', [18.48, -69.93])).toEqual({ center: [20, 0], zoom: 2 })
    expect(mapOverview([], 'country', [-33.448, -70.669])).toEqual({ center: [-33.448, -70.669], zoom: 5 })
    expect(mapOverview([], 'city', [35.68, 139.69])).toEqual({ center: [35.68, 139.69], zoom: 11 })
  })

  it('uses the supplied approximate secret coordinates without trying to reveal or refine them', () => {
    const approximate = mapPoint([-99.12, 19.12])!
    expect(mapOverview([approximate], 'city', approximate)).toEqual({ bounds: [[19.12, -99.12], [19.12, -99.12]], maxZoom: 13 })
  })
})
