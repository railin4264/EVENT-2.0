'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowRight, CheckCircle2, Globe, Lock, MapPin, Plus, ShieldCheck, Sparkles, Users } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuthStore } from '@/stores/authStore'
import { discoveryApi, type ActivityIdea, type DiscoveryEvent, type DiscoveryGeo } from '@/lib/api/discovery'
import { tribesService, type Tribe } from '@/lib/api/services/tribes.service'
import { categoryMeta } from '@/lib/categories'
import { eventImage, formatEventDate, formatPrice, locationLabel } from '@/lib/event-display'
import { CategoryBadge } from './CategoryBadge'

type Geo = DiscoveryGeo

function PlanCard({ event }: { event: DiscoveryEvent }) {
  const meta = categoryMeta(event.category)
  const image = eventImage(event)
  return (
    <Link href={`/events/${event._id}`} aria-label={`Descubrir plan: ${event.title}`} className="group w-[260px] shrink-0 snap-start overflow-hidden rounded-2xl border border-border bg-card transition hover:-translate-y-0.5 hover:shadow-lg sm:w-[280px]">
      <div className="relative h-32 overflow-hidden" style={{ background: `linear-gradient(135deg, ${meta.color}55, ${meta.color}18)` }}>
        {image
          ? <img src={image} alt="" loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
          : <span aria-hidden="true" className="grid h-full place-items-center text-5xl">{meta.emoji}</span>}
        <div className="absolute left-3 top-3 flex items-center gap-1.5 flex-wrap">
          <CategoryBadge category={event.category} activityType={event.activityType} size="sm" />
          {event.isOrganizerVerified && (
            <span className="inline-flex items-center gap-1 rounded-md bg-emerald-600/90 backdrop-blur-sm px-2 py-0.5 text-[11px] font-bold text-white shadow-sm" title="Organizador verificado por EventNow">
              <ShieldCheck className="h-3 w-3" />
              Verificado
            </span>
          )}
        </div>
        {event.isUnofficial && <span className="absolute right-3 top-3 rounded-md bg-fuchsia-600 px-2 py-0.5 text-[11px] font-bold text-white">🤫 Extraoficial</span>}
      </div>
      <div className="p-4">
        <p className="text-[11px] font-semibold text-primary">{formatEventDate(event.date, event.timeZone)}</p>
        <p className="mt-1 line-clamp-2 text-base font-semibold leading-snug">{event.title}</p>
        <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
          {event.isSecretLocation ? <Lock className="h-3.5 w-3.5 shrink-0" aria-hidden="true" /> : <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />}
          <span className="truncate">{locationLabel(event)}</span>
        </p>
        <div className="mt-3 flex items-center justify-between border-t border-border pt-3 text-xs">
          <span className="font-semibold">{formatPrice(event)}</span>
          {event.matchReasons?.[0]
            ? <span className="max-w-[60%] truncate rounded-full bg-primary/10 px-2 py-0.5 font-medium text-primary">{event.matchReasons[0]}</span>
            : <span className="flex items-center gap-1 text-muted-foreground"><Users className="h-3.5 w-3.5" aria-hidden="true" />{event.attendeesCount ?? event.attendees?.length ?? 0}</span>}
        </div>
      </div>
    </Link>
  )
}

function Row({ title, subtitle, children, action }: { title: string; subtitle?: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <section aria-label={title} className="mx-auto max-w-[1440px] px-5 pb-8 sm:px-8">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-xl font-bold tracking-tight">{title}</h2>
          {subtitle && <p className="mt-0.5 text-sm text-muted-foreground">{subtitle}</p>}
        </div>
        {action}
      </div>
      <div className="-mx-1 flex snap-x gap-4 overflow-x-auto px-1 pb-3">{children}</div>
    </section>
  )
}

/** Eventos con más movimiento (vistas, likes, asistentes) cerca de ti. */
export function TrendingRow({ geo }: { geo?: Geo }) {
  const { data = [] } = useQuery({ queryKey: ['trending', geo], queryFn: () => discoveryApi.getTrending(geo, 10), staleTime: 60_000, retry: false })
  if (!data.length) return null
  return (
    <Row title="🔥 Lo que se está moviendo" subtitle="Los planes que más interés están generando ahora">
      {data.map(e => <PlanCard key={e._id} event={e} />)}
    </Row>
  )
}

