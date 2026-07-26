'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter, useParams } from 'next/navigation'
import { Calendar, Clock, MapPin, Users, Star as DollarSign, Heart, Share, ChevronLeft, User, MessageCircle, Star, CheckCircle, XCircle, AlertTriangle, Globe, Video, Hand, Dog, Tag } from 'lucide-react'
const UserPlus = User
import { apiClient } from '@/lib/api/client'
import { useAuthStore } from '@/stores/authStore'
import { FollowButton } from '@/components/social/FollowButton'
import toast from 'react-hot-toast'
import StoriesBar from '@/components/stories/StoriesBar'
import { CommentSection } from '@/components/comments'
import { getImageUrl } from '@/lib/utils'

interface Event {
  _id: string
  title: string
  description: string
  category: string
  date: string
  location: {
    type: string
    coordinates: [number, number]
    address: string
    venue?: string
  }
  price: {
    amount: number
    currency: string
  }
  maxAttendees: number
  attendeesCount: number
  createdBy: {
    _id: string
    username: string
    firstName: string
    lastName: string
    avatar?: string
  }
  tags: string[]
  images: string[]
  isAttending?: boolean
  isFavorite?: boolean
  isVirtual?: boolean
  virtualLink?: string
  accessibility?: string[]
}

export default function EventDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter()
  const queryClient = useQueryClient()
  const { user, isAuthenticated } = useAuthStore()
  const [showFullDescription, setShowFullDescription] = useState(false)
  const [optimisticState, setOptimisticState] = useState<{
    isAttending?: boolean
    isFavorite?: boolean
  }>({})

  const [showMoreEvents, setShowMoreEvents] = useState(false)

  // Redirect if invalid ID
  useEffect(() => {
    if (!params.id || params.id === 'undefined') {
      router.push('/events')
    }
  }, [params.id, router])

  // Fetch event details
  const { data: event, isLoading, error, refetch } = useQuery({
    queryKey: ['event', params.id],
    queryFn: async () => {
      if (!params.id || params.id === 'undefined') {
        throw new Error('Event ID is required')
      }
      const response = await apiClient.get(`/events/${params.id}`)
      return response.data.event
    },
    enabled: !!params.id && params.id !== 'undefined', // Only run query if we have a valid ID
    staleTime: 0, // Always refetch to get latest state
    gcTime: 0  // Don't cache to ensure fresh data
  })

  // Fetch more events from the same organizer
  const { data: organizerEvents, isLoading: isLoadingOrganizerEvents } = useQuery({
    queryKey: ['organizer-events', event?.createdBy._id, params.id],
    queryFn: async () => {
      if (!event?.createdBy._id) return []
      const response = await apiClient.get(`/events?createdBy=${event.createdBy._id}&limit=6`)
      // Filter out the current event
      return response.data.events.filter((e: Event) => e._id !== params.id)
    },
    enabled: !!event?.createdBy._id && showMoreEvents
  })

  // Join event mutation
  const joinEventMutation = useMutation({
    mutationFn: async (eventId: string) => {
      const response = await apiClient.post(`/events/${eventId}/join`)
      return response.data
    },
    onSuccess: () => {
      // Force immediate refetch to get updated state
      refetch().then(result => {
        console.log('🔍 Refetch result after JOIN:', result.data)
        console.log('🔍 Event isAttending:', result.data?.isAttending)
      })
      // Clear optimistic state
      setOptimisticState(prev => ({ ...prev, isAttending: undefined }))
      toast.success('Te has unido al evento exitosamente')
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || error.message
      if (message?.includes('already') || message?.includes('ya')) {
        toast.error('Ya estás unido a este evento')
        // Force refresh to get updated state
        refetch()
      } else {
        toast.error('Error al unirse al evento')
      }
      // Clear optimistic state on error
      setOptimisticState(prev => ({ ...prev, isAttending: undefined }))
    }
  })

  // Leave event mutation
  const leaveEventMutation = useMutation({
    mutationFn: async (eventId: string) => {
      const response = await apiClient.post(`/events/${eventId}/leave`)
      return response.data
    },
    onSuccess: () => {
      // Force immediate refetch to get updated state
      refetch()
      // Clear optimistic state
      setOptimisticState(prev => ({ ...prev, isAttending: undefined }))
      toast.success('Has salido del evento')
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || error.message
      toast.error(message || 'Error al salir del evento')
    }
  })

  // Toggle favorite mutation
  const toggleFavoriteMutation = useMutation({
    mutationFn: async (eventId: string) => {
      const response = await apiClient.post(`/events/${eventId}/favorite`)
      return response.data
    },
    onSuccess: () => {
      // Force immediate refetch to get updated state
      refetch().then(result => {
        console.log('🔍 Refetch result after FAVORITE:', result.data)
      })
      // Clear optimistic state
      setOptimisticState(prev => ({ ...prev, isFavorite: undefined }))
      toast.success(event?.isFavorite ? 'Eliminado de favoritos' : 'Agregado a favoritos')
    },
    onError: () => {
      toast.error('Error al actualizar favoritos')
    }
  })

  const handleJoinEvent = () => {
    if (!isAuthenticated) {
      toast.error('Debes iniciar sesión para unirte al evento')
      router.push('/login')
      return
    }
    // Optimistic update
    setOptimisticState(prev => ({ ...prev, isAttending: true }))
    joinEventMutation.mutate(params.id as string)
  }

  const handleLeaveEvent = () => {
    // Optimistic update
    setOptimisticState(prev => ({ ...prev, isAttending: false }))
    leaveEventMutation.mutate(params.id as string)
  }

  const handleToggleFavorite = () => {
    if (!isAuthenticated) {
      toast.error('Debes iniciar sesión para agregar a favoritos')
      router.push('/login')
      return
    }
    // Optimistic update
    setOptimisticState(prev => ({ ...prev, isFavorite: !event?.isFavorite }))
    toggleFavoriteMutation.mutate(params.id as string)
  }

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: event?.title,
          text: event?.description,
          url: window.location.href
        })
      } catch (error) {
        console.log('Error sharing:', error)
      }
    } else {
      // Fallback to copy to clipboard
      navigator.clipboard.writeText(window.location.href)
      toast.success('Enlace copiado al portapapeles')
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatPrice = (price: { amount: number; currency: string }) => {
    if (price.amount === 0) return 'Gratis'
    return `${price.amount} ${price.currency}`
  }

  const getAttendanceStatus = () => {
    if (!event) return null
    const percentage = (event.attendeesCount / event.maxAttendees) * 100

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

  // Debug log
  console.log('🔍 Current event data:', event)
  console.log('🔍 Event isAttending:', event?.isAttending)
  console.log('🔍 Optimistic state:', optimisticState)

  if (error || !event) {
    return (
      <div className="min-h-screen bg-transparent flex items-center justify-center">
        <div className="text-center glass border-white/10 p-12 rounded-3xl backdrop-blur-md shadow-2xl max-w-md w-full mx-4">
          <XCircle className="w-20 h-20 text-red-500 mx-auto mb-6 opacity-80" />
          <h1 className="text-3xl font-extrabold text-foreground mb-3">
            Evento no encontrado
          </h1>
          <p className="text-lg text-muted-foreground mb-8">
            El evento que buscas no existe o ha sido eliminado.
          </p>
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

  return (
    <div className="min-h-screen bg-transparent pb-24">
      {/* Hero Section */}
      <div className="relative h-[60vh] lg:h-[70vh] bg-gradient-to-br from-primary/30 to-secondary/30">
        {event.images && event.images.length > 0 && (
          <>
            <img
              src={getImageUrl(event.images[0])}
              alt={event.title}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/10"></div>
          </>
        )}

        <div className="absolute inset-0 flex items-end">
          <div className="container-padding w-full">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-10 w-full"
            >
              <button
                onClick={() => router.back()}
                className="mb-6 flex items-center gap-2 px-4 py-2 glass bg-white/10 hover:bg-white/20 text-white rounded-full font-bold transition-all backdrop-blur-md border hover:border-white w-fit"
              >
                <ChevronLeft className="w-5 h-5" />
                Volver
              </button>

              <div className="flex items-center gap-3 mb-4">
                <span className="px-4 py-1.5 bg-primary/80 backdrop-blur-md border border-primary/50 text-white font-bold text-sm rounded-full shadow-lg shadow-primary/20">
                  {event.category}
                </span>
                {attendanceStatus && (
                  <span className={`flex items-center gap-1.5 px-4 py-1.5 bg-white/10 backdrop-blur-md border border-white/20 rounded-full text-sm font-bold text-white shadow-lg`}>
                    <attendanceStatus.icon className="w-4 h-4" />
                    {attendanceStatus.text}
                  </span>
                )}
              </div>

              <h1 className="text-5xl lg:text-7xl font-extrabold text-white mb-6 drop-shadow-2xl">
                {event.title}
              </h1>

              <div className="flex flex-wrap items-center gap-4 text-white font-medium">
                <div className="flex items-center gap-2 glass px-4 py-2 rounded-xl bg-white/10 border-white/20">
                  <Calendar className="w-5 h-5 text-primary-300" />
                  <span>{formatDate(event.date)}</span>
                </div>

                {event.isVirtual ? (
                  <div className="flex items-center gap-2 glass px-4 py-2 rounded-xl bg-purple-500/20 border-purple-500/30 text-purple-200">
                    <Video className="w-5 h-5" />
                    <span>Evento Virtual en Vivo</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 glass px-4 py-2 rounded-xl bg-white/10 border-white/20">
                    <MapPin className="w-5 h-5 text-primary-300" />
                    <span>{event.location?.venue || 'Ubicación'}</span>
                  </div>
                )}

                <div className="flex items-center gap-2 glass px-4 py-2 rounded-xl bg-white/10 border-white/20">
                  <Users className="w-5 h-5 text-primary-300" />
                  <span>{event.attendeesCount}/{event.maxAttendees} asistentes</span>
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
        {/* Stories Bar */}
        <StoriesBar eventId={params.id as string} event={event} />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
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
                  {event.tags.map((tag: string, index: number) => (
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
                  {event.accessibility.map((acc: string, index: number) => (
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
                <div className="space-y-4">
                  <div className="flex items-center gap-4 bg-purple-500/10 p-6 rounded-2xl border border-purple-500/20">
                    <div className="p-4 bg-purple-500 rounded-xl"><Globe className="w-8 h-8 text-white" /></div>
                    <div>
                      <h4 className="text-xl font-bold text-foreground">Evento Digital</h4>
                      <p className="text-muted-foreground">{(optimisticState.isAttending ?? event.isAttending) ? 'El enlace de la videollamada está disponible:' : 'Únete al evento para ver el enlace privado.'}</p>
                    </div>
                  </div>
                  {(optimisticState.isAttending ?? event.isAttending) && event.virtualLink && (
                    <a href={event.virtualLink} target="_blank" rel="noopener noreferrer" className="block text-center w-full bg-purple-600 hover:bg-purple-700 text-white font-bold mb-4 py-4 rounded-xl transition-all shadow-lg shadow-purple-500/30 flex items-center justify-center gap-3">
                      <Video className="w-5 h-5" />
                      Ingresar a la Sala / Streaming
                    </a>
                  )}
                </div>
              ) : (
                <>
                  <div className="space-y-2 mb-6">
                    {event.location?.venue && (
                      <div className="text-xl font-bold text-foreground">
                        {event.location.venue}
                      </div>
                    )}
                    <div className="text-lg text-muted-foreground">
                      {event.location?.address}
                    </div>
                  </div>
                  {/* Placeholder for map */}
                  <div className="h-64 glass bg-black/20 rounded-2xl flex items-center justify-center border border-white/10 overflow-hidden relative group">
                    <MapPin className="w-16 h-16 text-muted-foreground/30 group-hover:scale-110 transition-transform duration-500" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
                  </div>
                </>
              )}
            </motion.div>

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
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            {/* Action Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="glass border-white/10 rounded-3xl p-6 lg:p-8 mb-8 backdrop-blur-xl bg-white/5 shadow-2xl sticky top-24"
            >
              <div className="space-y-4">
                <motion.div
                  key={(optimisticState.isAttending ?? event.isAttending) ? 'attending' : 'not-attending'}
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.2 }}
                >
                  {(isAuthenticated && (optimisticState.isAttending ?? event.isAttending)) ? (
                    <motion.button
                      onClick={handleLeaveEvent}
                      disabled={leaveEventMutation.isPending}
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
                      disabled={joinEventMutation.isPending || event.attendeesCount >= event.maxAttendees}
                      whileHover={{ scale: event.attendeesCount >= event.maxAttendees ? 1 : 1.02 }}
                      whileTap={{ scale: event.attendeesCount >= event.maxAttendees ? 1 : 0.98 }}
                      className="w-full px-6 py-4 bg-primary hover:bg-primary/90 text-primary-foreground rounded-2xl font-bold text-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 shadow-xl shadow-primary/30"
                    >
                      {joinEventMutation.isPending ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          Uniéndose...
                        </>
                      ) : event.attendeesCount >= event.maxAttendees ? (
                        <>
                          <AlertTriangle className="w-5 h-5" />
                          Evento Lleno
                        </>
                      ) : (
                        <>
                          <CheckCircle className="w-5 h-5" />
                          Unirse al Evento
                        </>
                      )}
                    </motion.button>
                  )}
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
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="flex-1 px-4 py-4 glass bg-white/5 border border-white/10 text-foreground rounded-2xl font-bold text-base hover:bg-white/10 transition-all duration-300 flex items-center justify-center gap-3"
                  >
                    <Share className="w-5 h-5" />
                    Compartir
                  </motion.button>
                </div>
              </div>
            </motion.div>

            {/* Event Creator */}
            <motion.div
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
                      event.createdBy.firstName[0]
                    )}
                  </div>
                  <div className="text-left w-full">
                    <div className="font-extrabold text-foreground text-lg mb-0.5 truncate">
                      {event.createdBy.firstName} {event.createdBy.lastName}
                    </div>
                    <div className="text-sm font-medium text-primary">
                      @{event.createdBy.username}
                    </div>
                  </div>
                </button>
              </div>
              <div className="mt-4 space-y-2">
                {isAuthenticated && event.createdBy._id !== user?.id && (
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
                  className="w-full px-4 py-3 glass bg-white/5 border-white/10 text-foreground rounded-xl font-bold hover:bg-white/10 transition-colors flex items-center justify-center gap-3"
                >
                  <User className="w-5 h-5" />
                  Ver Perfil
                </button>
                <button
                  onClick={() => setShowMoreEvents(!showMoreEvents)}
                  className="w-full px-4 py-3 glass bg-primary/20 border-primary/30 text-primary-foreground rounded-xl font-bold hover:bg-primary/30 transition-colors flex items-center justify-center gap-3"
                >
                  <Calendar className="w-5 h-5" />
                  {showMoreEvents ? 'Ocultar eventos' : 'Ver más eventos'}
                </button>
                <button
                  onClick={() => router.push(`/chat?userId=${event.createdBy._id}`)}
                  className="w-full px-4 py-3 glass bg-secondary/20 border-secondary/30 text-secondary-foreground rounded-xl font-bold hover:bg-secondary/30 transition-colors flex items-center justify-center gap-3"
                >
                  <MessageCircle className="w-5 h-5" />
                  Contactar
                </button>
              </div>
            </motion.div>

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
                  <span className="text-muted-foreground font-medium">Confirmados</span>
                  <span className="font-extrabold text-foreground text-lg">{event.attendeesCount}</span>
                </div>
                <div className="flex justify-between items-center p-3 glass bg-black/10 rounded-xl border-white/5">
                  <span className="text-muted-foreground font-medium">Capacidad</span>
                  <span className="font-extrabold text-foreground text-lg">{event.maxAttendees}</span>
                </div>
                <div className="flex justify-between items-center p-3 glass bg-black/10 rounded-xl border-white/5">
                  <span className="text-muted-foreground font-medium">Disponibles</span>
                  <span className="font-extrabold text-primary text-lg">
                    {event.maxAttendees - event.attendeesCount}
                  </span>
                </div>

                {/* Progress bar */}
                <div className="mt-6 pt-6 border-t border-white/10">
                  <div className="flex justify-between text-sm text-muted-foreground mb-3 font-bold uppercase tracking-wider">
                    <span>Ocupación</span>
                    <span className="text-primary">{Math.round((event.attendeesCount / event.maxAttendees) * 100)}%</span>
                  </div>
                  <div className="w-full glass bg-black/30 rounded-full h-3 overflow-hidden border border-white/5">
                    <div
                      className="bg-primary h-full rounded-full transition-all duration-1000 ease-out"
                      style={{ width: `${(event.attendeesCount / event.maxAttendees) * 100}%` }}
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
                      {organizerEvents.slice(0, 3).map((organizerEvent: Event) => (
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
                                <span>{formatDate(organizerEvent.date)}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <MapPin className="w-3 h-3" />
                                <span className="truncate">{organizerEvent.location.venue || organizerEvent.location.address}</span>
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
      </div>
    </div>
  )
}