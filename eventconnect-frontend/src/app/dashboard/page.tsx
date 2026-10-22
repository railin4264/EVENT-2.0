'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Calendar,
  Heart,
  Users,
  TrendingUp,
  Clock,
  Eye,
  Plus,
  BarChart3,
  ArrowRight,
  Building2,
  CheckCircle2,
  XCircle,
  Copy,
  Check,
  ExternalLink,
  Loader2,
  Share2,
  Sparkles,
  Send,
  X
} from 'lucide-react'
import { EventCard } from '@/components/events/EventCard'
import { useAuthStore } from '@/stores/authStore'
import { apiClient } from '@/lib/api/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import toast from 'react-hot-toast'
import type { Event } from '@/types/models'
import { cn } from '@/lib/utils'

// ─── Types ────────────────────────────────────────────────────────────────────

type TabId = 'upcoming' | 'past' | 'favorites' | 'hosting' | 'transfers' | 'analytics'

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
    upcomingEvents: 0,
    totalEvents: 0,
    favoritesCount: 0,
    hostingCount: 0,
  })
  const [analytics, setAnalytics] = useState<any>(null)
  const [pendingTransfers, setPendingTransfers] = useState<any[]>([])
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null)
  const [copiedRef, setCopiedRef] = useState<string | null>(null)

  // Modals
  const [rejectionModal, setRejectionModal] = useState<{ orderId: string; buyerName: string } | null>(null)
  const [rejectionReason, setRejectionReason] = useState('')
  const [promoterModalEvent, setPromoterModalEvent] = useState<{ eventId: string; title: string } | null>(null)
  const [promotersData, setPromotersData] = useState<any[]>([])
  const [promotersLoading, setPromotersLoading] = useState(false)
  const [newPromoterName, setNewPromoterName] = useState('')

  const fetchPendingTransfers = useCallback(async () => {
    try {
      const res = await apiClient.get('/payments/organizer/pending-transfers')
      if (res.data?.success && Array.isArray(res.data?.data)) {
        setPendingTransfers(res.data.data)
      }
    } catch {
      // silently catch if user is not organizer yet
    }
  }, [])

  const loadData = useCallback(async () => {
    setIsLoading(true)
    try {
      // Background fetch of pending transfers to show badge count
      void fetchPendingTransfers()

      if (activeTab === 'analytics') {
        const res = await apiClient.get('/dashboard/creator-analytics')
        setAnalytics(res.data?.data ?? null)
        return
      }

      if (activeTab === 'transfers') {
        const res = await apiClient.get('/payments/organizer/pending-transfers')
        setPendingTransfers(res.data?.data || [])
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
        upcoming: 'Error al cargar eventos próximos',
        past: 'Error al cargar eventos pasados',
        favorites: 'Error al cargar favoritos',
        hosting: 'Error al cargar eventos organizados',
        transfers: 'Error al cargar comprobantes de transferencia',
        analytics: 'Error al cargar analíticas',
      }
      toast.error(tabMessages[activeTab] || 'Error al cargar datos')
    } finally {
      setIsLoading(false)
    }
  }, [activeTab, user?.id, user?._id, fetchPendingTransfers])

  useEffect(() => {
    if (!isAuthenticated) { router.push('/login'); return }
    loadData()
  }, [isAuthenticated, activeTab, loadData, router])

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

  const handleApproveTransfer = async (orderId: string) => {
    setActionLoadingId(orderId)
    try {
      const res = await apiClient.post(`/payments/orders/${orderId}/verify-transfer`, {
        action: 'approve',
      })
      if (res.data?.success) {
        toast.success('¡Pago aprobado! La entrada y el código QR ya están activos para el comprador.')
        setPendingTransfers(prev => prev.filter(o => o._id !== orderId))
      } else {
        throw new Error(res.data?.message || 'No se pudo aprobar')
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Error al aprobar la transferencia')
    } finally {
      setActionLoadingId(null)
    }
  }

  const handleConfirmReject = async () => {
    if (!rejectionModal) return
    const { orderId } = rejectionModal
    setActionLoadingId(orderId)
    try {
      const res = await apiClient.post(`/payments/orders/${orderId}/verify-transfer`, {
        action: 'reject',
        reason: rejectionReason.trim() || 'Comprobante no coincide con el estado de cuenta bancario',
      })
      if (res.data?.success) {
        toast.success('Comprobante marcado como rechazado.')
        setPendingTransfers(prev => prev.filter(o => o._id !== orderId))
        setRejectionModal(null)
        setRejectionReason('')
      } else {
        throw new Error(res.data?.message || 'Error al rechazar')
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Error al rechazar transferencia')
    } finally {
      setActionLoadingId(null)
    }
  }

  const handleCopyReference = async (ref: string) => {
    try {
      await navigator.clipboard.writeText(ref)
      setCopiedRef(ref)
      toast.success('Número de referencia copiado')
      setTimeout(() => setCopiedRef(null), 2500)
    } catch {
      toast.error('No se pudo copiar')
    }
  }

  const handleOpenPromoterModal = async (eventId: string, title: string) => {
    setPromoterModalEvent({ eventId, title })
    setPromotersLoading(true)
    try {
      const res = await apiClient.get(`/events/${eventId}/promoters`)
      if (res.data?.success) {
        setPromotersData(res.data.data || [])
      }
    } catch {
      toast.error('No se pudieron cargar los promotores')
    } finally {
      setPromotersLoading(false)
    }
  }

  const tabs: { id: TabId; label: string; icon: React.ElementType; badge?: number }[] = [
    { id: 'upcoming', label: 'Próximos', icon: Calendar },
    { id: 'past', label: 'Pasados', icon: Clock },
    { id: 'favorites', label: 'Favoritos', icon: Heart },
    { id: 'hosting', label: 'Organizando', icon: Users },
    {
      id: 'transfers',
      label: 'Transferencias RD',
      icon: Building2,
      badge: pendingTransfers.length > 0 ? pendingTransfers.length : undefined,
    },
    { id: 'analytics', label: 'Analíticas', icon: BarChart3 },
  ]

  const emptyMessages: Partial<Record<TabId, string>> = {
    upcoming: 'No tienes eventos próximos.',
    past: 'No has asistido a eventos aún.',
    favorites: 'No tienes eventos favoritos.',
    hosting: 'No has organizado eventos aún.',
    transfers: 'No tienes comprobantes de transferencia pendientes de validar.',
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
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-violet-500 hover:bg-violet-600 text-white rounded-xl font-semibold text-sm shadow-sm shadow-violet-500/20 transition-colors cursor-pointer"
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
          <StatCard icon={Calendar} label="Próximos eventos" value={stats.upcomingEvents} color="bg-violet-50 dark:bg-violet-500/10 text-violet-600 dark:text-violet-400" delay={0} />
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
            {tabs.map(({ id, label, icon: Icon, badge }) => (
              <button
                key={id}
                role="tab"
                aria-selected={activeTab === id}
                onClick={() => setActiveTab(id)}
                className={cn(
                  'shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all relative',
                  activeTab === id
                    ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-sm border border-gray-200 dark:border-white/8'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-white/60 dark:hover:bg-white/5'
                )}
              >
                <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span>{label}</span>
                {typeof badge === 'number' && badge > 0 && (
                  <span className="ml-1 px-2 py-0.5 rounded-full text-xs font-bold bg-amber-500 text-black">
                    {badge}
                  </span>
                )}
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
          ) : activeTab === 'transfers' ? (
            <TransfersPanel
              transfers={pendingTransfers}
              actionLoadingId={actionLoadingId}
              copiedRef={copiedRef}
              onApprove={handleApproveTransfer}
              onReject={order => setRejectionModal({ orderId: order._id, buyerName: order.customerInfo?.firstName || 'Comprador' })}
              onCopyRef={handleCopyReference}
            />
          ) : events.length === 0 ? (
            <EmptyTabState
              message={emptyMessages[activeTab] || 'No hay eventos.'}
              showExplore={activeTab !== 'past'}
              onExplore={() => router.push('/events')}
            />
          ) : (
            <div className="space-y-6">
              {activeTab === 'hosting' && (
                <div className="p-4 rounded-2xl bg-gradient-to-r from-violet-500/10 via-pink-500/5 to-cyan-500/10 border border-violet-500/20 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-violet-400" />
                      Gestión VIP de Promotores (RRPP)
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      Monitorea las entradas que trae cada embajador o RRPP en tus eventos.
                    </p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {events.map((event) => (
                  <div key={event._id} className="relative group">
                    <EventCard
                      event={event}
                      onFavorite={handleFavorite}
                      onShare={handleShare}
                    />
                    {activeTab === 'hosting' && (
                      <div className="mt-2 flex gap-2">
                        <button
                          type="button"
                          onClick={() => handleOpenPromoterModal(event._id, event.title)}
                          className="w-full inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-violet-500/10 hover:bg-violet-500/20 text-violet-600 dark:text-violet-400 text-xs font-semibold border border-violet-500/20 transition-all"
                        >
                          <Share2 className="w-3.5 h-3.5" />
                          <span>RRPP & Promotores</span>
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Modal de Rechazo de Transferencia ────────────────────────────── */}
      <AnimatePresence>
        {rejectionModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-white dark:bg-gray-900 border border-gray-200 dark:border-white/10 rounded-3xl p-6 shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <XCircle className="w-5 h-5 text-red-500" />
                  Rechazar Transferencia
                </h3>
                <button
                  type="button"
                  onClick={() => setRejectionModal(null)}
                  className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-white/5"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                Indica el motivo por el cual no se pudo validar la transferencia de{' '}
                <strong className="text-gray-900 dark:text-white">{rejectionModal.buyerName}</strong>. El comprador recibirá una notificación inmediata para verificar sus datos.
              </p>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                  Motivo de rechazo:
                </label>
                <textarea
                  value={rejectionReason}
                  onChange={e => setRejectionReason(e.target.value)}
                  placeholder="Ej: El monto del comprobante no coincide con la boleta, o el depósito no se refleja aún en el estado de cuenta."
                  rows={3}
                  className="w-full p-3 rounded-2xl bg-gray-50 dark:bg-black/30 border border-gray-200 dark:border-white/10 text-xs text-gray-900 dark:text-white focus:outline-none focus:border-red-500 resize-none"
                />
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setRejectionModal(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-500 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmReject}
                  disabled={actionLoadingId === rejectionModal.orderId}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-600/20 transition-all disabled:opacity-50"
                >
                  {actionLoadingId === rejectionModal.orderId ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <XCircle className="w-3.5 h-3.5" />
                  )}
                  <span>Confirmar Rechazo</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Modal de Promotores (RRPP) ────────────────────────────────────── */}
      <AnimatePresence>
        {promoterModalEvent && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-white/10 rounded-3xl p-6 shadow-2xl space-y-5 max-h-[85vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-white/10">
                <div>
                  <span className="text-[11px] font-bold text-violet-400 uppercase tracking-wider">
                    Panel de Relaciones Públicas (RRPP)
                  </span>
                  <h3 className="text-lg font-black text-gray-900 dark:text-white mt-0.5 truncate">
                    {promoterModalEvent.title}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setPromoterModalEvent(null)}
                  className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-white/5"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Generador de enlace de promotor */}
              <div className="p-4 rounded-2xl bg-violet-500/5 border border-violet-500/20 space-y-3">
                <h4 className="text-xs font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-violet-400" />
                  Crear enlace personalizado para un nuevo RRPP:
                </h4>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newPromoterName}
                    onChange={e => setNewPromoterName(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''))}
                    placeholder="ej: carlos, vip_santiago, coro_la_zona"
                    className="flex-1 px-3.5 py-2 rounded-xl bg-white dark:bg-black/30 border border-gray-200 dark:border-white/10 text-xs text-gray-900 dark:text-white focus:outline-none focus:border-violet-500"
                  />
                  <button
                    type="button"
                    disabled={!newPromoterName.trim()}
                    onClick={async () => {
                      const link = `${window.location.origin}/events/${promoterModalEvent.eventId}?rrpp=${newPromoterName.trim()}`
                      try {
                        await navigator.clipboard.writeText(link)
                        toast.success(`¡Enlace copiado para @${newPromoterName}!`)
                        setNewPromoterName('')
                      } catch {
                        toast.error('No se pudo copiar el enlace')
                      }
                    }}
                    className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-bold text-xs disabled:opacity-40 transition-colors inline-flex items-center gap-1.5"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copiar Enlace</span>
                  </button>
                </div>
              </div>

              {/* Tally de promotores */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Rendimiento por Promotor:
                </h4>

                {promotersLoading ? (
                  <div className="py-12 flex justify-center">
                    <Loader2 className="w-6 h-6 animate-spin text-violet-500" />
                  </div>
                ) : promotersData.length === 0 ? (
                  <div className="p-8 text-center rounded-2xl bg-gray-50 dark:bg-white/5 border border-dashed border-gray-200 dark:border-white/10">
                    <Users className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Aún no hay invitados registrados mediante enlaces de RRPP. Comparte enlaces con el parámetro{' '}
                      <code className="text-violet-400">?rrpp=nombre</code> para medir su impacto.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {promotersData.map((tally: any, idx: number) => {
                      const shareLink = `${window.location.origin}/events/${promoterModalEvent.eventId}?rrpp=${tally.promoter}`
                      return (
                        <div
                          key={tally.promoter || idx}
                          className="p-4 rounded-2xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5 flex flex-wrap items-center justify-between gap-3"
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-gray-900 dark:text-white capitalize">
                                @{tally.promoter}
                              </span>
                              {tally.promoter === 'organico' && (
                                <span className="px-2 py-0.5 rounded-md bg-gray-200 dark:bg-white/10 text-[10px] text-gray-600 dark:text-gray-400 font-semibold">
                                  Sin RRPP
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                              {tally.totalGuests} invitados registrados ·{' '}
                              <strong className="text-emerald-500">{tally.checkedInGuests} en puerta</strong>
                            </p>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={async () => {
                                try {
                                  await navigator.clipboard.writeText(shareLink)
                                  toast.success(`Enlace de @${tally.promoter} copiado`)
                                } catch {
                                  toast.error('Error al copiar')
                                }
                              }}
                              className="p-2 rounded-xl bg-white dark:bg-white/10 text-gray-700 dark:text-gray-300 hover:text-white text-xs font-semibold transition-colors border border-gray-200 dark:border-white/10"
                              title="Copiar enlace del promotor"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const msg = `🔥 ¡Dímelo! Te paso el pase VIP para "${promoterModalEvent.title}" cortesía de @${tally.promoter}: ${shareLink}`
                                window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`, '_blank')
                              }}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors"
                            >
                              <Send className="w-3 h-3" />
                              <span>WhatsApp</span>
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function TransfersPanel({
  transfers,
  actionLoadingId,
  copiedRef,
  onApprove,
  onReject,
  onCopyRef,
}: {
  transfers: any[]
  actionLoadingId: string | null
  copiedRef: string | null
  onApprove: (orderId: string) => void
  onReject: (order: any) => void
  onCopyRef: (ref: string) => void
}) {
  if (transfers.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-16 h-16 rounded-3xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-4">
          <Building2 className="w-8 h-8 text-amber-500" />
        </div>
        <p className="text-base font-bold text-gray-900 dark:text-white mb-1">
          Sin comprobantes pendientes
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400 max-w-sm leading-relaxed">
          Cuando los asistentes seleccionen pagar por Transferencia Directa RD (Popular, BHD, Banreservas o Qik), sus comprobantes aparecerán aquí para tu validación en un solo clic.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Building2 className="w-5 h-5 text-amber-400 shrink-0" />
          <div>
            <h3 className="text-xs font-black text-amber-400 uppercase tracking-wider">
              Transferencias Dominicanas por Validar ({transfers.length})
            </h3>
            <p className="text-xs text-gray-400">
              Copia el número de referencia, confirma en tu app bancaria y aprueba con un solo clic.
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-4">
        {transfers.map((order) => {
          const proof = order.bankTransferProof || {}
          const buyer = order.userId || order.customerInfo || {}
          const buyerName = buyer.firstName
            ? `${buyer.firstName} ${buyer.lastName || ''}`.trim()
            : buyer.username || 'Comprador'
          const eventTitle = order.eventId?.title || 'Evento'
          const isLoading = actionLoadingId === order._id

          return (
            <motion.div
              key={order._id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-5 rounded-3xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-white/10 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-5"
            >
              {/* Info Column */}
              <div className="space-y-1.5 flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    {proof.bankName || 'Transferencia RD'}
                  </span>
                  <span className="text-xs font-black text-gray-900 dark:text-white truncate">
                    {eventTitle}
                  </span>
                </div>

                <div className="text-xs text-gray-500 dark:text-gray-400">
                  <span className="font-semibold text-gray-900 dark:text-white">{buyerName}</span>
                  {buyer.email && ` · ${buyer.email}`}
                  {buyer.phone && ` · 📞 ${buyer.phone}`}
                </div>

                {/* Comprobante pill */}
                <div className="inline-flex items-center gap-2 pt-1">
                  <span className="text-xs text-gray-400">Referencia:</span>
                  <span className="font-mono text-xs font-bold text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-md border border-amber-400/20">
                    {proof.referenceNumber || 'No especificada'}
                  </span>
                  {proof.referenceNumber && (
                    <button
                      type="button"
                      onClick={() => onCopyRef(proof.referenceNumber)}
                      className="p-1 rounded-md text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
                      title="Copiar número de referencia"
                    >
                      {copiedRef === proof.referenceNumber ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  )}
                  {proof.voucherUrl && (
                    <a
                      href={proof.voucherUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-sky-400 hover:underline ml-2"
                    >
                      <ExternalLink className="w-3 h-3" />
                      <span>Ver Comprobante</span>
                    </a>
                  )}
                </div>
              </div>

              {/* Price and Actions */}
              <div className="flex items-center justify-between md:justify-end w-full md:w-auto gap-4 shrink-0 pt-3 md:pt-0 border-t md:border-t-0 border-gray-100 dark:border-white/5">
                <div className="text-left md:text-right">
                  <span className="text-[11px] text-gray-400 block">Total a validar:</span>
                  <span className="text-lg font-black text-emerald-400">
                    RD$ {Number(order.total || 0).toLocaleString('es-DO')}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onReject(order)}
                    disabled={isLoading}
                    className="px-3 py-2 rounded-xl border border-red-500/30 text-red-400 hover:bg-red-500/10 text-xs font-bold transition-all disabled:opacity-40"
                  >
                    Rechazar
                  </button>
                  <button
                    type="button"
                    onClick={() => onApprove(order._id)}
                    disabled={isLoading}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-lg shadow-emerald-900/30 transition-all disabled:opacity-40"
                  >
                    {isLoading ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    )}
                    <span>Aprobar Boleta</span>
                  </button>
                </div>
              </div>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}

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
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-violet-500 hover:bg-violet-600 text-white rounded-xl font-semibold text-sm transition-colors"
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
          { icon: Users, label: 'Asistentes', value: analytics.totalAttendees, color: 'bg-violet-50 dark:bg-violet-500/10 text-violet-600 dark:text-violet-400' },
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
                    <p className="font-bold text-sm text-violet-600 dark:text-violet-400">{ev.conversionRate}%</p>
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
