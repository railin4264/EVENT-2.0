'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Ticket, UserPlus, Users, Plus, MessageCircle, CheckCircle2, DollarSign, X, Loader2, Sparkles, AlertCircle } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import { apiClient } from '@/lib/api/client'
import { useAuthStore } from '@/stores/authStore'
import { useEventSignIn } from './useEventSignIn'
import { getImageUrl } from '@/lib/utils'

export interface PlusOnePost {
  _id: string
  user: {
    _id: string
    firstName?: string
    lastName?: string
    username?: string
    avatar?: string
  }
  type: 'have_extra_ticket' | 'looking_for_companion' | 'group_join'
  title: string
  description?: string
  ticketPrice: number
  isFree: boolean
  status: 'open' | 'matched' | 'closed'
  isOwner: boolean
  hasExpressedInterest: boolean
  interestedCount?: number
  interestedUsers: {
    user: {
      _id: string
      firstName?: string
      lastName?: string
      username?: string
      avatar?: string
    }
    message?: string
    createdAt: string
  }[]
  matchedWith?: any
  createdAt: string
}

const TYPE_CONFIG = {
  have_extra_ticket: {
    label: '🎟️ Boleta Extra',
    badgeClass: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400',
    titleHelp: 'Ej. Tengo 1 boleta VIP extra al costo'
  },
  looking_for_companion: {
    label: '🙋 Busco Acompañante',
    badgeClass: 'bg-purple-500/15 border-purple-500/30 text-purple-400',
    titleHelp: 'Ej. Voy desde Santo Domingo Este y busco con quién ir'
  },
  group_join: {
    label: '👥 Sumarse a Grupo',
    badgeClass: 'bg-blue-500/15 border-blue-500/30 text-blue-400',
    titleHelp: 'Ej. Tenemos mesa de 4 y caben 2 personas más'
  }
}

