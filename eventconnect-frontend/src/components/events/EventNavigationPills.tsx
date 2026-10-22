'use client'

import { Navigation, Compass, MapPin } from 'lucide-react'

interface EventNavigationPillsProps {
  coordinates?: [number, number]
  address?: string
  title?: string
}

export default function EventNavigationPills({ coordinates, address, title }: EventNavigationPillsProps) {
  // Default to Santo Domingo if coordinates are missing
  const [lng, lat] = (Array.isArray(coordinates) && coordinates.length === 2 && !isNaN(coordinates[0]))
    ? coordinates
    : [-69.9312, 18.4861]

  const encodedTitle = encodeURIComponent(title || address || 'Destino EventNow')
  const wazeUrl = `https://waze.com/ul?ll=${lat},${lng}&navigate=yes`
  const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`
  const appleMapsUrl = `maps://?daddr=${lat},${lng}&q=${encodedTitle}`

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-md">
      <div className="flex items-center gap-2 mb-3">
        <Navigation className="h-4 w-4 text-emerald-400" />
        <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-400">
          Navegación 1-Tap (Llega sin tapón)
        </h4>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <a
          href={wazeUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 px-3 py-2.5 text-xs font-bold text-white shadow-md shadow-cyan-900/30 transition hover:brightness-110 active:scale-95"
        >
          <Compass className="h-4 w-4" />
          <span>Waze (Tapones)</span>
        </a>

        <a
          href={googleMapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-3 py-2.5 text-xs font-bold text-white shadow-md shadow-emerald-900/30 transition hover:brightness-110 active:scale-95"
        >
          <MapPin className="h-4 w-4" />
          <span>Google Maps</span>
        </a>

        <a
          href={appleMapsUrl}
          className="col-span-2 sm:col-span-1 flex items-center justify-center gap-2 rounded-xl bg-gray-800 border border-gray-700 px-3 py-2.5 text-xs font-bold text-gray-200 transition hover:bg-gray-750 active:scale-95"
        >
          <span>🍎 Apple Maps</span>
        </a>
      </div>

      <p className="mt-2 text-[11px] text-gray-400 text-center">
        Abre tu app GPS con la ruta calculada al instante sin copiar direcciones.
      </p>
    </div>
  )
}
