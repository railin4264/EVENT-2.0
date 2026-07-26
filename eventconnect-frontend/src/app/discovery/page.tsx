
'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import type { Event } from '@/types/api.types'
import { motion, AnimatePresence } from 'framer-motion'
import dynamic from 'next/dynamic'
import { MapPin, Search, Filter, Calendar, Clock, Users, Star, Heart, X, Info, FileText } from 'lucide-react'

// Alias para iconos faltantes
import { MapPin as Navigation, Star as DollarSign, Star as Sliders, Star as Grid, Star as List, Star as Target, Star as Music, Star as Palette, FileText as Code, Star as Utensils, Star as Dumbbell, Star as GraduationCap } from 'lucide-react'
import { useEventsStore } from '@/stores/eventsStore'
import LoadingSpinner from '@/components/redesign/ui/loading-spinner'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { getDiscoveryEvents, attendEvent, type DiscoveryEvent as DiscoveryEventType } from '@/lib/api/events'
import { tribesService } from '@/lib/api/services/tribes.service'
import { useAnalytics } from '@/components/providers/AnalyticsProvider'
import QuickFilters, { type QuickFilterType } from '@/components/discovery/QuickFilters'
import { useFavorites } from '@/hooks/useFavorites'
import ShareButton from '@/components/discovery/ShareButton'
import CountdownTimer from '@/components/discovery/CountdownTimer'
import ParallaxCard from '@/components/discovery/ParallaxCard'
import { useToast } from '@/components/redesign/ui/use-toast'
import { ImageWithFallback } from '@/components/redesign/figma/ImageWithFallback'
import { CldImage } from 'next-cloudinary'
import { EmptyState } from '@/components/ui/EmptyState'

// Componente de mapa personalizado para evitar problemas de SSR
const LazyMapComponent = dynamic(() => import('@/components/discovery/LazyMapComponent'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
      <LoadingSpinner variant="branded" size="lg" text="Cargando mapa..." />
    </div>
  )
})

interface EventLocation {
  type: string
  coordinates: [number, number]
  address: string
  venue?: string
}

// Use the type from the API
type DiscoveryEvent = DiscoveryEventType

// Alias for Tribe to use in the map
type DiscoveryTribe = Awaited<ReturnType<typeof tribesService.getNearbyTribes>>['data'][0]

interface UserLocation {
  lat: number
  lng: number
  address?: string
}

const categoryIcons = {
  'tecnología': Code,
  'música': Music,
  'arte': Palette,
  'gastronomía': Utensils,
  'deportes': Dumbbell,
  'educación': GraduationCap,
  'networking': Users,
  'entretenimiento': Star,
  'cultura': Heart,
  'salud': Target
}

const categoryColors = {
  'tecnología': '#3B82F6',
  'música': '#8B5CF6',
  'arte': '#EC4899',
  'gastronomía': '#F59E0B',
  'deportes': '#10B981',
  'educación': '#6366F1',
  'networking': '#EF4444',
  'entretenimiento': '#F97316',
  'cultura': '#84CC16',
  'salud': '#06B6D4'
}

