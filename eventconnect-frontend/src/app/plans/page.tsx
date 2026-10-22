'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, ArrowRight, Check, Users, Zap, Plus, Sparkles, MessageCircle, MapPin, Clock } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { apiClient } from '@/lib/api/client'
import { plansApi } from '@/lib/api/plans'
import toast from 'react-hot-toast'

interface EventChoice {
  _id: string
  title: string
  date: string
  isPrivate?: boolean
  ageRestriction?: { minAge?: number; maxAge?: number; isAdultOnly?: boolean }
  price?: { amount: number; currency: string }
}

interface SpontaneousCoroItem {
  _id: string
  title: string
  mood: string
  city: string
  meetingSpot: string
  timeSlot: string
  maxMembers: number
  creator?: { firstName?: string; lastName?: string; username?: string; avatar?: string }
  members: Array<{ user?: { firstName?: string; lastName?: string; username?: string; avatar?: string }; status: string }>
  isMember?: boolean
  isCreator?: boolean
  createdAt: string
}

const errorText = (error: any) => error?.response?.data?.message || 'No pudimos completar la solicitud. Inténtalo de nuevo.'

const MOODS = [
  { id: 'all', label: 'Todas las vibras', emoji: '✨' },
  { id: 'cafe', label: 'Café & Charla', emoji: '☕' },
  { id: 'art', label: 'Arte & Museos', emoji: '🎨' },
  { id: 'outdoors', label: 'Parque & Aire Libre', emoji: '🍃' },
  { id: 'music', label: 'Música en Vivo', emoji: '🎵' },
  { id: 'gaming', label: 'Juegos & Rol', emoji: '🎲' },
  { id: 'food', label: 'Comida Rica', emoji: '🍽️' },
  { id: 'party', label: 'Fiesta & Baile', emoji: '🪩' },
]

const TIME_SLOTS = [
  { id: 'now', label: '¡Ahora mismo!' },
  { id: 'afternoon', label: 'Esta tarde' },
  { id: 'evening', label: 'Al atardecer' },
  { id: 'night', label: 'Esta noche' },
]

export default function PlansPage() {
  const { user, isAuthenticated } = useAuthStore()
  return <PlansWorkspace key={isAuthenticated ? user?.id || user?._id : 'guest'} />
}

