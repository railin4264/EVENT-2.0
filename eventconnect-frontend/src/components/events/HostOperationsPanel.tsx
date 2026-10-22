'use client'

import React, { useState } from 'react'
import { QrCode, Megaphone, TrendingUp, Users, DollarSign, Send, CheckCircle2, AlertTriangle, ShieldCheck } from 'lucide-react'
import { useLocaleStore } from '@/stores/localeStore'
import { toast } from 'sonner'

interface HostOperationsPanelProps {
  eventId: string
  eventTitle: string
  confirmedCount?: number
  maxCapacity?: number
}

export default function HostOperationsPanel({
  eventId,
  eventTitle,
  confirmedCount = 120,
  maxCapacity = 200
}: HostOperationsPanelProps) {
  const { config } = useLocaleStore()
  const [broadcastMessage, setBroadcastMessage] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [doorScans, setDoorScans] = useState(84)
  const [selectedPayout, setSelectedPayout] = useState(config.payoutMethods[0]?.id || '')

  const capacityPercent = Math.min(100, Math.round((doorScans / (maxCapacity || 200)) * 100))

  const handleSendBroadcast = (e: React.FormEvent) => {
    e.preventDefault()
    if (!broadcastMessage.trim()) return

    setIsSending(true)
    setTimeout(() => {
      setIsSending(false)
      setBroadcastMessage('')
      toast.success(`Alerta enviada a los ${confirmedCount} asistentes confirmados`)
    }, 600)
  }

  return (
    <div className="rounded-3xl border border-violet-500/30 bg-gradient-to-br from-violet-950/30 via-black/40 to-black/60 p-6 backdrop-blur-xl shadow-xl space-y-6">
      {/* Title */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-violet-500/20 text-violet-400 flex items-center justify-center font-bold">
            <QrCode className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-bold text-base text-foreground flex items-center gap-2">
              <span>Panel Operativo del Anfitrión</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-300 border border-violet-500/30">
                Creador Verificado
              </span>
            </h3>
            <p className="text-xs text-muted-foreground">
              Monitor de puerta en vivo, aforo y broadcast de anuncios
            </p>
          </div>
        </div>
      </div>

      {/* Live Door Counter Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
            <span>Escaneos en Puerta</span>
            <Users className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-emerald-400 font-mono">
            {doorScans} / {confirmedCount}
          </div>
          <p className="text-[10px] text-muted-foreground mt-1">
            Asistentes que ya ingresaron al recinto
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
            <span>Ocupación del Recinto</span>
            <TrendingUp className="h-4 w-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-black text-cyan-400 font-mono">
            {capacityPercent}%
          </div>
          <div className="w-full bg-white/10 rounded-full h-1.5 mt-2 overflow-hidden">
            <div
              className="bg-cyan-400 h-1.5 rounded-full transition-all duration-500"
              style={{ width: `${capacityPercent}%` }}
            />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
            <span>Velocidad de Ingreso</span>
            <ShieldCheck className="h-4 w-4 text-violet-400" />
          </div>
          <div className="text-2xl font-black text-violet-400 font-mono">
            ~8 / min
          </div>
          <p className="text-[10px] text-muted-foreground mt-1">
            Fluidez óptima en el control de acceso
          </p>
        </div>
      </div>

      {/* Organizer Megaphone / Broadcast */}
      <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3">
        <div className="flex items-center gap-2 text-xs font-bold text-foreground">
          <Megaphone className="h-4 w-4 text-violet-400" />
          <span>Megáfono Instantáneo a Asistentes Confirmados</span>
        </div>
        <p className="text-[11px] text-muted-foreground">
          Envía una notificación push o mensaje prioritario a todos los que tienen ticket para este evento.
        </p>

        <form onSubmit={handleSendBroadcast} className="flex gap-2">
          <input
            type="text"
            value={broadcastMessage}
            onChange={(e) => setBroadcastMessage(e.target.value)}
            placeholder="Ej: ¡La banda principal sube a tarima en 15 minutos!"
            maxLength={180}
            className="flex-1 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-violet-500"
          />
          <button
            type="submit"
            disabled={isSending || !broadcastMessage.trim()}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold text-xs flex items-center gap-1.5 transition shadow-lg shadow-violet-500/20 disabled:opacity-50"
          >
            <Send className="h-3.5 w-3.5" />
            <span>{isSending ? 'Enviando...' : 'Transmitir'}</span>
          </button>
        </form>
      </div>

      {/* Regional Payout Selector */}
      <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <DollarSign className="h-4 w-4 text-emerald-400" />
          <span>Método de Cobro ({config.countryName}):</span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {config.payoutMethods.map(pm => (
            <button
              key={pm.id}
              type="button"
              onClick={() => setSelectedPayout(pm.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition border ${
                selectedPayout === pm.id
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                  : 'bg-white/5 text-gray-400 border-white/10 hover:bg-white/10'
              }`}
            >
              {pm.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
