import type { DiscoveryEvent } from '@/lib/api/discovery'

const safeUrl = (value?: string) => (value && /^(https?:\/\/|\/)/i.test(value) ? value : undefined)

export function eventImage(event: Partial<DiscoveryEvent>): string | undefined {
  return safeUrl(event.images?.[0]?.url || event.imageUrl)
}

export function formatEventDate(value: Date | string, timeZone?: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Fecha por confirmar'
  const options: Intl.DateTimeFormatOptions = { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }
  if (timeZone) {
    try { return date.toLocaleString('es-DO', { ...options, timeZone, timeZoneName: 'short' }) } catch { /* Legacy time zones use device time. */ }
  }
  return date.toLocaleString('es-DO', options)
}

export function formatPrice(event: { price?: { amount?: number; currency?: string } }): string {
  const amount = event.price?.amount || 0
  if (amount <= 0) return 'Gratis'
  try {
    return new Intl.NumberFormat('es-DO', { style: 'currency', currency: event.price?.currency || 'DOP' }).format(amount)
  } catch {
    return `${amount} ${event.price?.currency || ''}`.trim()
  }
}

/** Etiqueta corta de cómo se paga, según el modo (informativo si no hay pasarela). */
export function paymentHint(event: Partial<DiscoveryEvent>, paymentsEnabled: boolean): string | null {
  const amount = event.price?.amount || 0
  if (amount <= 0) return null
  if (paymentsEnabled && event.paymentMode !== 'onsite' && event.paymentMode !== 'external') return 'Compra en la app'
  if (event.paymentMode === 'external' || event.ticketUrl) return 'Entradas en enlace del organizador'
  return 'Pago directo con el organizador'
}

export function locationLabel(event: Partial<DiscoveryEvent>): string {
  if (event.isSecretLocation) return 'Ubicación secreta · se revela al confirmar'
  return event.location?.venue || event.location?.address || 'Ubicación por confirmar'
}
