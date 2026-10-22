'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Calendar, MapPin, Users, Heart, Share, ShieldCheck } from 'lucide-react'
import { cn, getImageUrl } from '@/lib/utils'
import { motion } from 'framer-motion'
import type { Event } from '@/types/models'
import { formatEventDate, formatPrice as displayPrice } from '@/lib/event-display'

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
  const [imgError, setImgError] = useState(false)
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
          <Image
            src={imgError ? getImageUrl(null, event.category, event.title) : getImageUrl(event.images?.[0]?.url, event.category, event.title)}
            alt={event.title}
            fill
            onError={() => setImgError(true)}
            className="object-cover transition-transform duration-300 group-hover:scale-110"
            sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />

          {/* Category Badge */}
          <div className="absolute top-3 left-3 flex flex-col gap-2">
            <span className="rounded-full bg-black/60 backdrop-blur-sm px-3 py-1 text-xs font-medium text-white border border-white/20">
              {event.category}
            </span>
            {((event as any).isOrganizerVerified || (event.createdBy as any)?.isOrganizerVerified) && (
              <span className="rounded-full bg-emerald-600/90 backdrop-blur-sm px-2.5 py-0.5 text-xs font-bold text-white border border-emerald-400/50 flex items-center gap-1 shadow-sm">
                <ShieldCheck className="w-3 h-3" /> Verificado
              </span>
            )}
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
            {(event as any).isOfficial && (
              <span className="rounded-full bg-gradient-to-r from-amber-500 to-orange-500 px-2.5 py-0.5 text-xs font-black text-white shadow-md flex items-center gap-1 border border-amber-300/40">
                ⭐ Oficial
              </span>
            )}
            {(event as any).isRecurring && (
              <span className="rounded-full bg-blue-600/90 backdrop-blur-sm px-2.5 py-0.5 text-xs font-bold text-white border border-blue-400/50 flex items-center gap-1 shadow-sm">
                🔄 Fijo Semanal
              </span>
            )}
            {(event as any).isCommercialDeal && (
              <span className="rounded-full bg-emerald-600/90 backdrop-blur-sm px-2.5 py-0.5 text-xs font-bold text-white border border-emerald-400/50 flex items-center gap-1 shadow-sm">
                🏷️ Oferta Especial
              </span>
            )}
            {(event as any).isTourOrTrip && (
              <span className="rounded-full bg-cyan-600/90 backdrop-blur-sm px-2.5 py-0.5 text-xs font-bold text-white border border-cyan-400/50 flex items-center gap-1 shadow-sm">
                🚌 Tour / Excursión
              </span>
            )}
            {(event as any).isVirtual && (
              <span className="rounded-full bg-gradient-to-r from-cyan-600/90 to-blue-600/90 backdrop-blur-sm px-2.5 py-0.5 text-xs font-bold text-white border border-cyan-400/50 flex items-center gap-1 shadow-sm">
                🌐 En Línea / Stream
              </span>
            )}
            {(event as any).familyDetails?.isFamilyEvent && (
              <span className="rounded-full bg-pink-600/90 backdrop-blur-sm px-2.5 py-0.5 text-xs font-bold text-white border border-pink-400/50 flex items-center gap-1 shadow-sm">
                👶 {(event as any).familyDetails?.targetAudience === 'babies' ? 'Bebés & Gateo' : 'Familiar'}
              </span>
            )}
            {(event as any).holidayLabel && (
              <span className="rounded-full bg-rose-600/90 backdrop-blur-sm px-2.5 py-0.5 text-xs font-bold text-white border border-rose-400/50 flex items-center gap-1 shadow-sm">
                💐 {(event as any).holidayLabel}
              </span>
            )}
            {(event as any).healthDetails?.isHealthInitiative && (
              <span className="rounded-full bg-emerald-600/90 backdrop-blur-sm px-2.5 py-0.5 text-xs font-bold text-white border border-emerald-400/50 flex items-center gap-1 shadow-sm">
                🏥 {(event as any).healthDetails?.healthType === 'clinical_trial_info' ? 'Investigación Clínica' : 'Salud Gratuita'}
              </span>
            )}
            {(event as any).isUnofficial && (
              <motion.span
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-600 px-3 py-1 text-xs font-bold text-white border border-violet-400 shadow-[0_0_15px_rgba(139,92,246,0.5)] flex items-center gap-1"
              >
                <span>🤫</span> Extraoficial
              </motion.span>
            )}
          </div>

          {/* Price Badge */}
          <div className="absolute top-3 right-3">
            <span className={cn(
              "rounded-full px-3 py-1 text-xs font-bold text-white backdrop-blur-sm",
              event.price?.amount === 0
                ? "bg-violet-500/90 border border-violet-400/50"
                : "bg-primary-500/90 border border-primary-400/50"
            )}>
              {displayPrice({ price: event.price })}
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
              {formatEventDate(event.date, event.timeZone)}
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
