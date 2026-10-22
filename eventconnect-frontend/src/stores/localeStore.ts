'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type SupportedLocale = 'es-DO' | 'es-ES' | 'es-MX' | 'es-CO' | 'es-AR' | 'en-US'
export type SupportedCountry = 'DO' | 'ES' | 'MX' | 'CO' | 'AR' | 'US' | 'GLOBAL'

export interface RegionalConfig {
  locale: SupportedLocale
  countryCode: SupportedCountry
  countryName: string
  currency: 'DOP' | 'EUR' | 'MXN' | 'COP' | 'ARS' | 'USD'
  currencySymbol: string
  exchangeRateToUSD: number // for diaspora conversion
  terms: {
    hangout: string       // Coro vs Quedada vs Peda vs Parche vs Juntada vs Hangout
    hangoutPlural: string // Coros vs Quedadas vs Pedas vs Parches vs Juntadas vs Hangouts
    splitBill: string     // Serrucho vs Bote / A pachas vs Cooperacha vs Hacer la vaca vs Vaquita vs Split the bill
    friends: string       // Panas vs Colegas vs Compas vs Parceros vs Pibes vs Friends
    drinksBites: string   // Bebida y picadera vs Tapas y cañas vs Cheves y botanas vs Pola y picada vs Drinks & Bites
    parking: string       // Parqueo vs Aparcamiento vs Estacionamiento vs Parqueadero vs Parking
    ticket: string        // Entrada / Boleta vs Entrada vs Boleto vs Boleta vs Ticket
    afterParty: string    // El After Oficial vs The Official After-Party
    touristMode: string   // Modo Diáspora / Visitante vs Guía de Viaje vs Visitor Mode
  }
  payoutMethods: { id: string; name: string; type: string }[]
}

