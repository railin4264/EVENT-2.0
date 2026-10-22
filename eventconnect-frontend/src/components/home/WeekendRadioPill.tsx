'use client'
import React, { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { Headphones, Play, Square, ChevronDown } from 'lucide-react'
type Plan = { _id: string; title: string; date: string | Date; timeZone?: string; status?: string; isPrivate?: boolean; location?: { city?: string; venue?: string; address?: string } }
export function WeekendRadioPill({ events = [] }: { events?: Plan[] }) {
  const plans = useMemo(() => events.filter(event => event.status === 'published' && !event.isPrivate && Number.isFinite(new Date(event.date).getTime()) && new Date(event.date).getTime() >= Date.now() && new Date(event.date).getTime() < Date.now() + 7 * 86400000).sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime()).slice(0,3), [events])
  const [playing, setPlaying] = useState(false)
  const [available, setAvailable] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [error, setError] = useState('')
  const utterance = useRef<SpeechSynthesisUtterance | null>(null)
  const dateLabel = (event: Plan) => { try { return new Intl.DateTimeFormat('es', { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', timeZone: event.timeZone || undefined }).format(new Date(event.date)) } catch { return new Date(event.date).toLocaleString('es') } }
  useEffect(() => {
    setAvailable('speechSynthesis' in window && 'SpeechSynthesisUtterance' in window)
    return () => { if (utterance.current) window.speechSynthesis?.cancel() }
  }, [])
  useEffect(() => { if (utterance.current) { window.speechSynthesis?.cancel(); utterance.current = null; setPlaying(false) } }, [plans])
  if (!plans.length) return null
  const toggle = () => {
    if (playing || utterance.current) { window.speechSynthesis.cancel(); utterance.current = null; setPlaying(false); return }
    if (!available) return
    setError('')
    const text = 'Tu agenda de EventNow. ' + plans.map(event => `${event.title}. ${dateLabel(event)}. ${event.location?.venue || event.location?.city || ''}.`).join(' ')
    const speech = new SpeechSynthesisUtterance(text); speech.lang = 'es'; speech.rate = 1
    speech.onstart = () => setPlaying(true)
    speech.onend = () => { utterance.current = null; setPlaying(false) }
    speech.onerror = () => { utterance.current = null; setPlaying(false); setError('El audio no está disponible. Puedes consultar los eventos abajo.'); setExpanded(true) }
    utterance.current = speech; window.speechSynthesis.speak(speech)
  }
  return <section aria-label="Agenda en voz alta" className="rounded-2xl border border-border bg-card p-4 sm:p-5"><div className="flex flex-wrap items-center gap-4"><button type="button" aria-label={playing ? 'Detener lectura de agenda' : 'Escuchar agenda'} onClick={toggle} disabled={!available} title={available ? undefined : 'Tu navegador no permite leer la agenda en voz alta'} className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground disabled:opacity-40">{playing ? <Square size={18} /> : <Play size={20} />}</button><div className="flex-1"><p className="flex items-center gap-2 text-xs font-medium text-muted-foreground"><Headphones size={14} /> Tu agenda en voz alta</p><h3 className="mt-1 text-base font-semibold">{plans.length} {plans.length === 1 ? 'plan publicado' : 'planes publicados'} para los próximos 7 días</h3><p className="mt-1 text-xs text-muted-foreground">Lectura de los eventos de tu destino seleccionado. Consulta los detalles antes de salir.</p></div><button type="button" aria-expanded={expanded} onClick={() => setExpanded(value => !value)} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-border px-3 text-sm">{expanded ? 'Ocultar agenda' : 'Ver agenda'}<ChevronDown size={15} /></button></div>{error && <p role="status" className="mt-3 text-sm text-muted-foreground">{error}</p>}{expanded && <ul className="mt-4 grid gap-3 border-t border-border pt-4 sm:grid-cols-3">{plans.map(event => <li key={event._id}><Link href={`/events/${event._id}`} className="block rounded-xl border border-border p-3 hover:bg-muted"><p className="text-xs text-muted-foreground">{dateLabel(event)}</p><h4 className="mt-2 font-medium">{event.title}</h4><p className="mt-2 text-xs text-muted-foreground">{event.location?.venue || event.location?.city}</p></Link></li>)}</ul>}</section>
}
