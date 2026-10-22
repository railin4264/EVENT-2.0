'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { Globe2, MapPin, Navigation, Search, Loader2, X } from 'lucide-react'
import { apiClient } from '@/lib/api/client'
import { WORLD_AREA, validArea, type DiscoveryArea } from '@/lib/discovery-area'
import { useDiscoveryArea } from '@/stores/discoveryAreaStore'

type Destination = DiscoveryArea & { eventsCount?: number }

export function LocationPicker() {
  const { area, setArea } = useDiscoveryArea()
  const inputId = useId()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Destination[] | null>(null)
  const [busy, setBusy] = useState<'search' | 'gps' | null>(null)
  const [error, setError] = useState('')
  const request = useRef(0)
  const controller = useRef<AbortController | null>(null)
  useEffect(() => () => { request.current++; controller.current?.abort() }, [])

  const choose = (value: DiscoveryArea) => {
    request.current++
    controller.current?.abort()
    setArea(value)
    setQuery('')
    setResults(null)
    setError('')
    setBusy(null)
  }

  const search = async (event: React.FormEvent) => {
    event.preventDefault()
    const text = query.trim()
    if (text.length === 1) { setError('Escribe al menos dos letras, por ejemplo Madrid o México.'); return }
    controller.current?.abort()
    const abort = new AbortController()
    controller.current = abort
    const id = ++request.current
    setBusy('search'); setError(''); setResults(null)
    try {
      const res = await apiClient.get('/events/destinations', { params: { q: text }, signal: abort.signal })
      if (id !== request.current) return
      const destinations = (Array.isArray(res.data?.data) ? res.data.data : []).flatMap((item: Destination) => {
        const destination = validArea(item)
        return destination && destination.kind !== 'world' ? [{ ...destination, eventsCount: Number(item.eventsCount) || 0 }] : []
      })
      setResults(destinations)
    } catch {
      if (id === request.current && !abort.signal.aborted) setError('No pudimos cargar los destinos. Inténtalo otra vez o explora Mundial.')
    } finally { if (id === request.current) setBusy(null) }
  }

  const locate = () => {
    if (!navigator.geolocation) { setError('Este navegador no ofrece ubicación. Puedes elegir una ciudad o país.'); return }
    const id = ++request.current
    controller.current?.abort()
    setBusy('gps'); setError(''); setResults(null)
    navigator.geolocation.getCurrentPosition(position => {
      if (id !== request.current) return
      const { latitude: lat, longitude: lng } = position.coords
      if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
        setError('La ubicación recibida no es válida. Elige una ciudad.'); setBusy(null); return
      }
      choose({ kind: 'nearby', label: 'Cerca de ti · 50 km', lat, lng, radius: 50, source: 'gps' })
    }, () => {
      if (id === request.current) { setBusy(null); setError('No pudimos acceder a tu ubicación. Puedes buscar una ciudad o seguir en Mundial.') }
    }, { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 })
  }

  return <section aria-label="Ubicación de los eventos" className="min-w-0 rounded-2xl border border-border bg-card p-4">
    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
      <div className="flex min-w-0 items-center gap-2 text-sm font-semibold"><MapPin className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" /><span>{area.label}</span></div>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => choose(WORLD_AREA)} aria-pressed={area.kind === 'world'} className={`inline-flex min-h-11 items-center gap-1.5 rounded-lg border px-3 text-xs font-medium ${area.kind === 'world' ? 'border-primary/30 bg-primary/10 text-primary' : 'border-border hover:bg-muted'}`}><Globe2 className="h-4 w-4" aria-hidden="true" />Mundial</button>
        <button type="button" onClick={locate} disabled={busy === 'gps'} aria-pressed={area.kind === 'nearby'} className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-border px-3 text-xs font-medium hover:bg-muted disabled:opacity-50">{busy === 'gps' ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Navigation className="h-4 w-4" aria-hidden="true" />}{busy === 'gps' ? 'Localizando…' : 'Usar mi ubicación'}</button>
      </div>
    </div>
    <form onSubmit={search} className="flex gap-2">
      <div className="min-w-0 flex-1"><label htmlFor={inputId} className="mb-1.5 block text-xs font-medium text-muted-foreground">Elige ciudad o país</label><input id={inputId} type="search" maxLength={80} value={query} onChange={event => { request.current++; controller.current?.abort(); setBusy(null); setQuery(event.target.value); setResults(null); setError('') }} placeholder="Madrid, México, Santiago…" className="min-h-11 w-full rounded-xl border border-border bg-background px-3 text-base outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" /></div>
      <button type="submit" disabled={busy === 'search'} className="mt-6 inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl bg-primary px-4 text-sm font-medium text-primary-foreground disabled:opacity-50">{busy === 'search' ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Search className="h-4 w-4" aria-hidden="true" />}Buscar</button>
    </form>
    <p className="mt-2 text-xs leading-relaxed text-muted-foreground">Destinos con eventos publicados. El GPS se solicita solo cuando lo eliges; puedes cambiar de zona en cualquier momento.</p>
    {error && <p role="alert" className="mt-3 text-sm text-destructive">{error}</p>}
    {results && <div className="mt-3 rounded-xl border border-border" aria-live="polite">
      <div className="flex items-center justify-between border-b border-border px-3 py-2"><p className="text-xs font-medium">{results.length ? 'Selecciona un destino' : 'Sin destinos para esta búsqueda'}</p><button type="button" onClick={() => setResults(null)} aria-label="Cerrar destinos" className="grid h-9 w-9 place-items-center rounded-lg hover:bg-muted"><X className="h-4 w-4" /></button></div>
      {results.length ? <ul className="max-h-64 overflow-y-auto">{results.map((destination, index) => <li key={`${destination.kind}-${destination.label}-${index}`}><button type="button" onClick={() => choose(destination)} className="flex min-h-14 w-full items-center justify-between gap-3 px-3 py-2 text-left hover:bg-muted focus-visible:bg-muted"><span className="text-sm font-medium">{destination.label}<span className="ml-2 text-xs font-normal text-muted-foreground">{destination.kind === 'country' ? 'País' : 'Ciudad'}</span></span><span className="shrink-0 text-xs text-muted-foreground">{destination.eventsCount} eventos</span></button></li>)}</ul> : <p className="p-3 text-sm text-muted-foreground">Prueba otro nombre o explora Mundial. Aparecerán nuevos destinos cuando se publiquen eventos allí.</p>}
    </div>}
  </section>
}
