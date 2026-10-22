'use client'

import React, { useState } from 'react'
import { Plane, X, DollarSign, ShieldAlert, Sparkles, Car, Shirt, MapPin, CheckCircle, Info } from 'lucide-react'
import { useLocaleStore } from '@/stores/localeStore'

interface TouristGuideModalProps {
  isOpen: boolean
  onClose: () => void
  city?: string
  country?: string
}

export default function TouristGuideModal({
  isOpen,
  onClose,
  city = 'Santo Domingo',
  country = 'República Dominicana'
}: TouristGuideModalProps) {
  const { config, formatCurrency } = useLocaleStore()
  const [calcAmount, setCalcAmount] = useState<number>(1000)

  if (!isOpen) return null

  // Determine destination guide data based on country/city
  const isSpain = config.countryCode === 'ES'
  const isMexico = config.countryCode === 'MX'

  const guide = isSpain ? {
    destination: 'Madrid & España',
    currencyInfo: 'Euro (€). El pago con tarjeta/contactless funciona en el 99% de sitios.',
    tipping: 'Propina: no obligatoria; se suele redondear o dejar 5-10% si el servicio fue excepcional.',
    dressCode: 'Vestimenta: En clubes y teatros céntricos se pide calzado cerrado (evita chanclas deportivas de noche).',
    transport: 'Metro de Madrid (uno de los mejores del mundo) o Cabify / Uber oficiales.',
    safety: 'Cuidado con carteristas en zonas turísticas (Sol, Gran Vía, metro). El país es sumamente seguro en general.',
    mustDo: [
      'Tapeo por La Latina o Mercado de San Miguel',
      'Atardecer en el Templo de Debod',
      'Noche de teatro o musical en Gran Vía'
    ]
  } : isMexico ? {
    destination: 'Ciudad de México & México',
    currencyInfo: 'Peso Mexicano ($ MXN). Lleva efectivo para taquerías callejeras y mercados.',
    tipping: 'Propina: 10% a 15% es habitual en restaurantes y bares.',
    dressCode: 'Vestimenta: Casual elegante de noche en Roma/Condesa/Polanco.',
    transport: 'Usa siempre Uber / Didi. Evita tomar taxis libres en la calle de noche.',
    safety: 'Mantente en corredores turísticos seguros (Roma, Condesa, Coyoacán, Reforma).',
    mustDo: [
      'Tacos nocturnos en puestos tradicionales verificados',
      'Paseo dominical en Chapultepec o Reforma',
      'Noche de mezcal y música en la Condesa'
    ]
  } : {
    destination: 'Santo Domingo & República Dominicana',
    currencyInfo: 'Peso Dominicano (RD$). Ten a mano billetes de RD$100 y RD$200 para parqueos y propinas.',
    tipping: 'Propina: La ley incluye 10% de servicio; se suele dejar 10% voluntario adicional si la atención fue buena.',
    dressCode: 'Vestimenta: En discotecas y lounges no permiten bermudas, sandalias ni gorras deportivas.',
    transport: 'Pide Uber o Cabify directamente a la puerta. No tomes carros públicos de noche.',
    safety: 'En la Zona Colonial hay Policía Turística (POLITUR) activa y es muy segura para caminar en grupo.',
    mustDo: [
      'Bonyé en las Ruinas de San Francisco (domingos gratis)',
      'Cerveza presidente vestida de novia en el Malecón',
      'Recorrido colonial nocturno por Calle Las Damas'
    ]
  }

  // Currency calculation
  const usdEquivalent = (calcAmount / config.exchangeRateToUSD).toFixed(2)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
      <div className="relative w-full max-w-2xl rounded-3xl bg-gray-950 border border-amber-500/30 p-6 md:p-8 shadow-2xl text-foreground max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
              <Plane className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                <span>Kit de Turismo & Diáspora</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  {guide.destination}
                </span>
              </h2>
              <p className="text-xs text-muted-foreground">
                Consejos de supervivencia cultural, vestimenta y presupuesto para visitantes
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Currency Quick Converter */}
        <div className="mt-5 p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-transparent border border-amber-500/20">
          <div className="flex items-center justify-between gap-3 mb-2">
            <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
              <DollarSign className="h-4 w-4" />
              Calculadora Rápida de Moneda
            </span>
            <span className="text-[11px] text-muted-foreground font-mono">
              1 USD ≈ {config.exchangeRateToUSD} {config.currency}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
            <div>
              <label className="text-[10px] uppercase font-bold text-muted-foreground block mb-1">
                Monto en {config.currency} ({config.currencySymbol})
              </label>
              <input
                type="number"
                value={calcAmount}
                onChange={(e) => setCalcAmount(Math.max(0, Number(e.target.value)))}
                className="w-full px-3 py-2 text-sm font-bold bg-white/5 border border-white/10 rounded-xl focus:border-amber-400 outline-none"
              />
            </div>
            <div className="p-3 rounded-xl bg-black/40 border border-white/5 text-center">
              <span className="text-[10px] uppercase font-bold text-gray-400 block">Equivalente Estimado</span>
              <span className="text-lg font-black text-emerald-400">
                ${usdEquivalent} USD
              </span>
            </div>
          </div>
        </div>

        {/* Local Etiquette Cards */}
        <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-1.5">
            <div className="flex items-center gap-2 font-bold text-amber-300">
              <Shirt className="h-4 w-4" />
              <span>Código de Vestimenta</span>
            </div>
            <p className="text-muted-foreground text-[11px] leading-relaxed">
              {guide.dressCode}
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-1.5">
            <div className="flex items-center gap-2 font-bold text-emerald-300">
              <Car className="h-4 w-4" />
              <span>Transporte Seguro</span>
            </div>
            <p className="text-muted-foreground text-[11px] leading-relaxed">
              {guide.transport}
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-1.5">
            <div className="flex items-center gap-2 font-bold text-cyan-300">
              <Info className="h-4 w-4" />
              <span>Propinas y Pagos</span>
            </div>
            <p className="text-muted-foreground text-[11px] leading-relaxed">
              {guide.tipping}
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-1.5">
            <div className="flex items-center gap-2 font-bold text-rose-300">
              <ShieldAlert className="h-4 w-4" />
              <span>Seguridad Barrial</span>
            </div>
            <p className="text-muted-foreground text-[11px] leading-relaxed">
              {guide.safety}
            </p>
          </div>
        </div>

        {/* Must-Do Cultural Highlights */}
        <div className="mt-5 p-4 rounded-2xl bg-white/5 border border-white/10">
          <div className="text-xs font-bold text-foreground mb-2 flex items-center gap-1.5">
            <Sparkles className="h-4 w-4 text-amber-400" />
            <span>3 Experiencias Imperdibles en {guide.destination.split('&')[0].trim()}</span>
          </div>
          <ul className="space-y-1.5 text-xs text-muted-foreground">
            {guide.mustDo.map((item, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <CheckCircle className="h-3.5 w-3.5 text-amber-400 shrink-0 mt-0.5" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Footer */}
        <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs transition shadow-lg shadow-amber-500/20"
          >
            Entendido, ¡a disfrutar el plan!
          </button>
        </div>
      </div>
    </div>
  )
}
