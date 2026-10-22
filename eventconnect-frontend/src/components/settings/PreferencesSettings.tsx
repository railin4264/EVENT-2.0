'use client'

import { useEffect, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTheme } from 'next-themes'
import { Sun, Moon, Monitor, Globe, Clock, SlidersHorizontal } from 'lucide-react'
import { apiClient } from '@/lib/api/client'
import toast from 'react-hot-toast'
import ContentFilterModal from '@/components/discovery/ContentFilterModal'

interface PreferencesSettingsProps {
  user: { id?: string; _id?: string; settings?: unknown } | null | undefined
}
type Settings = Record<string, unknown> & { preferences?: Record<string, unknown> }
type PreferenceKey = 'theme' | 'language' | 'timezone'
type Change = { userId: string; requestId: number; key: PreferenceKey; value: string; previousTheme?: string }
const isRecord = (value: unknown): value is Record<string, unknown> => Boolean(value && typeof value === 'object' && !Array.isArray(value))
const themeOptions = [
  { value: 'light', label: 'Claro', icon: Sun },
  { value: 'dark', label: 'Oscuro', icon: Moon },
  { value: 'system', label: 'Sistema', icon: Monitor },
] as const
const timezones = [
  ['America/Santo_Domingo', 'Santo Domingo'], ['America/Puerto_Rico', 'San Juan'],
  ['America/New_York', 'Nueva York / Miami'], ['America/Bogota', 'Bogotá'],
  ['America/Mexico_City', 'Ciudad de México'], ['America/Cancun', 'Cancún'],
  ['America/Los_Angeles', 'Los Ángeles'], ['Europe/Madrid', 'Madrid'],
  ['Europe/London', 'Londres'], ['Asia/Tokyo', 'Tokio'],
]
function messageFor(error: unknown, fallback: string) {
  const candidate = error as { response?: { data?: { message?: unknown } }; message?: unknown }
  const message = candidate?.response?.data?.message || candidate?.message
  return typeof message === 'string' && message.trim() ? message : fallback
}

