'use client'
import Link from 'next/link'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useQuery, useMutation } from '@tanstack/react-query'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import { Calendar, Clock, MapPin, Users, DollarSign, Edit, Lock, Heart, Share, ChevronLeft, User, MessageCircle, Star, CheckCircle, XCircle, AlertTriangle, Globe, Video, Hand, Dog, Tag, ExternalLink, Ticket, Sparkles, ShieldCheck, ShieldAlert, Rocket } from 'lucide-react'
const UserPlus = User
import { apiClient } from '@/lib/api/client'
import { useAuthStore } from '@/stores/authStore'
import { FollowButton } from '@/components/social/FollowButton'
import { ImportedEventSourceNotice, type PublicEventSource } from '@/components/events/ImportedEventSourceNotice'
import toast from 'react-hot-toast'
import { CommentSection } from '@/components/comments'
import { getImageUrl } from '@/lib/utils'
import { normalizeEventDetail, eventOccupancy, eventDateLabel, eventMapHref } from '@/components/events/event-detail-utils'
import { usePublicConfig } from '@/hooks/usePublicConfig'
import { CategoryBadge } from '@/components/discovery/CategoryBadge'
import { StoryExportModal } from '@/components/social/StoryExportModal'
import { SerruchoModal } from '@/components/events/SerruchoModal'
import { CoroMatchSection } from '@/components/events/CoroMatchSection'
import { BoostEventModal } from '@/components/events/BoostEventModal'
import FlyerExportModal from '@/components/social/FlyerExportModal'
import EventWeatherCard from '@/components/events/EventWeatherCard'
import EventNavigationPills from '@/components/events/EventNavigationPills'
import EventCalendarButtons from '@/components/events/EventCalendarButtons'
import EventTransitEmergencyPanel from '@/components/events/EventTransitEmergencyPanel'
import EventStoryGeneratorModal from '@/components/events/EventStoryGeneratorModal'
import AfterPartySection from '@/components/events/AfterPartySection'
import LiveEventWall from '@/components/events/LiveEventWall'
import HostOperationsPanel from '@/components/events/HostOperationsPanel'
import TouristGuideModal from '@/components/events/TouristGuideModal'
import { VirtualStagePlayer, type VirtualDetails } from '@/components/events/VirtualStagePlayer'
import { TripBudgetCalculator } from '@/components/events/TripBudgetCalculator'
import UniversalTimezoneClock from '@/components/events/UniversalTimezoneClock'
import SoloTravelerBuddySection from '@/components/events/SoloTravelerBuddySection'
import { Baby, HeartHandshake, ShieldCheck as ShieldCheckIcon, Stethoscope } from 'lucide-react'
import { useLocaleStore } from '@/stores/localeStore'

import { getEventPhase } from '@/components/events/event-phase'
import { EventSongVotingSection } from '@/components/events/EventSongVotingSection'
import { EventContextSections } from '@/components/events/EventContextSections'
import { EventSectionDisclosure } from '@/components/events/EventSectionDisclosure'
import { EventHospitalityWidget } from '@/components/events/EventHospitalityWidget'
import { buildWhatsAppEventInvitation, countVerifiedEventRegistrations, publicEventShareUrl } from '@/lib/event-whatsapp-invite'
import { checkEventRsvpSnapshot, readEventRsvpIntent } from '@/components/events/event-rsvp-intent'
import { useEventSignIn } from '@/components/events/useEventSignIn'
import { EventAttendeeFaces } from '@/components/events/EventAttendeeFaces'
import { EventPracticalInfo } from '@/components/events/EventPracticalInfo'
import OrganizerReliability from '@/components/events/OrganizerReliability'
import { readEventAttendanceSummary } from '@/components/events/event-attendance-summary'

type RsvpRequest = { eventId: string; identity: string; expectedPrice: 'free' | 'paid'; requestId: number }

interface Event {
  publicSource?: PublicEventSource
  externalUrl?: string
  organizer?: string
  timeZone?: string
  _id: string
  title: string
  description: string
  category: string
  date: string
  endDate?: string
  status?: string
  location: {
    type: string
    coordinates: [number, number]
    address: string
    venue?: string
    countryCode?: string
  }
  price: {
    amount: number
    currency: string
  }
  maxAttendees: number
  attendeesCount: number
  attendees?: unknown
  attendanceSummary?: unknown
  createdBy: {
    _id: string
    username: string
    firstName: string
    lastName: string
    avatar?: string
    isOrganizerVerified?: boolean
    verified?: boolean
    organizationName?: string
  }
  tags: string[]
  images: string[]
  isAttending?: boolean
  isFavorite?: boolean
  isVirtual?: boolean
  virtualLink?: string
  eventType?: 'in_person' | 'virtual' | 'hybrid'
  virtualPlatform?: string
  virtualDetails?: VirtualDetails
  accessibility?: string[]
  isSecretLocation?: boolean
  isPrivate?: boolean
  activityType?: string
  ticketUrl?: string
  paymentMode?: string
  paymentInfo?: string
  isUnofficial?: boolean
  isRecurring?: boolean
  recurringSchedule?: {
    frequency?: string
    dayName?: string
    timeText?: string
  }
  isCommercialDeal?: boolean
  commercialBrand?: string
  commercialOffer?: string
  isTourOrTrip?: boolean
  tourDetails?: {
    departurePoint?: string
    includes?: string[]
  }
  isOfficial?: boolean
  familyDetails?: {
    isFamilyEvent?: boolean
    targetAudience?: 'babies' | 'toddlers' | 'kids' | 'teens' | 'parents' | 'all_family'
    ageMinMonths?: number
    ageMaxMonths?: number
    strollerAccessible?: boolean
    nursingRoomAvailable?: boolean
    diaperChangingStation?: boolean
    supervisionRequired?: boolean
    safetyNotes?: string
  }
  holidaySeason?: string
  holidayLabel?: string
  healthDetails?: {
    isHealthInitiative?: boolean
    healthType?: 'community_clinic' | 'blood_drive' | 'pediatric_care' | 'vaccination' | 'clinical_trial_info' | 'preventive_screening' | 'none'
    hospitalOrInstitution?: string
    clinicalTrialId?: string
    ethicsApprovalRef?: string
    medicalDisclaimer?: string
  }
}

