import type { Metadata } from 'next'
import { eventImage, eventStructuredData, serializeStructuredData } from '@/lib/event-structured-data'

interface EventLayoutProps {
  children: React.ReactNode
  params: Promise<{ id: string }>
}

const apiUrl = process.env.INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'
const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

// Metadata and structured data share one cached request per event.
async function loadEvent(id: string) {
  if (!/^[a-f\d]{24}$/i.test(id)) return null
  try {
    const res = await fetch(`${apiUrl}/events/${id}`, { next: { revalidate: 60 } })
    if (!res.ok) return null
    const json = await res.json()
    return json.event || json.data || null
  } catch {
    return null
  }
}

function priceLabel(event: { price?: { amount?: number; currency?: string } | number; paymentMode?: string }) {
  const amount = typeof event.price === 'object' && event.price !== null ? event.price.amount : event.price
  const currency = typeof event.price === 'object' && event.price !== null ? event.price.currency : undefined
  if (amount === 0 && event.paymentMode !== 'external') return 'Entrada libre'
  if (typeof amount === 'number' && amount > 0 && currency) {
    try { return new Intl.NumberFormat('es', { style: 'currency', currency }).format(amount) } catch { return `${amount} ${currency}` }
  }
  return 'Consulta precios'
}

export async function generateMetadata(props: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await props.params
  const event = await loadEvent(id)
  if (!event) return { title: 'Evento en EventNow', description: 'Descubre planes y eventos cerca de ti en EventNow.' }

  const zone = event.timeZone
  const when = event.date ? new Date(event.date).toLocaleString('es', {
    weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', ...(zone ? { timeZone: zone } : {})
  }) : null
  const place = event.isVirtual ? 'En línea'
    : event.isSecretLocation ? 'Ubicación al confirmar asistencia'
      : typeof event.location === 'object' && event.location ? [event.location.venue, event.location.city].filter(Boolean).join(', ') || event.location.address : null
  const description = [when && `📅 ${when}`, place && `📍 ${place}`, `🎟️ ${priceLabel(event)}`].filter(Boolean).join(' · ') +
    '. Confirma tu asistencia en EventNow.'
  const image = eventImage(event) || `${appUrl}/og-image.png`
  const url = `${appUrl}/events/${id}`

  return {
    title: `${event.title} | EventNow`,
    description,
    alternates: { canonical: url },
    openGraph: { title: event.title, description, url, siteName: 'EventNow', images: [{ url: image, width: 1200, height: 630, alt: event.title }], type: 'website' },
    twitter: { card: 'summary_large_image', title: `${event.title} | EventNow`, description, images: [image] },
  }
}

export default async function EventDetailLayout({ children, params }: EventLayoutProps) {
  const { id } = await params
  const event = await loadEvent(id)
  const structured = event ? eventStructuredData(event, `${appUrl}/events/${id}`) : null
  return (
    <>
      {structured && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeStructuredData(structured) }} />}
      {children}
    </>
  )
}
