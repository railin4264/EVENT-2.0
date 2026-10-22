'use client'

import { useState, useEffect, useCallback } from 'react'
import { AdminNav } from '@/components/admin/AdminNav'
import api from '@/lib/api/client'
import {
  Users, Calendar, ShieldCheck, Ticket, RefreshCw, Download,
  BarChart3, Layers, CheckCircle2, Clock, Sparkles, DollarSign,
  TrendingUp, AlertCircle
} from 'lucide-react'

type TimeRange = '24h' | '7d' | '30d' | '90d'

interface CategoryStat {
  category: string
  label: string
  eventsCount: number
  attendeesCount: number
  percentage: number
}

interface TopEventItem {
  _id: string
  title: string
  category: string
  date: string
  price: number
  currency: string
  attendeesCount: number
  capacity?: number
  statusLabel: 'Próximo' | 'En curso' | 'Finalizado'
  organizerVerified: boolean
}

interface RealAnalyticsState {
  // Events real metrics
  totalEvents: number
  upcomingEvents: number
  liveEvents: number
  pastEvents: number
  freeEvents: number
  paidEvents: number
  freePercentage: number
  paidPercentage: number
  totalConfirmedAttendees: number
  avgAttendeesPerEvent: number
  verifiedOrganizersCount: number
  verifiedEventsCount: number
  categoryDistribution: CategoryStat[]
  topEventsByAttendance: TopEventItem[]

  // Users real metrics
  totalUsers: number
  activeUsersInPeriod: number
  newUsersInPeriod: number
  retentionRate: number
  userGrowthDaily: Array<{ date: string; newUsers: number }>

  // Tribes real metrics
  totalTribes: number
  totalTribeMembers: number
  avgMembersPerTribe: number

  // Revenue real metrics
  totalRevenue: number
  totalTransactions: number

  // Telemetry recorded events
  recordedPageViews: number
  recordedInteractions: number
  telemetryDaily: Array<{ date: string; events: number; uniqueUsers: number }>

  // Moderation summary
  pendingReports: number
  resolvedReports: number
}

const CATEGORY_LABELS: Record<string, string> = {
  music: 'Música y Conciertos',
  nightlife: 'Vida Nocturna y Rooftops',
  culture: 'Arte y Cultura',
  art: 'Arte y Exposiciones',
  food: 'Gastronomía y Cata',
  tech: 'Tecnología e Innovación',
  technology: 'Tecnología e Innovación',
  sports: 'Deportes y Fitness',
  fitness: 'Fitness y Running',
  outdoors: 'Aire Libre y Playa',
  business: 'Negocios y Networking',
  networking: 'Networking Profesional',
  education: 'Educación y Talleres',
  gaming: 'Gaming y Esports',
  comedy: 'Comedia y Stand-up',
  wellness: 'Bienestar y Salud',
  cinema: 'Cine y Proyecciones',
  literature: 'Literatura y Libros',
  family: 'Familia y Comunidad',
  other: 'Otras Categorías'
}

function getCategoryLabel(cat?: string): string {
  if (!cat) return 'General'
  const key = cat.toLowerCase().trim()
  return CATEGORY_LABELS[key] || cat.charAt(0).toUpperCase() + cat.slice(1)
}

function getAttendeeCount(ev: any): number {
  if (typeof ev.attendeeCount === 'number') return ev.attendeeCount
  if (typeof ev.attendeesCount === 'number') return ev.attendeesCount
  if (Array.isArray(ev.attendees)) {
    return ev.attendees.filter((a: any) => !a?.status || ['attending', 'confirmed', 'checked_in'].includes(a.status)).length
  }
  if (typeof ev.attendees === 'number') return ev.attendees
  return 0
}

