import { useState, useEffect } from 'react'
import { Search, Filter, MapPin, Calendar, Users, Star, Loader2 } from 'lucide-react'
import { Card } from './ui/card'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Badge } from './ui/badge'
import { ImageWithFallback } from './figma/ImageWithFallback'
import { eventsService } from '@/lib/api/services'
import type { Event } from '@/types/models'
import toast from 'react-hot-toast'

export function MapView() {
  const [events, setEvents] = useState<Event[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState('Todos')
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null)

  useEffect(() => {
    getUserLocation()
  }, [])

  useEffect(() => {
    if (userLocation) {
      loadNearbyEvents()
    }
  }, [userLocation])

  const getUserLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          })
        },
        (error) => {
          console.error('Error getting location:', error)
          // Default location (Buenos Aires)
          setUserLocation({ lat: -34.6037, lng: -58.3816 })
        }
      )
    } else {
      setUserLocation({ lat: -34.6037, lng: -58.3816 })
    }
  }

  const loadNearbyEvents = async () => {
    if (!userLocation) return

    setIsLoading(true)
    try {
      const response = await eventsService.getNearbyEvents({
        latitude: userLocation.lat,
        longitude: userLocation.lng,
        radius: 10, // 10km
        limit: 20
      })

      if (response.success && response.data) {
        setEvents(response.data)
      }
    } catch (error) {
      console.error('Error loading nearby events:', error)
      toast.error('Error cargando eventos cercanos')
    } finally {
      setIsLoading(false)
    }
  }

  const categories = ["Todos", "Música", "Gastronomía", "Tecnología", "Arte", "Gaming", "Deportes"]

  return (
    <div className="grid grid-cols-12 gap-6 h-screen">
      {/* Map Area */}
      <div className="col-span-8 relative">
        <Card className="glass-card h-full overflow-hidden">
          {/* Map Header */}
          <div className="absolute top-4 left-4 right-4 z-10 flex space-x-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-white/60" />
              <Input 
                placeholder="Buscar eventos cerca de ti..."
                className="pl-10 bg-white/10 backdrop-blur-lg border-white/20 text-white placeholder:text-white/60"
              />
            </div>
            <Button size="sm" className="glass-heavy px-4">
              <Filter className="w-4 h-4 mr-2" />
              Filtros
            </Button>
          </div>

          {/* Map Content */}
          <div className="w-full h-full bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 relative overflow-hidden">
            {/* Simulated map background */}
            <div className="absolute inset-0 opacity-20">
              <div className="w-full h-full bg-gradient-to-br from-violet-500/10 via-blue-500/10 to-pink-500/10"></div>
              {/* Grid lines */}
              <div className="absolute inset-0" style={{
                backgroundImage: `
                  linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px),
                  linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)
                `,
                backgroundSize: '50px 50px'
              }}></div>
            </div>

            {/* Event Markers */}
            {events.map((event, index) => (
              <div
                key={event._id}
                className="absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer group"
                style={{
                  left: `${20 + (index * 15)}%`,
                  top: `${25 + (index * 12)}%`
                }}
              >
                {/* Marker */}
                <div className="relative">
                  <div className="w-6 h-6 rounded-full bg-gradient-to-r from-violet-500 to-cyan-500 border-2 border-white shadow-lg group-hover:scale-110 transition-transform">
                    <div className="absolute inset-0 rounded-full bg-gradient-to-r from-violet-500 to-cyan-500 animate-ping opacity-30"></div>
                  </div>

                  {/* Popup */}
                  <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                    <Card className="glass-heavy p-3 w-64 border border-white/20">
                      <div className="flex space-x-3">
                        <ImageWithFallback
                          src={event.images?.[0]?.url || '/placeholder-event.jpg'}
                          alt={event.title}
                          className="w-16 h-16 rounded-lg object-cover"
                        />
                        <div className="flex-1">
                          <h4 className="text-white font-medium text-sm mb-1">{event.title}</h4>
                          <div className="flex items-center space-x-1 text-xs text-white/70 mb-1">
                            <Calendar className="w-3 h-3" />
                            <span>{new Date(event.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}</span>
                          </div>
                          <div className="flex items-center space-x-1 text-xs text-white/70">
                            <Users className="w-3 h-3" />
                            <span>{event.attendeesCount || 0} asistentes</span>
                          </div>
                        </div>
                      </div>
                    </Card>
                  </div>
                </div>
              </div>
            ))}

            {/* User Location */}
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
              <div className="w-4 h-4 rounded-full bg-blue-500 border-2 border-white shadow-lg">
                <div className="absolute inset-0 rounded-full bg-blue-500 animate-pulse opacity-50 scale-150"></div>
              </div>
            </div>
          </div>

          {/* Distance Scale */}
          <div className="absolute bottom-4 left-4 glass-card p-2">
            <div className="flex items-center space-x-2 text-white/70 text-xs">
              <div className="w-8 h-0.5 bg-white"></div>
              <span>1 km</span>
            </div>
          </div>
        </Card>
      </div>

      {/* Events Sidebar */}
      <div className="col-span-4 space-y-4">
        {/* Categories Filter */}
        <Card className="glass-card p-4">
          <h3 className="text-white font-medium mb-3">Categorías</h3>
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => (
              <Badge
                key={category}
                variant={category === "Todos" ? "default" : "outline"}
                className={`cursor-pointer ${
                  category === "Todos" 
                    ? "bg-violet-500/20 text-violet-300 border-violet-500/50" 
                    : "border-white/20 text-white/70 hover:bg-white/10"
                }`}
              >
                {category}
              </Badge>
            ))}
          </div>
        </Card>

        {/* Events List */}
        <div className="space-y-3 max-h-[calc(100vh-200px)] overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-violet-500" />
            </div>
          ) : events.length === 0 ? (
            <Card className="glass-card p-6 text-center">
              <p className="text-white/60">No se encontraron eventos cercanos</p>
            </Card>
          ) : (
            events.map((event) => (
              <Card key={event._id} className="glass-card p-4 hover-lift cursor-pointer">
                <div className="flex space-x-3">
                  <ImageWithFallback
                    src={event.images?.[0]?.url || '/placeholder-event.jpg'}
                    alt={event.title}
                    className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="text-white font-medium text-sm truncate">{event.title}</h4>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center space-x-1 text-xs text-white/70">
                        <Calendar className="w-3 h-3" />
                        <span>{new Date(event.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })} • {new Date(event.date).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <div className="flex items-center space-x-1 text-xs text-white/70">
                        <MapPin className="w-3 h-3" />
                        <span className="truncate">{event.location.city || event.location.address}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-1 text-xs text-white/70">
                          <Users className="w-3 h-3" />
                          <span>{event.attendeesCount || 0}</span>
                        </div>
                        {event.price && (
                          <div className="flex items-center space-x-1 text-xs text-white/70">
                            ${event.price.amount}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>

        {/* Quick Actions */}
        <Card className="glass-card p-4">
          <div className="space-y-3">
            <Button className="w-full bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-700 hover:to-blue-700">
              Crear evento aquí
            </Button>
            <Button variant="outline" className="w-full border-pink-500/50 text-pink-300 hover:bg-pink-500/10">
              Compartir ubicación
            </Button>
          </div>
        </Card>
      </div>
    </div>
  )
}