'use client'

import { useEffect, useCallback } from 'react'
import { create } from 'zustand'
import { apiClient } from '@/lib/api/client'

export interface LiveLocationData {
  lat: number
  lng: number
  accuracy?: number
  city: string
  country: string
  countryCode: string
  address: string
  venue?: string
  source: 'gps' | 'manual' | 'cached' | 'default'
  lastUpdated: number
}

export interface VenuePreset {
  id: string
  name: string
  venue: string
  address: string
  city: string
  country: string
  countryCode: string
  lat: number
  lng: number
  categoryHint?: string
}

export const RD_VENUE_PRESETS: VenuePreset[] = [
  {
    id: 'sdq-zona-colonial',
    name: 'Zona Colonial · Plaza España',
    venue: 'Plaza España, Zona Colonial',
    address: 'Calle Las Damas, Zona Colonial, Santo Domingo, República Dominicana',
    city: 'Santo Domingo',
    country: 'República Dominicana',
    countryCode: 'DO',
    lat: 18.4765,
    lng: -69.8825,
    categoryHint: 'culture'
  },
  {
    id: 'sdq-piantini',
    name: 'Piantini / BlueMall · Distrito Nacional',
    venue: 'Distrito Financiero Piantini',
    address: 'Av. Winston Churchill, Piantini, Santo Domingo, República Dominicana',
    city: 'Santo Domingo',
    country: 'República Dominicana',
    countryCode: 'DO',
    lat: 18.4722,
    lng: -69.9405,
    categoryHint: 'business'
  },
  {
    id: 'sdq-malecon',
    name: 'Malecón de Santo Domingo · Güibia',
    venue: 'Malecón de Santo Domingo',
    address: 'Av. George Washington, Santo Domingo, República Dominicana',
    city: 'Santo Domingo',
    country: 'República Dominicana',
    countryCode: 'DO',
    lat: 18.4631,
    lng: -69.9047,
    categoryHint: 'music'
  },
  {
    id: 'sdq-mirador-sur',
    name: 'Parque Mirador Sur · Santo Domingo',
    venue: 'Parque Mirador Sur',
    address: 'Av. Anacaona, Mirador Sur, Santo Domingo, República Dominicana',
    city: 'Santo Domingo',
    country: 'República Dominicana',
    countryCode: 'DO',
    lat: 18.4452,
    lng: -69.9568,
    categoryHint: 'sports'
  },
  {
    id: 'sti-monumento',
    name: 'Santiago · Área Monumental',
    venue: 'Monumento a los Héroes de la Restauración',
    address: 'Calle Del Sol, Santiago de los Caballeros, República Dominicana',
    city: 'Santiago',
    country: 'República Dominicana',
    countryCode: 'DO',
    lat: 19.4517,
    lng: -70.6970,
    categoryHint: 'social'
  },
  {
    id: 'puj-bavaro',
    name: 'Punta Cana · Downtown / Bávaro',
    venue: 'Downtown Punta Cana',
    address: 'Blvd. Turístico del Este, Bávaro, Punta Cana, República Dominicana',
    city: 'Punta Cana',
    country: 'República Dominicana',
    countryCode: 'DO',
    lat: 18.6152,
    lng: -68.4095,
    categoryHint: 'music'
  },
  {
    id: 'pop-cabarete',
    name: 'Puerto Plata · Cabarete Beach',
    venue: 'Playa Cabarete',
    address: 'Calle Principal, Cabarete, Puerto Plata, República Dominicana',
    city: 'Puerto Plata',
    country: 'República Dominicana',
    countryCode: 'DO',
    lat: 19.7509,
    lng: -70.4092,
    categoryHint: 'sports'
  },
  {
    id: 'jrb-montana',
    name: 'Jarabacoa · Eco Hub & Salto de Jimenoa',
    venue: 'Centro Eco-Turístico Jarabacoa',
    address: 'Carretera Federico Basilis, Jarabacoa, La Vega, República Dominicana',
    city: 'Jarabacoa',
    country: 'República Dominicana',
    countryCode: 'DO',
    lat: 19.1167,
    lng: -70.6333,
    categoryHint: 'health'
  },
  {
    id: 'lrm-altos-chavon',
    name: 'La Romana · Altos de Chavón',
    venue: 'Anfiteatro Altos de Chavón',
    address: 'Casa de Campo, La Romana, República Dominicana',
    city: 'La Romana',
    country: 'República Dominicana',
    countryCode: 'DO',
    lat: 18.4228,
    lng: -68.8889,
    categoryHint: 'art'
  },
  {
    id: 'sam-las-terrenas',
    name: 'Samaná · Pueblo de los Pescadores (Las Terrenas)',
    venue: 'Pueblo de los Pescadores',
    address: 'Calle Francisco Caamaño Deñó, Las Terrenas, Samaná, República Dominicana',
    city: 'Las Terrenas',
    country: 'República Dominicana',
    countryCode: 'DO',
    lat: 19.3210,
    lng: -69.5425,
    categoryHint: 'food'
  }
]

