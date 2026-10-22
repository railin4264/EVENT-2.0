'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowRight, Loader2, MapPin, Navigation, Plus, Search } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuthStore } from '@/stores/authStore'
import { discoveryApi, type ActivityIdea } from '@/lib/api/discovery'
import { CATEGORY_LIST, categoryMeta } from '@/lib/categories'
import { IdeaCard, useIdeaSupport } from '@/components/discovery/DiscoveryRows'
import { IdeaRealization } from '@/components/ideas/IdeaRealization'

const ZONES: { name: string; coords: [number, number] }[] = [
  { name: 'Santo Domingo', coords: [-69.9312, 18.4861] },
  { name: 'Santiago', coords: [-70.697, 19.4517] },
  { name: 'Puerto Plata', coords: [-70.6973, 19.7934] },
  { name: 'Punta Cana', coords: [-68.3739, 18.582] },
  { name: 'La Romana', coords: [-68.9728, 18.4273] },
  { name: 'Samaná', coords: [-69.3368, 19.2056] },
  { name: 'San Cristóbal', coords: [-70.1084, 18.4167] },
  { name: 'Boca Chica', coords: [-69.5966, 18.4485] },
  { name: 'Baní', coords: [-70.3259, 18.2796] },
  { name: 'Barahona', coords: [-71.1008, 18.2085] }
]

export default function IdeasPage() {
  const { isAuthenticated, user } = useAuthStore()
  const identity = isAuthenticated ? (user?.id || user?._id || 'guest') : 'guest'
  return <IdeasContent key={identity} identity={identity} />
}

