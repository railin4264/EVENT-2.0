import { describe, expect, it } from 'vitest'
import { mapTiles, MAP_TILE_OPTIONS } from './mapTiles'

describe('Map base-layer providers', () => {
  it('uses the official OpenStreetMap HTTPS endpoint without a CARTO key', () => {
    for (const style of ['dark', 'light'] as const) {
      const layer = mapTiles(style)
      expect(layer.provider).toBe('osm')
      expect(layer.url).toBe('https://tile.openstreetmap.org/{z}/{x}/{y}.png')
      expect(layer.attribution).toContain('OpenStreetMap contributors')
      expect(layer.attribution).toContain('https://www.openstreetmap.org/copyright')
      expect(layer.attribution).not.toContain('CARTO')
    }
  })

  it('applies dark styling only to the OSM tile layer, leaving markers and other providers untouched', () => {
    expect(mapTiles('dark').className).toContain('eventnow-map-tiles--osm-dark')
    expect(mapTiles('light').className).not.toContain('--osm-dark')
    expect(mapTiles('dark', 'public-test-key').className).not.toContain('--osm-dark')
    expect(mapTiles('satellite').className).not.toContain('--osm-dark')
  })

  it('treats a blank optional key as absent and encodes an explicitly supplied public CARTO key', () => {
    expect(mapTiles('light', '   ').provider).toBe('osm')
    const layer = mapTiles('light', 'public/test?key')
    expect(layer.provider).toBe('carto')
    expect(layer.url).toBe('https://basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png?key=public%2Ftest%3Fkey')
    expect(layer.attribution).toContain('CARTO')
    expect(mapTiles('dark', 'public-test-key').url).toContain('/dark_all/')
  })

  it('preserves the existing ESRI satellite endpoint regardless of optional CARTO configuration', () => {
    const satellite = mapTiles('satellite', 'public-test-key')
    expect(satellite.provider).toBe('esri')
    expect(satellite.url).toBe('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}')
    expect(satellite.attribution).toContain('Esri')
    expect(satellite.url).not.toContain('key=')
  })

  it('keeps viewport-only loading options and stable URLs without cache-busting or prefetch buffers', () => {
    expect(MAP_TILE_OPTIONS).toEqual({ keepBuffer: 0, updateWhenIdle: true, updateWhenZooming: false, detectRetina: false })
    expect(mapTiles('dark').url).toBe(mapTiles('dark').url)
    expect(mapTiles('dark').url).not.toContain('?')
  })
})
