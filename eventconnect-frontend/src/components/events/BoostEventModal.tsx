'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Rocket,
  CheckCircle2,
  Copy,
  Building,
  CreditCard,
  Sparkles,
  Zap,
  Crown,
  X,
  Upload,
  Clock,
  ShieldCheck,
  Loader2
} from 'lucide-react'
import { apiClient } from '@/lib/api/client'
import { Button } from '@/components/redesign/ui/button'
import toast from 'react-hot-toast'

interface BoostEventModalProps {
  isOpen: boolean
  onClose: () => void
  eventId: string
  eventTitle: string
}

const BOOST_TIERS = [
  {
    id: 'bronze',
    name: 'Bronce · Impulso Flash',
    price: 1500,
    duration: '48 Horas',
    icon: Sparkles,
    badgeColor: 'bg-amber-700/20 text-amber-400 border-amber-700/30',
    perks: [
      'Insignia "Destacado" en búsquedas',
      'Prioridad en el listado de eventos',
      'Aparición en sección de tendencias'
    ]
  },
  {
    id: 'silver',
    name: 'Plata · Coro Imparable',
    price: 2500,
    duration: '7 Días',
    isPopular: true,
    icon: Zap,
    badgeColor: 'bg-gray-400/20 text-gray-200 border-gray-400/30',
    perks: [
      'Todo lo del paquete Bronce',
      'Posición fija en el Radar de Coros',
      'Notificación push a interesados en la categoría',
      'Soporte prioritario de moderación'
    ]
  },
  {
    id: 'gold',
    name: 'Oro · Rey del Evento',
    price: 4500,
    duration: '15 Días',
    icon: Crown,
    badgeColor: 'bg-amber-400/20 text-amber-300 border-amber-400/30',
    perks: [
      'Todo lo del paquete Plata',
      'Banner principal rotativo en Home',
      'Historia fija 24/7 en el carrusel superior',
      'Mención en la Cápsula Semanal de Radio EventNow'
    ]
  }
]

const DOMINICAN_ACCOUNTS = [
  { bank: 'Banco Popular', account: '789123456', type: 'Corriente', titular: 'EventNow Dominicana SRL', rnc: '1-32-45678-9' },
  { bank: 'Banco BHD', account: '234567890', type: 'Ahorros', titular: 'EventNow Dominicana SRL', rnc: '1-32-45678-9' },
  { bank: 'Banreservas', account: '987654321', type: 'Ahorros', titular: 'EventNow Dominicana SRL', rnc: '1-32-45678-9' },
  { bank: 'tPago / Qik', account: '829-555-0199', type: 'Móvil', titular: 'EventNow Pagos' }
]

