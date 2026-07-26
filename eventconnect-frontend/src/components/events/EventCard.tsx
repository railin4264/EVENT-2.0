'use client'

import Image from 'next/image'
import Link from 'next/link'
import { Calendar, MapPin, Users, Heart, Share } from 'lucide-react'
import { cn, getImageUrl } from '@/lib/utils'
import { motion } from 'framer-motion'
import type { Event } from '@/types/models'

interface EventCardProps {
  event: Event
  featured?: boolean
  className?: string
  onFavorite?: (eventId: string) => void
  onShare?: (event: Event) => void
}

export function EventCard({
  event,
  featured = false,
  className,
  onFavorite,
  onShare
}: EventCardProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('es-ES', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const formatPrice = () => {
    if (!event.price || event.price.amount === 0) return 'GRATIS'
    return `$${event.price.amount}`
  }

  const attendeeCount = event.attendees?.length || 0

  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -8 }}
      transition={{ duration: 0.3 }}
      className={cn(
        "group relative overflow-hidden rounded-3xl glass backdrop-blur-xl border-white/10",
        "shadow-xl hover:shadow-2xl hover:shadow-primary/30",
        "transition-all duration-300 bg-white/5",
        featured && "ring-2 ring-primary ring-offset-2 ring-offset-background",
        className
      )}
    >
      {/* Image Section */}
      <Link href={`/events/${event._id}`}>
        <div className="relative aspect-[16/9] overflow-hidden bg-black/20">
          {event.images && event.images.length > 0 ? (
            <Image
              src={getImageUrl(event.images[0].url)}
              alt={event.title}
              fill
              className="object-cover transition-transform duration-300 group-hover:scale-110"
              sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-primary/40 to-secondary/40 backdrop-blur-md">
              <Calendar className="h-16 w-16 text-white/50 drop-shadow-lg" />
            </div>
          )}

          {/* Category Badge */}
          <div className="absolute top-3 left-3 flex flex-col gap-2">
            <span className="rounded-full bg-black/60 backdrop-blur-sm px-3 py-1 text-xs font-medium text-white border border-white/20">
              {event.category}
            </span>
            {event.ageRestriction?.isAdultOnly && (
              <span className="rounded-full bg-red-600/90 backdrop-blur-sm px-3 py-1 text-xs font-bold text-white border border-red-500/50">
                18+
              </span>
            )}
            {!event.ageRestriction?.isAdultOnly && (event.ageRestriction?.minAge || 0) > 0 && (
              <span className="rounded-full bg-yellow-600/90 backdrop-blur-sm px-3 py-1 text-xs font-bold text-white border border-yellow-500/50">
                {event.ageRestriction?.minAge}+
              </span>
            )}
          </div>

          {/* Price Badge */}
          <div className="absolute top-3 right-3">
            <span className={cn(
              "rounded-full px-3 py-1 text-xs font-bold text-white backdrop-blur-sm",
              event.price?.amount === 0
                ? "bg-emerald-500/90 border border-emerald-400/50"
                : "bg-primary-500/90 border border-primary-400/50"
            )}>
              {formatPrice()}
            </span>
          </div>

          {/* Hover Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        </div>
      </Link>

      {/* Content Section */}
      <div className="p-5 space-y-4">
        <Link href={`/events/${event._id}`}>
          <h3 className="font-bold text-xl line-clamp-2 text-foreground group-hover:text-primary transition-colors">
            {event.title}
          </h3>
        </Link>

        <p className="text-sm text-muted-foreground line-clamp-3 leading-relaxed">
          {event.description}
        </p>

        {/* Event Details */}
        <div className="flex flex-col gap-3 text-sm text-foreground/80 font-medium pt-1">
          <div className="flex items-center gap-3">
            <Calendar className="h-4 w-4 text-primary flex-shrink-0" />
            <time dateTime={event.date.toString()}>
              {formatDate(event.date.toString())}
            </time>
          </div>

          <div className="flex items-center gap-3">
            <MapPin className="h-4 w-4 text-accent flex-shrink-0" />
            <span className="truncate">{event.location.address}</span>
          </div>

          <div className="flex items-center gap-3">
            <Users className="h-4 w-4 text-secondary flex-shrink-0" />
            <span>{attendeeCount} {attendeeCount === 1 ? 'asistente' : 'asistentes'}</span>
          </div>
        </div>

        {/* Tags */}
        {event.tags && event.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-2">
            {event.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="px-3 py-1 bg-white/10 hover:bg-white/20 text-foreground rounded-xl text-xs font-semibold transition-colors border border-white/5"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-white/10">
          {/* Host Info */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white text-sm font-bold shadow-inner">
              {typeof event.createdBy !== 'string' ? (event.createdBy?.firstName?.[0] || event.createdBy?.username?.[0] || '?') : '?'}
            </div>
            <span className="text-sm font-medium text-foreground truncate max-w-[120px]">
              {typeof event.createdBy !== 'string' && event.createdBy?.firstName && event.createdBy?.lastName
                ? `${event.createdBy.firstName} ${event.createdBy.lastName}`
                : (typeof event.createdBy !== 'string' ? event.createdBy?.username : 'Organizador') || 'Organizador'}
            </span>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-1">
            {onFavorite && (
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={(e) => {
                  e.preventDefault()
                  onFavorite(event._id)
                }}
                className="p-2.5 rounded-xl hover:bg-white/10 transition-colors backdrop-blur-md"
                aria-label="Guardar evento"
              >
                <Heart className={cn(
                  "h-5 w-5",
                  event.isFavorite ? "fill-red-500 text-red-500 drop-shadow-md" : "text-muted-foreground"
                )} />
              </motion.button>
            )}

            {onShare && (
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={(e) => {
                  e.preventDefault()
                  onShare(event)
                }}
                className="p-2.5 rounded-xl hover:bg-white/10 transition-colors backdrop-blur-md"
                aria-label="Compartir evento"
              >
                <Share className="h-5 w-5 text-muted-foreground" />
              </motion.button>
            )}
          </div>
        </div>
      </div>
    </motion.article>
  )
}
