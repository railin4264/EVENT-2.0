'use client'

import { useEffect, useMemo, useState, useCallback, useRef } from 'react'
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
  Flame,
  PartyPopper,
  Dumbbell,
  Music,
  Utensils,
  Gamepad2,
  Briefcase,
  Heart,
  Map as MapIcon,
  List,
  X,
  Radio,
} from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { eventsService } from '@/lib/api/services'
import type { Event } from '@/types/models'
import { Button } from '@/components/redesign/ui/button'
import { Input } from '@/components/redesign/ui/input'
import { Card } from '@/components/redesign/ui/card'
import { BorderBeam } from '@/components/redesign/ui/border-beam'
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
  social: '#F43F5E',
}

const QUICK_CATEGORIES = [
  { label: 'Para ti', value: '', icon: Flame, color: '#F59E0B' },
  { label: 'Fiestas', value: 'party', icon: PartyPopper, color: '#F43F5E' },
  { label: 'Deportes', value: 'sports', icon: Dumbbell, color: '#10B981' },
  { label: 'Música', value: 'music', icon: Music, color: '#8B5CF6' },
  { label: 'Comida', value: 'food', icon: Utensils, color: '#F59E0B' },
  { label: 'Gaming', value: 'gaming', icon: Gamepad2, color: '#6366F1' },
  { label: 'Networking', value: 'business', icon: Briefcase, color: '#3B82F6' },
]

const DATE_FILTERS = [
  { label: 'Hoy', value: 'today' },
  { label: 'Mañana', value: 'tomorrow' },
  { label: 'Este fin de semana', value: 'weekend' },
  { label: 'Esta semana', value: 'week' },
]

const SORT_OPTIONS = [
  { label: 'Más cerca', value: 'distance' },
  { label: 'Más populares', value: 'popular' },
  { label: 'Empiezan pronto', value: 'soon' },
  { label: 'Nuevos', value: 'new' },
]

const haversine = (lat1: number, lng1: number, lat2: number, lng2: number) => {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) * Math.sin(dLng / 2)
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

const formatDistance = (km: number) => (km < 1 ? `${Math.round(km * 1000)}m` : `${km.toFixed(1)}km`)

const formatDate = (d: string | Date) => {
  const date = new Date(d)
  return date.toLocaleDateString('es', { weekday: 'short', day: 'numeric', month: 'short' }) +
    ' · ' + date.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })
}

const isLive = (d: string | Date) => {
  const date = new Date(d).getTime()
  const now = Date.now()
  return date >= now - 2 * 3600 * 1000 && date <= now + 3 * 3600 * 1000
}

