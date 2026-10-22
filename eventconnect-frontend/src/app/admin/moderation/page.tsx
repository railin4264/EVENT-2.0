'use client'

import { AdminNav } from '@/components/admin/AdminNav'
import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import {
  ChevronLeft, Shield, AlertTriangle, CheckCircle, XCircle, Eye, Trash2,
  Flag, Search, Clock, User, Calendar, RefreshCw, Building2, ExternalLink,
  Phone, FileCheck, ShieldCheck, ShieldAlert, MapPin, Navigation, Compass,
  Globe, Sparkles, Tag, DollarSign, Check, X, Layers, Map
} from 'lucide-react'
import { apiClient } from '@/lib/api/client'
import toast from 'react-hot-toast'
import { useAuthStore } from '@/stores/authStore'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'

type ActiveSection = 'reports' | 'verifications' | 'pending_events' | 'zones'
type CanonicalReportStatus = 'pending' | 'reviewing' | 'resolved' | 'dismissed'
type RawReportStatus = CanonicalReportStatus | 'in_review' | 'under_review' | 'reviewed' | 'escalated'
type ContentType = 'event' | 'post' | 'comment' | 'user' | 'tribe' | 'message'
type VerificationStatus = 'all' | 'pending' | 'verified' | 'rejected'

interface Report {
  _id: string
  type: ContentType
  category?: string
  contentId?: string
  reason: string
  description?: string
  status: RawReportStatus
  priority?: 'low' | 'medium' | 'high' | 'urgent'
  reporter?: { _id: string; username: string; firstName?: string; lastName?: string }
  reportedBy?: { _id: string; username: string; firstName?: string; lastName?: string }
  reportedUser?: { _id: string; username: string; firstName?: string; lastName?: string }
  reportedEvent?: { _id: string; title: string; description?: string }
  reportedTribe?: { _id: string; name: string; description?: string }
  contentData?: Record<string, any>
  createdAt: string
  reviewedAt?: string
  reviewedBy?: { username: string; firstName?: string; lastName?: string }
  resolution?: string
}

interface OrganizerVerificationItem {
  _id: string
  firstName: string
  lastName: string
  username: string
  email: string
  phone?: string
  avatar?: string
  isOrganizerVerified: boolean
  createdAt: string
  organizerVerification?: {
    status: 'none' | 'pending' | 'verified' | 'rejected'
    organizationName?: string
    documentType: string
    documentNumber: string
    socialProofUrl?: string
    phoneNumber?: string
    notes?: string
    submittedAt?: string
    reviewedAt?: string
    rejectionReason?: string
  }
}

interface PendingEventItem {
  _id: string
  title: string
  description?: string
  category?: string
  date: string
  endDate?: string
  time?: string
  endTime?: string
  location?: {
    address?: string
    city?: string
    venue?: string
    coordinates?: [number, number]
  }
  price?: {
    amount?: number
    currency?: string
    isFree?: boolean
  }
  images?: Array<{ url: string; alt?: string } | string>
  coverImage?: string
  createdBy?: {
    _id: string
    username?: string
    firstName?: string
    lastName?: string
    email?: string
    avatar?: string
  }
  status: string
  createdAt: string
  maxAttendees?: number
  isPrivate?: boolean
}

interface DominicanZone {
  id: string
  name: string
  tagline: string
  region: 'Metropolitana' | 'Cibao / Norte' | 'Este / Punta Cana' | 'Sur'
  coordinates: { lat: number; lng: number }
  radiusKm: number
  landmarks: string[]
  badgeColor: string
}

const DOMINICAN_ZONES: DominicanZone[] = [
  {
    id: 'santo-domingo',
    name: 'Santo Domingo (Distrito Nacional)',
    tagline: 'Polígono Central, Piantini, Bella Vista, Naco y Malecón',
    region: 'Metropolitana',
    coordinates: { lat: 18.4861, lng: -69.9312 },
    radiusKm: 25,
    landmarks: ['Acrópolis Center', 'BlueMall Santo Domingo', 'Malecón de Santo Domingo', 'Parque Iberoamérica'],
    badgeColor: 'border-blue-500/30 bg-blue-500/10 text-blue-300'
  },
  {
    id: 'zona-colonial',
    name: 'Zona Colonial (Patrimonio Cultural)',
    tagline: 'Festivales culturales, arte urbano, música en vivo y gastronomía',
    region: 'Metropolitana',
    coordinates: { lat: 18.4735, lng: -69.8856 },
    radiusKm: 5,
    landmarks: ['Plaza España', 'Calle Las Damas', 'Parque Colón', 'Alcázar de Colón'],
    badgeColor: 'border-amber-500/30 bg-amber-500/10 text-amber-300'
  },
  {
    id: 'santiago',
    name: 'Santiago de los Caballeros (El Cibao)',
    tagline: 'Centro de convenciones, vida nocturna y corazón del Cibao',
    region: 'Cibao / Norte',
    coordinates: { lat: 19.4517, lng: -70.6970 },
    radiusKm: 30,
    landmarks: ['Monumento a los Héroes', 'Los Jardines Metropolitanos', 'Centro León'],
    badgeColor: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
  },
  {
    id: 'punta-cana',
    name: 'Punta Cana / Bávaro / Cap Cana',
    tagline: 'Conciertos internacionales, playa, resorts y turismo de clase mundial',
    region: 'Este / Punta Cana',
    coordinates: { lat: 18.5601, lng: -68.3725 },
    radiusKm: 35,
    landmarks: ['BlueMall Puntacana', 'Downtown Punta Cana', 'Marina Cap Cana', 'Playa Bávaro'],
    badgeColor: 'border-cyan-500/30 bg-cyan-500/10 text-cyan-300'
  },
  {
    id: 'puerto-plata',
    name: 'Puerto Plata (La Novia del Atlántico)',
    tagline: 'Malecón, deportes acuáticos, festivales de playa y aventura',
    region: 'Cibao / Norte',
    coordinates: { lat: 19.7934, lng: -70.6884 },
    radiusKm: 25,
    landmarks: ['Malecón de Puerto Plata', 'Playa Dorada', 'Teleférico', 'Cabarete Kite Beach'],
    badgeColor: 'border-indigo-500/30 bg-indigo-500/10 text-indigo-300'
  },
  {
    id: 'las-terrenas',
    name: 'Las Terrenas / Samaná',
    tagline: 'Ecoturismo, avistamiento, playas vírgenes y gastronomía fusión',
    region: 'Cibao / Norte',
    coordinates: { lat: 19.3210, lng: -69.5428 },
    radiusKm: 20,
    landmarks: ['Pueblo de los Pescadores', 'Playa Bonita', 'Cosón', 'Salto del Limón'],
    badgeColor: 'border-teal-500/30 bg-teal-500/10 text-teal-300'
  },
  {
    id: 'jarabacoa',
    name: 'Jarabacoa / Constanza (Ecoturismo de Montaña)',
    tagline: 'Clima fresco, flores, senderismo, ríos y deportes de montaña',
    region: 'Cibao / Norte',
    coordinates: { lat: 19.1219, lng: -70.6406 },
    radiusKm: 25,
    landmarks: ['Salto de Jimenoa', 'Río Yaque del Norte', 'Valle Nuevo Constanza'],
    badgeColor: 'border-lime-500/30 bg-lime-500/10 text-lime-300'
  },
  {
    id: 'la-romana',
    name: 'La Romana / Casa de Campo / Bayahíbe',
    tagline: 'Altos de Chavón, marina, playas paradisíacas y golf internacional',
    region: 'Este / Punta Cana',
    coordinates: { lat: 18.4273, lng: -68.9728 },
    radiusKm: 25,
    landmarks: ['Altos de Chavón Anfiteatro', 'Marina Casa de Campo', 'Playa Bayahíbe'],
    badgeColor: 'border-rose-500/30 bg-rose-500/10 text-rose-300'
  }
]

function normalizeReportStatus(status?: string): CanonicalReportStatus {
  if (!status) return 'pending'
  if (['reviewing', 'in_review', 'under_review', 'reviewed', 'escalated'].includes(status)) {
    return 'reviewing'
  }
  if (status === 'resolved') return 'resolved'
  if (status === 'dismissed') return 'dismissed'
  return 'pending'
}

const STATUS_COLORS: Record<CanonicalReportStatus, string> = {
  pending: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  reviewing: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  resolved: 'bg-violet-500/20 text-violet-300 border-violet-500/30',
  dismissed: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
}

