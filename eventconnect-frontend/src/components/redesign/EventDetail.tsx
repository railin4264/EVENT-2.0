import { useState, useEffect } from 'react'
import { ChevronLeft, Calendar, MapPin, Users, Heart, Share, MessageCircle, Star, Clock, Loader2 } from 'lucide-react'
import { Button } from './ui/button'
import { Card } from './ui/card'
import { Badge } from './ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs'
import { ImageWithFallback } from './figma/ImageWithFallback'
import { CldImage } from 'next-cloudinary'
import { eventsService } from '@/lib/api/services'
import type { Event } from '@/types/models'
import toast from 'react-hot-toast'

interface EventDetailProps {
  eventId?: string
  onBack: () => void
}

export function EventDetail({ eventId, onBack }: EventDetailProps) {
  const [event, setEvent] = useState<Event | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [attendees, setAttendees] = useState<any[]>([])
  const [isAttending, setIsAttending] = useState(false)

  useEffect(() => {
    if (eventId) {
      loadEvent()
    } else {
      setIsLoading(false)
      toast.error('ID de evento no proporcionado')
    }
  }, [eventId])

  const loadEvent = async () => {
    if (!eventId) return

    setIsLoading(true)
    try {
      const event = await eventsService.getEventById(eventId)
      setEvent(event)

      // Load attendees
      const attendees = await eventsService.getEventAttendees(eventId)
      setAttendees(attendees)
    } catch (error) {
      console.error('Error loading event:', error)
      toast.error('Error al cargar el evento. Verifica la conexión con el backend.')
      setEvent(null)
    } finally {
      setIsLoading(false)
    }
  }

  const handleAttend = async () => {
    if (!event) return

    try {
      if (isAttending) {
        await eventsService.leaveEvent(event._id)
        toast.success('Has cancelado tu asistencia')
        setIsAttending(false)
      } else {
        await eventsService.joinEvent(event._id)
        toast.success('¡Registrado exitosamente!')
        setIsAttending(true)
      }
    } catch (error) {
      toast.error('Error al procesar tu solicitud')
    }
  }

  const handleShare = () => {
    if (navigator.share && event) {
      navigator.share({
        title: event.title,
        text: event.description,
        url: window.location.href
      })
    } else {
      navigator.clipboard.writeText(window.location.href)
      toast.success('Enlace copiado al portapapeles')
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
      </div>
    )
  }

  if (!event) {
    return (
      <div className="flex flex-col items-center justify-center h-96">
        <p className="text-white/70 mb-4">Evento no encontrado</p>
        <Button onClick={onBack}>Volver</Button>
      </div>
    )
  }

  const comments = [
    {
      user: "Alex Rivera",
      avatar: "AR",
      comment: "¡No puedo esperar! Los últimos eventos han sido increíbles 🔥",
      time: "hace 2h",
      likes: 12
    },
    {
      user: "Maria Santos",
      avatar: "MS",
      comment: "¿Alguien sabe si habrá food trucks? Me encanta la comida en estos eventos",
      time: "hace 4h",
      likes: 8
    },
    {
      user: "Carlos Tech",
      avatar: "CT",
      comment: "Esta va a ser épica 🎵",
      time: "hace 6h",
      likes: 15
    }
  ]

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center space-x-4 mb-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="text-white/70 hover:text-white hover:bg-white/10"
        >
          <ChevronLeft className="w-4 h-4 mr-2" />
          Volver
        </Button>
        <div className="flex items-center space-x-2">
          <Badge className="bg-violet-500/20 text-violet-300">{event.category}</Badge>
        </div>
      </div>

      {/* Hero Image */}
      <Card className="glass-card overflow-hidden mb-6">
        <div className="relative">
          {event.images?.[0] && (typeof event.images[0] === 'string' ? event.images[0] : event.images[0].url)?.includes('res.cloudinary.com') ? (
            <CldImage
              src={typeof event.images[0] === 'string' ? event.images[0] : event.images[0].url}
              alt={event.title}
              width={800}
              height={400}
              className="w-full h-96 object-cover"
            />
          ) : (
            <ImageWithFallback
              src={typeof event.images?.[0] === 'string' ? event.images[0] : event.images?.[0]?.url || '/placeholder-event.jpg'}
              alt={event.title}
              className="w-full h-96 object-cover"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

          {/* Event Info Overlay */}
          <div className="absolute bottom-0 left-0 right-0 p-8">
            <h1 className="text-4xl font-bold text-white mb-4">{event.title}</h1>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-white">
              <div className="flex items-center space-x-2">
                <Calendar className="w-5 h-5 text-blue-400" />
                <div>
                  <p className="text-sm text-white/70">Fecha</p>
                  <p className="font-medium">{new Date(event.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Clock className="w-5 h-5 text-green-400" />
                <div>
                  <p className="text-sm text-white/70">Hora</p>
                  <p className="font-medium">{new Date(event.date).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <MapPin className="w-5 h-5 text-pink-400" />
                <div>
                  <p className="text-sm text-white/70">Lugar</p>
                  <p className="font-medium">{event.location.city}</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">

                <div>
                  <p className="text-sm text-white/70">Precio</p>
                  <p className="font-medium">${typeof event.price === 'number' ? event.price : (event.price as any)?.amount || 0}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Floating Actions */}
          <div className="absolute top-4 right-4 flex space-x-2">
            <Button size="sm" variant="ghost" className="glass-card hover:bg-white/20" onClick={handleAttend}>
              <Heart className={`w-4 h-4 ${isAttending ? 'fill-pink-500 text-pink-500' : ''}`} />
            </Button>
            <Button size="sm" variant="ghost" className="glass-card hover:bg-white/20" onClick={handleShare}>
              <Share className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </Card>

      {/* Action Buttons */}
      <div className="flex space-x-4 mb-8">
        <Button
          size="lg"
          onClick={handleAttend}
          className={`flex-1 ${isAttending ? 'bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-700 hover:to-rose-700' : 'bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-700 hover:to-blue-700'} neon-glow-violet`}
        >
          {isAttending ? 'Cancelar asistencia' : 'Asistir al evento'}
        </Button>
        <Button
          size="lg"
          variant="outline"
          onClick={handleShare}
          className="border-pink-500/50 text-pink-300 hover:bg-pink-500/10"
        >
          Compartir evento
        </Button>
      </div>

      {/* Content Tabs */}
      <Tabs defaultValue="details" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 glass-card">
          <TabsTrigger value="details">Detalles</TabsTrigger>
          <TabsTrigger value="attendees">Asistentes</TabsTrigger>
          <TabsTrigger value="comments">Comentarios</TabsTrigger>
          <TabsTrigger value="location">Ubicación</TabsTrigger>
        </TabsList>

        <TabsContent value="details">
          <div className="grid gap-6">
            <Card className="glass-card p-6">
              <h3 className="text-xl font-bold text-white mb-4">Descripción</h3>
              <p className="text-white/80 leading-relaxed mb-6">{event.description}</p>

              <h4 className="text-lg font-medium text-white mb-4">Artistas destacados</h4>
              <div className="grid grid-cols-2 gap-4">
                {((event as any)?.artists || []).map((artist: any, index: number) => (
                  <div key={index} className="flex items-center space-x-3 p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-r from-violet-500 to-cyan-500 flex items-center justify-center">
                      <span className="text-white font-bold">🎵</span>
                    </div>
                    <div>
                      <p className="text-white font-medium">{artist}</p>
                      <p className="text-white/60 text-sm">DJ/Productor</p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="attendees">
          <Card className="glass-card p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-white">Asistentes confirmados</h3>
              <div className="flex items-center space-x-2 text-white/70">
                <Users className="w-5 h-5" />
                <span>{attendees.length.toLocaleString()}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
              {attendees.map((attendee, index) => (
                <div key={index} className="flex items-center space-x-3 p-3 rounded-lg hover:bg-white/5 transition-colors">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-r from-violet-500 to-cyan-500 flex items-center justify-center">
                    <span className="text-white font-bold">{attendee.avatar}</span>
                  </div>
                  <div>
                    <p className="text-white font-medium">{attendee.name}</p>
                    <p className="text-white/60 text-sm">Asistente</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="comments">
          <Card className="glass-card p-6">
            <h3 className="text-xl font-bold text-white mb-6">Comentarios</h3>

            <div className="space-y-6">
              {comments.map((comment, index) => (
                <div key={index} className="flex space-x-4">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-r from-violet-500 to-cyan-500 flex items-center justify-center flex-shrink-0">
                    <span className="text-white font-bold text-sm">{comment.avatar}</span>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <p className="text-white font-medium">{comment.user}</p>
                      <p className="text-white/50 text-sm">{comment.time}</p>
                    </div>
                    <p className="text-white/80 mb-2">{comment.comment}</p>
                    <div className="flex items-center space-x-4">
                      <button className="flex items-center space-x-1 text-white/60 hover:text-pink-400 transition-colors">
                        <Heart className="w-4 h-4" />
                        <span className="text-sm">{comment.likes}</span>
                      </button>
                      <button className="text-white/60 hover:text-white transition-colors text-sm">
                        Responder
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="location">
          <Card className="glass-card p-6">
            <h3 className="text-xl font-bold text-white mb-4">Ubicación</h3>
            <div className="space-y-4">
              <div>
                <p className="text-white font-medium">{event.location.city || 'Ciudad'}</p>
                <p className="text-white/70">{event.location.address}</p>
              </div>
              <div className="h-64 bg-gray-800 rounded-lg flex items-center justify-center">
                <p className="text-white/60">Mapa interactivo (próximamente)</p>
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}