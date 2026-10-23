'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query'
import { Compass, Search, SlidersHorizontal, Map as MapIcon, Columns, LayoutGrid, Sparkles, MapPin, Calendar, ShieldCheck, Plus, ArrowRight, RotateCcw } from 'lucide-react'
import { getEvents, attendEvent, leaveEvent, type DiscoveryEvent } from '@/lib/api/events'
import { tribesService } from '@/lib/api/services/tribes.service'
import { apiClient } from '@/lib/api/client'
import { useAuthStore } from '@/stores/authStore'
import { useLocaleStore } from '@/stores/localeStore'
import { useDiscoveryArea } from '@/stores/discoveryAreaStore'
import { areaCenter, areaParams, WORLD_AREA } from '@/lib/discovery-area'
import { authPageHref } from '@/lib/auth/redirect'
import { CATEGORY_LIST, categoryMeta } from '@/lib/categories'
import { formatEventDate, formatPrice } from '@/lib/event-display'
import { getEventPhase } from '@/components/events/event-phase'
import { matchesBudget, matchesMoment, validCoordinates, distanceKm, type MomentFilter } from '@/components/discovery/discovery-filters'
import { discoveryQuery } from '@/components/discovery/discovery-query'
import { useFavorites } from '@/hooks/useFavorites'
import { useToast } from '@/components/redesign/ui/use-toast'
import { useAnalytics } from '@/components/providers/AnalyticsProvider'
import { LocationPicker } from '@/components/discovery/LocationPicker'
import ContentFilterModal, { DEFAULT_CONTENT_PREFERENCES, loadStoredPreferences } from '@/components/discovery/ContentFilterModal'
import { DISCOVERY_VIBES, RD_HUBS, type RDHub } from '@/components/discovery/map/categoryTheme'
import DiscoveryCarousel from '@/components/discovery/map/DiscoveryCarousel'
import DiscoveryDetailPanel from '@/components/discovery/map/DiscoveryDetailPanel'
import { LiveVibeRadar } from '@/components/discovery/LiveVibeRadar'
import { NearbyFlashDeals } from '@/components/events/NearbyFlashDeals'

const LazyMapComponent = dynamic(() => import('@/components/discovery/LazyMapComponent'), {
  ssr: false, loading: () => <div className="grid h-full place-items-center bg-slate-950 text-sm text-slate-300" role="status">Preparando el mapa…</div>
})
type Layer = 'events' | 'ideas' | 'tribes'
type Layout = 'map' | 'split' | 'list'
type Center = { lat: number; lng: number; address?: string }
type CommunityItem = {
  _id: string; title?: string; name?: string; description?: string; category?: string
  images?: Array<string | { url: string }>; avatar?: string
  location?: { coordinates?: [number, number]; address?: string; city?: string; venue?: string }
  zone?: { name?: string; city?: string; location?: { coordinates?: [number, number] } }
  membersCount?: number; memberCount?: number; supportersCount?: number; quorumTarget?: number; supported?: boolean
  distance?: number
}
type RadarEvent = DiscoveryEvent & { isSecretLocation?: boolean }
const button = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-700 px-3 text-sm font-medium transition-colors hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 disabled:opacity-50'
const input = 'min-h-11 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 text-sm text-slate-100 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-400/20'

