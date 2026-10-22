export type DiscoveryArea =
  | { kind: 'world'; label: string }
  | { kind: 'nearby'; label: string; lat: number; lng: number; radius: number; source?: 'gps' | 'map' }
  | { kind: 'city'; label: string; city: string; country: string; countryCode: string; lat: number; lng: number }
  | { kind: 'country'; label: string; country: string; countryCode: string; lat: number; lng: number }

export const WORLD_AREA: DiscoveryArea = { kind: 'world', label: 'Mundial' }
export const AREA_STORAGE_KEY = 'eventnow-discovery-area-v1'

export function validArea(value: unknown): DiscoveryArea | null {
  if (!value || typeof value !== 'object') return null
  const area = value as Record<string, unknown>
  if (area.kind === 'world') return WORLD_AREA
  // GPS is intentionally never restored from persistent browser storage.
  if (!['city', 'country'].includes(String(area.kind))) return null
  if (typeof area.label !== 'string' || !area.label.trim() || area.label.length > 200 ||
    typeof area.country !== 'string' || !area.country.trim() || area.country.length > 100 ||
    typeof area.countryCode !== 'string' || !/^[A-Z]{2}$/.test(area.countryCode) ||
    typeof area.lat !== 'number' || !Number.isFinite(area.lat) || Math.abs(area.lat) > 90 ||
    typeof area.lng !== 'number' || !Number.isFinite(area.lng) || Math.abs(area.lng) > 180 ||
    (area.kind === 'city' && (typeof area.city !== 'string' || !area.city.trim() || area.city.length > 100))) return null
  return area.kind === 'country'
    ? { kind: 'country', label: area.label, country: area.country, countryCode: area.countryCode, lat: area.lat, lng: area.lng }
    : { kind: 'city', label: area.label, city: area.city as string, country: area.country, countryCode: area.countryCode, lat: area.lat, lng: area.lng }
}

export function areaParams(area: DiscoveryArea): { countryCode?: string; city?: string; lat?: number; lng?: number; radius?: number } {
  if (area.kind === 'world') return {}
  if (area.kind === 'nearby') return { lat: area.lat, lng: area.lng, radius: area.radius }
  return { countryCode: area.countryCode, ...(area.kind === 'city' ? { city: area.city } : {}) }
}

export function areaCenter(area: DiscoveryArea) {
  return area.kind === 'world' ? null : { lat: area.lat, lng: area.lng, address: area.label }
}
