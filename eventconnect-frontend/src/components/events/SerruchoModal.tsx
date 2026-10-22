'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { X, Users, DollarSign, ArrowRight, Share2, Sparkles, Building2, Copy, Check, MessageSquare } from 'lucide-react'
import { apiClient } from '@/lib/api/client'
import { Button } from '@/components/redesign/ui/button'
import { Input } from '@/components/redesign/ui/input'
import toast from 'react-hot-toast'
import type { EventExportData } from './event-detail-utils'
import { useAuthStore } from '@/stores/authStore'
import { useEventSignIn } from './useEventSignIn'

const DOMINICAN_BANKS = [
  'Banco Popular Dominicano',
  'Banco BHD',
  'Banreservas',
  'Qik Banco Digital',
  'tPago'
]

const CARPOOL_PRESETS = [
  { name: 'Samaná (Aut. Nordeste)', tolls: 1200, fuel: 2400 },
  { name: 'Santiago (Aut. Duarte)', tolls: 200, fuel: 1800 },
  { name: 'Jarabacoa (Montaña)', tolls: 200, fuel: 2100 },
  { name: 'Punta Cana (Aut. del Coral)', tolls: 360, fuel: 2200 },
  { name: 'Ruta Personalizada', tolls: 0, fuel: 1000 },
]

interface SerruchoModalProps {
  isOpen: boolean
  onClose: () => void
  event: EventExportData
}

