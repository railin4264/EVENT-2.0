'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Moon, MapPin, Users, Plus, ExternalLink, Utensils, Flame, Music, Coffee, Check, X, Loader2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import { apiClient } from '@/lib/api/client'
import { useAuthStore } from '@/stores/authStore'
import { useEventSignIn } from './useEventSignIn'
import { safeEventLink } from './event-detail-utils'

export interface AfterSpot {
  _id: string
  user: {
    _id: string
    firstName?: string
    lastName?: string
    username?: string
    avatar?: string
  }
  spotName: string
  spotType: 'bar' | 'food' | 'club' | 'chill' | 'other'
  address?: string
  googleMapsUrl?: string
  vibe: 'encendido' | 'comida_tardia' | 'musica' | 'tranquilo_hablar'
  description?: string
  goingCount: number
  isGoing: boolean
  createdAt: string
}

const VIBE_META: Record<string, { label: string; icon: any; color: string }> = {
  comida_tardia: { label: '🍔 Comida tardía / Chimi', icon: Utensils, color: 'text-amber-400 bg-amber-500/10 border-amber-500/30' },
  encendido: { label: '🔥 Sigue encendido', icon: Flame, color: 'text-red-400 bg-red-500/10 border-red-500/30' },
  musica: { label: '🎶 Música & Tragos', icon: Music, color: 'text-purple-400 bg-purple-500/10 border-purple-500/30' },
  tranquilo_hablar: { label: '🛋️ Tranquilo para hablar', icon: Coffee, color: 'text-teal-400 bg-teal-500/10 border-teal-500/30' }
}

