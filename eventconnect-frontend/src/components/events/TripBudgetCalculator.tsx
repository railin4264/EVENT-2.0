'use client'

import React, { useState, useEffect, useMemo } from 'react'
import {
  Plane,
  Car,
  Ship,
  Bus,
  Users,
  Hotel,
  UtensilsCrossed,
  ShieldAlert,
  Ticket,
  Copy,
  Check,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Calculator,
  Compass
} from 'lucide-react'
import { apiClient } from '@/lib/api/client'

interface TripBudgetCalculatorProps {
  eventId: string
  eventTitle: string
  eventCity?: string
  eventCountry?: string
  eventPrice?: {
    amount: number
    currency: string
    isFree?: boolean
  }
  startDate?: string
  endDate?: string
}

interface BudgetCalculationResult {
  tickets: {
    pricePerTicket: number
    travelersCount: number
    total: number
    currency: string
  }
  transport: {
    mode: 'carpool' | 'transit' | 'flight' | 'ferry'
    label: string
    totalCost: number
    perPersonCost: number
    directSearchUrl?: string
    notes?: string
  }
  lodging: {
    tier: string
    nights: number
    roomsNeeded: number
    pricePerNight: number
    totalCost: number
    perPersonCost: number
  }
  foodAndDrink: {
    tier: string
    dailyPerPerson: number
    days: number
    totalCost: number
    perPersonCost: number
  }
  buffer: {
    percentage: number
    totalCost: number
    perPersonCost: number
  }
  summary: {
    grandTotal: number
    totalPerPerson: number
    sharedPoolTotal: number
    sharedPoolPerPerson: number
    individualTotalPerPerson: number
    currency: string
  }
}

