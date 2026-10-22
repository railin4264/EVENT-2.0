'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Music, Flame, Plus, ExternalLink, Disc, X, Loader2, Sparkles, Award } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import { apiClient } from '@/lib/api/client'
import { useAuthStore } from '@/stores/authStore'
import { useEventSignIn } from './useEventSignIn'
import { getImageUrl } from '@/lib/utils'
import { safeEventLink } from './event-detail-utils'

export interface EventSongItem {
  _id: string
  user: {
    _id: string
    firstName?: string
    lastName?: string
    username?: string
    avatar?: string
  }
  title: string
  artist: string
  spotifyUrl?: string
  youtubeUrl?: string
  votesCount: number
  hasVoted: boolean
  createdAt: string
}

export function EventSongVotingSection({ eventId }: { eventId: string }) {
  const queryClient = useQueryClient()
  const { isAuthenticated, user } = useAuthStore()
  const requestSignIn = useEventSignIn(eventId)
  const socialQueryKey = ['event-songs', eventId, isAuthenticated ? user?.id || user?._id : 'guest']
  const [isModalOpen, setIsModalOpen] = useState(false)

  const [form, setForm] = useState({
    title: '',
    artist: '',
    spotifyUrl: '',
    youtubeUrl: ''
  })

  // Query songs
  const { data: songs = [], isLoading, error, refetch } = useQuery<EventSongItem[]>({
    queryKey: socialQueryKey,
    queryFn: async () => {
      const res = await apiClient.get(`/events/${eventId}/songs`)
      return Array.isArray(res.data?.data) ? res.data.data : []
    },
    staleTime: 15_000
  })

  // Mutation: Nominate song
  const nominateSongMutation = useMutation({
    mutationFn: async (payload: typeof form) => {
      const res = await apiClient.post(`/events/${eventId}/songs`, payload)
      return res.data
    },
    onSuccess: () => {
      toast.success('🎵 ¡Canción nominada! Ya los asistentes pueden votar por ella.')
      setIsModalOpen(false)
      setForm({ title: '', artist: '', spotifyUrl: '', youtubeUrl: '' })
      queryClient.invalidateQueries({ queryKey: socialQueryKey })
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Error al nominar canción')
    }
  })

  // Mutation: Vote song
  const toggleVoteMutation = useMutation({
    mutationFn: async (songId: string) => {
      const res = await apiClient.post(`/events/${eventId}/songs/${songId}/vote`)
      return { songId, ...res.data }
    },
    onMutate: async (songId) => {
      await queryClient.cancelQueries({ queryKey: socialQueryKey })
      const previous = queryClient.getQueryData<EventSongItem[]>(socialQueryKey)
      if (previous) {
        queryClient.setQueryData<EventSongItem[]>(
          socialQueryKey,
          previous.map(s => {
            if (s._id === songId) {
              const hasVoted = !s.hasVoted
              return {
                ...s,
                hasVoted,
                votesCount: hasVoted ? s.votesCount + 1 : Math.max(0, s.votesCount - 1)
              }
            }
            return s
          }).sort((a, b) => b.votesCount - a.votesCount)
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
      toast.error('Inicia sesión para nominar una canción')
      requestSignIn()
      return
    }
    if (!form.title.trim() || !form.artist.trim()) {
      toast.error('Ingresa título y artista')
      return
    }
    if (nominateSongMutation.isPending) return
    nominateSongMutation.mutate(form)
  }

  return (
    <section className="glass border-white/10 rounded-3xl p-6 sm:p-8 backdrop-blur-xl bg-white/5 shadow-xl relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute -left-12 -top-12 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-bold mb-2">
            <Music className="w-3.5 h-3.5" />
            <span>Playlist Colaborativa</span>
            <span className="w-1 h-1 rounded-full bg-amber-400" />
            <span>Himno del Coro</span>
          </div>
          <h3 className="text-xl font-extrabold text-foreground tracking-tight">
            Vota por las canciones que deben sonar en este evento
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Las pistas más votadas le indican al DJ u organizador qué vibra espera el público.
          </p>
        </div>

        <button
          onClick={() => {
            if (!isAuthenticated) {
              toast.error('Inicia sesión para proponer una canción')
              requestSignIn()
              return
            }
            setIsModalOpen(true)
          }}
          className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-bold text-sm shadow-lg shadow-amber-500/20 transition-all hover:scale-105 active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>Nominar Canción</span>
        </button>
      </div>

      {/* Content */}
      {error ? (
        <div role="alert" className="rounded-2xl border border-amber-500/25 bg-amber-500/5 p-4 text-sm text-muted-foreground">
          No pudimos cargar esta sección.
          <button type="button" onClick={() => refetch()} className="ml-2 font-semibold text-primary underline">Reintentar</button>
        </div>
      ) : isLoading ? (
        <div className="space-y-2.5">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-16 rounded-2xl bg-white/5 border border-white/10 animate-pulse" />
          ))}
        </div>
      ) : songs.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/15 p-6 text-center bg-white/[0.02]">
          <Disc className="w-8 h-8 mx-auto text-muted-foreground/50 mb-2" />
          <p className="text-sm font-bold text-foreground">Aún no se han propuesto canciones</p>
          <p className="text-xs text-muted-foreground mt-0.5 max-w-sm mx-auto">
            ¿Qué tema no puede faltar en este evento? Sé el primero en nominar una canción para que el coro la vote.
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {songs.map((song, idx) => {
            const isFirst = idx === 0 && song.votesCount > 1
            const isTop3 = idx < 3

            return (
              <motion.div
                key={song._id}
                layout
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className={`p-3.5 sm:p-4 rounded-2xl border transition flex items-center justify-between gap-3 ${
                  isFirst
                    ? 'border-amber-500/40 bg-gradient-to-r from-amber-950/30 via-orange-950/15 to-transparent'
                    : 'border-white/10 bg-white/5 hover:border-white/20'
                }`}
              >
                {/* Rank & Song Info */}
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center font-extrabold text-xs shrink-0 ${
                      idx === 0
                        ? 'bg-amber-500 text-black shadow-md shadow-amber-500/30'
                        : idx === 1
                        ? 'bg-slate-300 text-black'
                        : idx === 2
                        ? 'bg-amber-700/80 text-white'
                        : 'bg-white/10 text-muted-foreground'
                    }`}
                  >
                    {idx + 1}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-foreground truncate">{song.title}</p>
                      {isFirst && (
                        <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30">
                          <Award className="w-3 h-3" /> Himno #1
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{song.artist}</p>
                  </div>
                </div>

                {/* Actions & Votes */}
                <div className="flex items-center gap-2 shrink-0">
                  {safeEventLink(song.spotifyUrl) && (
                    <a
                      href={safeEventLink(song.spotifyUrl)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 transition hidden sm:flex items-center"
                      title="Escuchar en Spotify"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}

                  <button
                    onClick={() => {
                      if (!isAuthenticated) {
                        toast.error('Inicia sesión para votar')
                        requestSignIn()
                        return
                      }
                      if (toggleVoteMutation.isPending) return
                      toggleVoteMutation.mutate(song._id)
                    }}
                    disabled={toggleVoteMutation.isPending}
                    className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-bold transition ${
                      song.hasVoted
                        ? 'bg-orange-500/25 border-orange-500/50 text-orange-400'
                        : 'bg-white/5 border-white/10 text-muted-foreground hover:text-foreground hover:bg-white/10'
                    }`}
                  >
                    <Flame className={`w-4 h-4 ${song.hasVoted ? 'fill-current text-orange-400' : 'text-muted-foreground'}`} />
                    <span className="font-extrabold">{song.votesCount}</span>
                  </button>
                </div>
              </motion.div>
            )
          })}
        </div>
      )}

      {/* Nominate Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md rounded-3xl glass border-white/20 bg-slate-900/95 p-6 shadow-2xl relative"
            >
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <Music className="w-5 h-5 text-amber-400" />
                  <h4 className="text-lg font-bold text-foreground">Nominar canción</h4>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="p-1 rounded-full text-muted-foreground hover:text-foreground">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="mt-4 space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">
                    Título de la canción
                  </label>
                  <input
                    required
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    placeholder="Ej. Tití Me Preguntó / Bachata Rosa"
                    className="w-full h-11 px-3.5 rounded-xl bg-white/5 border border-white/10 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">
                    Artista o Agrupación
                  </label>
                  <input
                    required
                    value={form.artist}
                    onChange={(e) => setForm({ ...form, artist: e.target.value })}
                    placeholder="Ej. Bad Bunny / Juan Luis Guerra"
                    className="w-full h-11 px-3.5 rounded-xl bg-white/5 border border-white/10 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">
                    Enlace de Spotify o YouTube (opcional)
                  </label>
                  <input
                    type="url"
                    value={form.spotifyUrl}
                    onChange={(e) => setForm({ ...form, spotifyUrl: e.target.value })}
                    placeholder="https://open.spotify.com/track/..."
                    className="w-full h-11 px-3.5 rounded-xl bg-white/5 border border-white/10 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-amber-500"
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
                    disabled={nominateSongMutation.isPending || !form.title.trim() || !form.artist.trim()}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 text-white text-xs font-bold shadow-lg shadow-amber-500/20 disabled:opacity-50"
                  >
                    {nominateSongMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                    <span>Nominar para el coro</span>
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
