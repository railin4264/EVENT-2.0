'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { SiteSections } from '@/components/layout/SiteSections'
import { ArrowRight, Calendar, Compass, Dices, List, Loader2, Lock, Map as MapIcon, MapPin, Navigation, Plus, RefreshCw, Search, ShieldCheck, Sparkles, Users, X, SlidersHorizontal } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { eventsService } from '@/lib/api/services'
import type { Event } from '@/types/models'
import { Button } from '@/components/redesign/ui/button'
import { Input } from '@/components/redesign/ui/input'
import { CompactThemeToggle } from '@/components/redesign/ui/theme-toggle'
import MapComponent from '@/components/discovery/MapComponent'
import { categories, distanceKm, filterEvents, isLive, type Location } from '@/components/discovery/discovery-utils'
import { HomeToolsHub } from '@/components/discovery/HomeToolsHub'
import { DiscoveryIntro } from '@/components/discovery/DiscoveryIntro'
import { FeaturedBanner } from '@/components/discovery/FeaturedBanner'
import { TrendingRow, ForYouRow, IdeasRadar, FeaturedTribesRow } from '@/components/discovery/DiscoveryRows'
import { FeaturedOrganizers } from '@/components/discovery/FeaturedOrganizers'
import { WeekendRadioPill } from '@/components/home/WeekendRadioPill'
import { RouletteModal } from '@/components/discovery/RouletteModal'
import ContentFilterModal, { loadStoredPreferences, type ContentFilterPreferences } from '@/components/discovery/ContentFilterModal'
import '@/styles/discovery.css'
import { formatPrice, formatEventDate } from '@/lib/event-display'
import { LocationPicker } from '@/components/discovery/LocationPicker'
import { areaCenter, areaParams, WORLD_AREA, type DiscoveryArea } from '@/lib/discovery-area'
import { useDiscoveryArea } from '@/stores/discoveryAreaStore'
import { useLiveLocation } from '@/hooks/useLiveLocation'
import { getEventTiming } from '@/components/events/event-phase'
import { nextPlanQuery } from '@/lib/event-window'
import { countVerifiedEventRegistrations } from '@/lib/event-whatsapp-invite'

const CATEGORY_COLORS = Object.fromEntries(categories.map(category => [category.value, '#8b7cc8']))
const DEFAULT_CENTER = { lat: 20, lng: 0 }
const DATE_FILTERS = [{ value: '', label: 'Cualquier fecha' }, { value: 'next12h', label: 'Ahora y próximas 12 h' }, { value: 'today', label: 'Hoy (calendario)' }, { value: 'tomorrow', label: 'Mañana' }, { value: 'weekend', label: 'Este fin de semana' }, { value: 'week', label: 'Próximos 7 días' }]


