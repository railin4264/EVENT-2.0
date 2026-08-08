'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Calendar, Heart, Users, TrendingUp, Clock, Eye, Plus, BarChart3, ArrowRight } from 'lucide-react'
import { EventCard } from '@/components/events/EventCard'
import { useAuthStore } from '@/stores/authStore'
import { apiClient } from '@/lib/api/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import toast from 'react-hot-toast'
import type { Event } from '@/types/models'
import { cn } from '@/lib/utils'

// ─── Types ────────────────────────────────────────────────────────────────────

type TabId = 'upcoming' | 'past' | 'favorites' | 'hosting' | 'analytics'

interface Stats {
  upcomingEvents: number
  totalEvents: number
  favoritesCount: number
  hostingCount: number
}

// ─── Stat card ────────────────────────────────────────────────────────────────

function StatCard({
  icon: Icon,
  label,
  value,
  color,
  delay,
}: {
  icon: React.ElementType
  label: string
  value: number
  color: string
  delay: number
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.35 }}
      className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-white/5 rounded-2xl p-5 shadow-sm"
    >
      <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center mb-3', color)}>
        <Icon className="w-5 h-5" aria-hidden="true" />
      </div>
      <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 font-medium">{label}</p>
    </motion.div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const router = useRouter()
  const { user, isAuthenticated } = useAuthStore()

  const [activeTab, setActiveTab] = useState<TabId>('upcoming')
  const [isLoading, setIsLoading] = useState(true)
  const [events, setEvents] = useState<Event[]>([])
  const [stats, setStats] = useState<Stats>({
    upcomingEvents: 0, totalEvents: 0, favoritesCount: 0, hostingCount: 0,
  })
  const [analytics, setAnalytics] = useState<any>(null)

  useEffect(() => {
    if (!isAuthenticated) { router.push('/login'); return }
    loadData()
  }, [isAuthenticated, activeTab])

  const loadData = useCallback(async () => {
    setIsLoading(true)
    try {
      if (activeTab === 'analytics') {
        const res = await apiClient.get('/dashboard/creator-analytics')
        setAnalytics(res.data?.data ?? null)
        return
      }

      let endpoint = '/events'
      const params: Record<string, string> = { limit: '20' }
      if (activeTab === 'upcoming') { params.attending = 'true'; params.upcoming = 'true' }
      if (activeTab === 'past') { params.attending = 'true'; params.past = 'true' }
      if (activeTab === 'favorites') endpoint = '/events/favorites'
      if (activeTab === 'hosting') params.createdBy = user?.id || user?._id || ''

      const [evRes, statsRes] = await Promise.all([
        apiClient.get(endpoint, { params }),
        activeTab === 'upcoming' ? apiClient.get('/dashboard/stats') : null,
      ])

      // Normalize: backend may return { data: { events: [] } } or { data: [] }
      const evData = evRes.data?.data
      const normalizedEvents = Array.isArray(evData)
        ? evData
        : Array.isArray(evData?.events)
          ? evData.events
          : []

      setEvents(normalizedEvents)
      if (statsRes) setStats(statsRes.data?.data ?? stats)
    } catch {
      const tabMessages: Partial<Record<TabId, string>> = {
        upcoming: 'Error al cargar eventos pr\u00f3ximos',
        past: 'Error al cargar eventos pasados',
        favorites: 'Error al cargar favoritos',
        hosting: 'Error al cargar eventos organizados',
        analytics: 'Error al cargar anal\u00edticas',
      }
      toast.error(tabMessages[activeTab] || 'Error al cargar datos')
    } finally {
      setIsLoading(false)
    }
  }, [activeTab, user?.id, user?._id])


  const handleFavorite = async (eventId: string) => {
    try {
      await apiClient.post(`/events/${eventId}/favorite`)
      loadData()
      toast.success('Actualizado')
    } catch {
      toast.error('Error al actualizar')
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

  const tabs: { id: TabId; label: string; icon: React.ElementType }[] = [
    { id: 'upcoming', label: 'Próximos', icon: Calendar },
    { id: 'past', label: 'Pasados', icon: Clock },
    { id: 'favorites', label: 'Favoritos', icon: Heart },
    { id: 'hosting', label: 'Organizando', icon: Users },
    { id: 'analytics', label: 'Analíticas', icon: BarChart3 },
  ]

  const emptyMessages: Partial<Record<TabId, string>> = {
    upcoming: 'No tienes eventos próximos.',
    past: 'No has asistido a eventos aún.',
    favorites: 'No tienes eventos favoritos.',
    hosting: 'No has organizado eventos aún.',
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">

      {/* ── Header ───────────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-gray-950 border-b border-gray-100 dark:border-white/5">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
          >
            <div>
              <p className="text-sm text-gray-400 dark:text-gray-500 font-medium mb-1">Dashboard</p>
              <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-gray-900 dark:text-white">
                Hola, {user?.firstName || 'usuario'} 👋
              </h1>
            </div>
            <Link href="/events/create">
              <motion.span
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-semibold text-sm shadow-sm shadow-emerald-500/20 transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" aria-hidden="true" />
                Crear Evento
              </motion.span>
            </Link>
          </motion.div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-8">

        {/* ── Stats ─────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={Calendar} label="Próximos eventos" value={stats.upcomingEvents} color="bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" delay={0} />
          <StatCard icon={Clock} label="Total asistidos" value={stats.totalEvents} color="bg-sky-50 dark:bg-sky-500/10 text-sky-600 dark:text-sky-400" delay={0.05} />
          <StatCard icon={Heart} label="Favoritos" value={stats.favoritesCount} color="bg-pink-50 dark:bg-pink-500/10 text-pink-600 dark:text-pink-400" delay={0.1} />
          <StatCard icon={Users} label="Organizados" value={stats.hostingCount} color="bg-violet-50 dark:bg-violet-500/10 text-violet-600 dark:text-violet-400" delay={0.15} />
        </div>

        {/* ── Tab navigation ────────────────────────────────────────── */}
        <div>
          <div
            className="flex gap-1 overflow-x-auto pb-0.5 scrollbar-none"
            role="tablist"
            aria-label="Secciones del dashboard"
          >
            {tabs.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                role="tab"
                aria-selected={activeTab === id}
                onClick={() => setActiveTab(id)}
                className={cn(
                  'shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all',
                  activeTab === id
                    ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-sm border border-gray-200 dark:border-white/8'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-white/60 dark:hover:bg-white/5'
                )}
              >
                <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Content ───────────────────────────────────────────────── */}
        <div role="tabpanel">
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-72 rounded-2xl bg-gray-200 dark:bg-gray-800 animate-pulse" aria-hidden="true" />
              ))}
            </div>
          ) : activeTab === 'analytics' ? (
            <AnalyticsPanel analytics={analytics} />
          ) : events.length === 0 ? (
            <EmptyTabState
              message={emptyMessages[activeTab] || 'No hay eventos.'}
              showExplore={activeTab !== 'past'}
              onExplore={() => router.push('/events')}
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {events.map((event) => (
                <EventCard
                  key={event._id}
                  event={event}
                  onFavorite={handleFavorite}
                  onShare={handleShare}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function EmptyTabState({
  message,
  showExplore,
  onExplore,
}: {
  message: string
  showExplore: boolean
  onExplore: () => void
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-white/5 flex items-center justify-center mb-4" aria-hidden="true">
        <Calendar className="w-8 h-8 text-gray-400 dark:text-gray-500" />
      </div>
      <p className="text-base font-semibold text-gray-900 dark:text-white mb-1">Sin eventos</p>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 max-w-xs">{message}</p>
      {showExplore && (
        <button
          onClick={onExplore}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-semibold text-sm transition-colors"
        >
          Explorar eventos
          <ArrowRight className="w-4 h-4" aria-hidden="true" />
        </button>
      )}
    </div>
  )
}

function AnalyticsPanel({ analytics }: { analytics: any }) {
  if (!analytics || analytics.totalViews === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-white/5 flex items-center justify-center mb-4" aria-hidden="true">
          <BarChart3 className="w-8 h-8 text-gray-400 dark:text-gray-500" />
        </div>
        <p className="text-base font-semibold text-gray-900 dark:text-white mb-1">Sin datos</p>
        <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs">
          Crea un evento para empezar a ver estadísticas de rendimiento.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { icon: Eye, label: 'Vistas totales', value: analytics.totalViews, color: 'bg-sky-50 dark:bg-sky-500/10 text-sky-600 dark:text-sky-400' },
          { icon: Users, label: 'Asistentes', value: analytics.totalAttendees, color: 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' },
          { icon: TrendingUp, label: 'Conv. Rate', value: analytics.aggregateConversionRate, color: 'bg-violet-50 dark:bg-violet-500/10 text-violet-600 dark:text-violet-400' },
        ].map(({ icon: Icon, label, value, color }) => (
          <div key={label} className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-white/5 rounded-2xl p-5 shadow-sm">
            <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center mb-3', color)}>
              <Icon className="w-5 h-5" aria-hidden="true" />
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 font-medium">{label}</p>
          </div>
        ))}
      </div>

      {analytics.eventsData?.length > 0 && (
        <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-white/5 rounded-2xl overflow-hidden shadow-sm">
          <div className="px-6 py-4 border-b border-gray-100 dark:border-white/5">
            <h3 className="font-semibold text-gray-900 dark:text-white text-sm">Rendimiento por evento</h3>
          </div>
          <ul className="divide-y divide-gray-50 dark:divide-white/5">
            {analytics.eventsData.map((ev: any) => (
              <li key={ev._id} className="flex items-center justify-between px-6 py-4 gap-4">
                <div className="min-w-0">
                  <p className="font-semibold text-sm text-gray-900 dark:text-white truncate">{ev.title}</p>
                  <span className="text-xs font-medium text-gray-400 capitalize">{ev.status}</span>
                </div>
                <div className="flex items-center gap-6 shrink-0">
                  <div className="text-center">
                    <p className="text-xs text-gray-400 mb-0.5">Vistas</p>
                    <p className="font-bold text-sm text-gray-900 dark:text-white">{ev.views}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-gray-400 mb-0.5">Conv.</p>
                    <p className="font-bold text-sm text-emerald-600 dark:text-emerald-400">{ev.conversionRate}%</p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