const DEFAULT_RD_LOCATION: LiveLocationData = {
  lat: 18.4861,
  lng: -69.9312,
  city: 'Santo Domingo',
  country: 'República Dominicana',
  countryCode: 'DO',
  address: 'Santo Domingo, Distrito Nacional, República Dominicana',
  venue: 'Santo Domingo Centro',
  source: 'default',
  lastUpdated: Date.now()
}

const STORAGE_KEY = 'eventnow_live_location_v1'

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2)
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export function resolveLocationMetadata(lat: number, lng: number): {
  city: string
  country: string
  countryCode: string
  address: string
  venue?: string
} {
  let closest: VenuePreset | null = null
  let minDistance = Infinity

  for (const preset of RD_VENUE_PRESETS) {
    const dist = haversineKm(lat, lng, preset.lat, preset.lng)
    if (dist < minDistance) {
      minDistance = dist
      closest = preset
    }
  }

  // If within 35 km of a known Dominican Republic hub
  if (closest && minDistance <= 35) {
    return {
      city: closest.city,
      country: closest.country,
      countryCode: closest.countryCode,
      address: minDistance <= 3 ? closest.address : `${closest.city}, ${closest.country}`,
      venue: minDistance <= 3 ? closest.venue : `${closest.city} (${minDistance.toFixed(1)} km)`
    }
  }

  // Check general Dominican Republic bounding box
  if (lat >= 17.4 && lat <= 20.0 && lng >= -72.1 && lng <= -68.2) {
    return {
      city: closest?.city || 'Santo Domingo',
      country: 'República Dominicana',
      countryCode: 'DO',
      address: `${closest?.city || 'Santo Domingo'}, República Dominicana`
    }
  }

  return {
    city: 'Mi Ubicación Actual',
    country: 'Internacional',
    countryCode: 'DO',
    address: `Lat ${lat.toFixed(4)}, Lng ${lng.toFixed(4)}`
  }
}

interface LiveLocationState {
  location: LiveLocationData
  isTracking: boolean
  permissionState: 'prompt' | 'granted' | 'denied' | 'unsupported'
  error: string | null
  setLocation: (loc: Partial<LiveLocationData> & { lat: number; lng: number }) => void
  startWatching: () => void
  stopWatching: () => void
  refreshNow: () => Promise<LiveLocationData>
  syncToBackend: (loc: LiveLocationData) => Promise<void>
}

let activeWatchId: number | null = null
let lastBackendSyncAt = 0
let startingWatch = false
let watchGeneration = 0
let observedPermission: PermissionStatus | null = null
const deniedLocationMessage = 'La ubicación está bloqueada en el navegador. Puedes elegir un destino o habilitarla en los permisos del sitio.'
async function locationPermission(): Promise<PermissionState | null> {
  try { return navigator.permissions ? (await navigator.permissions.query({ name: 'geolocation' })).state : null } catch { return null }
}

function loadInitialLocation(): LiveLocationData {
  if (typeof window === 'undefined') return DEFAULT_RD_LOCATION
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (typeof parsed?.lat === 'number' && typeof parsed?.lng === 'number') {
        return {
          ...DEFAULT_RD_LOCATION,
          ...parsed,
          source: parsed.source === 'gps' ? 'cached' : parsed.source || 'cached'
        }
      }
    }
  } catch {
    // Ignore storage errors
  }
  return DEFAULT_RD_LOCATION
}