export default function HomeScreen() {
  const { isAuthenticated, user } = useAuthStore()
  const { coords: liveCoords, city: liveCity, refreshLocation, isWatching } = useLiveLocation(true)
  const [contentPrefs, setContentPrefs] = useState<ContentFilterPreferences>(loadStoredPreferences)
  const [isContentFilterOpen, setIsContentFilterOpen] = useState(false)
  const { area, initialized, setArea } = useDiscoveryArea()
  const location = useMemo(() => areaCenter(area), [area])
  const cityName = area.label
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [category, setCategory] = useState('')
  const [date, setDate] = useState('')
  const [clock, setClock] = useState(() => new Date())
  const horizon = useMemo(() => date === 'next12h' ? nextPlanQuery(clock).startsBefore : undefined, [date, clock])
  const [query, setQuery] = useState('')
  const [serverQuery, setServerQuery] = useState('')
  const [totalEvents, setTotalEvents] = useState(0)
  const [sort, setSort] = useState('soon')
  const [view, setView] = useState<'map' | 'list'>('list')
  const [selected, setSelected] = useState<Event | null>(null)
  const [isUnofficialOnly, setIsUnofficialOnly] = useState(false)
  const [pendingZone, setPendingZone] = useState<Location | null>(null)
  const [isRouletteOpen, setIsRouletteOpen] = useState(false)
  const [visibleLimit, setVisibleLimit] = useState(6)
  const requestId = useRef(0)
  useEffect(() => { const timer = setTimeout(() => setServerQuery(query.trim()), 300); return () => clearTimeout(timer) }, [query])
  useEffect(() => {
    const tick = () => { if (!document.hidden) setClock(new Date()) }
    const interval = window.setInterval(tick, 60000)
    document.addEventListener('visibilitychange', tick)
    return () => { window.clearInterval(interval); document.removeEventListener('visibilitychange', tick) }
  }, [])

  const loadEvents = useCallback(async () => {
    const request = ++requestId.current
    setLoading(true)
    setError(false)
    setSelected(null)
    try {
      const response = await eventsService.getEvents({
        limit: 100, timeFilter: 'upcoming', status: 'published', sort: 'date',
        ...(horizon ? { startsBefore: horizon } : {}),
        ...areaParams(area), ...(category ? { category: category as Event['category'] } : {}),
        ...(serverQuery ? { search: serverQuery } : {}), ...(isUnofficialOnly ? { isUnofficial: 'true' } : {})
      })
      const payload = response as unknown as { data?: Event[] | { events?: Event[] }; events?: Event[]; pagination?: { total?: number } }
      const list = Array.isArray(payload.data) ? payload.data : payload.events || payload.data?.events
      if (!Array.isArray(list)) throw new Error('Unexpected events response')
      if (request === requestId.current) { setEvents(list); setTotalEvents(payload.pagination?.total ?? list.length) }
    } catch {
      if (request === requestId.current) { setEvents([]); setError(true) }
    } finally {
      if (request === requestId.current) setLoading(false)
    }
  }, [area, category, serverQuery, isUnofficialOnly, horizon])

  useEffect(() => { if (initialized) void loadEvents(); return () => { requestId.current++ } }, [initialized, loadEvents])

  const changeLocation = useCallback((center: Location, label = 'Zona del mapa · 50 km') => {
    setArea({ kind: 'nearby', label, lat: center.lat, lng: center.lng, radius: 50, source: label.startsWith('Cerca') ? 'gps' : 'map' })
    setPendingZone(null)
    setSort('distance')
  }, [setArea])

  const hasActiveRestrictions = Boolean(
    contentPrefs.hidePolitical ||
    contentPrefs.hideReligious ||
    contentPrefs.hiddenCategories?.length ||
    contentPrefs.contentFilterMode === 'whitelist'
  )

  const visibleEvents = useMemo(() => {
    const list = filterEvents(events, {
      category,
      date,
      query,
      sort,
      location,
      hidePolitical: contentPrefs.hidePolitical,
      hideReligious: contentPrefs.hideReligious,
      hiddenCategories: contentPrefs.hiddenCategories,
      preferredCategories: contentPrefs.preferredCategories,
      contentFilterMode: contentPrefs.contentFilterMode
    }, clock)
    return isUnofficialOnly ? list.filter(e => (e as any).isUnofficial) : list
  }, [events, category, date, query, sort, location, isUnofficialOnly, contentPrefs, clock])
  const filtersActive = Boolean(category || date || query || isUnofficialOnly)
  useEffect(() => { setVisibleLimit(6) }, [category, date, query, sort, location, isUnofficialOnly, contentPrefs])
  const createHref = isAuthenticated ? '/events/create' : '/login?redirect=%2Fevents%2Fcreate'

  return (
    <div className="discovery-page min-h-dvh bg-background text-foreground">
      <header className="discovery-header border-b border-border bg-background/95">
        <nav aria-label="Navegación principal" className="mx-auto flex max-w-[1440px] items-center justify-between gap-3 px-4 py-3.5 sm:px-8 sm:py-4">
          <Link href="/" className="flex items-center gap-2 text-xl font-semibold tracking-tight" aria-label="EventNow, inicio"><span className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-white"><Compass className="h-5 w-5" /></span>EventNow<span className="h-1.5 w-1.5 rounded-full bg-primary" /></Link>
          <SiteSections className="hidden xl:flex" />
          <div className="flex items-center gap-2.5 sm:gap-3">
            <button
              onClick={() => setIsRouletteOpen(true)}
              className="hidden min-h-11 items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-xs font-semibold text-foreground transition-colors hover:bg-muted active:scale-95 sm:inline-flex"
              title="¿No sabes qué hacer hoy? Gira la ruleta y descubre un plan"
            >
              <Dices className="w-4 h-4" aria-hidden="true" />
              <span>Sorpréndeme</span>
            </button>
            <Link href="/search" aria-label="Búsqueda global" title="Buscar eventos, lugares, tribus y anfitriones" className="flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-border hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"><Search className="h-5 w-5" /></Link>
            <CompactThemeToggle />
            <Link href={isAuthenticated ? '/profile' : '/login'} className="px-2 py-1 text-sm font-medium hover:text-primary">{isAuthenticated ? 'Mi perfil' : 'Entrar'}</Link>
            <Button asChild size="sm" className="hidden rounded-xl px-3.5 sm:inline-flex"><Link href={createHref}><Plus className="mr-1.5 h-4 w-4" />Crear evento</Link></Button>
          </div>
        </nav>
        <SiteSections className="mx-auto flex max-w-[1440px] justify-center border-t border-border px-3 py-1 xl:hidden" />
      </header>

      <section className="discovery-hero mx-auto max-w-[1440px] px-5 sm:px-8" aria-labelledby="discovery-title">
        <DiscoveryIntro
          createHref={createHref}
          todayActive={date === 'next12h'}
          onToday={() => { setClock(new Date()); setDate(current => current === 'next12h' ? '' : 'next12h') }}
          onCategory={(cat) => { setIsUnofficialOnly(false); setCategory(cat) }}
          onUnofficial={() => { setCategory(''); setIsUnofficialOnly(true) }}
          selectedCategory={category}
          unofficialOnly={isUnofficialOnly}
        />
        <div className="discovery-hero-feature">{date === 'next12h' ? <aside aria-label="Tu plan de hoy" className="flex min-h-72 flex-col justify-center rounded-3xl bg-gradient-to-br from-indigo-950 via-violet-950 to-slate-950 p-8 text-white sm:p-12"><p className="text-sm font-semibold text-violet-200">EN CURSO + PRÓXIMAS 12 HORAS</p><h2 className="mt-5 text-4xl font-semibold tracking-tight">Hoy se sale.<br />Tú eliges el plan.</h2><p className="mt-5 max-w-sm text-sm leading-relaxed text-violet-100">Explora {area.label}, encuentra tu ambiente y comparte el evento con tu coro.</p><a href="#planes" className="mt-7 inline-flex min-h-11 items-center gap-2 self-start rounded-xl bg-white px-5 py-3 text-sm font-semibold text-indigo-950">Ver planes de hoy <ArrowRight className="h-4 w-4" /></a></aside> : !loading && !error && !events.length && !filtersActive ? <aside className="flex min-h-80 flex-col justify-between rounded-3xl border border-primary/20 bg-card p-8 sm:p-10"><div><span className="inline-flex items-center gap-2 text-sm font-medium text-primary"><Sparkles size={18} /> Un lugar para tus ideas</span><h2 className="mt-6 max-w-sm text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">El próximo buen plan puede empezar contigo.</h2><p className="mt-5 max-w-sm text-sm leading-relaxed text-muted-foreground">Todavía no hay eventos publicados en este destino. Comparte una actividad o propone una idea para encontrar a tu gente.</p></div><div className="mt-8 flex flex-wrap gap-3"><Link href={createHref} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground">Crear un evento <ArrowRight size={16} /></Link><Link href="/ideas" className="inline-flex min-h-11 items-center rounded-xl border border-border px-4 text-sm font-medium">Proponer una idea</Link></div></aside> : <FeaturedBanner geo={areaParams(area)} />}</div>
      </section>


      <nav aria-label="Elige tu próximo paso" className="mx-auto flex max-w-[1440px] flex-wrap gap-3 px-5 pb-8 sm:px-8">
        <a href="#planes" className="inline-flex min-h-11 items-center rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground">Encontrar un evento</a>
        <Link href="/plans" className="inline-flex min-h-11 items-center rounded-full border border-border px-5 text-sm font-semibold hover:bg-muted">Decidir con mi coro</Link>
        <a href="#herramientas" className="inline-flex min-h-11 items-center rounded-full border border-border px-5 text-sm font-semibold hover:bg-muted">Crear y colaborar</a>
      </nav>

      <section className="mx-auto max-w-[1440px] px-5 pb-7 sm:px-8">
        {/* Live GPS Radar Pill */}
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-500/25 bg-gradient-to-r from-emerald-500/10 via-background to-teal-500/5 p-3.5 px-4 shadow-sm backdrop-blur-sm">
          <div className="flex items-center gap-2.5 text-xs font-medium text-emerald-800 dark:text-emerald-300">
            <span className="relative flex h-2.5 w-2.5">
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500"></span>
            </span>
            <span>
              Destino seleccionado: <strong>{area.label}</strong> · Explora los planes publicados en esta zona
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                refreshLocation()
                if (liveCoords) {
                  changeLocation({ lat: liveCoords.lat, lng: liveCoords.lng }, `Cerca de ti (${liveCity || 'GPS'})`)
                }
              }}
              className="inline-flex items-center gap-1 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-500/20 dark:text-emerald-300"
              title="Centrar el radar en mi ubicación actual detectada"
            >
              <Navigation className="h-3 w-3" />
              <span>Centrar en mi zona</span>
            </button>
            <Link
              href="/discovery"
              className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
            >
              <MapIcon className="h-3 w-3" />
              <span>Ver en mapa</span>
            </Link>
          </div>
        </div>


        {/* EventNow Radio Weekend Audio Capsule */}
        <div className="mb-6">
          <WeekendRadioPill events={events} />
        </div>

        <div id="planes" className="discovery-search-heading"><h2>Encuentra algo que vaya contigo</h2><span className="text-sm text-muted-foreground">Tu plan puede estar en cualquier lugar</span></div>
        <div className="discovery-search grid items-start gap-4 md:grid-cols-[1fr_1.2fr]">
          <div className="pt-3"><label htmlFor="event-search" className="discovery-field-label">¿Qué quieres hacer?</label><div className="relative"><Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input id="event-search" aria-label="Buscar eventos" placeholder="Música, talleres, encuentros…" value={query} onChange={event => setQuery(event.target.value)} className="h-12 rounded-xl bg-card pl-11 pr-11" />{query && <button aria-label="Borrar búsqueda" onClick={() => setQuery('')} className="absolute right-1 top-1 grid h-10 w-10 place-items-center rounded-lg text-muted-foreground hover:text-foreground"><X size={16} /></button>}</div><p className="mt-3 text-xs leading-relaxed text-muted-foreground">Explora sin cuenta. Filtra por tus intereses o cambia el destino para descubrir más planes.</p></div>
          <LocationPicker />
        </div>
        <div className="mt-5 flex gap-2 overflow-x-auto pb-2" aria-label="Categorías">
          <button
            onClick={() => setIsContentFilterOpen(true)}
            className={`whitespace-nowrap rounded-full border px-4 py-2 text-sm font-semibold transition-all flex items-center gap-1.5 ${
              hasActiveRestrictions
                ? 'border-amber-500/50 bg-amber-500/15 text-amber-500 dark:text-amber-300 shadow-sm'
                : 'border-border bg-card text-muted-foreground hover:border-primary/50 hover:text-foreground'
            }`}
            title="Personaliza qué categorías y contenidos deseas ver"
          >
            <SlidersHorizontal size={15} aria-hidden="true" />
            <span>Filtro de Contenido</span>
            {hasActiveRestrictions && <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />}
          </button>
          <button
            aria-pressed={isUnofficialOnly}
            onClick={() => setIsUnofficialOnly(!isUnofficialOnly)}
            className={`whitespace-nowrap rounded-full border px-4 py-2 text-sm font-semibold transition-all flex items-center gap-1.5 ${
              isUnofficialOnly
                ? 'border-primary bg-primary text-white shadow-sm'
                : 'border-border bg-card text-muted-foreground hover:border-primary/50 hover:text-foreground'
            }`}
          >
            <Sparkles size={15} aria-hidden="true" /> Extraoficiales
          </button>
          {categories.map(item => <button key={item.value} aria-pressed={category === item.value} onClick={() => setCategory(item.value)} className={`whitespace-nowrap rounded-full border px-4 py-2 text-sm font-medium transition-colors ${category === item.value ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card text-muted-foreground hover:border-primary/50 hover:text-foreground'}`}>{item.label}</button>)}
        </div>
      </section>

      <section aria-label="Resultados de eventos" className="mx-auto max-w-[1440px] px-5 pb-12 sm:px-8">
        <div className="discovery-results-toolbar mb-5 flex flex-wrap items-center justify-between gap-4 border-t border-border pt-5">
          <div><h2 className="text-lg font-semibold">{cityName}</h2><p role="status" className="mt-1 text-sm text-muted-foreground">{loading ? 'Buscando planes para ti…' : error ? 'No pudimos actualizar los eventos' : `${visibleEvents.length} ${visibleEvents.length === 1 ? 'evento para descubrir' : 'eventos para descubrir'}`}{area.kind === 'nearby' && !loading && ' · Radio de 50 km'}{!filtersActive && !loading && totalEvents > events.length && ` · ${totalEvents} en el catálogo`}</p></div>
          <div className="flex flex-wrap items-center gap-2">
            <select aria-label="Filtrar por fecha" value={date} onChange={event => { setClock(new Date()); setDate(event.target.value) }} className="h-10 max-w-48 rounded-lg border border-border bg-card px-3 text-sm">{DATE_FILTERS.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}</select>
            <select aria-label="Ordenar eventos" value={sort} onChange={event => setSort(event.target.value)} className="h-10 rounded-lg border border-border bg-card px-3 text-sm"><option value="soon">Empiezan pronto</option><option value="popular">Más populares</option><option value="new">Recién publicados</option>{location && <option value="distance">Más cerca</option>}</select>
            <div className="flex rounded-lg border border-border p-1"><button aria-label="Vista de lista" aria-pressed={view === 'list'} onClick={() => setView('list')} className={`rounded-md p-2 ${view === 'list' ? 'bg-muted text-foreground' : 'text-muted-foreground'}`}><List className="h-4 w-4" /></button><button aria-label="Vista de mapa" aria-pressed={view === 'map'} onClick={() => setView('map')} className={`rounded-md p-2 ${view === 'map' ? 'bg-muted text-foreground' : 'text-muted-foreground'}`}><MapIcon className="h-4 w-4" /></button></div>
          </div>
        </div>
        {(filtersActive || location) && <div className="mb-4 flex flex-wrap gap-3 text-sm">{filtersActive && <button onClick={() => { setCategory(''); setDate(''); setQuery(''); setIsUnofficialOnly(false) }} className="flex items-center gap-1 text-primary"><X className="h-3 w-3" />Limpiar filtros</button>}{location && <button className="text-muted-foreground underline underline-offset-4" onClick={() => { setArea(WORLD_AREA); setSort('soon'); setPendingZone(null) }}>Ver todos los destinos</button>}</div>}
        <div className={view === 'map' ? 'grid gap-5 lg:grid-cols-[1.4fr_1fr]' : ''}>
          {view === 'map' && <div className="relative isolate h-[440px] overflow-hidden rounded-2xl border border-border lg:sticky lg:top-5 lg:h-[650px]"><MapComponent userLocation={location || DEFAULT_CENTER} showUserLocation={area.kind === 'nearby' && area.source !== 'map'} showRadius={area.kind === 'nearby'} fitToEvents={area.kind !== 'nearby'} overviewMode={area.kind === 'nearby' ? undefined : area.kind === 'country' ? 'country' : area.kind === 'city' ? 'city' : 'world'} events={visibleEvents as any} categoryColors={CATEGORY_COLORS} selectedEvent={selected as any} onEventSelect={event => setSelected(event as unknown as Event)} onLocationUpdate={center => changeLocation(center, 'Cerca de ti')} onMoveEnd={center => { if (!location || Math.abs(center.lat - location.lat) + Math.abs(center.lng - location.lng) > 0.005) setPendingZone(center) }} />{pendingZone && <Button onClick={() => changeLocation(pendingZone)} className="absolute bottom-5 left-1/2 z-[1000] -translate-x-1/2 whitespace-nowrap shadow-lg">Buscar en esta zona</Button>}</div>}
          <div>
            {loading ? <div className={`grid gap-5 ${view === 'list' ? 'sm:grid-cols-2 lg:grid-cols-3' : ''}`} aria-label="Cargando eventos">{Array.from({ length: 6 }, (_, index) => <div key={index} className="overflow-hidden rounded-2xl border border-border"><div className="aspect-[16/9] animate-pulse bg-muted" /><div className="space-y-3 p-5"><div className="h-3 w-24 animate-pulse rounded bg-muted" /><div className="h-5 w-3/4 animate-pulse rounded bg-muted" /><div className="h-3 w-1/2 animate-pulse rounded bg-muted" /></div></div>)}</div>
              : error ? <div role="alert" className="flex min-h-80 flex-col items-center justify-center rounded-2xl border border-border bg-card p-8 text-center"><RefreshCw className="mb-4 h-8 w-8 text-muted-foreground" /><h3 className="text-xl font-semibold">Los planes se están haciendo esperar</h3><p className="mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">No pudimos conectar con los eventos. Revisa tu conexión e inténtalo de nuevo.</p><Button className="mt-5" onClick={() => loadEvents()}>Volver a intentar</Button></div>
              : visibleEvents.length === 0 ? <div className="flex min-h-80 flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/40 p-8 text-center"><Compass className="mb-4 h-10 w-10 text-primary" /><h3 className="text-xl font-semibold">{filtersActive ? 'Probemos con otro plan' : 'Aquí puede empezar algo bueno'}</h3><p className="mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">{filtersActive ? 'No encontramos eventos con estos filtros. Cambia la fecha o explora otras categorías.' : 'Todavía no hay eventos publicados en esta zona. Explora otra ciudad o reúne a tu gente con tu propio evento.'}</p><div className="mt-5 flex flex-wrap justify-center gap-3">{filtersActive && <Button variant="outline" onClick={() => { setCategory(''); setDate(''); setQuery(''); setIsUnofficialOnly(false) }}>Quitar filtros</Button>}<Button asChild><Link href={createHref}>Crear un evento<ArrowRight className="ml-2 h-4 w-4" /></Link></Button></div></div>
              : <div className={`grid gap-5 ${view === 'list' ? 'sm:grid-cols-2 xl:grid-cols-3' : ''}`}>{visibleEvents.slice(0, visibleLimit).map(event => {
                const distance = location ? distanceKm(location, event) : Infinity
                const image = event.images?.[0]?.url || event.imageUrl
                const categoryLabel = categories.find(item => item.value === event.category)?.label || event.category
                const isSecret = Boolean((event as any).isSecretLocation)
                const timing = getEventTiming(event, clock)
                const confirmed = countVerifiedEventRegistrations(event.attendees, event.attendanceSummary)
                return <article key={event._id} className={`group overflow-hidden rounded-2xl border bg-card transition-shadow hover:shadow-lg ${selected?._id === event._id ? 'border-primary' : 'border-border'}`} onMouseEnter={() => setSelected(event)}>
                  <Link href={`/events/${event._id}`} className="relative block aspect-[16/9] overflow-hidden bg-muted" aria-label={`Ver ${event.title}`}>{image ? <img src={image} alt={event.title} loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" /> : <div className="flex h-full items-center justify-center bg-primary/5"><Calendar className="h-14 w-14 text-primary/40" /></div>}<span className="absolute left-3 top-3 rounded-md bg-background/95 px-2.5 py-1 text-xs font-medium">{categoryLabel}</span>
                  {!event.imported && ((event as any).isOrganizerVerified || (event.createdBy as any)?.isOrganizerVerified) && (
                    <span className="absolute left-3 bottom-3 rounded-md bg-emerald-600/90 backdrop-blur-sm px-2 py-0.5 text-[11px] font-bold text-white shadow-sm flex items-center gap-1">
                      <ShieldCheck className="h-3 w-3" /> Verificado
                    </span>
                  )}{(event as any).isUnofficial && <span className="absolute right-3 top-3 rounded-md bg-gradient-to-r from-violet-600 to-fuchsia-600 px-2.5 py-1 text-xs font-bold text-white shadow-md flex items-center gap-1"><span>🤫</span> Extraoficial</span>}{isLive(event, clock) && <span title={timing.endIsEstimated ? 'Sin hora de cierre confirmada: se usa una duración estimada de dos horas.' : 'Según el horario publicado del evento.'} className="absolute bottom-3 left-3 rounded-md bg-emerald-700 px-2.5 py-1 text-xs font-semibold text-white">{timing.endIsEstimated ? 'Inicio reciente · horario estimado' : 'En curso'}</span>}</Link>
                  <div className="p-5"><p className="text-xs font-semibold text-primary">{formatEventDate(event.date, event.timeZone)}</p><h3 className="mt-2 text-xl font-semibold leading-snug tracking-tight"><Link href={`/events/${event._id}`} className="hover:text-primary">{event.title}</Link></h3><p className="mt-3 flex items-start gap-1.5 text-sm text-muted-foreground">{isSecret ? <Lock className="mt-0.5 h-4 w-4 shrink-0 text-primary" /> : <MapPin className="mt-0.5 h-4 w-4 shrink-0" />}<span>{isSecret ? 'Ubicación secreta · Se revela al confirmar' : (event.location?.venue || event.location?.address || 'Ubicación por confirmar')}{Number.isFinite(distance) && ` · ${distance < 1 ? `${Math.round(distance * 1000)} m` : `${distance.toFixed(1)} km`}`}</span></p><div className="mt-4 flex items-center justify-between border-t border-border pt-4"><span className="text-sm font-semibold">{formatPrice({ price: event.price })}</span><span className="flex items-center gap-1.5 text-xs text-muted-foreground"><Users className="h-3.5 w-3.5" />{confirmed === undefined ? 'Inscripciones por confirmar' : (confirmed === 1 ? '1 inscripción confirmada' : confirmed + ' inscripciones confirmadas')}</span></div><Link href={`/events/${event._id}`} className="mt-4 flex items-center justify-between text-sm font-medium text-primary">Ver evento<ArrowRight className="h-4 w-4" /></Link></div>
                </article>
              })}</div>}
          </div>
        </div>
      </section>
      {!loading && !error && visibleEvents.length > visibleLimit && <div className="mx-auto max-w-[1440px] px-5 pb-12 text-center sm:px-8"><Button variant="outline" onClick={() => setVisibleLimit(limit => limit + 6)} className="min-h-12 rounded-xl px-7">Mostrar más planes <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" /></Button></div>}
      {!loading && !error && totalEvents > events.length && <p className="mx-auto max-w-[1440px] px-5 pb-8 text-center text-sm text-muted-foreground">Hay más planes en este destino. <Link href="/events" className="font-medium text-primary underline underline-offset-4">Ver el catálogo completo</Link></p>}
      {date !== 'next12h' && <ForYouRow geo={areaParams(area)} />}
      {date !== 'next12h' && <TrendingRow geo={areaParams(area)} />}
      <FeaturedTribesRow geo={areaParams(area)} />
      <IdeasRadar />
      <HomeToolsHub />
      <FeaturedOrganizers />
      <section className="discovery-community-invite mx-auto max-w-[1376px]" aria-labelledby="community-invite-title">
        <div><p className="discovery-section-kicker">El siguiente paso lo eliges tú</p><h2 id="community-invite-title">Los mejores planes se comparten.</h2><p>Explora comunidades, organiza tu encuentro o crea una cuenta para guardar tus favoritos.</p></div>
        <div className="flex flex-wrap items-center gap-5"><Button asChild className="min-h-12 rounded-xl"><Link href={isAuthenticated ? '/tribes' : '/register'}>{isAuthenticated ? 'Encontrar mi comunidad' : 'Crear mi cuenta'} <ArrowRight className="ml-2 h-4 w-4" /></Link></Button><Link href={createHref} className="discovery-text-action">Organizar un plan <Plus className="h-4 w-4" /></Link></div>
      </section>

      <RouletteModal
        isOpen={isRouletteOpen}
        onClose={() => setIsRouletteOpen(false)}
        userLocation={area.kind === 'nearby' ? location : null}
      />

      <ContentFilterModal
        isOpen={isContentFilterOpen}
        onClose={() => setIsContentFilterOpen(false)}
        currentUser={user}
        onApply={(newPrefs) => setContentPrefs(newPrefs)}
      />

      <footer className="border-t border-border"><div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-4 px-5 py-6 text-xs text-muted-foreground sm:px-8"><span>EventNow · Buenos planes, conexiones reales.</span><nav aria-label="Información" className="flex flex-wrap items-center gap-5"><Link href="/tribes">Comunidades</Link><Link href="/passport">Pasaporte</Link><Link href="/suppliers">Suplidores RD</Link><button type="button" onClick={() => setIsRouletteOpen(true)}>Sorpréndeme</button><Link href="/privacy">Privacidad</Link><Link href="/terms">Términos</Link></nav></div></footer>
    </div>
  )
}
