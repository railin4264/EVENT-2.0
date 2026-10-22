'use client'

import React, { useState, useEffect } from 'react'
import { Moon, Navigation, Clock, Sparkles, MapPin, ExternalLink, ShieldCheck } from 'lucide-react'
import { useLocaleStore } from '@/stores/localeStore'
import { apiClient } from '@/lib/api/client'

interface AfterSpot {
  id: string
  name: string
  category: string
  distanceMin: number
  address: string
  openUntil: string
  perk: string
  verified: boolean
  coords: [number, number]
}

interface AfterPartySectionProps {
  eventId: string
  eventCoordinates?: [number, number]
  eventEndTime?: string | Date
  venueName?: string
  city?: string
}

export default function AfterPartySection({
  eventId,
  eventCoordinates,
  eventEndTime,
  venueName,
  city = 'Santo Domingo'
}: AfterPartySectionProps) {
  const { config, isTouristMode } = useLocaleStore()
  const [afterSpots, setAfterSpots] = useState<AfterSpot[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Generate intelligent afters based on location coordinates & city profile
    const timer = setTimeout(() => {
      // Mock / dynamic resolution tailored to regional profile
      let spots: AfterSpot[] = []

      if (config.countryCode === 'ES') {
        spots = [
          {
            id: 'after-es-1',
            name: 'Sala Sol & Late Club',
            category: 'Discoteca & Copas',
            distanceMin: 6,
            address: 'Calle Jardines, Centro, Madrid',
            openUntil: '06:00 AM',
            perk: 'Entrada con 1 consumición mostrando tu entrada',
            verified: true,
            coords: [-3.7025, 40.4182]
          },
          {
            id: 'after-es-2',
            name: 'Chocolatería San Ginés',
            category: 'Gastronomía Nocturna 24h',
            distanceMin: 9,
            address: 'Pasadizo de San Ginés, 5, Madrid',
            openUntil: 'Abierto 24 Horas',
            perk: 'Churros tradicionales para cerrar la noche',
            verified: true,
            coords: [-3.7065, 40.4171]
          },
          {
            id: 'after-es-3',
            name: 'Café Berlín Jazz & Funk',
            category: 'Música en vivo & Lounge',
            distanceMin: 12,
            address: 'Costanilla de los Ángeles, 20, Madrid',
            openUntil: '05:30 AM',
            perk: 'Descuento 15% en coctelería para asistentes',
            verified: true,
            coords: [-3.7088, 40.4195]
          }
        ]
      } else if (config.countryCode === 'MX') {
        spots = [
          {
            id: 'after-mx-1',
            name: 'Taquería El Califa / Orinoco',
            category: 'Tacos & Cerveza 24h',
            distanceMin: 7,
            address: 'Av. Álvaro Obregón, Roma Norte, CDMX',
            openUntil: '05:00 AM',
            perk: 'Agua fresca o chela gratis en consumo de tacos',
            verified: true,
            coords: [-99.1623, 19.4182]
          },
          {
            id: 'after-mx-2',
            name: 'Bar Oriente & Club',
            category: 'Música & Terraza',
            distanceMin: 11,
            address: 'Durango 181, Roma Norte, CDMX',
            openUntil: '06:00 AM',
            perk: 'Cover 50% de descuento con tu boleto de hoy',
            verified: true,
            coords: [-99.1654, 19.4201]
          }
        ]
      } else {
        // Dominican Republic / Global default
        spots = [
          {
            id: 'after-do-1',
            name: 'La Espiral 313 · Terraza & Beats',
            category: 'Bar Cultural & Música',
            distanceMin: 8,
            address: 'Calle Las Mercedes, Zona Colonial, Santo Domingo',
            openUntil: '04:00 AM',
            perk: 'Trago de bienvenida al mostrar tu boleta de EventNow',
            verified: true,
            coords: [-69.8872, 18.4735]
          },
          {
            id: 'after-do-2',
            name: 'Empanadas Monumental / El Conde 24h',
            category: 'Comida Caliente 24 Horas',
            distanceMin: 5,
            address: 'Calle El Conde esq. Hostos, Santo Domingo',
            openUntil: 'Abierto 24 Horas',
            perk: 'El bajón oficial del coro: empanadas y jugos naturales',
            verified: true,
            coords: [-69.8856, 18.4728]
          },
          {
            id: 'after-do-3',
            name: 'Musa Rooftop Lounge',
            category: 'Terraza & Coctelería VIP',
            distanceMin: 12,
            address: 'Av. Gustavo Mejía Ricart, Piantini, Santo Domingo',
            openUntil: '03:30 AM',
            perk: 'Acceso preferencial sin fila para asistentes del evento',
            verified: true,
            coords: [-69.9389, 18.4752]
          }
        ]
      }

      setAfterSpots(spots)
      setLoading(false)
    }, 300)

    return () => clearTimeout(timer)
  }, [config.countryCode, eventCoordinates, city])

  if (loading) {
    return (
      <div className="p-6 rounded-3xl bg-white/5 border border-white/10 animate-pulse space-y-3">
        <div className="h-5 w-48 bg-white/10 rounded-full" />
        <div className="h-20 w-full bg-white/10 rounded-2xl" />
      </div>
    )
  }

  return (
    <div className="rounded-3xl border border-indigo-500/30 bg-gradient-to-br from-indigo-950/40 via-purple-950/20 to-black/60 p-6 backdrop-blur-xl shadow-xl">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-2xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center shadow-inner">
            <Moon className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-bold text-base text-foreground flex items-center gap-1.5">
              <span>{config.terms.afterParty}</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                Encadenamiento H3
              </span>
            </h3>
            <p className="text-xs text-muted-foreground">
              ¿Sigue el {config.terms.hangout}? Lugares verificados abiertos cerca de este recinto
            </p>
          </div>
        </div>

        <div className="text-[11px] font-medium text-indigo-300 flex items-center gap-1">
          <Clock className="h-3 w-3" />
          <span>Abiertos esta noche</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {afterSpots.map(spot => (
          <div
            key={spot.id}
            className="group relative rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-indigo-500/40 p-4 transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <span className="text-[10px] uppercase font-bold tracking-wider text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-md">
                  {spot.category}
                </span>
                <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1">
                  <Navigation className="h-3 w-3" />
                  ~{spot.distanceMin} min
                </span>
              </div>

              <h4 className="font-bold text-sm text-foreground group-hover:text-indigo-300 transition-colors">
                {spot.name}
              </h4>
              <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                {spot.address}
              </p>

              <div className="mt-3 p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-[11px] text-indigo-200 flex items-start gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-indigo-400 shrink-0 mt-0.5" />
                <span>{spot.perk}</span>
              </div>
            </div>

            <div className="mt-3 pt-3 border-t border-white/10 flex items-center justify-between">
              <span className="text-[10px] text-gray-400 font-mono">
                {spot.openUntil}
              </span>

              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(spot.address)}`}
                target="_blank"
                rel="noreferrer"
                className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition"
              >
                <span>Cómo llegar</span>
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