export function EventAfterRadarSection({ eventId }: { eventId: string }) {
  const queryClient = useQueryClient()
  const { isAuthenticated, user } = useAuthStore()
  const requestSignIn = useEventSignIn(eventId)
  const socialQueryKey = ['event-afters', eventId, isAuthenticated ? user?.id || user?._id : 'guest']
  const [isModalOpen, setIsModalOpen] = useState(false)

  const [form, setForm] = useState({
    spotName: '',
    spotType: 'food' as 'bar' | 'food' | 'club' | 'chill' | 'other',
    address: '',
    googleMapsUrl: '',
    vibe: 'comida_tardia' as 'encendido' | 'comida_tardia' | 'musica' | 'tranquilo_hablar',
    description: ''
  })

  // Query afters
  const { data: afters = [], isLoading, error, refetch } = useQuery<AfterSpot[]>({
    queryKey: socialQueryKey,
    queryFn: async () => {
      const res = await apiClient.get(`/events/${eventId}/afters`)
      return Array.isArray(res.data?.data) ? res.data.data : []
    },
    staleTime: 15_000
  })

  // Mutation: Propose after
  const createAfterMutation = useMutation({
    mutationFn: async (payload: typeof form) => {
      const res = await apiClient.post(`/events/${eventId}/afters`, payload)
      return res.data
    },
    onSuccess: () => {
      toast.success('🌙 ¡Lugar de after propuesto! Los demás pueden unirse.')
      setIsModalOpen(false)
      setForm({
        spotName: '',
        spotType: 'food',
        address: '',
        googleMapsUrl: '',
        vibe: 'comida_tardia',
        description: ''
      })
      queryClient.invalidateQueries({ queryKey: socialQueryKey })
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Error al proponer lugar de after')
    }
  })

  // Mutation: Toggle vote
  const toggleVoteMutation = useMutation({
    mutationFn: async (afterId: string) => {
      const res = await apiClient.post(`/events/${eventId}/afters/${afterId}/vote`)
      return { afterId, ...res.data }
    },
    onMutate: async (afterId) => {
      await queryClient.cancelQueries({ queryKey: socialQueryKey })
      const previous = queryClient.getQueryData<AfterSpot[]>(socialQueryKey)
      if (previous) {
        queryClient.setQueryData<AfterSpot[]>(
          socialQueryKey,
          previous.map(a => {
            if (a._id === afterId) {
              const isGoing = !a.isGoing
              return {
                ...a,
                isGoing,
                goingCount: isGoing ? a.goingCount + 1 : Math.max(0, a.goingCount - 1)
              }
            }
            return a
          })
        )
      }
      return { previous }
    },
    onError: (err: any, _id, context) => {
      if (context?.previous) queryClient.setQueryData(socialQueryKey, context.previous)
      toast.error(err?.response?.data?.message || 'No se pudo registrar tu voto')
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: socialQueryKey })
    }
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!isAuthenticated) {
      toast.error('Inicia sesión para proponer un after')
      requestSignIn()
      return
    }
    if (!form.spotName.trim()) {
      toast.error('Ingresa el nombre del lugar')
      return
    }
    if (createAfterMutation.isPending) return
    createAfterMutation.mutate(form)
  }

  return (
    <section className="glass border-white/10 rounded-3xl p-6 sm:p-8 backdrop-blur-xl bg-white/5 shadow-xl relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute -left-12 -bottom-12 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 text-xs font-bold mb-2">
            <Moon className="w-3.5 h-3.5" />
            <span>Radar Nocturno</span>
            <span className="w-1 h-1 rounded-full bg-indigo-400" />
            <span>¿Dónde es el After?</span>
          </div>
          <h3 className="text-xl font-extrabold text-foreground tracking-tight">
            Para dónde sigue el coro después del evento
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Chimichurris, bares, lounges o food trucks votados por los mismos asistentes.
          </p>
        </div>

        <button
          onClick={() => {
            if (!isAuthenticated) {
              toast.error('Inicia sesión para sugerir un punto de after')
              requestSignIn()
              return
            }
            setIsModalOpen(true)
          }}
          className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white font-bold text-sm shadow-lg shadow-indigo-500/20 transition-all hover:scale-105 active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>Sugerir un After</span>
        </button>
      </div>

      {/* Content */}
      {error ? (
        <div role="alert" className="rounded-2xl border border-amber-500/25 bg-amber-500/5 p-4 text-sm text-muted-foreground">
          No pudimos cargar esta sección.
          <button type="button" onClick={() => refetch()} className="ml-2 font-semibold text-primary underline">Reintentar</button>
        </div>
      ) : isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="h-28 rounded-2xl bg-white/5 border border-white/10 animate-pulse" />
          ))}
        </div>
      ) : afters.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/15 p-6 text-center bg-white/[0.02]">
          <Moon className="w-8 h-8 mx-auto text-muted-foreground/50 mb-2" />
          <p className="text-sm font-bold text-foreground">Aún no se ha propuesto un after</p>
          <p className="text-xs text-muted-foreground mt-0.5 max-w-sm mx-auto">
            ¿Conoces un chimi, terraza o bar cercano con buena vibra para cuando termine el evento? Proponlo aquí.
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {afters.map((after) => {
            const vibeMeta = VIBE_META[after.vibe] || VIBE_META.comida_tardia
            const VibeIcon = vibeMeta.icon

            return (
              <motion.div
                key={after._id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 rounded-2xl border border-white/10 bg-white/5 hover:border-white/20 transition flex flex-col justify-between gap-3 shadow-sm"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border text-[11px] font-bold ${vibeMeta.color}`}>
                      <VibeIcon className="w-3 h-3" />
                      <span>{vibeMeta.label}</span>
                    </span>

                    <span className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      <strong className="text-foreground">{after.goingCount}</strong> van
                    </span>
                  </div>

                  <h4 className="text-base font-bold text-foreground mt-2">{after.spotName}</h4>

                  {after.address && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                      <MapPin className="w-3 h-3 shrink-0" />
                      <span className="truncate">{after.address}</span>
                    </p>
                  )}

                  {after.description && (
                    <p className="text-xs text-gray-300 mt-2 line-clamp-2 italic">
                      "{after.description}"
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-between gap-2 pt-2 border-t border-white/5">
                  {safeEventLink(after.googleMapsUrl) ? (
                    <a
                      href={safeEventLink(after.googleMapsUrl)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-semibold"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Abrir en Maps</span>
                    </a>
                  ) : <div />}

                  <button
                    onClick={() => {
                      if (!isAuthenticated) {
                        toast.error('Inicia sesión para votar')
                        requestSignIn()
                        return
                      }
                      if (toggleVoteMutation.isPending) return
                      toggleVoteMutation.mutate(after._id)
                    }}
                    disabled={toggleVoteMutation.isPending}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition ${
                      after.isGoing
                        ? 'bg-indigo-500/20 border-indigo-500/40 text-indigo-300'
                        : 'bg-white/5 border-white/10 text-muted-foreground hover:text-foreground hover:bg-white/10'
                    }`}
                  >
                    <Check className={`w-3.5 h-3.5 ${after.isGoing ? 'text-indigo-400' : 'opacity-40'}`} />
                    <span>{after.isGoing ? 'Yo voy para allá ✓' : 'Me sumo a este after'}</span>
                  </button>
                </div>
              </motion.div>
            )
          })}
        </div>
      )}

      {/* Suggest After Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg rounded-3xl glass border-white/20 bg-slate-900/95 p-6 shadow-2xl relative"
            >
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <Moon className="w-5 h-5 text-indigo-400" />
                  <h4 className="text-lg font-bold text-foreground">Sugerir lugar de after</h4>
                </div>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="p-1 rounded-full text-muted-foreground hover:text-foreground"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="mt-4 space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">
                    Nombre del lugar o negocio
                  </label>
                  <input
                    required
                    value={form.spotName}
                    onChange={(e) => setForm({ ...form, spotName: e.target.value })}
                    placeholder="Ej. Chimi El Puente / Barra Payán / Bar 1968"
                    className="w-full h-11 px-3.5 rounded-xl bg-white/5 border border-white/10 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1">
                      Tipo de plan
                    </label>
                    <select
                      value={form.spotType}
                      onChange={(e) => setForm({ ...form, spotType: e.target.value as any })}
                      className="w-full h-11 px-3 rounded-xl bg-slate-800 border border-white/10 text-sm text-foreground outline-none focus:border-indigo-500"
                    >
                      <option value="food">🍔 Comida / Chimi</option>
                      <option value="bar">🍸 Bar / Tragos</option>
                      <option value="club">🪩 Discoteca / Club</option>
                      <option value="chill">🛋️ Terraza / Chill</option>
                      <option value="other">📍 Otro</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1">
                      Vibra del lugar
                    </label>
                    <select
                      value={form.vibe}
                      onChange={(e) => setForm({ ...form, vibe: e.target.value as any })}
                      className="w-full h-11 px-3 rounded-xl bg-slate-800 border border-white/10 text-sm text-foreground outline-none focus:border-indigo-500"
                    >
                      <option value="comida_tardia">🍔 Comida tardía</option>
                      <option value="encendido">🔥 Sigue encendido</option>
                      <option value="musica">🎶 Música y baile</option>
                      <option value="tranquilo_hablar">🛋️ Tranquilo para hablar</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">
                    Dirección o punto de referencia (opcional)
                  </label>
                  <input
                    value={form.address}
                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                    placeholder="Ej. Av. Winston Churchill esq. 27 de Febrero"
                    className="w-full h-11 px-3.5 rounded-xl bg-white/5 border border-white/10 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">
                    Link de Google Maps o Waze (opcional)
                  </label>
                  <input
                    type="url"
                    value={form.googleMapsUrl}
                    onChange={(e) => setForm({ ...form, googleMapsUrl: e.target.value })}
                    placeholder="https://maps.app.goo.gl/..."
                    className="w-full h-11 px-3.5 rounded-xl bg-white/5 border border-white/10 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">
                    Nota o recomendación (opcional)
                  </label>
                  <input
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    placeholder="Ej. Hay parqueo cómodo y cierran a las 3 AM"
                    className="w-full h-11 px-3.5 rounded-xl bg-white/5 border border-white/10 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-3">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2.5 rounded-xl border border-white/10 text-xs font-bold text-muted-foreground hover:text-foreground"
                  >
                    Cancelar
                  </button>

                  <button
                    type="submit"
                    disabled={createAfterMutation.isPending || !form.spotName.trim()}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 text-white text-xs font-bold shadow-lg shadow-indigo-500/20 disabled:opacity-50"
                  >
                    {createAfterMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                    <span>Publicar punto de after</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </section>
  )
}
