import { useState, useEffect } from 'react'
import { Heart, MessageCircle, Share, MapPin, Calendar, Users, TrendingUp, Zap, Loader2 } from 'lucide-react'
import { Card } from './ui/card'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import { ImageWithFallback } from './figma/ImageWithFallback'
import { eventsService, usersService, gamificationService } from '@/lib/api/services'
import type { Event, User } from '@/types/models'
import toast from 'react-hot-toast'

export function Dashboard() {
  const [events, setEvents] = useState<Event[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [leaderboard, setLeaderboard] = useState<any[]>([])
  const [trendingTopics, setTrendingTopics] = useState<any[]>([])

  useEffect(() => {
    loadEvents()
  }, [])

  const loadEvents = async () => {
    setIsLoading(true)
    try {
      // Get events from backend
      const response = await eventsService.getEvents({
        page: 1,
        limit: 10,
        status: 'published',
      })

      if (response.success && response.data) {
        setEvents(response.data)
        
        // Calculate trending topics based on real events
        const categoryCounts: Record<string, number> = {}
        response.data.forEach(e => {
          categoryCounts[e.category] = (categoryCounts[e.category] || 0) + 1
        })
        const trending = Object.keys(categoryCounts).map(cat => ({
          name: getCategoryBadge(cat),
          events: categoryCounts[cat],
          trend: '+5%' 
        })).sort((a, b) => b.events - a.events).slice(0, 4)
        setTrendingTopics(trending)
      }

      try {
        const lbResponse = await gamificationService.getLeaderboard(5)
        if (lbResponse.success && lbResponse.data) {
          setLeaderboard(lbResponse.data)
        }
      } catch (e) {
        console.error('Failed to load leaderboard', e)
      }
    } catch (error: any) {
      console.error('Failed to load events:', error)
      toast.error('Error al cargar eventos. Verifica la conexión con el backend.')
      setEvents([])
    } finally {
      setIsLoading(false)
    }
  }

  const handleAttendEvent = async (eventId: string) => {
    try {
      await eventsService.attendEvent(eventId, 'attending')
      toast.success('¡Te has registrado al evento!')
      loadEvents() // Reload to update attendee count
    } catch (error) {
      toast.error('Error al registrarse al evento')
    }
  }

  const handleLikeEvent = async (eventId: string) => {
    try {
      await eventsService.toggleFavorite(eventId)
      toast.success('Evento agregado a favoritos')
      loadEvents()
    } catch (error) {
      toast.error('Error al dar like')
    }
  }

  const handleShareEvent = async (eventId: string) => {
    try {
      await eventsService.registerShare(eventId)
      toast.success('Enlace copiado al portapapeles')
    } catch (error) {
      console.error('Share error:', error)
    }
  }

  const formatEventDate = (date: Date) => {
    return new Date(date).toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short'
    })
  }

  const formatEventTime = (date: Date) => {
    return new Date(date).toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getCategoryBadge = (category: string) => {
    const categoryMap: Record<string, string> = {
      music: 'Música',
      food: 'Gastronomía',
      technology: 'Tecnología',
      sports: 'Deportes',
      art: 'Arte',
      business: 'Negocios',
      education: 'Educación',
      other: 'Otro'
    }
    return categoryMap[category] || category
  }

  const getOrganizerInfo = (event: Event) => {
    if (typeof event.createdBy === 'string') {
      return { name: 'Organizador', avatar: 'OR' }
    }
    return {
      name: `${event.createdBy.firstName} ${event.createdBy.lastName}`,
      avatar: event.createdBy.username.substring(0, 2).toUpperCase()
    }
  }



  return (
    <div className="grid grid-cols-12 gap-6 p-6">
      {/* Main Feed */}
      <div className="col-span-8 space-y-6">
        {/* Stories */}
        <Card className="glass-card p-6">
          <h3 className="text-white font-medium mb-4">Stories de eventos</h3>
          <div className="flex space-x-4 overflow-x-auto">
            <div className="flex-shrink-0 text-center cursor-pointer">
              <div className="w-16 h-16 rounded-full bg-gradient-to-r from-violet-500 to-pink-500 p-1">
                <div className="w-full h-full rounded-full bg-gray-800 flex items-center justify-center">
                  <span className="text-2xl">+</span>
                </div>
              </div>
              <p className="text-xs text-white/60 mt-2">Tu historia</p>
            </div>
            {['🎵', '🍕', '🚀', '🎨', '🏃'].map((emoji, index) => (
              <div key={index} className="flex-shrink-0 text-center cursor-pointer">
                <div className="w-16 h-16 rounded-full bg-gradient-to-r from-blue-500 to-cyan-500 p-1">
                  <div className="w-full h-full rounded-full bg-gray-700 flex items-center justify-center">
                    <span className="text-2xl">{emoji}</span>
                  </div>
                </div>
                <p className="text-xs text-white/60 mt-2">Live</p>
              </div>
            ))}
          </div>
        </Card>

        {/* Loading State */}
        {isLoading && (
          <Card className="glass-card p-12 flex items-center justify-center">
            <div className="text-center">
              <Loader2 className="w-12 h-12 text-violet-400 animate-spin mx-auto mb-4" />
              <p className="text-white/70">Cargando eventos...</p>
            </div>
          </Card>
        )}

        {/* Event Feed */}
        {!isLoading && events.map((event) => {
          const organizer = getOrganizerInfo(event)
          const eventImage = event.images[0]?.url || 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=1080'

          return (
            <Card key={event._id} className="glass-card hover-lift overflow-hidden">
              {/* Event Header */}
              <div className="p-6 pb-0">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-r from-violet-500 to-blue-500 flex items-center justify-center">
                      <span className="text-white font-bold text-sm">{organizer.avatar}</span>
                    </div>
                    <div>
                      <p className="text-white font-medium">{organizer.name}</p>
                      <p className="text-white/60 text-sm">Organizador</p>
                    </div>
                  </div>
                  <Badge className="bg-violet-500/20 text-violet-300">
                    {getCategoryBadge(event.category)}
                  </Badge>
                </div>
              </div>

              {/* Event Image */}
              <div className="relative">
                <ImageWithFallback
                  src={eventImage}
                  alt={event.title}
                  className="w-full h-64 object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                <div className="absolute bottom-4 left-4 right-4">
                  <h4 className="text-xl font-bold text-white mb-2">{event.title}</h4>
                  <div className="flex items-center space-x-4 text-white/80">
                    <div className="flex items-center space-x-1">
                      <Calendar className="w-4 h-4" />
                      <span className="text-sm">
                        {formatEventDate(event.date)} • {formatEventTime(event.date)}
                      </span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <MapPin className="w-4 h-4" />
                      <span className="text-sm">{event.location.venue || event.location.address}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Users className="w-4 h-4" />
                      <span className="text-sm">{event.attendeesCount.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Event Actions */}
              <div className="p-6 pt-4">
                <div className="flex items-center justify-between">
                  <div className="flex space-x-6">
                    <button
                      onClick={() => handleLikeEvent(event._id)}
                      className="flex items-center space-x-2 text-white/70 hover:text-pink-400 transition-colors"
                    >
                      <Heart className="w-5 h-5" />
                      <span>{event.likesCount || 0}</span>
                    </button>
                    <button className="flex items-center space-x-2 text-white/70 hover:text-blue-400 transition-colors">
                      <MessageCircle className="w-5 h-5" />
                      <span>{event.commentsCount || 0}</span>
                    </button>
                    <button
                      onClick={() => handleShareEvent(event._id)}
                      className="flex items-center space-x-2 text-white/70 hover:text-white transition-colors"
                    >
                      <Share className="w-5 h-5" />
                      <span>Compartir</span>
                    </button>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => handleAttendEvent(event._id)}
                    className="bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-700 hover:to-blue-700"
                  >
                    Asistir
                  </Button>
                </div>
              </div>
            </Card>
          )
        })}

        {/* Empty State */}
        {!isLoading && events.length === 0 && (
          <Card className="glass-card p-12 text-center">
            <p className="text-white/70 text-lg">No hay eventos disponibles</p>
            <p className="text-white/50 text-sm mt-2">Intenta crear uno nuevo</p>
          </Card>
        )}
      </div>

      {/* Sidebar */}
      <div className="col-span-4 space-y-6">
        {/* Trending Topics */}
        <Card className="glass-card p-6">
          <div className="flex items-center space-x-2 mb-4">
            <TrendingUp className="w-5 h-5 text-orange-400" />
            <h3 className="text-white font-medium">Trending</h3>
          </div>
          <div className="space-y-3">
            {trendingTopics.map((topic, index) => (
              <div key={index} className="flex items-center justify-between">
                <div>
                  <p className="text-white font-medium">{topic.name}</p>
                  <p className="text-white/60 text-sm">{topic.events} eventos</p>
                </div>
                <Badge className="bg-green-500/20 text-green-400">{topic.trend}</Badge>
              </div>
            ))}
          </div>
        </Card>

        {/* Leaderboard */}
        <Card className="glass-card p-6">
          <div className="flex items-center space-x-2 mb-4">
            <Zap className="w-5 h-5 text-yellow-400" />
            <h3 className="text-white font-medium">Top Usuarios</h3>
          </div>
          <div className="space-y-3">
            {leaderboard.map((user, index) => (
              <div key={index} className="flex items-center space-x-3">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-r from-yellow-500 to-orange-500 text-white text-sm font-bold">
                  {index + 1}
                </div>
                <div className="w-10 h-10 rounded-full bg-gradient-to-r from-violet-500 to-pink-500 flex items-center justify-center">
                  <span className="text-white font-bold text-sm">{user.avatar}</span>
                </div>
                <div className="flex-1">
                  <p className="text-white font-medium">{user.user?.firstName || user.name || 'Usuario'}</p>
                  <p className="text-white/60 text-sm">Nivel {user.level} • {user.xp?.toLocaleString()} XP</p>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Quick Actions */}
        <Card className="glass-card p-6">
          <h3 className="text-white font-medium mb-4">Acciones rápidas</h3>
          <div className="space-y-3">
            <Button className="w-full bg-gradient-to-r from-violet-600 to-pink-600 hover:from-violet-700 hover:to-pink-700">
              Crear evento
            </Button>
            <Button variant="outline" className="w-full border-blue-500/50 text-blue-300 hover:bg-blue-500/10">
              Buscar eventos
            </Button>
            <Button variant="outline" className="w-full border-pink-500/50 text-pink-300 hover:bg-pink-500/10">
              Invitar amigos
            </Button>
          </div>
        </Card>
      </div>
    </div>
  )
}