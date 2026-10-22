'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Sparkles,
  Dices,
  X,
  Compass,
  ArrowRight,
  MapPin,
  Calendar,
  Lock,
  RefreshCw,
  HeartHandshake,
  Lightbulb,
  DollarSign,
  Clock
} from 'lucide-react'
import { apiClient } from '@/lib/api/client'
import { Button } from '@/components/redesign/ui/button'
import type { Event } from '@/types/models'

interface RouletteModalProps {
  isOpen: boolean
  onClose: () => void
  userLocation?: { lat: number; lng: number } | null
}

const VIBES = [
  { id: 'any', label: 'Cualquier vibra', emoji: '🎲' },
  { id: 'bohemio', label: 'Bohemio & Acústica', emoji: '🎻' },
  { id: 'chill', label: 'Parques & Naturaleza', emoji: '🌳' },
  { id: 'party', label: 'Noche & Coro', emoji: '🍹' },
  { id: 'tech', label: 'Tech & Startups', emoji: '💻' },
  { id: 'food', label: 'Gastronomía', emoji: '🍔' }
]

export function RouletteModal({ isOpen, onClose, userLocation }: RouletteModalProps) {
  const [selectedVibe, setSelectedVibe] = useState('any')
  const [onlyFree, setOnlyFree] = useState(false)
  const [maxBudget, setMaxBudget] = useState<number>(1000)
  const [useBudgetFilter, setUseBudgetFilter] = useState(false)
  const [timeAvailable, setTimeAvailable] = useState<number>(2)
  const [useTimeFilter, setUseTimeFilter] = useState(false)
  const [isSpinning, setIsSpinning] = useState(false)
  const [error, setError] = useState('')
  const dialogRef = useRef<HTMLDivElement>(null)
  const requestRef = useRef<AbortController | null>(null)
  const closeRef = useRef(onClose)
  closeRef.current = onClose
  const [result, setResult] = useState<{
    event: Event
    vibe: string
    icebreaker: string
    matchReasons?: string[]
    timeAvailable?: string
    funFact: string
  } | null>(null)

  useEffect(() => {
    if (!isOpen) return
    const previousFocus = document.activeElement as HTMLElement | null
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    dialogRef.current?.focus()
    const keydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); closeRef.current(); return }
      if (event.key !== 'Tab') return
      const controls = Array.from(dialogRef.current?.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], input:not([disabled]), [tabindex="0"]') || [])
      const first = controls[0]
      const last = controls[controls.length - 1]
      if (!first) { event.preventDefault(); return }
      if (event.shiftKey && (document.activeElement === first || document.activeElement === dialogRef.current)) {
        event.preventDefault(); last.focus()
      } else if (!event.shiftKey && (document.activeElement === last || document.activeElement === dialogRef.current)) {
        event.preventDefault(); first.focus()
      }
    }
    document.addEventListener('keydown', keydown)
    return () => {
      requestRef.current?.abort()
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', keydown)
      previousFocus?.focus()
    }
  }, [isOpen])

  // Play subtle synthesis audio click using Web Audio API
  const playHapticSound = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)()
      const osc = audioCtx.createOscillator()
      const gain = audioCtx.createGain()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(587.33, audioCtx.currentTime) // D5 note
      osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.15) // A5 note
      gain.gain.setValueAtTime(0.15, audioCtx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15)
      osc.connect(gain)
      gain.connect(audioCtx.destination)
      osc.start()
      osc.stop(audioCtx.currentTime + 0.15)
      osc.onended = () => { void audioCtx.close() }
    } catch {}
  }

  const handleSpin = async () => {
    if (isSpinning) return
    const controller = new AbortController()
    requestRef.current = controller
    setIsSpinning(true)
    setResult(null)
    setError('')
    playHapticSound()

    try {
      const params: Record<string, any> = {
        vibe: selectedVibe,
        budget: onlyFree ? 'free' : 'any'
      }
      if (!onlyFree && useBudgetFilter) {
        params.maxPrice = maxBudget
      }
      if (useTimeFilter) {
        params.durationHours = timeAvailable
      }
      if (userLocation) {
        params.lat = userLocation.lat
        params.lng = userLocation.lng
      }

      const res = await apiClient.get('/events/roulette', { params, signal: controller.signal })
      if (controller.signal.aborted) return

      if (res.data?.success && res.data?.data?.event?._id && res.data?.data?.event?.title) {
        setResult(res.data.data)
        playHapticSound()
      } else {
        setError('No encontramos un plan con estos filtros. Prueba otra vibra o presupuesto.')
      }
    } catch (err: any) {
      if (!controller.signal.aborted) setError(err?.response?.data?.message || 'No pudimos buscar un plan. Inténtalo de nuevo.')
    } finally {
      setIsSpinning(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <motion.div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="roulette-title"
        tabIndex={-1}
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative w-full max-w-lg rounded-3xl border border-white/10 bg-gray-950 p-6 sm:p-8 text-white shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto"
      >
        {/* Glow ambient background */}
        <div className="absolute -top-24 -left-24 w-64 h-64 bg-primary/25 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-amber-500/20 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-6 relative">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold mb-2">
              <Dices className="w-3.5 h-3.5" />
              <span>Modo «Tengo 2 horas y RD$1,000»</span>
            </div>
            <h2 id="roulette-title" className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
              Ruleta: ¿No sabes qué hacer?
            </h2>
            <p className="text-xs sm:text-sm text-gray-400 mt-1">
              Deja que el algoritmo elija un plan perfecto ajustado a tu bolsillo y tiempo libre.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-all"
            aria-label="Cerrar ruleta"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Vibe Selection */}
        {!result && (
          <div className="space-y-4 relative">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2.5 block">
                1. Elige tu vibra de hoy:
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {VIBES.map((vibe) => (
                  <button
                    key={vibe.id}
                    onClick={() => setSelectedVibe(vibe.id)}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-2xl text-xs font-bold border transition-all text-left ${
                      selectedVibe === vibe.id
                        ? 'bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/20'
                        : 'bg-white/5 border-white/5 text-gray-300 hover:bg-white/10 hover:border-white/10'
                    }`}
                  >
                    <span className="text-base">{vibe.emoji}</span>
                    <span className="truncate">{vibe.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Time & Budget Controls */}
            <div className="space-y-3 p-3.5 rounded-2xl bg-white/5 border border-white/5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-300 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-primary" />
                  2. ¿Cuánto tiempo tienes hoy?
                </span>
                <span className="text-xs font-bold text-primary">
                  {useTimeFilter ? (timeAvailable >= 5 ? '5h+ (Toda la noche)' : `${timeAvailable} horas`) : 'Cualquier duración'}
                </span>
              </div>
              <input
                aria-label="Tiempo disponible en horas"
                type="range"
                min="1"
                max="5"
                step="1"
                value={useTimeFilter ? timeAvailable : 5}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10)
                  setTimeAvailable(val)
                  setUseTimeFilter(val < 5)
                }}
                className="w-full accent-primary cursor-pointer h-1.5 bg-gray-700 rounded-lg"
              />
              <div className="flex justify-between text-[10px] text-gray-400">
                <span>1 hora</span>
                <span>2 horas</span>
                <span>3 horas</span>
                <span>Toda la noche</span>
              </div>

              <div className="pt-2.5 border-t border-white/5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-gray-300 flex items-center gap-1.5">
                    <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                    3. Presupuesto máximo (DOP):
                  </span>
                  <span className="text-xs font-bold text-emerald-400">
                    {onlyFree ? 'Gratis (RD$ 0)' : useBudgetFilter ? `Hasta RD$ ${maxBudget.toLocaleString()}` : 'Cualquier precio'}
                  </span>
                </div>

                {!onlyFree && (
                  <>
                    <input
                      aria-label="Presupuesto máximo en pesos dominicanos"
                      type="range"
                      min="0"
                      max="3000"
                      step="250"
                      value={useBudgetFilter ? maxBudget : 3000}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10)
                        setMaxBudget(val)
                        setUseBudgetFilter(val < 3000)
                      }}
                      className="w-full accent-emerald-500 cursor-pointer h-1.5 bg-gray-700 rounded-lg"
                    />
                    <div className="flex justify-between text-[10px] text-gray-400">
                      <span>Gratis</span>
                      <span>RD$ 1,000</span>
                      <span>RD$ 2,000</span>
                      <span>RD$ 3,000+</span>
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-white/5 border border-white/5">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
                  <DollarSign className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-white">¿Solo actividades 100% gratuitas?</p>
                  <p className="text-[11px] text-gray-400">Parques, jockeys, sesiones al aire libre</p>
                </div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={onlyFree}
                aria-label="Solo actividades gratuitas"
                onClick={() => setOnlyFree(!onlyFree)}
                className={`w-11 h-6 rounded-full transition-colors relative ${
                  onlyFree ? 'bg-emerald-500' : 'bg-gray-700'
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full bg-white transition-transform ${
                    onlyFree ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {error && <p role="alert" className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-200">{error}</p>}
            <Button
              onClick={handleSpin}
              disabled={isSpinning}
              className="w-full h-13 rounded-2xl text-sm font-bold bg-gradient-to-r from-primary via-purple-600 to-amber-500 hover:opacity-95 shadow-lg shadow-primary/25 transition-all active:scale-98"
            >
              {isSpinning ? (
                <span className="flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Descifrando el plan del destino...
                </span>
              ) : (
                <span className="flex items-center gap-2 text-base">
                  <Dices className="w-5 h-5" />
                  ¡Girar la Ruleta Ahora!
                </span>
              )}
            </Button>
          </div>
        )}

        {/* Result Reveal */}
        {result && (
          <AnimatePresence>
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              className="space-y-4 relative"
            >
              <div className="p-1 rounded-3xl bg-gradient-to-r from-primary via-amber-500 to-purple-600 shadow-xl shadow-primary/20">
                <div className="bg-gray-950 rounded-[22px] p-5 space-y-4">
                  {/* Event Top Badge */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="px-2.5 py-0.5 rounded-full bg-primary/20 text-primary text-xs font-bold">
                      {result.event.category}
                    </span>
                    <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1">
                      {result.event.price?.amount > 0
                        ? `RD$ ${result.event.price.amount}`
                        : 'Entrada Gratis'}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-xl font-black text-white leading-tight">
                      {result.event.title}
                    </h3>
                    <p className="text-xs text-gray-400 mt-1 line-clamp-2">
                      {result.event.description}
                    </p>
                  </div>

                  {/* Location & Time */}
                  <div className="space-y-1.5 text-xs text-gray-300">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-primary shrink-0" />
                      <span>
                        {new Date(result.event.date).toLocaleDateString('es-DO', {
                          weekday: 'long',
                          day: 'numeric',
                          month: 'long',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-primary shrink-0" />
                      <span className="truncate">
                        {result.event.location?.venue || result.event.location?.address || 'Ubicación revelada al confirmar'}
                      </span>
                    </div>
                  </div>

                  {/* Match Reasons */}
                  {result.matchReasons && result.matchReasons.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {result.matchReasons.map((reason, idx) => (
                        <span key={idx} className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/25">
                          ✓ {reason}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Icebreaker & Fun Fact */}
                  <div className="p-3.5 rounded-2xl bg-white/5 border border-white/5 space-y-2">
                    <div className="flex items-start gap-2 text-xs text-amber-300 font-semibold">
                      <Lightbulb className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                      <span>Rompehielo para llegar:</span>
                    </div>
                    <p className="text-xs italic text-gray-300 pl-6">
                      "{result.icebreaker}"
                    </p>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-3 pt-2">
                <Button
                  variant="outline"
                  onClick={handleSpin}
                  disabled={isSpinning}
                  className="flex-1 h-12 rounded-2xl border-white/10 hover:bg-white/10 text-xs font-bold"
                >
                  <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                  Otro plan
                </Button>

                <Button
                  asChild
                  className="flex-1 h-12 rounded-2xl bg-primary hover:bg-primary/90 text-xs font-bold shadow-lg shadow-primary/20"
                >
                  <Link href={`/events/${result.event._id}`} onClick={onClose}>
                    <span>Ver este evento</span>
                    <ArrowRight className="w-4 h-4 ml-1.5" />
                  </Link>
                </Button>
              </div>
            </motion.div>
          </AnimatePresence>
        )}
      </motion.div>
    </div>
  )
}