export default function HomeScreen() {
  const router = useRouter()
  const { isAuthenticated } = useAuthStore()

  const [location, setLocation] = useState<UserLocation | null>(null)
  const [cityName, setCityName] = useState('')
  const [events, setEvents] = useState<Event[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState('')
  const [dateFilter, setDateFilter] = useState('')
  const [sortBy, setSortBy] = useState('distance')
  const [view, setView] = useState<'map' | 'list'>('map')
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null)
  const [hoveredEvent, setHoveredEvent] = useState<Event | null>(null)
  const [pendingZone, setPendingZone] = useState<UserLocation | null>(null)
  const [searchCenter, setSearchCenter] = useState<UserLocation | null>(null)
  const [cityQuery, setCityQuery] = useState('')
  const listRef = useRef<HTMLDivElement>(null)

  const loadNearby = useCallback(async (loc: UserLocation) => {
    setIsLoading(true)
    try {
      const response = await eventsService.getNearbyEvents({
        latitude: loc.lat,
        longitude: loc.lng,
        radius: (loc as any).radiusKm || 50,
        limit: 200,
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
  }, [])

  const reverseGeocode = useCallback(async (loc: UserLocation) => {
    try {
      const { data } = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${loc.lat}&lon=${loc.lng}&zoom=10&addressdetails=1`,
        { headers: { 'User-Agent': 'EventNow/1.0' } }
      ).then((r) => r.json())
      const name = data?.address?.city || data?.address?.town || data?.address?.state || data?.address?.country || ''
      if (name) setCityName(name)
    } catch {
      /* ignore */
    }
  }, [])

  const initLocation = useCallback(async () => {
    if (typeof window !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude }
          setLocation(loc)
          setSearchCenter(loc)
          await reverseGeocode(loc)
          loadNearby(loc)
        },
        async () => {
          // GPS denied -> try IP-based geolocation (free, no API key needed)
          try {
            const ip = await fetch('https://ip-api.com/json/?fields=status,city,lat,lon,country').then((r) => r.json())
            if (ip && ip.status === 'success' && ip.lat && ip.lon) {
              const loc = { lat: ip.lat, lng: ip.lon, address: (ip.city || '') + ', ' + (ip.country || '') }
              setLocation(loc)
              setSearchCenter(loc)
              setCityName(ip.city || '')
              loadNearby(loc)
              return
            }
          } catch {
            /* ignore */
          }
          // Last resort: neutral world view, prompt user to pick a city
          const worldLoc = { lat: 20, lng: 0, address: 'Mundo', radiusKm: 20000 } as any
          setLocation(worldLoc)
          setSearchCenter(worldLoc)
          setCityName('Mundo')
          loadNearby(worldLoc)
        },
        { enableHighAccuracy: true, timeout: 10000 }
      )
    } else {
      const fallback = { lat: 40.4168, lng: -3.7038, address: 'Madrid, España' }
      setLocation(fallback)
      setSearchCenter(fallback)
      setCityName('Madrid')
      loadNearby(fallback)
    }
  }, [loadNearby, reverseGeocode])

  useEffect(() => {
    initLocation()
  }, [initLocation])

  const searchCity = useCallback(async () => {
    if (!cityQuery.trim()) return
    try {
      const data = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(cityQuery)}&limit=1`,
        { headers: { 'User-Agent': 'EventNow/1.0' } }
      ).then((r) => r.json())
      if (data && data[0]) {
        const loc = { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon), address: data[0].display_name }
        setLocation(loc)
        setSearchCenter(loc)
        setCityName(data[0].address?.city || data[0].name || cityQuery)
        loadNearby(loc)
        setCityQuery('')
      }
    } catch {
      toast.error('No encontramos esa ciudad')
    }
  }, [cityQuery, loadNearby])

  // Events happening right now
  const liveEvents = useMemo(
    () => events.filter((e) => isLive((e as any).date || (e as any).startDate)).slice(0, 5),
    [events]
  )

  const filteredSorted = useMemo(() => {
    let list = [...events]
    if (selectedCategory) list = list.filter((e) => (e.category || '').toLowerCase() === selectedCategory.toLowerCase())
    if (dateFilter) {
      const now = new Date()
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      const endOfToday = new Date(startOfToday.getTime() + 24 * 3600 * 1000)
      const dow = now.getDay()
      const daysToSat = (6 - dow + 7) % 7
      const weekendEnd = new Date(startOfToday.getTime() + (daysToSat + 2) * 24 * 3600 * 1000)
      const weekEnd = new Date(startOfToday.getTime() + 7 * 24 * 3600 * 1000)
      list = list.filter((e) => {
        const d = new Date((e as any).date || (e as any).startDate)
        if (dateFilter === 'today') return d >= startOfToday && d < endOfToday
        if (dateFilter === 'tomorrow') return d >= endOfToday && d < new Date(endOfToday.getTime() + 24 * 3600 * 1000)
        if (dateFilter === 'weekend') return d >= startOfToday && d < weekendEnd
        if (dateFilter === 'week') return d >= startOfToday && d < weekEnd
        return true
      })
    }
    if (location) {
      list.forEach((e) => {
        const [lng, lat] = (e.location as any)?.coordinates || [0, 0]
        ;(e as any)._distance = haversine(location.lat, location.lng, lat, lng)
      })
    }
    if (sortBy === 'distance') list.sort((a, b) => ((a as any)._distance || 0) - ((b as any)._distance || 0))
    else if (sortBy === 'popular') list.sort((a, b) => ((b as any).interestedCount || 0) - ((a as any).interestedCount || 0))
    else if (sortBy === 'soon') list.sort((a, b) => new Date((a as any).date).getTime() - new Date((b as any).date).getTime())
    else if (sortBy === 'new') list.sort((a, b) => new Date((b as any).createdAt || (b as any).date).getTime() - new Date((a as any).createdAt || (a as any).date).getTime())
    return list
  }, [events, selectedCategory, dateFilter, sortBy, location])

  const handleSelectEvent = useCallback((ev: Event | null) => {
    setSelectedEvent(ev)
    if (ev && listRef.current) {
      const el = listRef.current.querySelector(`[data-event-id="${(ev as any)._id}"]`)
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [])

  const applyZone = useCallback(() => {
    if (pendingZone) {
      setSearchCenter(pendingZone)
      setLocation(pendingZone)
      reverseGeocode(pendingZone)
      loadNearby(pendingZone)
      setPendingZone(null)
    }
  }, [pendingZone, loadNearby, reverseGeocode])

  const selectedForMap = hoveredEvent || selectedEvent

  return (
    <div className="flex flex-col h-screen bg-background text-foreground">
      {/* Header */}
      <header className="flex items-center gap-3 px-4 py-3 border-b border-border bg-background/80 backdrop-blur z-20">
        <div className="flex items-center gap-2 font-bold text-lg">
          <span className="text-primary">Event</span>
          <span className="text-accent">Now</span>
        </div>
        <div className="flex-1 relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={cityQuery}
            onChange={(e) => setCityQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && searchCity()}
            placeholder="Buscar eventos cerca de ti..."
            className="rounded-full pl-9 pr-3"
          />
        </div>
        <div className="relative rounded-full">
          <Button onClick={() => router.push('/create-event')} className="rounded-full">
            <Plus className="w-4 h-4" /> Crear evento
          </Button>
          <BorderBeam duration={14} colorFrom="#8B5CF6" colorTo="#22D3EE" />
        </div>
        {isAuthenticated ? (
          <Link href="/profile" className="text-sm text-muted-foreground hover:text-foreground">Mi perfil</Link>
        ) : (
          <Link href="/login" className="text-sm text-muted-foreground hover:text-foreground">Entrar</Link>
        )}
      </header>

      {/* Quick categories */}
      <div className="flex items-center gap-2 px-4 py-2 overflow-x-auto border-b border-border/50 no-scrollbar">
        {QUICK_CATEGORIES.map((c) => {
          const Icon = c.icon
          const active = selectedCategory === c.value
          return (
            <Button
              key={c.value}
              variant={active ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setSelectedCategory(active ? '' : c.value)}
              className={`rounded-full whitespace-nowrap ${active ? '' : 'border border-border hover:bg-primary/10'}`}
            >
              <Icon className="w-4 h-4" style={{ color: c.color }} />
              {c.label}
            </Button>
          )
        })}
      </div>

      {/* Date filters + sort + city + view toggle */}
      <div className="flex items-center gap-2 px-4 py-2 overflow-x-auto border-b border-border/50 text-sm no-scrollbar">
        {DATE_FILTERS.map((d) => (
          <Button
            key={d.value}
            variant={dateFilter === d.value ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setDateFilter(dateFilter === d.value ? '' : d.value)}
            className={`rounded-full whitespace-nowrap ${dateFilter === d.value ? '' : 'border border-border hover:bg-primary/10'}`}
          >
            {d.label}
          </Button>
        ))}
        <div className="flex-1" />
        <div className="hidden md:flex items-center gap-1 text-muted-foreground">
          <MapPin className="w-4 h-4 text-primary" />
          <span className="font-medium text-foreground">{cityName || 'Detectando...'}</span>
        </div>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="rounded-full px-2 py-1 outline-none bg-background text-foreground border border-border"
        >
          {SORT_OPTIONS.map((s) => (
            <option key={s.value} value={s.value} className="bg-background">{s.label}</option>
          ))}
        </select>
        <div className="flex items-center rounded-full p-0.5 border border-border">
          <Button
            variant={view === 'map' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setView('map')}
            className="rounded-full p-1.5"
            aria-label="Mapa"
          >
            <MapIcon className="w-4 h-4" />
          </Button>
          <Button
            variant={view === 'list' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setView('list')}
            className="rounded-full p-1.5"
            aria-label="Lista"
          >
            <List className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Live now block */}
      {liveEvents.length > 0 && (
        <div className="px-4 py-2 bg-accent/10 border-b border-accent/20">
          <div className="flex items-center gap-2 text-accent font-semibold text-sm mb-2">
            <Radio className="w-4 h-4 animate-pulse" /> En vivo ahora
          </div>
          <div className="flex gap-2 overflow-x-auto no-scrollbar">
            {liveEvents.map((e) => {
              const dist = location ? haversine(location.lat, location.lng, (e.location as any)?.coordinates?.[1], (e.location as any)?.coordinates?.[0]) : 0
              return (
                <Button
                  key={(e as any)._id}
                  variant="ghost"
                  onClick={() => handleSelectEvent(e)}
                  className="flex items-center gap-2 bg-card rounded-xl px-3 py-2 min-w-[220px] justify-start hover:bg-primary/10"
                >
                  <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">{(e as any).title}</div>
                    <div className="text-xs text-muted-foreground">
                      {formatDistance(dist)} · {((e as any).interestedCount || 0)} aquí
                    </div>
                  </div>
                </Button>
              )
            })}
          </div>
        </div>
      )}

      {/* Main split: map + list */}
      <div className="flex-1 flex overflow-hidden">
        {/* Map (desktop always; mobile when view=map) */}
        <div className={`${view === 'map' ? 'flex' : 'hidden'} md:flex flex-1 relative`}>
          {location ? (
            <MapComponent
              userLocation={location}
              events={filteredSorted as any}
              categoryColors={CATEGORY_COLORS}
              selectedEvent={selectedForMap as any}
              onEventSelect={(e) => handleSelectEvent((e as unknown as Event) ?? null)}
              onMoveEnd={(c) => setPendingZone({ lat: c.lat, lng: c.lng })}
              showRadius
              radiusKm={5}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">Cargando mapa...</div>
          )}
          {/* Search this zone */}
          {pendingZone && (
            <Button
              onClick={applyZone}
              className="absolute bottom-6 left-1/2 -translate-x-1/2 rounded-full shadow-lg font-semibold text-sm z-[1000]"
            >
              Buscar eventos en esta zona
            </Button>
          )}
        </div>

        {/* List (desktop always; mobile when view=list) */}
        <div
          ref={listRef}
          className={`${view === 'list' ? 'flex' : 'hidden'} md:flex w-full md:w-[400px] flex-col border-l border-border overflow-y-auto bg-background`}
        >
          <div className="flex items-center justify-between px-4 py-3 sticky top-0 bg-background z-10 border-b border-border/50">
            <h2 className="font-semibold">Cerca de ti</h2>
            <span className="text-sm text-muted-foreground">{filteredSorted.length} eventos</span>
          </div>
          {isLoading ? (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : filteredSorted.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-3 p-8 text-center">
              <Compass className="w-10 h-10" />
              <p>No hay eventos cerca todavía.</p>
              <div className="relative rounded-full">
                <Button onClick={() => router.push('/create-event')} className="rounded-full">
                  Crea el primero
                </Button>
                <BorderBeam duration={14} colorFrom="#8B5CF6" colorTo="#22D3EE" />
              </div>
            </div>
          ) : (
            filteredSorted.map((e) => {
              const event = e as any
              const dist = location ? haversine(location.lat, location.lng, event.location?.coordinates?.[1], event.location?.coordinates?.[0]) : 0
              const isSel = selectedForMap?._id === event._id
              return (
                <Card
                  key={event._id}
                  data-event-id={event._id}
                  onMouseEnter={() => setHoveredEvent(e)}
                  onMouseLeave={() => setHoveredEvent(null)}
                  onClick={() => handleSelectEvent(e)}
                  className={`gap-0 p-4 border-b border-border rounded-none cursor-pointer transition hover:bg-primary/5 ${
                    isSel ? 'bg-primary/10 ring-1 ring-primary' : ''
                  }`}
                >
                  <div className="flex gap-3">
                    {event.images?.[0]?.url && (
                      <img src={event.images[0].url} alt={event.title} className="w-20 h-20 rounded-xl object-cover flex-shrink-0" />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className="text-xs px-2 py-0.5 rounded-full font-medium"
                          style={{ backgroundColor: (CATEGORY_COLORS[event.category] || '#6366F1') + '33', color: CATEGORY_COLORS[event.category] || '#6366F1' }}
                        >
                          {event.category}
                        </span>
                        {isLive(event.date) && (
                          <span className="text-xs text-accent font-semibold flex items-center gap-1">
                            <Radio className="w-3 h-3" /> EN VIVO
                          </span>
                        )}
                      </div>
                      <h3 className="font-semibold truncate">{event.title}</h3>
                      <div className="text-xs text-muted-foreground mt-1 flex flex-col gap-0.5">
                        <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {formatDate(event.date)}</span>
                        <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {event.location?.address} · {formatDistance(dist)}</span>
                        <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {event.interestedCount || 0} interesados</span>
                        {event.organizer && <span className="flex items-center gap-1"><span className="w-3" />👤 {event.organizer}</span>}
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-sm font-semibold">{event.price?.amount ? `${event.price.currency} ${event.price.amount}` : 'Gratis'}</span>
                        <span className="flex items-center gap-2">
                          <span className="text-accent"><Heart className="w-4 h-4" /></span>
                          <span className="bg-primary text-primary-foreground px-3 py-1 rounded-full text-xs font-semibold">Ver evento</span>
                        </span>
                      </div>
                    </div>
                  </div>
                </Card>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
