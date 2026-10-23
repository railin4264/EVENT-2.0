import type { RegionalConfig } from '@/stores/localeStore'

// ISO 4217 currency of each country (official tender). Countries absent here keep USD
// formatting only when the country itself uses it; otherwise the UI shows the event's own currency.
export const COUNTRY_CURRENCY: Record<string, string> = {
  AR: 'ARS', BO: 'BOB', BR: 'BRL', CA: 'CAD', CL: 'CLP', CO: 'COP', CR: 'CRC', CU: 'CUP', DO: 'DOP', EC: 'USD',
  SV: 'USD', GT: 'GTQ', HN: 'HNL', MX: 'MXN', NI: 'NIO', PA: 'PAB', PY: 'PYG', PE: 'PEN', PR: 'USD', UY: 'UYU',
  VE: 'VES', US: 'USD', JM: 'JMD', HT: 'HTG', TT: 'TTD', BS: 'BSD', BB: 'BBD',
  ES: 'EUR', PT: 'EUR', FR: 'EUR', DE: 'EUR', IT: 'EUR', NL: 'EUR', BE: 'EUR', IE: 'EUR', AT: 'EUR', FI: 'EUR',
  GR: 'EUR', GB: 'GBP', CH: 'CHF', SE: 'SEK', NO: 'NOK', DK: 'DKK', PL: 'PLN', CZ: 'CZK',
  JP: 'JPY', KR: 'KRW', CN: 'CNY', IN: 'INR', AE: 'AED', EG: 'EGP', ZA: 'ZAR', MA: 'MAD', NG: 'NGN', KE: 'KES',
  AU: 'AUD', NZ: 'NZD', SG: 'SGD', PH: 'PHP', TH: 'THB', ID: 'IDR', TR: 'TRY', IL: 'ILS'
}

const SPANISH_SPEAKING = new Set(['AR', 'BO', 'CL', 'CO', 'CR', 'CU', 'DO', 'EC', 'SV', 'GQ', 'GT', 'HN', 'MX', 'NI', 'PA', 'PY', 'PE', 'PR', 'ES', 'UY', 'VE'])

function regionName(code: string): string {
  try { return new Intl.DisplayNames(['es'], { type: 'region' }).of(code) || code } catch { return code }
}

function currencySymbol(currency: string): string {
  try {
    return new Intl.NumberFormat('es', { style: 'currency', currency, currencyDisplay: 'narrowSymbol' })
      .formatToParts(0).find(part => part.type === 'currency')?.value || currency
  } catch { return currency }
}

/**
 * A truthful configuration for a country without a hand-made preset: its real name and
 * currency, neutral vocabulary and no payout methods or exchange rate we have not verified.
 */
export function neutralPreset(countryCode: string): RegionalConfig {
  const code = countryCode.toUpperCase()
  const currency = COUNTRY_CURRENCY[code] || 'USD'
  const spanish = SPANISH_SPEAKING.has(code)
  return {
    locale: spanish ? 'es' : 'en-US',
    countryCode: code,
    countryName: regionName(code),
    currency,
    currencySymbol: currencySymbol(currency),
    exchangeRateToUSD: currency === 'USD' ? 1 : NaN,
    terms: spanish ? {
      hangout: 'Plan', hangoutPlural: 'Planes', splitBill: 'Dividir la cuenta', friends: 'Amigos',
      drinksBites: 'Bebidas y algo de comer', parking: 'Estacionamiento', ticket: 'Entrada',
      afterParty: 'Después del evento', touristMode: 'Modo visitante'
    } : {
      hangout: 'Hangout', hangoutPlural: 'Hangouts', splitBill: 'Split the bill', friends: 'Friends',
      drinksBites: 'Drinks & Bites', parking: 'Parking', ticket: 'Ticket',
      afterParty: 'After the event', touristMode: 'Visitor mode'
    },
    payoutMethods: []
  }
}

/**
 * Country named explicitly by the browser's language settings (es-CL → CL). A bare
 * language ("es") names no country, so it is not guessed.
 */
export function browserCountry(languages: readonly string[] = typeof navigator !== 'undefined' ? navigator.languages || [navigator.language] : []): string | null {
  for (const tag of languages) {
    try {
      const region = new Intl.Locale(tag).region
      if (region && /^[A-Z]{2}$/.test(region)) return region
    } catch { /* Ignore malformed language tags. */ }
  }
  return null
}
