'use client'

import React, { useState } from 'react'
import { Globe, Plane, Check, ChevronDown } from 'lucide-react'
import { useLocaleStore, SupportedLocale } from '@/stores/localeStore'

const LOCALE_OPTIONS: { id: SupportedLocale; flag: string; label: string; currency: string }[] = [
  { id: 'es-DO', flag: '🇩🇴', label: 'Rep. Dominicana', currency: 'DOP (RD$)' },
  { id: 'en-US', flag: '🇺🇸', label: 'Global / EE.UU.', currency: 'USD ($)' },
  { id: 'es-ES', flag: '🇪🇸', label: 'España', currency: 'EUR (€)' },
  { id: 'es-MX', flag: '🇲🇽', label: 'México', currency: 'MXN ($)' },
  { id: 'es-CO', flag: '🇨🇴', label: 'Colombia', currency: 'COP ($)' },
  { id: 'es-AR', flag: '🇦🇷', label: 'Argentina', currency: 'ARS ($)' },
]

export default function GlobalLocaleSelector() {
  const { locale, setLocale, isTouristMode, toggleTouristMode, config } = useLocaleStore()
  const [isOpen, setIsOpen] = useState(false)

  const currentOption = LOCALE_OPTIONS.find(o => o.id === locale) || LOCALE_OPTIONS[0]

  return (
    <div className="relative flex items-center gap-2">
      {/* Tourist Mode Pill Toggle */}
      <button
        type="button"
        onClick={toggleTouristMode}
        title="Activa el Modo Visitante para ver precios en USD y consejos de viaje"
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all shadow-sm ${
          isTouristMode
            ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-amber-500/20 ring-2 ring-amber-400'
            : 'bg-white/10 hover:bg-white/20 text-gray-300 border border-white/10'
        }`}
      >
        <Plane className={`h-3.5 w-3.5 ${isTouristMode ? 'animate-bounce' : ''}`} />
        <span className="hidden sm:inline">
          {isTouristMode ? 'Visitante Activo' : 'Modo Diáspora'}
        </span>
      </button>

      {/* Country / Language Dropdown Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 border border-white/10 text-xs font-medium text-foreground transition-all shadow-sm"
      >
        <span className="text-sm">{currentOption.flag}</span>
        <span className="hidden md:inline font-semibold">{currentOption.currency.split(' ')[0]}</span>
        <ChevronDown className="h-3 w-3 opacity-70" />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 top-full mt-2 z-50 w-60 rounded-2xl bg-gray-900/95 border border-white/15 p-2 shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in-95">
            <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground border-b border-white/10 flex items-center justify-between">
              <span>País & Moneda</span>
              <Globe className="h-3 w-3" />
            </div>

            <div className="py-1 space-y-0.5">
              {LOCALE_OPTIONS.map(opt => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => {
                    setLocale(opt.id)
                    setIsOpen(false)
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition ${
                    locale === opt.id
                      ? 'bg-violet-600/30 text-violet-200 font-bold border border-violet-500/30'
                      : 'hover:bg-white/10 text-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-base">{opt.flag}</span>
                    <div className="text-left">
                      <div className="font-semibold text-foreground">{opt.label}</div>
                      <div className="text-[10px] text-muted-foreground">{opt.currency}</div>
                    </div>
                  </div>
                  {locale === opt.id && <Check className="h-3.5 w-3.5 text-violet-400" />}
                </button>
              ))}
            </div>

            <div className="mt-2 pt-2 border-t border-white/10 px-2 py-1 bg-white/5 rounded-xl text-[10px] text-muted-foreground">
              Términos adaptados: <strong className="text-foreground">{config.terms.hangout}</strong> · <strong className="text-foreground">{config.terms.splitBill}</strong>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
