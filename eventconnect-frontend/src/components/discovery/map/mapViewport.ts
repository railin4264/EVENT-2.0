export type MapOverviewMode = 'world' | 'country' | 'city'
export type MapPoint = [latitude: number, longitude: number]
export type MapOverview =
  | { center: MapPoint; zoom: number }
  | { bounds: [MapPoint, MapPoint]; maxZoom: number }

export function isMapPosition(lat: unknown, lng: unknown): lat is number {
  return typeof lat === 'number' && typeof lng === 'number' &&
    Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180
}

/** API coordinates follow GeoJSON [longitude, latitude]; Leaflet uses the reverse. */
export function mapPoint(coordinates: unknown): MapPoint | null {
  if (!Array.isArray(coordinates) || coordinates.length !== 2) return null
  const [lng, lat] = coordinates
  return isMapPosition(lat, lng) ? [lat, lng] : null
}

export function mapOverview(points: MapPoint[], mode: MapOverviewMode, center: MapPoint): MapOverview {
  const valid = points.filter(([lat, lng]) => isMapPosition(lat, lng))
  if (!valid.length) {
    return { center: mode === 'world' ? [20, 0] : center, zoom: mode === 'world' ? 2 : mode === 'country' ? 5 : 11 }
  }
  const latitudes = valid.map(point => point[0])
  const longitudes = valid.map(point => point[1])
  return {
    bounds: [[Math.min(...latitudes), Math.min(...longitudes)], [Math.max(...latitudes), Math.max(...longitudes)]],
    maxZoom: mode === 'world' ? 8 : mode === 'country' ? 10 : 13,
  }
}