export default function AnalyticsPage() {
  const [data, setData] = useState<RealAnalyticsState | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [timeRange, setTimeRange] = useState<TimeRange>('30d')
  const [error, setError] = useState<string | null>(null)

  const fetchAnalytics = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      const daysMap: Record<TimeRange, number> = {
        '24h': 1,
        '7d': 7,
        '30d': 30,
        '90d': 90
      }
      const days = daysMap[timeRange]

      const [
        eventsCatalogRes,
        eventAnalyticsRes,
        userAnalyticsRes,
        tribeAnalyticsRes,
        revenueAnalyticsRes,
        organizersRes,
        verifsRes,
        reportsRes
      ] = await Promise.allSettled([
        api.get('/events?includePast=true&limit=100'),
        api.get(`/analytics/events?timeframe=${timeRange}`),
        api.get(`/analytics/users?days=${days}&timeframe=${timeRange}`),
        api.get(`/analytics/tribes?timeframe=${timeRange}`),
        api.get(`/analytics/revenue?timeframe=${timeRange}`),
        api.get('/users/featured-organizers'),
        api.get('/reports/organizer-verifications?status=verified'),
        api.get('/reports/admin?limit=100')
      ])

      // 1. Parse real events from catalog
      const rawEventsPayload = eventsCatalogRes.status === 'fulfilled' ? eventsCatalogRes.value.data : null
      const eventsList: any[] = Array.isArray(rawEventsPayload?.events)
        ? rawEventsPayload.events
        : Array.isArray(rawEventsPayload?.data)
          ? rawEventsPayload.data
          : Array.isArray(rawEventsPayload)
            ? rawEventsPayload
            : []

      const now = new Date()
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)

      let upcomingEvents = 0
      let liveEvents = 0
      let pastEvents = 0
      let freeEvents = 0
      let paidEvents = 0
      let totalConfirmedAttendees = 0
      let verifiedEventsCount = 0

      const categoryMap = new Map<string, { count: number; attendees: number }>()

      const processedEvents: TopEventItem[] = eventsList.map((ev: any) => {
        const evDate = ev.date ? new Date(ev.date) : new Date()
        const evEndDate = ev.endDate ? new Date(ev.endDate) : null
        const price = Number(ev.price || 0)
        const attendeesCount = getAttendeeCount(ev)
        const isOrgVerified = Boolean(
          ev.createdBy?.isOrganizerVerified ||
          ev.createdBy?.verified ||
          ev.organizer?.isOrganizerVerified ||
          ev.organizer?.verified ||
          ev.isOrganizerVerified
        )

        let statusLabel: 'Próximo' | 'En curso' | 'Finalizado' = 'Próximo'
        if (
          ev.status === 'live' ||
          (evDate >= startOfToday && evDate <= endOfToday) ||
          (evDate <= now && evEndDate && evEndDate >= now)
        ) {
          liveEvents++
          statusLabel = 'En curso'
        } else if (evDate < now || ev.status === 'completed') {
          pastEvents++
          statusLabel = 'Finalizado'
        } else {
          upcomingEvents++
          statusLabel = 'Próximo'
        }

        if (price <= 0) {
          freeEvents++
        } else {
          paidEvents++
        }

        if (isOrgVerified) {
          verifiedEventsCount++
        }

        totalConfirmedAttendees += attendeesCount

        const catKey = (ev.category || 'other').toLowerCase().trim()
        const prev = categoryMap.get(catKey) || { count: 0, attendees: 0 }
        categoryMap.set(catKey, {
          count: prev.count + 1,
          attendees: prev.attendees + attendeesCount
        })

        return {
          _id: ev._id || String(Math.random()),
          title: ev.title || 'Evento sin título',
          category: getCategoryLabel(ev.category),
          date: ev.date || new Date().toISOString(),
          price,
          currency: ev.currency || 'DOP',
          attendeesCount,
          capacity: ev.capacity || ev.maxAttendees,
          statusLabel,
          organizerVerified: isOrgVerified
        }
      })

      const totalEventsCount = eventsList.length
      const freePercentage = totalEventsCount > 0 ? Math.round((freeEvents / totalEventsCount) * 100) : 0
      const paidPercentage = totalEventsCount > 0 ? 100 - freePercentage : 0
      const avgAttendeesPerEvent = totalEventsCount > 0
        ? Number((totalConfirmedAttendees / totalEventsCount).toFixed(1))
        : 0

      const categoryDistribution: CategoryStat[] = Array.from(categoryMap.entries())
        .map(([category, stats]) => ({
          category,
          label: getCategoryLabel(category),
          eventsCount: stats.count,
          attendeesCount: stats.attendees,
          percentage: totalEventsCount > 0 ? Math.round((stats.count / totalEventsCount) * 100) : 0
        }))
        .sort((a, b) => b.eventsCount - a.eventsCount)

      const topEventsByAttendance = [...processedEvents]
        .sort((a, b) => b.attendeesCount - a.attendeesCount)
        .slice(0, 8)

      // 2. Verified Organizers count
      const featuredOrgs = organizersRes.status === 'fulfilled' ? (organizersRes.value.data?.data || []) : []
      const verifiedVerifs = verifsRes.status === 'fulfilled' ? (verifsRes.value.data?.data || []) : []
      const uniqueOrgIds = new Set<string>([
        ...featuredOrgs.map((o: any) => String(o._id)),
        ...verifiedVerifs.map((v: any) => String(v._id))
      ])
      const verifiedOrganizersCount = uniqueOrgIds.size

      // 3. User Analytics
      const ua = userAnalyticsRes.status === 'fulfilled' ? userAnalyticsRes.value.data?.userAnalytics : null
      const totalUsers = ua?.overview?.totalUsers ?? 0
      const activeUsersInPeriod = ua?.overview?.activeUsers ?? 0
      const newUsersInPeriod = ua?.overview?.newUsers ?? 0
      const retentionRate = ua?.overview?.retentionRate ?? (totalUsers > 0 ? Number(((activeUsersInPeriod / totalUsers) * 100).toFixed(1)) : 0)
      const userGrowthDaily = Array.isArray(ua?.growth?.daily) ? ua.growth.daily : []

      // 4. Tribe Analytics
      const ta = tribeAnalyticsRes.status === 'fulfilled' ? tribeAnalyticsRes.value.data?.tribeAnalytics : null
      const totalTribes = ta?.overview?.totalTribes ?? 0
      const totalTribeMembers = ta?.overview?.totalMembers ?? 0
      const avgMembersPerTribe = ta?.overview?.averageMembersPerTribe ?? 0

      // 5. Revenue Analytics
      const ra = revenueAnalyticsRes.status === 'fulfilled' ? revenueAnalyticsRes.value.data?.revenueAnalytics : null
      const totalRevenue = ra?.overview?.totalRevenue ?? 0
      const totalTransactions = ra?.overview?.totalTransactions ?? 0

      // 6. Telemetry Analytics
      const ea = eventAnalyticsRes.status === 'fulfilled' ? eventAnalyticsRes.value.data?.analytics : null
      const recordedPageViews = ea?.overview?.totalPageViews ?? 0
      const recordedInteractions = ea?.overview?.totalInteractions ?? 0
      const telemetryDaily = Array.isArray(ea?.telemetry?.daily)
        ? ea.telemetry.daily.map((d: any) => ({
            date: d.date,
            events: Number(d.events || 0),
            uniqueUsers: Number(d.users || d.uniqueUsers || 0)
          }))
        : []

      // 7. Moderation reports
      const repPayload = reportsRes.status === 'fulfilled' ? (reportsRes.value.data?.data || reportsRes.value.data) : null
      const repList: any[] = repPayload?.reports || (Array.isArray(repPayload) ? repPayload : [])
      const pendingReports = repList.filter(r => r.status === 'pending' || r.status === 'reviewing' || r.status === 'under_review').length
      const resolvedReports = repList.filter(r => r.status === 'resolved').length

      setData({
        totalEvents: totalEventsCount,
        upcomingEvents,
        liveEvents,
        pastEvents,
        freeEvents,
        paidEvents,
        freePercentage,
        paidPercentage,
        totalConfirmedAttendees,
        avgAttendeesPerEvent,
        verifiedOrganizersCount,
        verifiedEventsCount,
        categoryDistribution,
        topEventsByAttendance,
        totalUsers,
        activeUsersInPeriod,
        newUsersInPeriod,
        retentionRate,
        userGrowthDaily,
        totalTribes,
        totalTribeMembers,
        avgMembersPerTribe,
        totalRevenue,
        totalTransactions,
        recordedPageViews,
        recordedInteractions,
        telemetryDaily,
        pendingReports,
        resolvedReports
      })
    } catch (err) {
      console.error('Failed to fetch analytics:', err)
      setError('No se pudieron cargar los datos de analíticas')
    } finally {
      setIsLoading(false)
    }
  }, [timeRange])

  useEffect(() => {
    fetchAnalytics()
  }, [fetchAnalytics])

  const handleExportJSON = () => {
    if (!data) return
    const blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), timeRange, metrics: data }, null, 2)], {
      type: 'application/json'
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `eventnow-analytics-${timeRange}-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const timeRangeLabels: Record<TimeRange, string> = {
    '24h': 'Últimas 24h',
    '7d': '7 Días',
    '30d': '30 Días',
    '90d': '90 Días'
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-950 text-foreground">
        <AdminNav />
        <div className="container mx-auto px-6 py-12">
          <div className="bg-gray-900 border border-white/10 p-8 rounded-3xl text-center max-w-md mx-auto">
            <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
            <h2 className="text-xl font-bold mb-2 text-white">Error al cargar Analíticas</h2>
            <p className="text-red-400 mb-6 text-sm">{error}</p>
            <button
              onClick={fetchAnalytics}
              className="px-6 py-2.5 rounded-xl bg-primary text-primary-foreground font-bold text-sm hover:opacity-90 transition-opacity"
            >
              Reintentar
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-950 text-foreground">
      <AdminNav />

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-8">
        {/* Header & Timeframe Controls */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-300 text-xs font-semibold mb-2">
              <BarChart3 className="w-3.5 h-3.5" />
              Datos verificados desde la base de datos (sin multiplicadores sintéticos)
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Analíticas y Rendimiento Real
            </h1>
            <p className="text-xs sm:text-sm text-gray-400 mt-1">
              Distribución real del catálogo de eventos, asistencia confirmada, organizadores verificados y registros en el período seleccionado.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="bg-gray-900 border border-white/10 rounded-xl p-1 flex">
              {(['24h', '7d', '30d', '90d'] as const).map((range) => (
                <button
                  key={range}
                  onClick={() => setTimeRange(range)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    timeRange === range
                      ? 'bg-primary text-primary-foreground shadow'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  {timeRangeLabels[range]}
                </button>
              ))}
            </div>

            <button
              onClick={fetchAnalytics}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-200 border border-white/10 text-xs font-semibold transition-all"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Actualizar</span>
            </button>

            <button
              onClick={handleExportJSON}
              disabled={!data}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-200 border border-white/10 text-xs font-semibold transition-all disabled:opacity-40"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Exportar JSON</span>
            </button>
          </div>
        </div>

        {isLoading || !data ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
              <div key={i} className="h-32 bg-gray-900 border border-white/5 rounded-2xl animate-pulse p-5" />
            ))}
          </div>
        ) : (
          <>
            {/* Primary Real KPIs Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Total Events */}
              <div className="bg-gray-900 border border-white/10 rounded-2xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-gray-400">
                    Eventos en Catálogo
                  </span>
                  <div className="p-2 rounded-xl bg-violet-500/15 text-violet-400">
                    <Calendar className="w-5 h-5" />
                  </div>
                </div>
                <div className="text-3xl font-extrabold text-white">{data.totalEvents}</div>
                <p className="text-xs text-gray-400 mt-2">
                  <span className="text-emerald-400 font-semibold">{data.upcomingEvents} próximos</span>
                  {' · '}
                  <span className="text-amber-400 font-semibold">{data.liveEvents} en curso</span>
                  {' · '}
                  <span>{data.pastEvents} pasados</span>
                </p>
              </div>

              {/* Confirmed Attendees */}
              <div className="bg-gray-900 border border-white/10 rounded-2xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-gray-400">
                    Asistentes Confirmados
                  </span>
                  <div className="p-2 rounded-xl bg-blue-500/15 text-blue-400">
                    <Ticket className="w-5 h-5" />
                  </div>
                </div>
                <div className="text-3xl font-extrabold text-white">{data.totalConfirmedAttendees}</div>
                <p className="text-xs text-gray-400 mt-2">
                  Promedio real: <strong className="text-white">{data.avgAttendeesPerEvent}</strong> asistentes por evento
                </p>
              </div>

              {/* Verified Organizers */}
              <div className="bg-gray-900 border border-white/10 rounded-2xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-gray-400">
                    Organizadores Verificados
                  </span>
                  <div className="p-2 rounded-xl bg-emerald-500/15 text-emerald-400">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                </div>
                <div className="text-3xl font-extrabold text-white">{data.verifiedOrganizersCount}</div>
                <p className="text-xs text-gray-400 mt-2">
                  Con insignia activa · <strong className="text-emerald-300">{data.verifiedEventsCount}</strong> eventos respaldados
                </p>
              </div>

              {/* Registered Users */}
              <div className="bg-gray-900 border border-white/10 rounded-2xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-gray-400">
                    Usuarios Registrados
                  </span>
                  <div className="p-2 rounded-xl bg-pink-500/15 text-pink-400">
                    <Users className="w-5 h-5" />
                  </div>
                </div>
                <div className="text-3xl font-extrabold text-white">{data.totalUsers}</div>
                <p className="text-xs text-gray-400 mt-2">
                  <strong className="text-white">{data.newUsersInPeriod}</strong> nuevos ({timeRangeLabels[timeRange]}) · {data.activeUsersInPeriod} con actividad
                </p>
              </div>
            </div>

            {/* Secondary Breakdown Row: Free vs Paid Ratio & Temporal Status & Tribes/Revenue */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Free vs Paid Events Ratio */}
              <div className="bg-gray-900 border border-white/10 rounded-2xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-bold text-white flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-emerald-400" />
                    Proporción Gratis vs. Eventos de Pago
                  </h2>
                  <span className="text-xs text-gray-400">{data.totalEvents} eventos</span>
                </div>

                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-emerald-300 font-semibold">Eventos Gratuitos / Entrada Libre</span>
                      <span className="text-white font-bold">{data.freeEvents} ({data.freePercentage}%)</span>
                    </div>
                    <div className="w-full h-2.5 bg-gray-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full transition-all"
                        style={{ width: `${data.freePercentage}%` }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-violet-300 font-semibold">Eventos de Pago / Taquilla</span>
                      <span className="text-white font-bold">{data.paidEvents} ({data.paidPercentage}%)</span>
                    </div>
                    <div className="w-full h-2.5 bg-gray-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-violet-500 rounded-full transition-all"
                        style={{ width: `${data.paidPercentage}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-white/5 text-[11px] text-gray-400 flex justify-between">
                  <span>Órdenes pagadas registradas: <strong className="text-white">{data.totalTransactions}</strong></span>
                  <span>Ingresos: <strong className="text-emerald-400">RD$ {data.totalRevenue.toLocaleString('es-DO')}</strong></span>
                </div>
              </div>

              {/* Upcoming vs Live vs Past Events */}
              <div className="bg-gray-900 border border-white/10 rounded-2xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-bold text-white flex items-center gap-2">
                    <Clock className="w-4 h-4 text-amber-400" />
                    Estado Temporal del Catálogo
                  </h2>
                  <span className="text-xs text-gray-400">Tiempo real por fecha</span>
                </div>

                <div className="grid grid-cols-3 gap-2.5">
                  <div className="bg-gray-950/80 border border-white/5 rounded-xl p-3 text-center">
                    <div className="text-2xl font-extrabold text-emerald-400">{data.upcomingEvents}</div>
                    <div className="text-[11px] text-gray-400 mt-1">Próximos</div>
                  </div>
                  <div className="bg-gray-950/80 border border-white/5 rounded-xl p-3 text-center">
                    <div className="text-2xl font-extrabold text-amber-400">{data.liveEvents}</div>
                    <div className="text-[11px] text-gray-400 mt-1">En Curso Hoy</div>
                  </div>
                  <div className="bg-gray-950/80 border border-white/5 rounded-xl p-3 text-center">
                    <div className="text-2xl font-extrabold text-gray-300">{data.pastEvents}</div>
                    <div className="text-[11px] text-gray-400 mt-1">Finalizados</div>
                  </div>
                </div>

                <p className="text-[11px] text-gray-500">
                  Calculado directamente a partir de las fechas de inicio y fin (`date` / `endDate`) de cada evento en el catálogo.
                </p>
              </div>

              {/* Communities (Tribes) & Telemetry Summary */}
              <div className="bg-gray-900 border border-white/10 rounded-2xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-bold text-white flex items-center gap-2">
                    <Layers className="w-4 h-4 text-blue-400" />
                    Comunidades y Telemetría ({timeRangeLabels[timeRange]})
                  </h2>
                </div>

                <div className="grid grid-cols-2 gap-2.5 text-xs">
                  <div className="bg-gray-950/80 border border-white/5 rounded-xl p-3">
                    <p className="text-gray-400">Tribus Activas</p>
                    <p className="text-xl font-extrabold text-white mt-0.5">{data.totalTribes}</p>
                    <p className="text-[11px] text-gray-500 mt-0.5">{data.totalTribeMembers} miembros ({data.avgMembersPerTribe}/tribu)</p>
                  </div>
                  <div className="bg-gray-950/80 border border-white/5 rounded-xl p-3">
                    <p className="text-gray-400">Telemetría Registrada</p>
                    <p className="text-xl font-extrabold text-white mt-0.5">{data.recordedPageViews}</p>
                    <p className="text-[11px] text-gray-500 mt-0.5">{data.recordedInteractions} interacciones de eventos</p>
                  </div>
                </div>

                <div className="pt-2 border-t border-white/5 text-[11px] text-gray-400 flex justify-between">
                  <span>Reportes pendientes: <strong className="text-amber-300">{data.pendingReports}</strong></span>
                  <span>Reportes resueltos: <strong className="text-emerald-300">{data.resolvedReports}</strong></span>
                </div>
              </div>
            </div>

            {/* Events by Category Distribution */}
            <div className="bg-gray-900 border border-white/10 rounded-2xl p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-5">
                <div>
                  <h2 className="text-lg font-bold text-white">
                    Distribución Real de Eventos por Categoría
                  </h2>
                  <p className="text-xs text-gray-400">
                    Conteo exacto de eventos y asistentes confirmados agrupados por categoría del catálogo actual.
                  </p>
                </div>
                <span className="text-xs font-semibold text-primary">
                  {data.categoryDistribution.length} categorías con eventos
                </span>
              </div>

              {data.categoryDistribution.length === 0 ? (
                <p className="text-sm text-gray-500 py-8 text-center">No hay eventos registrados para calcular categorías.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {data.categoryDistribution.map((cat) => (
                    <div key={cat.category} className="bg-gray-950/60 border border-white/5 rounded-xl p-3.5 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-white">{cat.label}</span>
                        <span className="text-gray-300 font-medium">
                          {cat.eventsCount} evento{cat.eventsCount !== 1 ? 's' : ''} ({cat.percentage}%) · {cat.attendeesCount} asistentes
                        </span>
                      </div>
                      <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-primary to-violet-500 rounded-full"
                          style={{ width: `${Math.max(4, cat.percentage)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Top Events Table (Real Data) */}
            <div className="bg-gray-900 border border-white/10 rounded-2xl overflow-hidden">
              <div className="p-6 border-b border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h2 className="text-lg font-bold text-white">
                    Eventos con Mayor Asistencia Confirmada
                  </h2>
                  <p className="text-xs text-gray-400">
                    Listado directo de eventos reales ordenados por número de participantes confirmados.
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-950/80 text-gray-400 uppercase tracking-wider text-[10px] border-b border-white/10">
                    <tr>
                      <th className="py-3.5 px-4">Evento</th>
                      <th className="py-3.5 px-4">Categoría</th>
                      <th className="py-3.5 px-4">Estado</th>
                      <th className="py-3.5 px-4">Modalidad / Precio</th>
                      <th className="py-3.5 px-4">Organizador</th>
                      <th className="py-3.5 px-4 text-right">Asistentes Confirmados</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {data.topEventsByAttendance.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-10 text-center text-gray-500">
                          No hay eventos disponibles en este momento.
                        </td>
                      </tr>
                    ) : (
                      data.topEventsByAttendance.map((ev) => (
                        <tr key={ev._id} className="hover:bg-white/[0.02] transition-colors">
                          <td className="py-3.5 px-4 font-bold text-white max-w-xs truncate">
                            {ev.title}
                          </td>
                          <td className="py-3.5 px-4 text-gray-300">
                            {ev.category}
                          </td>
                          <td className="py-3.5 px-4">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                              ev.statusLabel === 'En curso'
                                ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                                : ev.statusLabel === 'Próximo'
                                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                                  : 'bg-gray-500/20 text-gray-400 border-gray-500/30'
                            }`}>
                              {ev.statusLabel}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-gray-300 font-medium">
                            {ev.price <= 0 ? (
                              <span className="text-emerald-400 font-semibold">Gratis</span>
                            ) : (
                              <span>{ev.currency} ${ev.price.toLocaleString('es-DO')}</span>
                            )}
                          </td>
                          <td className="py-3.5 px-4">
                            {ev.organizerVerified ? (
                              <span className="inline-flex items-center gap-1 text-emerald-400 font-semibold">
                                <ShieldCheck className="w-3.5 h-3.5" /> Verificado
                              </span>
                            ) : (
                              <span className="text-gray-500">Estándar</span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-right font-extrabold text-white">
                            {ev.attendeesCount}
                            {ev.capacity ? <span className="text-gray-500 font-normal"> / {ev.capacity}</span> : null}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  )
}