export const useLiveLocationStore = create<LiveLocationState>((set, get) => ({
  location: loadInitialLocation(),
  isTracking: false,
  permissionState: 'prompt',
  error: null,

  setLocation: (partial) => {
    const resolved = resolveLocationMetadata(partial.lat, partial.lng)
    const next: LiveLocationData = {
      lat: partial.lat,
      lng: partial.lng,
      accuracy: partial.accuracy,
      city: partial.city || resolved.city,
      country: partial.country || resolved.country,
      countryCode: partial.countryCode || resolved.countryCode,
      address: partial.address || resolved.address,
      venue: partial.venue || resolved.venue,
      source: partial.source || 'manual',
      lastUpdated: Date.now()
    }
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      }
    } catch {
      // Ignore storage errors
    }
    set({ location: next, error: null })
    void get().syncToBackend(next)
  },

  syncToBackend: async (loc: LiveLocationData) => {
    if (typeof window === 'undefined' || !['gps', 'manual'].includes(loc.source)) return
    const now = Date.now()
    // Throttle backend sync to at most once every 45 seconds
    if (now - lastBackendSyncAt < 45000) return
    let token: string | null = null
    try { token = sessionStorage.getItem('auth-token') } catch { return }
    if (!token) return

    lastBackendSyncAt = now
    try {
      await apiClient.put('/users/me/location', {
        lat: loc.lat,
        lng: loc.lng,
        latitude: loc.lat,
        longitude: loc.lng,
        city: loc.city,
        country: loc.country,
        countryCode: loc.countryCode,
        address: loc.address
      })
    } catch {
      // Non-blocking sync
    }
  },

  refreshNow: async () => {
    if (typeof window === 'undefined' || !('geolocation' in navigator)) {
      set({ permissionState: 'unsupported' })
      return get().location
    }

    const permission = await locationPermission()
    if (permission === 'denied') {
      get().stopWatching()
      set({ permissionState: 'denied', error: deniedLocationMessage })
      return get().location
    }

    return new Promise<LiveLocationData>((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude
          const lng = pos.coords.longitude
          const meta = resolveLocationMetadata(lat, lng)
          const updated: LiveLocationData = {
            lat,
            lng,
            accuracy: pos.coords.accuracy,
            ...meta,
            source: 'gps',
            lastUpdated: Date.now()
          }
          try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
          } catch {}
          set({ location: updated, permissionState: 'granted', error: null })
          get().startWatching()
          void get().syncToBackend(updated)
          resolve(updated)
        },
        (err) => {
          set({
            permissionState: err.code === 1 ? 'denied' : 'prompt',
            error: err.code === 1 ? deniedLocationMessage : 'No pudimos obtener tu ubicación. Puedes elegir un destino manualmente.'
          })
          if (err.code === 1) get().stopWatching()
          resolve(get().location)
        },
        {
          enableHighAccuracy: true,
          timeout: 8000,
          maximumAge: 60000
        }
      )
    })
  },

  startWatching: () => {
    if (typeof window === 'undefined' || !('geolocation' in navigator)) { set({ permissionState: 'unsupported' }); return }
    if (activeWatchId !== null || startingWatch) return
    startingWatch = true
    const generation = watchGeneration
    void (async () => {
      let permission = await locationPermission()
      if (generation !== watchGeneration) return
      if (navigator.permissions && !observedPermission) {
        try {
          observedPermission = await navigator.permissions.query({ name: 'geolocation' })
          observedPermission.onchange = () => {
            const state = observedPermission?.state
            get().stopWatching()
            set({ permissionState: state || 'prompt', error: state === 'denied' ? deniedLocationMessage : null })
            if (state === 'granted') get().startWatching()
          }
          permission = observedPermission.state
        } catch { /* Older browsers request permission only after an explicit action. */ }
      }
      if (generation !== watchGeneration) return
      if (permission === 'denied') { set({ permissionState: 'denied', isTracking: false, error: deniedLocationMessage }); return }
      if (permission !== 'granted' && !(permission === null && get().permissionState === 'granted')) {
        set({ permissionState: 'prompt', isTracking: false }); return
      }
      set({ permissionState: 'granted', isTracking: true, error: null })
      activeWatchId = navigator.geolocation.watchPosition(pos => {
        const { latitude: lat, longitude: lng, accuracy } = pos.coords
        const prev = get().location
        if (haversineKm(prev.lat, prev.lng, lat, lng) < 0.05 && prev.source === 'gps') return
        const updated: LiveLocationData = { lat, lng, accuracy, ...resolveLocationMetadata(lat, lng), source: 'gps', lastUpdated: Date.now() }
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(updated)) } catch { /* Storage is optional. */ }
        set({ location: updated, permissionState: 'granted', isTracking: true, error: null })
        void get().syncToBackend(updated)
      }, err => {
        if (err.code === 1) { get().stopWatching(); set({ permissionState: 'denied', error: deniedLocationMessage }) }
        else set({ error: 'No pudimos actualizar tu ubicación. Puedes elegir un destino manualmente.' })
      }, { enableHighAccuracy: false, maximumAge: 120000, timeout: 15000 })
    })().finally(() => { startingWatch = false })
  },

  stopWatching: () => {
    watchGeneration++
    if (activeWatchId !== null && typeof window !== 'undefined' && 'geolocation' in navigator) {
      navigator.geolocation.clearWatch(activeWatchId)
      activeWatchId = null
    }
    set({ isTracking: false })
  }
}))

export function useLiveLocation(autoStart = true) {
  const store = useLiveLocationStore()

  useEffect(() => {
    if (autoStart) {
      store.startWatching()
    }
  }, [autoStart])

  const selectPreset = useCallback(
    (preset: VenuePreset) => {
      store.setLocation({
        lat: preset.lat,
        lng: preset.lng,
        city: preset.city,
        country: preset.country,
        countryCode: preset.countryCode,
        address: preset.address,
        venue: preset.venue,
        source: 'manual'
      })
    },
    [store]
  )

  return {
    ...store,
    coords: { lat: store.location.lat, lng: store.location.lng },
    city: store.location.city,
    refreshLocation: store.refreshNow,
    isWatching: store.isTracking,
    presets: RD_VENUE_PRESETS,
    selectPreset
  }
}
