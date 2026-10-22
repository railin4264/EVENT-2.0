'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Bell, Mail, Smartphone, Calendar, MessageSquare, Zap } from 'lucide-react'
import { apiClient } from '@/lib/api/client'
import toast from 'react-hot-toast'

interface NotificationSettingsProps {
  user: { id?: string; _id?: string } | null | undefined
}

interface NotificationPreferences {
  email: boolean
  push: boolean
  eventReminders: boolean
  newMessages: boolean
  weeklyDigest: boolean
  friendPlans: boolean
  shareAttendance: boolean
}

type PreferenceKey = keyof NotificationPreferences
type SettingsResponse = Record<string, unknown> & { notifications?: Record<string, unknown> }
type Change = { userId: string; requestId: number; key: PreferenceKey; value: boolean }
const emptyPreferences: NotificationPreferences = { email: false, push: false, eventReminders: false, newMessages: false, weeklyDigest: false, friendPlans: false, shareAttendance: false }
const isRecord = (value: unknown): value is Record<string, unknown> => Boolean(value && typeof value === 'object' && !Array.isArray(value))

function readPreferences(value: unknown): NotificationPreferences {
  const notifications = isRecord(value) ? value : {}
  return Object.fromEntries(Object.keys(emptyPreferences).map(key => [key, notifications[key] === true])) as unknown as NotificationPreferences
}

function messageFor(error: unknown, fallback: string) {
  const candidate = error as { response?: { data?: { message?: unknown } }; message?: unknown }
  const message = candidate?.response?.data?.message || candidate?.message
  return typeof message === 'string' && message.trim() ? message : fallback
}

const channels = [
  { key: 'email', label: 'Notificaciones por email', description: 'Permite los avisos que elijas por correo electrónico.', icon: Mail, color: 'text-blue-400 bg-blue-500/10' },
  { key: 'push', label: 'Notificaciones push', description: 'Guarda tu preferencia para avisos en dispositivos compatibles.', icon: Smartphone, color: 'text-purple-400 bg-purple-500/10' },
] as const
const activities = [
  { key: 'friendPlans', label: 'Planes de mis amigos', description: 'Recibe avisos de asistencia de personas que sigues y que también te siguen, cuando ellas lo permitan.', icon: Calendar, color: 'text-purple-400 bg-purple-500/10' },
  { key: 'shareAttendance', label: 'Compartir mi asistencia con amigos', description: 'Permite avisar a tus amigos mutuos cuando confirmes un evento público. No incluye eventos privados ni ubicaciones secretas.', icon: Bell, color: 'text-purple-400 bg-purple-500/10' },
  { key: 'eventReminders', label: 'Recordatorios de eventos', description: 'Avisos antes de tus próximos eventos.', icon: Calendar, color: 'text-green-400 bg-green-500/10' },
  { key: 'newMessages', label: 'Nuevos mensajes', description: 'Avisos cuando recibas un mensaje.', icon: MessageSquare, color: 'text-yellow-400 bg-yellow-500/10' },
  { key: 'weeklyDigest', label: 'Resumen semanal', description: 'Un resumen de actividades de la comunidad.', icon: Zap, color: 'text-orange-400 bg-orange-500/10' },
] as const

