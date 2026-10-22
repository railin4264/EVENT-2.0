'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Users,
  UserPlus,
  MessageCircle,
  Car,
  Globe,
  Smile,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Sparkles,
  ChevronDown,
  X
} from 'lucide-react'
import { apiClient } from '@/lib/api/client'
import { useAuthStore } from '@/stores/authStore'
import { Button } from '@/components/redesign/ui/button'
import toast from 'react-hot-toast'

interface CoroMatchMember {
  user: {
    _id: string
    username: string
    firstName: string
    lastName: string
    avatar?: string
  }
  joinedAt: string
  note?: string
  contactPhone?: string
  groupSize?: number
  lookingFor?: string
}

interface CoroMatchSectionProps {
  eventId: string
  eventTitle: string
}

const LOOKING_FOR_OPTIONS = [
  { value: 'solo_friends', label: 'Panas que van solos 🤝', desc: 'Conocer gente nueva y disfrutar juntos' },
  { value: 'share_uber', label: 'Compartir Uber / Transporte 🚗', desc: 'Ahorrar transporte y llegar en grupo' },
  { value: 'tourist_guide', label: 'Turista buscando locales 🇩🇴', desc: 'Conocer la vibra auténtica dominicana' },
  { value: 'vip_table', label: 'Armar mesa o serrucho de bebidas 🥂', desc: 'Compartir espacio y consumos' }
]

