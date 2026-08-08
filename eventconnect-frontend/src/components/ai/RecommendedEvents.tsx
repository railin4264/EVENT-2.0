'use client'

import { useEffect, useState } from 'react'
import { Sparkles, Loader2 } from 'lucide-react'
import { aiService, AIEventRecommendation } from '@/lib/api/ai'
import { EventCard } from '@/components/common/EventCard'

export default function RecommendedEvents({ limit = 6 }: { limit?: number }) {
  const [events, setEvents] = useState<AIEventRecommendation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    setLoading(true)
    aiService
      .getEventRecommendations(limit)
      .then((res) => {
        if (!active) return
        const data = (res?.data as AIEventRecommendation[]) || []
        setEvents(data)
      })
      .catch((e) => {
        if (!active) return
        setError(e?.message || 'No se pudieron cargar las recomendaciones')
      })
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
  }, [limit])

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-8 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span>Cargando recomendaciones personalizadas…</span>
      </div>
    )
  }

  if (error || events.length === 0) return null

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-primary" />
        <h2 className="text-xl font-bold">Recomendado para ti</h2>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {events.map((event) => (
          <EventCard
            key={event._id}
            event={{
              _id: event._id,
              title: event.title,
              description: event.description,
              date: event.date || new Date().toISOString(),
              location: {
                address: event.location?.address || event.location?.city || '',
              },
              images: event.images,
              category: event.category || '',
              attendeesCount: event.attendeesCount,
            }}
          />
        ))}
      </div>
    </section>
  )
}
