'use client'

import { useEffect, useRef, useState, useMemo } from 'react'
import dynamic from 'next/dynamic'
import { MapPin, Star, TrendingUp } from 'lucide-react'
import { Button } from '@/components/redesign/ui/button'
import type { Event } from '@/types/api.types'

// Alias para iconos no disponibles en lucide-react 0.408.0
const Route = TrendingUp
const Locate = MapPin

interface UserLocation {
  lat: number
  lng: number
  address?: string
}

interface DiscoveryEvent extends Event {
  distance?: number
}

interface MapComponentProps {
  userLocation: UserLocation
  events?: DiscoveryEvent[]
  tribes?: any[]
  selectedEvent?: DiscoveryEvent | null
  selectedItem?: any | null
  viewType?: 'events' | 'tribes'
  onEventSelect?: (event: DiscoveryEvent | null) => void
  onTribeSelect?: (tribe: any | null) => void
  categoryColors: { [key: string]: string }
  showRadius?: boolean;
  radiusKm?: number;
  onLocationUpdate?: (location: UserLocation) => void;
  onMoveEnd?: (center: { lat: number; lng: number }) => void;
}

// Internal component to capture map move events (for "search in this area")
function MapEvents({ onMoveEnd }: { onMoveEnd?: (c: { lat: number; lng: number }) => void }) {
  const map = reactLeafletUseMap() as any;
  useEffect(() => {
    if (!map || !onMoveEnd) return;
    const handler = () => {
      const c = map.getCenter();
      onMoveEnd({ lat: c.lat, lng: c.lng });
    };
    map.on('moveend', handler);
    return () => map.off('moveend', handler);
  }, [map, onMoveEnd]);
  return null;
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
const useMap = dynamic(
  () => import('react-leaflet').then((mod) => mod.useMap as any),
  { ssr: false }
)

// NOTE: useMap must be imported statically (not via dynamic) so it works as a
// hook inside <MapContainer>. The file is 'use client' and MapContainer is
// already client-only, so a static import is safe.
import { useMap as reactLeafletUseMap } from 'react-leaflet'

// Category icon mapping using Premium SVGs
const categoryIcons: { [key: string]: string } = {
  'tecnología': '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-white"><rect width="20" height="14" x="2" y="3" rx="2"/><line x1="8" x2="16" y1="21" y2="21"/><line x1="12" x2="12" y1="17" y2="21"/></svg>',
  'música': '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-white"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>',
  'arte': '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-white"><circle cx="13.5" cy="6.5" r=".5"/><circle cx="17.5" cy="10.5" r=".5"/><circle cx="8.5" cy="7.5" r=".5"/><circle cx="6.5" cy="12.5" r=".5"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/></svg>',
  'gastronomía': '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-white"><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"/></svg>',
  'deportes': '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-white"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg>',
  'educación': '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-white"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/></svg>',
  'networking': '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-white"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
  'entretenimiento': '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-white"><path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"/><path d="M13 5v2"/><path d="M13 17v2"/><path d="M13 11v2"/></svg>',
  'cultura': '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-white"><path d="M3 22v-10.5a.5.5 0 0 1 .5-.5h17a.5.5 0 0 1 .5.5V22"/><path d="M21 21.5H3"/><path d="M3 2v10.5a.5.5 0 0 0 .5.5h17a.5.5 0 0 0 .5-.5V2"/><path d="M8 12v10"/><path d="M16 12v10"/><path d="M12 16v6"/><path d="M12 2v6"/></svg>',
  'salud': '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-white"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>'
}

export default function MapComponent({
  userLocation,
  events = [],
  tribes = [],
  selectedEvent,
  selectedItem,
  viewType = 'events',
  onEventSelect,
  onTribeSelect,
  categoryColors,
  showRadius = false,
  radiusKm = 5,
  onLocationUpdate,
  onMoveEnd,
}: MapComponentProps) {
  const [isLocating, setIsLocating] = useState(false)
  const [isMounted, setIsMounted] = useState(false)
  const [L, setL] = useState<any>(null)
  const mapRef = useRef<any>(null)

  // Load Leaflet only on client side
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Import Leaflet CSS from local node_modules (avoids CDN CSP violations)
      import('leaflet/dist/leaflet.css').catch(() => {})
      import('leaflet').then((leaflet) => {
        setL(leaflet.default)
        // Fix default marker icons — use require() so Next.js bundles them with content hashes
        delete (leaflet.default.Icon.Default.prototype as any)._getIconUrl
        leaflet.default.Icon.Default.mergeOptions({
          iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png').default || require('leaflet/dist/images/marker-icon-2x.png'),
          iconUrl: require('leaflet/dist/images/marker-icon.png').default || require('leaflet/dist/images/marker-icon.png'),
          shadowUrl: require('leaflet/dist/images/marker-shadow.png').default || require('leaflet/dist/images/marker-shadow.png'),
        })
        setIsMounted(true)
      })
    }

    return () => {
      if (mapRef.current) {
        try {
          mapRef.current.off()
          mapRef.current.remove()
        } catch (e) {
          // Cleanup silently
        }
      }
    }
  }, [])

  // Get user's current location
  const getCurrentLocation = () => {
    setIsLocating(true)
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const newLocation = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          }

          const lastLocation = userLocation
          const shouldReverseGeocode = !lastLocation ||
            calculateDistance(lastLocation.lat, lastLocation.lng, newLocation.lat, newLocation.lng) > 0.1

          if (shouldReverseGeocode) {
            try {
              const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
              if (!apiKey) {
                console.warn('Google Maps API key not found')
              } else {
                const response = await fetch(
                  `https://maps.googleapis.com/maps/api/geocode/json?latlng=${newLocation.lat},${newLocation.lng}&key=${apiKey}`
                )
                const data = await response.json()
                if (data.results && data.results.length > 0) {
                  // Get a readable address, usually the first formatted_address is good
                  (newLocation as any).address = data.results[0].formatted_address
                }
              }
            } catch (error) {
              // Silently fail
              console.warn('Error reverse geocoding with Google Maps:', error)
            }
          } else {
            (newLocation as any).address = lastLocation?.address
          }

          onLocationUpdate?.(newLocation)
          setIsLocating(false)
        },
        () => {
          setIsLocating(false)
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
      )
    }
  }

  // Calculate distance between two points
  const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number) => {
    const R = 6371
    const dLat = (lat2 - lat1) * Math.PI / 180
    const dLng = (lng2 - lng1) * Math.PI / 180
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return R * c
  }

  // Format distance
  const formatDistance = (distance: number) => {
    if (distance < 1) {
      return `${Math.round(distance * 1000)}m`
    }
    return `${distance.toFixed(1)}km`
  }

  // Open directions to event
  const openDirections = (event: DiscoveryEvent) => {
    if (event.location?.coordinates) {
      const [lng, lat] = event.location.coordinates
      const url = `https://www.google.com/maps/dir/${userLocation.lat},${userLocation.lng}/${lat},${lng}`
      window.open(url, '_blank')
    }
  }

  // Create custom markers
  const createEventIcon = useMemo(() => {
    return (category: string, color: string, isSelected: boolean = false) => {
      if (!L) return null
      const icon = categoryIcons[category.toLowerCase()] || '📍'
      const size = isSelected ? 44 : 36

      return L.divIcon({
        html: `
        <div style="position: relative; width: ${size}px; height: ${size}px;">
          <div style="
            position: absolute;
            top: -20%;
            left: -20%;
            width: 140%;
            height: 140%;
            background: ${color};
            border-radius: 50%;
            filter: blur(10px);
            opacity: 0.6;
            animation: pulse-glow 2s infinite alternate;
          "></div>
          <div style="
            position: relative;
            background: rgba(20, 20, 25, 0.9);
            width: 100%;
            height: 100%;
            border-radius: 50%;
            border: 2px solid ${color};
            box-shadow: 0 0 15px ${color}80, inset 0 0 10px ${color}40;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: ${isSelected ? '22px' : '18px'};
            cursor: pointer;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            backdrop-filter: blur(4px);
            ${isSelected ? `transform: scale(1.1); box-shadow: 0 0 25px ${color}, inset 0 0 15px ${color}80; z-index: 1000;` : ''}
          ">${icon}</div>
        </div>
        <style>
          @keyframes pulse-glow {
            0% { transform: scale(0.95); opacity: 0.4; }
            100% { transform: scale(1.15); opacity: 0.8; }
          }
        </style>`,
        className: 'custom-event-marker',
        iconSize: [size, size],
        iconAnchor: [size / 2, size],
        popupAnchor: [0, -size]
      })
    }
  }, [L])

  const getUserLocationIcon = useMemo(() => {
    return () => {
      if (!L) return null
      return L.divIcon({
        html: `<div style="
          background-color: #3b82f6;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          border: 3px solid white;
          box-shadow: 0 0 10px rgba(59,130,246,0.5);
          position: relative;
        ">
          <div style="
            position: absolute;
            top: -3px;
            left: -3px;
            width: 22px;
            height: 22px;
            border-radius: 50%;
            border: 2px solid #3b82f6;
            animation: pulse 2s infinite;
            opacity: 0.6;
          "></div>
        </div>
        <style>
          @keyframes pulse {
            0% { transform: scale(0.8); opacity: 1; }
            50% { transform: scale(1.2); opacity: 0.3; }
            100% { transform: scale(0.8); opacity: 1; }
          }
        </style>`,
        className: 'user-location-marker',
        iconSize: [16, 16],
        iconAnchor: [8, 8],
      })
    }
  }, [L])

  // Custom cluster icon
  const createClusterCustomIcon = function (cluster: any) {
    if (!L) return null;
    return L.divIcon({
      html: `<div class="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm border-2 border-primary-500 text-primary-600 dark:text-primary-400 font-bold rounded-full w-10 h-10 flex items-center justify-center shadow-lg shadow-primary-500/30 transform transition-transform hover:scale-110">
        ${cluster.getChildCount()}
      </div>`,
      className: 'custom-marker-cluster',
      iconSize: L.point(40, 40, true),
    });
  };

  if (!isMounted || !L) {
    return (
      <div className="relative h-full w-full bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center">
        <div className="text-gray-600 dark:text-gray-400">Loading map...</div>
      </div>
    )
  }

  return (
    <div className="relative h-full w-full">
      {/* Map Controls */}
      <div className="absolute top-4 right-4 z-[1000] flex flex-col gap-2">
        <Button
          onClick={getCurrentLocation}
          disabled={isLocating}
          size="sm"
          variant="secondary"
          className="bg-white/90 backdrop-blur-sm hover:bg-white/100 shadow-lg"
        >
          <Locate className={`w-4 h-4 ${isLocating ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      <MapContainer
        center={[userLocation.lat, userLocation.lng]}
        zoom={13}
        className="h-full w-full rounded-lg z-0"
        ref={mapRef}
        zoomControl={false}
        scrollWheelZoom={true}
        style={{ background: '#242f3e' }} // Prevent white flash
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          className="map-tiles"
        />

        {/* User location marker */}
        <Marker
          position={[userLocation.lat, userLocation.lng]}
          icon={getUserLocationIcon()}
        >
          <Popup>
            <div className="text-center">
              <div className="font-semibold text-blue-600">Tu ubicación</div>
              {userLocation.address && (
                <div className="text-sm text-gray-600 mt-1">
                  {userLocation.address}
                </div>
              )}
            </div>
          </Popup>
        </Marker>

        {/* Search radius circle */}
        {showRadius && (
          <Circle
            center={[userLocation.lat, userLocation.lng]}
            radius={radiusKm * 1000}
            pathOptions={{
              color: '#3b82f6',
              fillColor: '#3b82f6',
              fillOpacity: 0.1,
              weight: 2,
              dashArray: '5, 5'
            }}
          />
        )}

        {/* Group markers with MarkerClusterGroup for super glassmorphism clusters */}
        <MarkerClusterGroup
          chunkedLoading
          iconCreateFunction={createClusterCustomIcon}
          maxClusterRadius={50}
          showCoverageOnHover={false}
          spiderfyOnMaxZoom={true}
        >
          {/* Event or Tribe markers */}
          {(viewType === 'events' ? events : tribes).map((item) => {
            if (!item.location?.coordinates) return null

            const [lng, lat] = item.location.coordinates
            const isSelected = viewType === 'events'
              ? selectedEvent?._id === item._id
              : selectedItem?._id === item._id

            const categoryStr = (item.category as string) || 'other'
            const color = categoryColors[categoryStr] || '#6366F1'
            const distance = calculateDistance(userLocation.lat, userLocation.lng, lat, lng)

            return (
              <Marker
                key={item._id}
                position={[lat, lng]}
                icon={createEventIcon(categoryStr, color, isSelected)}
                eventHandlers={{
                  click: () => {
                    if (viewType === 'events' && onEventSelect) {
                      onEventSelect(item as DiscoveryEvent)
                    } else if (viewType === 'tribes' && onTribeSelect) {
                      onTribeSelect(item)
                    }
                  },
                }}
              >
                <Popup>
                  <div className="min-w-[250px] p-2">
                    <div className="flex items-start gap-3">
                      {item.images && item.images.length > 0 && (
                        <img
                          src={typeof item.images[0] === 'string' ? item.images[0] : item.images[0].url}
                          alt={item.title || item.name}
                          className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 truncate">
                          {item.title || item.name}
                        </h3>
                        <p className="text-sm text-gray-600 line-clamp-2 mb-2">
                          {item.description}
                        </p>

                        <div className="flex items-center gap-4 text-xs text-gray-500 mb-2">
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {formatDistance(distance)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Star className="w-3 h-3" />
                            {categoryStr}
                          </span>
                        </div>

                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => {
                              if (viewType === 'events' && onEventSelect) {
                                onEventSelect(item as DiscoveryEvent)
                              } else if (viewType === 'tribes' && onTribeSelect) {
                                onTribeSelect(item)
                              }
                            }}
                            className="flex-1"
                          >
                            Ver detalles
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openDirections(item as DiscoveryEvent)}
                          >
                            <Route className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </Popup>
              </Marker>
            )
          })}
        </MarkerClusterGroup>
        <MapEvents onMoveEnd={onMoveEnd} />
      </MapContainer>
    </div>
  )
}
