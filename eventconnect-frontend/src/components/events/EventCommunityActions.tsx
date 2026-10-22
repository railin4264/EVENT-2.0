'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { apiClient } from '@/lib/api/client'
import { useAuthStore } from '@/stores/authStore'
import { Button } from '@/components/redesign/ui/button'
import HostReadinessTools from './HostReadinessTools'

type Offer = { userId: string; name?: string; note: string; status: 'offered' | 'accepted' | 'declined' }
type Community = { title: string; canManage: boolean; canContribute: boolean; canRepeat: boolean; canSetMeetup: boolean; canJoinMeetup: boolean; roles: { id: string; title: string; slots: number; closed: boolean; acceptedCount: number; offers: Offer[] }[]; repeat: { interestedCount: number; interested: boolean; days: string[]; dayCounts: Record<string, number> }; meetup: null | { place: string; time: string; expiresAt: string; participantCount: number; joined: boolean; names: string[] } }
const days = [['monday', 'Lunes'], ['tuesday', 'Martes'], ['wednesday', 'Miércoles'], ['thursday', 'Jueves'], ['friday', 'Viernes'], ['saturday', 'Sábado'], ['sunday', 'Domingo']]
const input = 'mt-2 min-h-12 w-full rounded-xl border border-border bg-background px-3 py-3 text-sm'
const panel = 'rounded-2xl border border-border bg-card p-5 sm:p-7'
export default function EventCommunityActions({ id, scope = 'events' }: { id: string; scope?: 'events' | 'ideas' }) {
  const { user, isAuthenticated } = useAuthStore()
  const owner = isAuthenticated ? user?.id || user?._id || '' : ''
  return <Actions key={`${owner}:${scope}:${id}`} id={id} scope={scope} owner={owner} />
}
function Actions({ id, scope, owner }: { id: string; scope: 'events' | 'ideas'; owner: string }) {
  const [data, setData] = useState<Community | null>(null), [busy, setBusy] = useState(false), [error, setError] = useState(''), [loading, setLoading] = useState(true)
  const [title, setTitle] = useState(''), [slots, setSlots] = useState('1'), [notes, setNotes] = useState<Record<string, string>>({}), [selectedDays, setSelectedDays] = useState<string[]>([])
  const [place, setPlace] = useState(''), [time, setTime] = useState(''), [publicPlace, setPublicPlace] = useState(false), [shareName, setShareName] = useState(false)
  const mounted = useRef(true), lock = useRef(false), sequence = useRef(0)
  const base = `/community-actions/${scope}/${encodeURIComponent(id)}`
  const showError = (failure: unknown) => { const e = failure as { response?: { data?: { message?: string } }; message?: string }; return e.response?.data?.message || e.message || 'No se pudo completar la acción.' }
  const accept = (response: { data: { success?: boolean; data?: Community } }) => { if (response.data?.success !== true || !response.data.data || !Array.isArray(response.data.data.roles)) throw new Error('El servidor no confirmó la operación.'); return response.data.data }
  const load = async () => {
    const request = ++sequence.current
    setLoading(true); setError('')
    try { const next = accept(await apiClient.get(base)); if (mounted.current && request === sequence.current) { setData(next); setSelectedDays(next.repeat.days) } }
    catch (failure) { if (mounted.current && request === sequence.current) setError(showError(failure)) }
    finally { if (mounted.current && request === sequence.current) setLoading(false) }
  }
  useEffect(() => { mounted.current = true; void load(); return () => { mounted.current = false; sequence.current++ } }, []) // keyed by account, target and scope
  useEffect(() => {
    const expiry = Date.parse(data?.meetup?.expiresAt || ''), meeting = Date.parse(data?.meetup?.time || '')
    if (!Number.isFinite(expiry)) return
    let timer: ReturnType<typeof setTimeout>
    const update = () => {
      clearTimeout(timer)
      const now = Date.now()
      if (now >= expiry) { setData(current => current ? { ...current, meetup: null, canJoinMeetup: false, canSetMeetup: false, canContribute: false } : current); return }
      if (now >= meeting) setData(current => current ? { ...current, canJoinMeetup: false } : current)
      timer = setTimeout(update, Math.min(2147483647, (meeting > now ? Math.min(expiry, meeting) : expiry) - now + 10))
    }
    update()
    const resume = () => { if (document.visibilityState === 'visible') update() }
    document.addEventListener('visibilitychange', resume)
    return () => { clearTimeout(timer); document.removeEventListener('visibilitychange', resume) }
  }, [data?.meetup?.expiresAt, data?.meetup?.time])
  const act = async (method: 'post' | 'put' | 'patch' | 'delete', suffix: string, body?: unknown) => {
    if (!owner || lock.current) return false
    lock.current = true; setBusy(true); setError('')
    try { const next = accept(await apiClient[method](`${base}${suffix}`, body)); if (mounted.current) { setData(next); setSelectedDays(next.repeat.days) } return true }
    catch (failure) { if (mounted.current) setError(showError(failure)); return false }
    finally { lock.current = false; if (mounted.current) setBusy(false) }
  }
  if (loading) return <p role="status" className="py-12">Cargando la comunidad…</p>
  if (!data) return <div role="alert" className={panel}><p>{error || 'No se pudo cargar esta actividad.'}</p><Button className="mt-4" onClick={() => void load()}>Reintentar</Button></div>
  return <div className="space-y-6"><header><p className="text-sm font-semibold text-primary">EL PLAN LO HACEMOS JUNTOS</p><h1 className="mt-3 text-3xl font-semibold tracking-tight">{data.title}</h1><p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">Ofrece lo que sabes hacer, coordina un encuentro o ayuda a decidir la próxima edición. Cada acción es voluntaria; no compra una entrada ni reserva una plaza del evento.</p></header>
    <HostReadinessTools actorKey={owner} targetKey={`${scope}:${id}`} title={data.title} roles={data.roles} canManage={data.canManage} canShareCall={(data as Community & { canShareCall?: boolean }).canShareCall === true} />
    {error && <p role="alert" className="rounded-xl border border-destructive/30 p-4 text-sm text-destructive">{error}</p>}
    {!owner && <div className={panel}><p>Entra para participar y gestionar tus preferencias.</p><Button asChild className="mt-3"><Link href={`/login?redirect=${encodeURIComponent(`/community/${scope}/${id}`)}`}>Iniciar sesión</Link></Button></div>}
    <section className={panel} aria-labelledby="contribute-title"><h2 id="contribute-title" className="text-xl font-semibold">Yo aporto</h2><p className="mt-2 text-sm text-muted-foreground">Necesidades concretas y colaboración acordada con el anfitrión. Tu nombre y oferta se comparten con el anfitrión; las ofertas sólo las ven su autor y quien organiza. Acordad los detalles antes de comprometeros.</p>
      {data.canManage && data.canContribute && <form className="mt-5 grid gap-3 sm:grid-cols-[1fr_100px_auto]" onSubmit={e => { e.preventDefault(); void act('post', '/roles', { title: title.trim(), slots: Number(slots) }).then(ok => { if (ok && mounted.current) { setTitle(''); setSlots('1') } }) }}><label className="text-sm">¿Qué hace falta?<input value={title} onChange={e => setTitle(e.target.value)} maxLength={100} required disabled={busy} className={input} placeholder="Alguien que enseñe fotografía" /></label><label className="text-sm">Plazas<input type="number" min={1} max={50} step={1} value={slots} onChange={e => setSlots(e.target.value)} required disabled={busy} className={input} /></label><Button type="submit" disabled={busy || !title.trim()} className="min-h-12 self-end">Añadir necesidad</Button></form>}
      {!data.roles.length && <p className="mt-5 text-sm text-muted-foreground">Todavía no hay necesidades publicadas.</p>}
      <div className="mt-5 space-y-4">{data.roles.map(role => <article key={role.id} className="rounded-xl border border-border p-4"><div className="flex flex-wrap items-center justify-between gap-3"><h3 className="font-semibold">{role.title}</h3><span className="text-xs text-muted-foreground">{role.acceptedCount}/{role.slots} colaboradores aceptados · {role.closed ? 'Cerrada' : 'Abierta'}</span></div>
        {data.canManage && data.canContribute && <Button variant="outline" className="mt-3" disabled={busy} onClick={() => void act('patch', `/roles/${role.id}`, { closed: !role.closed })}>{role.closed ? 'Reabrir convocatoria' : 'Cerrar convocatoria'}</Button>}
        {role.offers.map((offer, index) => <div key={offer.userId} className="mt-4 rounded-lg bg-muted/50 p-4"><p className="text-xs font-semibold text-primary">{offer.userId === owner ? 'Tu oferta' : offer.name || `Propuesta de colaborador ${index + 1}`} · {offer.status === 'accepted' ? 'Aceptada' : offer.status === 'declined' ? 'No aceptada' : 'Por revisar'}</p><p className="mt-2 whitespace-pre-wrap text-sm">{offer.note}</p><div className="mt-3 flex flex-wrap gap-2">{data.canManage && data.canContribute && <><Button disabled={busy || offer.status === 'accepted' || role.acceptedCount >= role.slots} onClick={() => void act('patch', `/roles/${role.id}/offers/${offer.userId}`, { status: 'accepted' })}>Aceptar aporte</Button><Button variant="outline" disabled={busy || offer.status === 'declined'} onClick={() => void act('patch', `/roles/${role.id}/offers/${offer.userId}`, { status: 'declined' })}>No aceptar</Button></>}{offer.userId === owner && <Button variant="outline" disabled={busy} onClick={() => void act('delete', `/roles/${role.id}/offer`)}>Retirar mi oferta</Button>}</div></div>)}
        {owner && !data.canManage && data.canContribute && !role.closed && !role.offers.length && <form className="mt-4" onSubmit={e => { e.preventDefault(); void act('post', `/roles/${role.id}/offer`, { note: notes[role.id] || '' }) }}><label className="text-sm" htmlFor={`note-${role.id}`}>¿Qué puedes aportar?</label><textarea id={`note-${role.id}`} className={input} rows={2} value={notes[role.id] || ''} onChange={e => setNotes({ ...notes, [role.id]: e.target.value })} maxLength={300} required disabled={busy} placeholder="Cuenta tu propuesta sin incluir datos sensibles" /><Button className="mt-3" type="submit" disabled={busy || !notes[role.id]?.trim()}>Ofrecer mi ayuda</Button></form>}
      </article>)}</div>
    </section>
    {scope === 'events' && <><section className={panel} aria-labelledby="repeat-title"><h2 id="repeat-title" className="text-xl font-semibold">¿Lo repetimos?</h2><p className="mt-2 text-sm text-muted-foreground">{data.repeat.interestedCount} asistentes piden otra edición. Después del evento pueden responder quienes tienen asistencia confirmada; las respuestas se muestran agrupadas.</p><div className="mt-4 flex flex-wrap gap-2">{days.map(([day, label]) => <span key={day} className="rounded-full bg-muted px-3 py-2 text-xs">{label}: {data.repeat.dayCounts[day] || 0}</span>)}</div>{owner && data.canRepeat ? <form className="mt-5" onSubmit={e => { e.preventDefault(); void act('put', '/repeat', { interested: true, days: selectedDays }) }}><p className="text-sm">¿Qué días te encajarían? Opcional.</p><div className="mt-3 flex flex-wrap gap-4">{days.map(([day, label]) => <label key={day} className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" checked={selectedDays.includes(day)} disabled={busy} onChange={e => setSelectedDays(e.target.checked ? [...selectedDays, day] : selectedDays.filter(value => value !== day))} />{label}</label>)}</div><div className="mt-4 flex flex-wrap gap-3"><Button type="submit" disabled={busy}>{data.repeat.interested ? 'Actualizar mis días' : 'Quiero otra edición'}</Button>{data.repeat.interested && <Button variant="outline" disabled={busy} onClick={() => void act('put', '/repeat', { interested: false, days: [] })}>Retirar interés</Button>}</div></form> : <p className="mt-4 text-xs text-muted-foreground">Pedir otra edición no crea una inscripción ni envía mensajes a otros usuarios.</p>}</section>
    <section className={panel} aria-labelledby="meetup-title"><h2 id="meetup-title" className="text-xl font-semibold">Nos encontramos aquí</h2><p className="mt-2 text-sm text-muted-foreground">Un punto público antes del evento. No se utiliza tu GPS. El encuentro deja de mostrarse al terminar el evento.</p>{data.meetup ? <div className="mt-5 rounded-xl bg-muted/50 p-4"><h3 className="font-semibold">{data.meetup.place}</h3><p className="mt-2 text-sm">{new Date(data.meetup.time).toLocaleString('es-DO', { dateStyle: 'medium', timeStyle: 'short' })} · {data.meetup.participantCount} personas apuntadas</p>{data.meetup.names.length > 0 && <p className="mt-2 text-sm">Nombres compartidos con el grupo: {data.meetup.names.join(', ')}</p>}{data.meetup.joined ? <Button className="mt-4" variant="outline" disabled={busy} onClick={() => void act('put', '/meetup/join', { joined: false })}>Salir del encuentro</Button> : owner && data.canJoinMeetup ? <div className="mt-4"><label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={shareName} disabled={busy} onChange={e => setShareName(e.target.checked)} />Compartir mi nombre con las personas apuntadas (opcional)</label><Button className="mt-4" disabled={busy} onClick={() => void act('put', '/meetup/join', { joined: true, shareName })}>Apuntarme al encuentro</Button></div> : <p className="mt-3 text-xs text-muted-foreground">Para apuntarte necesitas asistencia confirmada y que la hora del encuentro no haya pasado.</p>}</div> : <p className="mt-4 text-sm text-muted-foreground">No hay un punto de encuentro vigente.</p>}
      {data.canSetMeetup && <form className="mt-5 space-y-3" onSubmit={e => { e.preventDefault(); const parsed = new Date(time); if (!Number.isFinite(parsed.getTime())) { setError('Elige una fecha y hora válidas.'); return } void act('put', '/meetup', { place: place.trim(), time: parsed.toISOString(), isPublicPlace: publicPlace }) }}><label className="block text-sm">Lugar público<input className={input} value={place} onChange={e => setPlace(e.target.value)} maxLength={200} required disabled={busy} placeholder="Entrada principal del parque" /></label><label className="block text-sm">Hora local del encuentro<input className={input} type="datetime-local" value={time} onChange={e => setTime(e.target.value)} required disabled={busy} /></label><label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={publicPlace} onChange={e => setPublicPlace(e.target.checked)} disabled={busy} required />Confirmo que es un lugar público dentro de las 24 horas previas al evento.</label><p className="text-xs text-muted-foreground">Cambiar el lugar o la hora elimina las inscripciones al encuentro para pedir de nuevo el consentimiento.</p><Button type="submit" disabled={busy || !publicPlace || !place.trim() || !time}>{data.meetup ? 'Cambiar punto y reiniciar participantes' : 'Publicar punto de encuentro'}</Button></form>}
    </section></>}
  </div>
}
