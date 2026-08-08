'use client'

import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, ChevronRight, Calendar, MapPin, Users, DollarSign } from 'lucide-react'
import type { Event } from '@/types/api.types'

interface FeaturedEventsCarouselProps {
  events: Event[]
  onEventClick: (event: Event) => void
  categoryColors: { [key: string]: string }
}

export default function FeaturedEventsCarousel({
  events,
  onEventClick,
  categoryColors
}: FeaturedEventsCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [direction, setDirection] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)

  const nextSlide = () => {
    setDirection(1)
    setCurrentIndex((prev) => (prev + 1) % events.length)
  }

  const prevSlide = () => {
    setDirection(-1)
    setCurrentIndex((prev) => (prev - 1 + events.length) % events.length)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatPrice = (price?: { amount: number; currency: string }) => {
    if (!price || price.amount === 0) return 'Gratis'
    return `${price.currency} ${price.amount}`
  }

  if (!events || events.length === 0) return null

  const variants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 1000 : -1000,
      opacity: 0,
      scale: 0.8,
    }),
    center: {
      zIndex: 1,
      x: 0,
      opacity: 1,
      scale: 1,
    },
    exit: (direction: number) => ({
      zIndex: 0,
      x: direction < 0 ? 1000 : -1000,
      opacity: 0,
      scale: 0.8,
    }),
  }

  const currentEvent = events[currentIndex]

  return (
    <div className="relative w-full h-[500px] md:h-[600px] overflow-hidden rounded-3xl" ref={containerRef}>
      <AnimatePresence initial={false} custom={direction}>
        <motion.div
          key={currentIndex}
          custom={direction}
          variants={variants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{
            x: { type: "spring", stiffness: 300, damping: 30 },
            opacity: { duration: 0.2 },
            scale: { duration: 0.2 },
          }}
          className="absolute w-full h-full"
        >
          {/* Background Image with Gradient Overlay */}
          <div className="relative w-full h-full">
            {currentEvent.images && currentEvent.images.length > 0 ? (
              <img
                src={currentEvent.images[0].url}
                alt={currentEvent.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div
                className="w-full h-full"
                style={{
                  background: `linear-gradient(135deg, ${categoryColors[currentEvent.category] || '#3B82F6'} 0%, ${categoryColors[currentEvent.category] || '#8B5CF6'} 100%)`
                }}
              />
            )}

            {/* Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />

            {/* Content */}
            <div className="absolute bottom-0 left-0 right-0 p-8 md:p-12">
              <div className="max-w-4xl">
                {/* Category Badge */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="inline-block mb-4"
                >
                  <span
                    className="px-4 py-2 rounded-full text-white text-sm font-semibold backdrop-blur-md"
                    style={{
                      backgroundColor: `${categoryColors[currentEvent.category] || '#3B82F6'}aa`
                    }}
                  >
                    {currentEvent.category}
                  </span>
                </motion.div>

                {/* Title */}
                <motion.h2
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="text-4xl md:text-6xl font-bold text-white mb-4 leading-tight"
                >
                  {currentEvent.title}
                </motion.h2>

                {/* Description */}
                <motion.p
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="text-lg text-white/90 mb-6 line-clamp-2 max-w-2xl"
                >
                  {currentEvent.description}
                </motion.p>

                {/* Event Info */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="flex flex-wrap gap-4 mb-6"
                >
                  <div className="flex items-center gap-2 text-white/90 backdrop-blur-md bg-white/10 px-4 py-2 rounded-full">
                    <Calendar className="w-4 h-4" />
                    <span className="text-sm font-medium">{formatDate(currentEvent.date)}</span>
                  </div>

                  <div className="flex items-center gap-2 text-white/90 backdrop-blur-md bg-white/10 px-4 py-2 rounded-full">
                    <MapPin className="w-4 h-4" />
                    <span className="text-sm font-medium truncate max-w-[200px]">
                      {currentEvent.location.address}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-white/90 backdrop-blur-md bg-white/10 px-4 py-2 rounded-full">
                    <Users className="w-4 h-4" />
                    <span className="text-sm font-medium">
                      {(currentEvent.attendees?.length || 0)}/{currentEvent.maxAttendees}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-white/90 backdrop-blur-md bg-white/10 px-4 py-2 rounded-full">
                    <DollarSign className="w-4 h-4" />
                    <span className="text-sm font-medium">{formatPrice(currentEvent.price)}</span>
                  </div>
                </motion.div>

                {/* CTA Button */}
                <motion.button
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  onClick={() => onEventClick(currentEvent)}
                  className="px-8 py-4 bg-white text-gray-900 rounded-full font-bold text-lg hover:bg-gray-100 transition-all hover:scale-105 active:scale-95 shadow-xl"
                >
                  Ver Detalles
                </motion.button>
              </div>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Navigation Buttons */}
      {events.length > 1 && (
        <>
          <button
            onClick={prevSlide}
            className="absolute left-4 top-1/2 -translate-y-1/2 p-3 bg-white/20 hover:bg-white/30 backdrop-blur-md rounded-full text-white transition-all hover:scale-110 active:scale-95 z-10"
            aria-label="Previous slide"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>

          <button
            onClick={nextSlide}
            className="absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-white/20 hover:bg-white/30 backdrop-blur-md rounded-full text-white transition-all hover:scale-110 active:scale-95 z-10"
            aria-label="Next slide"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        </>
      )}

      {/* Indicators */}
      {events.length > 1 && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2 z-10">
          {events.map((_, index) => (
            <button
              key={index}
              onClick={() => {
                setDirection(index > currentIndex ? 1 : -1)
                setCurrentIndex(index)
              }}
              className={`h-2 rounded-full transition-all ${
                index === currentIndex
                  ? 'w-8 bg-white'
                  : 'w-2 bg-white/40 hover:bg-white/60'
              }`}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  )
}