export function BoostEventModal({ isOpen, onClose, eventId, eventTitle }: BoostEventModalProps) {
  const [selectedTier, setSelectedTier] = useState('silver')
  const [selectedBank, setSelectedBank] = useState('Banco Popular')
  const [referenceNumber, setReferenceNumber] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)

  const activeTier = BOOST_TIERS.find(t => t.id === selectedTier) || BOOST_TIERS[1]

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    toast.success(`${label} copiado al portapapeles`)
  }

  const handleSubmit = async () => {
    if (!referenceNumber.trim()) {
      toast.error('Por favor introduce el número de confirmación o referencia de la transferencia.')
      return
    }

    try {
      setIsSubmitting(true)
      const res = await apiClient.post(`/events/${eventId}/boost-request`, {
        tier: selectedTier,
        bankName: selectedBank,
        referenceNumber: referenceNumber.trim()
      })

      if (res.data?.success) {
        setIsSuccess(true)
        toast.success('¡Solicitud de Destacado enviada con éxito!')
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error al enviar la solicitud.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-2xl bg-gray-950 border border-white/10 rounded-[32px] p-6 sm:p-8 text-white shadow-2xl relative my-8"
      >
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition"
        >
          <X className="w-5 h-5" />
        </button>

        {!isSuccess ? (
          <div className="space-y-6">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 text-amber-400 text-xs font-black uppercase tracking-wider mb-2">
                <Rocket className="w-3.5 h-3.5" />
                <span>Monetización de Creadores · Destacar Evento</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white">
                Multiplica el Alcance de tu Evento 🚀
              </h2>
              <p className="text-xs sm:text-sm text-gray-400 mt-1">
                Evento: <span className="text-white font-bold">{eventTitle}</span>
              </p>
            </div>

            {/* Tier Selectors */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {BOOST_TIERS.map(tier => {
                const Icon = tier.icon
                const isSelected = selectedTier === tier.id

                return (
                  <button
                    key={tier.id}
                    type="button"
                    onClick={() => setSelectedTier(tier.id)}
                    className={`rounded-2xl p-4 border text-left transition relative flex flex-col justify-between ${
                      isSelected
                        ? 'bg-amber-500/10 border-amber-500 shadow-lg shadow-amber-500/10'
                        : 'bg-white/5 border-white/10 hover:border-white/20'
                    }`}
                  >
                    {tier.isPopular && (
                      <span className="absolute -top-2.5 right-3 px-2 py-0.5 rounded-full bg-amber-500 text-gray-950 text-[10px] font-black uppercase tracking-wide">
                        Más Elegido
                      </span>
                    )}

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <Icon className={`w-5 h-5 ${isSelected ? 'text-amber-400' : 'text-gray-400'}`} />
                        <span className="text-[10px] text-gray-400 font-mono">{tier.duration}</span>
                      </div>
                      <h4 className="text-sm font-bold text-white">{tier.name.split('·')[0]}</h4>
                      <div className="text-base font-black text-amber-400 font-mono mt-1">
                        RD$ {tier.price.toLocaleString('es-DO')}
                      </div>
                    </div>

                    <ul className="mt-3 space-y-1 pt-3 border-t border-white/10 text-[10px] text-gray-300">
                      {tier.perks.slice(0, 2).map((perk, i) => (
                        <li key={i} className="flex items-center gap-1">
                          <CheckCircle2 className="w-2.5 h-2.5 text-amber-400 shrink-0" />
                          <span className="truncate">{perk}</span>
                        </li>
                      ))}
                    </ul>
                  </button>
                )
              })}
            </div>

            {/* Bank Transfer Details Box */}
            <div className="rounded-2xl bg-white/[0.03] border border-white/10 p-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-gray-300 flex items-center gap-1.5">
                  <Building className="w-4 h-4 text-primary" />
                  <span>Cuentas Bancarias Dominicanas para Transferencia</span>
                </span>
                <span className="text-xs font-bold text-amber-400 font-mono">
                  Total: RD$ {activeTier.price.toLocaleString('es-DO')}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {DOMINICAN_ACCOUNTS.map((acc, i) => (
                  <div
                    key={i}
                    onClick={() => {
                      setSelectedBank(acc.bank)
                      copyToClipboard(acc.account, `No. de Cuenta ${acc.bank}`)
                    }}
                    className={`p-3 rounded-xl border text-xs cursor-pointer transition flex items-center justify-between ${
                      selectedBank === acc.bank
                        ? 'bg-primary/10 border-primary text-white'
                        : 'bg-white/5 border-white/5 text-gray-300 hover:bg-white/10'
                    }`}
                  >
                    <div>
                      <span className="font-bold block text-white">{acc.bank}</span>
                      <span className="text-[11px] font-mono text-gray-400">
                        {acc.type}: {acc.account}
                      </span>
                    </div>
                    <Copy className="w-3.5 h-3.5 text-gray-400 hover:text-white" />
                  </div>
                ))}
              </div>
            </div>

            {/* Voucher Reference Form */}
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1.5">
                  Número de Confirmación / Referencia del Depósito:
                </label>
                <input
                  type="text"
                  value={referenceNumber}
                  onChange={(e) => setReferenceNumber(e.target.value)}
                  placeholder="Ej: BHD-8849201 o No. de Aprobación"
                  className="w-full h-11 rounded-xl bg-white/5 border border-white/10 px-4 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-amber-400 font-mono"
                />
              </div>

              <p className="text-[11px] text-gray-400 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Validación directa sin comisiones de pasarelas internacionales. Aprobación en menos de 1 hora.</span>
              </p>
            </div>

            {/* Footer Buttons */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
              <Button
                variant="outline"
                onClick={onClose}
                className="rounded-2xl border-white/10 text-gray-400 hover:text-white"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting || !referenceNumber.trim()}
                className="rounded-2xl bg-amber-500 hover:bg-amber-600 text-gray-950 font-black gap-2 px-6"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Enviando...</span>
                  </>
                ) : (
                  <>
                    <Rocket className="w-4 h-4" />
                    <span>Confirmar Pago de RD$ {activeTier.price.toLocaleString('es-DO')}</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        ) : (
          /* Success Screen */
          <div className="text-center py-6 space-y-4">
            <div className="w-16 h-16 rounded-3xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/30">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <h3 className="text-2xl font-black text-white">¡Comprobante Recibido!</h3>
            <p className="text-sm text-gray-300 max-w-md mx-auto">
              Tu solicitud para activar el paquete <strong className="text-amber-400">{activeTier.name}</strong> en <strong className="text-white">"{eventTitle}"</strong> fue enviada con éxito.
            </p>

            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 text-xs text-gray-400 max-w-sm mx-auto">
              Referencia: <span className="font-mono font-bold text-white">{referenceNumber}</span><br />
              Banco: <span className="font-bold text-white">{selectedBank}</span>
            </div>

            <div className="pt-4">
              <Button onClick={onClose} className="rounded-2xl bg-primary text-white font-bold px-8">
                Entendido
              </Button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  )
}
