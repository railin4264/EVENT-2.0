'use client'

import { useEffect, useMemo, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  MapPin,
  Calendar,
  Users,
  Search,
  Plus,
  Loader2,
  Compass,
  Navigation,
  Filter,
  X,
} from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { eventsService } from '@/lib/api/services'
import type { Event } from '@/types/models'
import toast from 'react-hot-toast'
import MapComponent from '@/components/discovery/MapComponent'

interface UserLocation {
  lat: number
  lng: number
  address?: string
}

const CATEGORY_COLORS: { [key: string]: string } = {
  music: '#8B5CF6',
  música: '#8B5CF6',
  sports: '#10B981',
  deportes: '#10B981',
  technology: '#3B82F6',
  tecnología: '#3B82F6',
  food: '#F59E0B',
  comida: '#F59E0B',
  gastronomía: '#F59E0B',
  art: '#EC4899',
  arte: '#EC4899',
  business: '#6366F1',
  education: '#14B8A6',
  other: '#64748B',
  party: '#F43F5E',
  health: '#22C55E',
}

const CATEGORY_OPTIONS = [
  { label: 'Todos', value: '' },
  { label: 'Música', value: 'music' },
  { label: 'Deportes', value: 'sports' },
  { label: 'Tecnología', value: 'technology' },
  { label: 'Gastronomía', value: 'food' },
  { label: 'Arte', value: 'art' },
  { label: 'Negocios', value: 'business' },
  { label: 'Salud', value: 'health' },
  { label: 'Fiesta', value: 'party' },
]

function formatDate(dateStr: string) {
  try {
    return new Date(dateStr).toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return ''
  }
}