function IdeasContent({ identity }: { identity: string }) {
  const router = useRouter()
  const qc = useQueryClient()
  const { isAuthenticated } = useAuthStore()
  const [category, setCategory] = useState('')
  const [q, setQ] = useState('')
  const [sort, setSort] = useState<'top' | 'new'>('top')
  const [view, setView] = useState<'open' | 'expired' | 'launched'>('open')
  const [geo, setGeo] = useState<{ lat: number; lng: number } | null>(null)
  const [locating, setLocating] = useState(false)
  const [selectedIdea, setSelectedIdea] = useState<string | null>(null)

  const [form, setForm] = useState({ title: '', description: '', category: 'music', zone: 'Santo Domingo', quorumTarget: 15, daysToTarget: 14 })
  const mounted = useRef(true)
  const creating = useRef(false)
  useEffect(() => { mounted.current = true; return () => { mounted.current = false } }, [])
  const ownsRequest = (request: { owner: string; token: string | null }) => {
    const auth = useAuthStore.getState()
    return mounted.current && auth.isAuthenticated && (auth.user?.id || auth.user?._id) === request.owner && auth.token === request.token
  }

  const ideasQuery = useQuery({
    refetchInterval: 60000,
    queryKey: ['ideas', identity, view, category, q, sort, geo?.lat, geo?.lng],
    queryFn: async () => {
      const session = useAuthStore.getState()
      const result = await discoveryApi.getIdeas({ status: view, category: category || undefined, q: q.trim() || undefined, sort, limit: 30, ...(geo || {}) })
      const current = useAuthStore.getState()
      if (current.isAuthenticated !== session.isAuthenticated || current.token !== session.token || (current.user?.id || current.user?._id) !== (session.user?.id || session.user?._id)) throw new Error('La sesión cambió')
      return result
    },
    staleTime: 30_000
  })
  const demandQuery = useQuery({
    queryKey: ['ideas-demand', geo?.lat, geo?.lng],
    queryFn: () => discoveryApi.getDemand(geo ? { ...geo, radiusKm: 40 } : null),
    staleTime: 60_000
  })
  const { support, pending } = useIdeaSupport('ideas')

  const createIdea = useMutation({
    mutationFn: (request: { owner: string; token: string | null }) => {
      if (!ownsRequest(request)) throw new Error('La sesión cambió')
      const zone = ZONES.find(z => z.name === form.zone) || ZONES[0]
      return discoveryApi.createIdea({
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        category: form.category,
        emoji: categoryMeta(form.category).emoji,
        zone: { name: zone.name, city: zone.name, coordinates: zone.coords },
        quorumTarget: Number(form.quorumTarget) || 15,
        daysToTarget: form.daysToTarget
      })
    },
    onSuccess: (_data, request) => {
      if (!ownsRequest(request)) return
      toast.success('¡Idea publicada con Quórum! Invita a tus amigos para llegar a la meta.')
      setForm(f => ({ ...f, title: '', description: '', quorumTarget: 15 }))
      void qc.invalidateQueries({ queryKey: ['ideas'] })
      void qc.invalidateQueries({ queryKey: ['ideas-demand'] })
      void qc.invalidateQueries({ queryKey: ['ideas-home'] })
    },
    onError: (err: any, request) => { if (ownsRequest(request)) toast.error(err?.response?.data?.message || 'No pudimos publicar tu idea.') },
    onSettled: () => { creating.current = false }
  })

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!isAuthenticated) { router.push('/login?redirect=%2Fideas'); return }
    if (form.title.trim().length < 4) { toast.error('Describe la actividad con al menos 4 letras.'); return }
    const auth = useAuthStore.getState()
    if (creating.current || !auth.isAuthenticated || (auth.user?.id || auth.user?._id) !== identity) return
    creating.current = true
    createIdea.mutate({ owner: identity, token: auth.token })
  }

  const locate = () => {
    if (!navigator.geolocation) { toast.error('Tu navegador no permite ubicación.'); return }
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      p => { setGeo({ lat: p.coords.latitude, lng: p.coords.longitude }); setLocating(false) },
      () => { setLocating(false); toast.error('No pudimos obtener tu ubicación.') },
      { timeout: 10000, maximumAge: 300000 }
    )
  }

  const ideas: ActivityIdea[] = ideasQuery.data?.ideas || []
  const opportunities = demandQuery.data?.opportunities || []
  const hasDemand = useMemo(() => opportunities.some(o => o.demand > 0), [opportunities])

  return (
    <main className="mx-auto max-w-[1200px] px-5 py-8 pb-28 sm:px-8">
      <Link href="/" className="text-sm font-medium text-muted-foreground hover:text-foreground">← Volver al inicio</Link>

      <header className="mt-4 rounded-3xl border border-border bg-gradient-to-br from-violet-500/10 via-fuchsia-500/5 to-cyan-500/10 p-6 sm:p-10">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Descubre lo que ni sabías que te gustaba</h1>
        <p className="mt-3 max-w-2xl text-base text-muted-foreground">
          Aquí la gente propone actividades que quiere ver en su ciudad: violín en el parque, pintar al aire libre, piano en la plaza…
          Si te interesa, apóyala. Cuando suficiente gente la quiere, un organizador puede convertirla en un evento real.
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          {['🎻 Violín en el parque', '🎨 Pintar al aire libre', '🎹 Piano en la plaza', '♟️ Ajedrez en el parque', '🔭 Observar estrellas'].map(t => (
            <span key={t} className="rounded-full border border-border bg-background/70 px-3 py-1 text-xs font-medium">{t}</span>
          ))}
        </div>
      </header>

      <section id="proponer" aria-label="Proponer una actividad" className="mt-8 rounded-2xl border border-border bg-card p-5 sm:p-6">
        <h2 className="text-lg font-bold">Propón una actividad</h2>
        <p className="mt-1 text-sm text-muted-foreground">Cuéntanos qué te gustaría hacer. Es gratis y toma 20 segundos.</p>
        <form onSubmit={submit} className="mt-4 grid gap-3 md:grid-cols-2">
          <label className="md:col-span-2">
            <span className="mb-1 block text-xs font-semibold text-muted-foreground">¿Qué actividad te gustaría?</span>
            <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} maxLength={100} placeholder="Ej. Violín en el parque al atardecer" className="h-12 w-full rounded-xl border border-border bg-background px-4 text-sm outline-none focus:border-primary" />
          </label>
          <label>
            <span className="mb-1 block text-xs font-semibold text-muted-foreground">Tipo</span>
            <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} className="h-12 w-full rounded-xl border border-border bg-background px-3 text-sm">
              {CATEGORY_LIST.map(c => <option key={c.slug} value={c.slug}>{c.emoji} {c.label}</option>)}
            </select>
          </label>
          <label>
            <span className="mb-1 block text-xs font-semibold text-muted-foreground">¿Dónde?</span>
            <select value={form.zone} onChange={e => setForm({ ...form, zone: e.target.value })} className="h-12 w-full rounded-xl border border-border bg-background px-3 text-sm">
              {ZONES.map(z => <option key={z.name} value={z.name}>{z.name}</option>)}
            </select>
          </label>
          <label className="md:col-span-2">
            <span className="mb-1 block text-xs font-semibold text-muted-foreground">Meta de Quórum Colectivo (personas necesarias para activar la idea)</span>
            <select value={form.quorumTarget} onChange={e => setForm({ ...form, quorumTarget: Number(e.target.value) })} className="h-12 w-full rounded-xl border border-border bg-background px-3 text-sm">
              <option value={10}>🎯 10 personas (Plan íntimo o taller)</option>
              <option value={15}>🎯 15 personas (Estándar recomendado)</option>
              <option value={25}>🎯 25 personas (Comunidad o coro mediano)</option>
              <option value={50}>🎯 50 personas (Gran encuentro o festival)</option>
            </select>
          </label>
          <label className="md:col-span-2">
            <span className="mb-1 block text-xs font-semibold text-muted-foreground">Detalles (opcional)</span>
            <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} maxLength={600} rows={2} placeholder="Cuéntanos cómo te lo imaginas" className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-primary" />
          </label>
          <label><span className="mb-1 block text-xs font-semibold text-muted-foreground">Vigencia para reunir apoyos</span><select aria-label="Vigencia de la idea" value={form.daysToTarget} onChange={e => setForm({ ...form, daysToTarget: Number(e.target.value) })} className="min-h-12 w-full rounded-xl border border-border bg-background px-3 text-sm">{[3,7,14,30,60].map(days => <option key={days} value={days}>{days} días</option>)}</select><span className="mt-2 block text-xs leading-5 text-muted-foreground">Al vencer se archiva, sin borrar los apoyos. Alcanzar la meta no confirma un evento ni inscribe a nadie.</span></label>
          <div className="md:col-span-2">
            <button type="submit" disabled={createIdea.isPending} className="inline-flex h-12 items-center gap-2 rounded-xl bg-primary px-6 text-sm font-bold text-primary-foreground transition hover:opacity-90 disabled:opacity-60">
              {createIdea.isPending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Plus className="h-4 w-4" aria-hidden="true" />}
              {isAuthenticated ? 'Publicar idea' : 'Entrar para proponer'}
            </button>
          </div>
        </form>
      </section>

      <section aria-label="Ideas de la comunidad" className="mt-10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-bold">Ideas de la comunidad</h2>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
              <input aria-label="Buscar ideas" value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar…" className="h-10 w-44 rounded-lg border border-border bg-card pl-9 pr-3 text-sm" />
            </div>
            <select aria-label="Ordenar ideas" value={sort} onChange={e => setSort(e.target.value as 'top' | 'new')} className="h-10 rounded-lg border border-border bg-card px-3 text-sm">
              <option value="top">Más pedidas</option>
              <option value="new">Más nuevas</option>
            </select>
            <button type="button" onClick={locate} disabled={locating} aria-pressed={Boolean(geo)} className={`inline-flex h-10 items-center gap-1.5 rounded-lg border px-3 text-sm font-medium ${geo ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-card'}`}>
              {locating ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Navigation className="h-4 w-4" aria-hidden="true" />}{geo ? 'Cerca de mí' : 'Usar mi ubicación'}
            </button>
            {geo && <button type="button" onClick={() => setGeo(null)} className="text-xs text-muted-foreground underline">Ver todo el país</button>}
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-2" aria-label="Estado de las ideas">{([['open', 'Activas'], ['expired', 'Vencidas'], ['launched', 'Convertidas en evento']] as const).map(([value, label]) => <button key={value} type="button" aria-pressed={view === value} onClick={() => { setView(value); setSelectedIdea(null) }} className={`min-h-11 rounded-xl px-4 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${view === value ? 'bg-primary text-primary-foreground' : 'border border-border bg-card hover:bg-muted'}`}>{label}</button>)}</div>
        <div className="mt-4 flex gap-2 overflow-x-auto pb-2" aria-label="Filtrar por categoría">
          <button type="button" aria-pressed={!category} onClick={() => setCategory('')} className={`whitespace-nowrap rounded-full border px-4 py-1.5 text-sm font-medium ${!category ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card text-muted-foreground'}`}>Todas</button>
          {CATEGORY_LIST.filter(c => c.slug !== 'other').map(c => (
            <button key={c.slug} type="button" aria-pressed={category === c.slug} onClick={() => setCategory(c.slug)} className={`whitespace-nowrap rounded-full border px-3.5 py-1.5 text-sm font-medium ${category === c.slug ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card text-muted-foreground hover:border-primary/50'}`}>
              <span aria-hidden="true">{c.emoji}</span> {c.label}
            </button>
          ))}
        </div>

        {ideasQuery.isLoading ? (
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{Array.from({ length: 6 }, (_, i) => <div key={i} className="h-40 animate-pulse rounded-2xl bg-muted" />)}</div>
        ) : ideasQuery.isError ? (
          <div role="alert" className="mt-5 rounded-2xl border border-border p-8 text-center text-sm text-muted-foreground">No pudimos cargar las ideas. <button onClick={() => ideasQuery.refetch()} className="font-semibold text-primary underline">Reintentar</button></div>
        ) : ideas.length === 0 ? (
          <div className="mt-5 rounded-2xl border border-dashed border-border p-10 text-center">
            <p className="text-lg font-semibold">{view === 'expired' ? 'No hay ideas vencidas con estos filtros' : view === 'launched' ? 'Todavía no hay ideas convertidas en evento' : 'Nadie ha propuesto esto todavía'}</p>
            <p className="mt-1 text-sm text-muted-foreground">Cambia los filtros o propón una actividad nueva arriba.</p>
          </div>
        ) : (
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {ideas.map(idea => <div key={idea._id} className="rounded-2xl border border-border bg-card p-3"><IdeaCard idea={idea} onSupport={support} pending={pending} fluid />{view === 'open' && <button type="button" aria-expanded={selectedIdea === idea._id} onClick={() => setSelectedIdea(selectedIdea === idea._id ? null : idea._id)} className="mt-3 rounded-lg border border-border px-3 py-2 text-sm font-semibold text-primary">{selectedIdea === idea._id ? 'Cerrar condiciones y propuestas' : 'Yo voy si… · Ver propuestas'}</button>}{view === 'open' && selectedIdea === idea._id && <IdeaRealization key={`${identity}-${idea._id}`} identity={identity} ideaId={idea._id} />}</div>)}
          </div>
        )}
      </section>

      <section aria-label="Oportunidades para organizadores" className="mt-12 rounded-2xl border border-border bg-card p-5 sm:p-6">
        <h2 className="text-lg font-bold">🎯 Para organizadores: dónde hay demanda sin cubrir</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Cruzamos lo que la gente pide con los eventos publicados. Cuanto más alto el puntaje, más gente interesada y menos oferta{geo ? ' cerca de ti' : ''}.
        </p>
        {demandQuery.isLoading ? (
          <div className="mt-4 h-24 animate-pulse rounded-xl bg-muted" />
        ) : !hasDemand ? (
          <p className="mt-4 text-sm text-muted-foreground">Aún no hay suficientes votos para mostrar oportunidades. ¡Comparte esta página para que más gente participe!</p>
        ) : (
          <ul className="mt-4 grid gap-3 md:grid-cols-2">
            {opportunities.filter(o => o.demand > 0).slice(0, 6).map(o => {
              const top = o.topIdeas[0]
              const href = `/events/create?${new URLSearchParams({ category: o.category, ...(top ? { title: top.title, idea: top._id } : {}) }).toString()}`
              return (
                <li key={o.category} className="rounded-xl border border-border p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-semibold"><span aria-hidden="true">{o.emoji}</span> {o.label}</p>
                    <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-bold text-primary">Oportunidad {o.gapScore}</span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{o.demand} votos · {o.ideas} ideas · {o.upcomingEvents} eventos próximos</p>
                  {top && <p className="mt-2 text-sm">Más pedida: <strong>{top.title}</strong> ({top.supporters})</p>}
                  <Link href={isAuthenticated ? href : '/login?redirect=%2Fideas'} className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline">
                    Crear este evento <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
        <p className="mt-4 flex items-center gap-1.5 text-xs text-muted-foreground"><MapPin className="h-3.5 w-3.5" aria-hidden="true" />Los votos son anónimos: los organizadores solo ven totales por zona y categoría.</p>
      </section>
    </main>
  )
}
