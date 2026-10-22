'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Sparkles, Users, Lock, Heart, CheckCircle2, MessageCircle, ShieldCheck } from 'lucide-react'
import { apiClient } from '@/lib/api/client'
import { Button } from '@/components/redesign/ui/button'
import toast from 'react-hot-toast'
import Link from 'next/link'
import { useAuthStore } from '@/stores/authStore'

interface Candidate {
  user: {
    _id: string
    firstName: string
    username: string
    avatar?: string
  }
  alreadySelected: boolean
  isMutual: boolean
}

interface MutualReconnectSectionProps {
  eventId: string
  isAttendee: boolean
}

export function MutualReconnectSection({ eventId, isAttendee }: MutualReconnectSectionProps) {
  const queryClient = useQueryClient()
  const { user, isAuthenticated } = useAuthStore()
  const candidateQueryKey = ['reconnect-candidates', eventId, user?.id || user?._id]
  const [selectedCandidates, setSelectedCandidates] = useState<Record<string, boolean>>({})

  const { data: candidates = [], isLoading } = useQuery<Candidate[]>({
    queryKey: candidateQueryKey,
    queryFn: async () => {
      const res = await apiClient.get(`/events/${eventId}/reconnect/candidates`)
      return Array.isArray(res.data?.data) ? res.data.data.filter((candidate: Candidate) => candidate?.user?._id) : []
    },
    enabled: isAuthenticated && isAttendee
  })

  const reconnectMutation = useMutation({
    mutationFn: async (targetUserId: string) => {
      const res = await apiClient.post(`/events/${eventId}/reconnect`, { targetUserId })
      return { targetUserId, ...res.data }
    },
    onSuccess: (data) => {
      setSelectedCandidates(prev => ({ ...prev, [data.targetUserId]: true }))
      queryClient.invalidateQueries({ queryKey: candidateQueryKey })
      if (data.isMutual) {
        toast.success('🎉 ¡Coincidencia mutua! A ambos les gustaría volver a coincidir.', { duration: 5000 })
      } else {
        toast.success('🔒 Guardado de forma 100% privada. Solo se revelará si ambos coinciden.', { duration: 4000 })
      }
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'No se pudo guardar la selección')
    }
  })

  if (!isAuthenticated || !isAttendee || candidates.length === 0) {
    return null
  }

  return (
    <section className="p-5 rounded-3xl bg-gradient-to-br from-indigo-950/40 via-purple-950/25 to-slate-900 border border-indigo-500/25 shadow-xl space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/15 border border-purple-500/30 text-purple-300 text-xs font-bold mb-1.5">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Conexión Post-Evento</span>
          </div>
          <h3 className="text-lg font-black tracking-tight text-white flex items-center gap-2">
            «Me gustaría volver a coincidir»
          </h3>
          <p className="text-xs text-gray-400">
            ¿Conociste a alguien chévere? Marca discretamente con quién te gustaría repetir plan. <strong className="text-gray-300">Es 100% confidencial</strong>: solo se revelará si ambos se eligen mutuamente.
          </p>
        </div>
        <div className="p-2 rounded-2xl bg-indigo-500/10 text-indigo-400 shrink-0">
          <Lock className="w-5 h-5" />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
        {candidates.map((candidate) => {
          const isSelected = candidate.alreadySelected || selectedCandidates[candidate.user._id]
          const isMutual = candidate.isMutual

          return (
            <div
              key={candidate.user._id}
              className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                isMutual
                  ? 'bg-emerald-950/30 border-emerald-500/40 shadow-lg shadow-emerald-500/10'
                  : isSelected
                  ? 'bg-purple-950/20 border-purple-500/30'
                  : 'bg-white/5 border-white/5 hover:border-white/10'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 text-white font-bold flex items-center justify-center text-xs shrink-0 shadow-sm overflow-hidden">
                  {candidate.user.avatar ? (
                    <img src={candidate.user.avatar} alt="" className="w-full h-full object-cover" />
                  ) : (
                    (candidate.user.firstName || 'U')[0].toUpperCase()
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-white truncate">
                    {candidate.user.firstName || candidate.user.username}
                  </p>
                  <p className="text-[11px] text-gray-400 truncate">
                    @{candidate.user.username}
                  </p>
                </div>
              </div>

              <div>
                {isMutual ? (
                  <Button
                    size="sm"
                    asChild
                    className="h-8 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold shadow-md shadow-emerald-600/20"
                  >
                    <Link href={`/messages?userId=${candidate.user._id}`}>
                      <MessageCircle className="w-3.5 h-3.5 mr-1" />
                      Chat Activo
                    </Link>
                  </Button>
                ) : isSelected ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-semibold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                    <CheckCircle2 className="w-3 h-3" />
                    Enviado (Privado)
                  </span>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={reconnectMutation.isPending}
                    onClick={() => reconnectMutation.mutate(candidate.user._id)}
                    className="h-8 px-3 rounded-xl border-indigo-500/30 hover:bg-indigo-500/20 text-indigo-300 text-[11px] font-bold transition-all"
                  >
                    <Heart className="w-3 h-3 mr-1 text-rose-400" />
                    Coincidir
                  </Button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      <div className="flex items-center gap-1.5 text-[11px] text-gray-400 bg-white/5 p-2.5 rounded-xl border border-white/5">
        <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
        <span>Garantía de privacidad: Si la otra persona no te elige, nunca sabrá que la seleccionaste. Cero momentos incómodos.</span>
      </div>
    </section>
  )
}