export function TripBudgetCalculator({
  eventId,
  eventTitle,
  eventCity = 'Santo Domingo',
  eventCountry = 'República Dominicana',
  eventPrice,
  startDate,
  endDate
}: TripBudgetCalculatorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [originCity, setOriginCity] = useState('Santo Domingo')
  const [travelersCount, setTravelersCount] = useState(3)
  const [nightsCount, setNightsCount] = useState(1)
  const [transportMode, setTransportMode] = useState<'carpool' | 'transit' | 'flight' | 'ferry'>('carpool')
  const [lodgingTier, setLodgingTier] = useState<'none' | 'hostel' | 'hotel' | 'premium'>('hotel')
  const [diningTier, setDiningTier] = useState<'budget' | 'midRange' | 'foodie'>('midRange')
  const [customTicketPrice, setCustomTicketPrice] = useState<number>(
    eventPrice?.isFree ? 0 : Number(eventPrice?.amount) || 0
  )
  const [copied, setCopied] = useState(false)
  const [loading, setLoading] = useState(false)
  const [serverResult, setServerResult] = useState<BudgetCalculationResult | null>(null)

  // Fetch or calculate budget dynamically
  useEffect(() => {
    let active = true
    async function calculate() {
      try {
        setLoading(true)
        const res = await apiClient.post(`/event-planning/${eventId}/trip-budget`, {
          originCity,
          destinationCity: eventCity,
          travelersCount,
          nightsCount,
          transportMode,
          lodgingTier,
          diningTier,
          customTicketPrice: Number(customTicketPrice) || 0
        })
        const payload = res.data?.data || res.data
        if (active && res.data?.success && payload?.breakdown) {
          const b = payload.breakdown
          const s = payload.summary
          setServerResult({
            tickets: {
              pricePerTicket: b.tickets?.perPerson || 0,
              travelersCount,
              total: b.tickets?.total || 0,
              currency: payload.currency || 'DOP'
            },
            transport: {
              mode: transportMode,
              label: b.transport?.details?.label || 'Transporte',
              totalCost: b.transport?.total || 0,
              perPersonCost: b.transport?.perPerson || 0,
              directSearchUrl: payload.bookingLinks?.googleFlights || payload.bookingLinks?.rome2rio
            },
            lodging: {
              tier: lodgingTier,
              nights: b.lodging?.nights || 0,
              roomsNeeded: b.lodging?.roomsCount || 0,
              pricePerNight: b.lodging?.ratePerNight || 0,
              totalCost: b.lodging?.total || 0,
              perPersonCost: b.lodging?.perPerson || 0
            },
            foodAndDrink: {
              tier: diningTier,
              dailyPerPerson: b.foodAndDrinks?.dailyAveragePerPerson || 0,
              days: payload.parameters?.days || (nightsCount + 1),
              totalCost: b.foodAndDrinks?.total || 0,
              perPersonCost: b.foodAndDrinks?.perPerson || 0
            },
            buffer: {
              percentage: b.bufferAndIncidentals?.ratePercentage || 8,
              totalCost: b.bufferAndIncidentals?.total || 0,
              perPersonCost: b.bufferAndIncidentals?.perPerson || 0
            },
            summary: {
              grandTotal: s?.grandTotal || 0,
              totalPerPerson: s?.perPerson || 0,
              sharedPoolTotal: s?.serruchoSplits?.sharedPoolTotal || 0,
              sharedPoolPerPerson: s?.serruchoSplits?.sharedPoolPerPerson || 0,
              individualTotalPerPerson: s?.serruchoSplits?.individualOnlyPerPerson || 0,
              currency: payload.currency || 'DOP'
            }
          })
        }
      } catch (err) {
        // Fallback to local calculation if offline or network glitch
        console.warn('Trip budget calculation local fallback', err)
      } finally {
        if (active) setLoading(false)
      }
    }

    if (isOpen) {
      calculate()
    }
    return () => {
      active = false
    }
  }, [
    eventId,
    isOpen,
    originCity,
    eventCity,
    travelersCount,
    nightsCount,
    transportMode,
    lodgingTier,
    diningTier,
    customTicketPrice
  ])

  // Local fallback calculation if API hasn't responded yet
  const displayResult = useMemo(() => {
    if (serverResult) return serverResult

    const travelers = Math.max(1, travelersCount)
    const nights = Math.max(0, nightsCount)
    const days = Math.max(1, nights + 1)
    const ticketTotal = (Number(customTicketPrice) || 0) * travelers

    // Transport estimates
    let transportTotal = 0
    let transportLabel = 'Vehículo propio / Carpool'
    if (transportMode === 'carpool') {
      transportTotal = 2500 + 400 // Fuel + Tolls estimate DOP
      transportLabel = 'Gasolina y peajes compartidos'
    } else if (transportMode === 'transit') {
      transportTotal = 400 * travelers * 2 // Roundtrip bus
      transportLabel = 'Transporte público / Expreso'
    } else if (transportMode === 'flight') {
      transportTotal = 15000 * travelers // ~250 USD in DOP
      transportLabel = 'Vuelos comerciales'
    } else if (transportMode === 'ferry') {
      transportTotal = 1200 * travelers * 2 // Roundtrip boat/ferry
      transportLabel = 'Ferry / Transporte Marítimo'
    }

    // Lodging
    const lodgingRates = { none: 0, hostel: 1200, hotel: 4500, premium: 9500 }
    const roomsNeeded = lodgingTier === 'none' ? 0 : Math.ceil(travelers / 2)
    const lodgingTotal = nights * roomsNeeded * (lodgingRates[lodgingTier] || 4500)

    // Dining
    const diningRates = { budget: 600, midRange: 1400, foodie: 2800 }
    const foodTotal = days * travelers * (diningRates[diningTier] || 1400)

    // Subtotal & buffer
    const subtotal = ticketTotal + transportTotal + lodgingTotal + foodTotal
    const bufferTotal = Math.round(subtotal * 0.08)
    const grandTotal = subtotal + bufferTotal

    // Shared vs Individual (Serrucho logic)
    const sharedTotal = (transportMode === 'carpool' ? transportTotal : 0) + lodgingTotal
    const sharedPerPerson = Math.round(sharedTotal / travelers)
    const individualPerPerson =
      (Number(customTicketPrice) || 0) +
      (transportMode !== 'carpool' ? Math.round(transportTotal / travelers) : 0) +
      days * (diningRates[diningTier] || 1400) +
      Math.round(bufferTotal / travelers)

    return {
      tickets: {
        pricePerTicket: Number(customTicketPrice) || 0,
        travelersCount: travelers,
        total: ticketTotal,
        currency: eventPrice?.currency || 'DOP'
      },
      transport: {
        mode: transportMode,
        label: transportLabel,
        totalCost: transportTotal,
        perPersonCost: Math.round(transportTotal / travelers)
      },
      lodging: {
        tier: lodgingTier,
        nights,
        roomsNeeded,
        pricePerNight: lodgingRates[lodgingTier] || 0,
        totalCost: lodgingTotal,
        perPersonCost: Math.round(lodgingTotal / travelers)
      },
      foodAndDrink: {
        tier: diningTier,
        dailyPerPerson: diningRates[diningTier] || 1400,
        days,
        totalCost: foodTotal,
        perPersonCost: Math.round(foodTotal / travelers)
      },
      buffer: {
        percentage: 8,
        totalCost: bufferTotal,
        perPersonCost: Math.round(bufferTotal / travelers)
      },
      summary: {
        grandTotal,
        totalPerPerson: Math.round(grandTotal / travelers),
        sharedPoolTotal: sharedTotal,
        sharedPoolPerPerson: sharedPerPerson,
        individualTotalPerPerson: individualPerPerson,
        currency: eventPrice?.currency || 'DOP'
      }
    }
  }, [
    serverResult,
    travelersCount,
    nightsCount,
    customTicketPrice,
    transportMode,
    lodgingTier,
    diningTier,
    eventPrice?.currency
  ])

  const copyToClipboard = () => {
    const text = `🎉 *Presupuesto Estimado & Serrucho: ${eventTitle}*
📍 Destino: ${eventCity}, ${eventCountry}
👥 Grupo: ${travelersCount} personas | 🌙 Noches: ${nightsCount}

📋 *Desglose General:*
🎟️ Entradas: $${displayResult.tickets.total.toLocaleString()} (${displayResult.tickets.pricePerTicket} c/u)
🚗 Transporte (${displayResult.transport.label}): $${displayResult.transport.totalCost.toLocaleString()}
🏨 Alojamiento (${lodgingTier}): $${displayResult.lodging.totalCost.toLocaleString()}
🍽️ Comida & Bebida: $${displayResult.foodAndDrink.totalCost.toLocaleString()}
🛡️ Imprevistos (8%): $${displayResult.buffer.totalCost.toLocaleString()}

💰 *TOTAL DEL VIAJE:* $${displayResult.summary.grandTotal.toLocaleString()} ${displayResult.summary.currency}
👉 *CUOTA POR PERSONA:* $${displayResult.summary.totalPerPerson.toLocaleString()} ${displayResult.summary.currency}

_Generado automáticamente con EventNow_`

    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    })
  }

  // Search URLs for external travel services
  const flightSearchUrl = `https://www.google.com/travel/flights?q=Flights%20to%20${encodeURIComponent(
    eventCity
  )}`
  const bookingSearchUrl = `https://www.booking.com/searchresults.html?ss=${encodeURIComponent(
    eventCity
  )}`
  const airbnbSearchUrl = `https://www.airbnb.com/s/${encodeURIComponent(
    eventCity
  )}/homes?adults=${travelersCount}`

  return (
    <div className="my-8 rounded-3xl border border-violet-500/20 bg-gradient-to-br from-slate-900 via-slate-900 to-violet-950/40 p-6 shadow-xl backdrop-blur-md">
      {/* Header bar / Toggle */}
      <div
        className="flex cursor-pointer items-center justify-between gap-4"
        onClick={() => setIsOpen(!isOpen)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            setIsOpen(!isOpen)
          }
        }}
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-violet-600 to-indigo-500 text-white shadow-lg shadow-violet-500/30">
            <Calculator className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-violet-500/10 px-2.5 py-0.5 text-xs font-semibold text-violet-400 border border-violet-500/20">
                <Sparkles className="h-3 w-3" /> Trip & Serrucho Planner
              </span>
              <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-400 border border-emerald-500/20">
                Vuelos, Barcos & Hospedaje
              </span>
            </div>
            <h3 className="text-xl font-bold text-white mt-1">
              Calculadora Integral de Presupuesto para Viajes
            </h3>
            <p className="text-sm text-slate-400">
              Calcula entradas, transporte, hotel, comida y divide la cuenta del coro sin rodeos.
            </p>
          </div>
        </div>

        <button
          type="button"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-800/80 text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
          aria-label={isOpen ? 'Ocultar calculadora' : 'Abrir calculadora'}
        >
          {isOpen ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
        </button>
      </div>

      {/* Collapsible Body */}
      {isOpen && (
        <div className="mt-6 border-t border-slate-800/80 pt-6 space-y-6">
          {/* Controls Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Origin City */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Compass className="h-3.5 w-3.5 text-violet-400" />
                Ciudad de Origen
              </label>
              <select
                value={originCity}
                onChange={(e) => setOriginCity(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-800/90 px-3 py-2.5 text-sm text-white focus:outline-none focus:border-violet-500 transition-colors"
              >
                <option value="Santo Domingo">Santo Domingo (RD)</option>
                <option value="Santiago de los Caballeros">Santiago (RD)</option>
                <option value="Punta Cana">Punta Cana / Bávaro (RD)</option>
                <option value="Puerto Plata">Puerto Plata (RD)</option>
                <option value="Samaná">Samaná (RD)</option>
                <option value="Jarabacoa">Jarabacoa / Constanza (RD)</option>
                <option value="New York">Nueva York (USA)</option>
                <option value="Miami">Miami (USA)</option>
                <option value="Madrid">Madrid (España)</option>
                <option value="Barcelona">Barcelona (España)</option>
                <option value="Ciudad de México">Ciudad de México (MX)</option>
                <option value="Bogotá">Bogotá (Colombia)</option>
                <option value="Medellín">Medellín (Colombia)</option>
                <option value="Buenos Aires">Buenos Aires (Argentina)</option>
                <option value="São Paulo">São Paulo (Brasil)</option>
                <option value="Tokio">Tokio (Japón)</option>
              </select>
            </div>

            {/* Travelers count */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5 text-violet-400" />
                Viajeros / Amigos ({travelersCount})
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min="1"
                  max="12"
                  value={travelersCount}
                  onChange={(e) => setTravelersCount(Number(e.target.value))}
                  className="w-full accent-violet-500 h-2 bg-slate-700 rounded-lg cursor-pointer"
                />
                <span className="w-8 text-center text-sm font-bold text-white bg-slate-800 py-1 rounded-md border border-slate-700">
                  {travelersCount}
                </span>
              </div>
            </div>

            {/* Nights count */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Hotel className="h-3.5 w-3.5 text-violet-400" />
                Noches de Estadía ({nightsCount})
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min="0"
                  max="10"
                  value={nightsCount}
                  onChange={(e) => setNightsCount(Number(e.target.value))}
                  className="w-full accent-violet-500 h-2 bg-slate-700 rounded-lg cursor-pointer"
                />
                <span className="w-8 text-center text-sm font-bold text-white bg-slate-800 py-1 rounded-md border border-slate-700">
                  {nightsCount}
                </span>
              </div>
            </div>

            {/* Ticket Price Adjustment */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Ticket className="h-3.5 w-3.5 text-violet-400" />
                Precio Entrada ({displayResult.summary.currency})
              </label>
              <input
                type="number"
                min="0"
                step="50"
                value={customTicketPrice}
                onChange={(e) => setCustomTicketPrice(Math.max(0, Number(e.target.value)))}
                className="w-full rounded-xl border border-slate-700 bg-slate-800/90 px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500"
              />
            </div>
          </div>

          {/* Transport, Lodging & Dining Tiers */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Transport mode selector */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-3">
                Modo de Transporte
              </span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setTransportMode('carpool')}
                  className={`flex items-center gap-2 rounded-xl p-2.5 text-xs font-medium border transition-all ${
                    transportMode === 'carpool'
                      ? 'border-violet-500 bg-violet-600/20 text-violet-300'
                      : 'border-slate-800 bg-slate-800/50 text-slate-400 hover:text-white'
                  }`}
                >
                  <Car className="h-4 w-4" />
                  <span>Carpool / Auto</span>
                </button>
                <button
                  type="button"
                  onClick={() => setTransportMode('flight')}
                  className={`flex items-center gap-2 rounded-xl p-2.5 text-xs font-medium border transition-all ${
                    transportMode === 'flight'
                      ? 'border-violet-500 bg-violet-600/20 text-violet-300'
                      : 'border-slate-800 bg-slate-800/50 text-slate-400 hover:text-white'
                  }`}
                >
                  <Plane className="h-4 w-4" />
                  <span>Vuelo Avión</span>
                </button>
                <button
                  type="button"
                  onClick={() => setTransportMode('ferry')}
                  className={`flex items-center gap-2 rounded-xl p-2.5 text-xs font-medium border transition-all ${
                    transportMode === 'ferry'
                      ? 'border-violet-500 bg-violet-600/20 text-violet-300'
                      : 'border-slate-800 bg-slate-800/50 text-slate-400 hover:text-white'
                  }`}
                >
                  <Ship className="h-4 w-4" />
                  <span>Barco / Ferry</span>
                </button>
                <button
                  type="button"
                  onClick={() => setTransportMode('transit')}
                  className={`flex items-center gap-2 rounded-xl p-2.5 text-xs font-medium border transition-all ${
                    transportMode === 'transit'
                      ? 'border-violet-500 bg-violet-600/20 text-violet-300'
                      : 'border-slate-800 bg-slate-800/50 text-slate-400 hover:text-white'
                  }`}
                >
                  <Bus className="h-4 w-4" />
                  <span>Bus Interurbano</span>
                </button>
              </div>
            </div>

            {/* Lodging Tier */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-3">
                Categoría de Alojamiento
              </span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setLodgingTier('none')}
                  className={`flex items-center justify-center rounded-xl p-2.5 text-xs font-medium border transition-all ${
                    lodgingTier === 'none'
                      ? 'border-violet-500 bg-violet-600/20 text-violet-300'
                      : 'border-slate-800 bg-slate-800/50 text-slate-400 hover:text-white'
                  }`}
                >
                  Sin Alojamiento
                </button>
                <button
                  type="button"
                  onClick={() => setLodgingTier('hostel')}
                  className={`flex items-center justify-center rounded-xl p-2.5 text-xs font-medium border transition-all ${
                    lodgingTier === 'hostel'
                      ? 'border-violet-500 bg-violet-600/20 text-violet-300'
                      : 'border-slate-800 bg-slate-800/50 text-slate-400 hover:text-white'
                  }`}
                >
                  Hostel / Económico
                </button>
                <button
                  type="button"
                  onClick={() => setLodgingTier('hotel')}
                  className={`flex items-center justify-center rounded-xl p-2.5 text-xs font-medium border transition-all ${
                    lodgingTier === 'hotel'
                      ? 'border-violet-500 bg-violet-600/20 text-violet-300'
                      : 'border-slate-800 bg-slate-800/50 text-slate-400 hover:text-white'
                  }`}
                >
                  Hotel Estándar
                </button>
                <button
                  type="button"
                  onClick={() => setLodgingTier('premium')}
                  className={`flex items-center justify-center rounded-xl p-2.5 text-xs font-medium border transition-all ${
                    lodgingTier === 'premium'
                      ? 'border-violet-500 bg-violet-600/20 text-violet-300'
                      : 'border-slate-800 bg-slate-800/50 text-slate-400 hover:text-white'
                  }`}
                >
                  Resort / Premium
                </button>
              </div>
            </div>

            {/* Dining Tier */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-3">
                Alimentación & Bebidas
              </span>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setDiningTier('budget')}
                  className={`flex flex-col items-center justify-center rounded-xl p-2 text-center text-xs font-medium border transition-all ${
                    diningTier === 'budget'
                      ? 'border-violet-500 bg-violet-600/20 text-violet-300'
                      : 'border-slate-800 bg-slate-800/50 text-slate-400 hover:text-white'
                  }`}
                >
                  <UtensilsCrossed className="h-3.5 w-3.5 mb-1" />
                  Económico
                </button>
                <button
                  type="button"
                  onClick={() => setDiningTier('midRange')}
                  className={`flex flex-col items-center justify-center rounded-xl p-2 text-center text-xs font-medium border transition-all ${
                    diningTier === 'midRange'
                      ? 'border-violet-500 bg-violet-600/20 text-violet-300'
                      : 'border-slate-800 bg-slate-800/50 text-slate-400 hover:text-white'
                  }`}
                >
                  <UtensilsCrossed className="h-3.5 w-3.5 mb-1 text-emerald-400" />
                  Casual / Mixto
                </button>
                <button
                  type="button"
                  onClick={() => setDiningTier('foodie')}
                  className={`flex flex-col items-center justify-center rounded-xl p-2 text-center text-xs font-medium border transition-all ${
                    diningTier === 'foodie'
                      ? 'border-violet-500 bg-violet-600/20 text-violet-300'
                      : 'border-slate-800 bg-slate-800/50 text-slate-400 hover:text-white'
                  }`}
                >
                  <Sparkles className="h-3.5 w-3.5 mb-1 text-amber-400" />
                  Gourmet
                </button>
              </div>
            </div>
          </div>

          {/* Itemized Calculation Summary Box */}
          <div className="rounded-2xl border border-violet-500/30 bg-violet-950/20 p-5 backdrop-blur-md">
            <h4 className="text-base font-semibold text-white mb-4 flex items-center justify-between">
              <span>Desglose Estimado del Presupuesto</span>
              <span className="text-xs font-normal text-slate-400">
                Moneda base: {displayResult.summary.currency}
              </span>
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left Column: Line items */}
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm py-1.5 border-b border-slate-800/60">
                  <span className="flex items-center gap-2 text-slate-300">
                    <Ticket className="h-4 w-4 text-violet-400" /> Entradas al Evento ({travelersCount} pax)
                  </span>
                  <span className="font-semibold text-white">
                    ${displayResult.tickets.total.toLocaleString()}
                  </span>
                </div>

                <div className="flex items-center justify-between text-sm py-1.5 border-b border-slate-800/60">
                  <span className="flex items-center gap-2 text-slate-300">
                    {transportMode === 'flight' && <Plane className="h-4 w-4 text-sky-400" />}
                    {transportMode === 'ferry' && <Ship className="h-4 w-4 text-teal-400" />}
                    {transportMode === 'carpool' && <Car className="h-4 w-4 text-amber-400" />}
                    {transportMode === 'transit' && <Bus className="h-4 w-4 text-emerald-400" />}
                    Transporte ({displayResult.transport.label})
                  </span>
                  <span className="font-semibold text-white">
                    ${displayResult.transport.totalCost.toLocaleString()}
                  </span>
                </div>

                <div className="flex items-center justify-between text-sm py-1.5 border-b border-slate-800/60">
                  <span className="flex items-center gap-2 text-slate-300">
                    <Hotel className="h-4 w-4 text-indigo-400" /> Alojamiento ({nightsCount} noches,{' '}
                    {displayResult.lodging.roomsNeeded} hab.)
                  </span>
                  <span className="font-semibold text-white">
                    ${displayResult.lodging.totalCost.toLocaleString()}
                  </span>
                </div>

                <div className="flex items-center justify-between text-sm py-1.5 border-b border-slate-800/60">
                  <span className="flex items-center gap-2 text-slate-300">
                    <UtensilsCrossed className="h-4 w-4 text-orange-400" /> Comida & Bebidas Estimadas
                  </span>
                  <span className="font-semibold text-white">
                    ${displayResult.foodAndDrink.totalCost.toLocaleString()}
                  </span>
                </div>

                <div className="flex items-center justify-between text-sm py-1.5">
                  <span className="flex items-center gap-2 text-slate-400 text-xs">
                    <ShieldAlert className="h-3.5 w-3.5 text-slate-500" /> Fondo de Imprevistos & Extras (8%)
                  </span>
                  <span className="font-medium text-slate-400 text-xs">
                    ${displayResult.buffer.totalCost.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Right Column: Serrucho & Grand Totals */}
              <div className="flex flex-col justify-between rounded-xl bg-slate-900/80 p-4 border border-violet-500/20">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs uppercase tracking-wider text-slate-400 font-semibold">
                      Presupuesto Total del Grupo
                    </span>
                    <span className="text-xl font-extrabold text-white">
                      ${displayResult.summary.grandTotal.toLocaleString()}{' '}
                      <span className="text-xs font-normal text-slate-400">
                        {displayResult.summary.currency}
                      </span>
                    </span>
                  </div>

                  <div className="rounded-lg bg-emerald-950/40 border border-emerald-500/30 p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-emerald-300 flex items-center gap-1.5">
                        <Users className="h-4 w-4" /> Cuota por Persona (Serrucho)
                      </span>
                      <span className="text-lg font-black text-emerald-400">
                        ${displayResult.summary.totalPerPerson.toLocaleString()}{' '}
                        <span className="text-xs font-normal text-emerald-500">
                          {displayResult.summary.currency}
                        </span>
                      </span>
                    </div>
                    <p className="text-xs text-emerald-200/80 mt-1">
                      Fondo común: ${displayResult.summary.sharedPoolPerPerson.toLocaleString()} + Gastos propios:{' '}
                      ${displayResult.summary.individualTotalPerPerson.toLocaleString()}
                    </p>
                  </div>
                </div>

                {/* Action buttons */}
                <div className="mt-4 pt-3 border-t border-slate-800 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={copyToClipboard}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold py-2 px-3 text-xs transition-colors shadow-md shadow-violet-600/30"
                  >
                    {copied ? (
                      <>
                        <Check className="h-4 w-4 text-emerald-300" /> Copiado a WhatsApp
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4" /> Copiar para el Grupo
                      </>
                    )}
                  </button>

                  {transportMode === 'flight' && (
                    <a
                      href={flightSearchUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 py-2 px-3 text-xs border border-slate-700 transition-colors"
                    >
                      <Plane className="h-3.5 w-3.5 text-sky-400" />
                      Google Flights
                      <ExternalLink className="h-3 w-3 text-slate-400" />
                    </a>
                  )}

                  {lodgingTier !== 'none' && (
                    <a
                      href={airbnbSearchUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 py-2 px-3 text-xs border border-slate-700 transition-colors"
                    >
                      <Hotel className="h-3.5 w-3.5 text-rose-400" />
                      Airbnb / Hotel
                      <ExternalLink className="h-3 w-3 text-slate-400" />
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
