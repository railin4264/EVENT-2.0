'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { ArrowRight, CheckCircle2, Megaphone, Users } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { apiClient } from '@/lib/api/client'
import { Button } from '@/components/redesign/ui/button'

type HostEvent = { _id: string; title: string; promotionRequest?: { requested?: boolean } }
export default function OrganizersPage() {
  const { user, isAuthenticated } = useAuthStore()
  const id = isAuthenticated ? user?.id || user?._id : undefined
  return <div className="min-h-dvh bg-background text-foreground">
    <section className="mx-auto grid max-w-6xl gap-10 px-5 py-12 lg:grid-cols-[1.2fr_1fr] lg:py-20">
      <div><p className="text-sm font-semibold text-primary">PARA QUIENES HACEN QUE LAS COSAS PASEN</p><h1 className="mt-5 max-w-2xl text-4xl font-semibold leading-tight tracking-tight sm:text-6xl">Tu evento merece<br /><span className="text-primary">encontrar a su gente.</span></h1><p className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">Publica tu plan, reúne a tu comunidad y coordina la asistencia. Si necesitas más difusión, solicita una propuesta de promoción con fechas y alcance definidos.</p><div className="mt-8 flex flex-wrap gap-4"><Button asChild className="min-h-12 rounded-xl"><Link href={id ? '/events/create' : '/login?redirect=%2Fevents%2Fcreate'}>Crear mi evento <ArrowRight className="ml-2 h-4 w-4" /></Link></Button><Button asChild variant="outline" className="min-h-12 rounded-xl"><a href="#promotion-request">Solicitar promoción</a></Button></div><p className="mt-4 text-sm text-muted-foreground">Sin cobros automáticos en EventNow. Las condiciones de cada servicio se acuerdan antes de activarlo.</p></div>
      <aside className="flex flex-col justify-between rounded-3xl bg-gradient-to-br from-indigo-950 via-violet-950 to-slate-950 p-8 text-white"><Megaphone className="h-10 w-10 text-violet-200" /><div className="mt-8"><p className="text-sm font-medium text-violet-200">DEL PLAN A LA CONVOCATORIA</p><h2 className="mt-4 text-3xl font-semibold">La promoción empieza<br />con un buen evento.</h2><p className="mt-4 text-sm leading-relaxed text-violet-100">Primero publica y revisa la información. Después coordinamos la propuesta; enviar una solicitud no activa un anuncio ni garantiza ventas.</p></div><div className="mt-8 flex items-center gap-3 border-t border-white/20 pt-5 text-sm"><Users className="h-5 w-5" />Conexiones reales. Expectativas claras.</div></aside>
    </section>
    <section aria-label="Cómo trabajar con EventNow" className="mx-auto grid max-w-6xl gap-5 px-5 pb-14 md:grid-cols-3">{[
      ['01', 'Publica tu plan', 'Describe la experiencia, lugar y horario. La publicación respeta la revisión y las reglas de la plataforma.'],
      ['02', 'Pide una propuesta', 'Elige uno de tus eventos publicados y cuéntanos el objetivo y las fechas de difusión.'],
      ['03', 'Acuerda antes de pagar', 'El equipo revisa disponibilidad, ubicación, duración y presupuesto. El pago y la activación se coordinan manualmente.']
    ].map(([number, title, text]) => <article key={number} className="rounded-2xl border border-border bg-card p-6"><p className="text-sm font-semibold text-primary">{number}</p><h2 className="mt-4 text-xl font-semibold">{title}</h2><p className="mt-3 text-sm leading-relaxed text-muted-foreground">{text}</p></article>)}</section>
    <section aria-label="Herramientas del anfitrión" className="mx-auto grid max-w-6xl gap-6 px-5 pb-14 md:grid-cols-2">
      <article className="rounded-2xl border border-border p-6"><h2 className="text-2xl font-semibold">Un buen plan puede encontrar aliados</h2><p className="mt-3 text-sm leading-relaxed text-muted-foreground">Pide un espacio, materiales o difusión. Recibe propuestas de marcas y documenta entregables antes de confirmar una colaboración.</p><Link href="/partners" className="mt-5 inline-flex min-h-11 items-center font-semibold text-primary underline">Patrocinadores, espacios y ficha para marcas</Link></article>
      <article className="rounded-2xl border border-border p-6"><h2 className="text-2xl font-semibold">Invita a personas de otras ciudades</h2><p className="mt-3 text-sm leading-relaxed text-muted-foreground">Compara horarios entre zonas, prepara un itinerario y guarda el calendario. Si tu evento empieza con un mensaje, conviértelo en un borrador privado para revisar.</p><Link href="/planning-tools" className="mt-5 inline-flex min-h-11 items-center font-semibold text-primary underline">Horarios, calendario y borradores</Link></article>
    </section>
    <section id="promotion-request" className="mx-auto max-w-3xl px-5 pb-20"><div className="rounded-3xl border border-border bg-card p-6 sm:p-9"><h2 className="text-2xl font-semibold">Dale más visibilidad a tu evento</h2><p className="mt-3 text-sm leading-relaxed text-muted-foreground">Solicita una revisión comercial. Sin cargo ni compromiso automático; el presupuesto se acuerda por separado.</p>{id ? <PromotionRequest key={id} userId={id} /> : <Button asChild className="mt-6"><Link href="/login?redirect=%2Forganizers">Entrar para elegir mi evento</Link></Button>}</div></section>
  </div>
}

