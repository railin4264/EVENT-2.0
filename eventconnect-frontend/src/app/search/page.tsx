'use client'

import { Suspense, useEffect, useState } from 'react'
import Link from 'next/link'
import { useSearchParams, useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { Search, X, Filter, ArrowRight, Calendar, Users, User } from 'lucide-react'
import { CATEGORY_LIST } from '@/lib/categories'
import { apiClient } from '@/lib/api/client'
import { useDebounce } from '@/hooks/useDebounce'
import { useAuthStore } from '@/stores/authStore'
import { readSearchPage, searchResultPath, SEARCH_FILTERS, type SearchType, type GlobalSearchResult } from '@/lib/global-search'

function SearchContent() {
  const params = useSearchParams()
  const router = useRouter()
  const user = useAuthStore(state => state.user)
  const owner = String(user?.id || user?._id || 'guest')
  const initial = params.get('q') || ''
  const [query, setQuery] = useState(initial.slice(0, 100))
  const [type, setType] = useState<SearchType>('all')
  const [page, setPage] = useState(1)
  const [showFilters, setShowFilters] = useState(false)
  const [filters, setFilters] = useState({ category: '', location: '', startDate: '', endDate: '', minPrice: '', maxPrice: '' })
  const [recent, setRecent] = useState<{ owner: string; values: string[] }>({ owner, values: [] })
  const debounced = useDebounce(query.trim(), 300)
  const settledFilters = useDebounce(filters, 300)
  useEffect(() => { setQuery(initial.slice(0, 100)); setPage(1) }, [initial])
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(`global-search-recent:${owner}`) || '[]')
      setRecent({ owner, values: Array.isArray(saved) ? saved.filter(value => typeof value === 'string' && value.length <= 100).slice(0, 6) : [] })
    } catch { setRecent({ owner, values: [] }) }
  }, [owner])
  const remember = () => {
    if (query.trim().length < 2) return
    const values = [query.trim(), ...(recent.owner === owner ? recent.values : []).filter(value => value !== query.trim())].slice(0, 6)
    setRecent({ owner, values })
    try { localStorage.setItem(`global-search-recent:${owner}`, JSON.stringify(values)) } catch { /* Storage can be unavailable. */ }
    router.replace(`/search?q=${encodeURIComponent(query.trim())}`, { scroll: false })
  }
  const results = useQuery({
    queryKey: ['global-search', owner, debounced, type, settledFilters, page],
    enabled: debounced.length >= 2,
    queryFn: async ({ signal }) => {
      const response = await apiClient.get('/search', { params: { q: debounced, type, page, limit: 12, ...Object.fromEntries(Object.entries(settledFilters).filter(([, value]) => value !== '')) }, signal })
      return readSearchPage(response.data)
    },
    retry: false,
  })
  const waiting = query.trim() !== debounced || filters !== settledFilters
  const label = (item: GlobalSearchResult) => item.type === 'event' ? 'Evento' : item.type === 'tribe' ? 'Tribu' : item.metadata?.isHost ? item.metadata.role === 'creator' ? 'Creador' : 'Anfitrión' : 'Persona'
  const changeFilter = (name: keyof typeof filters, value: string) => { setFilters(current => ({ ...current, [name]: value })); setPage(1) }
  return <main className="min-h-dvh bg-background text-foreground">
    <div className="mx-auto max-w-5xl px-5 py-8 sm:py-12">
      <p className="text-sm font-semibold text-primary">Un plan y la gente que lo hace posible</p><h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Busca en EventNow</h1>
      <form className="mt-7 flex items-center gap-2 rounded-2xl border border-border bg-card p-2" onSubmit={event => { event.preventDefault(); remember() }}>
        <Search aria-hidden="true" className="ml-3 h-5 w-5 shrink-0 text-muted-foreground" />
        <input aria-label="Búsqueda global" maxLength={100} value={query} onChange={event => { setQuery(event.target.value); setPage(1) }} placeholder="Eventos, ciudades, lugares, tribus, anfitriones…" className="min-w-0 flex-1 bg-transparent px-2 py-3 outline-none focus-visible:ring-2 focus-visible:ring-primary" />
        {query && <button type="button" aria-label="Limpiar búsqueda" className="flex min-h-11 min-w-11 items-center justify-center rounded-xl hover:bg-muted" onClick={() => { setQuery(''); setPage(1) }}><X className="h-5 w-5" /></button>}
        <button type="submit" className="min-h-11 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground">Buscar</button>
      </form>
      <div className="mt-4 flex flex-wrap items-center gap-2" aria-label="Tipo de resultado">{SEARCH_FILTERS.map(filter => <button key={filter.value} type="button" aria-pressed={type === filter.value} onClick={() => { setType(filter.value); setPage(1) }} className={`min-h-11 rounded-xl px-4 text-sm font-medium transition-colors ${type === filter.value ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground hover:bg-muted/70'}`}>{filter.label}</button>)}<button type="button" aria-expanded={showFilters} onClick={() => setShowFilters(value => !value)} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-border px-4 text-sm"><Filter className="h-4 w-4" />Filtros de eventos</button></div>
      {showFilters && <fieldset className="mt-5 grid gap-4 rounded-2xl border border-border p-5 sm:grid-cols-2 lg:grid-cols-3"><legend className="px-2 text-sm font-semibold">Filtrar eventos</legend>{([
        ['category', 'Categoría', 'text'], ['location', 'Ciudad o lugar', 'text'], ['startDate', 'Desde', 'date'], ['endDate', 'Hasta', 'date'], ['minPrice', 'Precio mínimo', 'number'], ['maxPrice', 'Precio máximo', 'number'],
      ] as const).map(([name, title, inputType]) => <label key={name} className="text-sm font-medium">{title}{name === 'category' ? <select value={filters.category} onChange={event => changeFilter('category', event.target.value)} className="mt-2 min-h-11 w-full rounded-xl border border-border bg-background px-3"><option value="">Todas las categorías</option>{CATEGORY_LIST.map(category => <option key={category.slug} value={category.slug}>{category.label}</option>)}</select> : <input type={inputType} min={inputType === 'number' ? 0 : undefined} maxLength={inputType === 'text' ? 100 : undefined} value={filters[name]} onChange={event => changeFilter(name, event.target.value)} className="mt-2 min-h-11 w-full rounded-xl border border-border bg-background px-3" />}</label>)}<p className="text-xs leading-relaxed text-muted-foreground sm:col-span-2 lg:col-span-3">Estos filtros se aplican a eventos. Los precios se comparan en la moneda indicada por cada evento.</p><button type="button" className="min-h-11 text-left text-sm font-semibold text-primary" onClick={() => { setFilters({ category: '', location: '', startDate: '', endDate: '', minPrice: '', maxPrice: '' }); setPage(1) }}>Restablecer filtros</button></fieldset>}
      {query.trim().length < 2 ? <section className="mt-10 rounded-2xl bg-muted/40 p-6"><h2 className="text-xl font-semibold">¿Qué te gustaría encontrar?</h2><p className="mt-3 text-sm leading-relaxed text-muted-foreground">Escribe al menos dos caracteres. Busca por evento, ciudad, país o lugar. También encontrarás tribus públicas, personas, creadores y anfitriones.</p>{recent.owner === owner && recent.values.length > 0 && <div className="mt-6"><div className="flex items-center justify-between gap-4"><h3 className="text-sm font-semibold">Búsquedas recientes</h3><button type="button" className="min-h-11 text-sm text-primary" onClick={() => { setRecent({ owner, values: [] }); try { localStorage.removeItem(`global-search-recent:${owner}`) } catch { /* Storage can be unavailable. */ } }}>Borrar historial</button></div><div className="mt-2 flex flex-wrap gap-2">{recent.values.map(value => <button key={value} type="button" className="min-h-11 rounded-xl bg-card px-4 text-sm" onClick={() => { setQuery(value); setPage(1) }}>{value}</button>)}</div></div>}</section>
        : waiting || results.isPending ? <p role="status" className="py-12 text-muted-foreground">Buscando…</p>
        : results.isError ? <section role="alert" className="mt-8 rounded-2xl border border-border p-6"><p>No pudimos completar la búsqueda. Comprueba los filtros o inténtalo de nuevo.</p><button type="button" className="mt-3 min-h-11 font-semibold text-primary" onClick={() => void results.refetch()}>Reintentar</button></section>
        : <section className="mt-8">{type === 'locations' && <p className="mb-4 text-sm text-muted-foreground">Eventos publicados que coinciden con una ciudad, país o lugar. Las direcciones reservadas no se incluyen.</p>}<p aria-live="polite" className="mb-5 text-sm text-muted-foreground">{results.data?.pagination.total || 0} resultados para «{debounced}»</p>{!results.data?.results.length ? <div className="rounded-2xl bg-muted/40 p-8"><h2 className="text-xl font-semibold">Sin resultados por ahora</h2><p className="mt-3 text-muted-foreground">Prueba otro nombre, cambia el tipo de búsqueda o ajusta los filtros.</p></div> : <div className="grid gap-4 sm:grid-cols-2">{results.data.results.map(item => {
          const Icon = item.type === 'event' ? Calendar : item.type === 'tribe' ? Users : User
          return <Link key={`${item.type}:${item.id}`} href={searchResultPath(item)!} className="group flex items-start gap-4 rounded-2xl border border-border bg-card p-5 transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
            {item.image ? <img src={item.image} alt="" className="h-16 w-16 shrink-0 rounded-xl object-cover" /> : <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-muted"><Icon className="h-6 w-6 text-primary" /></div>}
            <div className="min-w-0 flex-1"><p className="text-xs font-semibold text-primary">{label(item)}</p><h2 className="mt-1 break-words text-lg font-semibold">{item.title}</h2>{item.metadata?.username && <p className="mt-1 text-sm text-muted-foreground">@{item.metadata.username}</p>}<p className="mt-2 line-clamp-2 text-sm leading-relaxed text-muted-foreground">{item.type === 'event' ? item.metadata?.location || item.description : item.description}</p></div><ArrowRight className="mt-2 h-4 w-4 shrink-0 text-muted-foreground group-hover:text-primary" />
          </Link>
        })}</div>}<nav aria-label="Páginas de resultados" className="mt-6 flex items-center justify-between gap-4">{page > 1 ? <button type="button" className="min-h-11 rounded-xl border border-border px-4 text-sm" onClick={() => setPage(value => value - 1)}>Anterior</button> : <span />}<span className="text-sm text-muted-foreground">Página {page}</span>{results.data?.pagination.hasMore && <button type="button" className="min-h-11 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground" onClick={() => setPage(value => value + 1)}>Más resultados</button>}</nav></section>}
    </div>
  </main>
}
export default function SearchPage() { return <Suspense fallback={<p role="status" className="p-8">Cargando búsqueda…</p>}><SearchContent /></Suspense> }
