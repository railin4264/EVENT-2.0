'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Search, Plus, ChevronLeft, ChevronRight, SlidersHorizontal } from 'lucide-react'
import { EventCard } from '@/components/events/EventCard'
import Link from 'next/link'
import { useEventsStore } from '@/stores/eventsStore'
import { useAuthStore } from '@/stores/authStore'
import { apiClient } from '@/lib/api/client'
import toast from 'react-hot-toast'
import type { Event } from '@/types/models'
import { EventCardSkeleton } from '@/components/ui/LoadingStates'
import { EmptyState } from '@/components/ui/EmptyState'
import { Calendar, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import ContentFilterModal, { loadStoredPreferences, type ContentFilterPreferences } from '@/components/discovery/ContentFilterModal'
import { LocationPicker } from '@/components/discovery/LocationPicker'
import { areaParams } from '@/lib/discovery-area'
import { useDiscoveryArea } from '@/stores/discoveryAreaStore'

// ─── Data ──────────────────────────────────────────────────────────────────────

const categories = [
  { id: 'all', label: 'Todos', emoji: '✨' },
  { id: 'sports', label: 'Deportes & LIDOM', emoji: '⚾' },
  { id: 'education', label: 'Cursos & Masterclasses', emoji: '🎓' },
  { id: 'art', label: 'Arte & Museos', emoji: '🏛️' },
  { id: 'music', label: 'Música & Conciertos', emoji: '🎵' },
  { id: 'travel', label: 'Tours & Ecoturismo', emoji: '🚌' },
  { id: 'food', label: 'Gastronomía & Café', emoji: '🍽️' },
  { id: 'technology', label: 'Tecnología & IA', emoji: '💻' },
  { id: 'networking', label: 'Networking & Finanzas', emoji: '🤝' },
  { id: 'wellness', label: 'Bienestar & Salud', emoji: '🧘' },
  { id: 'community', label: 'Comunidad & Coros', emoji: '👥' },
  { id: 'charity', label: 'Causas & Voluntariado', emoji: '🎗️' },
  { id: 'religion', label: 'Religión & Espiritualidad', emoji: '🙏' },
  { id: 'politics', label: 'Política & Civismo', emoji: '⚖️' },
]

const timeFilters = [
  { id: 'all', label: 'Todos' },
  { id: 'upcoming', label: 'Próximos' },
  { id: 'past', label: 'Pasados' },
]

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function EventsPage() {
  const { area, initialized } = useDiscoveryArea()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [selectedTimeFilter, setSelectedTimeFilter] = useState<'all' | 'upcoming' | 'past'>('upcoming')
  const [isUnofficial, setIsUnofficial] = useState(false)
  const [isRecurring, setIsRecurring] = useState(false)
  const [isVirtualOnly, setIsVirtualOnly] = useState(false)
  const [page, setPage] = useState(1)

  const [contentPrefs, setContentPrefs] = useState<ContentFilterPreferences>(loadStoredPreferences)
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false)

  const { events, pagination, isLoading, error, fetchEvents } = useEventsStore()
  const { isAuthenticated, user } = useAuthStore()

  const hasActiveRestrictions = Boolean(
    contentPrefs.hidePolitical ||
    contentPrefs.hideReligious ||
    contentPrefs.hiddenCategories?.length ||
    contentPrefs.contentFilterMode === 'whitelist'
  )

  const loadEvents = useCallback(() => {
    void fetchEvents({
      page,
      limit: 12,
      ...areaParams(area),
      ...(searchQuery && { search: searchQuery }),
      ...(selectedCategory !== 'all' && { category: selectedCategory }),
      ...(selectedTimeFilter !== 'all' && { timeFilter: selectedTimeFilter }),
      ...(isUnofficial && { isUnofficial: 'true' }),
      ...(isRecurring && { isRecurring: 'true' }),
      ...(isVirtualOnly && { isOnline: 'true' }),
      ...(contentPrefs.hidePolitical && { hidePolitical: 'true' }),
      ...(contentPrefs.hideReligious && { hideReligious: 'true' }),
      ...(contentPrefs.hiddenCategories?.length && { excludeCategories: contentPrefs.hiddenCategories.join(',') }),
      ...(contentPrefs.contentFilterMode === 'whitelist' && contentPrefs.preferredCategories?.length && { categories: contentPrefs.preferredCategories.join(',') })
    }).catch(() => { /* The store exposes an inline error with a retry. */ })
  }, [area, page, searchQuery, selectedCategory, selectedTimeFilter, isUnofficial, isRecurring, isVirtualOnly, contentPrefs, fetchEvents])

  useEffect(() => { if (initialized) loadEvents() }, [initialized, loadEvents])
  useEffect(() => { setPage(1) }, [area])

  const handleFavorite = async (eventId: string) => {
    if (!isAuthenticated) { toast.error('Debes iniciar sesión'); return }
    try {
      await apiClient.post(`/events/${eventId}/favorite`)
      loadEvents()
      toast.success('¡Guardado en favoritos!')
    } catch {
      toast.error('Error al guardar en favoritos')
    }
  }

  const handleShare = async (event: Event) => {
    const url = `${window.location.origin}/events/${event._id}`
    if (navigator.share) {
      try { await navigator.share({ title: event.title, text: event.description, url }) } catch {}
    } else {
      try { await navigator.clipboard.writeText(url); toast.success('¡Enlace copiado!') }
      catch { toast.error('Error al compartir') }
    }
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">

      {/* ── Page Header ──────────────────────────────────────────────── */}
      <div className="border-b border-gray-100 dark:border-white/5 bg-white dark:bg-gray-950">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 md:py-12">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4"
          >
            <div>
              <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-gray-900 dark:text-white">
                Descubre Eventos
              </h1>
              <p className="mt-1 text-gray-500 dark:text-gray-400 text-base">
                {pagination?.total
                  ? `${pagination.total.toLocaleString()} eventos disponibles`
                  : `Descubre planes · ${area.label}`}
              </p>
            </div>
            {isAuthenticated && (
              <Link href="/events/create">
                <motion.span
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-violet-500 hover:bg-violet-600 text-white rounded-xl font-semibold text-sm transition-colors shadow-sm shadow-violet-500/20 cursor-pointer"
                >
                  <Plus className="w-4 h-4" aria-hidden="true" />
                  Crear Evento
                </motion.span>
              </Link>
            )}
          </motion.div>
        </div>
      </div>

      {/* ── Filters bar ──────────────────────────────────────────────── */}
      <div className="mx-auto max-w-6xl px-4 pb-5 sm:px-6"><LocationPicker /></div>
      <div className="sticky top-16 z-40 bg-white/95 dark:bg-gray-950/95 backdrop-blur-xl border-b border-gray-100 dark:border-white/5 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 space-y-3">
          {/* Top row: search + time tabs */}
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Search */}
            <form role="search" className="flex-1" onSubmit={(e) => e.preventDefault()}>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" aria-hidden="true" />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setPage(1) }}
                  placeholder="Buscar eventos…"
                  aria-label="Buscar eventos"
                  className="w-full pl-9 pr-4 py-2.5 text-sm rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-500/60 transition-all"
                />
              </div>
            </form>

            {/* Time tabs */}
            <div
              className="flex items-center gap-1 bg-gray-100 dark:bg-white/5 rounded-xl p-1 shrink-0"
              role="tablist"
              aria-label="Filtro de tiempo"
            >
              {timeFilters.map((f) => (
                <button
                  key={f.id}
                  role="tab"
                  aria-selected={selectedTimeFilter === f.id}
                  onClick={() => { setSelectedTimeFilter(f.id as typeof selectedTimeFilter); setPage(1) }}
                  className={cn(
                    'px-3 py-1.5 text-sm font-medium rounded-lg transition-all',
                    selectedTimeFilter === f.id
                      ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                  )}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Unofficial toggle */}
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => { setIsUnofficial(!isUnofficial); setPage(1) }}
              className={cn(
                'relative px-4 py-2 text-sm font-semibold rounded-xl transition-all duration-300 border flex items-center gap-2 shrink-0 overflow-hidden',
                isUnofficial
                  ? 'bg-gradient-to-r from-violet-600/20 to-fuchsia-600/20 border-violet-500/60 text-violet-700 dark:text-violet-300 shadow-[0_0_20px_rgba(139,92,246,0.35)]'
                  : 'bg-gray-100 dark:bg-white/5 border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-white/10 hover:border-violet-500/30'
              )}
            >
              {isUnofficial && (
                <span className="absolute inset-0 bg-gradient-to-r from-violet-500/10 to-fuchsia-500/10 animate-pulse pointer-events-none" />
              )}
              <span className="text-base">🤫</span>
              <span>Extraoficiales</span>
              {isUnofficial && (
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-violet-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-violet-500"></span>
                </span>
              )}
            </motion.button>

            {/* Recurring Activities toggle */}
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => { setIsRecurring(!isRecurring); setPage(1) }}
              className={cn(
                'relative px-4 py-2 text-sm font-semibold rounded-xl transition-all duration-300 border flex items-center gap-2 shrink-0 overflow-hidden',
                isRecurring
                  ? 'bg-gradient-to-r from-blue-600/25 to-cyan-600/25 border-blue-500/70 text-blue-700 dark:text-blue-300 shadow-[0_0_20px_rgba(59,130,246,0.35)]'
                  : 'bg-gray-100 dark:bg-white/5 border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-white/10 hover:border-blue-500/30'
              )}
            >
              {isRecurring && (
                <span className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-cyan-500/10 animate-pulse pointer-events-none" />
              )}
              <span className="text-base">🔁</span>
              <span>Fijos Semanales</span>
              {isRecurring && (
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                </span>
              )}
            </motion.button>

            {/* Virtual & Streams toggle */}
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => { setIsVirtualOnly(!isVirtualOnly); setPage(1) }}
              className={cn(
                'relative px-4 py-2 text-sm font-semibold rounded-xl transition-all duration-300 border flex items-center gap-2 shrink-0 overflow-hidden',
                isVirtualOnly
                  ? 'bg-gradient-to-r from-cyan-600/25 to-emerald-600/25 border-cyan-500/70 text-cyan-700 dark:text-cyan-300 shadow-[0_0_20px_rgba(6,182,212,0.35)]'
                  : 'bg-gray-100 dark:bg-white/5 border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-white/10 hover:border-cyan-500/30'
              )}
            >
              {isVirtualOnly && (
                <span className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 to-emerald-500/10 animate-pulse pointer-events-none" />
              )}
              <span className="text-base">🌐</span>
              <span>En Línea & Streams</span>
              {isVirtualOnly && (
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
                </span>
              )}
            </motion.button>

            {/* Content filter button */}
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => setIsFilterModalOpen(true)}
              className={cn(
                'px-3.5 py-2 text-sm font-semibold rounded-xl transition-all border flex items-center gap-1.5 shrink-0',
                hasActiveRestrictions
                  ? 'bg-amber-500/15 border-amber-500/40 text-amber-600 dark:text-amber-300 shadow-sm'
                  : 'bg-gray-100 dark:bg-white/5 border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/10'
              )}
              title="Restricciones de contenido (Política, Religión, Whitelist)"
            >
              <SlidersHorizontal className="w-4 h-4" />
              <span>Filtro de Contenido</span>
              {hasActiveRestrictions && (
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              )}
            </motion.button>
          </div>

          {/* Category pills */}
          <div
            className="flex gap-2 overflow-x-auto pb-0.5 scrollbar-none"
            role="list"
            aria-label="Categorías"
          >
            {categories.map((cat) => (
              <button
                key={cat.id}
                role="listitem"
                onClick={() => { setSelectedCategory(cat.id); setPage(1) }}
                className={cn(
                  'shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all',
                  selectedCategory === cat.id
                    ? 'bg-violet-500 text-white shadow-sm shadow-violet-500/20'
                    : 'bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/10'
                )}
              >
                <span aria-hidden="true">{cat.emoji}</span>
                {cat.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Content ──────────────────────────────────────────────────── */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[...Array(6)].map((_, i) => <EventCardSkeleton key={i} />)}
          </div>
        ) : error ? (
          <EmptyState
            icon={AlertCircle}
            title="Error al cargar eventos"
            description="No se pudieron cargar los eventos. Intenta de nuevo."
            actionLabel="Reintentar"
            actionOnClick={loadEvents}
            className="mt-8"
          />
        ) : events?.length === 0 ? (
          <EmptyState
            icon={Calendar}
            title="No se encontraron eventos"
            description={
              searchQuery
                ? `No hay eventos que coincidan con "${searchQuery}". Prueba otros términos.`
                : 'No hay eventos disponibles con los filtros seleccionados.'
            }
            actionLabel="Crear el primero"
            actionHref={isAuthenticated ? '/events/create' : '/login'}
            className="mt-8"
          />
        ) : (
          <>
            <div className="mb-5 flex items-center justify-between">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {events.length} de {pagination?.total || 0} eventos
              </p>
            </div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5"
            >
              {events.map((event, i) => (
                <motion.div
                  key={event._id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04, duration: 0.3 }}
                >
                  <EventCard
                    event={event as any}
                    onFavorite={handleFavorite}
                    onShare={handleShare}
                  />
                </motion.div>
              ))}
            </motion.div>

            {/* Pagination */}
            {pagination && pagination.pages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-10" role="navigation" aria-label="Paginación">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  aria-label="Página anterior"
                  className="p-2 rounded-xl border border-gray-200 dark:border-white/10 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" aria-hidden="true" />
                </button>

                <div className="flex items-center gap-1">
                  {[...Array(Math.min(pagination.pages, 7))].map((_, i) => {
                    const p = i + 1
                    return (
                      <button
                        key={p}
                        onClick={() => setPage(p)}
                        aria-label={`Página ${p}`}
                        aria-current={page === p ? 'page' : undefined}
                        className={cn(
                          'w-8 h-8 text-sm font-medium rounded-lg transition-all',
                          page === p
                            ? 'bg-violet-500 text-white'
                            : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5'
                        )}
                      >
                        {p}
                      </button>
                    )
                  })}
                  {pagination.pages > 7 && (
                    <span className="text-gray-400 px-1">…</span>
                  )}
                </div>

                <button
                  onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))}
                  disabled={page === pagination.pages}
                  aria-label="Página siguiente"
                  className="p-2 rounded-xl border border-gray-200 dark:border-white/10 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                >
                  <ChevronRight className="w-4 h-4" aria-hidden="true" />
                </button>
              </div>
            )}
          </>
        )}
      </main>

      <ContentFilterModal
        isOpen={isFilterModalOpen}
        onClose={() => setIsFilterModalOpen(false)}
        currentUser={user}
        onApply={(newPrefs) => setContentPrefs(newPrefs)}
      />
    </div>
  )
}