/** Selección personalizada: solo para usuarios con sesión. */
export function ForYouRow({ geo }: { geo?: Geo }) {
  const { isAuthenticated, user } = useAuthStore()
  const { data } = useQuery({
    queryKey: ['for-you', user?.id || user?._id || 'guest', geo],
    queryFn: () => discoveryApi.getForYou(geo, 12),
    enabled: isAuthenticated,
    staleTime: 120_000,
    retry: false
  })
  if (!isAuthenticated || !data?.events.length) return null
  return (
    <Row
      title="✨ Para ti"
      subtitle={data.personalized ? 'Elegidos según tus gustos y tu zona' : 'Agrega intereses a tu perfil para afinar esta selección'}
      action={!data.personalized ? <Link href="/profile" className="text-sm font-semibold text-primary hover:underline">Elegir mis intereses</Link> : undefined}
    >
      {data.events.map(e => <PlanCard key={e._id} event={e} />)}
    </Row>
  )
}

export function IdeaCard({ idea, onSupport, pending, fluid = false }: { idea: ActivityIdea; onSupport: (id: string) => void; pending: boolean; fluid?: boolean }) {
  const rawDeadline = idea.expiresAt || idea.quorumDeadline || (idea.createdAt && Number.isFinite(Date.parse(idea.createdAt)) ? new Date(Date.parse(idea.createdAt) + 14 * 86400000).toISOString() : '')
  const deadline = rawDeadline && Number.isFinite(Date.parse(rawDeadline)) ? rawDeadline : ''
  const ended = Boolean(idea.status && idea.status !== 'open') || idea.isExpired || Boolean(deadline && new Date(deadline).getTime() <= Date.now())
  const daysLeft = deadline ? Math.max(0, Math.ceil((new Date(deadline).getTime() - Date.now()) / 86400000)) : null
  const meta = categoryMeta(idea.category)
  const target = idea.quorumTarget || 15
  const progress = idea.quorumProgress ?? Math.min(100, Math.round(((idea.supportersCount || 0) / target) * 100))
  const isReached = Boolean(idea.quorumReached || ((idea.supportersCount || 0) >= target))

  return (
    <article className={`flex flex-col justify-between rounded-2xl border border-border bg-card p-4 transition hover:shadow-lg ${fluid ? '' : 'w-[290px] shrink-0 snap-start sm:w-[310px]'}`} style={{ borderTop: `3px solid ${meta.color}` }}>
      <div>
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-3">
            <span aria-hidden="true" className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-2xl" style={{ background: `${meta.color}22` }}>{idea.emoji || meta.emoji}</span>
            <div className="min-w-0">
              <p className="font-semibold leading-snug">{idea.title}</p>
              <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground"><MapPin className="h-3 w-3" aria-hidden="true" />{idea.zone?.name || idea.zone?.city || 'República Dominicana'}</p>
            </div>
          </div>
        </div>

        {deadline && <p className="mt-3 rounded-lg bg-muted/50 px-3 py-2 text-xs leading-5 text-muted-foreground">{idea.status === 'launched' ? 'Convertida en evento' : ended ? 'Vigencia terminada' : daysLeft === 1 ? 'Último día para apoyar' : `${daysLeft} días para apoyar`} · <time dateTime={deadline}>{new Date(deadline).toLocaleDateString('es-DO')}</time></p>}
        {idea.description && <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">{idea.description}</p>}

        {/* Barra de Quórum Colectivo */}
        <div className="mt-4 rounded-xl border border-border/60 bg-muted/30 p-2.5">
          <div className="flex items-center justify-between text-xs font-medium">
            {isReached ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="h-3.5 w-3.5" /> Quórum alcanzado
              </span>
            ) : (
              <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                <Users className="h-3 w-3" /> Meta de quórum: {target}
              </span>
            )}
            <span className="text-[11px] font-bold text-foreground">{progress}%</span>
          </div>
          <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className={`h-full transition-all duration-500 rounded-full ${isReached ? 'bg-gradient-to-r from-emerald-500 to-teal-400' : 'bg-gradient-to-r from-primary to-violet-500'}`}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">
          {idea.supportersCount === 0 ? 'Sé el primero' : `${idea.supportersCount} de ${target} apoyos`}
        </span>
        <button
          type="button"
          onClick={() => onSupport(idea._id)}
          disabled={pending || ended}
          aria-pressed={idea.supported}
          className={`rounded-full border px-3.5 py-1.5 text-xs font-bold transition ${idea.supported ? 'border-primary bg-primary text-primary-foreground' : 'border-primary/40 text-primary hover:bg-primary/10'}`}
        >
          {ended ? 'Cerrada' : idea.supported ? '✓ Me interesa' : 'Me interesa'}
        </button>
      </div>
      {idea.linkedEvent && <Link href={`/events/${idea.linkedEvent}`} className="mt-3 inline-flex min-h-11 items-center rounded-xl bg-primary/10 px-3 text-sm font-semibold text-primary">Ver el evento creado</Link>}
      <Link href={`/community/ideas/${idea._id}`} className="mt-3 inline-flex min-h-11 items-center text-xs font-semibold text-primary underline">Yo aporto · Ofrecer mi talento</Link>
    </article>
  )
}

