'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { HeartHandshake, Users, Sparkles, UserPlus, Check, MessageCircle, HelpCircle } from 'lucide-react'
import { apiClient } from '@/lib/api/client'
import { useAuthStore } from '@/stores/authStore'
import { getImageUrl } from '@/lib/utils'
import { Button } from '@/components/redesign/ui/button'
import toast from 'react-hot-toast'

interface SoloGoersProps {
  eventId: string
  isOrganizer?: boolean
}

export function SoloGoersSection({ eventId, isOrganizer }: SoloGoersProps) {
  const queryClient = useQueryClient()
  const { isAuthenticated, user } = useAuthStore()
  const [showTips, setShowTips] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['solo-attendees', eventId, isAuthenticated ? user?.id || user?._id : 'guest'],
    queryFn: async () => {
      const res = await apiClient.get(`/events/${eventId}/solo-attendees`)
      return res.data?.data
    },
    staleTime: 60 * 1000
  })

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await apiClient.post(`/events/${eventId}/solo-toggle`)
      return res.data
    },
    onSuccess: (res) => {
      toast.success(res.message || 'Estado actualizado')
      queryClient.invalidateQueries({ queryKey: ['solo-attendees', eventId] })
      queryClient.invalidateQueries({ queryKey: ['event', eventId] })
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Inicia sesión para unirte a la mesa de solos')
    }
  })

  const hostMutation = useMutation({
    mutationFn: async ({ meetingSpot, timeWindow }: { meetingSpot: string; timeWindow: string }) => {
      const res = await apiClient.post(`/events/${eventId}/solo-host`, { meetingSpot, timeWindow })
      return res.data
    },
    onSuccess: (res) => {
      toast.success(res.message || '¡Quedaste registrado como Anfitrión de Bienvenida!')
      queryClient.invalidateQueries({ queryKey: ['solo-attendees', eventId] })
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Debes ser asistente para ser anfitrión')
    }
  })

  const handleVolunteerHost = () => {
    const meetingSpot = prompt('¿Dónde esperarás a los que lleguen solos?', 'Mesa alta junto a la entrada principal')
    if (!meetingSpot) return
    const timeWindow = prompt('¿En qué rango de tiempo recibirás a la gente?', 'Primeros 15 min (llegar puntual)')
    if (!timeWindow) return
    hostMutation.mutate({ meetingSpot, timeWindow })
  }

  if (isLoading) return null
  if (!data?.isSoloFriendly && !data?.count) return null

  const attendees = Array.isArray(data?.attendees) ? data.attendees.filter((attendee: any) => attendee?._id) : []
  const count = data?.count || 0
  const isUserSolo = data?.isUserSolo || false

  return (
    <div className="rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/5 via-card to-amber-500/5 p-6 sm:p-7 shadow-sm space-y-5">
      {/* Top Banner */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold">
            <HeartHandshake className="w-3.5 h-3.5" />
            <span>Mesa de los que van Solos</span>
          </div>
          <h3 className="text-lg sm:text-xl font-bold tracking-tight text-foreground">
            ¿Vienes sin coro? ¡Aquí nadie se queda aislado!
          </h3>
          <p className="text-xs sm:text-sm text-muted-foreground max-w-xl">
            {data?.welcomeNote || 'Este anfitrión designó una mesa y punto de encuentro informal para que quienes vienen solos conecten y disfruten juntos.'}
          </p>
        </div>

        {/* Action Button */}
        {isAuthenticated ? (
          <Button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending}
            className={`rounded-2xl text-xs font-bold h-11 px-5 shadow-sm transition-all ${
              isUserSolo
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                : 'bg-primary hover:bg-primary/90 text-primary-foreground'
            }`}
          >
            {isUserSolo ? (
              <span className="flex items-center gap-1.5">
                <Check className="w-4 h-4" />
                Estás en la mesa de solos
              </span>
            ) : (
              <span className="flex items-center gap-1.5">
                <UserPlus className="w-4 h-4" />
                Voy solo/a (Sumarme)
              </span>
            )}
          </Button>
        ) : (
          <Button asChild variant="outline" className="rounded-2xl text-xs font-bold h-11">
            <a href={`/login?redirect=%2Fevents%2F${eventId}`}>
              Inicia sesión para sumarte
            </a>
          </Button>
        )}
      </div>

      {/* Welcome Host Banner (Bienvenida con Anfitrión Voluntario) */}
      {data?.welcomeHost?.confirmed ? (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/25 flex items-start gap-3.5">
          <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400 shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div className="space-y-1 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-black text-amber-300 text-sm">
                Anfitrión de Bienvenida: {data.welcomeHost.name}
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                Confirmado
              </span>
            </div>
            <p className="text-gray-300">
              📍 Punto de encuentro: <strong className="text-white font-bold">{data.welcomeHost.meetingSpot}</strong>
            </p>
            <p className="text-amber-400/90 text-[11px] font-medium">
              ⏱️ Te recibirá durante: {data.welcomeHost.timeWindow}
            </p>
          </div>
        </div>
      ) : isAuthenticated ? (
        <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-2xl bg-white/5 border border-white/10 text-xs">
          <span className="text-muted-foreground text-[11px]">
            ¿Conoces el lugar o quieres recibir a quienes vienen solos?
          </span>
          <button
            onClick={handleVolunteerHost}
            disabled={hostMutation.isPending}
            className="text-xs font-bold text-primary hover:underline transition-colors"
          >
            + Postularme como Anfitrión de Bienvenida
          </button>
        </div>
      ) : null}

      {/* Solo Attendees List */}
      <div className="flex flex-wrap items-center gap-4 pt-1 border-t border-border/50">
        <div className="flex items-center -space-x-2 overflow-hidden">
          {attendees.slice(0, 7).map((user: any) => (
            <div
              key={user._id}
              className="w-10 h-10 rounded-full border-2 border-background bg-primary/10 overflow-hidden flex items-center justify-center font-bold text-xs text-primary shadow-sm"
              title={`${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username}
            >
              {user.avatar ? (
                <img
                  src={getImageUrl(user.avatar)}
                  alt={user.username}
                  className="w-full h-full object-cover"
                />
              ) : (
                user.firstName?.[0] || user.username?.[0] || 'U'
              )}
            </div>
          ))}
        </div>

        <div className="text-xs">
          <span className="font-bold text-foreground">
            {count === 0 ? 'Sé el primero en sumarte a la mesa' : `${count} ${count === 1 ? 'persona viene' : 'personas vienen'} solas a este plan`}
          </span>
          <p className="text-muted-foreground text-[11px]">
            Llega 15 minutos antes para romper el hielo en el punto de encuentro
          </p>
        </div>
      </div>

      {/* Icebreaker Guidance */}
      <div className="p-3.5 rounded-2xl bg-card border border-border/60 text-xs space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="font-bold text-primary flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" />
            Consejo para romper el hielo al llegar:
          </span>
          <button
            onClick={() => setShowTips(!showTips)}
            className="text-[11px] text-muted-foreground hover:text-foreground underline"
          >
            {showTips ? 'Ocultar' : 'Ver más consejos'}
          </button>
        </div>
        <p className="text-muted-foreground italic">
          "Pregunta al llegar: '¿Primera vez en este plan o ya habían venido antes?' — Casi todos estarán en tu misma situación."
        </p>
        {showTips && (
          <ul className="list-disc pl-4 text-muted-foreground space-y-1 text-[11px] pt-1">
            <li>Ubica el farol o punto de recepción indicado en el mapa.</li>
            <li>No necesitas forzar conversación: simplemente disfruta la música o el arte mientras compartes el espacio.</li>
            <li>Si te sientes incómodo en cualquier momento, el anfitrión verificado te presentará al grupo.</li>
          </ul>
        )}
      </div>
    </div>
  )
}
