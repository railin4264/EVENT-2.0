'use client'

import { useState } from 'react'
import { Flame, Wind, Users, Moon, Sparkles, Check, MessageSquare, ChevronDown } from 'lucide-react'
import { apiClient } from '@/lib/api/client'
import { useAuthStore } from '@/stores/authStore'
import { useEventSignIn } from './useEventSignIn'
import toast from 'react-hot-toast'

interface VibeRadarData {
  currentVibe: 'lit' | 'chill' | 'packed' | 'winding_down' | 'none'
  reportsCount: number
  counts: {
    lit: number
    chill: number
    packed: number
    winding_down: number
  }
  recentReports?: Array<{
    user?: {
      firstName?: string
      lastName?: string
      username?: string
      avatar?: string
    }
    vibe: string
    comment?: string
    reportedAt: string
  }>
}

interface VibeRadarSectionProps {
  eventId: string
  initialData?: VibeRadarData
  isLiveOrToday?: boolean
}

const VIBE_CONFIG = {
  lit: {
    label: '¡Encendido!',
    emoji: '🔥',
    badgeClass: 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-orange-500/30',
    description: 'Ambiente a tope con la mejor energía'
  },
  chill: {
    label: 'Modo Chill',
    emoji: '🍃',
    badgeClass: 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-emerald-500/30',
    description: 'Tranquilo, buena vibra para conversar'
  },
  packed: {
    label: 'A Capacidad',
    emoji: '👥',
    badgeClass: 'bg-gradient-to-r from-purple-500 to-indigo-500 text-white shadow-purple-500/30',
    description: 'Lleno de gente, coro completo'
  },
  winding_down: {
    label: 'Bajando Ritmo',
    emoji: '💤',
    badgeClass: 'bg-gradient-to-r from-slate-600 to-gray-700 text-white',
    description: 'Terminando o ambiente suave'
  },
  none: {
    label: 'Sin Reportes',
    emoji: '✨',
    badgeClass: 'bg-muted text-muted-foreground',
    description: 'Sé el primero en reportar la vibra'
  }
}

