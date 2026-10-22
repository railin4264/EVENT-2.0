'use client'

import { useState } from 'react'
import { CheckCircle, Search, X } from 'lucide-react'

interface Request {
  _id?: string
  user: { _id: string; firstName?: string; lastName?: string; username: string }
  message?: string
  requestedAt: string
}
interface Props {
  requests: Request[]
  canManage: boolean
  busy: boolean
  busyUserId?: string
  refreshing?: boolean
  onRefresh: () => void
  onReview: (userId: string, decision: 'approve' | 'reject') => void
  error?: string
  onRetry: () => void
}

export function TribeRequestsPanel({ requests, canManage, busy, busyUserId, refreshing, onRefresh, onReview, error, onRetry }: Props) {
  const [search, setSearch] = useState('')
  const [rejection, setRejection] = useState<string | null>(null)
  if (!canManage) return null
  const filtered = requests.filter(request => `${request.user.firstName || ''} ${request.user.lastName || ''} ${request.user.username}`.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()))
  return <section aria-labelledby="tribe-requests-heading" className="space-y-5 rounded-3xl border border-border bg-card p-5 sm:p-7">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 id="tribe-requests-heading" className="text-xl font-bold tracking-tight">Solicitudes de ingreso <span className="tabular-nums text-muted-foreground">({requests.length})</span></h2>
      <p className="mt-1 max-w-xl text-sm text-muted-foreground">Revisa las presentaciones antes de dar acceso. Administradores y moderadores activos pueden atender esta bandeja.</p></div>
      <button type="button" disabled={busy || refreshing} onClick={onRefresh} className="min-h-11 rounded-xl border border-border px-4 text-sm font-semibold hover:bg-muted focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50">{refreshing ? 'Actualizando…' : 'Actualizar solicitudes'}</button></div>
    {error && <div role="alert" className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm"><p>{error}</p><button type="button" disabled={busy} onClick={onRetry} className="mt-2 min-h-11 font-semibold text-primary underline">Reintentar acción</button></div>}
    {requests.length > 4 && <label className="flex items-center gap-2 rounded-xl border border-border bg-background px-3"><Search className="h-4 w-4 text-muted-foreground" aria-hidden="true" /><input aria-label="Buscar solicitantes" value={search} onChange={event => setSearch(event.target.value)} placeholder="Buscar por nombre o usuario" className="min-h-11 w-full bg-transparent text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary" /></label>}
    {!filtered.length ? <div className="rounded-2xl border border-dashed border-border px-5 py-10 text-center"><CheckCircle className="mx-auto mb-3 h-8 w-8 text-primary" aria-hidden="true" /><p className="font-semibold">{search ? 'No hay coincidencias' : 'No hay solicitudes pendientes'}</p><p className="mt-1 text-sm text-muted-foreground">{search ? 'Prueba con otro nombre o usuario.' : 'Las nuevas solicitudes aparecerán aquí para que puedas revisarlas.'}</p></div>
      : <ul className="space-y-3">{filtered.map(request => { const date = new Date(request.requestedAt); return <li key={request.user._id} className="min-w-0 rounded-2xl border border-border bg-background p-4 sm:p-5">
        <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div className="flex min-w-0 items-start gap-3"><span aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 font-semibold text-primary">{(request.user.firstName || request.user.username).slice(0, 1).toUpperCase()}</span>
          <div className="min-w-0"><h3 className="break-words text-sm font-bold">{[request.user.firstName, request.user.lastName].filter(Boolean).join(' ') || request.user.username}</h3><p className="break-all text-xs text-muted-foreground">@{request.user.username}</p>
            <p className="mt-1 text-xs text-muted-foreground">{Number.isNaN(date.getTime()) ? 'Fecha no disponible' : `Solicitada el ${date.toLocaleDateString('es', { dateStyle: 'medium' })}`}</p></div></div>
          <div className="grid grid-cols-2 gap-2 sm:flex sm:shrink-0"><button type="button" disabled={busy || refreshing} onClick={() => onReview(request.user._id, 'approve')} aria-label={`Aprobar a ${request.user.username}`} className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50"><CheckCircle className="h-4 w-4" aria-hidden="true" />{busy && busyUserId === request.user._id ? 'Procesando…' : 'Aprobar'}</button>
            <button type="button" disabled={busy || refreshing} onClick={() => setRejection(request.user._id)} aria-label={`Rechazar a ${request.user.username}`} className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-border px-4 text-sm font-semibold hover:bg-muted focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50"><X className="h-4 w-4" aria-hidden="true" />Rechazar</button></div></div>
        <p className="mt-4 whitespace-pre-wrap break-words rounded-xl bg-muted/50 p-3 text-sm leading-relaxed">{request.message || 'No incluyó una presentación.'}</p>
        {rejection === request.user._id && <div className="mt-3 rounded-xl border border-border p-3"><p className="text-sm">Se rechazará la solicitud de @{request.user.username}. La persona no obtendrá acceso y podrá solicitarlo de nuevo si la política lo permite.</p><div className="mt-3 flex flex-wrap gap-2"><button type="button" disabled={busy} onClick={() => { onReview(request.user._id, 'reject'); setRejection(null) }} className="min-h-11 rounded-xl bg-destructive px-4 text-sm font-semibold text-destructive-foreground disabled:opacity-50">Confirmar rechazo</button><button type="button" disabled={busy} onClick={() => setRejection(null)} className="min-h-11 rounded-xl border border-border px-4 text-sm">Volver</button></div></div>}
      </li> })}</ul>}
  </section>
}
