import type { Metadata, ResolvingMetadata } from 'next'

interface EventLayoutProps {
  children: React.ReactNode
  params: Promise<{ id: string }>
}

export async function generateMetadata(
  props: { params: Promise<{ id: string }> },
  parent: ResolvingMetadata
): Promise<Metadata> {
  const { id } = await props.params
  const apiUrl = process.env.INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  try {
    const res = await fetch(`${apiUrl}/events/${id}`, {
      next: { revalidate: 60 },
    })

    if (!res.ok) {
      return {
        title: 'Evento en EventNow',
        description: 'Descubre este coro y únete en EventNow República Dominicana.',
      }
    }

    const json = await res.json()
    const event = json.event || json.data

    if (!event) {
      return {
        title: 'Evento en EventNow',
        description: 'Descubre este coro y únete en EventNow República Dominicana.',
      }
    }

    const title = `${event.title} | EventNow RD`
    const attendeeCount = event.attendeesCount || (Array.isArray(event.attendees) ? event.attendees.length : 0)
    const dateFormatted = event.date
      ? new Date(event.date).toLocaleDateString('es-DO', {
          weekday: 'short',
          day: 'numeric',
          month: 'short',
          hour: '2-digit',
          minute: '2-digit',
        })
      : 'Próximamente'

    const locationText = typeof event.location === 'object' && event.location !== null
      ? event.location.address || event.location.city || 'Santo Domingo, RD'
      : event.location || 'República Dominicana'

    const priceText = typeof event.price === 'object' && event.price !== null
      ? (event.price.amount === 0 ? 'Entrada Libre' : `RD$ ${event.price.amount}`)
      : typeof event.price === 'number' && event.price === 0 ? 'Entrada Libre' : 'Entrada Oficial'

    const coroText = attendeeCount > 0 ? `🔥 ¡${attendeeCount} panas confirmados!` : '🚀 ¡Sé el primero en armar el coro!'
    const description = `${coroText} · 📅 ${dateFormatted} · 📍 ${locationText} · 🎟️ ${priceText}. Entra a EventNow y confirma tu asistencia.`

    const imageUrl = Array.isArray(event.images) && event.images.length > 0
      ? (typeof event.images[0] === 'string' ? event.images[0] : event.images[0]?.url)
      : event.image || `${appUrl}/og-image.png`

    return {
      title,
      description,
      openGraph: {
        title: `🔥 ${event.title} — ¿Quién va pal coro?`,
        description,
        url: `${appUrl}/events/${id}`,
        siteName: 'EventNow República Dominicana',
        images: [
          {
            url: imageUrl,
            width: 1200,
            height: 630,
            alt: event.title,
          },
        ],
        type: 'website',
        locale: 'es_DO',
      },
      twitter: {
        card: 'summary_large_image',
        title: `🔥 ${event.title} | EventNow`,
        description,
        images: [imageUrl],
      },
    }
  } catch {
    return {
      title: 'Evento en EventNow RD',
      description: 'Descubre los mejores coros, vida nocturna y eventos de República Dominicana.',
    }
  }
}

export default function EventDetailLayout({ children }: EventLayoutProps) {
  return <>{children}</>
}
