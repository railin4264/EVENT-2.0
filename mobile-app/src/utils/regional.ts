// Regional vocabulary and money for the place an event happens. Mirrors the web presets
// (eventconnect-frontend/src/stores/localeStore.ts); countries without a reviewed preset get
// their real currency and neutral wording, never Dominican defaults.

export type Regional = {
  countryCode: string;
  currency: string;
  currencySymbol: string;
  numberLocale: string;
  splitBill: string;
  splitBillAction: string;
  friends: string;
  hangout: string;
  banks: string[];
};

const PRESETS: Record<string, Omit<Regional, 'countryCode'>> = {
  DO: { currency: 'DOP', currencySymbol: 'RD$', numberLocale: 'es-DO', splitBill: 'Serrucho', splitBillAction: 'Hacer serrucho', friends: 'panas', hangout: 'coro',
    banks: ['Banco Popular', 'Banco BHD', 'Banreservas', 'Qik Banco Digital', 'Efectivo'] },
  ES: { currency: 'EUR', currencySymbol: '€', numberLocale: 'es-ES', splitBill: 'Bote', splitBillAction: 'Hacer bote', friends: 'colegas', hangout: 'quedada',
    banks: ['Bizum', 'Transferencia bancaria', 'Efectivo'] },
  MX: { currency: 'MXN', currencySymbol: '$', numberLocale: 'es-MX', splitBill: 'Cooperacha', splitBillAction: 'Hacer cooperacha', friends: 'compas', hangout: 'plan',
    banks: ['Transferencia SPEI', 'Efectivo'] },
  CO: { currency: 'COP', currencySymbol: '$', numberLocale: 'es-CO', splitBill: 'Vaca', splitBillAction: 'Hacer la vaca', friends: 'parceros', hangout: 'parche',
    banks: ['Nequi', 'Daviplata', 'Transferencia bancaria', 'Efectivo'] },
  AR: { currency: 'ARS', currencySymbol: '$', numberLocale: 'es-AR', splitBill: 'Vaquita', splitBillAction: 'Hacer la vaquita', friends: 'amigos', hangout: 'juntada',
    banks: ['Mercado Pago', 'Transferencia bancaria', 'Efectivo'] },
  US: { currency: 'USD', currencySymbol: '$', numberLocale: 'en-US', splitBill: 'Split', splitBillAction: 'Split the bill', friends: 'friends', hangout: 'hangout',
    banks: ['Zelle', 'Venmo', 'Cash'] },
};

// ISO 4217 currency per country for places without a preset.
const COUNTRY_CURRENCY: Record<string, string> = {
  BO: 'BOB', BR: 'BRL', CA: 'CAD', CL: 'CLP', CR: 'CRC', EC: 'USD', SV: 'USD', GT: 'GTQ', HN: 'HNL', NI: 'NIO', PA: 'PAB',
  PY: 'PYG', PE: 'PEN', PR: 'USD', UY: 'UYU', VE: 'VES', JM: 'JMD', PT: 'EUR', FR: 'EUR', DE: 'EUR', IT: 'EUR', NL: 'EUR',
  BE: 'EUR', IE: 'EUR', AT: 'EUR', FI: 'EUR', GR: 'EUR', GB: 'GBP', CH: 'CHF', SE: 'SEK', NO: 'NOK', DK: 'DKK', PL: 'PLN',
  JP: 'JPY', KR: 'KRW', CN: 'CNY', IN: 'INR', AE: 'AED', EG: 'EGP', ZA: 'ZAR', AU: 'AUD', NZ: 'NZD',
};

function symbol(currency: string) {
  try {
    return new Intl.NumberFormat('es', { style: 'currency', currency, currencyDisplay: 'narrowSymbol' })
      .formatToParts(0).find(part => part.type === 'currency')?.value || currency;
  } catch { return currency; }
}

/** Regional settings for an event: its venue country first, then the person's own country. */
export function regionalFor(event?: { location?: unknown; price?: unknown } | null, user?: { countryCode?: string } | null): Regional {
  const location = event?.location && typeof event.location === 'object' ? event.location as { countryCode?: string } : {};
  const code = String(location.countryCode || user?.countryCode || '').toUpperCase();
  const preset = PRESETS[code];
  if (preset) return { countryCode: code, ...preset };
  const priceCurrency = event?.price && typeof event.price === 'object' ? (event.price as { currency?: string }).currency : undefined;
  const currency = COUNTRY_CURRENCY[code] || (priceCurrency && /^[A-Z]{3}$/.test(priceCurrency) ? priceCurrency : 'USD');
  return {
    countryCode: code, currency, currencySymbol: symbol(currency), numberLocale: 'es',
    splitBill: 'Dividir la cuenta', splitBillAction: 'Dividir la cuenta', friends: 'amigos', hangout: 'plan',
    banks: ['Transferencia bancaria', 'Efectivo'],
  };
}

export function formatMoney(amount: number, regional: Regional) {
  return `${regional.currencySymbol} ${amount.toLocaleString(regional.numberLocale)}`;
}
