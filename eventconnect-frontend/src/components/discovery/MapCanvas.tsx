'use client'

import { useEffect, useRef, useState, useMemo, useCallback } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import toast from 'react-hot-toast'
import markerRetina from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'
import {
  MapPin,
  Calendar,
  Navigation,
  Compass,
  Plus,
  Minus,
  Sun,
  Moon,
  Globe,
  Sparkles,
  ExternalLink,
  Lock,
  Users
} from 'lucide-react'
import { useMap as reactLeafletUseMap } from 'react-leaflet'
import type { Event } from '@/types/api.types'
import { formatPrice, formatEventDate } from '@/lib/event-display'
import { getCategoryMeta } from './map/categoryTheme'
import { isMapPosition, mapPoint, mapOverview, type MapOverview, type MapOverviewMode } from './map/mapViewport'
import { mapTiles, MAP_TILE_OPTIONS } from './map/mapTiles'

interface UserLocation {
  lat: number
  lng: number
  address?: string
}

interface DiscoveryEvent extends Event {
  distance?: number
  isSecretLocation?: boolean
}

export type MapVisualStyle = 'dark' | 'light' | 'satellite'

interface MapComponentProps {
  userLocation: UserLocation
  events?: DiscoveryEvent[]
  tribes?: any[]
  ideas?: any[]
  selectedEvent?: DiscoveryEvent | null
  selectedItem?: any | null
  viewType?: 'events' | 'tribes' | 'ideas'
  onEventSelect?: (event: DiscoveryEvent | null) => void
  onTribeSelect?: (tribe: any | null) => void
  onIdeaSelect?: (idea: any | null) => void
  categoryColors?: { [key: string]: string }
  showRadius?: boolean
  radiusKm?: number
  onLocationUpdate?: (location: UserLocation) => void
  onMoveEnd?: (center: { lat: number; lng: number }) => void
  onSearchArea?: (center: { lat: number; lng: number }) => void
  mapStyle?: MapVisualStyle
  onMapStyleChange?: (style: MapVisualStyle) => void
  flyToTarget?: { lat: number; lng: number; zoom?: number; ts?: number } | null
  showUserLocation?: boolean
  fitToEvents?: boolean
  overviewMode?: MapOverviewMode
  suppressSelectionPopup?: boolean
}

// Helper Haversine distance in km
function calcDistKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2)
  const bounded = Math.min(1, Math.max(0, a))
  const c = 2 * Math.atan2(Math.sqrt(bounded), Math.sqrt(1 - bounded))
  return R * c
}