export default function EventDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter()
  const searchParams = useSearchParams()
  const promoter = searchParams.get('rrpp') || searchParams.get('promoter') || searchParams.get('ref')
  const rsvpIntent = readEventRsvpIntent(`/events/${id}?${searchParams.toString()}`, id)
  const { user, isAuthenticated } = useAuthStore()
  const config = usePublicConfig()
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const update = () => setNow(Date.now())
    const interval = window.setInterval(update, 30_000)
    document.addEventListener('visibilitychange', update)
    return () => { window.clearInterval(interval); document.removeEventListener('visibilitychange', update) }
  }, [])
  const identity = isAuthenticated ? user?.id || user?._id || 'signed-in' : 'guest'
  const signIn = useEventSignIn(id)
  const actionOwner = useRef({ eventId: id, identity })
  actionOwner.current = { eventId: id, identity }
  const rsvpLock = useRef<number | null>(null)
  const rsvpSequence = useRef(0)
  const [rsvpError, setRsvpError] = useState<string | null>(null)
  const isCurrentRsvp = (request: RsvpRequest) => {
    const auth = useAuthStore.getState()
    return actionOwner.current.eventId === request.eventId && actionOwner.current.identity === request.identity &&
      auth.isAuthenticated && (auth.user?.id || auth.user?._id) === request.identity
  }
  const [showFullDescription, setShowFullDescription] = useState(false)
  const [optimisticState, setOptimisticState] = useState<{
    isAttending?: boolean
    isFavorite?: boolean
  }>({})

  const [showMoreEvents, setShowMoreEvents] = useState(false)
  const [isStoryModalOpen, setIsStoryModalOpen] = useState(false)
  const [isCanvasStoryOpen, setIsCanvasStoryOpen] = useState(false)
  const [isSerruchoModalOpen, setIsSerruchoModalOpen] = useState(false)
  const [isFlyerModalOpen, setIsFlyerModalOpen] = useState(false)
  const [isBoostModalOpen, setIsBoostModalOpen] = useState(false)
  const [isTouristModalOpen, setIsTouristModalOpen] = useState(false)

  useEffect(() => {
    setOptimisticState({})
    setRsvpError(null)
    setShowMoreEvents(false)
    setShowFullDescription(false)
    setIsSerruchoModalOpen(false)
    setIsStoryModalOpen(false)
    setIsFlyerModalOpen(false)
  }, [id, identity])

  // Redirect if invalid ID
  useEffect(() => {
    if (!params.id || params.id === 'undefined') {
      router.push('/events')
    }
  }, [params.id, router])

  // Fetch event details
  const { data: event, isLoading, error, refetch } = useQuery({
    queryKey: ['event', params.id, identity],
    queryFn: async () => {
      if (!params.id || params.id === 'undefined') {
        throw new Error('Event ID is required')
      }
      const response = await apiClient.get(`/events/${params.id}`)
      if (!response.data?.event) throw new Error('No se pudo cargar el evento')
      return normalizeEventDetail(response.data.event) as Event
    },
    enabled: !!params.id && params.id !== 'undefined', // Only run query if we have a valid ID
    retry: (attempt, err: any) => attempt < 1 && (!err.response || err.response.status >= 500),
    staleTime: 0, // Always refetch to get latest state
    gcTime: 0  // Don't cache to ensure fresh data
  })

  const phase = getEventPhase(event || {}, now)
  const shareOrigin = typeof window !== 'undefined' ? window.location.origin : ''
  const publicShareUrl = publicEventShareUrl(event, shareOrigin)
  const whatsAppInvitation = buildWhatsAppEventInvitation(event, shareOrigin, now)
  const verifiedRegistrations = readEventAttendanceSummary(event?.attendanceSummary)?.confirmedCount ?? countVerifiedEventRegistrations(event?.attendees)
  const exportEvent = publicShareUrl && event ? {
    ...event,
    ...(event.isSecretLocation ? { location: { venue: 'Ubicación reservada', address: 'Ubicación reservada' } } : {}),
  } : null
  const acceptsAttendance = (phase === 'upcoming' || phase === 'live') && event?.status === 'published'
  useEffect(() => {
    if (!acceptsAttendance) {
      setIsSerruchoModalOpen(false)
      setIsStoryModalOpen(false)
      setIsFlyerModalOpen(false)
    }
  }, [acceptsAttendance])

  // Fetch more events from the same organizer
  const { data: organizerEvents, isLoading: isLoadingOrganizerEvents } = useQuery({
    queryKey: ['organizer-events', event?.createdBy?._id, params.id, identity],
    queryFn: async () => {
      if (!event?.createdBy?._id) return []
      const response = await apiClient.get(`/events?createdBy=${event.createdBy._id}&limit=6`)
      // Filter out the current event
      return (Array.isArray(response.data?.events) ? response.data.events : [])
        .filter((e: Event) => e?._id && e._id !== params.id).map(normalizeEventDetail) as Event[]
    },
    enabled: !!event?.createdBy?._id && showMoreEvents
  })

  // Only a deliberate button press can confirm attendance. A return intent is presentation state.
  const joinEventMutation = useMutation({
    mutationFn: async (request: RsvpRequest) => {
      if (!isCurrentRsvp(request)) throw new Error('La sesión cambió. Revisa tu cuenta antes de confirmar.')
      const fresh = await apiClient.get(`/events/${request.eventId}`)
      if (!isCurrentRsvp(request)) throw new Error('La sesión cambió. Revisa tu cuenta antes de confirmar.')
      const snapshot = checkEventRsvpSnapshot(fresh.data?.event, request.eventId, request.expectedPrice, Date.now())
      if (snapshot.alreadyConfirmed) return { alreadyConfirmed: true }
      if (snapshot.amount > 0 && config.paymentsEnabled) throw new Error('Este evento requiere una entrada. Revisa las opciones de compra.')
      const response = await apiClient.post(`/events/${request.eventId}/join`)
      if (response.data?.success !== true) throw new Error(response.data?.message || 'El servidor no confirmó tu asistencia. Vuelve a intentarlo.')
      return { alreadyConfirmed: false }
    },
    onSuccess: async (result, request) => {
      if (!isCurrentRsvp(request)) return
      await refetch()
      if (!isCurrentRsvp(request)) return
      setOptimisticState(prev => ({ ...prev, isAttending: true }))
      setRsvpError(null)
      toast.success(result.alreadyConfirmed ? 'Tu asistencia ya estaba confirmada' : 'Asistencia confirmada')
    },
    onError: (error: any, request) => {
      if (!isCurrentRsvp(request)) return
      const rawMessage = error?.response?.data?.message || error?.message
      const message = typeof rawMessage === 'string' && rawMessage.trim() ? rawMessage : 'No pudimos confirmar tu asistencia. Puedes volver a intentarlo.'
      setRsvpError(message)
      setOptimisticState(prev => ({ ...prev, isAttending: undefined }))
      toast.error(message)
      void refetch()
    },
    onSettled: (_data, _error, request) => {
      if (rsvpLock.current === request.requestId) rsvpLock.current = null
    },
  })

  // Leave event mutation
  const leaveEventMutation = useMutation({
    mutationFn: async (eventId: string) => {
      const response = await apiClient.post(`/events/${eventId}/leave`)
      return response.data
    },
    onSuccess: async () => {
      await refetch()
      setOptimisticState(prev => ({ ...prev, isAttending: undefined }))
      toast.success('Has salido del evento')
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || error.message
      toast.error(message || 'Error al salir del evento')
      setOptimisticState(prev => ({ ...prev, isAttending: undefined }))
    }
  })

  // Toggle favorite mutation
  const toggleFavoriteMutation = useMutation({
    mutationFn: async (eventId: string) => {
      const response = await apiClient.post(`/events/${eventId}/favorite`)
      return response.data
    },
    onSuccess: async (data) => {
      await refetch()
      setOptimisticState(prev => ({ ...prev, isFavorite: undefined }))
      toast.success(data.isFavorite === false ? 'Eliminado de favoritos' : 'Favoritos actualizados')
    },
    onError: (err: any) => {
      setOptimisticState(prev => ({ ...prev, isFavorite: undefined }))
      toast.error(err.response?.data?.message || 'Error al actualizar favoritos')
    }
  })

  const handleJoinEvent = () => {
    if (!acceptsAttendance) { setRsvpError('Este evento ya no acepta nuevas confirmaciones'); return }
    if (joinEventMutation.isPending || leaveEventMutation.isPending || rsvpLock.current !== null) return
    if (event && event.maxAttendees > 0 && (verifiedRegistrations ?? 0) >= event.maxAttendees) { setRsvpError('El evento ha alcanzado su capacidad máxima'); return }
    if (!isAuthenticated || !(user?.id || user?._id)) {
      signIn('rsvp')
      return
    }
    setRsvpError(null)
    if ((event?.price?.amount || 0) > 0 && config.paymentsEnabled) {
      router.push(`/checkout/${params.id}`)
      return
    }
    const request: RsvpRequest = { eventId: id, identity, expectedPrice: event?.price?.amount === 0 ? 'free' : 'paid', requestId: ++rsvpSequence.current }
    rsvpLock.current = request.requestId
    joinEventMutation.mutate(request)
  }

  const handleLeaveEvent = () => {
    if (!acceptsAttendance) return
    if (joinEventMutation.isPending || leaveEventMutation.isPending) return
    // Optimistic update
    setOptimisticState(prev => ({ ...prev, isAttending: false }))
    leaveEventMutation.mutate(params.id as string)
  }

  const handleToggleFavorite = () => {
    if (toggleFavoriteMutation.isPending) return
    if (!isAuthenticated) {
      toast.error('Debes iniciar sesión para agregar a favoritos')
      signIn()
      return
    }
    // Optimistic update
    setOptimisticState(prev => ({ ...prev, isFavorite: !event?.isFavorite }))
    toggleFavoriteMutation.mutate(params.id as string)
  }

  const handleShare = async () => {
    if (!publicShareUrl) {
      toast.error('Compartir solo está disponible para eventos públicos publicados')
      return
    }
    try {
      if (navigator.share) {
        await navigator.share({ title: event?.title, text: whatsAppInvitation?.text || event?.title, url: publicShareUrl })
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(publicShareUrl)
        toast.success('Enlace copiado al portapapeles')
      } else {
        toast.error('Copia el enlace desde la barra de direcciones para compartirlo')
      }
    } catch (err) {
      if (!(err instanceof DOMException && err.name === 'AbortError')) {
        toast.error('No se pudo compartir. Copia el enlace desde la barra de direcciones.')
      }
    }
  }

  const formatDate = eventDateLabel

  const formatPrice = (price: { amount: number; currency: string }) => {
    if (price.amount === 0) return 'Gratis'
    return `${price.amount} ${price.currency}`
  }

  const getAttendanceStatus = () => {
    if (!event || !acceptsAttendance) return null
    const percentage = eventOccupancy(verifiedRegistrations ?? 0, event.maxAttendees)

    if (percentage >= 90) {
      return { color: 'text-red-600', icon: AlertTriangle, text: 'Casi lleno' }
    } else if (percentage >= 70) {
      return { color: 'text-yellow-600', icon: Clock, text: 'Llenándose rápido' }
    } else {
      return { color: 'text-green-600', icon: CheckCircle, text: 'Disponible' }
    }
  }

  const getAccessibilityIcon = (type: string) => {
    switch (type) {
      case 'wheelchair': return '♿ Silla de Ruedas'
      case 'petFriendly': return '🐕 Pet Friendly'
      case 'signLanguage': return '🤟 Lenguaje de Señas'
      case 'quietZone': return '🤫 Zona Tranquila'
      case 'visualAids': return '👁️ Ayudas Visuales'
      default: return type
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-transparent flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-primary shadow-xl shadow-primary/20"></div>
      </div>
    )
  }

  if (error || !event) {
    const status = (error as any)?.response?.status
    const unavailable = status === 404 || status === 410
    const limited = status === 429
    return (
      <div className="min-h-screen bg-transparent flex items-center justify-center">
        <div className="text-center glass border-white/10 p-12 rounded-3xl backdrop-blur-md shadow-2xl max-w-md w-full mx-4">
          <XCircle className="w-20 h-20 text-red-500 mx-auto mb-6 opacity-80" />
          <h1 className="text-3xl font-extrabold text-foreground mb-3">
            {unavailable ? 'Este evento ya no está disponible' : limited ? 'Espera un momento para seguir explorando' : status === 403 ? 'Este evento tiene acceso restringido' : 'No pudimos abrir este evento'}
          </h1>
          <p className="text-lg text-muted-foreground mb-8">
            {unavailable ? 'El anfitrión pudo retirarlo o cambiar su visibilidad. Puedes descubrir otros planes en el mapa.' : limited ? 'Se alcanzó el límite temporal de consultas. Vuelve al mapa y reintenta cuando termine el tiempo indicado en el aviso.' : status === 403 ? 'Puede requerir una invitación o cumplir una restricción de edad. Inicia sesión para comprobar tu acceso.' : 'Puede que ya no esté disponible o que haya un problema de conexión. Puedes volver a intentarlo.'}
          </p>
          <Link href="/discovery" className="mb-3 flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-primary px-6 py-3 font-semibold text-primary-foreground">Volver al mapa</Link>
          <button hidden={unavailable} onClick={() => !isAuthenticated && (error as any)?.response?.status === 403 ? signIn() : refetch()} className="mb-3 w-full rounded-2xl border border-primary/30 px-6 py-3 font-bold text-primary">
            {!isAuthenticated && (error as any)?.response?.status === 403 ? 'Iniciar sesión' : 'Volver a intentar'}
          </button>
          <button
            onClick={() => router.push('/events')}
            className="w-full px-6 py-4 bg-primary hover:bg-primary/90 text-primary-foreground rounded-2xl font-bold transition-all shadow-lg hover:shadow-primary/30"
          >
            Ver todos los eventos
          </button>
        </div>
      </div>
    )
  }

  const attendanceStatus = getAttendanceStatus()
  const phaseLabel = event.status === 'draft' ? 'Borrador' : { upcoming: 'Próximamente', live: 'En curso', ended: 'Finalizado', cancelled: 'Cancelado' }[phase]
  const isFull = event.maxAttendees > 0 && (verifiedRegistrations ?? 0) >= event.maxAttendees
  const occupancy = eventOccupancy(verifiedRegistrations ?? 0, event.maxAttendees)
  const mapHref = eventMapHref(event)
  const hasOrganizer = Boolean(event.createdBy._id)
  const isOrganizer = hasOrganizer && (user?.id || user?._id) === event.createdBy._id

  return (
    <div className="min-h-screen bg-transparent pb-24">
      {/* Hero Section */}
      <div className="relative min-h-[60svh] lg:min-h-[70svh] bg-gradient-to-br from-primary/30 to-secondary/30">
        {event.images && event.images.length > 0 && (
          <>
            <img
              src={getImageUrl(event.images[0])}
              onError={(e) => { e.currentTarget.style.display = "none" }}
              alt={event.title}
              className="absolute inset-0 h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/10"></div>
          </>
        )}

        <div className="relative flex min-h-[60svh] items-end pt-8 lg:min-h-[70svh]">
          <div className="container-padding w-full">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-10 w-full"
            >
              <button
                onClick={() => window.history.length > 1 ? router.back() : router.push('/events')}
                className="mb-6 flex min-h-11 scroll-mt-24 items-center gap-2 px-4 py-2 glass bg-white/10 hover:bg-white/20 text-white rounded-full font-bold transition-all backdrop-blur-md border hover:border-white w-fit"
              >
                <ChevronLeft className="w-5 h-5" />
                Volver
              </button>

              <div className="flex items-center gap-3 mb-4 flex-wrap">
                <CategoryBadge category={event.category} activityType={event.activityType} size="md" />
                <span className={`rounded-full border px-3 py-1 text-sm font-semibold ${phase === 'cancelled' ? 'border-red-300/50 bg-red-500/30 text-white' : 'border-white/25 bg-black/25 text-white'}`}>{phaseLabel}</span>
                {event.isUnofficial && (
                  <span className="px-3 py-1 rounded-full bg-fuchsia-600 font-bold text-xs text-white shadow-md flex items-center gap-1">
                    🤫 Extraoficial
                  </span>
                )}
                {event.isSecretLocation && (
                  <span className="px-3 py-1 rounded-full bg-violet-600/80 font-bold text-xs text-white shadow-md flex items-center gap-1">
                    <Lock className="w-3.5 h-3.5" /> Ubicación secreta
                  </span>
                )}
                {attendanceStatus && (
                  <span className={`flex items-center gap-1.5 px-4 py-1.5 bg-white/10 backdrop-blur-md border border-white/20 rounded-full text-sm font-bold text-white shadow-lg`}>
                    <attendanceStatus.icon className="w-4 h-4" />
                    {attendanceStatus.text}
                  </span>
                )}
              </div>

              <h1 className="mb-6 break-words text-3xl font-extrabold leading-tight text-white drop-shadow-2xl sm:text-5xl lg:text-7xl">
                {event.title}
              </h1>

              <div className="flex flex-wrap items-center gap-4 text-white font-medium">
                <div className="flex items-center gap-2 glass px-4 py-2 rounded-xl bg-white/10 border-white/20">
                  <Calendar className="w-5 h-5 text-primary-300" />
                  <span>{formatDate(event.date, event.timeZone)}</span>
                </div>

                {event.isVirtual ? (
                  <div className="flex items-center gap-2 glass px-4 py-2 rounded-xl bg-purple-500/20 border-purple-500/30 text-purple-200">
                    <Video className="w-5 h-5" />
                    <span>{phase === 'live' ? 'Evento virtual en curso' : 'Evento virtual'}</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 glass px-4 py-2 rounded-xl bg-white/10 border-white/20">
                    {event.isSecretLocation && !event.isAttending ? <Lock className="w-5 h-5 text-amber-300" /> : <MapPin className="w-5 h-5 text-primary-300" />}
                    <span>{event.isSecretLocation && !event.isAttending ? 'Ubicación secreta · Se revela al unirte' : (event.location?.venue || event.location?.address || 'Ubicación por confirmar')}</span>
                  </div>
                )}

                <div className="flex items-center gap-2 glass px-4 py-2 rounded-xl bg-white/10 border-white/20">
                  <Users className="w-5 h-5 text-primary-300" />
                  <span>Inscripciones confirmadas: {verifiedRegistrations ?? 'Por confirmar'}</span>
                </div>
                <div className="flex items-center gap-2 glass px-4 py-2 rounded-xl bg-green-500/20 border-green-500/30 text-green-300 font-bold">
                  <DollarSign className="w-5 h-5" />
                  <span>{formatPrice(event.price)}</span>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      <div className="container-padding py-8">

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div id="event-actions" className="lg:col-start-3 lg:row-start-1">
            {/* Action Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="glass border-white/10 rounded-3xl p-6 lg:p-8 backdrop-blur-xl bg-white/5 shadow-2xl lg:sticky lg:top-24"
            >
              <div className="space-y-4">
                {promoter && (
                  <div className="flex items-center gap-2 rounded-2xl border border-fuchsia-500/30 bg-fuchsia-500/15 px-4 py-2 text-xs font-bold text-fuchsia-300 backdrop-blur-md animate-pulse">
                    <Sparkles className="h-4 w-4 text-fuchsia-400 shrink-0" />
                    <span>Invitación VIP activa por @{promoter}</span>
                  </div>
                )}
                {rsvpIntent && acceptsAttendance && !(optimisticState.isAttending ?? event.isAttending) && <div id="rsvp-return-note" role="status" className="rounded-2xl border border-primary/30 bg-primary/10 p-4 text-sm leading-relaxed">
                  <p className="font-bold">{isAuthenticated ? 'Solo falta tu confirmación' : 'Confirma tu asistencia al iniciar sesión'}</p>
                  <p className="mt-1 text-muted-foreground">{isAuthenticated ? 'Revisa el evento y pulsa el botón para confirmar. Tu asistencia aún no está registrada.' : 'Volverás a este evento después de iniciar sesión para confirmar con un clic.'}</p>
                  {(event.price?.amount || 0) > 0 && <p className="mt-2 text-muted-foreground">Este evento requiere pago. Revisa la entrada y las condiciones antes de continuar.</p>}
                </div>}
                {rsvpError && <div id="rsvp-error" role="alert" className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-sm"><p>{rsvpError}</p>
                  {acceptsAttendance && !event.isAttending && <button type="button" disabled={joinEventMutation.isPending || leaveEventMutation.isPending} onClick={handleJoinEvent} className="mt-2 min-h-11 font-semibold text-primary underline disabled:opacity-50">Reintentar confirmación</button>}
                </div>}
                <motion.div
                  key={(optimisticState.isAttending ?? event.isAttending) ? 'attending' : 'not-attending'}
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.2 }}
                >
                  {!acceptsAttendance ? (
                    <div role="status" className="rounded-2xl border border-white/15 bg-white/5 p-5 text-center">
                      <p className="text-lg font-bold text-foreground">{event.status !== 'published' && phase !== 'cancelled' && phase !== 'ended' ? 'Evento no publicado' : phase === 'cancelled' ? 'Evento cancelado' : 'Este evento ya finalizó'}</p>
                      <p className="mt-2 text-sm text-muted-foreground">{event.status !== 'published' && phase !== 'cancelled' && phase !== 'ended' ? 'Las confirmaciones se habilitarán cuando el organizador publique el evento.' : phase === 'cancelled' ? 'Consulta al organizador si necesitas información sobre tu entrada.' : event.isAttending ? 'Conservamos tu asistencia para acceder a los recuerdos del evento.' : 'Puedes consultar la información y descubrir otros eventos.'}</p>
                    </div>
                  ) : <>
                  {event.ticketUrl && (
                    <a
                      href={event.ticketUrl}
                      onClick={e => { if (!isAuthenticated) { e.preventDefault(); signIn() } }}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full mb-3 px-6 py-4 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:opacity-95 text-white rounded-2xl font-bold text-lg transition-all flex items-center justify-center gap-3 shadow-xl"
                    >
                      <Ticket className="w-5 h-5" />
                      Comprar entradas oficiales <ExternalLink className="w-4 h-4" />
                    </a>
                  )}
                  {(isAuthenticated && (optimisticState.isAttending ?? event.isAttending)) ? (
                    <motion.button
                      onClick={handleLeaveEvent}
                      disabled={leaveEventMutation.isPending || joinEventMutation.isPending}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="w-full px-6 py-4 bg-red-500/80 hover:bg-red-500 text-white rounded-2xl font-bold text-lg transition-all duration-300 disabled:opacity-50 flex items-center justify-center gap-3 shadow-lg shadow-red-500/20 backdrop-blur-md"
                    >
                      {leaveEventMutation.isPending ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          Saliendo...
                        </>
                      ) : (
                        <>
                          <XCircle className="w-5 h-5" />
                          Salir del Evento
                        </>
                      )}
                    </motion.button>
                  ) : (
                    <motion.button
                      onClick={handleJoinEvent}
                      autoFocus={Boolean(rsvpIntent && isAuthenticated)}
                      aria-describedby={rsvpError ? 'rsvp-error' : rsvpIntent ? 'rsvp-return-note' : undefined}
                      disabled={joinEventMutation.isPending || leaveEventMutation.isPending || isFull}
                      whileHover={{ scale: isFull ? 1 : 1.02 }}
                      whileTap={{ scale: isFull ? 1 : 0.98 }}
                      className="w-full px-6 py-4 bg-primary hover:bg-primary/90 text-primary-foreground rounded-2xl font-bold text-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 shadow-xl shadow-primary/30"
                    >
                      {joinEventMutation.isPending ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          Confirmando asistencia...
                        </>
                      ) : isFull ? (
                        <>
                          <AlertTriangle className="w-5 h-5" />
                          Evento Lleno
                        </>
                      ) : (
                        <>
                          <CheckCircle className="w-5 h-5" />
                          {(event.price?.amount || 0) > 0
                              ? (config.paymentsEnabled ? `Comprar Entrada (${formatPrice(event.price)})` : `Confirmar asistencia (${formatPrice(event.price)} en taquilla)`)
                              : event.ticketUrl ? 'Confirmar que asistiré' : 'Confirmar asistencia gratis'}
                        </>
                      )}
                    </motion.button>
                  )}
                  </>}
                </motion.div>

                <div className="flex gap-2">
                  <motion.button
                    onClick={handleToggleFavorite}
                    disabled={toggleFavoriteMutation.isPending}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className={`flex-1 px-4 py-4 rounded-2xl font-bold text-base transition-all duration-300 disabled:opacity-50 flex items-center justify-center gap-3 backdrop-blur-md ${(optimisticState.isFavorite ?? event.isFavorite)
                      ? 'bg-red-500/20 text-red-400 border border-red-500/50 shadow-lg shadow-red-500/10'
                      : 'glass bg-white/5 border-white/10 text-foreground hover:bg-white/10'
                      }`}
                  >
                    {toggleFavoriteMutation.isPending ? (
                      <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <motion.div
                        animate={{
                          scale: (optimisticState.isFavorite ?? event.isFavorite) ? [1, 1.3, 1] : 1,
                          rotate: (optimisticState.isFavorite ?? event.isFavorite) ? [0, 15, 0] : 0
                        }}
                        transition={{ duration: 0.3 }}
                      >
                        <Heart className={`w-5 h-5 ${(optimisticState.isFavorite ?? event.isFavorite) ? 'fill-current' : ''}`} />
                      </motion.div>
                    )}
                    {toggleFavoriteMutation.isPending ? 'Actualizando...' : (optimisticState.isFavorite ?? event.isFavorite) ? 'Favorito' : 'Favoritos'}
                  </motion.button>

                  <motion.button
                    onClick={handleShare}
                    disabled={!publicShareUrl}
                    title={!publicShareUrl ? 'Compartir solo está disponible para eventos públicos publicados' : 'Compartir evento público'}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="flex-1 px-4 py-4 glass bg-white/5 border border-white/10 text-foreground rounded-2xl font-bold text-base hover:bg-white/10 transition-all duration-300 flex items-center justify-center gap-3 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Share className="w-5 h-5" />
                    Compartir
                  </motion.button>
                </div>

                {whatsAppInvitation && <a href={whatsAppInvitation.href} target="_blank" rel="noopener noreferrer"
                  className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border border-primary/30 bg-primary/10 px-4 py-3 text-sm font-bold text-foreground transition-colors hover:bg-primary/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                  <MessageCircle className="h-5 w-5 text-primary" aria-hidden="true" />Armar el coro en WhatsApp
                </a>}

                {acceptsAttendance && <EventSectionDisclosure title="Comparte y organiza con amigos" description="Flyer, historia o gastos del grupo.">
                {/* Viral Actions: Instagram Story & Serrucho */}
                <div className="grid grid-cols-2 gap-2.5 pt-3">
                  {exportEvent && <button
                    onClick={() => setIsStoryModalOpen(true)}
                    className="flex items-center justify-center gap-2 p-3.5 rounded-2xl bg-gradient-to-r from-purple-500/10 to-pink-500/10 hover:from-purple-500/20 hover:to-pink-500/20 border border-purple-500/30 text-purple-300 text-xs font-bold transition-all shadow-sm"
                    title="Diseñar cartelera vertical para subir a tus estados de WhatsApp o Instagram Stories"
                  >
                    <Sparkles className="w-4 h-4 text-purple-400" />
                    <span>Crear Historia</span>
                  </button>}

                  <button
                    onClick={() => isAuthenticated ? setIsSerruchoModalOpen(true) : signIn()}
                    className="flex items-center justify-center gap-2 p-3.5 rounded-2xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-bold transition-all shadow-sm"
                    title="Dividir los gastos o armar la vaca con amigos para este evento"
                  >
                    <Users className="w-4 h-4 text-amber-400" />
                    <span>Hacer Serrucho</span>
                  </button>

                  {exportEvent && <button
                    onClick={() => setIsFlyerModalOpen(true)}
                    className="flex items-center justify-center gap-2 p-3.5 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-emerald-500/10 hover:from-emerald-500/20 hover:to-teal-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-bold transition-all shadow-sm"
                    title="Generar flyer estilizado con código QR para WhatsApp e Instagram Stories"
                  >
                    <Sparkles className="w-4 h-4 text-emerald-400" />
                    <span>📱 Flyer QR</span>
                  </button>}

                  <button
                    onClick={() => setIsCanvasStoryOpen(true)}
                    className="col-span-2 flex items-center justify-center gap-2 p-3.5 rounded-2xl bg-gradient-to-r from-pink-500/15 via-rose-500/15 to-purple-500/15 hover:brightness-110 border border-pink-500/30 text-pink-300 text-xs font-bold transition-all shadow-sm"
                    title="Generar Story 1080x1920 con sticker de 'Voy pa allá con mi coro'"
                  >
                    <Sparkles className="w-4 h-4 text-pink-400" />
                    <span>🎨 Generar Story Vertical (Instagram & WhatsApp)</span>
                  </button>
                </div>
                </EventSectionDisclosure>}
              </div>
            </motion.div>

          </div>
          {/* Main Content */}
          <div className="lg:col-span-2 lg:col-start-1 lg:row-start-1 lg:row-span-2">
            <EventAttendeeFaces summary={event.attendanceSummary} ended={phase === 'ended' || phase === 'cancelled'} />
            <EventPracticalInfo key={`planning:${id}:${identity}`} eventId={String(id)} />
            <section className="my-5 rounded-2xl border border-border p-6">
              <h2 className="text-xl font-semibold">{phase === 'ended' ? '¿Lo repetimos?' : 'El plan también lo haces tú'}</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{phase === 'ended' ? 'Pide otra edición y propón los días que te funcionan. El anfitrión verá la demanda real.' : 'Ofrece tu talento o coordina un punto público de encuentro antes del evento.'}</p>
              <div className="mt-4 flex flex-wrap gap-4"><Link className="inline-flex min-h-11 items-center font-semibold text-primary underline" href={`/community/events/${id}`}>{phase === 'ended' ? 'Pedir otra edición' : 'Yo aporto · Nos encontramos aquí'}</Link>{isOrganizer && <Link className="inline-flex min-h-11 items-center font-semibold text-primary underline" href="/partners">Buscar apoyo o un espacio</Link>}</div>
            </section>
            {hasOrganizer && !event.publicSource && <OrganizerReliability key={`reputation:${id}:${identity}`} organizerId={event.createdBy._id} eventId={String(id)} isPublic={['published', 'completed', 'expired'].includes(event.status || '') && !event.isPrivate && !event.isSecretLocation} />}

            {/* Holiday Season Highlight */}
            {event.holidayLabel && (
              <div className="my-6 rounded-3xl border border-rose-500/30 bg-gradient-to-r from-rose-950/40 via-pink-900/20 to-slate-900/60 p-5 shadow-lg backdrop-blur-md">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">💐</span>
                  <div>
                    <span className="inline-block rounded-full bg-rose-500/20 px-2.5 py-0.5 text-xs font-bold text-rose-300 border border-rose-500/30">
                      Fecha Festiva Oficial
                    </span>
                    <h3 className="text-lg font-bold text-white mt-0.5">{event.holidayLabel}</h3>
                    <p className="text-xs text-rose-200/80">Edición especial conmemorativa preparada para celebrar con tus seres queridos.</p>
                  </div>
                </div>
              </div>
            )}

            {/* Family & Baby Space with Amenities & Child Safety */}
            {event.familyDetails?.isFamilyEvent && (
              <div className="my-6 rounded-3xl border border-pink-500/30 bg-gradient-to-br from-pink-950/30 via-slate-900 to-purple-950/20 p-6 shadow-xl backdrop-blur-md">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-pink-500/20 text-pink-400 border border-pink-500/30">
                    <Baby className="h-6 w-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-pink-500/20 px-2.5 py-0.5 text-xs font-bold text-pink-300 border border-pink-500/30">
                        Espacio Infantil & Familia Protegida
                      </span>
                      {event.familyDetails.ageMinMonths !== undefined && (
                        <span className="rounded-full bg-slate-800 px-2 py-0.5 text-xs font-medium text-slate-300 border border-slate-700">
                          Edad: {event.familyDetails.ageMinMonths} a {event.familyDetails.ageMaxMonths || 36} meses
                        </span>
                      )}
                    </div>
                    <h3 className="text-lg font-bold text-white mt-1">Amenidades para Padres, Madres & Bebés</h3>

                    <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2">
                      {event.familyDetails.nursingRoomAvailable && (
                        <div className="flex items-center gap-2 rounded-xl bg-slate-800/60 p-2.5 text-xs text-slate-200 border border-slate-700/50">
                          <span>🤱</span> Sala de Lactancia Privada
                        </div>
                      )}
                      {event.familyDetails.diaperChangingStation && (
                        <div className="flex items-center gap-2 rounded-xl bg-slate-800/60 p-2.5 text-xs text-slate-200 border border-slate-700/50">
                          <span>🚼</span> Cambiador de Pañales
                        </div>
                      )}
                      {event.familyDetails.strollerAccessible && (
                        <div className="flex items-center gap-2 rounded-xl bg-slate-800/60 p-2.5 text-xs text-slate-200 border border-slate-700/50">
                          <span>👶</span> Acceso con Cochecito
                        </div>
                      )}
                    </div>

                    {event.familyDetails.safetyNotes && (
                      <div className="mt-3 flex items-start gap-2 rounded-xl bg-pink-950/40 p-3 text-xs text-pink-200 border border-pink-500/20">
                        <ShieldCheckIcon className="h-4 w-4 shrink-0 text-pink-400 mt-0.5" />
                        <div>
                          <strong>Normas de Seguridad Infantil:</strong> {event.familyDetails.safetyNotes}
                          {event.familyDetails.supervisionRequired && (
                            <span className="block mt-1 font-semibold text-pink-300">
                              ⚠️ Acompañamiento obligatorio y permanente de tutores legales.
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Health & Clinical Research Protocol Panel */}
            {event.healthDetails?.isHealthInitiative && (
              <div className="my-6 rounded-3xl border border-emerald-500/30 bg-gradient-to-br from-emerald-950/30 via-slate-900 to-teal-950/20 p-6 shadow-xl backdrop-blur-md">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    <Stethoscope className="h-6 w-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-xs font-bold text-emerald-300 border border-emerald-500/30">
                        {event.healthDetails.healthType === 'clinical_trial_info'
                          ? 'Ficha Informativa de Investigación Clínica'
                          : 'Iniciativa de Salud Comunitaria'}
                      </span>
                      {event.healthDetails.hospitalOrInstitution && (
                        <span className="rounded-full bg-slate-800 px-2.5 py-0.5 text-xs font-medium text-slate-300 border border-slate-700">
                          🏛️ {event.healthDetails.hospitalOrInstitution}
                        </span>
                      )}
                    </div>

                    <h3 className="text-lg font-bold text-white mt-1">
                      {event.healthDetails.healthType === 'clinical_trial_info'
                        ? 'Protocolo de Investigación Científica Acreditado'
                        : 'Atención Médica Comunitaria & Preventiva Gratuita'}
                    </h3>

                    {event.healthDetails.ethicsApprovalRef && (
                      <p className="mt-2 text-xs font-mono text-emerald-400">
                        Código / Aprobación Bioética: {event.healthDetails.ethicsApprovalRef}
                        {event.healthDetails.clinicalTrialId && ` · NCT: ${event.healthDetails.clinicalTrialId}`}
                      </p>
                    )}

                    <div className="mt-3 rounded-xl bg-slate-900/80 p-3.5 text-xs text-slate-300 border border-slate-800 space-y-1.5">
                      <div className="flex items-center gap-1.5 font-semibold text-emerald-300">
                        <HeartHandshake className="h-4 w-4" /> Disclaimer Médico Oficial & Protocolo Ético:
                      </div>
                      <p className="leading-relaxed text-slate-400">
                        {event.healthDetails.medicalDisclaimer ||
                          'Esta publicación es informativa. No constituye prescripción médica directa ni intermediación comercial. La elegibilidad y participación clínica están estrictamente sujetas a evaluación médica formal y consentimiento informado.'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="glass border-white/10 rounded-3xl p-8 mb-8 backdrop-blur-xl bg-white/5 shadow-2xl"
            >
              <h2 className="text-3xl font-extrabold text-foreground mb-6">
                Descripción
              </h2>
              <div className={`text-lg text-muted-foreground leading-relaxed ${!showFullDescription && 'line-clamp-6'}`}>
                {event.description}
              </div>
              {event.description.length > 300 && (
                <button
                  onClick={() => setShowFullDescription(!showFullDescription)}
                  className="mt-6 text-primary hover:text-primary/80 font-bold flex items-center gap-2 transition-colors"
                >
                  {showFullDescription ? 'Ver menos' : 'Ver más'}
                </button>
              )}
            </motion.div>

            {(event.tags.length > 0 || event.accessibility.length > 0) && (
              <EventSectionDisclosure title="Detalles del evento" description="Etiquetas, inclusión y accesibilidad.">
            {/* Tags */}
            {event.tags.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="glass border-white/10 rounded-3xl p-8 mb-8 backdrop-blur-xl bg-white/5 shadow-xl"
              >
                <h3 className="text-2xl font-extrabold text-foreground mb-6">
                  Etiquetas
                </h3>
                <div className="flex flex-wrap gap-3">
                  {(event.tags || []).map((tag: string, index: number) => (
                    <span
                      key={index}
                      className="px-4 py-2 glass bg-white/10 border-white/20 text-foreground rounded-xl text-sm font-bold flex items-center gap-2 shadow-sm"
                    >
                      <Tag className="w-4 h-4 text-primary" />
                      {tag}
                    </span>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Accessibility */}
            {event.accessibility && event.accessibility.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
                className="glass border-white/10 rounded-3xl p-8 mb-8 backdrop-blur-xl bg-white/5 shadow-xl"
              >
                <h3 className="text-2xl font-extrabold text-foreground mb-6">
                  Inclusión y Accesibilidad
                </h3>
                <div className="flex flex-wrap gap-3">
                  {(event.accessibility || []).map((acc: string, index: number) => (
                    <span
                      key={index}
                      className="px-4 py-2 bg-blue-500/10 border border-blue-500/30 text-blue-400 rounded-xl text-sm font-bold shadow-sm"
                    >
                      {getAccessibilityIcon(acc)}
                    </span>
                  ))}
                </div>
              </motion.div>
            )}

              </EventSectionDisclosure>
            )}

            {/* Location */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="glass border-white/10 rounded-3xl p-8 mb-8 backdrop-blur-xl bg-white/5 shadow-xl"
            >
              <h3 className="text-2xl font-extrabold text-foreground mb-6">
                {event.isVirtual ? 'Transmisión Virtual' : 'Ubicación Física'}
              </h3>

              {event.isVirtual ? (
                <>
                  <VirtualStagePlayer
                    eventId={String(id)}
                    eventTitle={event.title}
                    eventDate={event.date}
                    eventEndDate={event.endDate}
                    virtualPlatform={event.virtualPlatform}
                    virtualLink={event.virtualLink}
                    virtualDetails={event.virtualDetails}
                    isAttendee={Boolean(optimisticState.isAttending ?? event.isAttending)}
                    onAttendRequest={handleJoinEvent}
                  />
                  <UniversalTimezoneClock eventDate={event.date} isVirtual={true} />
                </>
              ) : (
                <>
                  <div className="space-y-2 mb-6">
                    {event.location?.venue && (
                      <div className="text-xl font-bold text-foreground">
                        {event.location.venue}
                      </div>
                    )}
                    <div className="text-lg text-muted-foreground">
                      {(event as any).isSecretLocation && !(optimisticState.isAttending ?? event.isAttending) ? '🔒 Ubicación secreta · Únete al evento para revelar la dirección exacta' : event.location?.address}
                    </div>
                  </div>
                  {mapHref ? (
                    <a href={mapHref} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-3 rounded-2xl border border-primary/25 bg-primary/10 px-5 py-6 font-semibold text-primary transition hover:bg-primary/20">
                      <MapPin className="h-6 w-6" />
                      Abrir ubicación en Google Maps
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  ) : (
                    <p className="rounded-2xl border border-white/10 p-5 text-sm text-muted-foreground">
                      {event.isSecretLocation && !event.isAttending ? 'El mapa estará disponible cuando se confirme tu asistencia.' : 'El organizador publicará la ubicación cuando esté confirmada.'}
                    </p>
                  )}
                  <UniversalTimezoneClock eventDate={event.date} isVirtual={false} />
                </>
              )}
            </motion.div>

            {/* Mobility & Hospitality Concierge */}
            <EventHospitalityWidget event={event as any} onOpenSerrucho={() => setIsSerruchoModalOpen(true)} />

            {/* Clima Satelital Open-Meteo en Vivo */}
            <div className="my-6">
              <EventWeatherCard coordinates={event.location?.coordinates} locationName={event.location?.venue || event.location?.address} />
            </div>

            {/* Navegación 1-Tap Waze, Google Maps & Apple Maps */}
            <div className="my-6">
              <EventNavigationPills coordinates={event.location?.coordinates} address={event.location?.address} title={event.title} />
            </div>

            {/* Agendar en Google Calendar & Apple iCal */}
            <div className="my-6">
              <EventCalendarButtons title={event.title} description={event.description} date={event.date} endDate={event.endDate} location={event.location?.address} />
            </div>

            {/* Asistencia Rápida, Politur y Transporte Oficial RD */}
            <div className="my-6">
              {event.location?.countryCode === 'DO' && <EventTransitEmergencyPanel coordinates={event.location?.coordinates} locationName={event.location?.address} />}
            </div>

            {/* Trip & Outing Budget Calculator with Serrucho Split */}
            <TripBudgetCalculator
              eventId={String(id)}
              eventTitle={event.title}
              eventCity={(event.location as any)?.city || event.location?.venue || 'Santo Domingo'}
              eventCountry={(event.location as any)?.country || 'República Dominicana'}
              eventPrice={event.price}
              startDate={event.date}
              endDate={event.endDate}
            />

            {/* Cultural Buddy & Solo Traveler / Nomad Table */}
            <SoloTravelerBuddySection eventId={String(id)} />

            <EventSectionDisclosure title="Música y compañía" description="Propón canciones y encuentra personas con quienes ir.">
              <EventSongVotingSection eventId={String(id)} />
              <CoroMatchSection key={`${id}:${identity}`} eventId={String(id)} eventTitle={event.title} />
            </EventSectionDisclosure>

            <EventContextSections
              key={`${id}:${identity}:${phase}`}
              event={event}
              phase={phase}
              isOrganizer={isOrganizer}
              onUpdate={() => { void refetch() }}
            />

            {/* Smart Plan Chaining - The Official After-Party */}
            <div className="my-6">
              <AfterPartySection
                eventId={String(id)}
                eventCoordinates={event.location?.coordinates}
                venueName={event.location?.venue}
                city={(event.location as any)?.city || event.location?.venue || 'Santo Domingo'}
              />
            </div>

            {/* Live Event Ephemeral Wall */}
            <div className="my-6">
              <LiveEventWall
                eventId={String(id)}
                eventTitle={event.title}
                isAttendee={Boolean(optimisticState.isAttending ?? event.isAttending)}
              />
            </div>

            {/* Verified Organizer / Host Operations Panel */}
            {isOrganizer && (
              <div className="my-6">
                <HostOperationsPanel
                  eventId={String(id)}
                  eventTitle={event.title}
                  confirmedCount={verifiedRegistrations || event.attendeesCount || 0}
                  maxCapacity={event.maxAttendees || 200}
                />
              </div>
            )}

            <EventSectionDisclosure title="Preguntas y conversación" description="Consulta dudas o conversa con la comunidad del evento.">
            {/* Comments Section */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="glass border-white/10 rounded-3xl p-8 backdrop-blur-xl bg-white/5 shadow-xl"
            >
              <CommentSection
                targetType="event"
                targetId={params.id as string}
                currentUserId={user?.id}
                initialCommentsCount={0}
              />
            </motion.div>
            </EventSectionDisclosure>
          </div>

          {/* Sidebar */}
          <div className="lg:col-start-3 lg:row-start-2">
            {/* Event Creator */}
            {event.publicSource ? <ImportedEventSourceNotice source={event.publicSource} externalUrl={event.externalUrl} organizer={event.organizer} /> : <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="glass border-white/10 rounded-3xl p-6 lg:p-8 mb-8 backdrop-blur-xl bg-white/5 shadow-xl"
            >
              <h3 className="text-xl font-extrabold text-foreground mb-6">
                Organizador
              </h3>
              <div className="flex items-center gap-4 mb-6">
                <button
                  onClick={() => router.push(`/users/${event.createdBy._id}`)}
                  disabled={!hasOrganizer}
                  className="flex flex-col md:flex-row items-center md:items-start gap-4 hover:bg-white/5 rounded-2xl p-4 -m-4 transition-colors w-full text-left"
                >
                  <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center text-primary-foreground font-extrabold text-xl shadow-lg flex-shrink-0">
                    {event.createdBy.avatar ? (
                      <img
                        src={getImageUrl(event.createdBy.avatar)}
                        alt={`${event.createdBy.firstName} ${event.createdBy.lastName}`}
                        className="w-full h-full rounded-full object-cover"
                      />
                    ) : (
                      event.createdBy.firstName?.[0] || 'O'
                    )}
                  </div>
                  <div className="text-left w-full min-w-0">
                    <div className="font-extrabold text-foreground text-lg mb-0.5 truncate flex items-center gap-1.5 flex-wrap">
                      <span>{event.createdBy.firstName} {event.createdBy.lastName}</span>
                      {(event.createdBy.isOrganizerVerified || event.createdBy.verified) && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-bold rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                          <ShieldCheck className="w-3.5 h-3.5" />
                          Verificado
                        </span>
                      )}
                    </div>
                    <div className="text-sm font-medium text-primary truncate">
                      @{event.createdBy.username}
                      {event.createdBy.organizationName && (
                        <span className="text-muted-foreground ml-1 font-normal">· {event.createdBy.organizationName}</span>
                      )}
                    </div>
                  </div>
                </button>
              </div>

              {/* Anti-fraud banner for paid events without organizer verification */}
              {(event.price?.amount || 0) > 0 && !(event.createdBy?.isOrganizerVerified || event.createdBy?.verified) && (
                <div className="mt-3 p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/25 text-amber-200 text-xs leading-relaxed space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-amber-400 text-xs">
                    <ShieldAlert className="w-4 h-4 flex-shrink-0" />
                    Aviso de Seguridad Anti-Fraude
                  </div>
                  <p>
                    Organizador no verificado aún con documento oficial en EventNow. Te sugerimos comprar únicamente en taquilla física o validar sus redes oficiales antes de transferir dinero.
                  </p>
                </div>
              )}

              {/* Verified organizer assurance banner */}
              {(event.createdBy?.isOrganizerVerified || event.createdBy?.verified) && (
                <div className="mt-3 p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-200 text-xs flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  <span>Identidad y organización verificadas oficialmente por el equipo de EventNow.</span>
                </div>
              )}
              <div className="mt-4 space-y-2">
                {isAuthenticated && isOrganizer && (
                  <><button onClick={() => router.push(`/events/${event._id}/check-in`)} className="w-full rounded-xl bg-primary px-4 py-3 font-semibold text-primary-foreground">
                    Control de entradas
                  </button><button onClick={() => router.push(`/events/${event._id}/edit`)} className="w-full rounded-xl glass bg-white/10 hover:bg-white/20 border border-white/15 px-4 py-3 font-semibold text-foreground flex items-center justify-center gap-2 transition-all"><Edit className="w-4 h-4" />Editar evento</button><button onClick={() => setIsBoostModalOpen(true)} className="w-full rounded-xl bg-amber-500 hover:bg-amber-600 px-4 py-3 font-black text-gray-950 flex items-center justify-center gap-2 transition-all shadow-lg shadow-amber-500/20"><Rocket className="w-4 h-4" />Destacar Evento (RD$)</button></>
                )}
                {isAuthenticated && hasOrganizer && !isOrganizer && (
                  <FollowButton
                    userId={event.createdBy._id}
                    user={{
                      firstName: event.createdBy.firstName,
                      lastName: event.createdBy.lastName,
                      username: event.createdBy.username
                    }}
                    className="w-full"
                    size="sm"
                  />
                )}
                <button
                  onClick={() => router.push(`/users/${event.createdBy._id}`)}
                  disabled={!hasOrganizer}
                  className="w-full px-4 py-3 glass bg-white/5 border-white/10 text-foreground rounded-xl font-bold hover:bg-white/10 transition-colors flex items-center justify-center gap-3"
                >
                  <User className="w-5 h-5" />
                  Ver Perfil
                </button>
                <button
                  onClick={() => setShowMoreEvents(!showMoreEvents)}
                  disabled={!hasOrganizer}
                  className="w-full px-4 py-3 glass bg-primary/20 border-primary/30 text-primary-foreground rounded-xl font-bold hover:bg-primary/30 transition-colors flex items-center justify-center gap-3"
                >
                  <Calendar className="w-5 h-5" />
                  {showMoreEvents ? 'Ocultar eventos' : 'Ver más eventos'}
                </button>
                <button
                  onClick={() => isAuthenticated ? router.push(`/messages?userId=${event.createdBy._id}`) : signIn()}
                  disabled={!hasOrganizer}
                  className="w-full px-4 py-3 glass bg-secondary/20 border-secondary/30 text-secondary-foreground rounded-xl font-bold hover:bg-secondary/30 transition-colors flex items-center justify-center gap-3"
                >
                  <MessageCircle className="w-5 h-5" />
                  Contactar
                </button>
              </div>
            </motion.div>}

            {/* Event Stats */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="glass border-white/10 rounded-3xl p-6 lg:p-8 backdrop-blur-xl bg-white/5 shadow-xl"
            >
              <h3 className="text-xl font-extrabold text-foreground mb-6">
                Estadísticas
              </h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center p-3 glass bg-black/10 rounded-xl border-white/5">
                  <span className="text-muted-foreground font-medium">Inscripciones confirmadas</span>
                  <span className="font-extrabold text-foreground text-lg">{verifiedRegistrations ?? 'Por confirmar'}</span>
                </div>
                <div className="flex justify-between items-center p-3 glass bg-black/10 rounded-xl border-white/5">
                  <span className="text-muted-foreground font-medium">Capacidad</span>
                  <span className="font-extrabold text-foreground text-lg">{event.maxAttendees > 0 ? event.maxAttendees : 'Sin límite indicado'}</span>
                </div>
                <div className="flex justify-between items-center p-3 glass bg-black/10 rounded-xl border-white/5">
                  <span className="text-muted-foreground font-medium">Disponibles</span>
                  <span className="font-extrabold text-primary text-lg">
                    {event.maxAttendees > 0 ? (verifiedRegistrations === undefined ? 'Por confirmar' : Math.max(0, event.maxAttendees - verifiedRegistrations)) : 'Sin límite indicado'}
                  </span>
                </div>

                {/* Progress bar */}
                <div className="mt-6 pt-6 border-t border-white/10">
                  <div className="flex justify-between text-sm text-muted-foreground mb-3 font-bold uppercase tracking-wider">
                    <span>Ocupación</span>
                    <span className="text-primary">{Math.round(occupancy)}%</span>
                  </div>
                  <div className="w-full glass bg-black/30 rounded-full h-3 overflow-hidden border border-white/5">
                    <div
                      className="bg-primary h-full rounded-full transition-all duration-1000 ease-out"
                      style={{ width: `${occupancy}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Organizer's Other Events Section */}
        <AnimatePresence>
          {showMoreEvents && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="mt-8"
            >
              <div className="container-padding">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="glass border-white/10 rounded-3xl p-8 backdrop-blur-xl bg-white/5 shadow-2xl"
                >
                  <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4">
                    <h2 className="text-3xl font-extrabold text-foreground">
                      Más eventos de {event.createdBy.firstName}
                    </h2>
                    <button
                      onClick={() => router.push(`/users/${event.createdBy._id}`)}
                  disabled={!hasOrganizer}
                      className="text-primary hover:text-primary/80 font-bold transition-colors whitespace-nowrap"
                    >
                      Ver todos →
                    </button>
                  </div>

                  {isLoadingOrganizerEvents ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {Array.from({ length: 3 }).map((_, index) => (
                        <div key={index} className="glass skeleton rounded-3xl p-4 overflow-hidden">
                          <div className="bg-black/20 rounded-2xl h-40 mb-4"></div>
                          <div className="h-5 bg-black/20 rounded mb-3 w-3/4"></div>
                          <div className="h-4 bg-black/20 rounded mb-2 w-1/2"></div>
                          <div className="h-4 bg-black/20 rounded w-1/3 mt-4"></div>
                        </div>
                      ))}
                    </div>
                  ) : organizerEvents && organizerEvents.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {(organizerEvents || []).slice(0, 3).map((organizerEvent: Event) => (
                        <motion.div
                          key={organizerEvent._id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          whileHover={{ y: -6 }}
                          className="glass border-white/10 bg-white/5 rounded-3xl overflow-hidden cursor-pointer group shadow-xl hover:shadow-2xl hover:shadow-primary/20 transition-all duration-300"
                          onClick={() => router.push(`/events/${organizerEvent._id}`)}
                        >
                          {organizerEvent.images && organizerEvent.images.length > 0 && (
                            <div className="relative h-40 overflow-hidden">
                              <img
                                src={getImageUrl(organizerEvent.images[0])}
                                alt={organizerEvent.title}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              />
                              <div className="absolute top-3 right-3">
                                <span className="px-3 py-1 bg-primary/90 backdrop-blur-md text-white text-xs font-bold rounded-full shadow-lg">
                                  {organizerEvent.category}
                                </span>
                              </div>
                            </div>
                          )}
                          <div className="p-5">
                            <h3 className="font-extrabold text-foreground text-lg mb-3 line-clamp-2 group-hover:text-primary transition-colors">
                              {organizerEvent.title}
                            </h3>
                            <div className="space-y-2 text-sm text-muted-foreground font-medium mb-4">
                              <div className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                <span>{formatDate(organizerEvent.date, organizerEvent.timeZone)}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <MapPin className="w-3 h-3" />
                                <span className="truncate">{organizerEvent.location?.venue || organizerEvent.location?.address || 'Ubicación por confirmar'}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Users className="w-3 h-3" />
                                <span>{organizerEvent.attendeesCount}/{organizerEvent.maxAttendees} asistentes</span>
                              </div>
                            </div>
                            <div className="pt-4 border-t border-white/10 flex items-center justify-between">
                              <span className="font-extrabold text-primary text-lg">
                                {formatPrice(organizerEvent.price)}
                              </span>
                              <span className="text-xs font-bold text-muted-foreground group-hover:text-primary transition-colors uppercase tracking-wider">
                                Ver más →
                              </span>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12 glass border-white/10 rounded-3xl bg-white/5">
                      <Calendar className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
                      <p className="text-lg text-muted-foreground font-medium">
                        Este organizador no tiene otros eventos disponibles.
                      </p>
                    </div>
                  )}
                </motion.div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {event && (
          <>
            {exportEvent && <StoryExportModal
              isOpen={isStoryModalOpen}
              onClose={() => setIsStoryModalOpen(false)}
              event={exportEvent}
            />}
            <SerruchoModal
              key={id}
              isOpen={isSerruchoModalOpen}
              onClose={() => setIsSerruchoModalOpen(false)}
              event={event}
            />
            {exportEvent && <FlyerExportModal
              isOpen={isFlyerModalOpen}
              onClose={() => setIsFlyerModalOpen(false)}
              event={exportEvent}
            />}
            <EventStoryGeneratorModal
              isOpen={isCanvasStoryOpen}
              onClose={() => setIsCanvasStoryOpen(false)}
              event={{
                title: event.title,
                date: event.date,
                location: event.location,
                imageUrl: (event.images?.[0] as any)?.url || (event.images?.[0] as any)
              }}
            />
            <BoostEventModal
              isOpen={isBoostModalOpen}
              onClose={() => setIsBoostModalOpen(false)}
              eventId={String(id)}
              eventTitle={event.title}
            />
            <TouristGuideModal
              isOpen={isTouristModalOpen}
              onClose={() => setIsTouristModalOpen(false)}
              city={(event.location as any)?.city || event.location?.venue || 'Santo Domingo'}
              country={(event.location as any)?.country || 'República Dominicana'}
            />
          </>
        )}
      </div>
    </div>
  )
}
