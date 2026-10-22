'use client'

import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  Tag,
  Clock,
  MapPin,
  Percent,
  Sparkles,
  ShoppingBag,
  ExternalLink,
  ChevronRight,
  Zap
} from 'lucide-react'
import { apiClient } from '@/lib/api/client'
import { Button } from '@/components/redesign/ui/button'

interface Deal {
  _id: string
  title: string
  description: string
  category: string
  date: string
  location?: {
    venue?: string
    address?: string
    coordinates?: [number, number]
  }
  price?: {
    amount: number
    currency: string
  }
  metadata?: {
    brand?: string
    discount?: string
    dealExpiresAt?: string
  }
}

export function NearbyFlashDeals() {
  const { data, isLoading } = useQuery<{ success: boolean; data: Deal[] }>({
    queryKey: ['nearby-flash-deals'],
    queryFn: async () => {
      const res = await apiClient.get('/events/deals/nearby')
      return res.data
    }
  })

  const deals = data?.data || []

  if (!isLoading && deals.length === 0) return null

  return (
    <div className="rounded-[32px] border border-amber-500/30 bg-gradient-to-r from-amber-500/10 via-orange-500/5 to-purple-500/10 p-6 sm:p-8 space-y-6 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-400 text-xs font-black uppercase tracking-wider mb-2">
            <Zap className="w-3.5 h-3.5 animate-bounce" />
            <span>Alertas Flash de Comercios · RD</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            Promociones y Días Especiales de Marcas Dominicanas 🇩🇴
          </h2>
          <p className="text-xs sm:text-sm text-gray-400 mt-0.5">
            Días sin ITBIS, descuentos del 50% y ofertas de fin de semana en plazas y supermercados cerca de ti.
          </p>
        </div>
      </div>

      {/* Deals Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 relative z-10">
        {isLoading ? (
          <div className="col-span-full py-8 text-center text-xs text-gray-400">
            Cargando promociones flash de hoy...
          </div>
        ) : (
          deals.map((deal, idx) => {
            const venue = deal.location?.venue || deal.location?.address || 'Santo Domingo'
            const isBravo = /bravo/i.test(deal.title + venue)
            const isSirena = /sirena/i.test(deal.title + venue)
            const isAgora = /agora/i.test(deal.title + venue)

            return (
              <motion.div
                key={deal._id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="rounded-2xl bg-gray-950/70 border border-amber-500/20 hover:border-amber-500/50 p-5 backdrop-blur-sm transition-all flex flex-col justify-between space-y-4"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2.5">
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[11px] font-black border border-amber-500/30">
                      <Percent className="w-3 h-3" />
                      <span>{isBravo ? 'Día Sin ITBIS' : isSirena ? '50% Descuento' : 'Oferta Comercial'}</span>
                    </span>

                    <span className="text-[10px] font-mono text-gray-400 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-amber-400" />
                      <span>Válido hoy</span>
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-white line-clamp-2 mb-1.5">
                    {deal.title}
                  </h3>

                  <p className="text-xs text-gray-300 line-clamp-2 leading-relaxed">
                    {deal.description}
                  </p>
                </div>

                <div className="pt-3 border-t border-white/10 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 text-xs text-gray-400 min-w-0">
                    <MapPin className="w-3.5 h-3.5 text-red-400 shrink-0" />
                    <span className="truncate">{venue}</span>
                  </div>

                  <Link
                    href={`/events/${deal._id}`}
                    className="inline-flex items-center gap-1 text-xs font-bold text-amber-400 hover:text-amber-300 shrink-0"
                  >
                    <span>Ver Detalles</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </motion.div>
            )
          })
        )}
      </div>
    </div>
  )
}