export function CoroMatchSection({ eventId, eventTitle }: CoroMatchSectionProps) {
  const { isAuthenticated, user } = useAuthStore()
  const queryClient = useQueryClient()

  const [isOpenForm, setIsOpenForm] = useState(false)
  const [groupSize, setGroupSize] = useState(1)
  const [lookingFor, setLookingFor] = useState('solo_friends')
  const [note, setNote] = useState('')
  const [contactPhone, setContactPhone] = useState('')

  const { data, isLoading } = useQuery<{ success: boolean; data: CoroMatchMember[]; count: number }>({
    queryKey: ['coro-match', eventId],
    queryFn: async () => {
      const res = await apiClient.get(`/events/${eventId}/coro-match`)
      return res.data
    }
  })

  const joinMutation = useMutation({
    mutationFn: async () => {
      const res = await apiClient.post(`/events/${eventId}/coro-match`, {
        groupSize,
        lookingFor,
        note: note.trim(),
        contactPhone: contactPhone.trim()
      })
      return res.data
    },
    onSuccess: () => {
      toast.success('¡Te uniste a la lista de Arma tu Coro! 🎉')
      setIsOpenForm(false)
      setNote('')
      setContactPhone('')
      queryClient.invalidateQueries({ queryKey: ['coro-match', eventId] })
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Error al unirte a la lista.')
    }
  })

  const queue = data?.data || []
  const hasUserJoined = Boolean(
    isAuthenticated && queue.some(m => String(m.user?._id || m.user) === String(user?._id || user?.id))
  )

  return (
    <div className="rounded-3xl border border-primary/20 bg-gradient-to-b from-primary/[0.04] to-card p-6 sm:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-black uppercase tracking-wider mb-2">
            <Users className="w-3.5 h-3.5" />
            <span>Comunidad Activa · Arma tu Coro</span>
          </div>
          <h3 className="text-xl sm:text-2xl font-black text-white">
            Match de Coro: ¿Vas solo o quieres sumar gente? 🇩🇴
          </h3>
          <p className="text-xs sm:text-sm text-gray-400 mt-0.5">
            Conecta con turistas, panas que van sin grupo o comparte Uber hacia el evento.
          </p>
        </div>

        {!hasUserJoined && (
          <Button
            onClick={() => {
              if (!isAuthenticated) {
                toast.error('Inicia sesión para unirte a la lista de coros.')
                return
              }
              setIsOpenForm(!isOpenForm)
            }}
            className="rounded-2xl bg-primary hover:bg-primary/90 text-white font-bold gap-2 shrink-0 h-11 px-5 shadow-lg shadow-primary/20"
          >
            <UserPlus className="w-4 h-4" />
            <span>{isOpenForm ? 'Cerrar Formulario' : 'Unirme a la Lista de Coro'}</span>
          </Button>
        )}
      </div>

      {/* Join Form Drawer */}
      <AnimatePresence>
        {isOpenForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden border border-primary/30 rounded-2xl bg-primary/5 p-5 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                <span>¿Cómo quieres armar tu coro para este evento?</span>
              </h4>
              <button onClick={() => setIsOpenForm(false)} className="text-gray-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1.5">
                  ¿Qué estás buscando?
                </label>
                <select
                  value={lookingFor}
                  onChange={(e) => setLookingFor(e.target.value)}
                  className="w-full h-10 rounded-xl bg-gray-900 border border-white/10 px-3 text-xs text-white focus:outline-none focus:border-primary font-medium"
                >
                  {LOOKING_FOR_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1.5">
                  ¿Cuántas personas son?
                </label>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, '5+'].map((num, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setGroupSize(typeof num === 'number' ? num : 5)}
                      className={`flex-1 h-10 rounded-xl text-xs font-bold border transition ${
                        groupSize === (typeof num === 'number' ? num : 5)
                          ? 'bg-primary border-primary text-white shadow-md'
                          : 'bg-gray-900 border-white/10 text-gray-400 hover:text-white'
                      }`}
                    >
                      {num}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1.5">
                  WhatsApp de Contacto (Opcional, visible para coordinar):
                </label>
                <input
                  type="text"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  placeholder="829-000-0000"
                  className="w-full h-10 rounded-xl bg-gray-900 border border-white/10 px-3 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-primary font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1.5">
                  Nota / Zona desde donde sales:
                </label>
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Ej: Salgo desde Naco, voy en Uber, busco pana para gozar la música"
                  className="w-full h-10 rounded-xl bg-gray-900 border border-white/10 px-3 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-primary"
                />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button
                onClick={() => joinMutation.mutate()}
                disabled={joinMutation.isPending}
                className="rounded-xl bg-primary text-white font-bold h-10 px-6 gap-2 text-xs"
              >
                {joinMutation.isPending ? 'Uniendo...' : 'Publicar en la Lista de Coro'}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Members Queue Cards */}
      {isLoading ? (
        <div className="py-6 text-center text-xs text-gray-400">Cargando lista de coros...</div>
      ) : queue.length === 0 ? (
        <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/5 text-center text-gray-400 space-y-2">
          <Smile className="w-8 h-8 text-primary mx-auto opacity-75" />
          <p className="text-sm font-semibold text-white">Sé el primero en armar coro para este evento</p>
          <p className="text-xs max-w-sm mx-auto">
            Publica tu estado arriba y otros asistentes podrán ver que estás buscando compañía o compartiendo transporte.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {queue.map((member, idx) => {
            const memberUser: any = member.user || {}
            const fullName = `${memberUser.firstName || ''} ${memberUser.lastName || ''}`.trim() || memberUser.username || 'Pana EventNow'
            const avatar = memberUser.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&background=random`
            const phone = member.contactPhone?.replace(/\D/g, '')

            return (
              <div
                key={idx}
                className="rounded-2xl p-4 bg-white/5 border border-white/10 hover:border-primary/40 transition-all flex flex-col justify-between space-y-3"
              >
                <div>
                  <div className="flex items-center gap-3">
                    <img
                      src={avatar}
                      alt={fullName}
                      className="w-10 h-10 rounded-xl object-cover border border-white/10"
                    />
                    <div className="min-w-0 flex-1">
                      <h5 className="text-xs font-bold text-white truncate">{fullName}</h5>
                      <span className="text-[10px] text-primary font-medium block">
                        {member.groupSize === 1 ? 'Solo / Individual' : `Grupo de ${member.groupSize} personas`}
                      </span>
                    </div>
                  </div>

                  {member.note && (
                    <p className="text-xs text-gray-300 bg-white/5 rounded-xl p-2.5 mt-2.5 italic">
                      "{member.note}"
                    </p>
                  )}
                </div>

                <div className="pt-2 border-t border-white/5 flex items-center justify-between gap-2">
                  <span className="text-[10px] text-gray-400 flex items-center gap-1 font-mono">
                    <Clock className="w-3 h-3 text-primary" />
                    <span>Activo hoy</span>
                  </span>

                  {phone ? (
                    <a
                      href={`https://wa.me/1${phone}?text=${encodeURIComponent(
                        `¡Hola ${fullName}! Te vi en EventNow en el coro de "${eventTitle}". ¿Coordinamos para ir juntos?`
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 text-xs font-bold transition border border-emerald-500/30"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      <span>WhatsApp</span>
                    </a>
                  ) : (
                    <span className="text-[10px] text-gray-500">Contactar en evento</span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