function PromotionRequest({ userId }: { userId: string }) {
  const mounted = useRef(true)
  const lock = useRef(false)
  const [selected, setSelected] = useState('')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [failure, setFailure] = useState('')
  const [submitted, setSubmitted] = useState<string | null>(null)
  useEffect(() => { mounted.current = true; return () => { mounted.current = false } }, [])
  const query = useQuery({ queryKey: ['promotion-events', userId], retry: false, queryFn: async () => {
    const response = await apiClient.get('/events', { params: { createdBy: userId, timeFilter: 'upcoming', limit: 100 } })
    if (!response.data?.success || !Array.isArray(response.data?.events)) throw new Error('No pudimos cargar tus eventos publicados.')
    return response.data.events as HostEvent[]
  } })
  const event = query.data?.find(item => item._id === selected)
  const pending = submitted === selected || event?.promotionRequest?.requested === true
  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!event || pending || lock.current) return
    lock.current = true; setBusy(true); setFailure('')
    try {
      const response = await apiClient.post(`/events/${encodeURIComponent(event._id)}/promotion-request`, { note: note.trim() })
      if (!response.data?.success) throw new Error(response.data?.message || 'El servidor no confirmó la solicitud.')
      if (mounted.current) setSubmitted(event._id)
    } catch (error) {
      const failure = error as { response?: { data?: { message?: string } }; message?: string }
      if (mounted.current) setFailure(failure?.response?.data?.message || failure?.message || 'No pudimos enviar la solicitud. Inténtalo de nuevo.')
    } finally { lock.current = false; if (mounted.current) setBusy(false) }
  }
  if (query.isPending) return <p role="status" className="mt-6 text-sm">Cargando tus eventos…</p>
  if (query.isError) return <div role="alert" className="mt-6 text-sm"><p>No pudimos cargar tus eventos.</p><Button variant="outline" className="mt-3" disabled={query.isFetching} onClick={() => void query.refetch()}>Reintentar carga</Button></div>
  if (!query.data?.length) return <div className="mt-6 rounded-2xl bg-muted/50 p-5 text-sm"><p>Necesitas un evento público publicado y vigente para solicitar promoción.</p><Link href="/events/create" className="mt-3 inline-block font-semibold text-primary">Preparar mi evento <ArrowRight className="ml-1 inline h-4 w-4" /></Link></div>
  return <form onSubmit={submit} className="mt-6 space-y-5"><div><label htmlFor="promotion-event" className="text-sm font-medium">Tu evento publicado</label><select id="promotion-event" value={selected} disabled={busy} onChange={e => { setSelected(e.target.value); setFailure('') }} className="mt-2 min-h-12 w-full rounded-xl border border-border bg-background px-3"><option value="">Elige un evento</option>{query.data.map(item => <option key={item._id} value={item._id}>{item.title}</option>)}</select></div><div><label htmlFor="promotion-note" className="text-sm font-medium">¿Qué quieres conseguir? <span className="font-normal text-muted-foreground">(opcional)</span></label><textarea id="promotion-note" value={note} disabled={busy || pending} onChange={e => setNote(e.target.value)} maxLength={300} rows={4} placeholder="Cuéntanos las fechas, la ciudad y el público al que te gustaría llegar." className="mt-2 w-full rounded-xl border border-border bg-background p-3 text-sm" /><p className="mt-1 text-right text-xs text-muted-foreground">{note.length}/300</p></div>{failure && <p role="alert" className="text-sm text-destructive">{failure}</p>}{pending ? <p role="status" className="flex items-start gap-2 rounded-xl bg-primary/10 p-4 text-sm"><CheckCircle2 className="h-5 w-5 shrink-0 text-primary" />Solicitud registrada para revisión. No se ha activado ninguna promoción ni realizado un cobro.</p> : <Button type="submit" className="min-h-12 rounded-xl" disabled={!event || busy}>{busy ? 'Enviando…' : 'Solicitar propuesta de promoción'}</Button>}<p className="text-xs leading-relaxed text-muted-foreground">Los espacios de promoción dependen de disponibilidad y revisión. No prometemos asistentes ni resultados de venta.</p></form>
}