export function SerruchoModal({ isOpen, onClose, event }: SerruchoModalProps) {
  const router = useRouter()
  const { isAuthenticated, user } = useAuthStore()
  const identity = isAuthenticated ? user?.id || user?._id || 'signed-in' : 'guest'
  const identityRef = useRef(identity)
  identityRef.current = identity
  const submitLock = useRef(false)
  const requestSignIn = useEventSignIn(event._id)
  const [title, setTitle] = useState(`Coro para ${event.title}`)
  const [serruchoType, setSerruchoType] = useState<'standard' | 'carpool'>('standard')
  const [participantsCount, setParticipantsCount] = useState(4)
  const defaultPerPerson = event.price?.amount || 500
  const [perPersonAmount, setPerPersonAmount] = useState(defaultPerPerson)
  const [tollCost, setTollCost] = useState(200)
  const [fuelCost, setFuelCost] = useState(1800)
  const [bankName, setBankName] = useState('Banco Popular Dominicano')
  const [accountNumber, setAccountNumber] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [copied, setCopied] = useState(false)

  const carpoolTotal = tollCost + fuelCost
  const carpoolPerPerson = Math.ceil(carpoolTotal / Math.max(1, participantsCount))

  const targetTotal = serruchoType === 'carpool' ? carpoolTotal : participantsCount * perPersonAmount
  const finalPerPerson = serruchoType === 'carpool' ? carpoolPerPerson : perPersonAmount

  const currency = event.price?.currency || 'DOP'
  const money = (amount: number) => {
    try { return new Intl.NumberFormat('es-DO', { style: 'currency', currency, currencyDisplay: 'code' }).format(amount) }
    catch { return `${amount.toLocaleString('es-DO')} ${currency}` }
  }

  const viralWhatsAppText = serruchoType === 'carpool'
    ? `🇩🇴 *Serrucho de Gasolina y Peajes (Carpool RD)* 🇩🇴\n🚗 *Ruta al evento:* ${event.title}\n👥 *Pasajeros en el carro:* ${participantsCount} panas\n⛽ *Gasolina estimada:* ${money(fuelCost)}\n🛣️ *Peajes en ruta:* ${money(tollCost)}\n🎯 *Costo Total del Viaje:* ${money(carpoolTotal)}\n💰 *Nos toca a:* ${money(carpoolPerPerson)} c/u\n🏦 *Pagar vía:* ${bankName}\n💳 *Cuenta / Celular:* ${accountNumber || 'Pedir por privado'}\n\n📍 Ver detalles del evento: ${typeof window !== 'undefined' ? window.location.origin : ''}/events/${event._id}`
    : `🇩🇴 *El Serrucho del Coro - EventNow* 🇩🇴\n🎉 *${title}*\n👥 *Integrantes:* ${participantsCount} panas\n💰 *Cuota por cabeza:* ${money(perPersonAmount)}\n🎯 *Total a reunir:* ${money(targetTotal)}\n🏦 *Pagar vía:* ${bankName}\n💳 *Cuenta / Celular:* ${accountNumber || 'Pedir por privado'}\n\n📍 Ver detalles del evento: ${typeof window !== 'undefined' ? window.location.origin : ''}/events/${event._id}`

  const handleCopyText = () => {
    navigator.clipboard?.writeText(viralWhatsAppText)
    setCopied(true)
    toast.success('¡Mensaje para WhatsApp copiado al portapapeles!')
    setTimeout(() => setCopied(false), 2500)
  }

  const handleShareWhatsApp = () => {
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(viralWhatsAppText)}`
    window.open(url, '_blank')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isAuthenticated) { requestSignIn(); return }
    if (submitLock.current) return
    if (!Number.isInteger(participantsCount) || participantsCount < 2 || participantsCount > 50 || !Number.isFinite(finalPerPerson) || finalPerPerson < 1 || Math.abs(Math.round(finalPerPerson * 100) - finalPerPerson * 100) > 0.000001 || targetTotal > 10000000) { toast.error('Revisa la cantidad de integrantes y el monto por persona.'); return }
    const account = identity
    submitLock.current = true
    setIsSubmitting(true)
    try {
      const res = await apiClient.post('/serrucho', {
        eventId: event._id,
        title: serruchoType === 'carpool' ? `Carpool / Gasolina: ${title}` : title,
        targetParticipants: participantsCount,
        perPersonAmount: finalPerPerson,
        targetAmount: targetTotal,
        currency,
        paymentInstructions: {
          bankName,
          accountNumber: accountNumber || 'Solicitar cuenta por WhatsApp'
        }
      })

      if (res.data?.success && res.data?.data?.shareCode) {
        if (identityRef.current !== account) return
        toast.success('¡Serrucho creado exitosamente!')
        onClose()
        router.push(`/serrucho/${res.data.data.shareCode}`)
      } else {
        throw new Error('No se recibió el enlace del serrucho. Inténtalo de nuevo.')
      }
    } catch (err: any) {
      if (identityRef.current === account) toast.error(err?.response?.data?.message || err?.message || 'Error al armar el serrucho')
    } finally {
      setIsSubmitting(false)
      submitLock.current = false
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby="serrucho-title"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative w-full max-w-lg rounded-3xl border border-white/10 bg-gray-950 p-6 sm:p-7 text-white shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto"
      >
        <button
          type="button"
          aria-label="Cerrar serrucho"
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-all"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="mb-5">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 text-amber-400 text-xs font-bold mb-2">
            <Users className="w-3.5 h-3.5" />
            <span>El Serrucho Bancario RD 🇩🇴</span>
          </div>
          <h2 id="serrucho-title" className="text-xl sm:text-2xl font-black text-white">
            Divide entradas, mesa, peajes o gasolina con tu coro
          </h2>
          <p className="text-xs text-gray-400 mt-1">
            Calcula la cuota exacta por persona y comparte las instrucciones de transferencia bancaria directa (sin comisiones de pasarela).
          </p>
        </div>

        {/* Toggle Type */}
        <div className="flex gap-2 p-1 bg-white/5 border border-white/10 rounded-2xl mb-4">
          <button
            type="button"
            onClick={() => setSerruchoType('standard')}
            className={`flex-1 py-2 px-3 text-xs font-bold rounded-xl transition ${
              serruchoType === 'standard' ? 'bg-primary text-white shadow' : 'text-gray-400 hover:text-white'
            }`}
          >
            👥 Mesa, Boletas o Airbnb
          </button>
          <button
            type="button"
            onClick={() => setSerruchoType('carpool')}
            className={`flex-1 py-2 px-3 text-xs font-bold rounded-xl transition ${
              serruchoType === 'carpool' ? 'bg-emerald-600 text-white shadow' : 'text-gray-400 hover:text-white'
            }`}
          >
            ⛽ Gasolina & Peajes (Carpool)
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="serrucho-name" className="text-xs font-semibold text-gray-300 block mb-1.5">
              Nombre del Coro / Grupo:
            </label>
            <Input
              id="serrucho-name"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="bg-white/5 border-white/10 text-white rounded-xl h-11"
              required
            />
          </div>

          {serruchoType === 'carpool' && (
            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-950/20 p-3.5 space-y-3">
              <span className="text-xs font-bold text-emerald-400 block">
                🛣️ Presets de Rutas Dominicanas (Ida y Vuelta):
              </span>
              <div className="flex flex-wrap gap-1.5">
                {CARPOOL_PRESETS.map((p) => (
                  <button
                    type="button"
                    key={p.name}
                    onClick={() => {
                      setTollCost(p.tolls)
                      setFuelCost(p.fuel)
                    }}
                    className="rounded-lg border border-emerald-500/20 bg-emerald-900/30 px-2.5 py-1 text-[11px] font-semibold text-emerald-200 hover:bg-emerald-800/40"
                  >
                    {p.name}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="text-[11px] font-semibold text-gray-300 block mb-1">
                    Costo Peajes (RD$):
                  </label>
                  <Input
                    type="number"
                    min="0"
                    value={tollCost}
                    onChange={(e) => setTollCost(Number(e.target.value))}
                    className="bg-black/40 border-emerald-500/30 text-white rounded-xl h-10"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-gray-300 block mb-1">
                    Gasolina Est. (RD$):
                  </label>
                  <Input
                    type="number"
                    min="0"
                    value={fuelCost}
                    onChange={(e) => setFuelCost(Number(e.target.value))}
                    className="bg-black/40 border-emerald-500/30 text-white rounded-xl h-10"
                  />
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="serrucho-size" className="text-xs font-semibold text-gray-300 block mb-1.5">
                {serruchoType === 'carpool' ? '¿Cuántos van en el carro?' : '¿Cuántos amigos son?'}
              </label>
              <div className="relative">
                <Input
                  id="serrucho-size"
                  type="number"
                  min="2"
                  max="50"
                  value={participantsCount}
                  onChange={(e) => setParticipantsCount(Number(e.target.value))}
                  className="bg-white/5 border-white/10 text-white rounded-xl h-11 pl-9"
                  required
                />
                <Users className="w-4 h-4 text-gray-400 absolute left-3 top-3.5" />
              </div>
            </div>

            <div>
              <label htmlFor="serrucho-amount" className="text-xs font-semibold text-gray-300 block mb-1.5">
                {serruchoType === 'carpool' ? 'Cuota por cabeza:' : 'Monto por persona:'}
              </label>
              <div className="relative">
                <Input
                  id="serrucho-amount"
                  type="number"
                  min="1"
                  step="0.01"
                  value={finalPerPerson}
                  disabled={serruchoType === 'carpool'}
                  onChange={(e) => setPerPersonAmount(Number(e.target.value))}
                  className="bg-white/5 border-white/10 text-white rounded-xl h-11 pl-9"
                  required
                />
                <span className="text-xs font-bold text-gray-400 absolute left-3 top-3.5">{currency}</span>
              </div>
            </div>
          </div>

          {/* Total calculation box */}
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-between">
            <span className="text-xs font-medium text-amber-200">Meta total a reunir:</span>
            <span className="text-lg font-black text-amber-400">
              {money(targetTotal)}
            </span>
          </div>

          {/* Banco Dominicano Selector */}
          <div>
            <label className="text-xs font-semibold text-gray-300 block mb-1.5">
              Banco para transferencias directas:
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-2">
              {DOMINICAN_BANKS.map((b) => (
                <button
                  type="button"
                  key={b}
                  onClick={() => setBankName(b)}
                  className={`p-2 rounded-xl text-xs font-semibold border transition-all truncate text-left ${
                    bankName === b
                      ? 'bg-primary/20 border-primary text-primary-300 font-bold'
                      : 'bg-white/5 border-white/10 text-gray-400 hover:text-white'
                  }`}
                >
                  {b}
                </button>
              ))}
            </div>
            <Input
              value={accountNumber}
              onChange={(e) => setAccountNumber(e.target.value)}
              placeholder="Número de cuenta o teléfono de tPago / Qik"
              className="bg-white/5 border-white/10 text-white rounded-xl h-11"
            />
          </div>

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row gap-2 pt-2">
            <button
              type="button"
              onClick={handleCopyText}
              className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs border border-white/15 transition-all"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-gray-300" />}
              <span>{copied ? '¡Copiado!' : 'Copiar Texto para WhatsApp'}</span>
            </button>

            <button
              type="button"
              onClick={handleShareWhatsApp}
              className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition-all"
            >
              <MessageSquare className="w-4 h-4" />
              <span>Enviar a WhatsApp</span>
            </button>
          </div>

          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full h-12 rounded-2xl bg-primary hover:bg-primary/90 font-bold text-xs shadow-lg shadow-primary/20 mt-2"
          >
            {isSubmitting ? 'Creando serrucho...' : 'Guardar y Abrir Sala Digital del Coro'}
          </Button>
        </form>
      </motion.div>
    </div>
  )
}