export default function NotificationSettings({ user }: NotificationSettingsProps) {
  const queryClient = useQueryClient()
  const rawId = user?.id || user?._id
  const userId = typeof rawId === 'string' ? rawId : ''
  const queryKey = ['settings', userId]
  const controlId = useId()
  const identityRef = useRef(userId)
  identityRef.current = userId
  const mountedRef = useRef(true)
  const sequence = useRef(0)
  const writeLock = useRef<number | null>(null)
  const [optimistic, setOptimistic] = useState<{ change: Change; settings: NotificationPreferences } | null>(null)
  const [saveError, setSaveError] = useState<{ change: Change; message: string } | null>(null)

  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false } }, [])
  useEffect(() => { setOptimistic(null); setSaveError(null) }, [userId])

  const query = useQuery<SettingsResponse>({
    queryKey,
    queryFn: async ({ signal }) => {
      const response = await apiClient.get('/users/me/settings', { signal })
      if (!isRecord(response.data?.settings)) throw new Error('No pudimos leer tus preferencias de notificación.')
      return response.data.settings
    },
    enabled: Boolean(userId),
    retry: false,
  })

  const persisted = readPreferences(query.data?.notifications)
  const settings = optimistic?.change.userId === userId ? optimistic.settings : persisted
  const currentSaveError = saveError?.change.userId === userId ? saveError : null
  const isCurrent = (change: Change) => mountedRef.current && identityRef.current === change.userId

  const mutation = useMutation({
    mutationFn: async (change: Change) => {
      if (!isCurrent(change)) throw new Error('La sesión cambió antes de guardar las preferencias.')
      await queryClient.cancelQueries({ queryKey: ['settings', change.userId], exact: true })
      if (!isCurrent(change)) throw new Error('La sesión cambió antes de guardar las preferencias.')
      // This dedicated route updates one field with $set; it does not replace settings.
      const response = await apiClient.put('/users/me/notifications', { [change.key]: change.value })
      const notifications = response.data?.notifications
      if (response.data?.success === false || !isRecord(notifications) || notifications[change.key] !== change.value) {
        throw new Error('El servidor no confirmó el cambio. Vuelve a intentarlo.')
      }
      return notifications
    },
    onSuccess: (notifications, change) => {
      if (!isCurrent(change)) return
      queryClient.setQueryData<SettingsResponse>(['settings', change.userId], current => current && ({
        ...current,
        notifications: { ...(isRecord(current.notifications) ? current.notifications : {}), [change.key]: notifications[change.key] },
      }))
      setOptimistic(null)
      setSaveError(null)
      toast.success('Preferencias de notificación actualizadas')
    },
    onError: (error, change) => {
      if (!isCurrent(change)) return
      setOptimistic(null)
      const message = messageFor(error, 'No pudimos guardar el cambio. Tus preferencias anteriores se mantienen.')
      setSaveError({ change, message })
      toast.error(message)
    },
    onSettled: (_data, _error, change) => {
      if (writeLock.current === change.requestId) writeLock.current = null
      if (mountedRef.current) setOptimistic(current => current?.change.requestId === change.requestId ? null : current)
    },
  })

  const canChange = Boolean(userId && query.isSuccess && !query.isFetching && !mutation.isPending)
  const commit = (key: PreferenceKey, value: boolean) => {
    if (!canChange || writeLock.current !== null) return
    const change = { userId, key, value, requestId: ++sequence.current }
    writeLock.current = change.requestId
    setSaveError(null)
    setOptimistic({ change, settings: { ...settings, [key]: value } })
    mutation.mutate(change)
  }

  const renderToggle = (option: (typeof channels)[number] | (typeof activities)[number]) => {
    const Icon = option.icon
    return (
      <div key={option.key} className="flex items-center justify-between gap-4 rounded-xl bg-white/5 p-4">
        <label htmlFor={`${controlId}-${option.key}`} className="flex min-w-0 flex-1 items-center gap-3">
          <span className={`rounded-lg p-2 ${option.color}`}><Icon className="h-5 w-5" /></span>
          <span>
            <span className="block font-medium text-foreground">{option.label}</span>
            <span className="mt-1 block text-sm text-muted-foreground">{option.description}</span>
          </span>
        </label>
        <label htmlFor={`${controlId}-${option.key}`} className="relative inline-flex shrink-0 cursor-pointer items-center">
          <input id={`${controlId}-${option.key}`} type="checkbox" aria-label={option.label}
            checked={settings[option.key]} disabled={!canChange}
            onChange={() => commit(option.key, !settings[option.key])}
            className="peer sr-only" />
          <span aria-hidden="true" className="pointer-events-none h-6 w-11 rounded-full bg-slate-600 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-transform after:content-[''] peer-checked:bg-primary peer-checked:after:translate-x-5 peer-focus-visible:ring-2 peer-focus-visible:ring-primary peer-focus-visible:ring-offset-2 peer-disabled:opacity-40" />
        </label>
      </div>
    )
  }

  return (
    <div className="space-y-6" aria-busy={query.isFetching || mutation.isPending}>
      <div>
        <h2 className="mb-2 text-2xl font-bold text-foreground">Notificaciones</h2>
        <p className="text-muted-foreground">Tú eliges los canales y los avisos que quieres recibir.</p>
      </div>
      {!userId && <p role="alert" className="text-sm text-muted-foreground">Inicia sesión para consultar tus preferencias.</p>}
      {userId && query.isPending && <p role="status" className="text-sm text-muted-foreground">Cargando tus preferencias…</p>}
      {query.isError && <div role="alert" className="rounded-2xl border border-red-400/30 bg-red-500/5 p-4 text-sm">
        <p>{messageFor(query.error, 'No pudimos cargar tus preferencias.')}</p>
        <button type="button" disabled={query.isFetching} onClick={() => { void query.refetch() }} className="mt-2 font-semibold text-primary underline">Reintentar carga</button>
      </div>}
      {currentSaveError && <div role="alert" className="rounded-2xl border border-red-400/30 bg-red-500/5 p-4 text-sm">
        <p>{currentSaveError.message}</p>
        <button type="button" disabled={!canChange} onClick={() => commit(currentSaveError.change.key, currentSaveError.change.value)} className="mt-2 font-semibold text-primary underline">Reintentar guardado</button>
      </div>}
      {mutation.isPending && <p role="status" className="text-sm text-muted-foreground">Guardando cambio…</p>}
      <section className="glass rounded-2xl border border-white/10 bg-white/5 p-6">
        <h3 className="mb-4 text-lg font-semibold text-foreground">Canales de notificación</h3>
        <div className="space-y-4">{channels.map(renderToggle)}</div>
      </section>
      <section className="glass rounded-2xl border border-white/10 bg-white/5 p-6">
        <h3 className="mb-4 text-lg font-semibold text-foreground">Avisos de actividad</h3>
        <div className="space-y-4">{activities.map(renderToggle)}</div>
      </section>
      <div className="flex gap-3 rounded-2xl border border-primary/20 bg-primary/5 p-5 text-sm text-muted-foreground">
        <Bell className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
        <p>Los canales permanecen desactivados hasta que los elijas. Esta pantalla guarda tus preferencias y no solicita permisos del dispositivo.</p>
      </div>
    </div>
  )
}