export default function PreferencesSettings({ user }: PreferencesSettingsProps) {
  const queryClient = useQueryClient()
  const { theme, setTheme } = useTheme()
  const rawId = user?.id || user?._id
  const userId = typeof rawId === 'string' ? rawId : ''
  const identity = useRef(userId)
  identity.current = userId
  const mounted = useRef(true)
  const sequence = useRef(0)
  const writeLock = useRef<number | null>(null)
  const [optimistic, setOptimistic] = useState<Change | null>(null)
  const [saveError, setSaveError] = useState<{ change: Change; message: string } | null>(null)
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false)

  useEffect(() => { mounted.current = true; return () => { mounted.current = false } }, [])
  useEffect(() => { setOptimistic(null); setSaveError(null); setIsFilterModalOpen(false) }, [userId])
  const isCurrent = (change: Change) => mounted.current && identity.current === change.userId
  const query = useQuery<Settings>({
    queryKey: ['settings', userId],
    queryFn: async ({ signal }) => {
      const response = await apiClient.get('/users/me/settings', { signal })
      if (!isRecord(response.data?.settings)) throw new Error('No pudimos leer tus preferencias.')
      return response.data.settings
    },
    enabled: Boolean(userId),
    retry: false,
  })
  const preferences = isRecord(query.data?.preferences) ? query.data.preferences : {}
  const read = (key: PreferenceKey) => optimistic?.userId === userId && optimistic.key === key
    ? optimistic.value : typeof preferences[key] === 'string' ? preferences[key] as string : ''
  const selectedTheme = optimistic?.userId === userId && optimistic.key === 'theme'
    ? optimistic.value : theme || read('theme') || 'system'
  const language = read('language')
  const timezone = read('timezone')
  const currentError = saveError?.change.userId === userId ? saveError : null

  const mutation = useMutation({
    mutationFn: async (change: Change) => {
      if (!isCurrent(change)) throw new Error('La sesión cambió antes de guardar las preferencias.')
      await queryClient.cancelQueries({ queryKey: ['settings', change.userId], exact: true })
      if (!isCurrent(change)) throw new Error('La sesión cambió antes de guardar las preferencias.')
      // Send only this change: content filters and other settings belong to their own controls.
      const response = await apiClient.put('/users/me/settings', { preferences: { [change.key]: change.value } })
      const saved = response.data?.settings?.preferences
      if (response.data?.success === false || !isRecord(saved) || saved[change.key] !== change.value) {
        throw new Error('El servidor no confirmó el cambio. Vuelve a intentarlo.')
      }
      return saved
    },
    onSuccess: (saved, change) => {
      if (!isCurrent(change)) return
      queryClient.setQueryData<Settings>(['settings', change.userId], current => current && ({
        ...current,
        preferences: { ...(isRecord(current.preferences) ? current.preferences : {}), [change.key]: saved[change.key] },
      }))
      setSaveError(null)
      setOptimistic(null)
      toast.success('Preferencia actualizada')
    },
    onError: (error, change) => {
      if (!isCurrent(change)) return
      if (change.key === 'theme') setTheme(change.previousTheme || 'system')
      setOptimistic(null)
      const message = messageFor(error, 'No pudimos guardar el cambio. Se mantiene tu preferencia anterior.')
      setSaveError({ change, message })
      toast.error(message)
    },
    onSettled: (_data, _error, change) => {
      if (writeLock.current === change.requestId) writeLock.current = null
      if (mounted.current) setOptimistic(current => current?.requestId === change.requestId ? null : current)
    },
  })
  const canChange = Boolean(userId && query.isSuccess && !query.isFetching && !mutation.isPending && !isFilterModalOpen)
  const commit = (key: PreferenceKey, value: string) => {
    if (!canChange || writeLock.current !== null || (read(key) === value && (key !== 'theme' || theme === value))) return
    const change = { userId, key, value, requestId: ++sequence.current, previousTheme: theme }
    writeLock.current = change.requestId
    setSaveError(null)
    setOptimistic(change)
    // Use the same provider as the navbar. System mode needs no direct matchMedia call.
    if (key === 'theme') setTheme(value)
    mutation.mutate(change)
  }
  const controlClass = 'rounded-xl border-2 p-4 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-50'
  const sectionClass = 'glass rounded-2xl border border-white/10 bg-white/5 p-5 sm:p-6'

  return (
    <div className="space-y-6" aria-busy={query.isFetching || mutation.isPending}>
      <div><h2 className="mb-2 text-2xl font-bold text-foreground">Preferencias</h2><p className="text-muted-foreground">Personaliza tu experiencia en la plataforma.</p></div>
      {!userId && <p role="alert">Inicia sesión para consultar tus preferencias.</p>}
      {userId && query.isPending && <p role="status" className="text-sm text-muted-foreground">Cargando tus preferencias…</p>}
      {query.isError && <div role="alert" className="rounded-xl border border-red-400/30 p-4 text-sm">
        <p>{messageFor(query.error, 'No pudimos cargar tus preferencias.')}</p>
        <button type="button" disabled={query.isFetching} onClick={() => { void query.refetch() }} className="mt-2 font-semibold text-primary underline">Reintentar carga</button>
      </div>}
      {currentError && <div role="alert" className="rounded-xl border border-red-400/30 p-4 text-sm">
        <p>{currentError.message}</p>
        <button type="button" disabled={!canChange} onClick={() => commit(currentError.change.key, currentError.change.value)} className="mt-2 font-semibold text-primary underline">Reintentar guardado</button>
      </div>}
      {mutation.isPending && <p role="status" className="text-sm text-muted-foreground">Guardando cambio…</p>}

      <section className={sectionClass}>
        <h3 className="mb-1 text-lg font-semibold text-foreground">Tema</h3>
        <p className="mb-4 text-sm text-muted-foreground">Elige el tema de la interfaz.</p>
        <div className="grid grid-cols-3 gap-3">
          {themeOptions.map(({ value, label, icon: Icon }) => <button key={value} type="button" disabled={!canChange}
            aria-pressed={selectedTheme === value} onClick={() => commit('theme', value)}
            className={`${controlClass} ${selectedTheme === value ? 'border-primary bg-primary/10 text-primary' : 'border-white/10 text-foreground hover:bg-white/5'}`}>
            <Icon className="mx-auto mb-3 h-6 w-6" aria-hidden="true" /><span className="text-sm font-medium">{label}</span>
          </button>)}
        </div>
      </section>

      <section className={sectionClass}>
        <h3 className="mb-1 flex items-center gap-2 text-lg font-semibold text-foreground"><Globe className="h-5 w-5 text-primary" aria-hidden="true" />Idioma preferido</h3>
        <p className="mb-4 text-sm text-muted-foreground">La interfaz sigue disponible en español. Guardamos este idioma como preferencia.</p>
        <div className="grid grid-cols-2 gap-3">
          {[['es', 'Español'], ['en', 'English']].map(([value, label]) => <button type="button" key={value} disabled={!canChange}
            aria-pressed={language === value} onClick={() => commit('language', value)}
            className={`${controlClass} ${language === value ? 'border-primary bg-primary/10 text-primary' : 'border-white/10 text-foreground hover:bg-white/5'}`}>{label}</button>)}
        </div>
        {language && !['es', 'en'].includes(language) && <p className="mt-3 text-sm text-muted-foreground">Preferencia guardada: {language}</p>}
      </section>

      <section className={sectionClass}>
        <h3 className="mb-1 flex items-center gap-2 text-lg font-semibold text-foreground"><Clock className="h-5 w-5 text-primary" aria-hidden="true" /><label htmlFor="preference-timezone">Zona horaria</label></h3>
        <p className="mb-4 text-sm text-muted-foreground">Guarda la zona horaria que prefieres para tus eventos.</p>
        <select id="preference-timezone" value={timezone} disabled={!canChange} onChange={event => commit('timezone', event.target.value)}
          className="w-full rounded-xl border border-white/10 bg-background p-3 text-foreground focus:ring-2 focus:ring-primary disabled:opacity-50">
          <option value="" disabled>Selecciona tu zona horaria</option>
          {timezone && !timezones.some(([value]) => value === timezone) && <option value={timezone}>{timezone}</option>}
          {timezones.map(([value, label]) => <option key={value} value={value}>{label} · {value}</option>)}
        </select>
      </section>

      <section className={sectionClass}>
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div><h3 className="mb-1 flex items-center gap-2 text-lg font-semibold text-foreground"><SlidersHorizontal className="h-5 w-5 text-primary" aria-hidden="true" />Filtros de contenido y restricciones</h3>
            <p className="text-sm text-muted-foreground">Oculta contenido sensible o personaliza tus categorías de eventos.</p></div>
          <button type="button" disabled={!canChange} onClick={() => setIsFilterModalOpen(true)}
            className="shrink-0 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-primary">Personalizar Filtros</button>
        </div>
      </section>
      {isFilterModalOpen && userId && <ContentFilterModal isOpen onClose={() => setIsFilterModalOpen(false)}
        currentUser={{ ...user, settings: query.data }}
        onApply={() => { void queryClient.invalidateQueries({ queryKey: ['settings', userId], exact: true }) }} />}
    </div>
  )
}
