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

// ─── Data ──────────────────────────────────────────────────────────────────────

const categories = [
  { id: 'all', label: 'Todos', emoji: '✨' },
  { id: 'music', label: 'Música', emoji: '🎵' },
  { id: 'food', label: 'Comida', emoji: '🍴' },
  { id: 'sports', label: 'Deportes', emoji: '⚽' },
  { id: 'technology', label: 'Tecnología', emoji: '💻' },
  { id: 'art', label: 'Arte', emoji: '🎨' },
  { id: 'education', label: 'Educación', emoji: '📚' },
]

const timeFilters = [
  { id: 'all', label: 'Todos' },
  { id: 'upcoming', label: 'Próximos' },
  { id: 'past', label: 'Pasados' },
]

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function EventsPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [selectedTimeFilter, setSelectedTimeFilter] = useState<'all' | 'upcoming' | 'past'>('upcoming')
  const [page, setPage] = useState(1)

  const { events, pagination, isLoading, error, fetchEvents } = useEventsStore()
  const { isAuthenticated } = useAuthStore()

  const loadEvents = useCallback(() => {
    fetchEvents({
      page,
      limit: 12,
      ...(searchQuery && { search: searchQuery }),
      ...(selectedCategory !== 'all' && { category: selectedCategory }),
      ...(selectedTimeFilter !== 'all' && { timeFilter: selectedTimeFilter }),
    })
  }, [page, searchQuery, selectedCategory, selectedTimeFilter, fetchEvents])

  useEffect(() => { loadEvents() }, [loadEvents])

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
                  : 'Los mejores eventos en tu ciudad'}
              </p>
            </div>
            {isAuthenticated && (
              <Link href="/events/create">
                <motion.span
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-semibold text-sm transition-colors shadow-sm shadow-emerald-500/20 cursor-pointer"
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
                  className="w-full pl-9 pr-4 py-2.5 text-sm rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500/60 transition-all"
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
                    ? 'bg-emerald-500 text-white shadow-sm shadow-emerald-500/20'
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
                            ? 'bg-emerald-500 text-white'
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
    </div>
  )
}