function PlansWorkspace() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const { user, isAuthenticated } = useAuthStore()
  const owner = isAuthenticated ? user?.id || user?._id || '' : ''
  const alive = useRef(true)
  const creationLock = useRef(false)
  useEffect(() => { alive.current = true; return () => { alive.current = false } }, [])
  const current = () => {
    const session = useAuthStore.getState()
    return alive.current && (session.isAuthenticated ? session.user?.id || session.user?._id || '' : '') === owner
  }

  // Tab State: 'group-vote' vs 'spontaneous'
  const [activeTab, setActiveTab] = useState<'group-vote' | 'spontaneous'>('group-vote')

  // Group Plan Voting state
  const [title, setTitle] = useState('¿Qué hacemos este fin de semana?')
  const [selected, setSelected] = useState<string[]>([])
  const [hours, setHours] = useState(72)
  const [query, setQuery] = useState('')

  // Spontaneous Coro state
  const [selectedCity, setSelectedCity] = useState('Santo Domingo')
  const [selectedMood, setSelectedMood] = useState('all')
  const [isCreateCoroOpen, setIsCreateCoroOpen] = useState(false)
  const [newCoroForm, setNewCoroForm] = useState({
    title: '',
    mood: 'cafe',
    city: 'Santo Domingo',
    meetingSpot: '',
    timeSlot: 'now',
    maxMembers: 5
  })

  // Queries
  const events = useQuery({
    queryKey: ['plan-event-options', owner],
    queryFn: async () => {
      const response = await apiClient.get('/events', { params: { limit: 100, timeFilter: 'upcoming' } })
      const items: EventChoice[] = response.data.events || response.data.data || []
      return items.filter(event => !event.isPrivate && !event.ageRestriction?.isAdultOnly &&
        (event.ageRestriction?.minAge || 0) === 0 && (event.ageRestriction?.maxAge || 0) === 0 && new Date(event.date) > new Date())
    }
  })
  const mine = useQuery({ queryKey: ['my-group-plans', owner], queryFn: plansApi.mine, enabled: isAuthenticated })

  const spontaneousQuery = useQuery({
    queryKey: ['spontaneous-coros', selectedCity, selectedMood, owner],
    queryFn: async () => {
      const res = await apiClient.get('/plans/spontaneous', {
        params: { city: selectedCity, mood: selectedMood }
      })
      return (res.data?.data || []) as SpontaneousCoroItem[]
    },
    enabled: activeTab === 'spontaneous',
    refetchInterval: 15_000
  })

  // Mutations
  const create = useMutation({
    mutationFn: () => plansApi.create(title, selected, hours),
    onSuccess: plan => { if (current()) router.push(`/plans/${plan.shareToken}`) },
    onSettled: () => { creationLock.current = false }
  })

  const joinCoro = useMutation({
    mutationFn: async (coroId: string) => {
      const res = await apiClient.post(`/plans/spontaneous/${coroId}/join`)
      return res.data
    },
    onSuccess: () => {
      toast.success('¡Te uniste al coro! Ya están coordinando.')
      queryClient.invalidateQueries({ queryKey: ['spontaneous-coros'] })
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'No pudiste unirte al coro')
    }
  })

  const createCoro = useMutation({
    mutationFn: async () => {
      const res = await apiClient.post('/plans/spontaneous', { ...newCoroForm, city: selectedCity, title: newCoroForm.title.trim() })
      return res.data
    },
    onSuccess: () => {
      toast.success('¡Faro de coro lanzado! Otros miembros de la zona podrán sumarse.')
      setIsCreateCoroOpen(false)
      setNewCoroForm({
        title: '',
        mood: 'cafe',
        city: selectedCity,
        meetingSpot: '',
        timeSlot: 'now',
        maxMembers: 5
      })
      queryClient.invalidateQueries({ queryKey: ['spontaneous-coros'] })
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Error al crear el coro espontáneo')
    }
  })

  const visible = (events.data || []).filter(event => event.title.toLocaleLowerCase('es').includes(query.toLocaleLowerCase('es')))
  const toggle = (id: string) => setSelected(current => current.includes(id) ? current.filter(value => value !== id) : current.length < 3 ? [...current, id] : current)
  const openCoro = () => {
    if (!isAuthenticated) { router.push('/login?redirect=%2Fplans'); return }
    setIsCreateCoroOpen(true)
  }

  return (
    <main className="min-h-screen bg-background px-5 py-8 pb-28 text-foreground sm:px-8">
      <div className="mx-auto max-w-5xl">
        <Link href="/" className="inline-flex min-h-11 items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft size={16} /> Volver a descubrir
        </Link>

        {/* Top Header */}
        <header className="border-b border-border py-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2 text-sm font-bold text-primary mb-2">
                <Users size={18} />
                <span>Coordinación Social & Coros</span>
              </div>
              <h1 className="text-3xl font-semibold tracking-tight sm:text-5xl">
                Planes con tu Gente
              </h1>
              <p className="mt-2 text-sm text-muted-foreground max-w-xl">
                Vota opciones para el fin de semana o únete a un coro espontáneo para salir hoy mismo.
              </p>
            </div>

            {/* Mode Switcher Tabs */}
            <div className="flex flex-wrap gap-1 rounded-2xl bg-muted/50 p-1.5">
              <button
                aria-pressed={activeTab === 'group-vote'}
                onClick={() => setActiveTab('group-vote')}
                className={`flex min-h-12 items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                  activeTab === 'group-vote'
                    ? 'bg-primary text-white shadow-md'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Users className="h-4 w-4" />
                <span>Votación de Grupo</span>
              </button>
              <button
                aria-pressed={activeTab === 'spontaneous'}
                onClick={() => setActiveTab('spontaneous')}
                className={`flex min-h-12 items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                  activeTab === 'spontaneous'
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Zap className="h-4 w-4" />
                <span>⚡ Coro Espontáneo (Hoy)</span>
              </button>
            </div>
          </div>
        </header>

        {/* ─── TAB 1: Coro Espontáneo (Flash Hangouts) ─────────────────────────── */}
        {activeTab === 'spontaneous' && (
          <div className="py-8">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-foreground">¿Quién se anima a salir hoy?</h2>
                <p className="text-xs text-muted-foreground">Micro-grupos (3 a 5 personas) con tu misma vibra hoy en República Dominicana</p>
              </div>

              <button
                onClick={openCoro}
                className="flex items-center gap-2 rounded-2xl bg-primary px-5 py-2.5 text-xs font-semibold text-white shadow-lg hover:scale-102 active:scale-98 transition-all"
              >
                <Plus className="h-4 w-4" />
                <span>Lanzar mi Faro de Coro</span>
              </button>
            </div>

            {/* Filters Bar */}
            <div className="mb-8 flex flex-wrap items-center gap-3">
              <select
                aria-label="Ciudad del coro"
                value={selectedCity}
                onChange={e => setSelectedCity(e.target.value)}
                className="rounded-xl border border-border bg-card px-3.5 py-2 text-xs font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="Santo Domingo">📍 Santo Domingo</option>
                <option value="Santiago">📍 Santiago de los Caballeros</option>
                <option value="Puerto Plata">📍 Puerto Plata</option>
                <option value="Punta Cana">📍 Punta Cana / Bávaro</option>
                <option value="La Romana">📍 La Romana</option>
              </select>

              <div className="flex flex-wrap gap-2">
                {MOODS.map(m => (
                  <button
                    key={m.id}
                    onClick={() => setSelectedMood(m.id)}
                    className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
                      selectedMood === m.id
                        ? 'bg-primary text-white shadow-sm'
                        : 'bg-card border border-border text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <span>{m.emoji}</span> {m.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Create Coro Modal */}
            {isCreateCoroOpen && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md">
                <div className="w-full max-w-lg rounded-3xl border border-white/10 bg-card p-6 shadow-2xl">
                  <div className="flex items-center justify-between border-b border-border pb-4">
                    <h3 className="text-xl font-bold text-foreground">Lanzar Faro de Coro para Hoy</h3>
                    <button onClick={() => setIsCreateCoroOpen(false)} className="rounded-full p-1 text-muted-foreground hover:text-foreground">
                      ✕
                    </button>
                  </div>

                  <form
                    onSubmit={e => {
                      e.preventDefault()
                      createCoro.mutate()
                    }}
                    className="mt-4 space-y-4"
                  >
                    <div>
                      <label htmlFor="coro-title" className="mb-1 block text-xs font-bold text-foreground">¿Cuál es el plan?</label>
                      <input
                        id="coro-title"
                        type="text"
                        required
                        minLength={4}
                        maxLength={80}
                        placeholder="Ej. Caminata y café por Zona Colonial"
                        value={newCoroForm.title}
                        onChange={e => setNewCoroForm(prev => ({ ...prev, title: e.target.value }))}
                        className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="mb-1 block text-xs font-bold text-foreground">Vibra / Mood</label>
                        <select
                          value={newCoroForm.mood}
                          onChange={e => setNewCoroForm(prev => ({ ...prev, mood: e.target.value }))}
                          className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs text-foreground"
                        >
                          {MOODS.filter(m => m.id !== 'all').map(m => (
                            <option key={m.id} value={m.id}>{m.emoji} {m.label}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="mb-1 block text-xs font-bold text-foreground">Horario</label>
                        <select
                          value={newCoroForm.timeSlot}
                          onChange={e => setNewCoroForm(prev => ({ ...prev, timeSlot: e.target.value }))}
                          className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs text-foreground"
                        >
                          {TIME_SLOTS.map(t => (
                            <option key={t.id} value={t.id}>{t.label}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div>
                      <label htmlFor="coro-meeting-spot" className="mb-1 block text-xs font-bold text-foreground">Punto de encuentro público sugerido en {selectedCity}</label>
                      <input
                        id="coro-meeting-spot"
                        maxLength={120}
                        type="text"
                        placeholder="Ej. Plaza España, Parque Mirador Sur, Ágora Mall..."
                        value={newCoroForm.meetingSpot}
                        onChange={e => setNewCoroForm(prev => ({ ...prev, meetingSpot: e.target.value }))}
                        className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>

                    <div className="flex justify-end gap-3 pt-3">
                      <button
                        type="button"
                        onClick={() => setIsCreateCoroOpen(false)}
                        className="rounded-xl px-4 py-2 text-xs font-bold text-muted-foreground hover:bg-muted"
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        disabled={createCoro.isPending || newCoroForm.title.trim().length < 4}
                        className="rounded-xl bg-primary px-5 py-2.5 text-xs font-bold text-white shadow-md hover:bg-primary/90 disabled:opacity-50"
                      >
                        {createCoro.isPending ? 'Lanzando faro...' : 'Publicar Faro'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* Coros List */}
            {spontaneousQuery.isLoading ? (
              <div className="py-12 text-center text-sm text-muted-foreground">Buscando coros activos hoy…</div>
            ) : spontaneousQuery.isError ? (
              <div role="alert" className="rounded-2xl border border-border p-6">
                <p>No pudimos cargar los coros de esta zona.</p>
                <button onClick={() => void spontaneousQuery.refetch()} className="mt-3 min-h-11 text-primary underline">Reintentar</button>
              </div>
            ) : spontaneousQuery.data?.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-border bg-card/40 p-12 text-center">
                <Sparkles className="mx-auto mb-3 h-10 w-10 text-primary/60" />
                <h3 className="text-xl font-bold">Aún no hay coros abiertos para hoy</h3>
                <p className="mt-2 text-sm text-muted-foreground max-w-md mx-auto">
                  Sé el primero en lanzar un faro con lo que te gustaría hacer y reúne a 3 o 4 personas de tu zona.
                </p>
                <button
                  onClick={openCoro}
                  className="mt-5 rounded-2xl bg-primary px-6 py-2.5 text-xs font-bold text-white shadow-lg"
                >
                  Lanzar mi Faro Ahora
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {spontaneousQuery.data?.map(coro => {
                  const moodMeta = MOODS.find(m => m.id === coro.mood) || MOODS[0]
                  const confirmedCount = (coro.members || []).filter(m => m.status === 'confirmed').length
                  return (
                    <div
                      key={coro._id}
                      className="group flex flex-col justify-between rounded-3xl border border-white/10 bg-card p-5 shadow-lg transition-all hover:border-primary/40 hover:shadow-2xl"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-3">
                          <span className="flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
                            <span>{moodMeta.emoji}</span>
                            <span>{moodMeta.label}</span>
                          </span>
                          <span className="flex items-center gap-1 text-xs font-semibold text-muted-foreground">
                            <Clock className="h-3.5 w-3.5" />
                            <span>{TIME_SLOTS.find(t => t.id === coro.timeSlot)?.label || 'Hoy'}</span>
                          </span>
                        </div>

                        <h3 className="text-lg font-bold leading-snug text-foreground group-hover:text-primary transition-colors">
                          {coro.title}
                        </h3>

                        <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                          <MapPin className="h-3.5 w-3.5 shrink-0 text-amber-500" />
                          <span>{coro.meetingSpot} · {coro.city}</span>
                        </p>
                      </div>

                      <div className="mt-5 border-t border-border/50 pt-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="flex -space-x-2">
                              {coro.members.slice(0, 3).map((m, idx) => (
                                <div
                                  key={idx}
                                  className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-card bg-primary/20 text-[10px] font-bold text-primary"
                                >
                                  {m.user?.firstName?.[0] || 'U'}
                                </div>
                              ))}
                            </div>
                            <span className="text-xs font-semibold text-muted-foreground">
                              {confirmedCount}/{coro.maxMembers} personas
                            </span>
                          </div>

                          {coro.isMember ? (
                            <span className="flex items-center gap-1 rounded-xl bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-400">
                              <Check className="h-3.5 w-3.5" /> Estás dentro
                            </span>
                          ) : (
                            <button
                              onClick={() => {
                                if (!isAuthenticated) router.push('/login?redirect=%2Fplans')
                                else joinCoro.mutate(coro._id)
                              }}
                              disabled={joinCoro.isPending || confirmedCount >= coro.maxMembers}
                              className="rounded-xl bg-primary px-4 py-1.5 text-xs font-bold text-white shadow-md hover:bg-primary/90 active:scale-95 disabled:opacity-50"
                            >
                              {confirmedCount >= coro.maxMembers ? 'Lleno' : 'Unirme'}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ─── TAB 2: Votación de Grupo (Existente) ───────────────────────────── */}
        {activeTab === 'group-vote' && (
          <>
            <header className="grid gap-6 border-b border-border py-9 md:grid-cols-[1fr_280px]">
              <div>
                <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-primary">
                  <Users size={18} /> Planes en grupo
                </p>
                <h2 className="max-w-xl text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
                  Del “hay que salir”<br />al “nos vemos allí”.
                </h2>
                <p className="mt-4 max-w-lg leading-relaxed text-muted-foreground">
                  Elige algunos eventos, comparte la votación y decide con tu gente. Tus amigos pueden votar sin crear una cuenta.
                </p>
              </div>
              <ol className="space-y-4 self-end rounded-2xl bg-primary/5 p-6 text-sm">
                <li><strong className="mr-3 text-primary">01</strong> Propón de dos a tres opciones.</li>
                <li><strong className="mr-3 text-primary">02</strong> Comparte el enlace con tu grupo.</li>
                <li><strong className="mr-3 text-primary">03</strong> Confirma el plan más votado.</li>
              </ol>
            </header>

            <form
              className="grid gap-8 py-9 md:grid-cols-[1fr_280px]"
              onSubmit={event => {
                event.preventDefault()
                if (!isAuthenticated) { router.push('/login?redirect=%2Fplans'); return }
                if (!current() || creationLock.current) return
                creationLock.current = true; create.mutate()
              }}
            >
              <section aria-label="Elegir opciones">
                <label htmlFor="plan-title" className="mb-2 block font-semibold">Ponle nombre al plan</label>
                <input
                  id="plan-title"
                  required
                  minLength={4}
                  maxLength={80}
                  value={title}
                  onChange={event => setTitle(event.target.value)}
                  className="mb-6 min-h-12 w-full rounded-xl border border-border bg-card px-4 focus-visible:outline-primary"
                />

                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-xl font-semibold">¿Entre cuáles elegimos?</h3>
                  <span className="text-sm text-muted-foreground">{selected.length}/3 elegidos</span>
                </div>

                <label htmlFor="plan-search" className="sr-only">Buscar entre los eventos disponibles</label>
                <input
                  id="plan-search"
                  type="search"
                  placeholder="Busca un concierto, taller o encuentro…"
                  value={query}
                  onChange={event => setQuery(event.target.value)}
                  className="mb-4 min-h-12 w-full rounded-xl border border-border bg-card px-4"
                />

                {events.isLoading && <p role="status">Cargando eventos disponibles…</p>}
                {events.isError && (
                  <p role="alert">No pudimos cargar los eventos. <button type="button" className="underline" onClick={() => void events.refetch()}>Reintentar</button></p>
                )}
                {!events.isLoading && !events.isError && !visible.length && (
                  <div className="rounded-2xl border border-dashed border-border p-7">
                    <p className="font-semibold">Todavía no hay opciones para esa búsqueda.</p>
                    <p className="mt-2 text-sm text-muted-foreground">Puedes explorar otros planes o publicar un evento para tu comunidad.</p>
                    <Link href="/events/create" className="mt-4 inline-flex min-h-11 items-center text-primary underline">Crear un evento</Link>
                  </div>
                )}

                <div className="space-y-3">
                  {visible.map(event => (
                    <label
                      key={event._id}
                      className={`flex cursor-pointer gap-4 rounded-xl border p-4 transition-all ${
                        selected.includes(event._id) ? 'border-primary bg-primary/5' : 'border-border bg-card'
                      }`}
                    >
                      <input
                        type="checkbox"
                        className="mt-1 h-5 w-5 accent-primary"
                        checked={selected.includes(event._id)}
                        disabled={create.isPending || (selected.length >= 3 && !selected.includes(event._id))}
                        onChange={() => toggle(event._id)}
                      />
                      <span>
                        <strong className="block">{event.title}</strong>
                        <span className="mt-1 block text-sm text-muted-foreground">
                          {new Date(event.date).toLocaleString('es-DO', { dateStyle: 'medium', timeStyle: 'short' })}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          {event.price?.amount ? `${event.price.amount} ${event.price.currency}` : 'Gratis'}
                        </span>
                      </span>
                    </label>
                  ))}
                </div>
                <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
                  La votación compartida admite eventos públicos sin restricción de edad. No muestra ubicaciones secretas.
                </p>
              </section>

              <aside className="h-fit rounded-2xl border border-border bg-card p-6 md:sticky md:top-24">
                <h3 className="text-lg font-semibold">La próxima salida empieza aquí</h3>
                <p className="my-4 text-sm leading-relaxed text-muted-foreground">
                  Cada persona elige una opción y puede cambiar su voto mientras la votación esté abierta.
                </p>
                <label htmlFor="plan-hours" className="mb-2 block text-sm font-medium">Tiempo para decidir</label>
                <select
                  id="plan-hours"
                  value={hours}
                  onChange={event => setHours(Number(event.target.value))}
                  className="mb-5 min-h-12 w-full rounded-xl border border-border bg-background px-3"
                >
                  <option value={24}>Un día</option>
                  <option value={72}>Tres días</option>
                  <option value={168}>Una semana</option>
                </select>

                {create.isError && <p role="alert" className="mb-4 text-sm text-red-600">{errorText(create.error)}</p>}
                <button
                  disabled={selected.length < 2 || create.isPending || title.trim().length < 4}
                  className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 font-semibold text-primary-foreground disabled:opacity-50"
                >
                  {create.isPending ? 'Creando votación…' : isAuthenticated ? 'Crear enlace para mi grupo' : 'Entrar y crear votación'}
                  <ArrowRight size={16} />
                </button>
                <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
                  El plazo terminará antes si comienza uno de los eventos. Votar no cobra ni reserva entradas. Cada persona confirma su asistencia en el evento elegido.
                </p>
              </aside>
            </form>

            {isAuthenticated && (
              <section className="border-t border-border pt-8">
                <h3 className="mb-4 text-xl font-semibold">Tus votaciones recientes</h3>
                {mine.isError && (
                  <p role="alert">No pudimos cargar tus votaciones. <button onClick={() => void mine.refetch()} className="underline">Reintentar</button></p>
                )}
                {mine.isLoading && <p role="status">Cargando tus grupos…</p>}
                {mine.data?.length === 0 && <p className="text-muted-foreground">Tu primer grupo aparecerá aquí cuando crees una votación.</p>}
                <div className="divide-y divide-border">
                  {mine.data?.map(plan => (
                    <Link key={plan.shareToken} href={`/plans/${plan.shareToken}`} className="flex min-h-16 items-center justify-between gap-4 py-4">
                      <span>
                        <strong>{plan.title}</strong>
                        <small className="block text-muted-foreground">
                          {plan.totalVotes} votos · {plan.status === 'decided' ? 'Plan confirmado' : plan.status === 'expired' ? 'Plazo terminado' : 'Votación abierta'}
                        </small>
                      </span>
                      {plan.status === 'decided' ? <Check size={18} /> : <ArrowRight size={18} />}
                    </Link>
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </main>
  )
}
