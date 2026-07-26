import { useState, useEffect } from 'react'
import { ArrowRight, Play, Star, ChevronLeft, ChevronRight, MapPin, Calendar, Users, Heart, Sparkles } from 'lucide-react'

// Alias for Sparkles (not available in lucide-react 0.408.0)
import { Button } from '@/components/redesign/ui/button'
import { Card } from '@/components/redesign/ui/card'
import { Badge } from '@/components/redesign/ui/badge'
import { ImageWithFallback } from '@/components/redesign/figma/ImageWithFallback'

interface HeroSectionProps {
  onEventClick?: (event: any) => void
  onExploreClick?: () => void
  onCreateClick?: () => void
}

export function HeroSection({ onEventClick, onExploreClick, onCreateClick }: HeroSectionProps) {
  const [currentEventIndex, setCurrentEventIndex] = useState(0)

  const featuredEvents = [
    {
      id: 1,
      title: 'Festival Cosmic',
      description: 'Una experiencia musical interdimensional',
      date: '15 Dec',
      time: '20:00',
      location: 'Costa Salguero',
      attendees: 2500,
      price: 'Gratis',
      category: 'Música',
      image: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=800',
      gradient: 'from-violet-500 to-pink-500',
      icon: '🎵',
      liked: false
    },
    {
      id: 2,
      title: 'Tech Innovation Summit',
      description: 'El futuro de la tecnología está aquí',
      date: '18 Dec',
      time: '09:00',
      location: 'Puerto Madero',
      attendees: 850,
      price: '$2500',
      category: 'Tecnología',
      image: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=800',
      gradient: 'from-blue-500 to-cyan-500',
      icon: '🚀',
      liked: true
    },
    {
      id: 3,
      title: 'Art & Design Workshop',
      description: 'Creatividad sin límites',
      date: '20 Dec',
      time: '14:00',
      location: 'Palermo',
      attendees: 120,
      price: '$1800',
      category: 'Arte',
      image: 'https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=800',
      gradient: 'from-pink-500 to-rose-500',
      icon: '🎨',
      liked: false
    }
  ]

  const nextEvent = () => {
    setCurrentEventIndex((prev) => (prev + 1) % featuredEvents.length)
  }

  const prevEvent = () => {
    setCurrentEventIndex((prev) => (prev - 1 + featuredEvents.length) % featuredEvents.length)
  }

  // Auto-advance carousel
  useEffect(() => {
    const interval = setInterval(nextEvent, 4000)
    return () => clearInterval(interval)
  }, [])

  const currentEvent = featuredEvents[currentEventIndex]

  return (
    <div className="min-h-screen particle-bg animated-bg flex items-center justify-center relative overflow-hidden">
      {/* Animated particles background */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute top-20 left-20 w-2 h-2 bg-violet-400 rounded-full animate-pulse"></div>
        <div className="absolute top-40 right-32 w-1 h-1 bg-blue-400 rounded-full animate-ping"></div>
        <div className="absolute bottom-32 left-40 w-3 h-3 bg-pink-400 rounded-full animate-bounce"></div>
        <div className="absolute top-60 left-1/3 w-1 h-1 bg-violet-300 rounded-full animate-pulse"></div>
        <div className="absolute bottom-40 right-20 w-2 h-2 bg-blue-300 rounded-full animate-ping"></div>
      </div>

      <div className="max-w-7xl mx-auto px-6 lg:px-8 grid lg:grid-cols-2 gap-12 items-center relative z-10">
        {/* Content */}
        <div className="space-y-8">
          <div className="space-y-4">
            <div className="inline-flex items-center space-x-2 bg-white/10 backdrop-blur-lg rounded-full px-4 py-2 border border-white/20">
              <Sparkles className="w-4 h-4 text-yellow-400" />
              <span className="text-sm text-white/90">¡Descubre tu próxima aventura!</span>
            </div>

            <h1 className="text-5xl lg:text-7xl font-bold text-white leading-tight">
              Descubre, crea y{' '}
              <span className="bg-gradient-to-r from-violet-400 via-blue-400 to-pink-400 bg-clip-text text-transparent">
                conecta
              </span>{' '}
              con eventos que definen tu energía
            </h1>

            <p className="text-xl text-white/80 max-w-lg leading-relaxed">
              Explora lo que sucede cerca, comparte tus experiencias y gana logros por participar en la comunidad más vibrante de eventos.
            </p>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4">
            <Button
              size="lg"
              onClick={onExploreClick}
              className="bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-700 hover:to-blue-700 text-white px-8 py-4 rounded-xl neon-glow-violet hover-lift"
            >
              Explorar eventos
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>

            <Button
              size="lg"
              variant="outline"
              onClick={onCreateClick}
              className="border-2 border-pink-500/50 bg-pink-500/10 text-pink-300 hover:bg-pink-500/20 px-8 py-4 rounded-xl hover-lift backdrop-blur-lg"
            >
              Crea tu evento
              <Play className="ml-2 w-5 h-5" />
            </Button>
          </div>

          {/* Stats */}
          <div className="flex space-x-8 pt-8">
            <div className="text-center">
              <div className="text-3xl font-bold text-white">250K+</div>
              <div className="text-white/60">Eventos creados</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-white">1.2M+</div>
              <div className="text-white/60">Conexiones</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-white">500+</div>
              <div className="text-white/60">Ciudades</div>
            </div>
          </div>
        </div>

        {/* Featured Events Carousel */}
        <div className="relative">
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-2xl font-bold text-white">Eventos Destacados</h3>
              <div className="flex space-x-2">
                <button
                  onClick={prevEvent}
                  className="w-10 h-10 rounded-full glass-card flex items-center justify-center text-white hover:bg-white/20 transition-colors hover-lift"
                  aria-label="Evento anterior"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={nextEvent}
                  className="w-10 h-10 rounded-full glass-card flex items-center justify-center text-white hover:bg-white/20 transition-colors hover-lift"
                  aria-label="Evento siguiente"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>

          {/* Main Event Card */}
          <Card
            className="glass-heavy overflow-hidden hover-lift cursor-pointer rounded-3xl"
            onClick={() => onEventClick?.(currentEvent)}
          >
            <div className="relative">
              <ImageWithFallback
                src={currentEvent.image}
                alt={currentEvent.title}
                className="w-full h-96 object-cover"
              />

              {/* Gradient Overlay */}
              <div className={`absolute inset-0 bg-gradient-to-t ${currentEvent.gradient} opacity-30`}></div>

              {/* Event Badge */}
              <div className="absolute top-6 left-6">
                <Badge className={`bg-gradient-to-r ${currentEvent.gradient} text-white border-0 text-lg px-4 py-2`}>
                  {currentEvent.icon} {currentEvent.category}
                </Badge>
              </div>

              {/* Like Button */}
              <button
                className="absolute top-6 right-6 w-12 h-12 rounded-full glass-card flex items-center justify-center hover-lift"
                onClick={(e) => e.stopPropagation()}
                aria-label="Me gusta"
              >
                <Heart className={`w-6 h-6 ${currentEvent.liked ? 'text-red-400 fill-current' : 'text-white'}`} />
              </button>

              {/* Price */}
              <div className="absolute bottom-6 right-6">
                <Badge className="bg-black/50 text-white border-0 text-lg px-4 py-2">
                  {currentEvent.price}
                </Badge>
              </div>

              {/* Event Info Overlay */}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-6">
                <h2 className="text-3xl font-bold text-white mb-2">{currentEvent.title}</h2>
                <p className="text-white/90 text-lg mb-4">{currentEvent.description}</p>

                <div className="flex items-center space-x-6 text-white/80 mb-4">
                  <div className="flex items-center space-x-2">
                    <Calendar className="w-5 h-5" />
                    <span>{currentEvent.date} • {currentEvent.time}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <MapPin className="w-5 h-5" />
                    <span>{currentEvent.location}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Users className="w-5 h-5" />
                    <span>{currentEvent.attendees.toLocaleString()} asistentes</span>
                  </div>
                </div>

                <Button className={`bg-gradient-to-r ${currentEvent.gradient} text-white border-0 hover:opacity-90 px-8 py-3`}>
                  Ver detalles del evento
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </div>
            </div>
          </Card>

          {/* Event Indicators */}
          <div className="flex justify-center space-x-3 mt-6">
            {featuredEvents.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentEventIndex(index)}
                className={`w-3 h-3 rounded-full transition-all hover-lift ${
                  index === currentEventIndex
                    ? 'bg-violet-400 scale-125'
                    : 'bg-white/30 hover:bg-white/50'
                }`}
                aria-label={`Ir al evento ${index + 1}`}
              />
            ))}
          </div>

          {/* Quick Preview Cards */}
          <div className="flex justify-center space-x-4 mt-8">
            {featuredEvents.map((event, index) => (
              <Card
                key={event.id}
                className={`glass-card p-4 cursor-pointer hover-lift transition-all ${
                  index === currentEventIndex ? 'ring-2 ring-violet-400 scale-105' : 'hover:bg-white/10'
                }`}
                onClick={() => setCurrentEventIndex(index)}
              >
                <div className="text-center space-y-2">
                  <div className={`w-16 h-16 rounded-xl bg-gradient-to-r ${event.gradient} flex items-center justify-center mx-auto`}>
                    <span className="text-white text-2xl">{event.icon}</span>
                  </div>
                  <div>
                    <p className="text-white font-bold">{event.title}</p>
                    <p className="text-white/60 text-sm">
                      {event.attendees > 1000
                        ? `${(event.attendees/1000).toFixed(1)}K asistentes`
                        : `${event.attendees} asistentes`
                      }
                    </p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
