'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api/client'
import { useAuthStore } from '@/stores/authStore'

const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
type Proposal = { _id: string; note: string; accepted: boolean; event: { _id: string; title: string; date: string; city?: string; price?: { amount: number; currency: string } } }
type Condition = { maxBudget?: number; currency?: string; dayOfWeek?: number; zone?: string }
type Bucket = { value: string; count: number }

export function IdeaRealization({ ideaId, identity }: { ideaId: string; identity: string }) {
  const auth = useAuthStore()
  const qc = useQueryClient()
  const lock = useRef(false)
  const mounted = useRef(true)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [budget, setBudget] = useState('')
  const [currency, setCurrency] = useState('DOP')
  const [day, setDay] = useState('')
  const [zone, setZone] = useState('')
  const [eventId, setEventId] = useState('')
  const [note, setNote] = useState('')
  const [accept, setAccept] = useState<string | null>(null)
  useEffect(() => { mounted.current = true; return () => { mounted.current = false } }, [])
  const ownerMatches = (token: string | null) => {
    const current = useAuthStore.getState()
    return mounted.current && current.token === token && (current.isAuthenticated ? (current.user?.id || current.user?._id) : 'guest') === identity
  }
  const query = useQuery({ queryKey: ['idea-realization', identity, ideaId], queryFn: async () => {
    const token = useAuthStore.getState().token
    const [conditions, proposals] = await Promise.all([apiClient.get(`/ideas/${ideaId}/conditions`), apiClient.get(`/ideas/${ideaId}/proposals`)])
    if (!ownerMatches(token)) throw new Error('La sesión cambió')
    return { conditions: conditions.data.data as { own: Condition | null; summary: { ready: boolean; days?: Bucket[]; zones?: Bucket[]; budgets?: Bucket[] } }, proposals: proposals.data.data as { proposals: Proposal[]; canAccept: boolean } }
  } })
  useEffect(() => {
    const own = query.data?.conditions.own
    if (!own) { setBudget(''); setCurrency('DOP'); setDay(''); setZone(''); return }
    setBudget(own.maxBudget === undefined ? '' : String(own.maxBudget)); setCurrency(own.currency || 'DOP'); setDay(own.dayOfWeek === undefined ? '' : String(own.dayOfWeek)); setZone(own.zone || '')
  }, [query.data?.conditions.own])
  const events = useQuery({ queryKey: ['idea-proposal-events', identity], enabled: auth.isAuthenticated && identity !== 'guest', queryFn: async () => {
    const token = useAuthStore.getState().token
    const result = await apiClient.get('/events', { params: { createdBy: identity, timeFilter: 'upcoming', limit: 100 } })
    if (!ownerMatches(token)) throw new Error('La sesión cambió')
    const list = result.data.data?.events || result.data.events || result.data.data || []
    return (Array.isArray(list) ? list : []).filter((event: any) => (event.createdBy?._id || event.createdBy?.id || event.createdBy) === identity && event.status === 'published' && !event.isPrivate && !event.sourceIdeaId && new Date(event.endDate || event.date).getTime() > Date.now()) as { _id: string; title: string }[]
  } })
  async function mutate(path: string, body: unknown, method: 'post' | 'put' = 'post') {
    if (lock.current || !auth.isAuthenticated) return
    lock.current = true; setBusy(true); setMessage('')
    const token = useAuthStore.getState().token
    try {
      const result = await apiClient[method](`/ideas/${ideaId}/${path}`, body)
      if (!result.data.success) throw new Error('No se pudo guardar')
      if (!ownerMatches(token)) return
      setMessage(path.includes('/accept') ? 'Propuesta aceptada. Cada persona decide si confirma su asistencia.' : 'Guardado correctamente.')
      setAccept(null)
      await Promise.all([qc.invalidateQueries({ queryKey: ['idea-realization', identity, ideaId] }), qc.invalidateQueries({ queryKey: ['ideas'] })])
    } catch (error: any) { if (ownerMatches(token)) setMessage(error?.response?.data?.message || 'No se pudo guardar. Puedes reintentar.') }
    finally { lock.current = false; if (ownerMatches(token)) setBusy(false) }
  }
  const field = 'mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm'
  if (query.isLoading) return <p role="status" className="p-4 text-sm">Cargando condiciones y propuestas…</p>
  if (query.isError) return <p role="alert" className="p-4">No se pudo cargar. <button onClick={() => query.refetch()} className="underline">Reintentar</button></p>
  const summary = query.data?.conditions.summary
  return <section aria-label="Hacer realidad esta idea" className="mt-4 space-y-6 border-t border-border pt-4">
    <div><h3 className="font-semibold">Yo voy si…</h3><p className="mt-1 text-xs text-muted-foreground">Tus respuestas son privadas. Publicamos grupos de al menos 5 respuestas coincidentes. Esto no confirma asistencia.</p>
      {summary?.ready ? <div className="mt-3 space-y-1 text-sm">{[...(summary.budgets || []).map(b => ({ ...b, label: b.value })), ...(summary.days || []).map(b => ({ ...b, label: days[Number(b.value)] })), ...(summary.zones || []).map(b => ({ ...b, label: b.value }))].map(b => <p key={b.label}>{b.label}: {b.count} respuestas</p>)}<p className="text-xs text-muted-foreground">Las preferencias con menos de 5 coincidencias no se muestran.</p></div> : <p className="mt-3 text-sm text-muted-foreground">Todavía no hay suficientes respuestas para publicar tendencias.</p>}
      {auth.isAuthenticated ? <form className="mt-3 grid gap-3 sm:grid-cols-2" onSubmit={e => { e.preventDefault(); void mutate('conditions', { ...(budget !== '' ? { maxBudget: Number(budget), currency } : {}), ...(day !== '' ? { dayOfWeek: Number(day) } : {}), ...(zone.trim() ? { zone: zone.trim() } : {}) }, 'put') }}>
        <label className="text-xs">Presupuesto máximo opcional<input type="number" min="0" max="1000000" step="0.01" value={budget} onChange={e => setBudget(e.target.value)} className={field} /></label>
        <label className="text-xs">Moneda<select value={currency} onChange={e => setCurrency(e.target.value)} className={field}>{['DOP', 'USD', 'EUR'].map(c => <option key={c}>{c}</option>)}</select></label>
        <label className="text-xs">Día preferido<select value={day} onChange={e => setDay(e.target.value)} className={field}><option value="">Sin preferencia</option>{days.map((name, i) => <option value={i} key={name}>{name}</option>)}</select></label>
        <label className="text-xs">Zona preferida (sin dirección personal)<input maxLength={80} value={zone} onChange={e => setZone(e.target.value)} className={field} /></label>
        <button disabled={busy} className="rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50">Guardar condiciones</button>
        {query.data?.conditions.own && <button type="button" disabled={busy} onClick={() => void mutate('conditions', { remove: true }, 'put')} className="text-sm underline disabled:opacity-50">Eliminar mis respuestas</button>}
      </form> : <Link className="mt-3 inline-block text-sm font-semibold text-primary" href="/login?redirect=%2Fideas">Entrar para indicar mis condiciones</Link>}
    </div>
    <div><h3 className="font-semibold">Propuestas para realizarla</h3><p className="mt-1 text-xs text-muted-foreground">Eventos públicos publicados por sus propios organizadores. El autor de la idea elige una propuesta.</p>
      <ul className="mt-3 space-y-3">{query.data?.proposals.proposals.map(p => <li key={p._id} className="rounded-xl border border-border p-3 text-sm"><Link href={`/events/${p.event._id}`} className="font-semibold text-primary">{p.event.title}</Link><p>{new Date(p.event.date).toLocaleDateString('es-DO', { timeZone: 'America/Santo_Domingo' })}{p.event.city ? ` · ${p.event.city}` : ''}</p><p>{p.event.price?.amount === 0 ? 'Gratis' : p.event.price ? `${p.event.price.currency} ${p.event.price.amount}` : 'Consultar precio'}</p>{p.note && <p className="mt-1">{p.note}</p>}{p.accepted ? <p className="mt-2 font-semibold">Propuesta aceptada</p> : query.data?.proposals.canAccept && <button disabled={busy} onClick={() => setAccept(p._id)} className="mt-2 underline">Elegir esta propuesta</button>}{accept === p._id && <div className="mt-2 rounded-lg bg-muted p-3"><p>¿Vincular este evento a la idea? Avisaremos a quienes la apoyaron. Nadie quedará inscrito automáticamente.</p><button disabled={busy} onClick={() => void mutate(`proposals/${p._id}/accept`, {})} className="mr-4 mt-2 font-semibold text-primary">Aceptar y vincular</button><button disabled={busy} onClick={() => setAccept(null)}>Cancelar</button></div>}</li>)}</ul>
      {!query.data?.proposals.proposals.length && <p className="mt-3 text-sm text-muted-foreground">Todavía no hay propuestas vigentes.</p>}
      {auth.isAuthenticated && <form className="mt-4 space-y-3" onSubmit={e => { e.preventDefault(); if (eventId) void mutate('proposals', { eventId, note: note.trim() }) }}><label className="block text-xs">Proponer mi evento<select required value={eventId} onChange={e => setEventId(e.target.value)} className={field}><option value="">Elige un evento propio</option>{events.data?.map(event => <option key={event._id} value={event._id}>{event.title}</option>)}</select></label>{events.isError && <p role="alert" className="text-sm">No se cargaron tus eventos. <button type="button" onClick={() => events.refetch()} className="underline">Reintentar</button></p>}<label className="block text-xs">Mensaje opcional<textarea maxLength={300} value={note} onChange={e => setNote(e.target.value)} className={field} /></label><button disabled={busy || !eventId} className="rounded-lg border border-border px-3 py-2 text-sm font-semibold disabled:opacity-50">Enviar propuesta</button><Link href="/events/create" className="ml-3 text-sm text-primary">Crear un evento</Link></form>}
    </div>
    {message && <p role="status" className="rounded-xl bg-muted p-3 text-sm">{message}</p>}
  </section>
}