export default function VibeRadarSection({ eventId, initialData, isLiveOrToday = true }: VibeRadarSectionProps) {
  const { isAuthenticated, user } = useAuthStore()
  const requestSignIn = useEventSignIn(eventId)
  const [vibeData, setVibeData] = useState<VibeRadarData>(initialData || {
    currentVibe: 'none',
    reportsCount: 0,
    counts: { lit: 0, chill: 0, packed: 0, winding_down: 0 },
    recentReports: []
  })
  const [selectedVibe, setSelectedVibe] = useState<'lit' | 'chill' | 'packed' | 'winding_down' | null>(null)
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [hasVoted, setHasVoted] = useState(false)

  const currentCfg = VIBE_CONFIG[vibeData.currentVibe] || VIBE_CONFIG.none

  const handleVote = async (vibe: 'lit' | 'chill' | 'packed' | 'winding_down') => {
    if (!isAuthenticated) {
      toast.error('Inicia sesión para reportar el ambiente en vivo')
      requestSignIn()
      return
    }
    setSelectedVibe(vibe)
  }

  const handleSubmitReport = async () => {
    if (!selectedVibe) return
    setSubmitting(true)
    try {
      const res = await apiClient.post(`/events/${eventId}/vibe`, {
        vibe: selectedVibe,
        comment: comment.trim() || undefined
      })
      if (res.data?.success) {
        setVibeData(prev => ({
          ...prev,
          currentVibe: res.data.data.currentVibe,
          counts: res.data.data.counts,
          reportsCount: res.data.data.reportsCount
        }))
        setHasVoted(true)
        setSelectedVibe(null)
        setComment('')
        toast.success('¡Gracias por reportar la vibra del evento!')
      }
    } catch {
      toast.error('No se pudo registrar tu reporte')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="rounded-3xl border border-white/10 bg-card/60 p-6 backdrop-blur-xl shadow-xl">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/50 pb-5">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-amber-500/20 to-orange-500/20 text-orange-400">
            <Flame className="h-6 w-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xl font-bold text-foreground">Termómetro de Vibra</h3>
              <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-bold text-emerald-400 border border-emerald-500/20">
                En Vivo
              </span>
            </div>
            <p className="text-xs text-muted-foreground">Reportado por asistentes en el lugar en tiempo real</p>
          </div>
        </div>

        {/* Current Vibe Pill */}
        <div className={`flex items-center gap-2 rounded-2xl px-4 py-2 font-bold text-sm shadow-lg ${currentCfg.badgeClass}`}>
          <span className="text-lg">{currentCfg.emoji}</span>
          <span>{currentCfg.label}</span>
          {vibeData.reportsCount > 0 && (
            <span className="ml-1 text-xs opacity-80">({vibeData.reportsCount})</span>
          )}
        </div>
      </div>

      {/* Vibe Voting Row */}
      <div className="mt-6">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {hasVoted ? 'Tu reporte está activo · Puedes actualizarlo' : '¿Cómo está el ambiente ahora mismo?'}
        </p>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { id: 'lit', label: 'Encendido', emoji: '🔥', desc: 'Música & hype' },
            { id: 'chill', label: 'Chill', emoji: '🍃', desc: 'Tranqui & charla' },
            { id: 'packed', label: 'Lleno', emoji: '👥', desc: 'A tope' },
            { id: 'winding_down', label: 'Bajando', emoji: '💤', desc: 'Concluyendo' }
          ].map(opt => {
            const isSelected = selectedVibe === opt.id
            const count = vibeData.counts[opt.id as keyof typeof vibeData.counts] || 0
            return (
              <button
                key={opt.id}
                onClick={() => handleVote(opt.id as any)}
                className={`flex flex-col items-center justify-center rounded-2xl border p-3.5 text-center transition-all ${
                  isSelected
                    ? 'border-primary bg-primary/10 shadow-md ring-2 ring-primary/30 scale-102'
                    : 'border-border/60 bg-muted/40 hover:bg-muted/80 hover:border-border'
                }`}
              >
                <span className="text-2xl">{opt.emoji}</span>
                <span className="mt-1 text-xs font-bold text-foreground">{opt.label}</span>
                <span className="text-[11px] text-muted-foreground">{count} votos</span>
              </button>
            )
          })}
        </div>

        {/* Optional Comment Submission */}
        {selectedVibe && (
          <div className="mt-4 rounded-2xl border border-primary/20 bg-primary/5 p-4 animate-in fade-in slide-in-from-top-2">
            <label className="mb-1.5 block text-xs font-medium text-foreground">
              Comentario rápido (opcional):
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Ej. El sonido está nítido, buen ambiente..."
                maxLength={140}
                value={comment}
                onChange={e => setComment(e.target.value)}
                className="flex-1 rounded-xl border border-border bg-card px-3.5 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <button
                onClick={handleSubmitReport}
                disabled={submitting}
                className="rounded-xl bg-primary px-4 py-2 text-xs font-bold text-white shadow-md hover:bg-primary/90 active:scale-95 transition-all"
              >
                {submitting ? 'Enviando...' : 'Confirmar'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Recent Impression Comments */}
      {vibeData.recentReports && vibeData.recentReports.length > 0 && (
        <div className="mt-6 border-t border-border/50 pt-4">
          <p className="mb-2 text-xs font-semibold text-muted-foreground">Últimas impresiones en el lugar:</p>
          <div className="space-y-2">
            {vibeData.recentReports.slice(0, 3).map((rep, idx) => (
              <div key={idx} className="flex items-start gap-2.5 rounded-xl bg-muted/30 p-2.5 text-xs">
                <span className="text-base">{VIBE_CONFIG[rep.vibe as keyof typeof VIBE_CONFIG]?.emoji || '✨'}</span>
                <div>
                  <span className="font-semibold text-foreground">
                    {rep.user?.firstName || rep.user?.username || 'Asistente'}:
                  </span>
                  <span className="ml-1 text-muted-foreground">{rep.comment || VIBE_CONFIG[rep.vibe as keyof typeof VIBE_CONFIG]?.label}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
