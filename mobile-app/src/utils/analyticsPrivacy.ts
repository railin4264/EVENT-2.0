const privateKey = /password|secret|token|authorization|cookie|email|phone|firstName|lastName|address|coordinates|latitude|longitude|message|body|^name$|^location$/i
function pathOnly(value: string): string {
  try { return new URL(value, 'https://redacted.invalid').pathname.replace(/\/[a-f0-9]{32,}/gi, '/[private]').slice(0, 300) } catch { return '' }
}
export function analyticsProperties(input: Record<string, unknown>, depth = 0): Record<string, unknown> {
  if (!input || typeof input !== 'object' || Array.isArray(input) || depth > 2) return {}
  const result: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(input).slice(0, 30)) {
    if (!/^[a-zA-Z][a-zA-Z0-9_]{0,59}$/.test(key) || privateKey.test(key)) continue
    if (/url|referrer|pathname/i.test(key)) result[key] = pathOnly(String(value))
    else if (typeof value === 'string') result[key] = value.replace(/[\w.+-]+@[\w.-]+\.[a-z]{2,}/gi, '[private]').replace(/Bearer\s+[^\s]+/gi, '[private]').replace(/https?:\/\/[^\s)]+/gi, url => pathOnly(url)).slice(0, 300)
    else if (typeof value === 'boolean' || (typeof value === 'number' && Number.isFinite(value))) result[key] = value
    else if (Array.isArray(value)) result[key] = value.slice(0, 20).filter(item => typeof item === 'number' || typeof item === 'boolean')
    else if (value && typeof value === 'object') result[key] = analyticsProperties(value as Record<string, unknown>, depth + 1)
  }
  return result
}
export function analyticsEventId(): string {
  return typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : `event_${Date.now()}_${Math.random().toString(36).slice(2)}`
}
