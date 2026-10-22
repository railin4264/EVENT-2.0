export type MapTileStyle = 'dark' | 'light' | 'satellite'
const OSM_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap contributors</a>'

// Viewport-only loading; the browser keeps normal provider HTTP caching behavior.
export const MAP_TILE_OPTIONS = { keepBuffer: 0, updateWhenIdle: true, updateWhenZooming: false, detectRetina: false }

export function mapTiles(style: MapTileStyle, publicCartoKey?: string) {
  if (style === 'satellite') return {
    provider: 'esri' as const,
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics',
    className: 'eventnow-map-tiles', bg: '#090d16',
  }
  const key = publicCartoKey?.trim()
  if (key) return {
    provider: 'carto' as const,
    url: `https://basemaps.cartocdn.com/${style === 'dark' ? 'dark_all' : 'rastertiles/voyager'}/{z}/{x}/{y}.png?key=${encodeURIComponent(key)}`,
    attribution: `${OSM_ATTRIBUTION} &copy; <a href="https://carto.com/attributions" target="_blank" rel="noopener noreferrer">CARTO</a>`,
    className: 'eventnow-map-tiles', bg: style === 'dark' ? '#090d16' : '#f1f5f9',
  }
  return {
    provider: 'osm' as const,
    url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: OSM_ATTRIBUTION,
    className: `eventnow-map-tiles${style === 'dark' ? ' eventnow-map-tiles--osm-dark' : ''}`,
    bg: style === 'dark' ? '#090d16' : '#f1f5f9',
  }
}
