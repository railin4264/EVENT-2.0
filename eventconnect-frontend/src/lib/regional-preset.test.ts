// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest'

// Node 25 exposes an incomplete global localStorage; give the persisted store a working one.
vi.hoisted(() => {
  const data = new Map<string, string>()
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
    getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => { data.set(key, String(value)) },
    removeItem: (key: string) => { data.delete(key) }, clear: () => data.clear(), key: () => null, length: 0
  } })
})
import { neutralPreset, browserCountry } from './regional-preset'
import { useLocaleStore, REGIONAL_PRESETS } from '@/stores/localeStore'

describe('regional presets', () => {
  it('gives a country without a preset its real name and currency, not the Dominican defaults', () => {
    const chile = neutralPreset('cl')
    expect(chile).toMatchObject({ countryCode: 'CL', currency: 'CLP', locale: 'es', payoutMethods: [] })
    expect(chile.countryName).toMatch(/Chile/)
    expect(chile.terms.splitBill).toBe('Dividir la cuenta')
    expect(Number.isNaN(chile.exchangeRateToUSD)).toBe(true)
    expect(JSON.stringify(chile)).not.toMatch(/RD\$|Coro|Serrucho|Banco Popular/)
    expect(neutralPreset('DE')).toMatchObject({ currency: 'EUR', locale: 'en-US' })
  })

  it('keeps the reviewed presets and switches by country', () => {
    useLocaleStore.getState().setLocaleByCountry('MX')
    expect(useLocaleStore.getState().config).toEqual(REGIONAL_PRESETS['es-MX'])
    useLocaleStore.getState().setLocaleByCountry('PE')
    expect(useLocaleStore.getState().config).toMatchObject({ countryCode: 'PE', currency: 'PEN' })
  })

  it('never converts to USD without a verified exchange rate', () => {
    useLocaleStore.getState().setLocaleByCountry('PE')
    expect(useLocaleStore.getState().formatCurrency(50, true)).toContain('PEN')
  })

  it('reads the country only when the browser names one', () => {
    expect(browserCountry(['es-CL', 'es'])).toBe('CL')
    expect(browserCountry(['es', 'en'])).toBeNull()
    expect(browserCountry(['not a tag'])).toBeNull()
  })
})
