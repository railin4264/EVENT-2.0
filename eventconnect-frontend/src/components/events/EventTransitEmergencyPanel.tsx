'use client'

import { ShieldCheck, PhoneCall, Car, Train, AlertTriangle } from 'lucide-react'

interface EventTransitEmergencyPanelProps {
  locationName?: string
  coordinates?: [number, number]
}

export default function EventTransitEmergencyPanel({ locationName, coordinates }: EventTransitEmergencyPanelProps) {
  const [lng, lat] = (Array.isArray(coordinates) && coordinates.length === 2 && !isNaN(coordinates[0]))
    ? coordinates
    : [-69.9312, 18.4861]

  const uberUrl = `https://m.uber.com/ul/?action=setPickup&pickup=my_location&dropoff[latitude]=${lat}&dropoff[longitude]=${lng}`

  return (
    <div className="rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-950/20 via-slate-900/60 to-slate-900/90 p-5 shadow-lg backdrop-blur-md">
      <div className="flex items-center justify-between pb-3 border-b border-emerald-500/10 mb-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400">
            <ShieldCheck className="h-4 w-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-400">
              Seguridad & Transporte Oficial RD
            </h4>
            <p className="text-[11px] text-gray-400">
              Tranquilidad para locales, coros y turistas en el evento
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        {/* Politur */}
        <a
          href="tel:8092222026"
          className="flex flex-col items-center justify-center rounded-xl border border-blue-500/30 bg-blue-950/30 p-3 text-center transition hover:bg-blue-900/40 active:scale-95"
        >
          <PhoneCall className="h-5 w-5 text-blue-400 mb-1" />
          <span className="text-xs font-bold text-white">POLITUR</span>
          <span className="text-[10px] text-blue-300">809-222-2026</span>
          <span className="text-[9px] text-gray-400 mt-0.5">Policía Turística</span>
        </a>

        {/* 911 Emergencias */}
        <a
          href="tel:911"
          className="flex flex-col items-center justify-center rounded-xl border border-red-500/30 bg-red-950/30 p-3 text-center transition hover:bg-red-900/40 active:scale-95"
        >
          <AlertTriangle className="h-5 w-5 text-red-400 mb-1" />
          <span className="text-xs font-bold text-white">Emergencias</span>
          <span className="text-[10px] text-red-300">Marcar 9-1-1</span>
          <span className="text-[9px] text-gray-400 mt-0.5">Respuesta inmediata</span>
        </a>

        {/* Uber Directo */}
        <a
          href={uberUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex flex-col items-center justify-center rounded-xl border border-gray-700 bg-gray-800/80 p-3 text-center transition hover:bg-gray-750 active:scale-95"
        >
          <Car className="h-5 w-5 text-white mb-1" />
          <span className="text-xs font-bold text-white">Pedir Uber</span>
          <span className="text-[10px] text-gray-300">Destino fijado</span>
          <span className="text-[9px] text-gray-400 mt-0.5">Al recinto del evento</span>
        </a>

        {/* Metro / OMSA */}
        <div className="flex flex-col items-center justify-center rounded-xl border border-emerald-500/30 bg-emerald-950/30 p-3 text-center">
          <Train className="h-5 w-5 text-emerald-400 mb-1" />
          <span className="text-xs font-bold text-white">Metro / OMSA</span>
          <span className="text-[10px] text-emerald-300">Transporte público</span>
          <span className="text-[9px] text-gray-400 mt-0.5">Rutas Santo Domingo</span>
        </div>
      </div>
    </div>
  )
}