export const REGIONAL_PRESETS: Record<SupportedLocale, RegionalConfig> = {
  'es-DO': {
    locale: 'es-DO',
    countryCode: 'DO',
    countryName: 'República Dominicana',
    currency: 'DOP',
    currencySymbol: 'RD$',
    exchangeRateToUSD: 60.5,
    terms: {
      hangout: 'Coro',
      hangoutPlural: 'Coros',
      splitBill: 'Serrucho',
      friends: 'Panas',
      drinksBites: 'Bebida y picadera',
      parking: 'Parqueo',
      ticket: 'Boleta',
      afterParty: 'El After Oficial 🌙',
      touristMode: 'Modo Diáspora & Visitante ✈️'
    },
    payoutMethods: [
      { id: 'banco_popular', name: 'Banco Popular Dominicano', type: 'local_bank' },
      { id: 'banreservas', name: 'Banreservas', type: 'local_bank' },
      { id: 'bhd', name: 'Banco BHD', type: 'local_bank' }
    ]
  },
  'es-ES': {
    locale: 'es-ES',
    countryCode: 'ES',
    countryName: 'España',
    currency: 'EUR',
    currencySymbol: '€',
    exchangeRateToUSD: 0.92,
    terms: {
      hangout: 'Quedada',
      hangoutPlural: 'Quedadas',
      splitBill: 'Bote / Pagar a pachas',
      friends: 'Colegas',
      drinksBites: 'Tapas y cañas',
      parking: 'Aparcamiento',
      ticket: 'Entrada',
      afterParty: 'El After Oficial 🌙',
      touristMode: 'Guía de Viaje & Turismo ✈️'
    },
    payoutMethods: [
      { id: 'bizum', name: 'Bizum', type: 'instant' },
      { id: 'sepa', name: 'Transferencia SEPA (IBAN)', type: 'sepa_bank' }
    ]
  },
  'es-MX': {
    locale: 'es-MX',
    countryCode: 'MX',
    countryName: 'México',
    currency: 'MXN',
    currencySymbol: '$',
    exchangeRateToUSD: 19.8,
    terms: {
      hangout: 'Plan / Peda',
      hangoutPlural: 'Planes / Pedas',
      splitBill: 'Cooperacha / Vaquita',
      friends: 'Compas',
      drinksBites: 'Cheves y botanas',
      parking: 'Estacionamiento',
      ticket: 'Boleto',
      afterParty: 'El After Oficial 🌙',
      touristMode: 'Modo Viajero & Turismo ✈️'
    },
    payoutMethods: [
      { id: 'spei', name: 'Transferencia SPEI (CLABE)', type: 'instant' },
      { id: 'oxxo', name: 'OXXO Pay', type: 'cash_dep' },
      { id: 'bbva_mex', name: 'BBVA México', type: 'local_bank' }
    ]
  },
  'es-CO': {
    locale: 'es-CO',
    countryCode: 'CO',
    countryName: 'Colombia',
    currency: 'COP',
    currencySymbol: '$',
    exchangeRateToUSD: 4150,
    terms: {
      hangout: 'Parche',
      hangoutPlural: 'Parches',
      splitBill: 'Hacer la vaca',
      friends: 'Parceros',
      drinksBites: 'Pola y empanadas',
      parking: 'Parqueadero',
      ticket: 'Boleta',
      afterParty: 'El Remate Oficial 🌙',
      touristMode: 'Modo Turista & Guía ✈️'
    },
    payoutMethods: [
      { id: 'nequi', name: 'Nequi', type: 'instant' },
      { id: 'daviplata', name: 'Daviplata', type: 'instant' },
      { id: 'bancolombia', name: 'Bancolombia / PSE', type: 'local_bank' }
    ]
  },
  'es-AR': {
    locale: 'es-AR',
    countryCode: 'AR',
    countryName: 'Argentina',
    currency: 'ARS',
    currencySymbol: '$',
    exchangeRateToUSD: 1050,
    terms: {
      hangout: 'Juntada / Previa',
      hangoutPlural: 'Juntadas',
      splitBill: 'Hacer una vaquita',
      friends: 'Pibes / Amigos',
      drinksBites: 'Birra y picada',
      parking: 'Estacionamiento',
      ticket: 'Entrada',
      afterParty: 'El After Oficial 🌙',
      touristMode: 'Modo Viajero & Guía ✈️'
    },
    payoutMethods: [
      { id: 'mercadopago', name: 'Mercado Pago (CVU)', type: 'instant' },
      { id: 'transferencia_ar', name: 'Transferencia Bancaria (CBU)', type: 'local_bank' }
    ]
  },
  'en-US': {
    locale: 'en-US',
    countryCode: 'US',
    countryName: 'United States & Global',
    currency: 'USD',
    currencySymbol: '$',
    exchangeRateToUSD: 1.0,
    terms: {
      hangout: 'Hangout',
      hangoutPlural: 'Hangouts',
      splitBill: 'Split the bill',
      friends: 'Friends / Crew',
      drinksBites: 'Drinks & Bites',
      parking: 'Parking',
      ticket: 'Ticket',
      afterParty: 'The Official After-Party 🌙',
      touristMode: 'Visitor & Travel Guide ✈️'
    },
    payoutMethods: [
      { id: 'stripe', name: 'Direct Deposit / Stripe', type: 'ach' },
      { id: 'venmo', name: 'Venmo / Zelle', type: 'instant' }
    ]
  }
}

