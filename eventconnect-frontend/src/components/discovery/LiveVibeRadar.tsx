"use client"

import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { MapPin, Radio, RefreshCw, ArrowUpRight, MessageCircle } from 'lucide-react'
import { apiClient } from '@/lib/api/client'
import { Button } from '@/components/redesign/ui/button'
import type { DiscoveryArea } from '@/lib/discovery-area'
import { areaParams, WORLD_AREA } from '@/lib/discovery-area'

type Vibe = 'lit' | 'chill' | 'packed' | 'winding_down' | 'none'
interface RadarEvent {
  _id: string; title: string; date: string; endDate: string
  location?: { venue?: string; address?: string; city?: string; country?: string }
  vibeRadar: { currentVibe: Vibe; reportsCount: number; lastReportedAt: string | null }
}
const labels: Record<Vibe, string> = {
  lit: 'Buen ambiente', chill: 'Tranquilo', packed: 'Muy concurrido',
  winding_down: 'Bajando el ritmo', none: 'Sin reportes recientes'
}

export function LiveVibeRadar({ area = WORLD_AREA, identity = 'guest' }: { area?: DiscoveryArea; identity?: string }) {
  const [filter, setFilter] = useState<Vibe | 'all'>('all')
  const scope = areaParams(area)
  const { data, isLoading, isError, refetch, isFetching } = useQuery<{ success: boolean; data: RadarEvent[] }>({
    queryKey: ['live-vibe-radar', identity, scope],
    queryFn: async () => {
      const response = await apiClient.get('/events/radar/live', { params: scope })
      if (!response.data?.success || !Array.isArray(response.data.data)) throw new Error('Radar no disponible')
      return response.data
    }, refetchInterval: 30000
  })
  const events = data?.data || []
  const visible = filter === 'all' ? events : events.filter(event => event.vibeRadar.currentVibe === filter)
  return (
    <section className="rounded-3xl border border-border bg-card p-5 sm:p-8" aria-label="Radar de eventos en curso">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-2xl">
          <p className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary"><Radio className="h-4 w-4" /> En curso · {area.label}</p>
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">El ambiente lo cuentan quienes van.</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">Eventos con inicio y cierre confirmados. Cada persona aporta un reporte que caduca a las 2 horas; no es una medición de aforo.</p>
        </div>
        <Button variant="outline" size="sm" disabled={isFetching} onClick={() => refetch()} className="gap-2"><RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} /> Actualizar</Button>
      </div>
      <div className="my-5 flex gap-2 overflow-x-auto pb-2" aria-label="Filtrar ambiente">
        {(['all', ...Object.keys(labels)] as Array<Vibe | 'all'>).map(key => (
          <button key={key} aria-pressed={filter === key} onClick={() => setFilter(key)} className={`shrink-0 rounded-full border px-3 py-2 text-xs font-medium transition-colors ${filter === key ? 'border-primary bg-primary text-primary-foreground' : 'border-border text-muted-foreground hover:text-foreground'}`}>
            {key === 'all' ? 'Todos' : labels[key]} ({key === 'all' ? events.length : events.filter(event => event.vibeRadar.currentVibe === key).length})
          </button>
        ))}
      </div>
      {isLoading ? <p role="status" className="py-8 text-sm text-muted-foreground">Consultando eventos en curso…</p>
        : isError ? <div role="alert" className="rounded-2xl border border-border p-6"><p>No pudimos consultar el radar.</p><button className="mt-2 text-sm text-primary underline" onClick={() => refetch()}>Reintentar</button></div>
        : !visible.length ? <div className="rounded-2xl border border-dashed border-border bg-muted/30 p-7 text-center"><Radio className="mx-auto mb-3 h-6 w-6 text-muted-foreground" /><p className="font-medium">Sin eventos en curso con este filtro</p><p className="mt-2 text-sm text-muted-foreground">Los planes futuros siguen disponibles en Explorar. Cuando haya sesiones en curso aparecerán aquí.</p><Link className="mt-4 inline-flex text-sm font-semibold text-primary" href="/events">Explorar próximos eventos →</Link></div>
        : <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{visible.map(event => (
          <article key={event._id} className="flex flex-col rounded-2xl border border-border p-5">
            <span className="mb-4 self-start rounded-full bg-muted px-3 py-1 text-xs font-medium">{labels[event.vibeRadar.currentVibe] || labels.none}</span>
            <Link href={`/events/${event._id}`} className="font-semibold leading-snug hover:text-primary">{event.title}</Link>
            <p className="mt-3 flex items-start gap-2 text-xs leading-relaxed text-muted-foreground"><MapPin className="h-4 w-4 shrink-0" />{[event.location?.venue || event.location?.address, event.location?.city, event.location?.country].filter(Boolean).join(' · ') || 'Ubicación no indicada'}</p>
            <p className="mt-4 flex items-center gap-2 text-xs text-muted-foreground"><MessageCircle className="h-4 w-4" />{event.vibeRadar.reportsCount} reportes recientes</p>
            {event.vibeRadar.lastReportedAt && <p className="mt-1 text-xs text-muted-foreground">Último: {new Date(event.vibeRadar.lastReportedAt).toLocaleString('es', { dateStyle: 'short', timeStyle: 'short' })}</p>}
            <Link href={`/events/${event._id}`} className="mt-5 flex items-center justify-between border-t border-border pt-4 text-sm font-semibold text-primary">Ver evento y reportar <ArrowUpRight className="h-4 w-4" /></Link>
          </article>
        ))}</div>}
    </section>
  )
}
