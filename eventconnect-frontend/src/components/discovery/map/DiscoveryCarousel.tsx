'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { formatEventDate, formatPrice as eventPrice } from '@/lib/event-display'
import { getEventPhase } from '@/components/events/event-phase'
import { getImageUrl } from '@/lib/utils'
import { isMapPosition } from './mapViewport'
import { motion, AnimatePresence } from 'framer-motion'
import {
  MapPin,
  Navigation,
  Users,
  Calendar,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Lock
} from 'lucide-react'
import { getCategoryMeta } from './categoryTheme'
import type { DiscoveryEvent } from '@/lib/api/events'

interface DiscoveryCarouselProps {
  items: any[]
  viewType: 'events' | 'tribes' | 'ideas'
  selectedId?: string | null
  onSelect: (item: any) => void
  onSurpriseMe?: () => void
  userLocation?: { lat: number; lng: number } | null
  busyAction?: boolean
}

export default function DiscoveryCarousel({
  items,
  viewType,
  selectedId,
  onSelect,
  onSurpriseMe,
  userLocation,
  busyAction = false
}: DiscoveryCarouselProps) {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const stripId = useId()
  const hasOrigin = Boolean(userLocation && isMapPosition(userLocation.lat, userLocation.lng))
  const scrollContainerRef = useRef<HTMLDivElement | null>(null)
  const cardRefs = useRef<Record<string, HTMLButtonElement | null>>({})

  // Auto-scroll to the selected card when selectedId changes
  useEffect(() => {
    if (!selectedId || isCollapsed) return
    const el = cardRefs.current[selectedId]
    const container = scrollContainerRef.current
    if (el && container) {
      const left = Math.max(0, el.offsetLeft - container.clientWidth / 2 + el.clientWidth / 2)
      if (container.scrollTo) container.scrollTo({ left, behavior: 'smooth' })
      else container.scrollLeft = left
    }
  }, [selectedId, isCollapsed])

  const formatDistance = (d?: number) => {
    if (d === undefined || d === null) return ''
    if (d < 1) return `${Math.round(d * 1000)} m`
    return `${d.toFixed(1)} km`
  }

  const validItems = Array.isArray(items) ? items.filter(item => item?._id) : []
  if (!validItems.length) return null

  return (
    <div className="absolute bottom-3 left-3 right-3 z-[900] pointer-events-none flex flex-col items-start">
      {/* Header / Collapse Toggle Bar */}
      <div className="flex items-center gap-2 mb-2 pointer-events-auto">
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          aria-expanded={!isCollapsed}
          aria-controls={stripId}
          className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900/90 hover:bg-slate-800 text-slate-100 text-xs font-bold border border-slate-700/80 shadow-lg backdrop-blur-md transition-all"
        >
          <span className="w-2 h-2 rounded-full bg-violet-400" />
          <span>
            {validItems.length}{' '}
            {viewType === 'events'
              ? 'eventos en el mapa'
              : viewType === 'ideas'
              ? 'ideas de quórum en mapa'
              : 'tribus en el mapa'}
          </span>
          {isCollapsed ? (
            <ChevronUp className="w-3.5 h-3.5 text-violet-400" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5 text-violet-400" />
          )}
        </button>

        {viewType === 'events' && onSurpriseMe && validItems.length > 1 && (
          <button
            onClick={onSurpriseMe}
            disabled={busyAction}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-violet-600/90 to-fuchsia-600/90 hover:from-violet-500 hover:to-fuchsia-500 text-white text-xs font-bold border border-violet-400/40 shadow-lg shadow-violet-600/25 backdrop-blur-md transition-all hover:scale-105 active:scale-95"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Sorpréndeme</span>
          </button>
        )}
      </div>

      {/* Horizontal Card Strip */}
      <AnimatePresence initial={false}>
        {!isCollapsed && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ duration: 0.25 }}
            ref={scrollContainerRef}
            id={stripId}
            role="region"
            aria-label={viewType === 'events' ? 'Eventos en el mapa' : viewType === 'ideas' ? 'Ideas en el mapa' : 'Tribus en el mapa'}
            className="w-full flex gap-3 overflow-x-auto pb-1 pt-1 px-1 snap-x snap-mandatory pointer-events-auto no-scrollbar"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {validItems.slice(0, 24).map((item: DiscoveryEvent & any) => {
              const isSelected = selectedId === item._id
              const meta = getCategoryMeta(item.category)
              const coverUrl =
                item.images && item.images.length > 0
                  ? typeof item.images[0] === 'string'
                    ? item.images[0]
                    : item.images[0]?.url
                  : null
              const isFree = !item.price || !item.price.amount || item.price.amount <= 0
              const phase = viewType === 'events' ? getEventPhase(item) : null
              const hasDistance = hasOrigin && !item.isSecretLocation && typeof item.distance === 'number' && Number.isFinite(item.distance) && item.distance >= 0
              const place = item.isSecretLocation ? 'Ubicación secreta' : item.isVirtual ? 'Evento virtual' : item.location?.venue || item.location?.city || item.location?.address || item.zone?.name || item.zone?.city || 'Ubicación por confirmar'

              return (
                <button
                  type="button"
                  key={item._id}
                  aria-pressed={isSelected}
                  aria-controls={isSelected ? 'discovery-map-detail' : undefined}
                  disabled={busyAction}
                  ref={(el) => {
                    cardRefs.current[item._id] = el
                  }}
                  onClick={() => { if (!busyAction) onSelect(item) }}
                  className={`snap-start flex-shrink-0 w-[290px] sm:w-[320px] max-w-[calc(100%-0.5rem)] text-left rounded-2xl p-3 cursor-pointer disabled:cursor-wait disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 transition-all duration-200 backdrop-blur-xl border flex gap-3 items-center ${
                    isSelected
                      ? 'bg-slate-900/95 border-violet-500 ring-2 ring-violet-500/50 shadow-2xl shadow-violet-600/30 -translate-y-1'
                      : 'bg-slate-900/85 hover:bg-slate-900/95 border-slate-800/90 hover:border-slate-700 shadow-xl'
                  }`}
                >
                  {/* Thumbnail */}
                  <div className="relative w-20 h-20 rounded-xl overflow-hidden flex-shrink-0 bg-slate-800">
                    {coverUrl ? (
                      <img
                        src={getImageUrl(coverUrl)}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div
                        className="w-full h-full flex items-center justify-center text-2xl"
                        style={{
                          background: `linear-gradient(135deg, ${meta.color}, #1e1b4b)`
                        }}
                      >
                        {meta.emoji}
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                    <span
                      className="absolute top-1.5 left-1.5 w-6 h-6 rounded-lg flex items-center justify-center text-xs shadow"
                      style={{ backgroundColor: meta.color }}
                    >
                      {meta.emoji}
                    </span>
                    {item.isSecretLocation && (
                      <span
                        title="Ubicación secreta"
                        className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-amber-500 text-slate-950 text-[9px] font-extrabold flex items-center gap-0.5"
                      >
                        <Lock className="w-2.5 h-2.5" />
                      </span>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1 mb-0.5">
                      <span
                        className="text-[10px] font-extrabold uppercase tracking-wider truncate"
                        style={{ color: meta.secondaryColor }}
                      >
                        {meta.shortLabel}
                      </span>
                      {hasDistance && (
                        <span className="flex items-center gap-0.5 text-[10px] font-semibold text-slate-300 bg-slate-800/90 px-1.5 py-0.5 rounded-full">
                          <Navigation className="w-2.5 h-2.5 text-sky-400" />
                          {formatDistance(item.distance)}
                        </span>
                      )}
                    </div>

                    <h4 className="text-sm font-bold text-white truncate leading-tight mb-1">
                      {item.title || item.name}
                    </h4>

                    {viewType === 'events' && item.date && (
                      <div className="flex items-center gap-1 text-[11px] text-slate-300 truncate mb-1.5">
                        <Calendar className="w-3 h-3 text-violet-400 flex-shrink-0" />
                        <span className="truncate">{formatEventDate(item.date, item.timeZone)}</span>
                      </div>
                    )}

                    {phase && phase !== 'upcoming' && <span className="mb-1 block text-[11px] font-semibold text-slate-200">
                      {{ live: 'En curso', ended: 'Finalizado', cancelled: 'Cancelado' }[phase]}
                    </span>}
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] text-slate-300 truncate flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-slate-500 flex-shrink-0" />
                        <span className="truncate">
                          {place}
                        </span>
                      </span>

                      {viewType === 'events' ? (
                        <span
                          className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full flex-shrink-0 ${
                            isFree
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : 'bg-violet-500/20 text-violet-200 border border-violet-500/30'
                          }`}
                        >
                          {eventPrice({ price: item.price })}
                        </span>
                      ) : viewType === 'ideas' ? (
                        <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1 flex-shrink-0">
                          💡 {item.supportersCount || 0}/{item.quorumTarget || 15}
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 flex items-center gap-1">
                          <Users className="w-2.5 h-2.5" />
                          {item.membersCount || 0}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              )
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
