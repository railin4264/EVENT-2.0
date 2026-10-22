'use client'

import Link from 'next/link'
import { useEffect, useId, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import { formatEventDate, formatPrice as eventPrice } from '@/lib/event-display'
import { getEventPhase } from '@/components/events/event-phase'
import { getImageUrl } from '@/lib/utils'
import { isMapPosition, mapPoint } from './mapViewport'
import { motion, AnimatePresence } from 'framer-motion'
import {
  MapPin,
  Navigation,
  Calendar,
  Users,
  Heart,
  X,
  ExternalLink,
  Lock,
  CheckCircle2,
  Compass
} from 'lucide-react'
import ShareButton from '@/components/discovery/ShareButton'
import { getCategoryMeta } from './categoryTheme'
import type { DiscoveryEvent } from '@/lib/api/events'

interface DiscoveryDetailPanelProps {
  selectedEvent: DiscoveryEvent | null
  selectedTribe: any | null
  selectedIdea?: any | null
  userLocation?: { lat: number; lng: number } | null
  busyAction?: boolean
  isFavorite: (id: string) => boolean
  onToggleFavorite: (id: string) => void | Promise<void>
  onClose: () => void
  onAttendToggle: (event: DiscoveryEvent) => Promise<void>
  onJoinTribe: (tribe: any) => Promise<void>
  onSupportIdea?: (idea: any) => Promise<void>
}

export default function DiscoveryDetailPanel({
  selectedEvent,
  selectedTribe,
  selectedIdea,
  userLocation,
  busyAction = false,
  isFavorite,
  onToggleFavorite,
  onClose,
  onAttendToggle,
  onJoinTribe,
  onSupportIdea
}: DiscoveryDetailPanelProps) {
  const item = selectedEvent || selectedIdea || selectedTribe
  const panelRef = useRef<HTMLElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  const closeAction = useRef(onClose)
  closeAction.current = onClose
  const actionLock = useRef(false)
  const [pending, setPending] = useState(false)
  const [now, setNow] = useState(() => Date.now())
  const titleId = useId()
  const isBusy = busyAction || pending

  useEffect(() => {
    if (!item?._id) return
    const previousFocus = document.activeElement as HTMLElement | null
    closeRef.current?.focus()
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !event.defaultPrevented) { event.preventDefault(); closeAction.current() }
    }
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('keydown', closeOnEscape)
      if (previousFocus?.isConnected) previousFocus.focus()
    }
  }, [item?._id])

  useEffect(() => {
    if (!selectedEvent) return
    const interval = window.setInterval(() => setNow(Date.now()), 30_000)
    return () => window.clearInterval(interval)
  }, [selectedEvent?._id])

  const runAction = async (action: () => void | Promise<void>) => {
    if (isBusy || actionLock.current) return
    actionLock.current = true
    setPending(true)
    try { await action() }
    catch { toast.error('No se pudo completar la acción. Inténtalo de nuevo.') }
    finally { actionLock.current = false; setPending(false) }
  }

  if (!item) return null
  const phase = selectedEvent ? getEventPhase(selectedEvent, now) : null
  const acceptsAttendance = (phase === 'upcoming' || phase === 'live') && (!selectedEvent?.status || selectedEvent.status === 'published')
  const isSecret = Boolean(item.isSecretLocation)
  const destination = !isSecret && !item.isVirtual ? mapPoint(item.location?.coordinates) : null
  const hasOrigin = Boolean(userLocation && isMapPosition(userLocation.lat, userLocation.lng))
  const hasDistance = hasOrigin && !isSecret && typeof item.distance === 'number' && Number.isFinite(item.distance) && item.distance >= 0
  const meetingPoint = isSecret ? 'Ubicación secreta · consulta el detalle' : item.isVirtual ? 'Evento virtual' : item.location?.venue || item.location?.address || item.location?.city || item.zone?.name || item.zone?.city || 'Ubicación por confirmar'
  const attendeesCount = typeof selectedEvent?.attendeesCount === 'number' ? selectedEvent.attendeesCount : (Array.isArray(selectedEvent?.attendees) ? selectedEvent.attendees.filter(attendee => attendee?.status === 'confirmed' || String(attendee?.status) === 'attending').length : 0)
  const organizerVerified = (selectedEvent?.createdBy as any)?.isOrganizerVerified === true || (selectedEvent as any)?.isOrganizerVerified === true

  const meta = getCategoryMeta(item.category)
  const coverUrl =
    item.images && item.images.length > 0
      ? typeof item.images[0] === 'string'
        ? item.images[0]
        : item.images[0]?.url
      : null

  const formatDistance = (d?: number) => {
    if (d === undefined || d === null) return ''
    if (d < 1) return `${Math.round(d * 1000)} metros`
    return `${d.toFixed(1)} km`
  }

  const openNavigation = (provider: 'gmaps' | 'waze') => {
    if (!destination) return
    const [lat, lng] = destination
    if (provider === 'waze') {
      window.open(`https://waze.com/ul?ll=${lat},${lng}&navigate=yes`, '_blank', 'noopener,noreferrer')
    } else {
      const origin = hasOrigin && userLocation ? `&origin=${userLocation.lat},${userLocation.lng}` : ''
      window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}${origin}`, '_blank', 'noopener,noreferrer')
    }
  }

  const isFree = !selectedEvent?.price || !selectedEvent.price.amount || selectedEvent.price.amount === 0

  return (
    <AnimatePresence>
      <motion.aside
        key={item._id}
        ref={panelRef}
        id="discovery-map-detail"
        role="dialog"
        aria-modal="false"
        aria-labelledby={titleId}
        aria-busy={isBusy}
        initial={{ x: 420, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: 420, opacity: 0 }}
        transition={{ type: 'spring', damping: 28, stiffness: 260 }}
        className="eventnow-map-detail absolute top-2 left-2 right-2 bottom-2 sm:top-3 sm:left-auto sm:right-3 sm:bottom-3 w-auto sm:w-[400px] max-w-[calc(100%-1rem)] bg-slate-950 rounded-3xl shadow-2xl border border-slate-800/90 overflow-y-auto overscroll-contain z-[1002] text-slate-100 flex flex-col"
      >
        {/* Hero Banner */}
        <div className="relative h-40 sm:h-44 w-full flex-shrink-0 bg-slate-900 overflow-hidden">
          {coverUrl ? (
            <img
              src={getImageUrl(coverUrl)}
              alt={item.title || item.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div
              className="w-full h-full flex items-center justify-center text-6xl"
              style={{
                background: `linear-gradient(135deg, ${meta.color}, #0f172a)`
              }}
            >
              {meta.emoji}
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-black/30" />

          {/* Top Bar on Hero */}
          <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
            <span
              className="inline-flex min-w-0 max-w-[80%] items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold text-white shadow-lg"
              style={{ backgroundColor: meta.color }}
            >
              <span>{meta.emoji}</span>
              <span className="truncate">{meta.label}</span>
            </span>

            <button
              ref={closeRef}
              onClick={onClose}
              aria-label="Cerrar panel"
              className="min-h-11 min-w-11 flex items-center justify-center p-2 rounded-full bg-slate-950/80 hover:bg-slate-900 text-slate-200 border border-white/15 backdrop-blur-md transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Bottom Pills on Hero */}
          <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between">
            {hasDistance && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900/90 border border-slate-700 text-xs font-bold text-sky-300 backdrop-blur-md">
                <Navigation className="w-3.5 h-3.5" />
                A {formatDistance(item.distance)}
              </span>
            )}

            {selectedEvent && (
              <span
                className={`px-3 py-1 rounded-full text-xs font-extrabold border backdrop-blur-md ${
                  isFree
                    ? 'bg-emerald-500/25 border-emerald-400/50 text-emerald-300'
                    : 'bg-violet-600/30 border-violet-400/50 text-white'
                }`}
              >
                {eventPrice({ price: selectedEvent.price })}
              </span>
            )}
          </div>
        </div>

        {/* Body Content */}
        <div className="p-5 flex-1 flex flex-col font-sans">
          {/* Title */}
          <h2 id={titleId} className="break-words font-sans text-[22px] font-semibold tracking-normal text-white leading-8 mb-3">
            {selectedEvent
              ? selectedEvent.title
              : selectedIdea
              ? selectedIdea.title
              : selectedTribe?.name}
          </h2>

          {/* Organizer Row */}
          {selectedEvent?.publicSource ? <p className="mb-4 text-xs leading-5 text-muted-foreground">Agenda pública · {selectedEvent.publicSource.name}. Consulta las condiciones de acceso en el evento original.</p> : selectedEvent?.createdBy && (
            <div className="flex items-center gap-2 text-xs text-slate-400 mb-4">
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white font-bold text-[11px]">
                {selectedEvent.createdBy.firstName?.[0] || 'O'}
              </div>
              <span>
                Organiza{' '}
                <strong className="text-slate-200">
                  {selectedEvent.createdBy.firstName} {selectedEvent.createdBy.lastName}
                </strong>
              </span>
              {organizerVerified && <span className="inline-flex items-center gap-0.5 text-emerald-400 font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5" /> Verificado
              </span>}
            </div>
          )}

          {/* Secret Location Alert */}
          {(selectedEvent as any)?.isSecretLocation && (
            <div className="mb-4 p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-2.5 text-amber-200 text-xs">
              <Lock className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-amber-300">Ubicación secreta</p>
                <p className="text-amber-200/80 mt-0.5">
                  La ubicación exacta y las condiciones de acceso se consultan en el detalle del evento.
                </p>
              </div>
            </div>
          )}

          {phase && <p className="mb-4 text-xs font-semibold text-slate-300">
            {{ upcoming: 'Próximamente', live: 'En curso', ended: 'Finalizado', cancelled: 'Cancelado' }[phase]}
          </p>}

          {/* Quórum Progress Box (Ideas only) */}
          {selectedIdea && (
            <div className="mb-4 p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30">
              <div className="flex items-center justify-between text-xs font-extrabold text-amber-300 mb-1.5">
                <span>💡 Termómetro de Quórum</span>
                <span>
                  {selectedIdea.supportersCount || 0} / {selectedIdea.quorumTarget || 15} votos
                </span>
              </div>
              <div className="w-full h-2.5 rounded-full bg-slate-900 overflow-hidden mb-1.5">
                <div
                  className="h-full bg-gradient-to-r from-amber-500 to-emerald-400 transition-all duration-500"
                  style={{
                    width: `${Math.min(
                      100,
                      Math.round(
                        ((selectedIdea.supportersCount || 0) / (selectedIdea.quorumTarget || 15)) *
                          100
                      )
                    )}%`
                  }}
                />
              </div>
              <p className="text-[11px] text-amber-200/85">
                {selectedIdea.quorumReached
                  ? '🔥 ¡Quórum alcanzado! Lista para convertirse en evento real.'
                  : 'Suma tu voto para que la comunidad u organizadores lancen este coro en esta zona.'}
              </p>
            </div>
          )}

          {/* Description */}
          <p className="text-sm text-slate-300 leading-6 mb-5 line-clamp-3">
            {selectedEvent
              ? selectedEvent.description
              : selectedIdea
              ? selectedIdea.description
              : selectedTribe?.description}
          </p>

          {/* Info Cards */}
          <div className="space-y-2.5 mb-5">
            {selectedEvent && (
              <div className="flex items-center gap-3 p-2.5 rounded-2xl bg-slate-900/90 border border-slate-800/80">
                <div className="w-9 h-9 rounded-xl bg-violet-500/15 border border-violet-500/30 flex items-center justify-center text-violet-400 flex-shrink-0">
                  <Calendar className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-slate-300">Fecha y Hora</p>
                  <p className="text-sm font-medium text-white leading-6 break-words">
                    {formatEventDate(selectedEvent.date, selectedEvent.timeZone)}
                  </p>
                </div>
              </div>
            )}

            <div className="flex items-center gap-3 p-2.5 rounded-2xl bg-slate-900/90 border border-slate-800/80">
              <div className="w-9 h-9 rounded-xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-400 flex-shrink-0">
                <MapPin className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs text-slate-300">Punto de Encuentro</p>
                <p className="text-sm font-medium text-white leading-6 break-words">
                  {meetingPoint}
                </p>
                {!isSecret && selectedEvent?.location?.city && (
                  <p className="text-xs text-slate-300 truncate">
                    {[selectedEvent.location.city, selectedEvent.location.country].filter(Boolean).join(', ')}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3 p-2.5 rounded-2xl bg-slate-900/90 border border-slate-800/80">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 flex-shrink-0">
                <Users className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-slate-300">Comunidad y Cupos</p>
                <p className="text-sm font-medium text-white">
                  {selectedEvent
                    ? `${attendeesCount} confirmados${selectedEvent.maxAttendees ? ` de ${selectedEvent.maxAttendees}` : ''}`
                    : selectedIdea
                    ? `${selectedIdea.supportersCount || 0} personas votaron por esta idea`
                    : `${selectedTribe?.membersCount || 0} miembros activos`}
                </p>
              </div>
            </div>
          </div>

          {/* Navigation Quick Links (Google Maps + Waze) */}
          {destination && <div className="grid grid-cols-2 gap-2 mb-4">
            <button
              onClick={() => openNavigation('gmaps')}
              className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-xs font-bold text-slate-200 transition-colors"
            >
              <Compass className="w-4 h-4 text-sky-400" />
              <span>Google Maps</span>
            </button>
            <button
              onClick={() => openNavigation('waze')}
              className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-xs font-bold text-slate-200 transition-colors"
            >
              <span>🚗</span>
              <span>Ir con Waze</span>
            </button>
          </div>}

          {/* Primary Actions */}
          <div className="mt-auto space-y-2.5 pt-2">
            {selectedIdea ? (
              <>
                <button
                  onClick={() => { if (onSupportIdea) void runAction(() => onSupportIdea(selectedIdea)) }}
                  disabled={isBusy || !onSupportIdea || selectedIdea.status === 'closed' || selectedIdea.status === 'launched'}
                  className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-extrabold text-sm shadow-xl shadow-amber-500/25 transition-all"
                >
                  {selectedIdea.status === 'launched' ? 'Idea convertida en evento' : selectedIdea.status === 'closed' ? 'Idea cerrada' : selectedIdea.supported ? 'Actualizar mi interés' : 'Me interesa esta idea'}
                </button>
                <div className="grid grid-cols-2 gap-2">
                  <Link
                    href={`/events/create?fromIdea=${selectedIdea._id}&title=${encodeURIComponent(
                      selectedIdea.title
                    )}&category=${selectedIdea.category || 'music'}`}
                    className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-bold text-xs text-center"
                  >
                    🚀 Lanzar Evento
                  </Link>
                  <Link
                    href="/ideas"
                    className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs text-center"
                  >
                    Ver Tablero Quórum
                  </Link>
                </div>
              </>
            ) : (
              <>
                <Link
                  href={`/${selectedEvent ? 'events' : 'tribes'}/${item._id}`}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-gradient-to-r from-violet-600 via-indigo-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white font-extrabold text-sm shadow-xl shadow-violet-600/30 transition-all hover:scale-[1.01]"
                >
                  <span>{selectedEvent ? 'Ver detalles del evento' : 'Ver detalles de la tribu'}</span>
                  <ExternalLink className="w-4 h-4" />
                </Link>

                {selectedEvent ? (
                  <div className="flex gap-2">
                    <button
                      onClick={() => { if (acceptsAttendance) void runAction(() => onAttendToggle(selectedEvent)) }}
                      disabled={isBusy || !acceptsAttendance}
                      className={`flex-1 py-2.5 px-4 rounded-xl font-bold text-xs transition-all disabled:opacity-50 disabled:cursor-not-allowed border ${
                        selectedEvent.isAttending
                          ? 'bg-slate-800 hover:bg-rose-950/60 text-slate-200 border-slate-700'
                          : 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-500 shadow-lg shadow-emerald-600/20'
                      }`}
                    >
                      {isBusy ? 'Procesando…' : phase === 'cancelled' ? 'Evento cancelado' : phase === 'ended' ? 'Evento finalizado' : selectedEvent.status === 'draft' ? 'Evento en borrador' : !isFree ? selectedEvent.isAttending ? 'Ver mi entrada' : 'Ver entradas' : selectedEvent.isAttending ? 'Cancelar mi asistencia' : 'Confirmar asistencia'}
                    </button>

                    <button
                      onClick={() => { void runAction(() => onToggleFavorite(selectedEvent._id)) }}
                      disabled={isBusy}
                      aria-label={isFavorite(selectedEvent._id) ? 'Quitar de favoritos' : 'Guardar en favoritos'}
                      aria-pressed={isFavorite(selectedEvent._id)}
                      title="Guardar en favoritos"
                      className={`p-2.5 rounded-xl border transition-all ${
                        isFavorite(selectedEvent._id)
                          ? 'bg-rose-500 text-white border-rose-400 shadow-lg shadow-rose-500/30'
                          : 'bg-slate-900 text-slate-300 border-slate-700 hover:bg-slate-800'
                      }`}
                    >
                      <Heart
                        className={`w-4 h-4 ${isFavorite(selectedEvent._id) ? 'fill-current' : ''}`}
                      />
                    </button>

                    <ShareButton
                      event={selectedEvent}
                      variant="icon"
                      className="bg-slate-900 text-slate-300 border border-slate-700 hover:bg-slate-800 rounded-xl p-2.5"
                    />
                  </div>
                ) : (
                  <button
                    onClick={() => { void runAction(() => onJoinTribe(selectedTribe)) }}
                    disabled={isBusy}
                    className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-all"
                  >
                    {isBusy ? 'Procesando…' : 'Unirse a la tribu'}
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </motion.aside>
    </AnimatePresence>
  )
}