export default function DiscoveryPage() {
  const router = useRouter()
  const { area, setArea, initialized } = useDiscoveryArea()
  const { user, isAuthenticated } = useAuthStore()
  const { config } = useLocaleStore()
  const identity = user?.id || user?._id || 'guest'
  const [viewMode, setViewMode] = useState<Layout>('map')
  const [viewType, setViewType] = useState<Layer>('events')
  const [mapStyle, setMapStyle] = useState<'dark' | 'light' | 'satellite'>('dark')
  const [selectedEvent, setSelectedEvent] = useState<RadarEvent | null>(null)
  const [selectedTribe, setSelectedTribe] = useState<CommunityItem | null>(null)
  const [selectedIdea, setSelectedIdea] = useState<CommunityItem | null>(null)
  const [flyToTarget, setFlyToTarget] = useState<(Center & { zoom?: number; ts?: number }) | null>(null)
  const [activeHubId, setActiveHubId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [serverSearch, setServerSearch] = useState('')
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [quickFilter, setQuickFilter] = useState<MomentFilter>(null)
  const [activeVibe, setActiveVibe] = useState<string | null>(null)
  const [companionFilter, setCompanionFilter] = useState<'crew' | 'couple' | 'family' | 'solo' | null>(null)
  const [budget, setBudget] = useState('')
  const [queryBudget, setQueryBudget] = useState('')
  const [currency, setCurrency] = useState<string>(config.currency || 'DOP')
  const [showFilters, setShowFilters] = useState(false)
  const [showLocation, setShowLocation] = useState(false)
  const [contentPrefs, setContentPrefs] = useState(DEFAULT_CONTENT_PREFERENCES)
  const [isContentFilterOpen, setIsContentFilterOpen] = useState(false)
  const [busyAction, setBusyAction] = useState<string | null>(null)
  const actionLock = useRef(false)
  const [clock, setClock] = useState(() => new Date())
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const { toggleFavorite, isFavorite } = useFavorites()
  const { trackEventInteraction } = useAnalytics()
  const center = useMemo(() => areaCenter(area), [area])
  const mapCenter = center || { lat: 20, lng: 0, address: 'Mundial' }
  const scope = useMemo(() => areaParams(area), [area])

  useEffect(() => {
    setContentPrefs(loadStoredPreferences())
    const params = new URLSearchParams(window.location.search)
    const q = params.get('q')
    if (q) setSearchQuery(q.slice(0, 100))
    if (params.get('category')) setSelectedCategories([categoryMeta(params.get('category')).slug])
    const layer = params.get('layer')
    if (layer === 'events' || layer === 'ideas' || layer === 'tribes') setViewType(layer)
    const hub = RD_HUBS.find(h => h.id === params.get('hub'))
    if (hub) {
      setActiveHubId(hub.id)
      setArea({ kind: 'nearby', label: hub.name + ' · ' + hub.radius + ' km', lat: hub.lat, lng: hub.lng, radius: hub.radius, source: 'map' })
    }
    const timer = setInterval(() => setClock(new Date()), 60000)
    return () => clearInterval(timer)
  }, [setArea])
  useEffect(() => {
    const timer = setTimeout(() => setServerSearch(searchQuery.trim()), 300)
    return () => clearTimeout(timer)
  }, [searchQuery])
  useEffect(() => {
    const timer = setTimeout(() => setQueryBudget(budget.trim()), 300)
    return () => clearTimeout(timer)
  }, [budget])
  useEffect(() => {
    if (config.currency) setCurrency(config.currency)
  }, [config.currency])

  useEffect(() => {
    setSelectedEvent(null); setSelectedTribe(null); setSelectedIdea(null); setFlyToTarget(null)
  }, [area, viewType, identity, serverSearch, selectedCategories, quickFilter, activeVibe, companionFilter, budget, currency, contentPrefs])
  useEffect(() => { setShowLocation(false) }, [area])

  const sortedHubs = useMemo(() => {
    const currentCountry = config.countryCode
    return [...RD_HUBS].sort((a, b) => {
      const aMatches = a.country === currentCountry ? 1 : 0
      const bMatches = b.country === currentCountry ? 1 : 0
      return bMatches - aMatches
    })
  }, [config.countryCode])

  // Name the user's country only when it has zones; otherwise the list is the global one.
  const hubsLabel = useMemo(() => RD_HUBS.some(hub => hub.country === config.countryCode)
    ? `Zonas de ${config.countryName} y del mundo:`
    : 'Zonas destacadas:', [config.countryCode, config.countryName])

  const selectHub = (hub: RDHub | null) => {
    if (!hub) {
      setActiveHubId(null)
      setArea(WORLD_AREA)
      return
    }
    setActiveHubId(hub.id)
    setArea({ kind: 'nearby', label: `${hub.name} · ${hub.radius} km`, lat: hub.lat, lng: hub.lng, radius: hub.radius, source: 'map' })
    setFlyToTarget({ lat: hub.lat, lng: hub.lng, zoom: hub.zoom, ts: Date.now() })
  }

  const refinement = discoveryQuery({ categories: selectedCategories, vibe: activeVibe, preferences: contentPrefs, maximum: queryBudget === '' ? null : Number(queryBudget), currency, moment: quickFilter, now: clock, authenticated: isAuthenticated })
  const eventsQuery = useInfiniteQuery({
    queryKey: ['discovery-events', identity, scope, serverSearch, refinement], initialPageParam: 1,
    queryFn: ({ pageParam }) => getEvents({ ...scope, ...refinement, page: pageParam, limit: 100, timeFilter: 'upcoming', search: serverSearch || undefined }),
    getNextPageParam: page => page.pagination?.page < page.pagination?.pages ? page.pagination.page + 1 : undefined,
    enabled: initialized && viewType === 'events', staleTime: 60000, refetchOnWindowFocus: false,
    refetchInterval: quickFilter === 'now' ? 60000 : false
  })
  const tribesQuery = useQuery({
    queryKey: ['discovery-tribes', identity, area.kind === 'nearby' ? scope : 'world', serverSearch],
    queryFn: async () => {
      const response = area.kind === 'nearby'
        ? await tribesService.getNearbyTribes({ lat: area.lat, lng: area.lng, radius: area.radius * 1000 })
        : await apiClient.get('/tribes', { params: { limit: 100, search: serverSearch || undefined } }).then(r => ({ data: r.data?.data || r.data?.tribes || [] }))
      return (response.data || []) as CommunityItem[]
    },
    enabled: initialized && viewType === 'tribes', staleTime: 60000, refetchOnWindowFocus: false
  })
  const ideasQuery = useQuery({
    queryKey: ['discovery-ideas', identity, area.kind === 'nearby' ? scope : 'world', serverSearch],
    queryFn: async () => {
      const response = await apiClient.get('/ideas', { params: { limit: 50, q: serverSearch || undefined, ...(area.kind === 'nearby' ? { lat: area.lat, lng: area.lng, radiusKm: area.radius } : {}) } })
      return (response.data?.data || []) as CommunityItem[]
    },
    enabled: initialized && viewType === 'ideas', staleTime: 60000, refetchOnWindowFocus: false
  })
  const rawEvents = useMemo(() => eventsQuery.data?.pages.flatMap(page => page.events || []) || [], [eventsQuery.data])
  const withDistance = <T extends { location?: { coordinates?: number[] }; distance?: number }>(item: T): T & { distance?: number } => ({
    ...item, distance: area.kind === 'nearby' && validCoordinates(item.location?.coordinates)
      ? distanceKm(area, item.location.coordinates) : undefined
  })
  const preferencesAllow = (raw?: string) => {
    const slug = categoryMeta(raw).slug
    if (contentPrefs.hidePolitical && slug === 'politics') return false
    if (contentPrefs.hideReligious && slug === 'religion') return false
    if (contentPrefs.contentFilterMode === 'whitelist' && !(contentPrefs.preferredCategories || []).some(c => categoryMeta(c).slug === slug)) return false
    if (contentPrefs.contentFilterMode === 'blacklist' && (contentPrefs.hiddenCategories || []).some(c => categoryMeta(c).slug === slug)) return false
    if (selectedCategories.length && !selectedCategories.includes(slug)) return false
    const vibe = DISCOVERY_VIBES.find(v => v.id === activeVibe)
    if (vibe && !vibe.categories.some(c => categoryMeta(c).slug === slug)) return false
    if (companionFilter) {
      const allowedCompanionCats: Record<string, string[]> = {
        crew: ['party', 'music', 'sports', 'gaming', 'dance', 'nightlife'],
        couple: ['food', 'art', 'culture', 'wellness', 'cooking', 'travel'],
        family: ['family', 'education', 'outdoors', 'kids', 'reading', 'photography'],
        solo: ['networking', 'tech', 'business', 'cultural', 'writing', 'volunteering']
      }
      const allowed = allowedCompanionCats[companionFilter] || []
      if (!allowed.some(c => categoryMeta(c).slug === slug)) return false
    }
    return true
  }
  const maximum = budget.trim() === '' ? null : Number(budget)
  const invalidBudget = maximum !== null && (!Number.isFinite(maximum) || maximum < 0 || maximum > 100000000)
  const fullyFilteredEvents = rawEvents.map(withDistance).filter(event =>
    preferencesAllow(event.category) &&
    (!contentPrefs.hideAdultOnly || !((event as RadarEvent & { ageRestriction?: { minAge?: number; isAdultOnly?: boolean } }).ageRestriction?.isAdultOnly || ((event as RadarEvent & { ageRestriction?: { minAge?: number } }).ageRestriction?.minAge || 0) >= 18)) &&
    !['ended', 'cancelled'].includes(getEventPhase(event, clock)) && matchesMoment(event, quickFilter, clock) &&
    matchesBudget(event, invalidBudget ? null : maximum, currency)
  ).sort((a, b) => quickFilter === 'popular'
    ? (b.attendeesCount ?? b.attendees?.length ?? 0) - (a.attendeesCount ?? a.attendees?.length ?? 0)
    : area.kind === 'nearby' ? (a.distance ?? Infinity) - (b.distance ?? Infinity) : new Date(a.date).getTime() - new Date(b.date).getTime())
  const normalizeCommunity = (item: CommunityItem, idea = false): CommunityItem => withDistance({
    ...item, membersCount: item.membersCount ?? item.memberCount ?? 0,
    location: idea ? { coordinates: validCoordinates(item.zone?.location?.coordinates) ? item.zone!.location!.coordinates : undefined, address: item.zone?.name, city: item.zone?.city } : item.location,
    images: item.images?.length ? item.images : item.avatar ? [item.avatar] : []
  })
  const filterCommunity = (item: CommunityItem) => {
    const text = [item.name, item.title, item.description, item.location?.address, item.location?.city].join(' ').toLocaleLowerCase()
    return preferencesAllow(item.category) && (!serverSearch || text.includes(serverSearch.toLocaleLowerCase())) &&
      (area.kind !== 'nearby' || (item.distance !== undefined && item.distance <= area.radius))
  }
  const tribes = (tribesQuery.data || []).map(item => normalizeCommunity(item)).filter(filterCommunity)
  const ideas = (ideasQuery.data || []).map(item => normalizeCommunity(item, true)).filter(filterCommunity)
  const activeQuery = viewType === 'events' ? eventsQuery : viewType === 'ideas' ? ideasQuery : tribesQuery
  const loading = !initialized || activeQuery.isLoading
  const items = viewType === 'events' ? fullyFilteredEvents : viewType === 'ideas' ? ideas : tribes
  const totalEvents = eventsQuery.data?.pages[0]?.pagination?.total || rawEvents.length
  const unlocated = items.filter(item => !validCoordinates(item.location?.coordinates)).length
  const filterCount = selectedCategories.length + Number(viewType === 'events' && !!quickFilter) + Number(!!activeVibe) + Number(!!companionFilter) + Number(viewType === 'events' && budget !== '')
  const communityGlobal = viewType !== 'events' && area.kind !== 'world' && area.kind !== 'nearby'

  const selectItem = (item: RadarEvent | CommunityItem) => {
    if (viewType === 'events') setSelectedEvent(item as RadarEvent)
    else if (viewType === 'ideas') setSelectedIdea(item)
    else setSelectedTribe(item)
    if (validCoordinates(item.location?.coordinates)) setFlyToTarget({ lat: item.location.coordinates[1], lng: item.location.coordinates[0], zoom: 14, ts: Date.now() })
  }
  const resetFilters = () => { setSearchQuery(''); setSelectedCategories([]); setQuickFilter(null); setActiveVibe(null); setCompanionFilter(null); setBudget('') }
  const surprise = () => {
    if (loading) return
    if (viewType !== 'events' || !fullyFilteredEvents.length) { toast({ title: 'No hay eventos con estos filtros', description: 'Cambia el destino, limpia filtros o carga más resultados.' }); return }
    selectItem(fullyFilteredEvents[Math.floor(Math.random() * fullyFilteredEvents.length)]); setViewMode('map')
  }
  const authenticate = (destination: string) => {
    if (isAuthenticated) return true
    router.push(authPageHref('/login', destination)); return false
  }
  const mutate = async (key: string, action: () => Promise<void>) => {
    if (actionLock.current) return
    actionLock.current = true; setBusyAction(key)
    try { await action() } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } }
      toast({ title: 'No se pudo completar la acción', description: err.response?.data?.message || 'Inténtalo otra vez.', variant: 'destructive' })
    } finally { actionLock.current = false; setBusyAction(null) }
  }
  const handleAttend = async (event: RadarEvent) => {
    const destination = '/events/' + event._id
    if (!authenticate(destination)) return
    if (['ended', 'cancelled'].includes(getEventPhase(event)) || (event.price?.amount || 0) > 0) { router.push(destination); return }
    await mutate(event._id, async () => {
      const response = event.isAttending ? await leaveEvent(event._id) : await attendEvent(event._id)
      setSelectedEvent(response.event ? { ...response.event, isAttending: !event.isAttending } : { ...event, isAttending: !event.isAttending })
      await queryClient.invalidateQueries({ queryKey: ['discovery-events'] })
      toast({ title: event.isAttending ? 'Asistencia cancelada' : 'Asistencia confirmada' })
    })
  }
  const handleJoinTribe = async (tribe: CommunityItem) => {
    const destination = '/tribes/' + tribe._id
    if (authenticate(destination)) router.push(destination)
  }
  const handleSupport = async (idea: CommunityItem) => {
    if (!authenticate('/discovery?layer=ideas')) return
    await mutate(idea._id, async () => {
      const response = await apiClient.post('/ideas/' + idea._id + '/support')
      if (response.data?.data) setSelectedIdea({ ...idea, ...response.data.data, location: idea.location })
      await queryClient.invalidateQueries({ queryKey: ['discovery-ideas'] })
      toast({ title: response.data?.message || 'Interés actualizado' })
    })
  }
  const changeMapArea = (loc: Center, gps = false) => {
    setActiveHubId(null)
    setArea({ kind: 'nearby', label: gps ? 'Cerca de ti · 50 km' : 'Zona del mapa · 50 km', lat: loc.lat, lng: loc.lng, radius: 50, source: gps ? 'gps' : 'map' })
  }
  const close = () => { setSelectedEvent(null); setSelectedIdea(null); setSelectedTribe(null) }

  const cards = <div className={viewMode === 'list' ? 'grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3' : 'space-y-3'}>
    {items.map(item => {
      const event = viewType === 'events' ? item as RadarEvent : null
      const meta = categoryMeta(item.category)
      const image = item.images?.[0]
      const cover = typeof image === 'string' ? image : image?.url
      const selected = (selectedEvent || selectedIdea || selectedTribe)?._id === item._id
      return <article key={item._id} className={'overflow-hidden rounded-2xl border bg-slate-900 transition-colors ' + (selected ? 'border-violet-400' : 'border-slate-800 hover:border-slate-600')}>
        {viewMode === 'list' && <div className="relative h-44 bg-slate-800">
          {cover ? <img src={cover} alt="" loading="lazy" className="h-full w-full object-cover" /> : <div className="grid h-full place-items-center text-5xl" style={{ backgroundColor: meta.color + '20' }} aria-hidden="true">{meta.emoji}</div>}
          <span className="absolute bottom-3 left-3 rounded-lg bg-slate-950/90 px-2.5 py-1 text-xs text-white">{meta.emoji} {meta.label}</span>
        </div>}
        <div className="p-4">
          <div className="mb-2 flex items-center justify-between gap-3 text-xs"><span className="text-slate-300">{viewMode !== 'list' && meta.emoji + ' ' + meta.label}</span>{event && <span className="font-semibold text-violet-200">{formatPrice(event)}</span>}</div>
          <h2 className="text-base font-semibold leading-snug text-white">{item.title || ('name' in item && item.name)}</h2>
          {event && <p className="mt-2 flex items-start gap-1.5 text-xs leading-relaxed text-slate-300"><Calendar className="mt-0.5 h-3.5 w-3.5 shrink-0" />{formatEventDate(event.date, event.timeZone)}</p>}
          <p className="mt-2 flex items-start gap-1.5 text-xs leading-relaxed text-slate-400"><MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />{event?.isSecretLocation ? 'Ubicación aproximada · consulta el detalle' : item.location?.city || item.location?.address || 'Ubicación por confirmar'}</p>
          <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-slate-400">{item.description}</p>
          <div className="mt-4 flex items-center gap-2">
            <button type="button" onClick={() => { selectItem(item); setViewMode(viewMode === 'list' ? 'map' : viewMode) }} className={button + ' flex-1 text-slate-100'}>Vista rápida</button>
            <Link href={viewType === 'ideas' ? '/ideas' : '/' + viewType + '/' + item._id} className={button + ' border-violet-400/30 bg-violet-500/15 text-violet-200'} aria-label={'Ver detalle de ' + (item.title || ('name' in item && item.name))}><ArrowRight className="h-4 w-4" /></Link>
          </div>
        </div>
      </article>
    })}
  </div>

  return <div className="bg-slate-950 text-slate-100">
    <header className="border-b border-slate-800 bg-gradient-to-b from-slate-900/80 to-slate-950 px-4 py-4 sm:px-6 sm:py-5">
      <div className="mx-auto max-w-[1600px]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="mb-1 inline-flex items-center gap-2 text-xs font-semibold tracking-[0.16em] text-violet-300">
              <span className="h-2 w-2 rounded-full bg-violet-400" />
              EVENTNOW · DESCUBRE TU PRÓXIMO PLAN
            </p>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Tu próximo plan empieza aquí.</h1>
            <p className="mt-1 hidden max-w-2xl text-sm sm:block leading-relaxed text-slate-400">Explora eventos en el mapa, vota ideas del Quórum Colectivo y conecta con Tribus cerca de ti.</p>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/plans" className={button + ' hidden md:inline-flex border-amber-500/30 bg-amber-500/10 text-amber-200 hover:bg-amber-500/20'}>Planes espontáneos</Link>
            <Link href="/events/create" className={button + ' border-violet-500/40 bg-violet-600/20 text-violet-100 hover:bg-violet-600/30'}><Plus className="h-4 w-4" />Crear evento</Link>
          </div>
        </div>
        <div className="mt-3 flex flex-col gap-3 xl:flex-row xl:items-center">
          <div className="relative min-w-0 flex-1"><Search className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" aria-hidden="true" /><label htmlFor="discovery-search" className="sr-only">Buscar eventos, ideas o tribus</label><input id="discovery-search" type="search" maxLength={100} value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Conciertos, violín en el parque, pintura, ajedrez, tech…" className={input + ' pl-10'} /></div>
          <button type="button" aria-expanded={showLocation} aria-controls="discovery-location" onClick={() => setShowLocation(!showLocation)} className={button + ' justify-between text-slate-200'}><span className="flex min-w-0 items-center gap-2"><MapPin className="h-4 w-4 shrink-0 text-violet-300" /><span className="truncate">{area.label}</span></span><span className="ml-3 text-xs text-violet-300">Cambiar</span></button>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => setShowFilters(!showFilters)} aria-expanded={showFilters} aria-controls="discovery-filters" className={button + (filterCount ? ' border-violet-400/50 bg-violet-500/15 text-violet-200' : '')}><SlidersHorizontal className="h-4 w-4" />Filtros{filterCount > 0 && ' · ' + filterCount}</button>
            <button type="button" onClick={() => setIsContentFilterOpen(true)} className={button} aria-label="Preferencias de contenido"><ShieldCheck className="h-4 w-4 text-emerald-400" /><span className="hidden sm:inline">Mi Radar</span></button>
            <button type="button" onClick={surprise} disabled={loading || viewType !== 'events' || !!busyAction} className={button + ' border-violet-400/30 bg-violet-500/15 text-violet-200'}><Sparkles className="h-4 w-4" />Sorpréndeme</button>
          </div>
        </div>
        {/* Companion / Mood Rail */}
        <div className="mt-3 flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none" aria-label="Filtro de compañía">
          <span className="shrink-0 text-[11px] font-semibold uppercase tracking-wider text-slate-400">¿Con quién vas?:</span>
          <button
            type="button"
            onClick={() => setCompanionFilter(companionFilter === 'crew' ? null : 'crew')}
            className={'shrink-0 rounded-full border px-3 py-1 text-xs font-medium transition-all ' + (companionFilter === 'crew' ? 'border-amber-400 bg-amber-500/20 text-amber-100 shadow-sm shadow-amber-500/20' : 'border-slate-800 bg-slate-900/90 text-slate-300 hover:border-slate-700 hover:text-white')}
          >
            🔥 {config.terms.hangout} ({config.terms.friends})
          </button>
          <button
            type="button"
            onClick={() => setCompanionFilter(companionFilter === 'couple' ? null : 'couple')}
            className={'shrink-0 rounded-full border px-3 py-1 text-xs font-medium transition-all ' + (companionFilter === 'couple' ? 'border-pink-400 bg-pink-500/20 text-pink-100 shadow-sm shadow-pink-500/20' : 'border-slate-800 bg-slate-900/90 text-slate-300 hover:border-slate-700 hover:text-white')}
          >
            💑 En Pareja
          </button>
          <button
            type="button"
            onClick={() => setCompanionFilter(companionFilter === 'family' ? null : 'family')}
            className={'shrink-0 rounded-full border px-3 py-1 text-xs font-medium transition-all ' + (companionFilter === 'family' ? 'border-sky-400 bg-sky-500/20 text-sky-100 shadow-sm shadow-sky-500/20' : 'border-slate-800 bg-slate-900/90 text-slate-300 hover:border-slate-700 hover:text-white')}
          >
            👨‍👩‍👧 En Familia
          </button>
          <button
            type="button"
            onClick={() => setCompanionFilter(companionFilter === 'solo' ? null : 'solo')}
            className={'shrink-0 rounded-full border px-3 py-1 text-xs font-medium transition-all ' + (companionFilter === 'solo' ? 'border-emerald-400 bg-emerald-500/20 text-emerald-100 shadow-sm shadow-emerald-500/20' : 'border-slate-800 bg-slate-900/90 text-slate-300 hover:border-slate-700 hover:text-white')}
          >
            🧭 Solo / Explorador
          </button>
        </div>

        {/* Global Topics & Fascination Trends Rail (Sci-Fi, Ghosts, UFOs, Clean Energy, Universities) */}
        <div className="mt-2 flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none" aria-label="Temas del radar mundial">
          <span className="shrink-0 text-[11px] font-semibold uppercase tracking-wider text-purple-300">Temas:</span>
          <button
            type="button"
            onClick={() => setSearchQuery(searchQuery === 'scifi' ? '' : 'scifi')}
            className={'shrink-0 rounded-full border px-3 py-1 text-xs font-semibold transition-all ' + (searchQuery === 'scifi' ? 'border-purple-400 bg-purple-500/25 text-purple-100 shadow-sm shadow-purple-500/25' : 'border-slate-800 bg-slate-900/90 text-slate-300 hover:border-purple-500/40 hover:text-white')}
          >
            🚀 Sci-Fi & Cyberpunk
          </button>
          <button
            type="button"
            onClick={() => setSearchQuery(searchQuery === 'misterio' ? '' : 'misterio')}
            className={'shrink-0 rounded-full border px-3 py-1 text-xs font-semibold transition-all ' + (searchQuery === 'misterio' ? 'border-indigo-400 bg-indigo-500/25 text-indigo-100 shadow-sm shadow-indigo-500/25' : 'border-slate-800 bg-slate-900/90 text-slate-300 hover:border-indigo-500/40 hover:text-white')}
          >
            👻 Fantasmas & Leyendas
          </button>
          <button
            type="button"
            onClick={() => setSearchQuery(searchQuery === 'ovni' ? '' : 'ovni')}
            className={'shrink-0 rounded-full border px-3 py-1 text-xs font-semibold transition-all ' + (searchQuery === 'ovni' ? 'border-teal-400 bg-teal-500/25 text-teal-100 shadow-sm shadow-teal-500/25' : 'border-slate-800 bg-slate-900/90 text-slate-300 hover:border-teal-500/40 hover:text-white')}
          >
            🛸 OVNIs & Astrobiología
          </button>
          <button
            type="button"
            onClick={() => setSearchQuery(searchQuery === 'energialimpia' ? '' : 'energialimpia')}
            className={'shrink-0 rounded-full border px-3 py-1 text-xs font-semibold transition-all ' + (searchQuery === 'energialimpia' ? 'border-emerald-400 bg-emerald-500/25 text-emerald-100 shadow-sm shadow-emerald-500/25' : 'border-slate-800 bg-slate-900/90 text-slate-300 hover:border-emerald-500/40 hover:text-white')}
          >
            ⚡ Energía Limpia & Planeta
          </button>
          <button
            type="button"
            onClick={() => setSearchQuery(searchQuery === 'universidad' ? '' : 'universidad')}
            className={'shrink-0 rounded-full border px-3 py-1 text-xs font-semibold transition-all ' + (searchQuery === 'universidad' ? 'border-amber-400 bg-amber-500/25 text-amber-100 shadow-sm shadow-amber-500/25' : 'border-slate-800 bg-slate-900/90 text-slate-300 hover:border-amber-500/40 hover:text-white')}
          >
            🎓 Universidades
          </button>
          <button
            type="button"
            onClick={() => setSearchQuery(searchQuery === 'monstertruck' ? '' : 'monstertruck')}
            className={'shrink-0 rounded-full border px-3 py-1 text-xs font-semibold transition-all ' + (searchQuery === 'monstertruck' ? 'border-red-400 bg-red-500/25 text-red-100 shadow-sm shadow-red-500/25' : 'border-slate-800 bg-slate-900/90 text-slate-300 hover:border-red-500/40 hover:text-white')}
          >
            🏎️ Monster Trucks & Motor
          </button>
          <button
            type="button"
            onClick={() => setSearchQuery(searchQuery === 'jetski' ? '' : 'jetski')}
            className={'shrink-0 rounded-full border px-3 py-1 text-xs font-semibold transition-all ' + (searchQuery === 'jetski' ? 'border-cyan-400 bg-cyan-500/25 text-cyan-100 shadow-sm shadow-cyan-500/25' : 'border-slate-800 bg-slate-900/90 text-slate-300 hover:border-cyan-500/40 hover:text-white')}
          >
            🌊 Jet Ski & Acuáticos
          </button>
          <button
            type="button"
            onClick={() => setSearchQuery(searchQuery === 'running' ? '' : 'running')}
            className={'shrink-0 rounded-full border px-3 py-1 text-xs font-semibold transition-all ' + (searchQuery === 'running' ? 'border-lime-400 bg-lime-500/25 text-lime-100 shadow-sm shadow-lime-500/25' : 'border-slate-800 bg-slate-900/90 text-slate-300 hover:border-lime-500/40 hover:text-white')}
          >
            🏃 Running en el Parque
          </button>
          <button
            type="button"
            onClick={() => setSearchQuery(searchQuery === 'ciclismo' ? '' : 'ciclismo')}
            className={'shrink-0 rounded-full border px-3 py-1 text-xs font-semibold transition-all ' + (searchQuery === 'ciclismo' ? 'border-emerald-400 bg-emerald-500/25 text-emerald-100 shadow-sm shadow-emerald-500/25' : 'border-slate-800 bg-slate-900/90 text-slate-300 hover:border-emerald-500/40 hover:text-white')}
          >
            🚴 Ciclismo & Bici
          </button>
          <button
            type="button"
            onClick={() => setSearchQuery(searchQuery === 'moda' ? '' : 'moda')}
            className={'shrink-0 rounded-full border px-3 py-1 text-xs font-semibold transition-all ' + (searchQuery === 'moda' ? 'border-pink-400 bg-pink-500/25 text-pink-100 shadow-sm shadow-pink-500/25' : 'border-slate-800 bg-slate-900/90 text-slate-300 hover:border-pink-500/40 hover:text-white')}
          >
            👗 Moda & Fashion
          </button>
          <button
            type="button"
            onClick={() => setSearchQuery(searchQuery === 'maquillaje' ? '' : 'maquillaje')}
            className={'shrink-0 rounded-full border px-3 py-1 text-xs font-semibold transition-all ' + (searchQuery === 'maquillaje' ? 'border-rose-400 bg-rose-500/25 text-rose-100 shadow-sm shadow-rose-500/25' : 'border-slate-800 bg-slate-900/90 text-slate-300 hover:border-rose-500/40 hover:text-white')}
          >
            💄 Maquillaje & Belleza
          </button>
          <button
            type="button"
            onClick={() => setSearchQuery(searchQuery === 'modelaje' ? '' : 'modelaje')}
            className={'shrink-0 rounded-full border px-3 py-1 text-xs font-semibold transition-all ' + (searchQuery === 'modelaje' ? 'border-fuchsia-400 bg-fuchsia-500/25 text-fuchsia-100 shadow-sm shadow-fuchsia-500/25' : 'border-slate-800 bg-slate-900/90 text-slate-300 hover:border-fuchsia-500/40 hover:text-white')}
          >
            👠 Pasarelas & Modelaje
          </button>
          <button
            type="button"
            onClick={() => setSearchQuery(searchQuery === 'revistadigital' ? '' : 'revistadigital')}
            className={'shrink-0 rounded-full border px-3 py-1 text-xs font-semibold transition-all ' + (searchQuery === 'revistadigital' ? 'border-violet-400 bg-violet-500/25 text-violet-100 shadow-sm shadow-violet-500/25' : 'border-slate-800 bg-slate-900/90 text-slate-300 hover:border-violet-500/40 hover:text-white')}
          >
            📖 Revistas Digitales
          </button>
          <button
            type="button"
            onClick={() => setSearchQuery(searchQuery === 'workshop' ? '' : 'workshop')}
            className={'shrink-0 rounded-full border px-3 py-1 text-xs font-semibold transition-all ' + (searchQuery === 'workshop' ? 'border-orange-400 bg-orange-500/25 text-orange-100 shadow-sm shadow-orange-500/25' : 'border-slate-800 bg-slate-900/90 text-slate-300 hover:border-orange-500/40 hover:text-white')}
          >
            🛠️ Talleres & Oficios
          </button>
          <button
            type="button"
            onClick={() => setSearchQuery(searchQuery === 'esports' ? '' : 'esports')}
            className={'shrink-0 rounded-full border px-3 py-1 text-xs font-semibold transition-all ' + (searchQuery === 'esports' ? 'border-amber-400 bg-amber-500/25 text-amber-100 shadow-sm shadow-amber-500/25' : 'border-slate-800 bg-slate-900/90 text-slate-300 hover:border-amber-500/40 hover:text-white')}
          >
            🎮 Esports & Gaming
          </button>
          <button
            type="button"
            onClick={() => setSearchQuery(searchQuery === 'mascotas' ? '' : 'mascotas')}
            className={'shrink-0 rounded-full border px-3 py-1 text-xs font-semibold transition-all ' + (searchQuery === 'mascotas' ? 'border-yellow-400 bg-yellow-500/25 text-yellow-100 shadow-sm shadow-yellow-500/25' : 'border-slate-800 bg-slate-900/90 text-slate-300 hover:border-yellow-500/40 hover:text-white')}
          >
            🐾 Mascotas & Pets
          </button>
          <button
            type="button"
            onClick={() => setSearchQuery(searchQuery === 'kpop' ? '' : 'kpop')}
            className={'shrink-0 rounded-full border px-3 py-1 text-xs font-semibold transition-all ' + (searchQuery === 'kpop' ? 'border-purple-400 bg-purple-500/25 text-purple-100 shadow-sm shadow-purple-500/25' : 'border-slate-800 bg-slate-900/90 text-slate-300 hover:border-purple-500/40 hover:text-white')}
          >
            ✨ K-Pop & Asia
          </button>
          <button
            type="button"
            onClick={() => setSearchQuery(searchQuery === 'libro' ? '' : 'libro')}
            className={'shrink-0 rounded-full border px-3 py-1 text-xs font-semibold transition-all ' + (searchQuery === 'libro' ? 'border-sky-400 bg-sky-500/25 text-sky-100 shadow-sm shadow-sky-500/25' : 'border-slate-800 bg-slate-900/90 text-slate-300 hover:border-sky-500/40 hover:text-white')}
          >
            📚 Ferias del Libro
          </button>
          <button
            type="button"
            onClick={() => setSearchQuery(searchQuery === 'aurora' ? '' : 'aurora')}
            className={'shrink-0 rounded-full border px-3 py-1 text-xs font-semibold transition-all ' + (searchQuery === 'aurora' ? 'border-teal-400 bg-teal-500/25 text-teal-100 shadow-sm shadow-teal-500/25' : 'border-slate-800 bg-slate-900/90 text-slate-300 hover:border-teal-500/40 hover:text-white')}
          >
            🌌 Ártico & Auroras
          </button>
        </div>

        {/* Global & Regional Quick-Jump Hotspots Rail */}
        <div className="mt-2 flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none" aria-label="Zonas rápidas del radar">
          <span className="shrink-0 text-[11px] font-semibold uppercase tracking-wider text-slate-400">{hubsLabel}</span>
          <button
            type="button"
            onClick={() => selectHub(null)}
            className={'shrink-0 rounded-full border px-3 py-1 text-xs font-medium transition-all ' + (area.kind === 'world' && !activeHubId && quickFilter !== 'virtual' ? 'border-violet-400 bg-violet-500/20 text-violet-100' : 'border-slate-800 bg-slate-900/90 text-slate-300 hover:border-slate-700 hover:text-white')}
          >
            🌎 Todo el Radar
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveHubId('virtual-online')
              setArea({ kind: 'world', label: '🌐 En Línea / Streams Mundiales' })
              setQuickFilter('virtual')
            }}
            className={'shrink-0 rounded-full border px-3 py-1 text-xs font-semibold transition-all ' + (quickFilter === 'virtual' ? 'border-cyan-400 bg-cyan-500/20 text-cyan-200 shadow-sm shadow-cyan-500/20' : 'border-slate-800 bg-slate-900/90 text-cyan-300 hover:border-slate-700 hover:text-white')}
          >
            🌐 En Línea / Streams
          </button>
          {sortedHubs.map(hub => (
            <button
              type="button"
              key={hub.id}
              onClick={() => selectHub(hub)}
              className={'shrink-0 rounded-full border px-3 py-1 text-xs font-medium transition-all ' + (activeHubId === hub.id ? 'border-violet-400 bg-violet-500/20 text-violet-100 shadow-sm shadow-violet-500/20' : 'border-slate-800 bg-slate-900/90 text-slate-300 hover:border-slate-700 hover:text-white')}
            >
              {hub.emoji} {hub.name}
            </button>
          ))}
        </div>
        {area.kind === 'nearby' && <label className="mt-2.5 flex items-center gap-2 text-xs text-slate-400">Radio de búsqueda<select aria-label="Radio de búsqueda" className="rounded-lg border border-slate-700 bg-slate-900 p-2 text-slate-200" value={area.radius} onChange={e => { const radius = Number(e.target.value); setArea({ ...area, radius, label: (area.source === 'map' ? 'Zona del mapa' : 'Cerca de ti') + ' · ' + radius + ' km' }) }}>{[5,15,25,50,100,300].map(radius => <option key={radius} value={radius}>{radius} km</option>)}</select></label>}
        {showLocation && <div id="discovery-location" className="mt-3 max-w-2xl text-foreground"><LocationPicker /></div>}
        <div className="mt-3.5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex rounded-xl bg-slate-900 p-1 border border-slate-800" role="group" aria-label="Qué quieres descubrir">{([['events', 'Eventos'], ['ideas', 'Ideas'], ['tribes', 'Tribus']] as const).map(([value, label]) => <button type="button" key={value} aria-pressed={viewType === value} onClick={() => setViewType(value)} className={'min-h-10 rounded-lg px-3.5 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-violet-400 ' + (viewType === value ? 'bg-violet-600 text-white shadow-sm' : 'text-slate-400 hover:text-white')}>{label}</button>)}</div>
          <div className="flex items-center gap-3"><span role="status" className="hidden text-xs tabular-nums text-slate-400 sm:inline">{loading ? 'Buscando…' : items.length + ' resultados'}{viewType === 'events' && totalEvents > rawEvents.length ? ' · ' + rawEvents.length + ' de ' + totalEvents + ' cargados' : ''}</span><div className="flex rounded-xl border border-slate-800 p-1" role="group" aria-label="Vista de resultados">{([{ value: 'map', label: 'Mapa', Icon: MapIcon }, { value: 'split', label: 'Lista y mapa', Icon: Columns }, { value: 'list', label: 'Tarjetas', Icon: LayoutGrid }] as const).map(({ value, label, Icon }) => <button type="button" key={value} aria-label={label} aria-pressed={viewMode === value} onClick={() => setViewMode(value)} className={'grid h-10 w-10 place-items-center rounded-lg focus-visible:ring-2 focus-visible:ring-violet-400 ' + (value === 'split' ? 'hidden lg:grid ' : '') + (viewMode === value ? 'bg-slate-700 text-violet-200' : 'text-slate-400 hover:text-white')}><Icon className="h-4 w-4" /></button>)}</div></div>
        </div>
        {communityGlobal && <p className="mt-3 text-xs leading-relaxed text-amber-200">Las ideas y tribus muestran su catálogo mundial. El filtro por ciudad o país está disponible en eventos; para ver estas comunidades cerca de un punto, usa ubicación o busca una zona en el mapa.</p>}
      </div>
    </header>
    {showFilters && <section id="discovery-filters" aria-label="Filtros de Discovery" className="border-b border-slate-800 bg-slate-900/50 px-4 py-4 sm:px-6 sm:py-5">
      <div className="mx-auto grid max-w-[1600px] gap-5 md:grid-cols-2 xl:grid-cols-3">
        <div><h2 className="mb-3 text-sm font-semibold">Categorías</h2><div className="flex max-h-48 flex-wrap gap-2 overflow-y-auto">{CATEGORY_LIST.map(cat => <button type="button" key={cat.slug} aria-pressed={selectedCategories.includes(cat.slug)} onClick={() => setSelectedCategories(prev => prev.includes(cat.slug) ? prev.filter(c => c !== cat.slug) : [...prev, cat.slug])} className={'min-h-10 rounded-lg border px-2.5 text-xs transition-colors ' + (selectedCategories.includes(cat.slug) ? 'border-violet-400 bg-violet-500/20 text-violet-100' : 'border-slate-700 text-slate-300 hover:bg-slate-800')}>{cat.emoji} {cat.label}</button>)}</div></div>
        <div><h2 className="mb-3 text-sm font-semibold">¿Qué te apetece?</h2><div className="flex flex-wrap gap-2">{DISCOVERY_VIBES.map(vibe => <button type="button" key={vibe.id} aria-pressed={activeVibe === vibe.id} onClick={() => setActiveVibe(activeVibe === vibe.id ? null : vibe.id)} className={button + (activeVibe === vibe.id ? ' border-violet-400 bg-violet-500/20' : '')}>{vibe.emoji} {vibe.label}</button>)}</div></div>
        {viewType === 'events' && <div><h2 className="mb-3 text-sm font-semibold">Fecha y entrada</h2><div className="flex flex-wrap gap-2">{([['now', 'En curso'], ['today', 'Hoy'], ['weekend', 'Fin de semana'], ['free', 'Gratis'], ['popular', 'Más asistentes'], ['virtual', '🌐 En Línea'], ['secret', 'Ubicación secreta']] as const).map(([value, label]) => <button type="button" key={value} aria-pressed={quickFilter === value} onClick={() => setQuickFilter(quickFilter === value ? null : value)} className={button + (quickFilter === value ? ' border-violet-400 bg-violet-500/20' : '')}>{label}</button>)}</div><p className="mt-2 text-xs text-slate-400">Hoy y fin de semana usan el calendario de tu dispositivo.</p><div className="mt-4 flex gap-2"><label className="flex-1 text-xs text-slate-400">Precio máximo<input type="number" min={0} max={100000000} value={budget} onChange={e => setBudget(e.target.value)} placeholder="Sin límite" className={input + ' mt-1'} /></label><label className="text-xs text-slate-400">Moneda<select value={currency} onChange={e => setCurrency(e.target.value)} className={input + ' mt-1'}>{['DOP', 'USD', 'EUR', 'MXN', 'COP', 'ARS', 'CLP', 'PEN', 'BRL', 'CAD', 'GBP'].map(c => <option key={c}>{c}</option>)}</select></label></div><p className="mt-2 text-xs text-slate-400">Con un máximo se muestran entradas en esa moneda y eventos gratuitos; no se convierten divisas.</p>{invalidBudget && <p role="alert" className="mt-2 text-xs text-rose-300">Escribe un precio entre 0 y 100.000.000 para aplicar el presupuesto.</p>}</div>}
      </div>
      <div className="mx-auto mt-5 flex max-w-[1600px] justify-end"><button type="button" onClick={resetFilters} className={button}><RotateCcw className="h-4 w-4" />Limpiar filtros</button></div>
    </section>}
    <section aria-label="Resultados de Discovery" className="mx-auto max-w-[1600px] p-3 sm:p-5">
      {activeQuery.isError && <div role="alert" className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-400/30 bg-rose-500/10 p-4 text-sm text-rose-100"><p>No pudimos cargar {viewType === 'events' ? 'los eventos' : viewType === 'ideas' ? 'las ideas' : 'las tribus'}. Revisa la conexión y vuelve a intentarlo.</p><button type="button" className={button} onClick={() => void activeQuery.refetch()}>Reintentar</button></div>}
      <div className={viewMode === 'list' ? '' : 'relative flex h-[68dvh] min-h-[30rem] overflow-hidden rounded-2xl border border-slate-800 md:h-[calc(100dvh-18rem)]'}>
        {viewMode === 'split' && <aside aria-label="Lista de resultados" className="hidden w-[23rem] shrink-0 overflow-y-auto border-r border-slate-800 p-4 lg:block">{cards}</aside>}
        {viewMode === 'list' ? cards : <div className="relative min-w-0 flex-1">
          <LazyMapComponent suppressSelectionPopup userLocation={mapCenter} events={viewType === 'events' ? fullyFilteredEvents : []} tribes={viewType === 'tribes' ? tribes : []} ideas={viewType === 'ideas' ? ideas : []}
            viewType={viewType} selectedEvent={selectedEvent} selectedItem={selectedEvent || selectedIdea || selectedTribe}
            onEventSelect={ev => { if (ev) { selectItem(ev); trackEventInteraction?.('view', ev._id, { source: 'discovery_map' }) } else close() }} onTribeSelect={item => item ? selectItem(item) : close()} onIdeaSelect={item => item ? selectItem(item) : close()}
            showRadius={area.kind === 'nearby'} showUserLocation={area.kind === 'nearby' && area.source !== 'map'} radiusKm={area.kind === 'nearby' ? area.radius : 50}
            fitToEvents={area.kind !== 'nearby'} overviewMode={area.kind === 'nearby' ? undefined : communityGlobal ? 'world' : area.kind === 'country' ? 'country' : area.kind === 'city' ? 'city' : 'world'}
            onLocationUpdate={loc => changeMapArea(loc, true)} onSearchArea={loc => changeMapArea(loc)}
            mapStyle={mapStyle} onMapStyleChange={setMapStyle} flyToTarget={flyToTarget} />
          {loading && <div className="absolute left-4 top-4 z-[950] rounded-xl border border-slate-700 bg-slate-950/95 px-4 py-3 text-sm text-slate-200" role="status">Cargando resultados…</div>}
          {!loading && !activeQuery.isError && items.length === 0 && <div className="absolute left-4 right-4 top-20 z-[950] mx-auto max-w-md rounded-2xl border border-slate-700 bg-slate-950/95 p-5 shadow-xl"><Compass className="mb-2 h-6 w-6 text-violet-300" /><h2 className="font-semibold">Todavía no hay resultados con estos filtros</h2><p className="mt-2 text-sm leading-relaxed text-slate-400">Prueba otro destino, carga más eventos o cambia los filtros. También puedes proponer una idea.</p><div className="mt-4 flex flex-wrap gap-2"><button type="button" className={button} onClick={resetFilters}>Limpiar filtros</button><button type="button" className={button} onClick={() => setShowLocation(true)}>Cambiar destino</button></div></div>}
          {viewMode === 'map' && items.length > 0 && !selectedEvent && !selectedIdea && !selectedTribe && <DiscoveryCarousel items={items} viewType={viewType} onSelect={selectItem} onSurpriseMe={viewType === 'events' ? surprise : undefined} busyAction={!!busyAction} userLocation={area.kind === 'nearby' && area.source !== 'map' ? center : null} />}
          {(selectedEvent || selectedIdea || selectedTribe) && <DiscoveryDetailPanel selectedEvent={selectedEvent} selectedIdea={selectedIdea} selectedTribe={selectedTribe} userLocation={area.kind === 'nearby' && area.source !== 'map' ? center : null} isFavorite={isFavorite} onToggleFavorite={toggleFavorite} onClose={close} onAttendToggle={handleAttend} onJoinTribe={handleJoinTribe} onSupportIdea={handleSupport} busyAction={!!busyAction} />}
        </div>}
      </div>
      {viewMode === 'list' && !loading && !activeQuery.isError && !items.length && <div className="py-16 text-center"><Compass className="mx-auto mb-3 h-8 w-8 text-violet-300" /><h2 className="text-lg font-semibold">No encontramos resultados con esos filtros</h2><p className="mx-auto mt-2 max-w-md text-sm text-slate-400">Cambia el destino o limpia los filtros para seguir explorando.</p><button type="button" onClick={resetFilters} className={button + ' mt-5'}>Limpiar filtros</button></div>}
      {unlocated > 0 && <p className="mt-3 text-xs text-slate-400">{unlocated} resultados sin coordenadas válidas aparecen en las tarjetas, sin inventar un punto en el mapa.</p>}
      {viewType === 'events' && eventsQuery.hasNextPage && <div className="mt-4 text-center"><button type="button" className={button} disabled={eventsQuery.isFetchingNextPage} onClick={() => void eventsQuery.fetchNextPage()}>{eventsQuery.isFetchingNextPage ? 'Cargando…' : 'Cargar más eventos'}</button><p className="mt-2 text-xs text-slate-400">Mostrando {rawEvents.length} de {totalEvents} eventos que coinciden con tu búsqueda.</p></div>}
    </section>
    
      {/* 10 Dominican Innovations: Live Vibe Heat Radar & Nearby Flash Deals */}
      <section className="mx-auto max-w-[1600px] p-3 sm:p-5 space-y-6">
        <LiveVibeRadar area={area} identity={identity} />
        <NearbyFlashDeals />
      </section>

      <ContentFilterModal isOpen={isContentFilterOpen} onClose={() => setIsContentFilterOpen(false)} onApply={setContentPrefs} />
  </div>
}