export default function HomePage() {
  const router = useRouter()
  const { isAuthenticated } = useAuthStore()

  const [location, setLocation] = useState<UserLocation | null>(null)
  const [askLocation, setAskLocation] = useState(true)
  const [events, setEvents] = useState<Event[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null)
  const [category, setCategory] = useState('')
  const [search, setSearch] = useState('')
  const [showFilters, setShowFilters] = useState(false)

  const loadNearby = useCallback(
    async (loc: UserLocation) => {
      setIsLoading(true)
      try {
        const response = await eventsService.getNearbyEvents({
          latitude: loc.lat,
          longitude: loc.lng,
          radius: 50,
          limit: 100,
        })
        const list: Event[] = (response as any)?.events || (response as any)?.data || []
        setEvents(list)
        if (list.length === 0) {
          toast('No hay eventos cerca todavía — ¡sé el primero en crear uno!', { icon: '📍' })
        }
      } catch (error) {
        console.error('Error loading nearby events:', error)
        toast.error('No pudimos cargar eventos cercanos')
      } finally {
        setIsLoading(false)
      }
    },
    []
  )

  const requestLocation = () => {
    if (typeof window !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude }
          setLocation(loc)
          setAskLocation(false)
          loadNearby(loc)
        },
        () => {
          // Fallback to a global default so the map is never empty
          const fallback = { lat: 40.4168, lng: -3.7038, address: 'Madrid, España' }
          setLocation(fallback)
          setAskLocation(false)
          loadNearby(fallback)
        },
        { enableHighAccuracy: true, timeout: 10000 }
      )
    } else {
      const fallback = { lat: 40.4168, lng: -3.7038, address: 'Madrid, España' }
      setLocation(fallback)
      setAskLocation(false)
      loadNearby(fallback)
    }
  }

  useEffect(() => {
    if (!askLocation && location) {
      loadNearby(location)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category, location])

  const filteredEvents = useMemo(() => {
    return events.filter((e) => {
      if (category && e.category !== category) return false
      if (search && !`${e.title} ${e.description}`.toLowerCase().includes(search.toLowerCase())) return false
      return true
    })
  }, [events, category, search])

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100">
      {/* Location permission overlay (Ticketmaster style) */}
      {askLocation && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-3xl bg-white dark:bg-gray-900 p-8 text-center shadow-2xl">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-blue-500 text-white">
              <Navigation className="h-8 w-8" />
            </div>
            <h2 className="text-2xl font-bold mb-2">¿Dónde estás?</h2>
            <p className="text-gray-500 dark:text-gray-400 mb-6">
              EventNow usa tu ubicación para mostrarte los eventos cercanos en el mapa en tiempo real.
            </p>
            <button
              onClick={requestLocation}
              className="w-full rounded-2xl bg-gradient-to-r from-violet-600 to-blue-600 px-6 py-4 font-semibold text-white transition hover:from-violet-700 hover:to-blue-700"
            >
              Permitir ubicación
            </button>
            <button
              onClick={() => {
                const fallback = { lat: 40.4168, lng: -3.7038, address: 'Madrid, España' }
                setLocation(fallback)
                setAskLocation(false)
                loadNearby(fallback)
              }}
              className="mt-3 w-full rounded-2xl px-6 py-3 text-sm font-medium text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            >
              Explorar el mundo sin ubicación
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="sticky top-0 z-[1000] border-b border-gray-200 dark:border-white/10 bg-white/80 dark:bg-gray-900/80 backdrop-blur-lg">
        <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3">
          <div className="flex items-center gap-2 font-bold text-lg">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-blue-500 text-white">
              <Compass className="h-4 w-4" />
            </span>
            EventNow
          </div>

          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar eventos cerca de ti..."
              className="w-full rounded-full border border-gray-200 dark:border-white/10 bg-gray-100 dark:bg-white/5 py-2.5 pl-10 pr-4 text-sm outline-none focus:border-violet-500"
            />
          </div>

          <button
            onClick={() => setShowFilters((s) => !s)}
            className="flex items-center gap-2 rounded-full border border-gray-200 dark:border-white/10 px-4 py-2.5 text-sm font-medium hover:bg-gray-100 dark:hover:bg-white/5"
          >
            <Filter className="h-4 w-4" />
            Filtros
          </button>

          {isAuthenticated ? (
            <Link
              href="/events/create"
              className="flex items-center gap-2 rounded-full bg-gradient-to-r from-violet-600 to-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:from-violet-700 hover:to-blue-700"
            >
              <Plus className="h-4 w-4" />
              Crear
            </Link>
          ) : (
            <Link
              href="/login"
              className="rounded-full border border-gray-200 dark:border-white/10 px-4 py-2.5 text-sm font-medium hover:bg-gray-100 dark:hover:bg-white/5"
            >
              Entrar
            </Link>
          )}
        </div>

        {showFilters && (
          <div className="mx-auto flex max-w-7xl flex-wrap gap-2 px-4 pb-3">
            {CATEGORY_OPTIONS.map((c) => (
              <button
                key={c.value}
                onClick={() => setCategory(c.value)}
                className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
                  category === c.value
                    ? 'bg-violet-500 text-white'
                    : 'bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/10'
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
        )}
      </header>

      {/* Map + sidebar */}
      <main className="mx-auto grid max-w-7xl grid-cols-1 gap-4 p-4 lg:grid-cols-3">
        {/* Map */}
        <section className="relative h-[55vh] overflow-hidden rounded-3xl border border-gray-200 dark:border-white/10 lg:col-span-2 lg:h-[calc(100vh-180px)]">
          {location ? (
            <MapComponent
              userLocation={location}
              events={filteredEvents as any}
              viewType="events"
              selectedEvent={selectedEvent as any}
              onEventSelect={(e) => setSelectedEvent(e as any)}
              categoryColors={CATEGORY_COLORS}
              showRadius
              radiusKm={10}
            />
          ) : (
            <div className="flex h-full items-center justify-center text-gray-400">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Cargando mapa...
            </div>
          )}

          {isLoading && (
            <div className="absolute right-4 top-4 z-[1000] flex items-center gap-2 rounded-full bg-white/90 px-3 py-1.5 text-sm shadow-lg dark:bg-gray-800/90">
              <Loader2 className="h-4 w-4 animate-spin text-violet-500" /> Buscando eventos...
            </div>
          )}

          {location?.address && (
            <div className="absolute left-4 top-4 z-[1000] flex items-center gap-2 rounded-full bg-white/90 px-3 py-1.5 text-sm shadow-lg dark:bg-gray-800/90">
              <MapPin className="h-4 w-4 text-violet-500" /> {location.address}
            </div>
          )}
        </section>

        {/* Event list */}
        <section className="flex flex-col gap-3 lg:h-[calc(100vh-180px)] lg:overflow-y-auto">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-lg font-bold">Cerca de ti</h2>
            <span className="text-sm text-gray-500">{filteredEvents.length} eventos</span>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-10 text-gray-400">
              <Loader2 className="h-6 w-6 animate-spin text-violet-500" />
            </div>
          ) : filteredEvents.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-gray-300 dark:border-white/10 p-8 text-center text-gray-500">
              <MapPin className="mx-auto mb-3 h-8 w-8 text-gray-400" />
              <p className="mb-4">No encontramos eventos por aquí todavía.</p>
              {isAuthenticated ? (
                <Link
                  href="/events/create"
                  className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-violet-600 to-blue-600 px-5 py-2.5 text-sm font-semibold text-white"
                >
                  <Plus className="h-4 w-4" /> Crear el primero
                </Link>
              ) : (
                <Link
                  href="/register"
                  className="inline-flex items-center gap-2 rounded-full border border-gray-300 px-5 py-2.5 text-sm font-semibold"
                >
                  Regístrate para crear
                </Link>
              )}
            </div>
          ) : (
            filteredEvents.map((event) => {
              const color = CATEGORY_COLORS[event.category] || '#6366F1'
              return (
                <button
                  key={event._id}
                  onClick={() => setSelectedEvent(event)}
                  className={`group rounded-2xl border p-3 text-left transition hover:shadow-lg ${
                    selectedEvent?._id === event._id
                      ? 'border-violet-500 bg-violet-50 dark:bg-violet-500/10'
                      : 'border-gray-200 dark:border-white/10 bg-white dark:bg-gray-900'
                  }`}
                >
                  <div className="flex gap-3">
                    <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-xl bg-gray-200 dark:bg-gray-800">
                      {(event.images?.[0] as any)?.url || (typeof event.images?.[0] === 'string' ? event.images[0] : null) ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={(event.images?.[0] as any)?.url || (event.images?.[0] as string)}
                          alt={event.title}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div
                          className="flex h-full w-full items-center justify-center text-white"
                          style={{ background: color }}
                        >
                          <Calendar className="h-6 w-6" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="truncate text-sm font-semibold">{event.title}</h3>
                        <span
                          className="flex-shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium text-white"
                          style={{ background: color }}
                        >
                          {event.category}
                        </span>
                      </div>
                      <div className="mt-1 flex items-center gap-1 text-xs text-gray-500">
                        <Calendar className="h-3 w-3" /> {formatDate(event.date as any)}
                      </div>
                      <div className="flex items-center gap-1 text-xs text-gray-500">
                        <MapPin className="h-3 w-3" /> {event.location?.address || 'Ubicación en el mapa'}
                      </div>
                      <div className="mt-1 flex items-center gap-3 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" /> {(event.attendees as any)?.length || 0}
                        </span>
                        {event.price && (
                          <span>
                            {event.price.amount === 0 ? 'Gratis' : `$${event.price.amount}`}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              )
            })
          )}
        </section>
      </main>
    </div>
  )
}