const STATUS_LABELS: Record<CanonicalReportStatus, string> = {
  pending: 'Pendiente',
  reviewing: 'En revisión',
  resolved: 'Resuelto',
  dismissed: 'Descartado',
}

const TYPE_LABELS: Record<ContentType, string> = {
  event: 'Evento',
  post: 'Publicación',
  comment: 'Comentario',
  user: 'Usuario',
  tribe: 'Tribu',
  message: 'Mensaje',
}

const DOC_TYPE_LABELS: Record<string, string> = {
  cedula: 'Cédula de Identidad (RD)',
  rnc: 'RNC Empresa / Persona Física (DGII)',
  passport: 'Pasaporte',
  business_license: 'Registro Mercantil / Licencia',
  other: 'Otro documento'
}

export default function ModerationPage() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const { user } = useAuthStore()

  const [activeSection, setActiveSection] = useState<ActiveSection>('reports')

  // Reports state
  const [statusFilter, setStatusFilter] = useState<CanonicalReportStatus | 'all'>('all')
  const [typeFilter, setTypeFilter] = useState<ContentType | 'all'>('all')
  const [search, setSearch] = useState('')
  const [selectedReport, setSelectedReport] = useState<Report | null>(null)

  // Verifications state
  const [verifStatusFilter, setVerifStatusFilter] = useState<VerificationStatus>('pending')
  const [verifSearch, setVerifSearch] = useState('')
  const [selectedVerif, setSelectedVerif] = useState<OrganizerVerificationItem | null>(null)
  const [rejectionModalUser, setRejectionModalUser] = useState<OrganizerVerificationItem | null>(null)
  const [rejectionReason, setRejectionReason] = useState('')
  const [reviewingVerifIds, setReviewingVerifIds] = useState<Record<string, boolean>>({})

  // Pending Events state
  const [pendingEventSearch, setPendingEventSearch] = useState('')
  const [selectedPendingEvent, setSelectedPendingEvent] = useState<PendingEventItem | null>(null)
  const [rejectionModalEvent, setRejectionModalEvent] = useState<PendingEventItem | null>(null)
  const [eventRejectionReason, setEventRejectionReason] = useState('')

  // Zones & Geolocation state
  const [selectedZone, setSelectedZone] = useState<DominicanZone | null>(null)
  const [liveGpsCoords, setLiveGpsCoords] = useState<{ lat: number; lng: number; accuracy?: number } | null>(null)
  const [nearestZoneInfo, setNearestZoneInfo] = useState<{ zone: DominicanZone; distanceKm: number } | null>(null)
  const [isReadingGps, setIsReadingGps] = useState(false)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      if (params.get('section') === 'verifications') {
        setActiveSection('verifications')
      } else if (params.get('section') === 'pending_events') {
        setActiveSection('pending_events')
      } else if (params.get('section') === 'zones') {
        setActiveSection('zones')
      }
    }
  }, [])

  // 1. Fetch reports (fetch full list for accurate status counts and client/server filtering)
  const { data: reportsData, isLoading: reportsLoading, refetch: refetchReports } = useQuery({
    queryKey: ['admin-reports', statusFilter, typeFilter],
    queryFn: async () => {
      const params = new URLSearchParams()
      params.set('limit', '100')
      if (typeFilter !== 'all') params.set('type', typeFilter)
      const res = await apiClient.get(`/reports/admin?${params.toString()}`)
      return res.data?.data || res.data
    }
  })

  // 2. Fetch organizer verifications
  const { data: verifsData, isLoading: verifsLoading, refetch: refetchVerifs } = useQuery({
    queryKey: ['admin-organizer-verifications', verifStatusFilter],
    queryFn: async () => {
      const res = await apiClient.get(`/reports/organizer-verifications?status=${verifStatusFilter}`)
      return res.data?.data || []
    }
  })

  // 3. Fetch pending events for approval
  const { data: pendingEventsData, isLoading: pendingEventsLoading, refetch: refetchPendingEvents } = useQuery({
    queryKey: ['admin-pending-events'],
    queryFn: async () => {
      const res = await apiClient.get('/events/admin/pending')
      return res.data?.events || res.data?.data || []
    }
  })

  // Approve event mutation
  const approveEventMutation = useMutation({
    mutationFn: async (eventId: string) => {
      const res = await apiClient.post(`/events/${eventId}/approve`)
      return res.data
    },
    onSuccess: () => {
      toast.success('🎉 ¡Evento aprobado y publicado exitosamente en EventNow!')
      queryClient.invalidateQueries({ queryKey: ['admin-pending-events'] })
      queryClient.invalidateQueries({ queryKey: ['admin-overview-priorities'] })
      queryClient.invalidateQueries({ queryKey: ['events'] })
      refetchPendingEvents()
      setSelectedPendingEvent(null)
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Error al aprobar el evento')
    }
  })

  // Reject event mutation
  const rejectEventMutation = useMutation({
    mutationFn: async ({ eventId, reason }: { eventId: string; reason?: string }) => {
      const res = await apiClient.post(`/events/${eventId}/reject`, { reason })
      return res.data
    },
    onSuccess: () => {
      toast.success('Evento rechazado y retirado de la cola de moderación')
      queryClient.invalidateQueries({ queryKey: ['admin-pending-events'] })
      queryClient.invalidateQueries({ queryKey: ['admin-overview-priorities'] })
      refetchPendingEvents()
      setSelectedPendingEvent(null)
      setRejectionModalEvent(null)
      setEventRejectionReason('')
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Error al rechazar el evento')
    }
  })

  const handleReadRealGps = () => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      toast.error('Tu navegador no soporta lectura de geolocalización')
      return
    }
    setIsReadingGps(true)
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude
        const lng = position.coords.longitude
        const accuracy = position.coords.accuracy
        setLiveGpsCoords({ lat, lng, accuracy })
        setIsReadingGps(false)

        let closest: DominicanZone = DOMINICAN_ZONES[0]
        let minDistance = Infinity

        DOMINICAN_ZONES.forEach(zone => {
          const R = 6371
          const dLat = (zone.coordinates.lat - lat) * (Math.PI / 180)
          const dLon = (zone.coordinates.lng - lng) * (Math.PI / 180)
          const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat * (Math.PI / 180)) * Math.cos(zone.coordinates.lat * (Math.PI / 180)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2)
          const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
          const d = R * c
          if (d < minDistance) {
            minDistance = d
            closest = zone
          }
        })

        setNearestZoneInfo({ zone: closest, distanceKm: Math.round(minDistance * 10) / 10 })
        toast.success(`📍 GPS detectado: a ${Math.round(minDistance * 10) / 10} km de ${closest.name}`)
      },
      (error) => {
        setIsReadingGps(false)
        toast.error(`Error al leer GPS: ${error.message}`)
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    )
  }

  // Mutations for reports — handles `reviewing` / `in_review` / `under_review` compatibility with backend
  const updateReportMutation = useMutation({
    mutationFn: async ({ id, status, action }: { id: string; status: CanonicalReportStatus | 'in_review'; action?: string }) => {
      const targetStatus = status === 'in_review' ? 'reviewing' : status
      try {
        const res = await apiClient.put(`/reports/${id}/status`, {
          status: targetStatus,
          actionTaken: action,
          action
        })
        return res.data
      } catch (err: any) {
        if ((targetStatus === 'reviewing' || status === 'in_review') && err?.response?.status === 400) {
          try {
            const retryInReview = await apiClient.put(`/reports/${id}/status`, {
              status: 'in_review',
              actionTaken: action,
              action
            })
            return retryInReview.data
          } catch {
            const retryUnderReview = await apiClient.put(`/reports/${id}/status`, {
              status: 'under_review',
              actionTaken: action,
              action
            })
            return retryUnderReview.data
          }
        }
        throw err
      }
    },
    onSuccess: (resData, vars) => {
      const canonical = normalizeReportStatus(vars.status)
      toast.success(`Reporte marcado como "${STATUS_LABELS[canonical].toLowerCase()}"`)
      queryClient.invalidateQueries({ queryKey: ['admin-reports'] })
      queryClient.invalidateQueries({ queryKey: ['admin-overview-priorities'] })
      refetchReports()
      if (selectedReport && selectedReport._id === vars.id) {
        setSelectedReport({
          ...selectedReport,
          status: resData?.report?.status || vars.status
        })
      }
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Error al actualizar el estado del reporte')
    },
  })

  const deleteContentMutation = useMutation({
    mutationFn: async ({ contentType, contentId, reportId }: { contentType: ContentType; contentId: string; reportId: string }) => {
      if (contentId) {
        await apiClient.delete(`/${contentType}s/${contentId}`)
      }
      await apiClient.put(`/reports/${reportId}/status`, {
        status: 'resolved',
        actionTaken: 'content_removed',
        action: 'content_removed'
      })
    },
    onSuccess: () => {
      toast.success('Contenido eliminado y reporte resuelto')
      queryClient.invalidateQueries({ queryKey: ['admin-reports'] })
      queryClient.invalidateQueries({ queryKey: ['admin-overview-priorities'] })
      refetchReports()
      setSelectedReport(null)
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Error al eliminar el contenido reportado')
    },
  })

  // Mutation for organizer verification approval/rejection
  const reviewOrganizerMutation = useMutation({
    mutationFn: async ({ userId, action, reason }: { userId: string; action: 'approve' | 'reject'; reason?: string }) => {
      const res = await apiClient.put(`/reports/organizer-verifications/${userId}`, { action, reason })
      return res.data
    },
    onSuccess: (_, vars) => {
      if (vars.action === 'approve') {
        toast.success('🛡️ ¡Organizador aprobado y verificado exitosamente!')
      } else {
        toast.success('Solicitud de organizador descartada / rechazada')
      }
      queryClient.invalidateQueries({ queryKey: ['admin-organizer-verifications'] })
      queryClient.invalidateQueries({ queryKey: ['admin-overview-priorities'] })
      refetchVerifs()
      setSelectedVerif(null)
      setRejectionModalUser(null)
      setRejectionReason('')
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Error al procesar la verificación')
    }
  })

  const handleMarkVerifReviewing = (item: OrganizerVerificationItem) => {
    setReviewingVerifIds(prev => ({ ...prev, [item._id]: true }))
    setSelectedVerif(item)
    toast.success(`Solicitud de ${item.firstName} ${item.lastName} marcada en revisión`)
  }

  const allReports: Report[] = Array.isArray(reportsData?.reports)
    ? reportsData.reports
    : Array.isArray(reportsData)
      ? reportsData
      : []

  const reportCounts = {
    all: allReports.length,
    pending: allReports.filter(r => normalizeReportStatus(r.status) === 'pending').length,
    reviewing: allReports.filter(r => normalizeReportStatus(r.status) === 'reviewing').length,
    resolved: allReports.filter(r => normalizeReportStatus(r.status) === 'resolved').length,
    dismissed: allReports.filter(r => normalizeReportStatus(r.status) === 'dismissed').length,
  }

  const filteredReports = allReports.filter(r => {
    const normStatus = normalizeReportStatus(r.status)
    if (statusFilter !== 'all' && normStatus !== statusFilter) return false
    if (typeFilter !== 'all' && r.type !== typeFilter) return false
    if (!search.trim()) return true
    const q = search.toLowerCase()
    const reporterUsername = r.reporter?.username || r.reportedBy?.username || ''
    const targetName = r.reportedEvent?.title || r.reportedUser?.username || r.reportedTribe?.name || ''
    return (
      r.reason?.toLowerCase().includes(q) ||
      r.description?.toLowerCase().includes(q) ||
      reporterUsername.toLowerCase().includes(q) ||
      targetName.toLowerCase().includes(q) ||
      r.type?.toLowerCase().includes(q)
    )
  })

  const verifications: OrganizerVerificationItem[] = Array.isArray(verifsData) ? verifsData : []
  const filteredVerifications = verifications.filter(v => {
    if (!verifSearch.trim()) return true
    const q = verifSearch.toLowerCase()
    return (
      v.firstName?.toLowerCase().includes(q) ||
      v.lastName?.toLowerCase().includes(q) ||
      v.username?.toLowerCase().includes(q) ||
      v.email?.toLowerCase().includes(q) ||
      v.organizerVerification?.organizationName?.toLowerCase().includes(q) ||
      v.organizerVerification?.documentNumber?.toLowerCase().includes(q)
    )
  })

  const verifCounts = {
    all: verifications.length,
    pending: verifications.filter(v => v.organizerVerification?.status === 'pending').length,
    verified: verifications.filter(v => v.organizerVerification?.status === 'verified').length,
    rejected: verifications.filter(v => v.organizerVerification?.status === 'rejected').length,
  }

  const pendingEvents: PendingEventItem[] = Array.isArray(pendingEventsData) ? pendingEventsData : []
  const filteredPendingEvents = pendingEvents.filter(e => {
    if (!pendingEventSearch.trim()) return true
    const q = pendingEventSearch.toLowerCase()
    return (
      e.title?.toLowerCase().includes(q) ||
      e.category?.toLowerCase().includes(q) ||
      e.location?.city?.toLowerCase().includes(q) ||
      e.location?.venue?.toLowerCase().includes(q) ||
      e.location?.address?.toLowerCase().includes(q) ||
      e.createdBy?.username?.toLowerCase().includes(q) ||
      e.createdBy?.email?.toLowerCase().includes(q)
    )
  })

  const getReporterUsername = (report: Report) =>
    report.reporter?.username || report.reportedBy?.username || 'usuario'

  const getTargetLabel = (report: Report) => {
    if (report.reportedEvent?.title) return `Evento: ${report.reportedEvent.title}`
    if (report.reportedUser?.username) return `Usuario: @${report.reportedUser.username}`
    if (report.reportedTribe?.name) return `Tribu: ${report.reportedTribe.name}`
    if (report.contentId) return `ID: ${report.contentId}`
    return TYPE_LABELS[report.type] || 'Elemento reportado'
  }

  const getTargetContentId = (report: Report) =>
    report.contentId ||
    report.reportedEvent?._id ||
    report.reportedUser?._id ||
    report.reportedTribe?._id ||
    ''

  const handleRefreshActiveSection = () => {
    if (activeSection === 'reports') refetchReports()
    else if (activeSection === 'verifications') refetchVerifs()
    else if (activeSection === 'pending_events') refetchPendingEvents()
  }

  return (
    <div className="min-h-screen bg-gray-950 text-foreground">
      <AdminNav />
      {/* Header */}
      <div className="sticky top-0 z-40 bg-gray-950/95 backdrop-blur border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button onClick={() => router.back()} className="text-gray-400 hover:text-white transition-colors">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <Shield className="w-6 h-6 text-red-400 flex-shrink-0" />
            <h1 className="text-white font-bold text-lg sm:text-xl">Centro de Moderación y Confianza</h1>
          </div>
          <button
            onClick={handleRefreshActiveSection}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white border border-white/10 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            <span className="text-xs sm:text-sm font-medium">Actualizar</span>
          </button>
        </div>

        {/* Top Navigation Tabs */}
        <div className="max-w-7xl mx-auto px-4 flex gap-4 sm:gap-6 border-t border-white/5 pt-2 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveSection('reports')}
            className={`pb-3 text-xs sm:text-sm font-semibold whitespace-nowrap transition-all border-b-2 flex items-center gap-2 ${
              activeSection === 'reports'
                ? 'border-red-500 text-white'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <Flag className="w-4 h-4 text-red-400" />
            Denuncias y Reportes
            {reportCounts.pending > 0 && (
              <span className="px-2 py-0.5 rounded-full text-xs bg-red-500/20 text-red-300 font-bold">
                {reportCounts.pending}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveSection('verifications')}
            className={`pb-3 text-xs sm:text-sm font-semibold whitespace-nowrap transition-all border-b-2 flex items-center gap-2 ${
              activeSection === 'verifications'
                ? 'border-emerald-500 text-white'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            Verificaciones Anti-Fraude RD
            {verifCounts.pending > 0 && (
              <span className="px-2 py-0.5 rounded-full text-xs bg-emerald-500/20 text-emerald-300 font-bold">
                {verifCounts.pending}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveSection('pending_events')}
            className={`pb-3 text-xs sm:text-sm font-semibold whitespace-nowrap transition-all border-b-2 flex items-center gap-2 ${
              activeSection === 'pending_events'
                ? 'border-purple-500 text-white'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <Calendar className="w-4 h-4 text-purple-400" />
            Aprobación de Eventos RD
            {pendingEvents.length > 0 && (
              <span className="px-2 py-0.5 rounded-full text-xs bg-purple-500/20 text-purple-300 font-bold">
                {pendingEvents.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveSection('zones')}
            className={`pb-3 text-xs sm:text-sm font-semibold whitespace-nowrap transition-all border-b-2 flex items-center gap-2 ${
              activeSection === 'zones'
                ? 'border-cyan-500 text-white'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <Map className="w-4 h-4 text-cyan-400" />
            Zonas y Cobertura RD
          </button>
        </div>
      </div>

      {/* SECTION 1: REPORTS */}
      {activeSection === 'reports' && (
        <div className="max-w-7xl mx-auto px-4 py-6">
          {/* Status filter tabs: all, pending, reviewing, resolved, dismissed */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
            {(['all', 'pending', 'reviewing', 'resolved', 'dismissed'] as const).map(s => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`rounded-xl p-3 border text-center transition-all ${
                  statusFilter === s
                    ? 'bg-white/10 border-white/25 shadow-md'
                    : 'bg-gray-900 border-white/5 hover:border-white/10'
                }`}
              >
                <div className="text-2xl font-bold text-white">{reportCounts[s]}</div>
                <div className="text-xs text-gray-400 mt-1 font-medium">
                  {s === 'all' ? 'Todos' : STATUS_LABELS[s]}
                </div>
              </button>
            ))}
          </div>

          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Buscar reportes por motivo, usuario o elemento..."
                className="w-full bg-gray-900 border border-white/10 text-white rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:border-white/20"
              />
            </div>
            <select
              value={typeFilter}
              onChange={e => setTypeFilter(e.target.value as any)}
              className="bg-gray-900 border border-white/10 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-white/20"
            >
              <option value="all">Todos los tipos</option>
              {(Object.keys(TYPE_LABELS) as ContentType[]).map(t => (
                <option key={t} value={t}>{TYPE_LABELS[t]}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Reports list (responsive cards with inline action buttons) */}
            <div className="lg:col-span-2 space-y-3">
              {reportsLoading ? (
                [...Array(4)].map((_, i) => (
                  <div key={i} className="h-32 bg-gray-800 rounded-xl animate-pulse" />
                ))
              ) : filteredReports.length === 0 ? (
                <div className="text-center py-16 text-gray-500 bg-gray-900/40 rounded-2xl border border-white/5">
                  <Flag className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p className="text-gray-300 font-semibold">No hay reportes que coincidan con el filtro</p>
                  <p className="text-xs text-gray-500 mt-1">Prueba cambiando el estado o criterio de búsqueda.</p>
                </div>
              ) : (
                filteredReports.map(report => {
                  const canonicalStatus = normalizeReportStatus(report.status)
                  const isSelected = selectedReport?._id === report._id

                  return (
                    <div
                      key={report._id}
                      onClick={() => setSelectedReport(report)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') setSelectedReport(report) }}
                      className={`w-full text-left bg-gray-900 border rounded-2xl p-4 transition-all hover:border-white/20 cursor-pointer ${
                        isSelected ? 'border-violet-500/60 bg-violet-950/10' : 'border-white/5'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                            <span className="text-xs font-medium bg-white/10 text-gray-200 px-2.5 py-0.5 rounded-full">
                              {TYPE_LABELS[report.type] || report.type}
                            </span>
                            <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${STATUS_COLORS[canonicalStatus]}`}>
                              {STATUS_LABELS[canonicalStatus]}
                            </span>
                            <span className="text-xs text-gray-400 truncate">
                              {getTargetLabel(report)}
                            </span>
                          </div>

                          <p className="text-white font-semibold text-sm">{report.reason}</p>
                          {report.description && (
                            <p className="text-gray-400 text-xs mt-1 line-clamp-2">{report.description}</p>
                          )}

                          <div className="flex flex-wrap items-center gap-3 mt-2.5 text-xs text-gray-500">
                            <span className="flex items-center gap-1">
                              <User className="w-3 h-3" />
                              @{getReporterUsername(report)}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {formatDistanceToNow(new Date(report.createdAt), { addSuffix: true, locale: es })}
                            </span>
                          </div>
                        </div>
                        <AlertTriangle className={`w-5 h-5 flex-shrink-0 ${canonicalStatus === 'pending' ? 'text-amber-400' : 'text-gray-600'}`} />
                      </div>

                      {/* Quick Action Buttons on Card (Mobile & Desktop) */}
                      <div
                        className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-white/5"
                        onClick={e => e.stopPropagation()}
                      >
                        <button
                          type="button"
                          onClick={() => updateReportMutation.mutate({ id: report._id, status: 'reviewing' })}
                          disabled={updateReportMutation.isPending || canonicalStatus === 'reviewing'}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600/20 hover:bg-blue-600/35 text-blue-300 border border-blue-500/30 text-xs font-semibold transition-colors disabled:opacity-40"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          En revisión
                        </button>
                        <button
                          type="button"
                          onClick={() => updateReportMutation.mutate({ id: report._id, status: 'resolved' })}
                          disabled={updateReportMutation.isPending || canonicalStatus === 'resolved'}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-600/20 hover:bg-violet-600/35 text-violet-300 border border-violet-500/30 text-xs font-semibold transition-colors disabled:opacity-40"
                        >
                          <CheckCircle className="w-3.5 h-3.5" />
                          Resolver
                        </button>
                        <button
                          type="button"
                          onClick={() => updateReportMutation.mutate({ id: report._id, status: 'dismissed' })}
                          disabled={updateReportMutation.isPending || canonicalStatus === 'dismissed'}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-700/40 hover:bg-gray-700/70 text-gray-300 border border-white/10 text-xs font-semibold transition-colors disabled:opacity-40"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          Descartar
                        </button>
                      </div>
                    </div>
                  )
                })
              )}
            </div>

            {/* Detail panel */}
            <div className="lg:col-span-1">
              {selectedReport ? (
                <div className="bg-gray-900 border border-white/10 rounded-2xl p-5 sticky top-28 space-y-4">
                  <h3 className="text-white font-semibold flex items-center gap-2">
                    <Eye className="w-4 h-4 text-blue-400" /> Detalle del reporte
                  </h3>

                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between gap-2">
                      <span className="text-gray-400">Tipo</span>
                      <span className="text-white font-medium">{TYPE_LABELS[selectedReport.type] || selectedReport.type}</span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span className="text-gray-400">Elemento</span>
                      <span className="text-white text-right truncate max-w-[180px]">{getTargetLabel(selectedReport)}</span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span className="text-gray-400">Estado</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs border ${STATUS_COLORS[normalizeReportStatus(selectedReport.status)]}`}>
                        {STATUS_LABELS[normalizeReportStatus(selectedReport.status)]}
                      </span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span className="text-gray-400">Reportado por</span>
                      <span className="text-white">@{getReporterUsername(selectedReport)}</span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span className="text-gray-400">Fecha</span>
                      <span className="text-white">{new Date(selectedReport.createdAt).toLocaleDateString('es-DO')}</span>
                    </div>
                  </div>

                  <div className="bg-gray-800/80 rounded-xl p-3 border border-white/5">
                    <p className="text-gray-400 text-xs mb-1">Motivo</p>
                    <p className="text-white text-sm font-medium">{selectedReport.reason}</p>
                    {selectedReport.description && (
                      <p className="text-gray-300 text-xs mt-2 leading-relaxed">{selectedReport.description}</p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="space-y-2 pt-2">
                    <button
                      type="button"
                      onClick={() => updateReportMutation.mutate({ id: selectedReport._id, status: 'reviewing' })}
                      disabled={updateReportMutation.isPending || normalizeReportStatus(selectedReport.status) === 'reviewing'}
                      className="w-full flex items-center justify-center gap-2 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl text-sm transition-colors disabled:opacity-50"
                    >
                      <Eye className="w-4 h-4" /> En revisión
                    </button>

                    <button
                      type="button"
                      onClick={() => updateReportMutation.mutate({ id: selectedReport._id, status: 'resolved' })}
                      disabled={updateReportMutation.isPending || normalizeReportStatus(selectedReport.status) === 'resolved'}
                      className="w-full flex items-center justify-center gap-2 py-2.5 bg-violet-600 hover:bg-violet-500 text-white font-semibold rounded-xl text-sm transition-colors disabled:opacity-50"
                    >
                      <CheckCircle className="w-4 h-4" /> Resolver
                    </button>

                    <button
                      type="button"
                      onClick={() => updateReportMutation.mutate({ id: selectedReport._id, status: 'dismissed' })}
                      disabled={updateReportMutation.isPending || normalizeReportStatus(selectedReport.status) === 'dismissed'}
                      className="w-full flex items-center justify-center gap-2 py-2.5 bg-gray-700 hover:bg-gray-600 text-white font-semibold rounded-xl text-sm transition-colors disabled:opacity-50"
                    >
                      <XCircle className="w-4 h-4" /> Descartar
                    </button>

                    {getTargetContentId(selectedReport) && (
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm('¿Eliminar este contenido permanentemente y resolver el reporte?')) {
                            deleteContentMutation.mutate({
                              contentType: selectedReport.type,
                              contentId: getTargetContentId(selectedReport),
                              reportId: selectedReport._id,
                            })
                          }
                        }}
                        disabled={deleteContentMutation.isPending}
                        className="w-full flex items-center justify-center gap-2 py-2.5 bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-500/30 font-semibold rounded-xl text-sm transition-colors disabled:opacity-50"
                      >
                        <Trash2 className="w-4 h-4" /> Eliminar contenido
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="bg-gray-900 border border-white/5 rounded-2xl p-8 text-center">
                  <Shield className="w-12 h-12 text-gray-700 mx-auto mb-3" />
                  <p className="text-gray-400 text-sm font-medium">Selecciona un reporte</p>
                  <p className="text-gray-500 text-xs mt-1">Inspecciona los detalles o usa las acciones rápidas en cada tarjeta.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* SECTION 2: ORGANIZER VERIFICATIONS (ANTI-FRAUD) */}
      {activeSection === 'verifications' && (
        <div className="max-w-7xl mx-auto px-4 py-6">
          {/* Informational banner about Dominican Republic Anti-Fraud Trust Model */}
          <div className="mb-6 p-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 flex items-start gap-3">
            <ShieldCheck className="w-6 h-6 text-emerald-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <h2 className="text-emerald-200 font-bold">Verificación Oficial de Organizadores (RD)</h2>
              <p className="text-emerald-300/80 text-xs mt-1 leading-relaxed">
                Para proteger al público dominicano contra estafas o eventos ficticios, cada organizador verificado acredita su identidad con Cédula, RNC o Pasaporte. Al aprobar una solicitud, sus eventos mostrarán automáticamente la insignia <strong>🛡️ Organizador Verificado</strong>.
              </p>
            </div>
          </div>

          {/* Verification Status Stats Tabs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            {(['pending', 'verified', 'rejected', 'all'] as const).map(s => {
              const labelMap: Record<string, string> = {
                pending: 'Pendientes',
                verified: 'Aprobados',
                rejected: 'Descartados / Rechazados',
                all: 'Todos'
              }
              const countMap: Record<string, number> = {
                pending: verifCounts.pending,
                verified: verifCounts.verified,
                rejected: verifCounts.rejected,
                all: verifCounts.all
              }
              return (
                <button
                  key={s}
                  onClick={() => setVerifStatusFilter(s)}
                  className={`rounded-xl p-3 border text-center transition-all ${
                    verifStatusFilter === s
                      ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-200'
                      : 'bg-gray-900 border-white/5 hover:border-white/10 text-gray-400'
                  }`}
                >
                  <div className="text-2xl font-bold text-white">{countMap[s]}</div>
                  <div className="text-xs mt-1 font-medium">{labelMap[s]}</div>
                </button>
              )
            })}
          </div>

          {/* Search bar */}
          <div className="mb-6 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              value={verifSearch}
              onChange={e => setVerifSearch(e.target.value)}
              placeholder="Buscar por nombre, usuario, RNC, cédula o empresa..."
              className="w-full bg-gray-900 border border-white/10 text-white rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:border-emerald-500/50"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Verification list */}
            <div className="lg:col-span-2 space-y-3">
              {verifsLoading ? (
                [...Array(4)].map((_, i) => (
                  <div key={i} className="h-32 bg-gray-800 rounded-xl animate-pulse" />
                ))
              ) : filteredVerifications.length === 0 ? (
                <div className="text-center py-16 text-gray-500 bg-gray-900/50 rounded-2xl border border-white/5">
                  <ShieldAlert className="w-12 h-12 mx-auto mb-3 opacity-30 text-emerald-400" />
                  <p className="text-base font-semibold text-gray-300">No hay solicitudes de verificación</p>
                  <p className="text-xs text-gray-500 mt-1">Las nuevas solicitudes aparecerán aquí para tu revisión.</p>
                </div>
              ) : (
                filteredVerifications.map(item => {
                  const v = item.organizerVerification || {} as any
                  const isPending = v.status === 'pending'
                  const isVerified = v.status === 'verified'
                  const isRejected = v.status === 'rejected'
                  const isUnderReview = Boolean(reviewingVerifIds[item._id]) && isPending

                  return (
                    <div
                      key={item._id}
                      onClick={() => setSelectedVerif(item)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') setSelectedVerif(item) }}
                      className={`w-full text-left bg-gray-900 border rounded-2xl p-4 transition-all hover:border-emerald-500/30 cursor-pointer ${
                        selectedVerif?._id === item._id ? 'border-emerald-500 bg-emerald-950/20' : 'border-white/5'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className="font-bold text-white text-base">
                              {item.firstName} {item.lastName}
                            </span>
                            <span className="text-xs text-primary font-medium">@{item.username}</span>
                            {isVerified && (
                              <span className="px-2 py-0.5 rounded-full text-xs bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1 font-semibold">
                                <ShieldCheck className="w-3 h-3" /> Verificado
                              </span>
                            )}
                            {isUnderReview && (
                              <span className="px-2 py-0.5 rounded-full text-xs bg-blue-500/20 text-blue-300 border border-blue-500/30 font-semibold">
                                🔎 En revisión
                              </span>
                            )}
                            {isPending && !isUnderReview && (
                              <span className="px-2 py-0.5 rounded-full text-xs bg-amber-500/20 text-amber-300 border border-amber-500/30 font-semibold">
                                ⏳ Pendiente
                              </span>
                            )}
                            {isRejected && (
                              <span className="px-2 py-0.5 rounded-full text-xs bg-red-500/20 text-red-300 border border-red-500/30 font-semibold">
                                ❌ Descartado
                              </span>
                            )}
                          </div>

                          {v.organizationName && (
                            <p className="text-xs font-semibold text-emerald-400 flex items-center gap-1 mt-0.5">
                              <Building2 className="w-3.5 h-3.5" />
                              {v.organizationName}
                            </p>
                          )}

                          <div className="mt-2 text-xs text-gray-400 space-y-1">
                            <p>
                              <strong className="text-gray-300">Doc:</strong> {DOC_TYPE_LABELS[v.documentType] || v.documentType} ({v.documentNumber})
                            </p>
                            {v.phoneNumber && (
                              <p className="flex items-center gap-1">
                                <Phone className="w-3 h-3" />
                                {v.phoneNumber}
                              </p>
                            )}
                            {v.rejectionReason && (
                              <p className="text-red-400 bg-red-950/30 border border-red-500/20 rounded px-2 py-1 mt-1">
                                <strong>Motivo de rechazo:</strong> {v.rejectionReason}
                              </p>
                            )}
                          </div>

                          <div className="flex items-center gap-3 mt-3 text-xs text-gray-500">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {v.submittedAt ? `Enviado ${formatDistanceToNow(new Date(v.submittedAt), { addSuffix: true, locale: es })}` : 'Fecha no registrada'}
                            </span>
                          </div>
                        </div>

                        <ShieldCheck className={`w-5 h-5 flex-shrink-0 ${isVerified ? 'text-emerald-400' : 'text-gray-600'}`} />
                      </div>

                      {/* Quick Action Buttons on Verification Card */}
                      <div
                        className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-white/5"
                        onClick={e => e.stopPropagation()}
                      >
                        <button
                          type="button"
                          onClick={() => reviewOrganizerMutation.mutate({ userId: item._id, action: 'approve' })}
                          disabled={reviewOrganizerMutation.isPending || isVerified}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600/25 hover:bg-emerald-600/40 text-emerald-300 border border-emerald-500/30 text-xs font-semibold transition-colors disabled:opacity-40"
                        >
                          <ShieldCheck className="w-3.5 h-3.5" />
                          Aprobar
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMarkVerifReviewing(item)}
                          disabled={reviewOrganizerMutation.isPending || isVerified}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600/20 hover:bg-blue-600/35 text-blue-300 border border-blue-500/30 text-xs font-semibold transition-colors disabled:opacity-40"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          En revisión
                        </button>
                        <button
                          type="button"
                          onClick={() => setRejectionModalUser(item)}
                          disabled={reviewOrganizerMutation.isPending}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600/20 hover:bg-red-600/35 text-red-300 border border-red-500/30 text-xs font-semibold transition-colors disabled:opacity-40"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          Descartar
                        </button>
                      </div>
                    </div>
                  )
                })
              )}
            </div>

            {/* Verification Detail & Actions */}
            <div className="lg:col-span-1">
              {selectedVerif ? (
                <div className="bg-gray-900 border border-white/10 rounded-2xl p-5 sticky top-28 space-y-4 shadow-xl">
                  <div className="flex items-center justify-between pb-3 border-b border-white/10">
                    <h3 className="text-white font-bold flex items-center gap-2">
                      <FileCheck className="w-5 h-5 text-emerald-400" />
                      Detalle de Solicitud
                    </h3>
                    <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${
                      selectedVerif.organizerVerification?.status === 'verified'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : selectedVerif.organizerVerification?.status === 'rejected'
                          ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                          : reviewingVerifIds[selectedVerif._id]
                            ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                            : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    }`}>
                      {selectedVerif.organizerVerification?.status === 'verified'
                        ? 'Verificado'
                        : selectedVerif.organizerVerification?.status === 'rejected'
                          ? 'Descartado'
                          : reviewingVerifIds[selectedVerif._id]
                            ? 'En revisión'
                            : 'Pendiente'}
                    </span>
                  </div>

                  <div className="space-y-3 text-xs">
                    <div>
                      <p className="text-gray-400 font-medium">Solicitante</p>
                      <p className="text-white font-semibold text-sm">
                        {selectedVerif.firstName} {selectedVerif.lastName} (@{selectedVerif.username})
                      </p>
                      <p className="text-gray-400 mt-0.5">{selectedVerif.email}</p>
                    </div>

                    {selectedVerif.organizerVerification?.organizationName && (
                      <div className="bg-white/5 p-3 rounded-xl border border-white/10">
                        <p className="text-gray-400 font-medium">Nombre de la Organización</p>
                        <p className="text-white font-bold text-sm mt-0.5">
                          {selectedVerif.organizerVerification.organizationName}
                        </p>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-white/5 p-3 rounded-xl border border-white/10">
                        <p className="text-gray-400 font-medium">Tipo de Documento</p>
                        <p className="text-white font-semibold mt-0.5">
                          {DOC_TYPE_LABELS[selectedVerif.organizerVerification?.documentType || ''] || selectedVerif.organizerVerification?.documentType || 'N/A'}
                        </p>
                      </div>
                      <div className="bg-white/5 p-3 rounded-xl border border-white/10">
                        <p className="text-gray-400 font-medium">Número</p>
                        <p className="text-white font-mono font-bold mt-0.5">
                          {selectedVerif.organizerVerification?.documentNumber || 'N/A'}
                        </p>
                      </div>
                    </div>

                    {selectedVerif.organizerVerification?.phoneNumber && (
                      <div className="bg-white/5 p-3 rounded-xl border border-white/10 flex items-center justify-between">
                        <div>
                          <p className="text-gray-400 font-medium">Teléfono / WhatsApp</p>
                          <p className="text-white font-semibold mt-0.5">{selectedVerif.organizerVerification.phoneNumber}</p>
                        </div>
                        <a
                          href={`https://wa.me/${selectedVerif.organizerVerification.phoneNumber.replace(/[^0-9]/g, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2.5 py-1 rounded-lg bg-emerald-600/30 text-emerald-300 hover:bg-emerald-600/50 flex items-center gap-1 font-semibold text-xs"
                        >
                          WhatsApp <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    )}

                    {selectedVerif.organizerVerification?.socialProofUrl && (
                      <div className="bg-white/5 p-3 rounded-xl border border-white/10">
                        <p className="text-gray-400 font-medium">Enlace Social / Web</p>
                        <a
                          href={selectedVerif.organizerVerification.socialProofUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline font-semibold mt-1 flex items-center gap-1.5 break-all"
                        >
                          {selectedVerif.organizerVerification.socialProofUrl}
                          <ExternalLink className="w-3 h-3 flex-shrink-0" />
                        </a>
                      </div>
                    )}

                    {selectedVerif.organizerVerification?.notes && (
                      <div className="bg-white/5 p-3 rounded-xl border border-white/10">
                        <p className="text-gray-400 font-medium">Notas / Justificación</p>
                        <p className="text-gray-200 mt-1 leading-relaxed whitespace-pre-wrap">
                          {selectedVerif.organizerVerification.notes}
                        </p>
                      </div>
                    )}

                    {selectedVerif.organizerVerification?.rejectionReason && (
                      <div className="bg-red-950/40 border border-red-500/30 p-3 rounded-xl">
                        <p className="text-red-300 font-bold">Razón del Rechazo Anterior</p>
                        <p className="text-red-200 mt-1">{selectedVerif.organizerVerification.rejectionReason}</p>
                      </div>
                    )}
                  </div>

                  {/* Actions for Verification */}
                  <div className="space-y-2 pt-2 border-t border-white/10">
                    <button
                      type="button"
                      onClick={() => reviewOrganizerMutation.mutate({ userId: selectedVerif._id, action: 'approve' })}
                      disabled={reviewOrganizerMutation.isPending || selectedVerif.organizerVerification?.status === 'verified'}
                      className="w-full flex items-center justify-center gap-2 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-sm transition-all shadow-lg shadow-emerald-900/30 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ShieldCheck className="w-4 h-4" />
                      {selectedVerif.organizerVerification?.status === 'verified'
                        ? 'Organizador Ya Verificado'
                        : 'Aprobar y Otorgar Insignia 🛡️'}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleMarkVerifReviewing(selectedVerif)}
                      disabled={reviewOrganizerMutation.isPending || selectedVerif.organizerVerification?.status === 'verified'}
                      className="w-full flex items-center justify-center gap-2 py-2.5 bg-blue-600/80 hover:bg-blue-600 text-white font-semibold rounded-xl text-sm transition-all disabled:opacity-50"
                    >
                      <Eye className="w-4 h-4" />
                      Marcar En Revisión
                    </button>

                    <button
                      type="button"
                      onClick={() => setRejectionModalUser(selectedVerif)}
                      disabled={reviewOrganizerMutation.isPending}
                      className="w-full flex items-center justify-center gap-2 py-2.5 bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-500/30 font-semibold rounded-xl text-sm transition-all disabled:opacity-50"
                    >
                      <XCircle className="w-4 h-4" />
                      Descartar / Rechazar Solicitud
                    </button>
                  </div>
                </div>
              ) : (
                <div className="bg-gray-900 border border-white/5 rounded-2xl p-8 text-center">
                  <ShieldCheck className="w-12 h-12 text-gray-700 mx-auto mb-3" />
                  <p className="text-gray-400 font-medium">Selecciona una solicitud</p>
                  <p className="text-gray-600 text-xs mt-1">Podrás inspeccionar su RNC, cédula, teléfono y redes para validar antes de aprobar.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* SECTION 3: PENDING EVENTS APPROVAL */}
      {activeSection === 'pending_events' && (
        <div className="max-w-7xl mx-auto px-4 py-6">
          {/* Informational banner about Quality Control & Event Moderation */}
          <div className="mb-6 p-4 rounded-2xl bg-purple-950/40 border border-purple-500/30 flex items-start gap-3">
            <Calendar className="w-6 h-6 text-purple-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <h2 className="text-purple-200 font-bold">Control de Calidad y Curaduría de Eventos RD</h2>
              <p className="text-purple-300/80 text-xs mt-1 leading-relaxed">
                Para garantizar que el catálogo de EventNow mantenga los más altos estándares de calidad y seguridad, los eventos creados por usuarios generales quedan en estado <strong>Pendiente de Aprobación</strong>. Revisa los datos del evento, ubicación y precio antes de autorizar su publicación pública.
              </p>
            </div>
          </div>

          {/* Search bar */}
          <div className="mb-6 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              value={pendingEventSearch}
              onChange={e => setPendingEventSearch(e.target.value)}
              placeholder="Buscar por título, categoría, ciudad, organizador o correo..."
              className="w-full bg-gray-900 border border-white/10 text-white rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:border-purple-500/50"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Pending events list */}
            <div className="lg:col-span-2 space-y-3">
              {pendingEventsLoading ? (
                [...Array(3)].map((_, i) => (
                  <div key={i} className="h-36 bg-gray-800 rounded-xl animate-pulse" />
                ))
              ) : filteredPendingEvents.length === 0 ? (
                <div className="text-center py-16 text-gray-500 bg-gray-900/50 rounded-2xl border border-white/5">
                  <CheckCircle className="w-12 h-12 mx-auto mb-3 opacity-30 text-emerald-400" />
                  <p className="text-base font-semibold text-gray-300">¡Bandeja de eventos al día!</p>
                  <p className="text-xs text-gray-500 mt-1">No hay eventos pendientes de aprobación en este momento.</p>
                </div>
              ) : (
                filteredPendingEvents.map(event => {
                  const isSelected = selectedPendingEvent?._id === event._id
                  const cover = event.coverImage || (Array.isArray(event.images) && typeof event.images[0] === 'string' ? event.images[0] : (event.images?.[0] as any)?.url) || '/images/default-event.jpg'
                  const priceLabel = (event.price?.amount || 0) > 0 ? `RD$ ${event.price?.amount?.toLocaleString()}` : 'Gratis'

                  return (
                    <div
                      key={event._id}
                      onClick={() => setSelectedPendingEvent(event)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') setSelectedPendingEvent(event) }}
                      className={`w-full text-left bg-gray-900 border rounded-2xl p-4 transition-all hover:border-purple-500/30 cursor-pointer ${
                        isSelected ? 'border-purple-500 bg-purple-950/20' : 'border-white/5'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row items-start gap-4">
                        <div className="w-full sm:w-28 h-28 rounded-xl bg-gray-800 overflow-hidden flex-shrink-0 relative">
                          <img
                            src={cover}
                            alt={event.title}
                            className="w-full h-full object-cover"
                            onError={e => {
                              ;(e.target as HTMLElement).style.display = 'none'
                            }}
                          />
                          <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-bold bg-black/70 backdrop-blur text-purple-300 border border-purple-500/30 uppercase">
                            {event.category || 'General'}
                          </div>
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className="font-bold text-white text-base truncate">
                              {event.title}
                            </span>
                            <span className="px-2 py-0.5 rounded-full text-xs bg-purple-500/20 text-purple-300 border border-purple-500/30 font-semibold">
                              ⏳ Requiere Aprobación
                            </span>
                          </div>

                          <div className="mt-1 text-xs text-gray-400 space-y-1">
                            <p className="flex items-center gap-1.5 text-gray-300">
                              <Calendar className="w-3.5 h-3.5 text-purple-400 flex-shrink-0" />
                              {event.date ? new Date(event.date).toLocaleDateString('es-DO', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }) : 'Fecha por definir'}
                              {event.time && ` · ${event.time}`}
                            </p>
                            <p className="flex items-center gap-1.5 text-gray-400 truncate">
                              <MapPin className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />
                              {event.location?.venue ? `${event.location.venue}, ` : ''}{event.location?.address || event.location?.city || 'República Dominicana'}
                            </p>
                            <p className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                              <Tag className="w-3.5 h-3.5" />
                              {priceLabel}
                              {event.maxAttendees ? ` · Capacidad: ${event.maxAttendees} personas` : ''}
                            </p>
                          </div>

                          {event.createdBy && (
                            <div className="flex items-center gap-2 mt-2 pt-2 border-t border-white/5 text-xs text-gray-400">
                              <User className="w-3 h-3" />
                              <span>Creado por: <strong className="text-gray-200">@{event.createdBy.username || 'usuario'}</strong> ({event.createdBy.email || 'sin email'})</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Quick Action Buttons on Event Card */}
                      <div
                        className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-white/5"
                        onClick={e => e.stopPropagation()}
                      >
                        <button
                          type="button"
                          onClick={() => approveEventMutation.mutate(event._id)}
                          disabled={approveEventMutation.isPending}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-600/30 hover:bg-purple-600/50 text-purple-200 border border-purple-500/40 text-xs font-semibold transition-colors disabled:opacity-40"
                        >
                          <Check className="w-3.5 h-3.5" />
                          Aprobar Evento
                        </button>
                        <button
                          type="button"
                          onClick={() => setRejectionModalEvent(event)}
                          disabled={rejectEventMutation.isPending}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600/20 hover:bg-red-600/35 text-red-300 border border-red-500/30 text-xs font-semibold transition-colors disabled:opacity-40"
                        >
                          <X className="w-3.5 h-3.5" />
                          Rechazar
                        </button>
                      </div>
                    </div>
                  )
                })
              )}
            </div>

            {/* Event Detail & Actions */}
            <div className="lg:col-span-1">
              {selectedPendingEvent ? (
                <div className="bg-gray-900 border border-white/10 rounded-2xl p-5 sticky top-28 space-y-4 shadow-xl">
                  <div className="flex items-center justify-between pb-3 border-b border-white/10">
                    <h3 className="text-white font-bold flex items-center gap-2">
                      <Calendar className="w-5 h-5 text-purple-400" />
                      Inspección de Evento
                    </h3>
                    <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                      Pendiente
                    </span>
                  </div>

                  <div className="w-full h-36 rounded-xl bg-gray-800 overflow-hidden relative">
                    <img
                      src={selectedPendingEvent.coverImage || (Array.isArray(selectedPendingEvent.images) && typeof selectedPendingEvent.images[0] === 'string' ? selectedPendingEvent.images[0] : (selectedPendingEvent.images?.[0] as any)?.url) || '/images/default-event.jpg'}
                      alt={selectedPendingEvent.title}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  <div className="space-y-3 text-xs">
                    <div>
                      <p className="text-gray-400 font-medium">Título del Evento</p>
                      <p className="text-white font-bold text-base mt-0.5">{selectedPendingEvent.title}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-white/5 p-3 rounded-xl border border-white/10">
                        <p className="text-gray-400 font-medium">Categoría</p>
                        <p className="text-purple-300 font-semibold mt-0.5 capitalize">{selectedPendingEvent.category || 'General'}</p>
                      </div>
                      <div className="bg-white/5 p-3 rounded-xl border border-white/10">
                        <p className="text-gray-400 font-medium">Precio</p>
                        <p className="text-emerald-300 font-bold mt-0.5">
                          {(selectedPendingEvent.price?.amount || 0) > 0 ? `RD$ ${selectedPendingEvent.price?.amount?.toLocaleString()}` : 'Gratis'}
                        </p>
                      </div>
                    </div>

                    <div className="bg-white/5 p-3 rounded-xl border border-white/10">
                      <p className="text-gray-400 font-medium">Ubicación y Coordenadas</p>
                      <p className="text-white font-semibold mt-0.5">{selectedPendingEvent.location?.address || 'Sin dirección exacta'}</p>
                      {selectedPendingEvent.location?.coordinates && (
                        <p className="text-gray-400 font-mono text-[11px] mt-1">
                          GPS: {selectedPendingEvent.location.coordinates[1]}, {selectedPendingEvent.location.coordinates[0]}
                        </p>
                      )}
                    </div>

                    {selectedPendingEvent.description && (
                      <div className="bg-white/5 p-3 rounded-xl border border-white/10">
                        <p className="text-gray-400 font-medium">Descripción</p>
                        <p className="text-gray-200 mt-1 leading-relaxed max-h-36 overflow-y-auto no-scrollbar whitespace-pre-wrap">
                          {selectedPendingEvent.description}
                        </p>
                      </div>
                    )}

                    {selectedPendingEvent.createdBy && (
                      <div className="bg-white/5 p-3 rounded-xl border border-white/10">
                        <p className="text-gray-400 font-medium">Organizador</p>
                        <p className="text-white font-semibold mt-0.5">
                          {selectedPendingEvent.createdBy.firstName} {selectedPendingEvent.createdBy.lastName} (@{selectedPendingEvent.createdBy.username})
                        </p>
                        <p className="text-gray-400 text-[11px]">{selectedPendingEvent.createdBy.email}</p>
                      </div>
                    )}
                  </div>

                  {/* Approve / Reject Actions */}
                  <div className="space-y-2 pt-2 border-t border-white/10">
                    <button
                      type="button"
                      onClick={() => approveEventMutation.mutate(selectedPendingEvent._id)}
                      disabled={approveEventMutation.isPending}
                      className="w-full flex items-center justify-center gap-2 py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl text-sm transition-all shadow-lg shadow-purple-900/30 disabled:opacity-50"
                    >
                      <Check className="w-4 h-4" />
                      Aprobar y Publicar Inmediatamente
                    </button>

                    <button
                      type="button"
                      onClick={() => setRejectionModalEvent(selectedPendingEvent)}
                      disabled={rejectEventMutation.isPending}
                      className="w-full flex items-center justify-center gap-2 py-2.5 bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-500/30 font-semibold rounded-xl text-sm transition-all disabled:opacity-50"
                    >
                      <X className="w-4 h-4" />
                      Rechazar Evento
                    </button>
                  </div>
                </div>
              ) : (
                <div className="bg-gray-900 border border-white/5 rounded-2xl p-8 text-center">
                  <Calendar className="w-12 h-12 text-gray-700 mx-auto mb-3" />
                  <p className="text-gray-400 font-medium">Selecciona un evento</p>
                  <p className="text-gray-600 text-xs mt-1">Revisa el contenido, ubicación y descripción antes de publicar en EventNow.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* SECTION 4: DOMINICAN REPUBLIC ZONES & REAL GPS COVERAGE */}
      {activeSection === 'zones' && (
        <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
          {/* Header Banner */}
          <div className="p-5 rounded-2xl bg-cyan-950/40 border border-cyan-500/30 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <Compass className="w-6 h-6 text-cyan-400 flex-shrink-0 mt-0.5" />
              <div>
                <h2 className="text-cyan-200 font-bold text-base">Zonas Geográficas, Geocercas y Cobertura RD</h2>
                <p className="text-cyan-300/80 text-xs mt-1 leading-relaxed max-w-2xl">
                  EventNow utiliza 8 hubs estratégicos en la República Dominicana para recomendaciones inteligentes, notificaciones contextuales y geolocalización hiper-local en la App Móvil y Web.
                </p>
              </div>
            </div>

            <button
              onClick={handleReadRealGps}
              disabled={isReadingGps}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs transition-all shadow-lg shadow-cyan-900/40 disabled:opacity-50 whitespace-nowrap self-start md:self-auto"
            >
              <Navigation className={`w-4 h-4 ${isReadingGps ? 'animate-spin' : ''}`} />
              <span>{isReadingGps ? 'Leyendo GPS...' : '📍 Probar GPS Real de mi Dispositivo'}</span>
            </button>
          </div>

          {/* Real-time GPS Inspector Result */}
          {liveGpsCoords && (
            <div className="p-4 rounded-2xl bg-gray-900 border border-cyan-500/40 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-cyan-400 flex items-center gap-1.5">
                  <Navigation className="w-4 h-4" /> Lectura de Posición Satelital Activa
                </span>
                <span className="text-xs text-gray-400 font-mono">
                  Precisión: ±{Math.round(liveGpsCoords.accuracy || 0)} metros
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                  <p className="text-gray-400 text-xs">Latitud</p>
                  <p className="text-white font-mono font-bold text-sm mt-0.5">{liveGpsCoords.lat.toFixed(6)}</p>
                </div>
                <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                  <p className="text-gray-400 text-xs">Longitud</p>
                  <p className="text-white font-mono font-bold text-sm mt-0.5">{liveGpsCoords.lng.toFixed(6)}</p>
                </div>
                <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                  <p className="text-gray-400 text-xs">Hub Más Cercano Detectado</p>
                  <p className="text-cyan-300 font-bold text-sm mt-0.5">
                    {nearestZoneInfo ? `${nearestZoneInfo.zone.name} (${nearestZoneInfo.distanceKm} km)` : 'Calculando...'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Dominican Hubs Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {DOMINICAN_ZONES.map(zone => {
              const isSelected = selectedZone?.id === zone.id

              return (
                <div
                  key={zone.id}
                  onClick={() => setSelectedZone(zone)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') setSelectedZone(zone) }}
                  className={`bg-gray-900 border rounded-2xl p-4 transition-all hover:border-cyan-500/30 cursor-pointer flex flex-col justify-between ${
                    isSelected ? 'border-cyan-500 bg-cyan-950/20 shadow-lg shadow-cyan-950/40' : 'border-white/5'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${zone.badgeColor}`}>
                        {zone.region}
                      </span>
                      <span className="text-xs text-gray-500 font-mono">
                        Radio: {zone.radiusKm} km
                      </span>
                    </div>

                    <h3 className="font-bold text-white text-base mt-1">
                      {zone.name}
                    </h3>
                    <p className="text-gray-400 text-xs mt-1 leading-relaxed">
                      {zone.tagline}
                    </p>

                    <div className="mt-3 pt-3 border-t border-white/5 space-y-1.5">
                      <p className="text-[11px] text-gray-500 font-medium">Puntos Clave:</p>
                      <div className="flex flex-wrap gap-1">
                        {zone.landmarks.map((l, idx) => (
                          <span key={idx} className="px-2 py-0.5 rounded-md bg-white/5 text-[10px] text-gray-300">
                            {l}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-xs text-gray-400 font-mono">
                    <span>GPS: {zone.coordinates.lat.toFixed(4)}, {zone.coordinates.lng.toFixed(4)}</span>
                    <MapPin className="w-3.5 h-3.5 text-cyan-400" />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Event Rejection Modal */}
      {rejectionModalEvent && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-white/10 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-white font-bold text-lg flex items-center gap-2">
              <XCircle className="w-5 h-5 text-red-400" />
              Rechazar Evento
            </h3>
            <p className="text-xs text-gray-400">
              Indica la razón por la que se rechaza el evento <strong>"{rejectionModalEvent.title}"</strong>.
            </p>
            <textarea
              rows={4}
              value={eventRejectionReason}
              onChange={e => setEventRejectionReason(e.target.value)}
              placeholder="Ejemplo: La información del lugar es incompleta, no cumple las directrices comunitarias, o el contenido duplica otro evento existente."
              className="w-full bg-gray-950 border border-white/15 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-red-500"
            />
            <div className="flex gap-3 justify-end pt-2">
              <button
                type="button"
                onClick={() => {
                  setRejectionModalEvent(null)
                  setEventRejectionReason('')
                }}
                className="px-4 py-2 rounded-xl border border-white/10 text-gray-300 hover:bg-white/5 text-sm font-semibold"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  rejectEventMutation.mutate({
                    eventId: rejectionModalEvent._id,
                    reason: eventRejectionReason.trim()
                  })
                }}
                disabled={rejectEventMutation.isPending}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-sm font-bold transition-all disabled:opacity-50"
              >
                Confirmar Rechazo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Organizer Rejection Reason Modal */}
      {rejectionModalUser && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-white/10 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-white font-bold text-lg flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-red-400" />
              Descartar / Rechazar Verificación
            </h3>
            <p className="text-xs text-gray-400">
              Indica la razón por la que se rechaza la verificación de <strong>{rejectionModalUser.firstName} {rejectionModalUser.lastName}</strong>. Esta información le será mostrada para que pueda corregir sus datos.
            </p>
            <textarea
              rows={4}
              value={rejectionReason}
              onChange={e => setRejectionReason(e.target.value)}
              placeholder="Ejemplo: El RNC no coincide con el nombre de la empresa registrada, o el número de documento es inválido."
              className="w-full bg-gray-950 border border-white/15 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-red-500"
            />
            <div className="flex gap-3 justify-end pt-2">
              <button
                type="button"
                onClick={() => {
                  setRejectionModalUser(null)
                  setRejectionReason('')
                }}
                className="px-4 py-2 rounded-xl border border-white/10 text-gray-300 hover:bg-white/5 text-sm font-semibold"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!rejectionReason.trim()) {
                    toast.error('Por favor escribe el motivo del rechazo')
                    return
                  }
                  reviewOrganizerMutation.mutate({
                    userId: rejectionModalUser._id,
                    action: 'reject',
                    reason: rejectionReason.trim()
                  })
                }}
                disabled={reviewOrganizerMutation.isPending}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-sm font-bold transition-all disabled:opacity-50"
              >
                Confirmar Rechazo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
