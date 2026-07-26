'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Calendar, MapPin, Users, Ticket, Heart, Share, Bookmark } from 'lucide-react'
import type { Event } from '@/types/api.types'

interface ModernEventCardProps {
  event: Event & { distance?: number }
  onClick: () => void
  categoryColor: string
}

export default function ModernEventCard({ event, onClick, categoryColor }: ModernEventCardProps) {
  const [isHovered, setIsHovered] = useState(false)
  const [isFavorited, setIsFavorited] = useState(false)
  const [isBookmarked, setIsBookmarked] = useState(false)

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return {
      day: date.getDate(),
      month: date.toLocaleDateString('es-ES', { month: 'short' }),
      time: date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
    }
  }

  const formatPrice = (price?: { amount: number; currency: string }) => {
    if (!price || price.amount === 0) return 'Gratis'
    return `${price.currency} ${price.amount}`
  }

  const formatDistance = (distance?: number) => {
    if (!distance) return null
    if (distance < 1) {
      const meters = Math.round(distance * 1000)
      return `${meters}m`
    }
    return `${distance.toFixed(1)}km`
  }

  const dateInfo = formatDate(event.date)
  const distance = formatDistance(event.distance)

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      whileHover={{ y: -8 }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      className="group relative bg-white dark:bg-gray-800 rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 border border-gray-200 dark:border-gray-700 cursor-pointer"
      onClick={onClick}
    >
      {/* Image Section */}
      <div className="relative h-56 overflow-hidden bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-800">
        {event.images && event.images.length > 0 ? (
          <>
            <img
              src={typeof event.images[0] === 'string' ? event.images[0] : event.images[0].url}
              alt={event.title}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
            />
            {/* Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
          </>
        ) : (
          <div
            className="w-full h-full transition-all duration-500 group-hover:scale-110"
            style={{
              background: `linear-gradient(135deg, ${categoryColor}dd 0%, ${categoryColor}aa 100%)`
            }}
          />
        )}

        {/* Date Badge */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="absolute top-4 left-4 bg-white dark:bg-gray-900 rounded-xl shadow-lg overflow-hidden"
        >
          <div
            className="px-3 py-1 text-white text-xs font-bold uppercase"
            style={{ backgroundColor: categoryColor }}
          >
            {dateInfo.month}
          </div>
          <div className="px-3 py-2 text-center">
            <div className="text-2xl font-bold text-gray-900 dark:text-white">{dateInfo.day}</div>
          </div>
        </motion.div>

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: isHovered ? 1 : 0 }}
          className="absolute top-4 right-4 flex gap-2"
        >
          <button
            onClick={(e) => {
              e.stopPropagation()
              setIsFavorited(!isFavorited)
            }}
            className="p-2 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm rounded-full shadow-lg hover:scale-110 active:scale-95 transition-all"
          >
            <Heart
              className={`w-5 h-5 ${isFavorited ? 'fill-red-500 text-red-500' : 'text-gray-700 dark:text-gray-300'}`}
            />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation()
              setIsBookmarked(!isBookmarked)
            }}
            className="p-2 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm rounded-full shadow-lg hover:scale-110 active:scale-95 transition-all"
          >
            <Bookmark
              className={`w-5 h-5 ${isBookmarked ? 'fill-primary-500 text-primary-500' : 'text-gray-700 dark:text-gray-300'}`}
            />
          </button>
          <button
            onClick={async (e) => {
              e.stopPropagation()
              try {
                const shareUrl = `${window.location.origin}/events/${event._id}`
                if (navigator.share) {
                  await navigator.share({
                    title: event.title,
                    text: `¡Mira este evento en EventConnect: ${event.title}!`,
                    url: shareUrl
                  })
                } else {
                  await navigator.clipboard.writeText(shareUrl)
                  alert("Enlace copiado al portapapeles")
                }
              } catch (error) {
                console.error("Error al compartir:", error)
              }
            }}
            className="p-2 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm rounded-full shadow-lg hover:scale-110 active:scale-95 transition-all"
          >
            <Share className="w-5 h-5 text-gray-700 dark:text-gray-300" />
          </button>
        </motion.div>

        {/* Category Badge */}
        <div className="absolute bottom-4 left-4">
          <span
            className="px-4 py-2 rounded-full text-white text-sm font-bold backdrop-blur-md shadow-lg"
            style={{ backgroundColor: `${categoryColor}dd` }}
          >
            {event.category}
          </span>
        </div>

        {/* Distance Badge */}
        {distance && (
          <div className="absolute bottom-4 right-4">
            <span className="px-3 py-1 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm rounded-full text-xs font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              {distance}
            </span>
          </div>
        )}
      </div>

      {/* Content Section */}
      <div className="p-6">
        {/* Title */}
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2 line-clamp-2 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
          {event.title}
        </h3>

        {/* Description */}
        <p className="text-gray-600 dark:text-gray-400 text-sm mb-4 line-clamp-2 leading-relaxed">
          {event.description}
        </p>

        {/* Info Pills */}
        <div className="flex flex-wrap gap-2 mb-4">
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 dark:bg-gray-700/50 rounded-full text-xs font-medium text-gray-700 dark:text-gray-300">
            <Calendar className="w-3.5 h-3.5" />
            {dateInfo.time}
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 dark:bg-gray-700/50 rounded-full text-xs font-medium text-gray-700 dark:text-gray-300">
            <Users className="w-3.5 h-3.5" />
            {(event.attendees?.length || 0)}/{event.maxAttendees}
          </div>

          <div
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold ${event.price?.amount === 0 || !event.price
              ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300'
              : 'bg-gray-100 dark:bg-gray-700/50 text-gray-700 dark:text-gray-300'
              }`}
          >
            <Ticket className="w-3.5 h-3.5" />
            {formatPrice(event.price)}
          </div>
        </div>

        {/* Location */}
        <div className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
          <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span className="line-clamp-1">{event.location.address}</span>
        </div>
      </div>

      {/* Hover Border Effect */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: isHovered ? 1 : 0 }}
        className="absolute inset-0 rounded-2xl border-2 pointer-events-none"
        style={{ borderColor: categoryColor }}
      />
    </motion.div>
  )
}