export function EventPlusOneSection({ eventId }: { eventId: string }) {
  const queryClient = useQueryClient()
  const { user, isAuthenticated } = useAuthStore()
  const requestSignIn = useEventSignIn(eventId)
  const socialQueryKey = ['event-plus-ones', eventId, isAuthenticated ? user?.id || user?._id : 'guest']

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [interestModalPost, setInterestModalPost] = useState<PlusOnePost | null>(null)
  const [interestMessage, setInterestMessage] = useState('')

  const [form, setForm] = useState({
    type: 'have_extra_ticket' as 'have_extra_ticket' | 'looking_for_companion' | 'group_join',
    title: '',
    description: '',
    ticketPrice: '',
    isFree: false
  })

  // Query plus ones
  const { data: posts = [], isLoading, error, refetch } = useQuery<PlusOnePost[]>({
    queryKey: socialQueryKey,
    queryFn: async () => {
      const res = await apiClient.get(`/events/${eventId}/plus-ones`)
      return Array.isArray(res.data?.data) ? res.data.data : []
    },
    staleTime: 15_000
  })

  // Mutation: Create post
  const createPostMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await apiClient.post(`/events/${eventId}/plus-ones`, payload)
      return res.data
    },
    onSuccess: () => {
      toast.success('🎉 Publicación creada con éxito')
      setIsModalOpen(false)
      setForm({
        type: 'have_extra_ticket',
        title: '',
        description: '',
        ticketPrice: '',
        isFree: false
      })
      queryClient.invalidateQueries({ queryKey: socialQueryKey })
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Error al publicar')
    }
  })

  // Mutation: Express interest
  const expressInterestMutation = useMutation({
    mutationFn: async ({ postId, message }: { postId: string; message: string }) => {
      const res = await apiClient.post(`/events/${eventId}/plus-ones/${postId}/interest`, { message })
      return res.data
    },
    onSuccess: () => {
      toast.success('Interés enviado. La persona que publicó podrá responderte.')
      setInterestModalPost(null)
      setInterestMessage('')
      queryClient.invalidateQueries({ queryKey: socialQueryKey })
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Error al enviar mensaje')
    }
  })

  // Mutation: Match with applicant
  const matchMutation = useMutation({
    mutationFn: async ({ postId, targetUserId }: { postId: string; targetUserId: string }) => {
      const res = await apiClient.post(`/events/${eventId}/plus-ones/${postId}/match`, { targetUserId })
      return res.data
    },
    onSuccess: () => {
      toast.success('🎉 ¡Acompañante confirmado! Ya están coordinados.')
      queryClient.invalidateQueries({ queryKey: socialQueryKey })
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Error al confirmar')
    }
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!isAuthenticated) {
      toast.error('Inicia sesión para publicar')
      requestSignIn()
      return
    }
    if (!form.title.trim()) {
      toast.error('Por favor escribe un título')
      return
    }
    if (createPostMutation.isPending) return
    createPostMutation.mutate({
      ...form,
      ticketPrice: form.isFree ? 0 : Number(form.ticketPrice) || 0
    })
  }

  return (
    <section className="glass border-white/10 rounded-3xl p-6 sm:p-8 backdrop-blur-xl bg-white/5 shadow-xl relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute -right-12 -bottom-12 w-48 h-48 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/15 border border-purple-500/30 text-purple-300 text-xs font-bold mb-2">
            <UserPlus className="w-3.5 h-3.5" />
            <span>Plus-One & Boletas Extra</span>
            <span className="w-1 h-1 rounded-full bg-purple-400" />
            <span>Compañeros de Evento</span>
          </div>
          <h3 className="text-xl font-extrabold text-foreground tracking-tight">
            ¿Buscas con quién ir o te sobra una boleta?
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Conecta de forma segura con otros asistentes sin revendedores ni intermediarios.
          </p>
        </div>

        <button
          onClick={() => {
            if (!isAuthenticated) {
              toast.error('Inicia sesión para publicar')
              requestSignIn()
              return
            }
            setIsModalOpen(true)
          }}
          className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white font-bold text-sm shadow-lg shadow-purple-500/20 transition-all hover:scale-105 active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>Publicar Anuncio</span>
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
      ) : posts.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/15 p-6 text-center bg-white/[0.02]">
          <Ticket className="w-8 h-8 mx-auto text-muted-foreground/50 mb-2" />
          <p className="text-sm font-bold text-foreground">No hay solicitudes activas aún</p>
          <p className="text-xs text-muted-foreground mt-0.5 max-w-sm mx-auto">
            ¿Te sobra una boleta o quieres conocer gente que vaya a este mismo plan? Publica un anuncio aquí.
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {posts.map((post) => {
            const config = TYPE_CONFIG[post.type] || TYPE_CONFIG.looking_for_companion
            const isMatched = post.status === 'matched'

            return (
              <motion.div
                key={post._id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`p-4 rounded-2xl border transition flex flex-col justify-between gap-3 shadow-sm ${
                  isMatched ? 'border-emerald-500/30 bg-emerald-950/15' : 'border-white/10 bg-white/5'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border text-[11px] font-bold ${config.badgeClass}`}>
                      <span>{config.label}</span>
                    </span>

                    {post.type === 'have_extra_ticket' && (
                      <span className="text-xs font-black text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-lg border border-emerald-500/20">
                        {post.isFree ? 'GRATIS' : `RD$ ${(Number(post.ticketPrice) || 0).toLocaleString()}`}
                      </span>
                    )}

                    {isMatched && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded-full">
                        <CheckCircle2 className="w-3 h-3" /> Coordinado
                      </span>
                    )}
                  </div>

                  <h4 className="text-base font-bold text-foreground mt-2">{post.title}</h4>

                  {post.description && (
                    <p className="text-xs text-gray-300 mt-1 line-clamp-2">
                      {post.description}
                    </p>
                  )}

                  <div className="flex items-center gap-2 mt-3 pt-2 border-t border-white/5">
                    <img
                      src={post.user?.avatar ? getImageUrl(post.user.avatar) : '/default-avatar.png'}
                      alt=""
                      className="w-5 h-5 rounded-full object-cover"
                    />
                    <span className="text-xs text-muted-foreground font-medium">
                      Por {post.user?.firstName || post.user?.username || 'Usuario'}
                    </span>
                  </div>
                </div>

                {/* Footer action */}
                <div className="pt-2 border-t border-white/5 flex items-center justify-between gap-2">
                  <span className="text-[11px] text-muted-foreground">
                    {post.interestedCount ?? post.interestedUsers?.length ?? 0} interesados
                  </span>

                  {post.isOwner ? (
                    <span className="text-xs font-bold text-purple-300">
                      Tu anuncio {post.interestedUsers?.length ? `(${post.interestedUsers.length} solicitudes)` : ''}
                    </span>
                  ) : isMatched ? (
                    <span className="text-xs text-muted-foreground italic">Cerrado</span>
                  ) : post.hasExpressedInterest ? (
                    <span className="text-xs font-bold text-emerald-400 inline-flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Interés enviado
                    </span>
                  ) : (
                    <button
                      onClick={() => {
                        if (!isAuthenticated) {
                          toast.error('Inicia sesión para responder a este anuncio')
                          requestSignIn()
                          return
                        }
                        setInterestModalPost(post)
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/40 text-purple-300 text-xs font-bold transition"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      <span>Me interesa coordinar</span>
                    </button>
                  )}
                </div>

                {/* Owner: List applicants if any */}
                {post.isOwner && !isMatched && (post.interestedUsers?.length || 0) > 0 && (
                  <div className="mt-2 p-2.5 rounded-xl bg-black/40 border border-white/10 space-y-2">
                    <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                      Solicitudes recibidas:
                    </p>
                    {post.interestedUsers.filter(applicant => applicant?.user?._id).map((applicant) => (
                      <div key={applicant.user._id} className="flex items-center justify-between gap-2 text-xs">
                        <div className="flex items-center gap-1.5 truncate">
                          <img
                            src={applicant.user.avatar ? getImageUrl(applicant.user.avatar) : '/default-avatar.png'}
                            alt=""
                            className="w-4 h-4 rounded-full"
                          />
                          <span className="font-semibold text-foreground truncate">{applicant.user.firstName || applicant.user.username}</span>
                        </div>
                        <button
                          onClick={() => { if (!matchMutation.isPending) matchMutation.mutate({ postId: post._id, targetUserId: applicant.user._id }) }}
                          disabled={matchMutation.isPending}
                          className="px-2 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-[11px] font-bold border border-emerald-500/30 transition shrink-0"
                        >
                          Aceptar
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            )
          })}
        </div>
      )}

      {/* Publish Modal */}
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
                  <UserPlus className="w-5 h-5 text-purple-400" />
                  <h4 className="text-lg font-bold text-foreground">Publicar aviso de acompañante</h4>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="p-1 rounded-full text-muted-foreground hover:text-foreground">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="mt-4 space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">
                    ¿Qué deseas publicar?
                  </label>
                  <select
                    value={form.type}
                    onChange={(e) => setForm({ ...form, type: e.target.value as any })}
                    className="w-full h-11 px-3 rounded-xl bg-slate-800 border border-white/10 text-sm text-foreground outline-none focus:border-purple-500"
                  >
                    <option value="have_extra_ticket">🎟️ Tengo una boleta extra (al costo o gratis)</option>
                    <option value="looking_for_companion">🙋 Busco acompañante para ir juntos</option>
                    <option value="group_join">👥 Tenemos un grupo y queremos que se sume más gente</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">
                    Título descriptivo
                  </label>
                  <input
                    required
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    placeholder={TYPE_CONFIG[form.type].titleHelp}
                    className="w-full h-11 px-3.5 rounded-xl bg-white/5 border border-white/10 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-purple-500"
                  />
                </div>

                {form.type === 'have_extra_ticket' && (
                  <div className="space-y-2">
                    <label className="block text-xs font-semibold text-muted-foreground">
                      Precio de la boleta (RD$)
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        type="number"
                        disabled={form.isFree}
                        value={form.ticketPrice}
                        onChange={(e) => setForm({ ...form, ticketPrice: e.target.value })}
                        placeholder="Ej. 1500"
                        className="flex-1 h-11 px-3.5 rounded-xl bg-white/5 border border-white/10 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-purple-500 disabled:opacity-40"
                      />
                      <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-foreground">
                        <input
                          type="checkbox"
                          checked={form.isFree}
                          onChange={(e) => setForm({ ...form, isFree: e.target.checked })}
                          className="rounded border-white/20 bg-white/5 text-purple-600 focus:ring-0"
                        />
                        <span>Es una invitación (Gratis)</span>
                      </label>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">
                    Detalles adicionales (opcional)
                  </label>
                  <textarea
                    rows={2}
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    placeholder="Cuéntanos un poco sobre tu plan o qué tipo de coro tienes pensado..."
                    className="w-full p-3.5 rounded-xl bg-white/5 border border-white/10 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-purple-500"
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
                    disabled={createPostMutation.isPending || !form.title.trim()}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-500 to-pink-600 text-white text-xs font-bold shadow-lg shadow-purple-500/20 disabled:opacity-50"
                  >
                    {createPostMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                    <span>Publicar aviso</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Express Interest Modal */}
      <AnimatePresence>
        {interestModalPost && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md rounded-3xl glass border-white/20 bg-slate-900/95 p-6 shadow-2xl relative"
            >
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <h4 className="text-base font-bold text-foreground">Enviar mensaje para coordinar</h4>
                <button onClick={() => setInterestModalPost(null)} className="p-1 rounded-full text-muted-foreground hover:text-foreground">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="mt-3 text-xs text-muted-foreground">
                Respondiendo al aviso de <strong className="text-foreground">{interestModalPost.user?.firstName || 'Usuario'}</strong>:
                <p className="mt-1 p-2 rounded-xl bg-white/5 border border-white/10 italic text-gray-300">
                  "{interestModalPost.title}"
                </p>
              </div>

              <div className="mt-3">
                <label className="block text-xs font-semibold text-muted-foreground mb-1">
                  Tu mensaje
                </label>
                <textarea
                  rows={3}
                  value={interestMessage}
                  onChange={(e) => setInterestMessage(e.target.value)}
                  placeholder="¡Hola! Me gustaría ir a este evento y compartir coro contigo..."
                  className="w-full p-3 rounded-xl bg-white/5 border border-white/10 text-sm text-foreground outline-none focus:border-purple-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3">
                <button
                  type="button"
                  onClick={() => setInterestModalPost(null)}
                  className="px-4 py-2 rounded-xl border border-white/10 text-xs font-bold text-muted-foreground hover:text-foreground"
                >
                  Cancelar
                </button>

                <button
                  onClick={() => expressInterestMutation.mutate({ postId: interestModalPost._id, message: interestMessage })}
                  disabled={expressInterestMutation.isPending}
                  className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-gradient-to-r from-purple-500 to-pink-600 text-white text-xs font-bold shadow-lg shadow-purple-500/20 disabled:opacity-50"
                >
                  {expressInterestMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <MessageCircle className="w-3.5 h-3.5" />}
                  <span>Enviar interés</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </section>
  )
}
