// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, renderHook } from '@testing-library/react'
import { useConsoleErrorReporter } from './useConsoleErrorReporter'
import { ERROR_REPORTING_CONFIG, resetSessionErrorCount } from '@/lib/utils/errorConfig'

const originalConfig = { ...ERROR_REPORTING_CONFIG }
let nativeError: ReturnType<typeof vi.spyOn>
let nativeWarn: ReturnType<typeof vi.spyOn>

beforeEach(() => {
  Object.assign(ERROR_REPORTING_CONFIG, { enabled: true, throttleWindow: 0, maxErrorsPerSession: 1000, maxErrorsPerWindow: 1000 })
  resetSessionErrorCount()
  nativeError = vi.spyOn(console, 'error').mockImplementation(() => {})
  nativeWarn = vi.spyOn(console, 'warn').mockImplementation(() => {})
})
afterEach(() => {
  cleanup()
  Object.assign(ERROR_REPORTING_CONFIG, originalConfig)
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

function transportFor(response: Response, failure?: unknown, rejectReports = false) {
  const transport = vi.fn(async (input: RequestInfo | URL, _init?: RequestInit) => {
    const url = typeof input === 'string' ? input : 'url' in input ? input.url : input.href
    if (url.includes('/debug/')) {
      if (rejectReports) throw new Error('Telemetry unavailable')
      return new Response(null, { status: 202 })
    }
    if (failure) throw failure
    return response
  })
  vi.stubGlobal('fetch', transport)
  renderHook(() => useConsoleErrorReporter())
  return transport
}

const reports = (transport: ReturnType<typeof transportFor>) => transport.mock.calls
  .filter(call => typeof call[0] === 'string' && call[0].includes('/debug/'))
  .map(call => JSON.parse(String(call[1]?.body)))

describe('best-effort browser error reporting', () => {
  it('returns the exact HTTP error response without consuming or reporting its body', async () => {
    const response = new Response('private response body', { status: 500, statusText: 'Server failure' })
    const transport = transportFor(response)
    const input = 'https://example.test/api/events?token=private-token#private-fragment'
    const init = { method: 'POST', headers: { Authorization: 'Bearer private-key' }, body: 'private request body' }
    const received = await window.fetch(input, init)
    expect(received).toBe(response)
    expect(response.bodyUsed).toBe(false)
    expect(transport).toHaveBeenNthCalledWith(1, input, init)
    const [report] = reports(transport)
    expect(report.message).toBe('HTTP 500 Server failure')
    expect(report.url).toBe('https://example.test/api/events')
    expect(report.method).toBe('POST')
    expect(report.response).toBeUndefined()
    expect(JSON.stringify(report)).not.toMatch(/private|Authorization|Bearer/)
    expect(await received.text()).toBe('private response body')
  })

  it.each(['request', 'url'])('accepts a %s fetch input and preserves the original argument', async kind => {
    const response = new Response(null, { status: 503, statusText: 'Unavailable' })
    const transport = transportFor(response)
    const input = kind === 'request'
      ? new Request('https://example.test/items?secret=value', { method: 'PATCH' })
      : new URL('https://example.test/items?secret=value')
    expect(await window.fetch(input)).toBe(response)
    expect(transport.mock.calls[0][0]).toBe(input)
    const [report] = reports(transport)
    expect(report.url).toBe('https://example.test/items')
    expect(report.method).toBe(kind === 'request' ? 'PATCH' : 'GET')
  })

  it('preserves the original rejection even when the error cannot be stringified and telemetry also fails', async () => {
    const failure = { toString() { throw new Error('Cannot stringify') } }
    const transport = transportFor(new Response(), failure, true)
    await expect(window.fetch('https://example.test/offline')).rejects.toBe(failure)
    await Promise.resolve()
    expect(reports(transport)[0].message).toBe('Fetch failed')
    expect(reports(transport)[0].status).toBe(0)
  })

  it('does not replace an HTTP response when sending telemetry rejects', async () => {
    const response = new Response(null, { status: 502 })
    transportFor(response, undefined, true)
    expect(await window.fetch('https://example.test/events')).toBe(response)
    await Promise.resolve()
  })

  it('keeps native console arguments and tolerates undefined, circular objects and bigint values', () => {
    const transport = transportFor(new Response())
    const cyclic: any = { count: BigInt(1) }; cyclic.self = cyclic
    expect(() => console.error(undefined, cyclic)).not.toThrow()
    expect(nativeError).toHaveBeenCalledWith(undefined, cyclic)
    const [report] = reports(transport)
    expect(report.message).toContain('[Circular]')
    expect(report.message).toContain('"count":"1"')
  })

  it('keeps console.warn usable when object serialization and string conversion both throw', () => {
    const transport = transportFor(new Response())
    const hostile = { toJSON() { throw new Error('Blocked') }, toString() { throw new Error('Blocked') } }
    expect(() => console.warn(hostile)).not.toThrow()
    expect(nativeWarn).toHaveBeenCalledWith(hostile)
    expect(reports(transport)[0].message).toBe('[Unserializable]')
  })

  it('does not recursively report a debug endpoint or report expected unauthorized responses', async () => {
    const response = new Response(null, { status: 401 })
    const transport = transportFor(response)
    expect(await window.fetch('https://example.test/private')).toBe(response)
    await window.fetch('https://example.test/debug/console-errors')
    expect(transport).toHaveBeenCalledTimes(2)
    expect(transport.mock.calls[1]).toEqual(['https://example.test/debug/console-errors'])
    expect(transport.mock.calls.some(call => call[1]?.method === 'POST')).toBe(false)
  })
})