/** Cada voto pertenece a la sesión que inició la petición. */
export function useIdeaSupport(queryKeyPrefix: string) {
  const router = useRouter()
  const qc = useQueryClient()
  const { isAuthenticated, user } = useAuthStore()
  const identity = isAuthenticated ? (user?.id || user?._id || 'guest') : 'guest'
  const mounted = useRef(true)
  const lock = useRef<{ owner: string; token: string | null } | null>(null)
  useEffect(() => { mounted.current = true; return () => { mounted.current = false } }, [])
  const belongs = (request: { owner: string; token: string | null }) => {
    const auth = useAuthStore.getState()
    return mounted.current && auth.isAuthenticated && (auth.user?.id || auth.user?._id) === request.owner && auth.token === request.token
  }
  const mutation = useMutation({
    mutationFn: (request: { id: string; owner: string; token: string | null }) => {
      if (!belongs(request)) throw new Error('La sesión cambió')
      return discoveryApi.toggleSupport(request.id)
    },
    onSuccess: (data, request) => {
      if (!belongs(request)) return
      if (data?.quorumReached) {
        toast.success('🎉 ¡Quórum alcanzado! Esta idea ahora está lista para ser organizada.')
      }
      for (const prefix of new Set([queryKeyPrefix, 'ideas', 'ideas-home'])) void qc.invalidateQueries({ queryKey: [prefix, request.owner] })
      void qc.invalidateQueries({ queryKey: ['ideas-demand'] })
    },
    onError: (_error, request) => { if (belongs(request)) toast.error('No pudimos registrar tu interés. Inténtalo de nuevo.') },
    onSettled: (_data, _error, request) => { if (lock.current?.owner === request.owner && lock.current?.token === request.token) lock.current = null }
  })
  const support = (id: string) => {
    if (!isAuthenticated) { router.push('/login?redirect=%2Fideas'); return }
    const auth = useAuthStore.getState()
    if (!auth.isAuthenticated || (auth.user?.id || auth.user?._id) !== identity) return
    if (lock.current?.owner === identity && lock.current.token === auth.token) return
    lock.current = { owner: identity, token: auth.token }
    mutation.mutate({ id, owner: identity, token: auth.token })
  }
  return { support, pending: mutation.isPending && mutation.variables?.owner === identity }
}

