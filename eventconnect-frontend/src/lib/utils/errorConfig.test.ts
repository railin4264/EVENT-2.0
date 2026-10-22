// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'

const storageDescriptor = Object.getOwnPropertyDescriptor(window, 'localStorage')!
afterEach(() => {
  Object.defineProperty(window, 'localStorage', storageDescriptor)
  vi.restoreAllMocks()
})

describe('defensive error reporting configuration', () => {
  it('can initialize and read or update debug preferences when storage is blocked', async () => {
    vi.resetModules()
    Object.defineProperty(window, 'localStorage', { configurable: true, get() { throw new DOMException('Blocked', 'SecurityError') } })
    const config = await import('./errorConfig')
    expect(config.ERROR_REPORTING_CONFIG.enabled).toBe(false)
    expect(config.isDebugMode()).toBe(false)
    expect(() => config.setDebugMode(true)).not.toThrow()
    expect(() => config.setDebugMode(false)).not.toThrow()
  })

  it('accepts missing messages, Request/URL inputs and hostile values without calling includes on undefined', async () => {
    const config = await import('./errorConfig')
    config.ERROR_REPORTING_CONFIG.enabled = true
    config.resetSessionErrorCount()
    const hostile = { toString() { throw new Error('Blocked') } }
    const cyclic: any = {}; cyclic.self = cyclic
    for (const message of [undefined, null, 1, hostile, cyclic]) {
      expect(() => config.shouldReportError(message, hostile)).not.toThrow()
    }
    expect(config.shouldReportError(undefined, new URL('https://example.test/debug/network-errors'))).toBe(false)
    expect(config.shouldReportError(undefined, new Request('https://example.test/debug/network-errors'))).toBe(false)
    expect(config.shouldReportError(undefined, 'https://example.test/events')).toBe(true)
  })
})
