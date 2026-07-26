'use client'

import { useState, useEffect } from 'react'
import { ArrowRight, Play, Star, ChevronLeft, ChevronRight, MapPin, Calendar, Users, Heart, Zap, Search } from 'lucide-react'
const Compass = MapPin // Use MapPin as fallback for Compass
import { Button } from './ui/button'
import { Card } from './ui/card'
import { Badge } from './ui/badge'
import { ImageWithFallback } from './figma/ImageWithFallback'

interface Event {
  id: number
  title: string
  description: string
  date: string
  time: string
  location: string
  attendees: number
  price: string
  category: string
  image: string
  gradient: string
  icon: string
  liked: boolean
  distance?: string
}

interface HomeProps {
  onEventClick?: (event: Event) => void
  onCreateEvent?: () => void
  onExplore?: () => void
}

export function Home({ onEventClick, onCreateEvent, onExplore }: HomeProps) {
  const [currentEventIndex, setCurrentEventIndex] = useState(0)

  const featuredEvents: Event[] = [
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
      liked: false,
      distance: '2.5 km'
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
      liked: true,
      distance: '5.1 km'
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
      liked: false,
      distance: '1.2 km'
    }
  ]

  const nearbyEvents: Event[] = [
    {
      id: 4,
      title: 'Yoga Sunset Session',
      description: 'Relájate mientras el sol se pone',
      date: '12 Dec',
      time: '18:00',
      location: 'Parque de la Costa',
      attendees: 45,
      price: 'Gratis',
      category: 'Deporte',
      image: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=400',
      gradient: 'from-green-500 to-emerald-500',
      icon: '🧘',
      liked: false,
      distance: '0.8 km'
    },
    {
      id: 5,
      title: 'Comedy Night',
      description: 'Stand-up con los mejores comediantes',
      date: '14 Dec',
      time: '21:00',
      location: 'Teatro Municipal',
      attendees: 200,
      price: '$1200',
      category: 'Entretenimiento',
      image: 'https://images.unsplash.com/photo-1527224857830-43a7acc85260?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=400',
      gradient: 'from-yellow-500 to-orange-500',
      icon: '😂',
      liked: true,
      distance: '3.4 km'
    },
    {
      id: 6,
      title: 'Photography Meetup',
      description: 'Captura la ciudad desde otra perspectiva',
      date: '16 Dec',
      time: '10:00',
      location: 'Centro Histórico',
      attendees: 68,
      price: 'Gratis',
      category: 'Arte',
      image: 'https://images.unsplash.com/photo-1542038784456-1ea8e935640e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=400',
      gradient: 'from-indigo-500 to-purple-500',
      icon: '📷',
      liked: false,
      distance: '4.7 km'
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
    const interval = setInterval(nextEvent, 5000)
    return () => clearInterval(interval)
  }, [])

  const currentEvent = featuredEvents[currentEventIndex]

  const handleEventClick = (event: Event) => {
    onEventClick?.(event)
  }

  return (
    <div className="min-h-screen bg-[#0C0B10] text-white">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        {/* Animated background */}
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-20 left-20 w-2 h-2 bg-violet-400 rounded-full animate-pulse"></div>
          <div className="absolute top-40 right-32 w-1 h-1 bg-blue-400 rounded-full animate-ping"></div>
          <div className="absolute bottom-32 left-40 w-3 h-3 bg-pink-400 rounded-full animate-bounce"></div>
          <div className="absolute top-60 left-1/3 w-1 h-1 bg-violet-300 rounded-full animate-pulse"></div>
          <div className="absolute bottom-40 right-20 w-2 h-2 bg-blue-300 rounded-full animate-ping"></div>
        </div>

        <div className="max-w-7xl mx-auto px-6 lg:px-8 py-20 grid lg:grid-cols-2 gap-12 items-center relative z-10">
          {/* Left Content */}
          <div className="space-y-8">
            <div className="space-y-4">
              <div className="inline-flex items-center space-x-2 glass-card rounded-full px-4 py-2 border border-white/20">
                <Star className="w-4 h-4 text-yellow-400" />
                <span className="text-sm text-white/90">¡Descubre tu próxima aventura!</span>
              </div>

              <h1 className="text-5xl lg:text-7xl font-bold text-white leading-tight">
                Descubre, crea y{' '}
                <span className="bg-gradient-to-r from-violet-400 via-blue-400 to-pink-400 bg-clip-text text-transparent">
                  conecta
                </span>{' '}
                con eventos únicos
              </h1>

              <p className="text-xl text-white/80 max-w-lg leading-relaxed">
                Explora lo que sucede cerca, comparte tus experiencias y gana logros en la comunidad más vibrante de eventos.
              </p>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4">
              <Button
                size="lg"
                onClick={onExplore}
                className="bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-700 hover:to-blue-700 text-white px-8 py-4 rounded-xl neon-glow-violet hover:scale-105 transition-transform"
              >
                Explorar eventos
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>

              <Button
                size="lg"
                variant="outline"
                onClick={onCreateEvent}
                className="border-2 border-pink-500/50 bg-pink-500/10 text-pink-300 hover:bg-pink-500/20 px-8 py-4 rounded-xl hover:scale-105 transition-transform backdrop-blur-lg"
              >
                Crea tu evento
                <Play className="ml-2 w-5 h-5" />
              </Button>
            </div>

            {/* Stats */}
            <div className="flex space-x-8 pt-8">
              <div className="text-center">
                <div className="text-3xl font-bold text-white">250K+</div>
                <div className="text-white/60">Eventos</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-white">1.2M+</div>
                <div className="text-white/60">Usuarios</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-white">500+</div>
                <div className="text-white/60">Ciudades</div>
              </div>
            </div>
          </div>

          {/* Right - Featured Event Carousel */}
          <div className="relative">
            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-2xl font-bold text-white">Eventos Destacados</h3>
                <div className="flex space-x-2">
                  <button
                    onClick={prevEvent}
                    className="w-10 h-10 rounded-full glass-card flex items-center justify-center text-white hover:bg-white/20 transition-colors hover:scale-110"
                    aria-label="Evento anterior"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    onClick={nextEvent}
                    className="w-10 h-10 rounded-full glass-card flex items-center justify-center text-white hover:bg-white/20 transition-colors hover:scale-110"
                    aria-label="Evento siguiente"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Main Event Card */}
            <div
              className="glass-heavy overflow-hidden hover:scale-[1.02] transition-transform cursor-pointer rounded-3xl"
              onClick={() => handleEventClick(currentEvent)}
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
                  className="absolute top-6 right-6 w-12 h-12 rounded-full glass-card flex items-center justify-center hover:scale-110 transition-transform"
                  aria-label="Me gusta"
                  onClick={(e) => {
                    e.stopPropagation()
                  }}
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
                      <span>{currentEvent.attendees.toLocaleString()}</span>
                    </div>
                  </div>

                  <Button className={`bg-gradient-to-r ${currentEvent.gradient} text-white border-0 hover:opacity-90 px-8 py-3`}>
                    Ver detalles
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Event Indicators */}
            <div className="flex justify-center space-x-3 mt-6">
              {featuredEvents.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentEventIndex(index)}
                  className={`w-3 h-3 rounded-full transition-all ${
                    index === currentEventIndex
                      ? 'bg-violet-400 scale-125'
                      : 'bg-white/30 hover:bg-white/50'
                  }`}
                  aria-label={`Ir al evento ${index + 1}`}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Quick Actions */}
      <section className="max-w-7xl mx-auto px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div
            onClick={onCreateEvent}
            className="glass-card p-6 rounded-2xl flex items-center space-x-4 hover:bg-white/10 cursor-pointer transition-all hover:scale-105"
          >
            <div className="w-16 h-16 rounded-xl bg-gradient-to-r from-violet-500 to-purple-500 flex items-center justify-center">
              <Zap className="w-8 h-8 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">Crear Evento</h3>
              <p className="text-white/60">Organiza tu evento perfecto</p>
            </div>
          </div>

          <div
            onClick={onExplore}
            className="glass-card p-6 rounded-2xl flex items-center space-x-4 hover:bg-white/10 cursor-pointer transition-all hover:scale-105"
          >
            <div className="w-16 h-16 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 flex items-center justify-center">
              <Search className="w-8 h-8 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">Buscar</h3>
              <p className="text-white/60">Encuentra eventos increíbles</p>
            </div>
          </div>

          <div
            className="glass-card p-6 rounded-2xl flex items-center space-x-4 hover:bg-white/10 cursor-pointer transition-all hover:scale-105"
          >
            <div className="w-16 h-16 rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 flex items-center justify-center">
              <Compass className="w-8 h-8 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">Explorar</h3>
              <p className="text-white/60">Descubre lo que está pasando</p>
            </div>
          </div>
        </div>
      </section>

      {/* Nearby Events */}
      <section className="max-w-7xl mx-auto px-6 lg:px-8 py-12">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-3xl font-bold text-white">Eventos Cerca de Ti</h2>
          <Button variant="ghost" className="text-violet-400 hover:text-violet-300">
            Ver todos <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {nearbyEvents.map((event) => (
            <div
              key={event.id}
              onClick={() => handleEventClick(event)}
              className="glass-card rounded-2xl overflow-hidden hover:scale-[1.02] transition-transform cursor-pointer"
            >
              <div className="relative">
                <ImageWithFallback
                  src={event.image}
                  alt={event.title}
                  className="w-full h-48 object-cover"
                />
                <div className="absolute top-4 left-4">
                  <Badge className="bg-black/50 text-white border-0">
                    <MapPin className="w-3 h-3 mr-1" />
                    {event.distance}
                  </Badge>
                </div>
                <button
                  className="absolute top-4 right-4 w-10 h-10 rounded-full glass-card flex items-center justify-center hover:scale-110 transition-transform"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Heart className={`w-5 h-5 ${event.liked ? 'text-red-400 fill-current' : 'text-white'}`} />
                </button>
              </div>

              <div className="p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <Badge className={`bg-gradient-to-r ${event.gradient} text-white border-0`}>
                    {event.icon} {event.category}
                  </Badge>
                  <span className="text-white font-bold">{event.price}</span>
                </div>

                <h3 className="text-xl font-bold text-white">{event.title}</h3>
                <p className="text-white/60 text-sm line-clamp-2">{event.description}</p>

                <div className="flex items-center justify-between text-white/60 text-sm pt-2">
                  <div className="flex items-center space-x-1">
                    <Calendar className="w-4 h-4" />
                    <span>{event.date}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Users className="w-4 h-4" />
                    <span>{event.attendees}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