// Internal controller for smooth flyTo, resize observer, and pan tracking
function MapController({
  center,
  selectedCoords,
  flyToTarget,
  overview,
  onMoveEnd,
  onMapReady
}: {
  center: UserLocation
  selectedCoords?: [number, number] | null
  flyToTarget?: { lat: number; lng: number; zoom?: number; ts?: number } | null
  overview?: MapOverview | null
  onMoveEnd?: (c: { lat: number; lng: number }) => void
  onMapReady?: (map: any) => void
}) {
  const map = reactLeafletUseMap() as any
  const prevCenterRef = useRef<{ lat: number; lng: number }>({ lat: center.lat, lng: center.lng })
  const overviewKey = overview ? JSON.stringify(overview) : ''
  const previousOverview = useRef(Boolean(overviewKey))
  const hasSelection = Boolean(selectedCoords)
  const fittingOverview = useRef(false)

  useEffect(() => {
    if (map && onMapReady) {
      onMapReady(map)
    }
  }, [map, onMapReady])

  // Fly when userLocation changes meaningfully
  useEffect(() => {
    const wasOverview = previousOverview.current
    previousOverview.current = Boolean(overviewKey)
    if (!map) return
    if (overviewKey) { prevCenterRef.current = { lat: center.lat, lng: center.lng }; return }
    const prev = prevCenterRef.current
    const dist = calcDistKm(prev.lat, prev.lng, center.lat, center.lng)
    if (dist > 0.05 || wasOverview) {
      prevCenterRef.current = { lat: center.lat, lng: center.lng }
      const currentZoom = map.getZoom()
      const localZoom = Math.max(Number.isFinite(currentZoom) ? currentZoom : 13, 10)
      try {
        map.flyTo([center.lat, center.lng], localZoom, { duration: 1.1 })
      } catch {
        map.setView([center.lat, center.lng], localZoom)
      }
    }
  }, [map, center.lat, center.lng, overviewKey])

  // Fit only when the geographic extent changes, preserving manual pan/zoom on rerenders.
  useEffect(() => {
    if (!map || !overviewKey || hasSelection) return
    const viewport = JSON.parse(overviewKey) as MapOverview
    fittingOverview.current = true
    try {
      if ('bounds' in viewport) map.fitBounds(viewport.bounds, { padding: [48, 48], maxZoom: viewport.maxZoom, animate: false })
      else map.setView(viewport.center, viewport.zoom, { animate: false })
    } finally { fittingOverview.current = false }
  }, [map, overviewKey, hasSelection])

  // Fly when a specific item is selected
  useEffect(() => {
    if (!map || !selectedCoords) return
    const [lat, lng] = selectedCoords
    if (!isMapPosition(lat, lng)) return
    try {
      const targetZoom = Math.max(map.getZoom() || 13, 14)
      map.flyTo([lat, lng], targetZoom, { duration: 0.85 })
    } catch {
      map.setView([lat, lng], 14)
    }
  }, [map, selectedCoords?.[0], selectedCoords?.[1]])

  // Fly when an explicit hub or surprise target is triggered
  useEffect(() => {
    if (!map || !flyToTarget) return
    const { lat, lng, zoom } = flyToTarget
    if (!isMapPosition(lat, lng)) return
    try {
      map.flyTo([lat, lng], zoom ?? 13, { duration: 1.2 })
    } catch {
      map.setView([lat, lng], zoom ?? 13)
    }
  }, [map, flyToTarget?.lat, flyToTarget?.lng, flyToTarget?.zoom, flyToTarget?.ts])

  // Keep map size synced with layout changes
  useEffect(() => {
    if (!map) return
    const container = map.getContainer?.()
    if (!container || typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(() => {
      try {
        map.invalidateSize()
      } catch {}
    })
    observer.observe(container)
    return () => observer.disconnect()
  }, [map])

  // Track user panning to show "Buscar en esta zona"
  useEffect(() => {
    if (!map || !onMoveEnd) return
    const handler = () => {
      if (fittingOverview.current) return
      const c = map.getCenter()
      onMoveEnd({ lat: c.lat, lng: c.lng })
    }
    map.on('moveend', handler)
    return () => {
      map.off('moveend', handler)
    }
  }, [map, onMoveEnd])

  return null
}

// Dynamically import Leaflet components with no SSR
const MapContainer = dynamic(
  () => import('react-leaflet').then((mod) => mod.MapContainer),
  { ssr: false }
)
const TileLayer = dynamic(
  () => import('react-leaflet').then((mod) => mod.TileLayer),
  { ssr: false }
)
const Marker = dynamic(
  () => import('react-leaflet').then((mod) => mod.Marker),
  { ssr: false }
)
const Popup = dynamic(
  () => import('react-leaflet').then((mod) => mod.Popup),
  { ssr: false }
)
const Circle = dynamic(
  () => import('react-leaflet').then((mod) => mod.Circle),
  { ssr: false }
)
const MarkerClusterGroup = dynamic(
  () => import('react-leaflet-cluster').then((mod) => mod.default),
  { ssr: false }
)

export default function MapComponent({
  userLocation: requestedCenter,
  events = [],
  tribes = [],
  ideas = [],
  selectedEvent,
  selectedItem,
  viewType = 'events',
  onEventSelect,
  onTribeSelect,
  onIdeaSelect,
  showRadius = true,
  radiusKm = 10,
  onLocationUpdate,
  onMoveEnd,
  onSearchArea,
  mapStyle: externalMapStyle,
  onMapStyleChange,
  flyToTarget,
  showUserLocation = true,
  fitToEvents = false,
  overviewMode,
  suppressSelectionPopup = false
}: MapComponentProps) {
  const userLocation = requestedCenter && isMapPosition(requestedCenter.lat, requestedCenter.lng) ? requestedCenter : { lat: 20, lng: 0 }
  const [isLocating, setIsLocating] = useState(false)
  const [isMounted, setIsMounted] = useState(false)
  const [L, setL] = useState<any>(null)
  const [internalStyle, setInternalStyle] = useState<MapVisualStyle>('dark')
  const [radiusVisible, setRadiusVisible] = useState(showRadius)
  const [tileError, setTileError] = useState(false)
  const [tileAttempt, setTileAttempt] = useState(0)
  const [pannedCenter, setPannedCenter] = useState<{ lat: number; lng: number } | null>(null)
  const mapRef = useRef<any>(null)

  const activeStyle = externalMapStyle || internalStyle
  const setMapStyle = (style: MapVisualStyle) => {
    setInternalStyle(style)
    onMapStyleChange?.(style)
  }
  useEffect(() => { setTileError(false) }, [activeStyle])

  // Load Leaflet only on client side
  useEffect(() => {
    if (typeof window !== 'undefined') {
      import('leaflet/dist/leaflet.css').catch(() => {})
      import('leaflet').then((leaflet) => {
        setL(leaflet.default)
        delete (leaflet.default.Icon.Default.prototype as any)._getIconUrl
        leaflet.default.Icon.Default.mergeOptions({
          iconRetinaUrl: markerRetina.src,
          iconUrl: markerIcon.src,
          shadowUrl: markerShadow.src
        })
        setIsMounted(true)
      })
    }
  }, [])

  const activeSelected = selectedEvent || selectedItem
  const itemsToRender = viewType === 'events' ? events : viewType === 'ideas' ? ideas : tribes
  const overview = fitToEvents || overviewMode
    ? mapOverview(itemsToRender.map(item => mapPoint(item.location?.coordinates)).filter(point => point !== null), overviewMode || 'city', [userLocation.lat, userLocation.lng])
    : null
  const overviewKey = overview ? JSON.stringify(overview) : ''

  useEffect(() => { setRadiusVisible(showRadius) }, [showRadius])
  useEffect(() => { setPannedCenter(null) }, [overviewKey])

  const selectedCoords = useMemo<[number, number] | null>(() => {
    return mapPoint(activeSelected?.location?.coordinates)
  }, [activeSelected])

  const handleMapMoveEnd = useCallback(
    (c: { lat: number; lng: number }) => {
      onMoveEnd?.(c)
      const dist = calcDistKm(userLocation.lat, userLocation.lng, c.lat, c.lng)
      if (dist > 1.8) {
        setPannedCenter(c)
      } else {
        setPannedCenter(null)
      }
    },
    [userLocation.lat, userLocation.lng, onMoveEnd]
  )

  // Get user's current GPS location
  const getCurrentLocation = () => {
    setIsLocating(true)
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const newLocation: UserLocation = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            address: 'Tu ubicación GPS actual'
          }
          onLocationUpdate?.(newLocation)
          setPannedCenter(null)
          try {
            mapRef.current?.flyTo([newLocation.lat, newLocation.lng], 14, { duration: 1.1 })
          } catch {
            mapRef.current?.setView([newLocation.lat, newLocation.lng], 14)
          }
          setIsLocating(false)
          toast.success('Ubicación GPS actualizada')
        },
        () => {
          setIsLocating(false)
          toast.error('No pudimos obtener tu ubicación. Puedes elegir un destino o explorar el mapa.')
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
      )
    } else {
      setIsLocating(false)
      toast.error('Tu navegador no soporta geolocalización.')
    }
  }

  const handleZoomIn = () => {
    if (mapRef.current) mapRef.current.zoomIn()
  }

  const handleZoomOut = () => {
    if (mapRef.current) mapRef.current.zoomOut()
  }

  // Format distance
  const formatDistance = (distance: number) => {
    if (distance < 1) {
      return `${Math.round(distance * 1000)} m`
    }
    return `${distance.toFixed(1)} km`
  }

  const formatPriceBadge = (price?: { amount: number; currency?: string }) => {
    return formatPrice({ price })
  }

  // Open directions in Google Maps or Waze
  const openDirections = (item: any, app: 'gmaps' | 'waze' = 'gmaps') => {
    if (item?.isSecretLocation) return
    const point = mapPoint(item?.location?.coordinates)
    if (point) {
      const [lat, lng] = point
      if (app === 'waze') {
        window.open(`https://waze.com/ul?ll=${lat},${lng}&navigate=yes`, '_blank', 'noopener,noreferrer')
      } else {
        window.open(
          `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}${showUserLocation ? `&origin=${userLocation.lat},${userLocation.lng}` : ''}`,
          '_blank',
          'noopener,noreferrer'
        )
      }
    }
  }

  // Epic custom markers with category SVG, neon halo, and price/status pill
  const createEventIcon = useMemo(() => {
    return (item: any, isSelected: boolean = false) => {
      if (!L) return null
      const meta = getCategoryMeta(item.category)
      const color = meta.color
      const secondary = meta.secondaryColor
      const size = isSelected ? 52 : 42
      const isIdea = viewType === 'ideas' || Boolean(item.isIdea)
      const isFree = !item.price || !item.price.amount || item.price.amount === 0
      const priceLabel = isIdea
        ? `💡 ${item.supportersCount || 0}/${item.quorumTarget || 15}`
        : viewType === 'events'
        ? formatPriceBadge(item.price)
        : `${item.membersCount ?? 0} m.`
      const safePriceLabel = priceLabel.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')
      const isSecret = Boolean(item.isSecretLocation)
      const attendeesCount = item.attendeesCount ?? item.attendees?.length ?? 0
      const isHot = isIdea ? Boolean(item.quorumReached) : attendeesCount >= 5

      const badgeBg = isIdea
        ? 'linear-gradient(135deg, #d97706, #f59e0b)'
        : isFree
        ? 'linear-gradient(135deg, #059669, #10b981)'
        : 'rgba(15, 23, 42, 0.92)'
      const badgeBorder = isIdea ? '#fcd34d' : isFree ? '#34d399' : color

      return L.divIcon({
        html: `
        <div class="ec-pin-wrapper" style="position: relative; width: ${size}px; height: ${size + 18}px; display: flex; flex-direction: column; align-items: center; justify-content: flex-start;">
          <!-- Pulsing Aura -->
          <div style="
            position: absolute;
            top: ${isSelected ? '-8px' : '-4px'};
            left: ${isSelected ? '-8px' : '-4px'};
            width: ${size + (isSelected ? 16 : 8)}px;
            height: ${size + (isSelected ? 16 : 8)}px;
            background: radial-gradient(circle, ${color}88 0%, ${secondary}22 60%, transparent 75%);
            border-radius: 9999px;
            animation: ec-pin-pulse ${isSelected ? '1.3s' : '2.4s'} infinite ease-in-out alternate;
            pointer-events: none;
          "></div>

          ${
            isSelected
              ? `<div style="
                  position: absolute;
                  top: -6px;
                  left: -6px;
                  width: ${size + 12}px;
                  height: ${size + 12}px;
                  border-radius: 9999px;
                  border: 2px solid ${secondary};
                  box-shadow: 0 0 20px ${color};
                  animation: ec-ring-expand 1.6s infinite ease-out;
                  pointer-events: none;
                "></div>`
              : ''
          }

          <!-- Main Pin Body -->
          <div style="
            position: relative;
            width: ${size}px;
            height: ${size}px;
            border-radius: 16px 16px 16px 4px;
            transform: rotate(-45deg) ${isSelected ? 'scale(1.12)' : 'scale(1)'};
            background: linear-gradient(135deg, ${color} 0%, #0f172a 90%);
            border: 2.5px solid ${isSelected ? '#ffffff' : secondary};
            box-shadow: 0 8px 22px -4px ${color}99, inset 0 2px 6px rgba(255,255,255,0.35);
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
          ">
            <div style="transform: rotate(45deg); display: flex; align-items: center; justify-content: center;">
              ${meta.svg}
            </div>
          </div>

          <!-- Top Corner Status Indicator (Secret or Hot) -->
          ${
            isSecret
              ? `<div style="
                  position: absolute;
                  top: -5px;
                  right: -5px;
                  width: 18px;
                  height: 18px;
                  border-radius: 9999px;
                  background: #f59e0b;
                  border: 2px solid #0f172a;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  font-size: 9px;
                  box-shadow: 0 2px 6px rgba(0,0,0,0.5);
                ">🔒</div>`
              : isHot
              ? `<div style="
                  position: absolute;
                  top: -5px;
                  right: -5px;
                  width: 18px;
                  height: 18px;
                  border-radius: 9999px;
                  background: #ef4444;
                  border: 2px solid #0f172a;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  font-size: 9px;
                  box-shadow: 0 2px 6px rgba(0,0,0,0.5);
                ">🔥</div>`
              : ''
          }

          <!-- Price / Members Floating Pill -->
          <div style="
            margin-top: 2px;
            padding: 1px 6px;
            border-radius: 9999px;
            background: ${badgeBg};
            border: 1px solid ${badgeBorder};
            color: #ffffff;
            font-size: 9.5px;
            font-weight: 800;
            letter-spacing: 0.02em;
            white-space: nowrap;
            box-shadow: 0 4px 10px rgba(0,0,0,0.45);
            z-index: 2;
          ">
            ${safePriceLabel}
          </div>
        </div>`,
        className: 'custom-event-marker',
        iconSize: [size, size + 18],
        iconAnchor: [size / 2, size + 10],
        popupAnchor: [0, -(size + 8)]
      })
    }
  }, [L, viewType])

  // User Radar Marker
  const getUserLocationIcon = useMemo(() => {
    return () => {
      if (!L) return null
      return L.divIcon({
        html: `
        <div style="position: relative; width: 44px; height: 44px; display: flex; align-items: center; justify-content: center;">
          <div style="
            position: absolute;
            width: 44px;
            height: 44px;
            border-radius: 9999px;
            background: rgba(56, 189, 248, 0.18);
            border: 1.5px solid rgba(56, 189, 248, 0.5);
            animation: ec-radar-wave 2.2s infinite ease-out;
          "></div>
          <div style="
            position: absolute;
            width: 28px;
            height: 28px;
            border-radius: 9999px;
            background: rgba(139, 92, 246, 0.28);
            animation: ec-radar-wave 2.2s infinite 0.6s ease-out;
          "></div>
          <div style="
            position: relative;
            width: 16px;
            height: 16px;
            border-radius: 9999px;
            background: linear-gradient(135deg, #38bdf8, #8b5cf6);
            border: 3px solid #ffffff;
            box-shadow: 0 0 14px #38bdf8;
          "></div>
        </div>`,
        className: 'user-location-marker',
        iconSize: [44, 44],
        iconAnchor: [22, 22]
      })
    }
  }, [L])

  // Custom Neon Cluster Icon
  const createClusterCustomIcon = useCallback(
    (cluster: any) => {
      if (!L) return null
      const count = cluster.getChildCount()
      const size = count >= 10 ? 52 : count >= 5 ? 46 : 40
      return L.divIcon({
        html: `
        <div style="
          width: ${size}px;
          height: ${size}px;
          border-radius: 9999px;
          background: radial-gradient(circle at 30% 30%, #8b5cf6, #4f46e5 70%, #0f172a 100%);
          border: 2.5px solid rgba(255,255,255,0.85);
          box-shadow: 0 0 22px rgba(139, 92, 246, 0.7), inset 0 0 10px rgba(255,255,255,0.3);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          color: #ffffff;
          font-weight: 800;
          font-size: ${count >= 10 ? '15px' : '13px'};
          line-height: 1;
        ">
          <span>${count}</span>
          <span style="font-size: 7px; font-weight: 700; opacity: 0.85; letter-spacing: 0.04em; text-transform: uppercase;">${viewType === 'events' ? 'eventos' : viewType === 'ideas' ? 'ideas' : 'tribus'}</span>
        </div>`,
        className: 'custom-marker-cluster',
        iconSize: L.point(size, size, true)
      })
    },
    [L, viewType]
  )

  if (!isMounted || !L) {
    return (
      <div className="relative h-full w-full bg-slate-950 flex items-center justify-center">
        <div role="status" className="text-slate-400 text-sm font-medium flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-violet-400 animate-spin" />
          Iniciando radar geográfico…
        </div>
      </div>
    )
  }

  const tileConfig = mapTiles(activeStyle, process.env.NEXT_PUBLIC_CARTO_BASEMAP_KEY)

  return (
    <div className="eventnow-map relative h-full w-full overflow-hidden">
      {/* Global Keyframe Animations for Map Pins */}
      <style jsx global>{`
        .eventnow-map-tiles--osm-dark {
          filter: invert(100%) hue-rotate(180deg) brightness(90%) contrast(90%) saturate(65%);
        }
        @keyframes ec-pin-pulse {
          0% {
            transform: scale(0.9);
            opacity: 0.45;
          }
          100% {
            transform: scale(1.22);
            opacity: 0.9;
          }
        }
        @keyframes ec-ring-expand {
          0% {
            transform: scale(0.85);
            opacity: 0.95;
          }
          100% {
            transform: scale(1.45);
            opacity: 0;
          }
        }
        @keyframes ec-radar-wave {
          0% {
            transform: scale(0.5);
            opacity: 0.9;
          }
          100% {
            transform: scale(1.55);
            opacity: 0;
          }
        }
        .eventnow-map .leaflet-popup-content-wrapper {
          background: rgba(15, 23, 42, 0.95) !important;
          color: #f8fafc !important;
          border: 1px solid rgba(139, 92, 246, 0.35) !important;
          border-radius: 18px !important;
          box-shadow: 0 20px 40px -15px rgba(0, 0, 0, 0.7) !important;
          backdrop-filter: blur(12px) !important;
          padding: 0 !important;
        }
        .eventnow-map .leaflet-popup-content {
          margin: 16px !important;
          font-family: var(--font-inter), system-ui, sans-serif;
          font-size: 14px;
          line-height: 1.6;
        }
        .eventnow-map .leaflet-popup-content h3 { font-family: inherit; font-weight: 600; letter-spacing: normal; }
        .eventnow-map .leaflet-popup-content a[data-map-event-link] { color: #ffffff; min-height: 44px; }
        .eventnow-map .leaflet-popup-close-button { min-width: 40px; min-height: 40px; color: #e2e8f0; }
        .eventnow-map .leaflet-popup-content button { min-width: 44px; min-height: 44px; }

        .eventnow-map .leaflet-popup-tip {
          background: rgba(15, 23, 42, 0.95) !important;
        }
        .eventnow-map .leaflet-container {
          font-family: inherit !important;
        }
      `}</style>

      {tileError && <div role="alert" className="absolute left-3 right-16 top-3 z-[1100] max-w-md rounded-xl border border-amber-400/40 bg-slate-950/95 p-3 text-xs text-slate-100 shadow-lg">
        <p>No se cargaron algunas partes del mapa. Puedes reintentar o cambiar de vista.</p>
        <button type="button" onClick={() => { setTileError(false); setTileAttempt(attempt => attempt + 1) }} className="mt-2 min-h-10 rounded-lg border border-slate-600 px-3 font-semibold hover:bg-slate-800">Reintentar mapa</button>
      </div>}

      <div aria-label="Créditos del mapa" className="absolute bottom-0 right-0 z-[1100] max-w-full rounded-tl bg-white/95 px-1.5 py-0.5 text-[10px] leading-tight text-slate-900 [&_a]:underline" dangerouslySetInnerHTML={{ __html: tileConfig.attribution }} />

      {/* "Buscar en esta zona" Floating Pill when User Pans */}
      {pannedCenter && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] pointer-events-auto">
          <button
            onClick={() => {
              if (onSearchArea) onSearchArea(pannedCenter)
              else onLocationUpdate?.({ lat: pannedCenter.lat, lng: pannedCenter.lng, address: 'Zona explorada en el mapa' })
              setPannedCenter(null)
              toast.success('Buscando eventos en esta zona del mapa')
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-violet-600/95 hover:bg-violet-500 text-white text-xs font-bold shadow-xl shadow-violet-600/30 border border-violet-400/40 backdrop-blur-md transition-all hover:scale-105 active:scale-95"
          >
            <Compass className="w-4 h-4 animate-spin" style={{ animationDuration: '6s' }} />
            Buscar en esta zona del mapa
          </button>
        </div>
      )}

      {/* Live Radar Status HUD (Top Left) */}
      <div className="pointer-events-none absolute left-4 top-4 z-[940] hidden sm:flex items-center gap-2.5 rounded-2xl border border-slate-700/80 bg-slate-950/85 px-3.5 py-2 text-xs font-semibold text-slate-200 shadow-xl backdrop-blur-md">
        <span className="relative flex h-2.5 w-2.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
        </span>
        <span>
          {itemsToRender.length}{' '}
          {viewType === 'events'
            ? itemsToRender.length === 1 ? 'evento en radar' : 'eventos en radar'
            : viewType === 'ideas'
            ? itemsToRender.length === 1 ? 'idea en quórum' : 'ideas en quórum'
            : itemsToRender.length === 1 ? 'tribu activa' : 'tribus activas'}
        </span>
        <span className="text-slate-600">·</span>
        <span className="text-violet-300">
          {activeStyle === 'dark' ? 'Nocturno' : activeStyle === 'light' ? 'Urbano' : 'Satélite'}
        </span>
      </div>

      {/* Floating Map Controls (Top Right) */}
      <div className="absolute top-4 right-4 z-[999] flex flex-col gap-2 pointer-events-auto">
        {/* Map Visual Style Switcher */}
        <div className="bg-slate-900/90 backdrop-blur-md border border-slate-700/80 rounded-2xl p-1 flex flex-col gap-1 shadow-xl">
          <button
            onClick={() => setMapStyle('dark')}
            title="Mapa nocturno"
            className={`p-2 rounded-xl transition-all flex items-center justify-center ${
              activeStyle === 'dark'
                ? 'bg-violet-600 text-white shadow-md shadow-violet-600/40'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Moon className="w-4 h-4" />
          </button>
          <button
            onClick={() => setMapStyle('light')}
            title="Mapa urbano"
            className={`p-2 rounded-xl transition-all flex items-center justify-center ${
              activeStyle === 'light'
                ? 'bg-amber-500 text-white shadow-md shadow-amber-500/40'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Sun className="w-4 h-4" />
          </button>
          <button
            onClick={() => setMapStyle('satellite')}
            title="Mapa satélite"
            className={`p-2 rounded-xl transition-all flex items-center justify-center ${
              activeStyle === 'satellite'
                ? 'bg-sky-500 text-white shadow-md shadow-sky-500/40'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Globe className="w-4 h-4" />
          </button>
        </div>

        {/* Zoom & Radar Controls */}
        <div className="bg-slate-900/90 backdrop-blur-md border border-slate-700/80 rounded-2xl p-1 flex flex-col gap-1 shadow-xl">
          <button
            onClick={handleZoomIn}
            title="Acercar mapa"
            className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 transition-colors flex items-center justify-center"
          >
            <Plus className="w-4 h-4" />
          </button>
          <div className="h-[1px] bg-slate-800 mx-1" />
          <button
            onClick={handleZoomOut}
            title="Alejar mapa"
            className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 transition-colors flex items-center justify-center"
          >
            <Minus className="w-4 h-4" />
          </button>
        </div>

        {/* GPS & Radius Circle Toggle */}
        <div className="bg-slate-900/90 backdrop-blur-md border border-slate-700/80 rounded-2xl p-1 flex flex-col gap-1 shadow-xl">
          <button
            onClick={getCurrentLocation}
            disabled={isLocating}
            title="Centrar en mi ubicación GPS"
            aria-label="Usar mi ubicación"
            className="p-2 rounded-xl text-sky-400 hover:text-white hover:bg-sky-500/20 transition-colors flex items-center justify-center"
          >
            <Navigation className={`w-4 h-4 ${isLocating ? 'animate-spin' : ''}`} />
          </button>
          {showUserLocation && <button
            onClick={() => setRadiusVisible(!radiusVisible)}
            title={radiusVisible ? 'Ocultar anillo de cobertura' : 'Mostrar anillo de cobertura'}
            className={`p-2 rounded-xl transition-colors flex items-center justify-center text-xs font-bold ${
              radiusVisible
                ? 'bg-violet-500/20 text-violet-300 border border-violet-500/40'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            {radiusKm}k
          </button>}
        </div>
      </div>

      <MapContainer
        center={[userLocation.lat, userLocation.lng]}
        zoom={overviewMode === 'world' ? 2 : overviewMode === 'country' ? 5 : overviewMode === 'city' ? 11 : 13}
        maxZoom={18}
        className="h-full w-full z-0"
        ref={mapRef}
        zoomControl={false}
        attributionControl={false}
        scrollWheelZoom={true}
        style={{ background: tileConfig.bg }}
      >
        <TileLayer
          key={`${activeStyle}-${tileAttempt}`}
          attribution={tileConfig.attribution}
          url={tileConfig.url}
          className={tileConfig.className}
          {...MAP_TILE_OPTIONS}
          eventHandlers={{ tileerror: () => setTileError(true) }}
        />

        {/* User Radar Location Marker */}
        {showUserLocation && <Marker position={[userLocation.lat, userLocation.lng]} icon={getUserLocationIcon()}>
          <Popup>
            <div className="p-1 text-center min-w-[170px]">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-sky-500/20 text-sky-300 text-xs font-bold mb-1">
                <span className="w-2 h-2 rounded-full bg-sky-400 animate-ping" />
                Tu ubicación
              </div>
              {userLocation.address && (
                <div className="text-xs text-slate-300 mt-1 font-medium">{userLocation.address}</div>
              )}
              <div className="text-[11px] text-slate-400 mt-1">
                Cobertura activa: <strong className="text-violet-300">{radiusKm} km</strong>
              </div>
            </div>
          </Popup>
        </Marker>}

        {/* Search Radius Neon Circle */}
        {showUserLocation && radiusVisible && radiusKm > 0 && radiusKm <= 100 && (
          <Circle
            center={[userLocation.lat, userLocation.lng]}
            radius={radiusKm * 1000}
            pathOptions={{
              color: '#8b5cf6',
              fillColor: '#6366f1',
              fillOpacity: activeStyle === 'light' ? 0.08 : 0.06,
              weight: 1.8,
              dashArray: '6, 8'
            }}
          />
        )}

        {/* Clustered Markers */}
        <MarkerClusterGroup
          chunkedLoading
          iconCreateFunction={createClusterCustomIcon}
          maxClusterRadius={46}
          showCoverageOnHover={false}
          spiderfyOnMaxZoom={true}
        >
          {itemsToRender.map((item) => {
            const point = mapPoint(item.location?.coordinates)
            if (!point) return null
            const [lat, lng] = point

            const isSelected = activeSelected?._id === item._id
            const meta = getCategoryMeta(item.category)
            const distance =
              typeof item.distance === 'number'
                ? item.distance
                : calcDistKm(userLocation.lat, userLocation.lng, lat, lng)

            const coverUrl =
              item.images && item.images.length > 0
                ? typeof item.images[0] === 'string'
                  ? item.images[0]
                  : item.images[0]?.url
                : null

            return (
              <Marker
                key={item._id}
                title={item.title || item.name || 'Ver plan'}
                position={[lat, lng]}
                icon={createEventIcon(item, isSelected)}
                zIndexOffset={isSelected ? 1000 : 0}
                eventHandlers={{
                  click: () => {
                    if (viewType === 'events' && onEventSelect) {
                      onEventSelect(item as DiscoveryEvent)
                    } else if (viewType === 'ideas' && onIdeaSelect) {
                      onIdeaSelect(item)
                    } else if (viewType === 'tribes' && onTribeSelect) {
                      onTribeSelect(item)
                    }
                  }
                }}
              >
                {!suppressSelectionPopup && <Popup maxWidth={320}>
                  <div className="w-[265px] max-w-full text-slate-100">
                    {/* Cover Header */}
                    <div className="relative h-28 w-full rounded-xl overflow-hidden mb-2.5 bg-slate-800">
                      {coverUrl ? (
                        <img
                          src={coverUrl}
                          alt={item.title || item.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div
                          className="w-full h-full flex items-center justify-center text-3xl"
                          style={{
                            background: `linear-gradient(135deg, ${meta.color}, #1e1b4b)`
                          }}
                        >
                          {meta.emoji}
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/30 to-transparent" />

                      <span
                        className="absolute top-2 left-2 px-2.5 py-0.5 rounded-full text-[10px] font-bold text-white shadow"
                        style={{ backgroundColor: meta.color }}
                      >
                        {meta.emoji} {meta.shortLabel}
                      </span>

                      <span className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-slate-950/85 border border-white/15 text-[10px] font-extrabold text-emerald-300">
                        {viewType === 'events'
                          ? formatPriceBadge(item.price)
                          : viewType === 'ideas'
                          ? `💡 ${item.supportersCount || 0}/${item.quorumTarget || 15}`
                          : `${item.membersCount || 0} miembros`}
                      </span>

                      <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between text-[11px] text-slate-200 font-medium">
                        {showUserLocation && <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-violet-400" />
                          {formatDistance(distance)}
                        </span>}
                        {viewType === 'events' && (
                          <span className="flex items-center gap-1">
                            <Users className="w-3 h-3 text-sky-400" />
                            {item.attendeesCount ?? item.attendees?.length ?? 0}{item.maxAttendees ? `/${item.maxAttendees}` : ' asistentes'}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Title & Venue */}
                    <h3 className="font-semibold text-base text-white leading-6 line-clamp-2 mb-2">
                      {item.title || item.name}
                    </h3>

                    {viewType === 'events' && <p className="mb-2 flex items-start gap-1.5 text-xs leading-relaxed text-slate-300">
                      <Calendar className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                      <time dateTime={typeof item.date === 'string' ? item.date : undefined}>{formatEventDate(item.date, item.timeZone)}</time>
                    </p>}

                    <p className="text-sm text-slate-300 line-clamp-2 mb-3 leading-6">
                      {item.description}
                    </p>

                    {item.isSecretLocation && (
                      <div className="flex items-center gap-1.5 text-[11px] text-amber-300 bg-amber-500/10 border border-amber-500/30 rounded-lg px-2 py-1 mb-2.5">
                        <Lock className="w-3 h-3 flex-shrink-0" />
                        <span>Ubicación aproximada · Consulta el detalle antes de desplazarte</span>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex items-center gap-1.5">
                      <Link data-map-event-link
                        href={
                          viewType === 'ideas'
                            ? `/ideas`
                            : `/${viewType === 'events' ? 'events' : 'tribes'}/${item._id}`
                        }
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-violet-600/30 transition-all"
                      >
                        <span>{viewType === 'ideas' ? 'Ver Quórum' : 'Ver experiencia'}</span>
                        <ExternalLink className="w-3 h-3" />
                      </Link>
                      <button
                        onClick={() => openDirections(item, 'gmaps')}
                        disabled={Boolean(item.isSecretLocation)}
                        title={item.isSecretLocation ? 'Ruta no disponible para una ubicación aproximada' : 'Ruta en Google Maps'}
                        aria-label="Ruta en Google Maps"
                        className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        🗺️
                      </button>
                      <button
                        onClick={() => openDirections(item, 'waze')}
                        disabled={Boolean(item.isSecretLocation)}
                        title={item.isSecretLocation ? 'Ruta no disponible para una ubicación aproximada' : 'Abrir en Waze'}
                        aria-label="Abrir en Waze"
                        className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        🚗
                      </button>
                    </div>
                  </div>
                </Popup>}
              </Marker>
            )
          })}
        </MarkerClusterGroup>

        <MapController
          center={userLocation}
          overview={overview}
          selectedCoords={selectedCoords}
          flyToTarget={flyToTarget}
          onMoveEnd={handleMapMoveEnd}
          onMapReady={(m) => {
            mapRef.current = m
          }}
        />
      </MapContainer>
    </div>
  )
}
