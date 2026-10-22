'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, ArrowRight, Calendar, Check, Copy, RefreshCw, Share2 } from 'lucide-react'
import { plansApi, type PlanEvent } from '@/lib/api/plans'
import { useAuthStore } from '@/stores/authStore'
import { planCalendar } from '../calendar'

const failure = (error: any) => error?.response?.data?.message || 'No pudimos completar la solicitud. Inténtalo de nuevo.'

export default function SharedPlanPage() {
  const { token } = useParams<{ token: string }>()
  const { user, isAuthenticated } = useAuthStore()
  const userId = isAuthenticated ? user?.id || user?._id || '' : ''
  return <SharedPlan key={`${token}:${userId}`} token={token} userId={userId} />
}

function SharedPlan({ token, userId }: { token: string; userId: string }) {
  const alive = useRef(true)
  const lock = useRef(false)
  useEffect(() => { alive.current = true; return () => { alive.current = false } }, [])
  const current = () => {
    const session = useAuthStore.getState()
    return alive.current && (session.isAuthenticated ? session.user?.id || session.user?._id || '' : '') === userId
  }
  const qc = useQueryClient()
  const [shareUrl, setShareUrl] = useState('')
  const [origin, setOrigin] = useState('')
  useEffect(() => { setOrigin(window.location.origin) }, [])
  const [notice, setNotice] = useState('')
  const [confirming, setConfirming] = useState<string | null>(null)
  const pollingSince = useRef(Date.now())
  const queryKey = ['shared-plan', token, userId]
  const query = useQuery({ queryKey, queryFn: () => plansApi.get(token), retry: false,
    refetchOnWindowFocus: true, refetchIntervalInBackground: false,
    refetchInterval: state => state.state.data?.status === 'open' ? (Date.now() - pollingSince.current < 60000 ? 15000 : Date.now() - pollingSince.current < 300000 ? 30000 : 60000) : false })
  const vote = useMutation({ mutationFn: (optionId: string) => plansApi.vote(token, optionId),
    onSuccess: data => { if (!current()) return; pollingSince.current = Date.now(); qc.setQueryData(queryKey, data); setNotice('Tu voto quedó guardado. Puedes cambiarlo mientras siga abierto.'); setConfirming(null) },
    onSettled: () => { lock.current = false } })
  const decide = useMutation({ mutationFn: (optionId: string) => plansApi.decide(token, optionId),
    onSuccess: data => { if (!current()) return; pollingSince.current = Date.now(); qc.setQueryData(queryKey, data); setConfirming(null); setNotice('Plan confirmado. Ya pueden organizar su asistencia.'); void qc.invalidateQueries({ queryKey: ['my-group-plans'] }) },
    onError: () => { if (!current()) return; void query.refetch(); setConfirming(null) },
    onSettled: () => { lock.current = false } })
  const castVote = (id: string) => { if (!current() || lock.current) return; lock.current = true; vote.mutate(id) }
  const confirm = (id: string) => { if (!current() || lock.current) return; lock.current = true; decide.mutate(id) }
  const plan = query.data
  const maximum = Math.max(0, ...(plan?.options.filter(option => option.available).map(option => option.votes) || []))
  const winner = plan?.options.find(option => option.id === plan.selectedOptionId)
  const busy = vote.isPending || decide.isPending

  const share = async () => {
    const url = `${window.location.origin}/plans/${token}`
    setShareUrl(url)
    try {
      if (navigator.share) await navigator.share({ title: plan?.title, text: 'Elijamos nuestro próximo plan. Vota aquí:', url })
      else if (navigator.clipboard?.writeText) { await navigator.clipboard.writeText(url); setNotice('Enlace copiado. Pégalo en el chat de tu grupo.') }
    } catch (error: any) { if (error?.name !== 'AbortError') setNotice('Puedes copiar el enlace que aparece debajo.') }
  }
  const calendar = (event: PlanEvent) => {
    const file = new Blob([planCalendar(event, window.location.origin)], { type: 'text/calendar;charset=utf-8' })
    const url = URL.createObjectURL(file)
    const anchor = document.createElement('a')
    anchor.href = url; anchor.download = 'nuestro-plan.ics'; anchor.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  return <main className="min-h-screen bg-background px-5 py-8 pb-28 text-foreground sm:px-8"><div className="mx-auto max-w-3xl">
    <Link href="/plans" className="inline-flex min-h-11 items-center gap-2 text-sm text-muted-foreground"><ArrowLeft size={16} /> Planes en grupo</Link>
    {query.isLoading && <div role="status" className="my-10 space-y-4"><div className="h-10 w-3/4 animate-pulse rounded-xl bg-muted" /><p>Cargando la votación…</p></div>}
    {query.isError && <div role="alert" className="my-10 rounded-2xl border border-border p-6"><h1 className="text-xl font-semibold">No pudimos abrir esta votación</h1><p className="my-3 text-muted-foreground">{failure(query.error)}</p><button onClick={() => void query.refetch()} className="min-h-11 text-primary underline">Reintentar</button></div>}
    {plan && <>
      <header className="border-b border-border py-8"><p className="mb-3 text-sm font-semibold text-primary">{plan.status === 'decided' ? 'Ya tenemos plan' : plan.status === 'expired' ? 'Terminó el plazo para votar' : 'Tu próxima salida, entre todos'}</p><h1 className="text-3xl font-bold leading-tight tracking-tight sm:text-4xl">{plan.title}</h1>
        <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{plan.totalVotes} {plan.totalVotes === 1 ? 'voto' : 'votos'} · {plan.status === 'decided' ? 'Votación cerrada' : `Plazo: ${new Date(plan.expiresAt).toLocaleString('es-DO', { dateStyle: 'medium', timeStyle: 'short' })}`}</p>
        <div className="mt-5 flex flex-wrap gap-3"><button onClick={share} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary px-4 font-semibold text-primary-foreground"><Share2 size={17} /> Invitar a mi gente</button><button onClick={() => void query.refetch()} disabled={query.isFetching} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-border px-4 text-sm"><RefreshCw size={16} className={query.isFetching ? 'animate-spin' : ''} /> Actualizar votos</button></div>
        {origin && <a href={`https://wa.me/?text=${encodeURIComponent(`Resolvamos el coro: ${plan.title}. Mira las opciones y vota en ${origin}/plans/${token}`)}`} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex min-h-11 items-center rounded-xl border border-border px-4 text-sm font-semibold text-primary">Armar la votación por WhatsApp</a>}
        {shareUrl && <div className="mt-4"><label htmlFor="share-link" className="mb-2 flex items-center gap-2 text-xs text-muted-foreground"><Copy size={14} /> Quien tenga este enlace puede ver las opciones y votar.</label><input id="share-link" readOnly value={shareUrl} onFocus={event => event.currentTarget.select()} className="min-h-11 w-full rounded-lg border border-border bg-card px-3 text-sm" /></div>}
      </header>
      <p role="status" className="mt-5 text-sm text-primary">{notice}</p>
      {(vote.isError || decide.isError) && <p role="alert" className="my-4 rounded-xl border border-red-300 p-4 text-sm text-red-600">{failure(decide.isError ? decide.error : vote.error)}</p>}
      {plan.status !== 'decided' && <p className="my-5 text-sm leading-relaxed text-muted-foreground">{plan.status === 'open' ? 'Elige tu opción favorita. Los resultados se actualizan y puedes cambiar tu voto.' : plan.isOwner ? 'Ya no entran nuevos votos. Puedes confirmar una de las opciones más votadas.' : 'Quien creó el grupo confirmará la opción elegida.'}</p>}
      <section aria-label="Opciones y resultados" className="my-6 space-y-4">{plan.options.map(option => {
        const event = option.event
        const selected = option.id === plan.myVote
        const chosen = option.id === plan.selectedOptionId
        const percentage = plan.totalVotes ? Math.round(option.votes / plan.totalVotes * 100) : 0
        return <article key={option.id} className={`rounded-2xl border p-5 sm:p-6 ${chosen || selected ? 'border-primary bg-primary/5' : 'border-border bg-card'}`}>
          <div className="flex items-start justify-between gap-4"><div><h2 className="text-lg font-semibold">{event?.title || 'Opción ya no disponible'}</h2>{event && <><p className="mt-2 text-sm text-muted-foreground">{new Date(event.date).toLocaleString('es-DO', { dateStyle: 'medium', timeStyle: 'short' })}</p><p className="mt-1 text-sm text-muted-foreground">{event.location} · {event.price?.amount ? `${event.price.amount} ${event.price.currency}` : 'Gratis'}</p></>}</div><span className="shrink-0 text-right tabular-nums"><strong>{option.votes}</strong><small className="block text-muted-foreground">{percentage}%</small></span></div>
          <progress className="my-4 h-2 w-full accent-primary" max={Math.max(plan.totalVotes, 1)} value={option.votes} aria-label={`${option.votes} votos para ${event?.title || 'opción no disponible'}`} />
          <div className="flex flex-wrap items-center gap-3">
            {plan.status === 'open' && <button onClick={() => castVote(option.id)} disabled={busy || !option.available || selected} aria-pressed={selected} className={`inline-flex min-h-11 items-center gap-2 rounded-xl px-4 text-sm font-semibold disabled:opacity-60 ${selected ? 'bg-primary text-primary-foreground' : 'border border-border'}`}>{selected && <Check size={16} />}{selected ? 'Tu voto' : vote.isPending && vote.variables === option.id ? 'Guardando…' : 'Votar este plan'}</button>}
            {event && <Link href={`/events/${event.id}`} className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-primary underline">Ver evento <ArrowRight size={15} /></Link>}
            {chosen && <span className="inline-flex items-center gap-2 text-sm font-semibold text-primary"><Check size={17} /> El plan elegido</span>}
            {plan.isOwner && plan.status !== 'decided' && option.available && maximum > 0 && option.votes === maximum && <button disabled={busy} onClick={() => setConfirming(option.id)} className="min-h-11 text-sm font-semibold text-primary underline">Confirmar este plan</button>}
          </div>
          {confirming === option.id && <div className="mt-4 rounded-xl bg-background p-4"><p className="text-sm">Esto cerrará los votos y elegirá “{event?.title}”. Cada persona gestionará su entrada por separado.</p><div className="mt-3 flex gap-4"><button disabled={busy} onClick={() => confirm(option.id)} className="min-h-11 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground">{decide.isPending ? 'Confirmando…' : 'Sí, este será el plan'}</button><button disabled={busy} onClick={() => setConfirming(null)} className="min-h-11 text-sm underline">Volver</button></div></div>}
        </article>
      })}</section>
      {plan.status === 'decided' && winner?.event && <section className="rounded-2xl bg-primary/5 p-6"><h2 className="text-xl font-semibold">Nos vemos en {winner.event.title}</h2><p className="mt-3 text-sm leading-relaxed text-muted-foreground">El grupo ya eligió. Consulta los detalles del evento para confirmar tu asistencia o conseguir tu entrada.</p><div className="mt-5 flex flex-wrap gap-3"><Link href={`/events/${winner.event.id}`} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary px-4 font-semibold text-primary-foreground">Organizar mi asistencia <ArrowRight size={16} /></Link><button onClick={() => calendar(winner.event!)} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-border px-4 text-sm"><Calendar size={16} /> Añadir a mi calendario</button></div></section>}
      {plan.status === 'decided' && !winner?.event && <p role="status" className="rounded-2xl border border-border p-6 text-sm text-muted-foreground">El evento elegido terminó o ya no está disponible para compartir. <Link href="/plans" className="text-primary underline">Pueden elegir otro plan.</Link></p>}
      <p className="mt-8 border-t border-border pt-5 text-xs leading-relaxed text-muted-foreground">Se guarda un voto por cuenta o navegador invitado. Cambiar de navegador o borrar las cookies puede generar otro voto invitado. No es una votación verificada de identidad. No publicamos nombres ni correos de quienes votan, y votar no reserva ni cobra entradas.</p>
    </>}
  </div></main>
}