export default function DiscoveryPage() {
  const [viewMode, setViewMode] = useState<'map' | 'list'>('map')
  const [viewType, setViewType] = useState<'events' | 'tribes'>('events')
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null)
  const [selectedEvent, setSelectedEvent] = useState<DiscoveryEvent | null>(null)
  const [selectedTribe, setSelectedTribe] = useState<DiscoveryTribe | null>(null)
  const [searchRadius, setSearchRadius] = useState(10) // km
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [priceRange, setPriceRange] = useState([0, 1000])
  const [showFilters, setShowFilters] = useState(false)
  const [isLocationLoading, setIsLocationLoading] = useState(true)
  const [quickFilter, setQuickFilter] = useState<QuickFilterType>(null)

  // New Filter States
  const [searchLocation, setSearchLocation] = useState('')
  const [activeVibe, setActiveVibe] = useState<string | null>(null)
  const [onlyFree, setOnlyFree] = useState(false)

  // Debounced filters to reduce API calls
  const [debouncedRadius, setDebouncedRadius] = useState(searchRadius)
  const [debouncedPriceRange, setDebouncedPriceRange] = useState(priceRange)

  // Analytics tracking
  const { trackEventInteraction, trackClick, trackFeatureUsage } = useAnalytics()

  // Favorites hook
  const { toggleFavorite, isFavorite } = useFavorites()

  // Query client for refetching
  const queryClient = useQueryClient()
  const { toast } = useToast()

  // Debounce filters to prevent excessive API calls
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedRadius(searchRadius)
    }, 500)
    return () => clearTimeout(timer)
  }, [searchRadius])

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedPriceRange(priceRange)
    }, 500)
    return () => clearTimeout(timer)
  }, [priceRange])

  // Request user location automatically on mount with high accuracy
  useEffect(() => {
    if (typeof window !== 'undefined' && 'geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const newLocation: UserLocation = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          }

          // Get address via reverse geocoding using Google Maps API
          try {
            const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
            if (apiKey) {
              const response = await fetch(
                `https://maps.googleapis.com/maps/api/geocode/json?latlng=${newLocation.lat},${newLocation.lng}&key=${apiKey}`
              )
              const data = await response.json()
              if (data.results && data.results.length > 0) {
                newLocation.address = data.results[0].formatted_address
              }
            } else {
              console.warn('Google Maps API Key missing for Geocoding')
            }
          } catch (error) {
            console.warn('Could not get address for location using Google Maps')
          }

          setUserLocation(newLocation)
          setIsLocationLoading(false)

          // Track location permission granted
          trackFeatureUsage?.('location_permission_granted')
        },
        (error) => {
          console.warn('Geolocation error:', error.message)
          // Fallback to default location
          setUserLocation({
            lat: 19.4326,
            lng: -99.1332,
            address: 'Ciudad de México, México'
          })
          setIsLocationLoading(false)
          trackFeatureUsage?.('location_permission_denied')
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        }
      )

      // Watch position for continuous updates
      const watchId = navigator.geolocation.watchPosition(
        async (position) => {
          const newLocation: UserLocation = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          }

          // Only update if moved more than 100m to reduce API calls
          if (userLocation) {
            const distance = calculateDistance(
              userLocation.lat,
              userLocation.lng,
              newLocation.lat,
              newLocation.lng
            )
            if (distance < 0.1) return // Less than 100m, ignore update
          }

          setUserLocation(newLocation)
        },
        (error) => {
          console.warn('Watch position error:', error.message)
        },
        {
          enableHighAccuracy: true,
          maximumAge: 300000 // 5 minutes
        }
      )

      return () => navigator.geolocation.clearWatch(watchId)
    } else {
      // Default location
      setUserLocation({
        lat: 19.4326,
        lng: -99.1332,
        address: 'Ciudad de México, México'
      })
      setIsLocationLoading(false)
    }
  }, [])

  // Calculate distance between two points using Haversine formula
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371 // Radius of the Earth in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180
    const dLon = (lon2 - lon1) * Math.PI / 180
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return R * c
  }

  // Fetch nearby events
  const { data: rawEvents, isLoading } = useQuery({
    queryKey: ['discovery-events', userLocation?.lat, userLocation?.lng, debouncedRadius, selectedCategories, debouncedPriceRange],
    queryFn: async () => {
      if (!userLocation) return []

      return await getDiscoveryEvents({
        lat: userLocation.lat,
        lng: userLocation.lng,
        radius: debouncedRadius,
        categories: selectedCategories.length > 0 ? selectedCategories : undefined,
        priceMin: debouncedPriceRange[0],
        priceMax: debouncedPriceRange[1],
        limit: 50
      })
    },
    enabled: !!userLocation && !isLocationLoading,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false
  })

  // Fetch nearby tribes
  const { data: rawTribes, isLoading: isTribesLoading } = useQuery({
    queryKey: ['discovery-tribes', userLocation?.lat, userLocation?.lng, debouncedRadius, selectedCategories],
    queryFn: async () => {
      if (!userLocation) return []

      const response = await tribesService.getNearbyTribes({
        lat: userLocation.lat,
        lng: userLocation.lng,
        radius: debouncedRadius * 1000 // Convert km to meters for backend
      })

      // Filter by category if selected
      let tribes = response.data || []
      if (selectedCategories.length > 0) {
        tribes = tribes.filter((t: any) => selectedCategories.includes(t.category?.toLowerCase()))
      }
      return tribes
    },
    enabled: !!userLocation && !isLocationLoading && viewType === 'tribes',
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false
  })

  // Process events with distance calculation and sorting
  const events = useMemo(() => {
    if (!rawEvents || !userLocation) return []

    // Events already have distance calculated from the API
    const eventsWithDistance = rawEvents.map((event: DiscoveryEvent) => {
      // If distance not calculated by API, calculate it here
      const distance = event.distance || calculateDistance(
        userLocation.lat,
        userLocation.lng,
        event.location?.coordinates?.[1] || 0, // lat
        event.location?.coordinates?.[0] || 0  // lng
      )

      return {
        ...event,
        distance: Math.round(distance * 10) / 10 // Round to 1 decimal
      }
    })

    // Sort by distance (closest first)
    return eventsWithDistance.sort((a, b) => (a.distance || 0) - (b.distance || 0))
  }, [rawEvents, userLocation])

  // Process tribes with distance calculation and sorting
  const tribes = useMemo(() => {
    if (!rawTribes || !userLocation) return []

    const tribesWithDistance = rawTribes.map((tribe: any) => {
      let distance = 0

      // If it has location coordinates (lng, lat)
      if (tribe.location && tribe.location.coordinates && tribe.location.coordinates.length === 2) {
        distance = calculateDistance(
          userLocation.lat,
          userLocation.lng,
          tribe.location.coordinates[1], // lat
          tribe.location.coordinates[0]  // lng
        )
      }

      return {
        ...tribe,
        distance: Math.round(distance * 10) / 10
      }
    })

    return tribesWithDistance.sort((a, b) => (a.distance || 0) - (b.distance || 0))
  }, [rawTribes, userLocation])

  const handleCategoryFilter = (category: string) => {
    setSelectedCategories(prev => {
      const newCategories = prev.includes(category)
        ? prev.filter(c => c !== category)
        : [...prev, category]

      // Track filter usage
      trackClick('category_filter', {
        category,
        action: prev.includes(category) ? 'remove' : 'add',
        totalFilters: newCategories.length
      })

      return newCategories
    })
  }

  const handleEventSelect = (event: DiscoveryEvent) => {
    setSelectedEvent(event)

    // Track event view
    trackEventInteraction('view', event._id, {
      eventTitle: event.title,
      eventCategory: event.category,
      distance: event.distance,
      price: event.price?.amount || 0,
      viewMode,
      source: 'discovery_page'
    })
  }

  const handleTribeSelect = (tribe: DiscoveryTribe) => {
    setSelectedTribe(tribe)
    trackEventInteraction('view_tribe', tribe._id, {
      tribeName: tribe.name,
      tribeCategory: tribe.category,
      distance: tribe.distance,
      viewMode,
      source: 'discovery_page'
    })
  }

  const handleViewModeChange = (mode: 'map' | 'list') => {
    setViewMode(mode)
    trackFeatureUsage('view_mode_toggle', 'complete', {
      newMode: mode,
      previousMode: viewMode
    })
  }

  const formatPrice = (price?: { amount: number; currency: string }) => {
    if (!price || price.amount === 0) return 'Gratis'
    return `${price.amount} ${price.currency}`
  }

  const formatDistance = (distance?: number) => {
    if (!distance) return ''
    if (distance < 1) {
      const meters = Math.round(distance * 1000)
      return `${meters} metro${meters !== 1 ? 's' : ''}`
    }
    return `${distance.toFixed(1)} km`
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // Apply quick filters
  const filteredEvents = useMemo(() => {
    if (!quickFilter) return events

    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const todayEnd = new Date(today.getTime() + 24 * 60 * 60 * 1000)

    // Get day of week (0 = Sunday, 6 = Saturday)
    const dayOfWeek = now.getDay()
    const daysUntilSaturday = (6 - dayOfWeek + 7) % 7
    const saturday = new Date(today.getTime() + daysUntilSaturday * 24 * 60 * 60 * 1000)
    const sunday = new Date(saturday.getTime() + 24 * 60 * 60 * 1000)
    const mondayAfterWeekend = new Date(sunday.getTime() + 24 * 60 * 60 * 1000)

    return events.filter(event => {
      const eventDate = new Date(event.date)

      switch (quickFilter) {
        case 'now':
          // Events starting within the next 4 hours or already started today
          const fourHoursFromNow = new Date(now.getTime() + 4 * 60 * 60 * 1000)
          return eventDate >= today && eventDate <= fourHoursFromNow
        case 'today':
          return eventDate >= today && eventDate < todayEnd

        case 'weekend':
          return eventDate >= saturday && eventDate < mondayAfterWeekend

        case 'free':
          return !event.price || event.price.amount === 0

        case 'new':
          // Events created in the last 7 days
          const createdAt = new Date(event.createdAt || event.date)
          const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
          return createdAt >= sevenDaysAgo

        case 'popular':
          // Events with more attendees (top 50%)
          const sortedByAttendees = [...events].sort((a, b) => (b.attendees?.length || 0) - (a.attendees?.length || 0))
          const top50Percent = sortedByAttendees.slice(0, Math.ceil(sortedByAttendees.length / 2))
          return top50Percent.some(e => e._id === event._id)

        case 'trending':
          // Events with recent activity or high attendance rate
          const attendanceRate = (event.attendees?.length || 0) / event.maxAttendees
          return attendanceRate > 0.5

        default:
          return true
      }
    })
  }, [events, quickFilter])

  // Apply visual filters (Location Text, Vibe, Free) on top of QuickFilters
  const fullyFilteredEvents = useMemo(() => {
    return filteredEvents.filter(event => {
      // 1. Text Search by Location/Address
      if (searchLocation.trim() !== '') {
        const query = searchLocation.toLowerCase()
        const addressMatch = event.location?.address?.toLowerCase().includes(query)
        const cityMatch = event.location?.city?.toLowerCase().includes(query)
        const venueMatch = event.location?.venue?.toLowerCase().includes(query)

        if (!addressMatch && !cityMatch && !venueMatch) return false
      }

      // 2. Only Free Filter
      if (onlyFree) {
        if (event.price && event.price.amount > 0) return false
      }

      // 3. Vibe Filter (Mapped to categories/tags)
      if (activeVibe) {
        const vibeMappings: Record<string, string[]> = {
          'chill': ['arte', 'cultura', 'salud'],
          'fiesta': ['música', 'entretenimiento'],
          'aprendizaje': ['tecnología', 'educación', 'networking'],
          'aventura': ['deportes', 'gastronomía']
        }

        const mappedCategories = vibeMappings[activeVibe] || []
        const matchesCategory = mappedCategories.includes(event.category.toLowerCase())
        // You can also check event.tags if necessary

        if (!matchesCategory) return false
      }

      return true
    })
  }, [filteredEvents, searchLocation, onlyFree, activeVibe])

  if (isLocationLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <LoadingSpinner variant="branded" size="xl" text="Obteniendo ubicación..." fullScreen />
      </div>
    )
  }

  if (!userLocation) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <MapPin className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Ubicación requerida
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Necesitamos tu ubicación para mostrar eventos cercanos
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-white/80 dark:bg-gray-800/90 backdrop-blur-md border-b border-gray-200/50 dark:border-gray-700/50 supports-[backdrop-filter]:bg-white/60">
        <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-primary-500/50 to-transparent opacity-50" />
        <div className="max-w-7xl mx-auto p-4 flex items-center justify-between relative">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
              Descubrimiento
            </h1>
            <p className="text-gray-600 dark:text-gray-400 flex items-center gap-2 text-sm">
              <Navigation className="w-4 h-4 text-primary-500" />
              <span className="font-medium">
                {viewType === 'events' ? fullyFilteredEvents.length : tribes.length}
              </span>
              {viewType === 'events' ? 'eventos' : 'tribus'} cerca de ti
            </p>
          </div>

          {/* Type Toggle (Events / Tribes) */}
          <div className="absolute left-1/2 -translate-x-1/2 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl shadow-inner hidden md:flex items-center">
            <button
              onClick={() => {
                setViewType('events')
                setSelectedTribe(null)
              }}
              className={`px-6 py-2 rounded-lg text-sm font-semibold transition-all ${viewType === 'events'
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
            >
              Eventos
            </button>
            <button
              onClick={() => {
                setViewType('tribes')
                setSelectedEvent(null)
              }}
              className={`px-6 py-2 rounded-lg text-sm font-semibold transition-all ${viewType === 'tribes'
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
            >
              Tribus
            </button>
          </div>

          <div className="flex items-center gap-3">
            {/* Search Location Input */}
            <div className="hidden lg:flex items-center bg-gray-100 dark:bg-gray-700 rounded-lg px-3 py-2">
              <MapPin className="w-4 h-4 text-gray-500 mr-2" />
              <input
                type="text"
                placeholder="Ciudad o zona..."
                value={searchLocation}
                onChange={(e) => setSearchLocation(e.target.value)}
                className="bg-transparent border-0 text-sm focus:ring-0 w-32 dark:text-white placeholder-gray-500"
              />
            </div>

            {/* Search Radius */}
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-gray-500" />
              <select
                value={searchRadius}
                onChange={(e) => setSearchRadius(Number(e.target.value))}
                className="px-3 py-2 bg-gray-100 dark:bg-gray-700 border-0 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 dark:text-white"
              >
                <option value={1}>1km</option>
                <option value={5}>5km</option>
                <option value={10}>10km</option>
                <option value={25}>25km</option>
                <option value={50}>50km</option>
              </select>
            </div>

            {/* Filters */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${showFilters
                ? 'bg-primary-600 text-white'
                : 'bg-primary-500 hover:bg-primary-600 text-white'
                }`}
            >
              <Filter className="w-4 h-4" />
              Filtros
              {(selectedCategories.length > 0 || priceRange[1] < 1000) && (
                <span className="bg-white/20 rounded-full w-2 h-2"></span>
              )}
            </button>

            {/* View Mode Toggle */}
            <div className="flex items-center bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
              <button
                onClick={() => handleViewModeChange('map')}
                className={`p-2 rounded-md transition-colors ${viewMode === 'map' ? 'bg-white dark:bg-gray-600 shadow' : ''
                  }`}
                title="Vista de mapa"
              >
                <MapPin className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleViewModeChange('list')}
                className={`p-2 rounded-md transition-colors ${viewMode === 'list' ? 'bg-white dark:bg-gray-600 shadow' : ''
                  }`}
                title="Vista de lista"
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Filters Panel */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 overflow-hidden"
          >
            <div className="p-4 max-w-7xl mx-auto">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Category Filters */}
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Categorías</h3>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(categoryIcons).map(([category, Icon]) => {
                      const isSelected = selectedCategories.includes(category)

                      return (
                        <button
                          key={category}
                          onClick={() => handleCategoryFilter(category)}
                          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${isSelected
                            ? 'text-white'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                            }`}
                          style={isSelected ? { backgroundColor: categoryColors[category as keyof typeof categoryColors] } : {}}
                        >
                          <Icon className="w-4 h-4" />
                          {category.charAt(0).toUpperCase() + category.slice(1)}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Price Range & Free Toggle */}
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="font-semibold text-gray-900 dark:text-white">Presupuesto</h3>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Solo Gratis</span>
                      <div className="relative inline-block w-10 mr-2 align-middle select-none transition duration-200 ease-in">
                        <input
                          type="checkbox"
                          checked={onlyFree}
                          onChange={(e) => setOnlyFree(e.target.checked)}
                          className="toggle-checkbox absolute block w-5 h-5 rounded-full bg-white border-4 appearance-none cursor-pointer transition-transform duration-200 ease-in-out border-gray-300 dark:border-gray-600 checked:translate-x-5 checked:border-primary-500"
                        />
                        <div className={`toggle-label block overflow-hidden h-5 rounded-full ${onlyFree ? 'bg-primary-500' : 'bg-gray-300 dark:bg-gray-600'}`}></div>
                      </div>
                    </label>
                  </div>

                  {!onlyFree && (
                    <div className="space-y-2 mt-4">
                      <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
                        <span>$0</span>
                        <span>$1000+</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="1000"
                        value={priceRange[1]}
                        onChange={(e) => setPriceRange([0, Number(e.target.value)])}
                        className="w-full accent-primary-500"
                      />
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Hasta: {priceRange[1] === 1000 ? '$1000+' : `$${priceRange[1]}`}
                      </p>
                    </div>
                  )}
                </div>

                {/* Results Count */}
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Resultados</h3>
                  <div className="text-3xl font-bold text-primary-600 mb-2">
                    {fullyFilteredEvents.length}
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    eventos encontrados en {searchRadius}km
                  </p>
                  {selectedCategories.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {selectedCategories.map(category => (
                        <span
                          key={category}
                          className="px-2 py-1 text-xs rounded-full text-white"
                          style={{ backgroundColor: categoryColors[category as keyof typeof categoryColors] }}
                        >
                          {category}
                        </span>
                      ))}
                    </div>
                  )}
                  {/* Vibe Buttons Selection */}
                  <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-3 text-sm">O busca por "Vibra"</h3>
                    <div className="flex flex-wrap gap-2">
                      {[
                        { id: 'chill', label: 'Chill 🧘‍♀️', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800' },
                        { id: 'fiesta', label: 'Fiesta 🎉', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 border-purple-200 dark:border-purple-800' },
                        { id: 'aprendizaje', label: 'Aprender 🧠', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800' },
                        { id: 'aventura', label: 'Aventura 🧗‍♂️', color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 border-orange-200 dark:border-orange-800' }
                      ].map(vibe => (
                        <button
                          key={vibe.id}
                          onClick={() => setActiveVibe(activeVibe === vibe.id ? null : vibe.id)}
                          className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${activeVibe === vibe.id ? `${vibe.color} ring-2 ring-offset-1 ring-primary-500` : 'bg-gray-50 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                        >
                          {vibe.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Quick Filters */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 py-4">
        <div className="max-w-7xl mx-auto px-4">
          <QuickFilters
            activeFilter={quickFilter}
            onFilterChange={(filter) => {
              setQuickFilter(filter)
              trackClick('quick_filter', { filter: filter || 'none' })
            }}
          />
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {viewMode === 'map' ? (
          /* Map View */
          <div className="flex-1 relative">
            {isLoading || isTribesLoading ? (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-800 z-10">
                <LoadingSpinner variant="branded" size="lg" text="Cargando mapa..." />
              </div>
            ) : (
              <LazyMapComponent
                userLocation={userLocation}
                events={viewType === 'events' ? fullyFilteredEvents : []}
                tribes={viewType === 'tribes' ? tribes : []}
                selectedItem={viewType === 'events' ? selectedEvent : selectedTribe}
                onEventSelect={handleEventSelect}
                onTribeSelect={handleTribeSelect}
                categoryColors={categoryColors}
                showRadius={true}
                radiusKm={searchRadius}
                onLocationUpdate={setUserLocation}
                viewType={viewType}
              />
            )}

            {/* Event/Tribe Details Sidebar */}
            <AnimatePresence>
              {(selectedEvent || selectedTribe) && (
                <motion.div
                  initial={{ x: 400, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: 400, opacity: 0 }}
                  className="absolute top-0 right-0 w-96 h-full bg-white dark:bg-gray-800 shadow-2xl border-l border-gray-200 dark:border-gray-700 overflow-y-auto z-[1001]"
                >
                  <div className="p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold"
                          style={{ backgroundColor: categoryColors[(selectedEvent?.category || selectedTribe?.category || 'other') as keyof typeof categoryColors] }}
                        >
                          {(selectedEvent?.category || selectedTribe?.category || 'O')[0].toUpperCase()}
                        </div>
                        <div>
                          <span className="px-3 py-1 bg-primary-100 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300 rounded-full text-sm font-medium">
                            {selectedEvent?.category || selectedTribe?.category}
                          </span>
                          <p className="text-sm text-gray-500 mt-1 flex items-center gap-1">
                            <Navigation className="w-3 h-3" />
                            {formatDistance(selectedEvent?.distance || selectedTribe?.distance)}
                          </p>
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          setSelectedEvent(null)
                          setSelectedTribe(null)
                        }}
                        className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>

                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                      {selectedEvent ? selectedEvent.title : selectedTribe?.name}
                    </h2>

                    {/* Countdown Timer (Events only) */}
                    {selectedEvent && (
                      <div className="mb-6">
                        <CountdownTimer
                          eventDate={selectedEvent.date}
                          compact={false}
                          showIcon={true}
                        />
                      </div>
                    )}

                    <p className="text-gray-600 dark:text-gray-400 mb-6 leading-relaxed">
                      {selectedEvent ? selectedEvent.description : selectedTribe?.description}
                    </p>

                    <div className="space-y-4 mb-6">
                      {selectedEvent && (
                        <div className="flex items-center gap-3">
                          <Calendar className="w-5 h-5 text-gray-400 flex-shrink-0" />
                          <span className="text-gray-900 dark:text-white">
                            {formatDate(selectedEvent.date)}
                          </span>
                        </div>
                      )}

                      <div className="flex items-start gap-3">
                        <MapPin className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-gray-900 dark:text-white font-medium">
                            {selectedEvent ? selectedEvent.location.address : (selectedTribe?.location?.address || 'Ubicación no especificada')}
                          </p>
                          {selectedEvent && selectedEvent.location.city && (
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              {selectedEvent.location.city}{selectedEvent.location.country && `, ${selectedEvent.location.country}`}
                            </p>
                          )}
                        </div>
                      </div>

                      {selectedEvent && (
                        <div className="flex items-center gap-3">
                          <DollarSign className="w-5 h-5 text-gray-400 flex-shrink-0" />
                          <div>
                            <span className={`font-semibold ${selectedEvent.price?.amount || 0 === 0
                              ? 'text-green-600 dark:text-green-400'
                              : 'text-gray-900 dark:text-white'
                              }`}>
                              {formatPrice(selectedEvent.price)}
                            </span>
                            {selectedEvent.price?.amount || 0 === 0 && (
                              <p className="text-xs text-green-600 dark:text-green-400">
                                ¡Entrada libre!
                              </p>
                            )}
                          </div>
                        </div>
                      )}

                      <div className="flex items-center gap-3">
                        <Users className="w-5 h-5 text-gray-400 flex-shrink-0" />
                        <div>
                          <span className="text-gray-900 dark:text-white font-medium">
                            {selectedEvent ? `${(selectedEvent.attendees?.length || 0)}/${selectedEvent.maxAttendees}` : selectedTribe?.membersCount}
                          </span>
                          <span className="text-gray-600 dark:text-gray-400 ml-2">
                            {selectedEvent ? 'asistentes' : 'miembros'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <Info className="w-5 h-5 text-gray-400 flex-shrink-0" />
                        <div>
                          <p className="text-gray-900 dark:text-white font-medium">
                            Creado por {selectedEvent ? `${selectedEvent.createdBy.firstName} ${selectedEvent.createdBy.lastName}` : 'Administrador'}
                          </p>
                          {selectedEvent && (
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              @{selectedEvent.createdBy.username}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    {(selectedEvent?.tags || (selectedTribe && 'tags' in selectedTribe) ? (selectedTribe as any).tags : [])?.length > 0 && (
                      <div className="mb-6">
                        <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Etiquetas</h3>
                        <div className="flex flex-wrap gap-2">
                          {(selectedEvent?.tags || ((selectedTribe && 'tags' in selectedTribe) ? (selectedTribe as any).tags : []))?.map((tag: string) => (
                            <span
                              key={tag}
                              className="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-full text-sm"
                            >
                              #{tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="space-y-3">
                      {selectedEvent ? (
                        selectedEvent.isAttending ? (
                          <button
                            onClick={async () => {
                              try {
                                const { leaveEvent } = await import('@/lib/api/events')
                                await leaveEvent(selectedEvent._id)

                                // Update local state immediately
                                setSelectedEvent({
                                  ...selectedEvent,
                                  isAttending: false,
                                  attendees: selectedEvent.attendees.filter(a => a.user !== 'me') // Optimistic update
                                })

                                trackEventInteraction('leave', selectedEvent._id, {
                                  eventTitle: selectedEvent.title,
                                  source: 'discovery_sidebar'
                                })
                                toast({
                                  title: 'Has salido del evento',
                                  description: `Ya no asistes a "${selectedEvent.title}"`,
                                })
                                await queryClient.invalidateQueries({ queryKey: ['discovery-events'] })
                              } catch (error: any) {
                                console.error('Error leaving event:', error)
                                toast({
                                  title: 'Error',
                                  description: error.response?.data?.message || 'No se pudo salir del evento',
                                  variant: 'destructive'
                                })
                              }
                            }}
                            className="w-full px-4 py-3 bg-gray-500 hover:bg-gray-600 text-white rounded-xl font-semibold transition-all hover:scale-[1.02] active:scale-[0.98]"
                          >
                            Salir del Evento
                          </button>
                        ) : (
                          <button
                            onClick={async () => {
                              try {
                                await attendEvent(selectedEvent._id)

                                // Update local state immediately
                                setSelectedEvent({
                                  ...selectedEvent,
                                  isAttending: true,
                                  attendees: [...selectedEvent.attendees, { _id: 'temp', user: 'me' } as any] // Optimistic update
                                })

                                trackEventInteraction('attend', selectedEvent._id, {
                                  eventTitle: selectedEvent.title,
                                  source: 'discovery_sidebar'
                                })
                                toast({
                                  title: 'Te has unido al evento',
                                  description: `Ahora asistes a "${selectedEvent.title}"`,
                                })
                                await queryClient.invalidateQueries({ queryKey: ['discovery-events'] })
                              } catch (error: any) {
                                console.error('Error attending event:', error)
                                toast({
                                  title: 'Error',
                                  description: error.response?.data?.message || 'No se pudo unir al evento',
                                  variant: 'destructive'
                                })
                              }
                            }}
                            className="w-full px-4 py-3 bg-primary-500 hover:bg-primary-600 text-white rounded-xl font-semibold transition-all hover:scale-[1.02] active:scale-[0.98]"
                          >
                            Unirse al Evento
                          </button>
                        )
                      ) : (
                        <button
                          onClick={() => {
                            // Integrate with tribe joining logic
                            toast({
                              title: 'Función en desarrollo',
                              description: 'La función para unirse a tribus desde el mapa estará disponible pronto.'
                            })
                          }}
                          className="w-full px-4 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-semibold shadow-lg shadow-primary-500/30 transition-all hover:shadow-primary-500/50 hover:scale-[1.02] active:scale-[0.98]"
                        >
                          Unirse a la Tribu
                        </button>
                      )}
                    </div>

                    {/* Favorite & Share (Events only for now) */}
                    {selectedEvent && (
                      <div className="flex gap-3">
                        <motion.button
                          onClick={() => {
                            toggleFavorite(selectedEvent._id)
                            trackClick('favorite_event', {
                              eventId: selectedEvent._id,
                              source: 'discovery_sidebar',
                              action: isFavorite(selectedEvent._id) ? 'remove' : 'add'
                            })
                          }}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-all ${isFavorite(selectedEvent._id)
                            ? 'bg-red-500 text-white shadow-lg shadow-red-500/30'
                            : 'border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
                            }`}
                        >
                          <Heart className={`w-4 h-4 ${isFavorite(selectedEvent._id) ? 'fill-current' : ''}`} />
                          <span className="text-sm">{isFavorite(selectedEvent._id) ? 'Guardado' : 'Guardar'}</span>
                        </motion.button>

                        <ShareButton
                          event={selectedEvent}
                          variant="button"
                          className="flex-1"
                          onShare={(platform) => {
                            trackClick('share_event', {
                              eventId: selectedEvent._id,
                              platform,
                              source: 'discovery_sidebar'
                            })
                          }}
                        />
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ) : (
          /* List View */
          <div className="flex-1 p-6 overflow-y-auto">
            <div className="max-w-4xl mx-auto">
              {isLoading ? (
                <div className="space-y-6">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="animate-pulse bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg">
                      <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-4"></div>
                      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-2"></div>
                      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3"></div>
                    </div>
                  ))}
                </div>
              ) : fullyFilteredEvents.length === 0 ? (
                <EmptyState
                  icon={Target}
                  title="No hay eventos cerca"
                  description="Intenta aumentar el radio de búsqueda o limpiar los filtros seleccionados."
                  actionLabel="Buscar en área más amplia"
                  actionOnClick={() => {
                    setSearchRadius(50)
                    setSelectedCategories([])
                    setPriceRange([0, 1000])
                    setSearchLocation('')
                    setActiveVibe(null)
                    setOnlyFree(false)
                  }}
                  className="my-12 py-16"
                />
              ) : (
                <div className="space-y-6">
                  {/* Trending Section Overlay */}
                  {fullyFilteredEvents.length > 3 && (
                    <div className="mb-8">
                      <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                        <Star className="w-5 h-5 text-yellow-500 fill-current" />
                        En Tendencia 🔥
                      </h3>
                      <div className="flex overflow-x-auto gap-4 pb-4 snap-x hide-scrollbar">
                        {fullyFilteredEvents.slice(0, 3).map((trendingEvent) => (
                          <div
                            key={`trending-${trendingEvent._id}`}
                            onClick={() => handleEventSelect(trendingEvent)}
                            className="min-w-[280px] sm:min-w-[320px] bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 rounded-2xl p-4 border border-primary-200 dark:border-primary-800/30 shadow-md cursor-pointer snap-start hover:scale-[1.02] transition-transform"
                          >
                            <div className="flex items-center gap-3 mb-3">
                              <div className="p-2 bg-primary-100 dark:bg-primary-900/50 rounded-lg text-primary-600 dark:text-primary-400">
                                <Navigation className="w-5 h-5" />
                              </div>
                              <div>
                                <h4 className="font-bold text-gray-900 dark:text-white line-clamp-1">{trendingEvent.title}</h4>
                                <p className="text-xs text-gray-500">{formatDate(trendingEvent.date)}</p>
                              </div>
                            </div>
                            <div className="flex items-center justify-between mt-auto">
                              <span className="text-xs font-semibold bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 px-2 py-1 rounded-full text-center">
                                {trendingEvent.category}
                              </span>
                              <span className="text-sm font-bold text-gray-900 dark:text-white">
                                {formatPrice(trendingEvent.price)}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="text-sm text-gray-600 dark:text-gray-400 mb-4 border-b border-gray-200 dark:border-gray-700 pb-2">
                    Eventos ordenados por distancia (más cercanos primero)
                  </div>

                  {fullyFilteredEvents.map((event, index) => (
                    <ParallaxCard
                      key={event._id}
                      className="bg-white dark:bg-gray-800 shadow-sm hover:shadow-xl border border-gray-100 dark:border-gray-700 group flex flex-col md:flex-row overflow-hidden"
                      onClick={() => handleEventSelect(event)}
                    >
                      {/* Event Image (Left side on desktop, top on mobile) */}
                      <div className="w-full md:w-48 h-48 md:h-auto z-[2] relative bg-gray-100 dark:bg-gray-700 flex-shrink-0">
                        {event.images && event.images.length > 0 && event.images[0].url ? (
                          event.images[0].url.startsWith('http') && !event.images[0].url.includes('res.cloudinary.com') ? (
                            <img src={event.images[0].url} alt={event.title} className="w-full h-full object-cover" />
                          ) : (
                            <CldImage src={event.images[0].url} alt={event.title} fill className="object-cover" sizes="(max-width: 768px) 100vw, 200px" />
                          )
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center text-gray-400">
                            <div
                              className="w-16 h-16 rounded-2xl flex items-center justify-center text-white font-bold text-2xl shadow-inner mb-2"
                              style={{ backgroundColor: categoryColors[event.category as keyof typeof categoryColors] }}
                            >
                              {event.category[0].toUpperCase()}
                            </div>
                            <span className="text-xs font-medium uppercase tracking-wider">{event.category}</span>
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>

                      {/* Card Content */}
                      <div className="flex-1 p-6 relative flex flex-col justify-between">

                        {/* Favorite & Share Buttons - Top Right */}
                        <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
                          <motion.button
                            onClick={(e) => {
                              e.stopPropagation()
                              toggleFavorite(event._id)
                            }}
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            className={`p-2.5 rounded-full backdrop-blur-sm transition-all ${isFavorite(event._id)
                              ? 'bg-red-500 text-white shadow-lg shadow-red-500/50'
                              : 'bg-white/90 dark:bg-gray-800/90 text-gray-600 dark:text-gray-400 hover:bg-red-50 dark:hover:bg-red-900/20'
                              }`}
                          >
                            <Heart className={`w-5 h-5 ${isFavorite(event._id) ? 'fill-current' : ''}`} />
                          </motion.button>

                          <ShareButton
                            event={event}
                            variant="icon"
                            className="backdrop-blur-sm bg-white/90 dark:bg-gray-800/90"
                            onShare={(platform) => {
                              trackClick('share_event', {
                                eventId: event._id,
                                platform,
                                source: 'discovery_list'
                              })
                            }}
                          />
                        </div>

                        <div className="flex flex-col md:flex-row md:items-start justify-between mb-4 gap-4 pr-24 md:pr-0">
                          <div className="flex items-start gap-4 flex-1">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-500 to-secondary-500 flex items-center justify-center text-white font-bold flex-shrink-0 shadow-sm border-2 border-white dark:border-gray-800 relative z-10">
                              {event.createdBy?.firstName?.[0] || 'A'}
                            </div>

                            {/* Social Proof Avatars */}
                            {event.attendees && (event.attendees?.length || 0) > 0 && (
                              <div className="flex -space-x-4 absolute top-12 left-6 z-0 mix-blend-multiply dark:mix-blend-normal opacity-60">
                                {[...Array(Math.min(3, (event.attendees?.length || 0)))].map((_, i) => (
                                  <div key={`sp-${i}`} className={`w-6 h-6 rounded-full border border-white dark:border-gray-800 bg-gray-300 dark:bg-gray-600 shadow-sm overflow-hidden flex items-center justify-center text-[10px] font-bold text-gray-700 dark:text-gray-300`}>
                                    {String.fromCharCode(65 + (i * (event.attendees?.length || 0) % 26))}
                                  </div>
                                ))}
                              </div>
                            )}

                            <div className="ml-2">
                              {event.attendees && (event.attendees?.length || 0) > 0 && (
                                <p className="text-[10px] text-gray-500 mb-1 ml-1 transform translate-x-4 animate-pulse">A {(event.attendees?.length || 0)} amigos les interesa</p>
                              )}
                              <div className="flex items-center gap-2 mb-1">
                                <h3 className="text-xl font-bold text-gray-900 dark:text-white line-clamp-1">
                                  {event.title}
                                </h3>
                              </div>
                              <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
                                <span className="font-semibold text-primary-600 dark:text-primary-400 flex items-center gap-1">
                                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: categoryColors[event.category as keyof typeof categoryColors] }} />
                                  {event.category}
                                </span>
                                <span className="flex items-center gap-1 font-medium bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-full">
                                  <Navigation className="w-3.5 h-3.5 text-gray-500" />
                                  {formatDistance(event.distance)}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Calendar className="w-3.5 h-3.5" />
                                  {formatDate(event.date)}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="flex flex-row md:flex-col items-center md:items-end justify-between md:justify-start gap-4 md:gap-1 mt-2 md:mt-0 pt-4 md:pt-0 border-t md:border-0 border-gray-100 dark:border-gray-700">
                            <div className={`text-lg font-extrabold ${event.price?.amount || 0 === 0
                              ? 'text-green-500'
                              : 'text-gray-900 dark:text-white'
                              }`}>
                              {formatPrice(event.price)}
                            </div>
                            <div className="flex -space-x-2">
                              {[...Array(Math.min(3, (event.attendees?.length || 0)))].map((_, i) => (
                                <div key={i} className="w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-600 border-2 border-white dark:border-gray-800" />
                              ))}
                              {(event.attendees?.length || 0) > 3 && (
                                <div className="w-6 h-6 rounded-full bg-gray-100 dark:bg-gray-700 border-2 border-white dark:border-gray-800 flex items-center justify-center text-[10px] font-medium text-gray-600 dark:text-gray-300">
                                  +{(event.attendees?.length || 0) - 3}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Countdown Timer */}
                        <div className="mb-4">
                          <CountdownTimer
                            eventDate={event.date}
                            compact={true}
                            showIcon={true}
                          />
                        </div>

                        <p className="text-gray-600 dark:text-gray-400 mb-4 line-clamp-2 md:line-clamp-3 leading-relaxed text-sm">
                          {event.description}
                        </p>

                        <div className="mt-auto pt-4 flex flex-wrap items-center justify-between gap-4 border-t border-gray-100 dark:border-gray-700/50">
                          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                            <MapPin className="w-4 h-4 flex-shrink-0" />
                            <span className="truncate max-w-[200px] md:max-w-xs">
                              {event.location.venue || event.location.address}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 ml-auto">
                            <span className="text-sm font-medium text-gray-500">
                              {(event.attendees?.length || 0)}/{event.maxAttendees} cupos
                            </span>
                          </div>
                        </div>

                        {event.tags.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-gray-100 dark:border-gray-700/50">
                            {event.tags.slice(0, 4).map(tag => (
                              <span
                                key={tag}
                                className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-md text-xs"
                              >
                                #{tag}
                              </span>
                            ))}
                            {event.tags.length > 4 && (
                              <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-md text-xs">
                                +{event.tags.length - 4} más
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Hover Effect Gradient */}
                      <div className="absolute inset-0 bg-gradient-to-br z-0 from-primary-500/0 via-transparent to-secondary-500/0 opacity-0 group-hover:opacity-5 transition-opacity duration-300 pointer-events-none rounded-2xl" />
                    </ParallaxCard>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div >
  )
}