// Lightweight internationalization dictionary for multilingual scaling
export const TRANSLATIONS: Record<string, Record<SupportedLocale, string>> = {
  welcome: {
    'es-DO': '¡Bienvenido a EventNow!',
    'es-ES': '¡Te damos la bienvenida a EventNow!',
    'es-MX': '¡Bienvenido a EventNow!',
    'es-CO': '¡Bienvenido al parche de EventNow!',
    'es-AR': '¡Bienvenido a EventNow!',
    'en-US': 'Welcome to EventNow!'
  },
  exploreEvents: {
    'es-DO': 'Descubre tu próximo coro',
    'es-ES': 'Descubre tu próxima quedada',
    'es-MX': 'Descubre tu próximo plan',
    'es-CO': 'Descubre tu próximo parche',
    'es-AR': 'Descubre tu próxima juntada',
    'en-US': 'Discover your next plan'
  },
  virtualEvents: {
    'es-DO': 'En Línea & Streams',
    'es-ES': 'En Línea & Streams',
    'es-MX': 'En Línea & Streams',
    'es-CO': 'En Línea & Streams',
    'es-AR': 'En Línea & Streams',
    'en-US': 'Online & Streams'
  },
  createEvent: {
    'es-DO': 'Armar Coro / Evento',
    'es-ES': 'Crear Quedada / Evento',
    'es-MX': 'Crear Plan / Evento',
    'es-CO': 'Armar Parche / Evento',
    'es-AR': 'Armar Juntada / Evento',
    'en-US': 'Create Event / Hangout'
  }
}

interface LocaleState {
  locale: SupportedLocale
  isTouristMode: boolean
  config: RegionalConfig
  setLocale: (locale: SupportedLocale) => void
  setLocaleByCountry: (countryCode: string) => void
  toggleTouristMode: () => void
  t: (key: string) => string
  formatCurrency: (amount: number, forceUSD?: boolean) => string
  convertPrice: (amount: number, fromCurrency?: string) => { local: string; usd: string }
}

export const useLocaleStore = create<LocaleState>()(
  persist(
    (set, get) => ({
      locale: 'es-DO',
      isTouristMode: false,
      config: REGIONAL_PRESETS['es-DO'],

      setLocale: (newLocale: SupportedLocale) => {
        const config = REGIONAL_PRESETS[newLocale] || REGIONAL_PRESETS['es-DO']
        set({ locale: newLocale, config })
      },

      setLocaleByCountry: (countryCode: string) => {
        const code = countryCode.toUpperCase()
        let targetLocale: SupportedLocale = 'es-DO'
        if (code === 'ES') targetLocale = 'es-ES'
        else if (code === 'MX') targetLocale = 'es-MX'
        else if (code === 'CO') targetLocale = 'es-CO'
        else if (code === 'AR') targetLocale = 'es-AR'
        else if (code === 'US' || code === 'GLOBAL') targetLocale = 'en-US'
        
        const config = REGIONAL_PRESETS[targetLocale] || REGIONAL_PRESETS['es-DO']
        set({ locale: targetLocale, config })
      },

      toggleTouristMode: () => {
        set(state => ({ isTouristMode: !state.isTouristMode }))
      },

      t: (key: string) => {
        const { locale } = get()
        const entry = TRANSLATIONS[key]
        if (!entry) return key
        return entry[locale] || entry['es-DO'] || key
      },

      formatCurrency: (amount: number, forceUSD = false) => {
        const { config, isTouristMode } = get()
        if (amount === 0) return 'Gratis / Free'
        
        if (forceUSD || (isTouristMode && config.currency !== 'USD')) {
          const usdVal = config.currency === 'USD' ? amount : amount / config.exchangeRateToUSD
          return `$${usdVal.toFixed(2)} USD`
        }

        return `${config.currencySymbol}${amount.toLocaleString()} ${config.currency}`
      },

      convertPrice: (amount: number, fromCurrency = 'DOP') => {
        const { config } = get()
        let usdVal = amount
        if (fromCurrency === 'DOP') usdVal = amount / 60.5
        else if (fromCurrency === 'EUR') usdVal = amount / 0.92
        else if (fromCurrency === 'MXN') usdVal = amount / 19.8
        else if (fromCurrency === 'COP') usdVal = amount / 4150
        else if (fromCurrency === 'ARS') usdVal = amount / 1050

        const localAmount = usdVal * config.exchangeRateToUSD
        return {
          local: `${config.currencySymbol}${Math.round(localAmount).toLocaleString()} ${config.currency}`,
          usd: `$${usdVal.toFixed(2)} USD`
        }
      }
    }),
    {
      name: 'eventconnect-locale-storage'
    }
  )
)
