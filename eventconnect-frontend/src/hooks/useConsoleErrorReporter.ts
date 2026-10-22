'use client'

import { useEffect } from 'react'
import { API_BASE_URL } from '@/lib/constants'
import { ERROR_REPORTING_CONFIG, shouldReportError } from '@/lib/utils/errorConfig'

interface ConsoleError {
  level: 'error' | 'warn' | 'info'
  message: string
  url: string
  line?: number
  column?: number
  error?: string
  timestamp: number
  userAgent: string
}

interface NetworkError {
  message: string
  url: string
  method: string
  status: number
  statusText: string
  timestamp: number
}

const errorThrottle = new Map<string, number>()

const safeText = (value: unknown, fallback = 'Unknown error'): string => {
  try {
    if (value == null) return fallback
    if (value instanceof Error) return value.message || value.name || fallback
    return String(value) || fallback
  } catch { return fallback }
}

const consoleArgument = (value: unknown): string => {
  if (value instanceof Error) return safeText(value)
  if (typeof value !== 'object' || value === null) return safeText(value, String(value == null ? value : 'Unknown value'))
  try {
    const seen = new WeakSet<object>()
    return JSON.stringify(value, (_key, part) => {
      if (typeof part === 'bigint') return String(part)
      if (part && typeof part === 'object') {
        if (seen.has(part)) return '[Circular]'
        seen.add(part)
      }
      return part
    }) || safeText(value)
  } catch { return safeText(value, '[Unserializable]') }
}

// Reports need endpoint metadata, never query credentials, request bodies or response bodies.
const reportUrl = (input: unknown): string => {
  try {
    let value = input
    if (input && typeof input === 'object') {
      const request = input as { url?: unknown; href?: unknown }
      value = typeof request.url === 'string' ? request.url : typeof request.href === 'string' ? request.href : input
    }
    const url = new URL(safeText(value, ''), window.location.href)
    url.search = ''; url.hash = ''; url.username = ''; url.password = ''
    return url.href
  } catch { return '' }
}

const requestMetadata = (args: Parameters<typeof fetch>) => {
  const input = args[0]
  const method = args[1]?.method || (input && typeof input === 'object' && 'method' in input ? input.method : 'GET')
  return { url: reportUrl(input), method: safeText(method, 'GET').toUpperCase() }
}

const sendErrorToBackend = async (type: 'console' | 'network', data: ConsoleError | NetworkError, transport: typeof fetch) => {
  try {
    // Configuration, filtering, serialization and transport are all best-effort.
    if (typeof transport !== 'function' || !shouldReportError(data.message, data.url)) return
    const now = Date.now()
    const key = `${type}-${data.message.substring(0, 50)}`
    const last = errorThrottle.get(key)
    if (last !== undefined && now - last < ERROR_REPORTING_CONFIG.throttleWindow) return
    const recent = Array.from(errorThrottle.values()).filter(time => now - time < ERROR_REPORTING_CONFIG.throttleWindow)
    if (recent.length >= ERROR_REPORTING_CONFIG.maxErrorsPerWindow) return
    errorThrottle.set(key, now)
    errorThrottle.forEach((time, oldKey) => {
      if (now - time > ERROR_REPORTING_CONFIG.throttleWindow * 2) errorThrottle.delete(oldKey)
    })
    await transport.call(window, `${API_BASE_URL}/debug/${type === 'console' ? 'console-errors' : 'network-errors'}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data)
    })
  } catch { /* Telemetry must never change application behavior or recursively log itself. */ }
}

export const useConsoleErrorReporter = (enabled = true) => {
  useEffect(() => {
    if (typeof window === 'undefined' || !enabled || !ERROR_REPORTING_CONFIG.enabled) return
    const originalFetch = window.fetch
    const originalError = console.error
    const originalWarn = console.warn

    const capture = (level: ConsoleError['level'], message: string, extra: Partial<ConsoleError> = {}) => {
      try {
        void sendErrorToBackend('console', {
          level, message: message.slice(0, 4000), url: reportUrl(window.location.href),
          timestamp: Date.now(), userAgent: navigator.userAgent, ...extra
        }, originalFetch)
      } catch { /* Keep native logging usable even for unusual browser values. */ }
    }
    const handleError = (event: ErrorEvent) => {
      try {
        capture('error', safeText(event.message, 'Uncaught error'), {
          url: reportUrl(event.filename || window.location.href), line: event.lineno, column: event.colno,
          error: event.error?.stack ? safeText(event.error.stack).slice(0, 4000) : undefined
        })
      } catch { /* A browser error event can contain arbitrary values. */ }
    }
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      try { capture('error', `Unhandled Promise Rejection: ${consoleArgument(event.reason)}`) }
      catch { /* Preserve the browser's original rejection handling. */ }
    }
    const wrappedError: typeof console.error = (...args) => {
      const result = originalError.apply(console, args)
      try { capture('error', args.map(consoleArgument).join(' ') || 'Console error') } catch { /* Preserve console. */ }
      return result
    }
    const wrappedWarn: typeof console.warn = (...args) => {
      const result = originalWarn.apply(console, args)
      try { capture('warn', args.map(consoleArgument).join(' ') || 'Console warning') } catch { /* Preserve console. */ }
      return result
    }
    const reportNetwork = (args: Parameters<typeof fetch>, status: number, statusText: string) => {
      try {
        if (status === 401 || status === 404) return
        void sendErrorToBackend('network', {
          ...requestMetadata(args), status, statusText,
          message: status ? `HTTP ${status}${statusText ? ` ${statusText}` : ''}` : 'Fetch failed', timestamp: Date.now()
        }, originalFetch)
      } catch { /* Metadata extraction must not replace a response or rejection. */ }
    }
    const wrappedFetch: typeof fetch = async (...args: Parameters<typeof fetch>) => {
      let response: Response
      try { response = await originalFetch.apply(window, args) }
      catch (error) {
        reportNetwork(args, 0, 'Fetch failed')
        throw error
      }
      try { if (!response.ok) reportNetwork(args, response.status, safeText(response.statusText, '')) }
      catch { /* Always return the exact response from the original transport. */ }
      return response
    }

    console.error = wrappedError
    console.warn = wrappedWarn
    if (typeof originalFetch === 'function') window.fetch = wrappedFetch
    window.addEventListener('error', handleError)
    window.addEventListener('unhandledrejection', handleUnhandledRejection)
    return () => {
      window.removeEventListener('error', handleError)
      window.removeEventListener('unhandledrejection', handleUnhandledRejection)
      if (console.error === wrappedError) console.error = originalError
      if (console.warn === wrappedWarn) console.warn = originalWarn
      if (window.fetch === wrappedFetch) window.fetch = originalFetch
    }
  }, [enabled])
}

export default useConsoleErrorReporter
