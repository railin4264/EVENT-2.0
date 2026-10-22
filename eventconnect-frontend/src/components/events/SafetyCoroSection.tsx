'use client'

import { useState } from 'react'
import { ShieldCheck, MessageCircle, Car, Users, MapPin, Check, Phone } from 'lucide-react'
import { apiClient } from '@/lib/api/client'
import { useAuthStore } from '@/stores/authStore'
import { useEventSignIn } from './useEventSignIn'
import toast from 'react-hot-toast'

interface SafetyCoroSectionProps {
  event: { _id: string; title: string; location?: { venue?: string; address?: string } }
  onUpdate?: () => void
}

const COMMON_RD_ZONES = [
  'Distrito Nacional (Piantini / Naco / Bella Vista)',
  'Zona Colonial / Gazcue',
  'Santo Domingo Este (Alma Rosa / San Isidro)',
  'Santo Domingo Norte (Villa Mella / Charles)',
  'Santo Domingo Oeste (Herrera / Luperón)',
  'Santiago de los Caballeros (Centro / Monumento)',
  'Punta Cana / Bávaro',
  'Otra zona de República Dominicana'
]

export default function SafetyCoroSection({ event, onUpdate }: SafetyCoroSectionProps) {
  const { isAuthenticated, user } = useAuthStore()
  const requestSignIn = useEventSignIn(event._id)
  const [selectedZone, setSelectedZone] = useState(COMMON_RD_ZONES[0])
  const [customZone, setCustomZone] = useState('')
  const [role, setRole] = useState<'passenger' | 'driver'>('passenger')
  const [phone, setPhone] = useState('')
  const [isJoining, setIsJoining] = useState(false)
  const [joined, setJoined] = useState(false)

  const eventTitle = event.title
  const venue = (event.location as any)?.venue || event.location?.address || 'Lugar del evento'

  // Pre-formatted WhatsApp safety check-ins
  const handleArrivalCheckIn = () => {
    const text = encodeURIComponent(
      `🛡️ *Check-in de Seguridad EventNow*\n\n` +
      `¡Hola! Te aviso que acabo de llegar bien a:\n` +
      `*${eventTitle}*\n` +
      `📍 ${venue}\n\n` +
      `Todo en orden por aquí. Te aviso cuando vaya de regreso. ✨`
    )
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank')
  }

  const handleDepartureCheckIn = () => {
    const text = encodeURIComponent(
      `🚗 *Check-in de Salida EventNow*\n\n` +
      `¡Hola! Voy saliendo ya de:\n` +
      `*${eventTitle}* (${venue})\n` +
      `Rumbo a casa ahora. Te escribo en cuanto llegue. 👍`
    )
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank')
  }

  const handleJoinCarpool = async () => {
    if (!isAuthenticated) {
      toast.error('Inicia sesión para unirte al Coro Seguro')
      requestSignIn()
      return
    }
    setIsJoining(true)
    try {
      const targetZone = selectedZone === 'Otra zona de República Dominicana' && customZone.trim()
        ? customZone.trim()
        : selectedZone

      const res = await apiClient.post(`/events/${event._id}/safety/carpool`, {
        zone: targetZone,
        contactPhone: phone.trim() || undefined,
        role
      })

      if (res.data?.success) {
        setJoined(true)
        toast.success(`¡Te uniste al grupo de retorno para ${targetZone}!`)
        if (onUpdate) onUpdate()
      }
    } catch {
      toast.error('No se pudo completar el registro en Coro Seguro')
    } finally {
      setIsJoining(false)
    }
  }

  return (
    <div className="rounded-3xl border border-emerald-500/20 bg-gradient-to-br from-emerald-950/20 via-card to-card p-6 shadow-xl">
      <div className="flex items-center gap-3 border-b border-border/50 pb-5">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/20 text-emerald-400">
          <ShieldCheck className="h-6 w-6" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-xl font-bold text-foreground">Coro Seguro & Retorno</h3>
            <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-bold text-emerald-400 border border-emerald-500/20">
              Tranquilidad
            </span>
          </div>
          <p className="text-xs text-muted-foreground">Coordina tu regreso acompañado y avisa a tu familia con 1 clic</p>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Left Column: 1-Click WhatsApp Safety Ping */}
        <div className="rounded-2xl border border-white/10 bg-muted/30 p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm font-bold text-foreground">
              <MessageCircle className="h-4 w-4 text-emerald-400" />
              <span>Avisos de Seguridad (WhatsApp)</span>
            </div>
            <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">
              Envía un mensaje rápido a tus padres, pareja o amigos con los detalles exactos del evento y ubicación:
            </p>
          </div>

          <div className="mt-4 flex flex-col gap-2.5">
            <button
              onClick={handleArrivalCheckIn}
              className="flex items-center justify-center gap-2 rounded-xl bg-emerald-600/90 hover:bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white shadow-md active:scale-98 transition-all"
            >
              <span>📍 Avisar que llegué bien</span>
            </button>
            <button
              onClick={handleDepartureCheckIn}
              className="flex items-center justify-center gap-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-white/10 px-4 py-2.5 text-xs font-bold text-white shadow-sm active:scale-98 transition-all"
            >
              <span>🚗 Avisar que voy rumbo a casa</span>
            </button>
          </div>
        </div>

        {/* Right Column: Carpool & Return Coordination */}
        <div className="rounded-2xl border border-white/10 bg-muted/30 p-5">
          <div className="flex items-center gap-2 text-sm font-bold text-foreground">
            <Car className="h-4 w-4 text-primary" />
            <span>Retorno en Caravana / Carpool</span>
          </div>
          <p className="mt-1.5 text-xs text-muted-foreground">
            Únete al grupo de asistentes que regresan hacia tu misma zona para compartir Uber o regresar en caravana.
          </p>

          <div className="mt-3.5 space-y-3">
            <div>
              <label className="mb-1 block text-[11px] font-semibold text-muted-foreground">Tu zona de destino:</label>
              <select
                value={selectedZone}
                onChange={e => setSelectedZone(e.target.value)}
                className="w-full rounded-xl border border-border bg-card px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {COMMON_RD_ZONES.map(z => (
                  <option key={z} value={z}>{z}</option>
                ))}
              </select>
            </div>

            {selectedZone === 'Otra zona de República Dominicana' && (
              <input
                type="text"
                placeholder="Escribe tu sector o municipio..."
                value={customZone}
                onChange={e => setCustomZone(e.target.value)}
                className="w-full rounded-xl border border-border bg-card px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            )}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setRole('passenger')}
                className={`flex-1 rounded-xl py-2 text-xs font-bold transition-all ${
                  role === 'passenger' ? 'bg-primary text-white shadow' : 'bg-card text-muted-foreground border border-border'
                }`}
              >
                🙋 Pasajero (Busco coro)
              </button>
              <button
                type="button"
                onClick={() => setRole('driver')}
                className={`flex-1 rounded-xl py-2 text-xs font-bold transition-all ${
                  role === 'driver' ? 'bg-primary text-white shadow' : 'bg-card text-muted-foreground border border-border'
                }`}
              >
                🚙 Conductor (Tengo cupo)
              </button>
            </div>

            <button
              onClick={handleJoinCarpool}
              disabled={isJoining || joined}
              className={`w-full rounded-xl py-2.5 text-xs font-bold shadow-md transition-all ${
                joined
                  ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30'
                  : 'bg-primary text-white hover:bg-primary/90 active:scale-98'
              }`}
            >
              {joined ? '✓ Te has sumado al Coro Seguro' : isJoining ? 'Registrando...' : 'Sumarme al Coro de mi Zona'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