/** Radar de ideas: actividades que la gente quiere que existan y aún no hay. */
export function IdeasRadar() {
  const { isAuthenticated, user } = useAuthStore()
  const identity = isAuthenticated ? (user?.id || user?._id || 'guest') : 'guest'
  const { data, isLoading } = useQuery({ queryKey: ['ideas-home', identity], queryFn: async () => {
    const session = useAuthStore.getState()
    const result = await discoveryApi.getIdeas({ limit: 8, sort: 'top' })
    const current = useAuthStore.getState()
    if (current.isAuthenticated !== session.isAuthenticated || current.token !== session.token || (current.user?.id || current.user?._id) !== (session.user?.id || session.user?._id)) throw new Error('La sesión cambió')
    return result
  }, staleTime: 60_000, retry: false })
  const { support, pending } = useIdeaSupport('ideas-home')
  const ideas = data?.ideas || []
  if (isLoading || !ideas.length) return null
  return (
    <Row
      title="💡 ¿Y si esto existiera aquí?"
      subtitle="Actividades que a la gente le encantaría y todavía no se hacen. Tu voto ayuda a que alguien las organice."
      action={<Link href="/ideas" className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline">Ver todas <ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>}
    >
      {ideas.map(idea => <IdeaCard key={idea._id} idea={idea} onSupport={support} pending={pending} />)}
      <Link href="/ideas#proponer" className="flex w-[220px] shrink-0 snap-start flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-primary/40 p-4 text-center text-primary transition hover:bg-primary/5">
        <Plus className="h-7 w-7" aria-hidden="true" />
        <span className="text-sm font-bold">Propón una actividad</span>
        <span className="text-xs text-muted-foreground">¿Violín en el parque? ¿Pintar al aire libre? Cuéntanos.</span>
      </Link>
    </Row>
  )
}

function TribeCard({ tribe }: { tribe: Tribe }) {
  const meta = categoryMeta(tribe.category || 'social')
  const coverUrl = typeof tribe.coverImage === 'string' ? tribe.coverImage : (tribe.coverImage?.url || (typeof tribe.cover === 'string' ? tribe.cover : ''))
  const avatarUrl = typeof tribe.avatar === 'string' ? tribe.avatar : (tribe.avatar?.url || (typeof tribe.image === 'string' ? tribe.image : ''))
  const isPrivate = Boolean(tribe.isPrivate || tribe.privacy === 'private' || tribe.privacy === 'secret' || tribe.membership === 'approval_required')
  const memberCount = tribe.stats?.memberCount ?? tribe.memberCount ?? tribe.membersCount ?? 0

  return (
    <Link
      href={`/tribes/${tribe._id}`}
      aria-label={`Ver comunidad: ${tribe.name}`}
      className="group w-[260px] shrink-0 snap-start overflow-hidden rounded-2xl border border-border bg-card transition hover:-translate-y-0.5 hover:shadow-lg sm:w-[280px]"
    >
      <div className="relative h-28 overflow-hidden bg-gradient-to-br from-primary/30 to-muted">
        {coverUrl ? (
          <img src={coverUrl} alt="" loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
        ) : (
          <div className="h-full w-full opacity-30" style={{ backgroundColor: meta.color }} />
        )}
        <div className="absolute left-3 top-3 flex items-center gap-1.5 flex-wrap">
          <CategoryBadge category={tribe.category} size="sm" />
          <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-bold text-white shadow-sm backdrop-blur-sm ${isPrivate ? 'bg-amber-600/90' : 'bg-emerald-600/90'}`}>
            {isPrivate ? <Lock className="h-3 w-3" /> : <Globe className="h-3 w-3" />}
            {isPrivate ? 'Privada' : 'Pública'}
          </span>
        </div>
      </div>
      <div className="p-4">
        <div className="flex items-start gap-3">
          {avatarUrl ? (
            <img src={avatarUrl} alt="" className="-mt-8 h-12 w-12 rounded-xl border-2 border-card object-cover shadow-sm bg-muted shrink-0" />
          ) : (
            <div className="-mt-8 grid h-12 w-12 place-items-center rounded-xl border-2 border-card bg-primary text-xl font-bold text-white shadow-sm shrink-0">
              {tribe.name?.charAt(0)?.toUpperCase() || 'T'}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="line-clamp-1 font-semibold leading-snug group-hover:text-primary transition-colors">{tribe.name}</p>
            <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground truncate">
              <MapPin className="h-3 w-3 shrink-0" />
              <span className="truncate">{tribe.location?.city || tribe.location?.address || 'República Dominicana'}</span>
            </p>
          </div>
        </div>

        {tribe.description && (
          <p className="mt-2.5 line-clamp-2 text-xs text-muted-foreground leading-relaxed">
            {tribe.description}
          </p>
        )}

        <div className="mt-3 flex items-center justify-between border-t border-border pt-3 text-xs">
          <span className="flex items-center gap-1 font-medium text-muted-foreground">
            <Users className="h-3.5 w-3.5" />
            {memberCount} {memberCount === 1 ? 'miembro' : 'miembros'}
          </span>
          <span className="font-semibold text-primary group-hover:underline flex items-center gap-0.5">
            Explorar <ArrowRight className="h-3 w-3" />
          </span>
        </div>
      </div>
    </Link>
  )
}

/** Comunidades destacadas con soporte de proximidad geográfica. */
export function FeaturedTribesRow({ geo }: { geo?: Geo }) {
  const { data } = useQuery({
    queryKey: ['featured-tribes-home', geo],
    queryFn: async () => {
      try {
        if (geo && typeof geo.lat === 'number' && typeof geo.lng === 'number') {
          const res = await tribesService.getNearbyTribes({ lat: geo.lat, lng: geo.lng, radius: 100 })
          if (res.data && res.data.length > 0) return res.data
        }
        const res = await tribesService.getTribes({ limit: 8, sortBy: 'popular' })
        return res.data || []
      } catch {
        return []
      }
    },
    staleTime: 60_000,
    retry: false
  })

  const tribes = data || []
  if (!tribes.length) return null

  return (
    <Row
      title="👥 Comunidades Activas"
      subtitle="Conecta con grupos apasionados, únete a quedadas privadas o abiertas y vive experiencias compartidas"
      action={
        <Link href="/tribes" className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline">
          Ver todas <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      }
    >
      {tribes.map(t => <TribeCard key={t._id} tribe={t} />)}
      <Link href="/tribes/create" className="flex w-[220px] shrink-0 snap-start flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-primary/40 p-4 text-center text-primary transition hover:bg-primary/5">
        <Plus className="h-7 w-7" aria-hidden="true" />
        <span className="text-sm font-bold">Crear una comunidad</span>
        <span className="text-xs text-muted-foreground">Reúne a tu tribu local en tu ciudad o sector.</span>
      </Link>
    </Row>
  )
}

export { Sparkles }
