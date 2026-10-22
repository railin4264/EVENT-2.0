'use client'

import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import {
  Shield, LifeBuoy, BarChart3, FileText, AlertTriangle, CheckCircle2,
  Clock, ArrowRight, RefreshCw, ShieldCheck, Activity, Users, Calendar,
  Flag, MessageSquare, Terminal, Sparkles
} from 'lucide-react'
import { AdminNav } from '@/components/admin/AdminNav'
import { FlyerIngestModal } from '@/components/admin/FlyerIngestModal'
import { useState } from 'react'
import { apiClient } from '@/lib/api/client'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'

export default function AdminDashboardPage() {
  const [isFlyerModalOpen, setIsFlyerModalOpen] = useState(false)
  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['admin-overview-priorities'],
    queryFn: async () => {
      const [reportsRes, verifsRes, ticketsRes, auditStatsRes, auditLogsRes, eventsRes, pendingEventsRes] = await Promise.allSettled([
        apiClient.get('/reports/admin?limit=25'),
        apiClient.get('/reports/organizer-verifications?status=pending'),
        apiClient.get('/support/admin/tickets?limit=10'),
        apiClient.get('/audit/stats'),
        apiClient.get('/audit/logs?limit=5'),
        apiClient.get('/events?limit=50'),
        apiClient.get('/events/admin/pending')
      ])

      const reportsPayload = reportsRes.status === 'fulfilled' ? (reportsRes.value.data?.data || reportsRes.value.data) : null
      const reportsList: any[] = reportsPayload?.reports || (Array.isArray(reportsPayload) ? reportsPayload : [])
      const pendingReports = reportsList.filter(r => r.status === 'pending')
      const reviewingReports = reportsList.filter(r => ['reviewing', 'in_review', 'under_review', 'reviewed'].includes(r.status))

      const verifsList: any[] = verifsRes.status === 'fulfilled'
        ? (verifsRes.value.data?.data || [])
        : []

      const ticketsPayload = ticketsRes.status === 'fulfilled' ? ticketsRes.value.data : null
      const ticketsList: any[] = ticketsPayload?.data || []
      const ticketCounts = ticketsPayload?.counts || {
        all: ticketsList.length,
        open: ticketsList.filter(t => t.status === 'open').length,
        in_progress: ticketsList.filter(t => t.status === 'in_progress').length,
        waiting_user: ticketsList.filter(t => t.status === 'waiting_user').length,
        resolved: ticketsList.filter(t => t.status === 'resolved').length
      }

      const auditStats = auditStatsRes.status === 'fulfilled' ? auditStatsRes.value.data?.data : null
      const auditLogs: any[] = auditLogsRes.status === 'fulfilled' ? (auditLogsRes.value.data?.logs || []) : []

      const eventsPayload = eventsRes.status === 'fulfilled' ? eventsRes.value.data : null
      const eventsList: any[] = eventsPayload?.events || eventsPayload?.data || []

      const pendingEventsPayload = pendingEventsRes.status === 'fulfilled' ? pendingEventsRes.value.data : null
      const pendingEventsList: any[] = pendingEventsPayload?.events || pendingEventsPayload?.data || []

      const apiHealthy = [reportsRes, ticketsRes, auditStatsRes, eventsRes].some(r => r.status === 'fulfilled')

      return {
        pendingReportsCount: pendingReports.length,
        reviewingReportsCount: reviewingReports.length,
        recentPendingReports: [...pendingReports, ...reviewingReports].slice(0, 5),
        pendingVerificationsCount: verifsList.length,
        recentVerifications: verifsList.slice(0, 4),
        pendingEventsCount: pendingEventsList.length,
        recentPendingEvents: pendingEventsList.slice(0, 5),
        openTicketsCount: Number(ticketCounts.open || 0),
        inProgressTicketsCount: Number(ticketCounts.in_progress || 0),
        recentOpenTickets: ticketsList.filter(t => t.status === 'open' || t.status === 'in_progress').slice(0, 5),
        auditTotal: auditStats?.total ?? auditLogs.length,
        auditLast24h: auditStats?.last24h ?? 0,
        recentAuditLogs: auditLogs.slice(0, 5),
        activeEventsCount: eventsList.length,
        apiHealthy
      }
    }
  })

  const pendingReportsCount = data?.pendingReportsCount ?? 0
  const reviewingReportsCount = data?.reviewingReportsCount ?? 0
  const pendingVerificationsCount = data?.pendingVerificationsCount ?? 0
  const pendingEventsCount = data?.pendingEventsCount ?? 0
  const openTicketsCount = data?.openTicketsCount ?? 0
  const inProgressTicketsCount = data?.inProgressTicketsCount ?? 0
  const totalModerationAttention = pendingReportsCount + reviewingReportsCount + pendingVerificationsCount
  const totalSupportAttention = openTicketsCount + inProgressTicketsCount

  return (
    <div className="min-h-screen bg-gray-950 text-foreground">
      <AdminNav />

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-8">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                {data?.apiHealthy === false ? 'Verificando conexión' : 'Sistema Operativo'}
              </span>
              <span className="text-xs text-gray-500">EventNow RD · Centro de Control</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white mt-2">
              Panel Principal de Administración
            </h1>
            <p className="text-gray-400 text-xs sm:text-sm mt-1">
              Supervisión centralizada de moderación, verificaciones anti-fraude, soporte al usuario y estado del sistema.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsFlyerModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold text-xs shadow-lg shadow-primary/20 transition-all"
            >
              <Sparkles className="w-4 h-4" />
              <span>Ingestar Flyer con IA 🇩🇴</span>
            </button>
            <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="self-start sm:self-auto inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-200 hover:text-white border border-white/10 text-xs font-semibold transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin text-primary' : ''}`} />
            <span>Actualizar Estado</span>
          </button>
        </div>
        </div>

        {/* PRIORIDADES PENDIENTES SECTION */}
        <section aria-labelledby="prioridades-pendientes-heading" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 id="prioridades-pendientes-heading" className="text-lg font-bold text-white flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-400" />
              Prioridades Pendientes
            </h2>
            <span className="text-xs text-gray-400">
              Acciones directas de atención prioritaria
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            {/* Priority Card 1: Pending Moderation Reports */}
            <div className="bg-gray-900 border border-white/10 rounded-2xl p-5 flex flex-col justify-between hover:border-red-500/40 transition-all">
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className="p-2.5 rounded-xl bg-red-500/15 text-red-400 border border-red-500/20">
                    <Flag className="w-5 h-5" />
                  </div>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                    pendingReportsCount > 0
                      ? 'bg-red-500/20 text-red-300 border-red-500/30'
                      : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                  }`}>
                    {pendingReportsCount > 0 ? `${pendingReportsCount} por revisar` : 'Al día'}
                  </span>
                </div>
                <p className="text-xs text-gray-400 font-medium">Reportes de Moderación</p>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-3xl font-extrabold text-white">
                    {isLoading ? '—' : pendingReportsCount}
                  </span>
                  <span className="text-xs text-gray-400">
                    pendientes · {reviewingReportsCount} en revisión
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Denuncias de eventos, publicaciones, usuarios o tribus que requieren acción.
                </p>
              </div>

              <Link
                href="/admin/moderation"
                className="mt-4 inline-flex items-center justify-between w-full px-3.5 py-2.5 rounded-xl bg-red-500/15 hover:bg-red-500/25 text-red-300 border border-red-500/30 text-xs font-bold transition-all"
              >
                <span>Ir a Moderación</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            {/* Priority Card 1.5: Event Approval Queue (Control de Calidad) */}
            <div className="bg-gray-900 border border-white/10 rounded-2xl p-5 flex flex-col justify-between hover:border-purple-500/40 transition-all">
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className="p-2.5 rounded-xl bg-purple-500/15 text-purple-400 border border-purple-500/20">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                    pendingEventsCount > 0
                      ? 'bg-purple-500/20 text-purple-300 border-purple-500/30'
                      : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                  }`}>
                    {pendingEventsCount > 0 ? `${pendingEventsCount} por aprobar` : 'Todo al día'}
                  </span>
                </div>
                <p className="text-xs text-gray-400 font-medium">Aprobación de Eventos RD</p>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-3xl font-extrabold text-white">
                    {isLoading ? '—' : pendingEventsCount}
                  </span>
                  <span className="text-xs text-gray-400">eventos en espera</span>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Eventos creados por usuarios que esperan aprobación antes de publicarse.
                </p>
              </div>

              <Link
                href="/admin/moderation?section=pending_events"
                className="mt-4 inline-flex items-center justify-between w-full px-3.5 py-2.5 rounded-xl bg-purple-500/15 hover:bg-purple-500/25 text-purple-300 border border-purple-500/30 text-xs font-bold transition-all"
              >
                <span>Aprobar Eventos</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            {/* Priority Card 2: Organizer Verifications RD */}
            <div className="bg-gray-900 border border-white/10 rounded-2xl p-5 flex flex-col justify-between hover:border-emerald-500/40 transition-all">
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className="p-2.5 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                    pendingVerificationsCount > 0
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                      : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                  }`}>
                    {pendingVerificationsCount > 0 ? 'Requiere validación' : 'Sin pendientes'}
                  </span>
                </div>
                <p className="text-xs text-gray-400 font-medium">Verificaciones Anti-Fraude RD</p>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-3xl font-extrabold text-white">
                    {isLoading ? '—' : pendingVerificationsCount}
                  </span>
                  <span className="text-xs text-gray-400">solicitudes pendientes</span>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Validación de Cédula, RNC o Pasaporte para otorgar insignia de Organizador Verificado.
                </p>
              </div>

              <Link
                href="/admin/moderation?section=verifications"
                className="mt-4 inline-flex items-center justify-between w-full px-3.5 py-2.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 text-xs font-bold transition-all"
              >
                <span>Revisar Solicitudes</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            {/* Priority Card 3: Open Support Tickets */}
            <div className="bg-gray-900 border border-white/10 rounded-2xl p-5 flex flex-col justify-between hover:border-blue-500/40 transition-all">
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className="p-2.5 rounded-xl bg-blue-500/15 text-blue-400 border border-blue-500/20">
                    <LifeBuoy className="w-5 h-5" />
                  </div>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                    openTicketsCount > 0
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                      : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                  }`}>
                    {openTicketsCount > 0 ? `${openTicketsCount} abiertos` : 'Bandeja al día'}
                  </span>
                </div>
                <p className="text-xs text-gray-400 font-medium">Tickets de Soporte Activos</p>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-3xl font-extrabold text-white">
                    {isLoading ? '—' : totalSupportAttention}
                  </span>
                  <span className="text-xs text-gray-400">
                    ({openTicketsCount} nuevos · {inProgressTicketsCount} en curso)
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Consultas de entradas, reportes de usuarios y asistencia a organizadores.
                </p>
              </div>

              <Link
                href="/admin/support"
                className="mt-4 inline-flex items-center justify-between w-full px-3.5 py-2.5 rounded-xl bg-blue-500/15 hover:bg-blue-500/25 text-blue-300 border border-blue-500/30 text-xs font-bold transition-all"
              >
                <span>Atender Soporte</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            {/* Priority Card 4: System Status & Audit */}
            <div className="bg-gray-900 border border-white/10 rounded-2xl p-5 flex flex-col justify-between hover:border-violet-500/40 transition-all">
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className="p-2.5 rounded-xl bg-violet-500/15 text-violet-400 border border-violet-500/20">
                    <Activity className="w-5 h-5" />
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                    100% Trazable
                  </span>
                </div>
                <p className="text-xs text-gray-400 font-medium">Estado del Sistema y Auditoría</p>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-3xl font-extrabold text-white">
                    {isLoading ? '—' : (data?.auditLast24h ?? 0)}
                  </span>
                  <span className="text-xs text-gray-400">acciones (24h)</span>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  {data?.activeEventsCount ?? 0} eventos activos en catálogo · {data?.auditTotal ?? 0} registros en bitácora.
                </p>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2">
                <Link
                  href="/admin/audit"
                  className="inline-flex items-center justify-center gap-1 px-3 py-2.5 rounded-xl bg-violet-500/15 hover:bg-violet-500/25 text-violet-300 border border-violet-500/30 text-xs font-bold transition-all"
                >
                  <span>Auditoría</span>
                </Link>
                <Link
                  href="/admin/analytics"
                  className="inline-flex items-center justify-center gap-1 px-3 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-200 border border-white/10 text-xs font-bold transition-all"
                >
                  <span>Analíticas</span>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Detailed Priority Queues (Responsive Grid) */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Column 1: Pending Moderation Queue */}
          <div className="bg-gray-900 border border-white/10 rounded-2xl p-5 flex flex-col justify-between space-y-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Shield className="w-4 h-4 text-red-400" />
                  Cola de Moderación
                </h3>
                <Link href="/admin/moderation" className="text-xs text-primary hover:underline font-semibold">
                  Ver todos ({totalModerationAttention})
                </Link>
              </div>

              {isLoading ? (
                <div className="space-y-2.5">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="h-16 bg-gray-800/70 rounded-xl animate-pulse" />
                  ))}
                </div>
              ) : (data?.recentPendingReports?.length || 0) === 0 ? (
                <div className="py-8 text-center text-gray-500">
                  <CheckCircle2 className="w-8 h-8 text-emerald-400/60 mx-auto mb-2" />
                  <p className="text-xs font-medium text-gray-300">No hay reportes pendientes</p>
                  <p className="text-[11px] text-gray-500 mt-0.5">Todos los reportes han sido atendidos.</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {data?.recentPendingReports.map((report: any) => (
                    <Link
                      key={report._id}
                      href="/admin/moderation"
                      className="block p-3 rounded-xl bg-gray-950/70 border border-white/5 hover:border-red-500/30 transition-all"
                    >
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-red-500/15 text-red-300">
                          {report.type || 'Reporte'}
                        </span>
                        <span className="text-[11px] text-gray-500">
                          {report.createdAt
                            ? formatDistanceToNow(new Date(report.createdAt), { addSuffix: true, locale: es })
                            : ''}
                        </span>
                      </div>
                      <p className="text-xs font-semibold text-white line-clamp-1">{report.reason}</p>
                      <p className="text-[11px] text-gray-400 mt-0.5">
                        Por @{report.reporter?.username || report.reportedBy?.username || 'usuario'}
                      </p>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            <Link
              href="/admin/moderation"
              className="w-full py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-center text-xs font-semibold text-gray-200 transition-colors"
            >
              Abrir Centro de Moderación
            </Link>
          </div>

          {/* Column 2: Open Support Tickets Queue */}
          <div className="bg-gray-900 border border-white/10 rounded-2xl p-5 flex flex-col justify-between space-y-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-blue-400" />
                  Tickets por Atender
                </h3>
                <Link href="/admin/support" className="text-xs text-primary hover:underline font-semibold">
                  Ver mesa ({totalSupportAttention})
                </Link>
              </div>

              {isLoading ? (
                <div className="space-y-2.5">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="h-16 bg-gray-800/70 rounded-xl animate-pulse" />
                  ))}
                </div>
              ) : (data?.recentOpenTickets?.length || 0) === 0 ? (
                <div className="py-8 text-center text-gray-500">
                  <CheckCircle2 className="w-8 h-8 text-emerald-400/60 mx-auto mb-2" />
                  <p className="text-xs font-medium text-gray-300">Sin tickets abiertos</p>
                  <p className="text-[11px] text-gray-500 mt-0.5">No hay solicitudes de soporte pendientes de respuesta.</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {data?.recentOpenTickets.map((ticket: any) => (
                    <Link
                      key={ticket._id}
                      href="/admin/support"
                      className="block p-3 rounded-xl bg-gray-950/70 border border-white/5 hover:border-blue-500/30 transition-all"
                    >
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="text-[10px] font-mono font-bold text-primary">
                          {ticket.ticketNumber}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 font-semibold">
                          {ticket.status === 'open' ? 'Abierto' : 'En proceso'}
                        </span>
                      </div>
                      <p className="text-xs font-semibold text-white line-clamp-1">{ticket.subject}</p>
                      <p className="text-[11px] text-gray-400 mt-0.5">
                        @{ticket.user?.username || 'usuario'}
                      </p>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            <Link
              href="/admin/support"
              className="w-full py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-center text-xs font-semibold text-gray-200 transition-colors"
            >
              Abrir Mesa de Soporte
            </Link>
          </div>

          {/* Column 3: Recent Audit & System Activity */}
          <div className="bg-gray-900 border border-white/10 rounded-2xl p-5 flex flex-col justify-between space-y-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-violet-400" />
                  Actividad Reciente en Bitácora
                </h3>
                <Link href="/admin/audit" className="text-xs text-primary hover:underline font-semibold">
                  Bitácora completa
                </Link>
              </div>

              {isLoading ? (
                <div className="space-y-2.5">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="h-16 bg-gray-800/70 rounded-xl animate-pulse" />
                  ))}
                </div>
              ) : (data?.recentAuditLogs?.length || 0) === 0 ? (
                <div className="py-8 text-center text-gray-500">
                  <FileText className="w-8 h-8 text-gray-600 mx-auto mb-2" />
                  <p className="text-xs font-medium text-gray-300">Sin eventos recientes</p>
                  <p className="text-[11px] text-gray-500 mt-0.5">Las acciones administrativas quedarán registradas aquí.</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {data?.recentAuditLogs.map((log: any) => (
                    <Link
                      key={log._id}
                      href="/admin/audit"
                      className="block p-3 rounded-xl bg-gray-950/70 border border-white/5 hover:border-violet-500/30 transition-all"
                    >
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="text-[10px] font-mono font-semibold text-violet-300 truncate">
                          {log.action}
                        </span>
                        <span className="text-[10px] text-gray-500 flex-shrink-0">
                          {log.createdAt
                            ? formatDistanceToNow(new Date(log.createdAt), { addSuffix: true, locale: es })
                            : ''}
                        </span>
                      </div>
                      <p className="text-xs text-gray-200 line-clamp-1">
                        {log.targetLabel || log.targetType || 'Sistema'}
                      </p>
                      <p className="text-[11px] text-gray-500 mt-0.5">
                        Actor: @{log.actorUsername || 'admin'}
                      </p>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            <Link
              href="/admin/audit"
              className="w-full py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-center text-xs font-semibold text-gray-200 transition-colors"
            >
              Inspeccionar Bitácora de Auditoría
            </Link>
          </div>
        </section>
        <FlyerIngestModal
        isOpen={isFlyerModalOpen}
        onClose={() => setIsFlyerModalOpen(false)}
        onSuccess={() => refetch()}
      />
      </main>
    </div>
  )
}
