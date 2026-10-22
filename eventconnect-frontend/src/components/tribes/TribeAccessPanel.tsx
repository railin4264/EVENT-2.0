'use client'

import { useId, useState } from 'react'
import Link from 'next/link'
import { Lock, Clock, CheckCircle } from 'lucide-react'
import type { TribeAccess } from './tribe-access'

interface Props {
  access: TribeAccess
  name: string
  tribeId: string
  authenticated: boolean
  busy: boolean
  compact?: boolean
  onJoin: (message?: string) => void
  onCancel: () => void
  error?: string
  onRetry?: () => void
}

export function TribeAccessPanel({ access, name, tribeId, authenticated, busy, compact, onJoin, onCancel, error, onRetry }: Props) {
  const [message, setMessage] = useState('')
  const id = useId()
  if (access.isMember) return null
  const inviteOnly = access.membership === 'invite_only' || access.privacy === 'secret'
  const canAct = access.canJoin || access.canRequestJoin
  return <section aria-label={`Acceso a ${name}`} className={compact ? 'min-w-0 flex-1 space-y-2' : 'rounded-3xl border border-border bg-card p-5 sm:p-7 space-y-4'}>
    {!compact && <div className="flex items-start gap-3"><span className="rounded-xl bg-primary/10 p-3 text-primary"><Lock className="h-5 w-5" aria-hidden="true" /></span>
      <div><h2 className="text-lg font-bold">{access.isBanned ? 'Acceso restringido' : access.hasPendingRequest ? 'Tu solicitud está pendiente' : inviteOnly ? 'Acceso por invitación' : access.canRequestJoin ? 'Solicita tu lugar en la comunidad' : 'Forma parte de la comunidad'}</h2>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{access.isBanned ? 'Tu acceso está restringido por la comunidad. No puedes enviar solicitudes ni volver a unirte.'
          : access.hasPendingRequest ? 'El equipo de la comunidad revisará tu solicitud. Puedes cancelarla mientras esperas.'
          : inviteOnly ? 'Esta comunidad no admite solicitudes abiertas. El acceso requiere una invitación; su gestión todavía no está disponible en la app.'
          : access.canRequestJoin || (!authenticated && access.membership === 'approval_required') ? 'Enviar una solicitud no concede acceso inmediato. Un administrador o moderador activo revisará tu presentación.'
          : 'Únete para participar en las conversaciones y actividades de la comunidad.'}</p></div></div>}
    {access.joinRequestStatus === 'rejected' && !access.isBanned && <p className="text-sm text-muted-foreground">Tu solicitud anterior no fue aprobada.{access.canRequestJoin ? ' Puedes enviar una nueva presentación.' : ''}</p>}
    {access.isBanned ? compact && <p className="text-xs font-semibold text-muted-foreground">Acceso restringido</p>
      : access.hasPendingRequest ? <div className="flex flex-wrap items-center gap-2">
        {compact && <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-600 dark:text-amber-400"><Clock className="h-4 w-4" aria-hidden="true" />Solicitud pendiente</span>}
        <button type="button" disabled={busy} onClick={onCancel} className="min-h-11 rounded-xl border border-border px-4 py-2 text-sm font-semibold hover:bg-muted focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50">{busy ? 'Procesando…' : 'Cancelar solicitud'}</button>
      </div>
      : inviteOnly ? compact && <p className="text-xs font-semibold text-muted-foreground">Solo por invitación</p>
      : !authenticated ? <Link href={`/login?redirect=${encodeURIComponent(`/tribes/${tribeId}`)}`} className="inline-flex min-h-11 items-center justify-center rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground focus-visible:ring-2 focus-visible:ring-primary">Inicia sesión para participar</Link>
      : canAct ? <div className="space-y-3">
        {!compact && access.canRequestJoin && <div><label htmlFor={id} className="mb-2 block text-sm font-medium">Tu presentación <span className="text-muted-foreground">(opcional)</span></label>
          <textarea id={id} rows={3} maxLength={500} disabled={busy} value={message} onChange={event => setMessage(event.target.value)} placeholder="Comparte qué te gustaría aportar o conocer en esta comunidad."
            className="w-full resize-y rounded-xl border border-border bg-background p-3 text-sm focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50" />
          <p className="mt-1 text-right text-xs tabular-nums text-muted-foreground">{message.length}/500</p></div>}
        <button type="button" disabled={busy} onClick={() => onJoin(message.trim() || undefined)} className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50">
          {access.canRequestJoin ? <Lock className="h-4 w-4" aria-hidden="true" /> : <CheckCircle className="h-4 w-4" aria-hidden="true" />}{busy ? 'Procesando…' : access.canRequestJoin ? 'Enviar solicitud' : 'Unirme a la comunidad'}
        </button>
      </div> : <p className="text-sm text-muted-foreground">No puedes solicitar acceso en este momento.</p>}
    {error && <div role="alert" className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm"><p>{error}</p>
      {onRetry && (canAct || access.hasPendingRequest) && <button type="button" disabled={busy} onClick={onRetry} className="mt-2 min-h-11 font-semibold text-primary underline disabled:opacity-50">Reintentar acción</button>}</div>}
  </section>
}
