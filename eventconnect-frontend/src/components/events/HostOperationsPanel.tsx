'use client'

import Link from 'next/link'
import { QrCode, Users, TrendingUp, Edit, ClipboardList } from 'lucide-react'

interface HostOperationsPanelProps {
  eventId: string
  confirmedCount: number
  maxCapacity?: number
  canCheckIn: boolean
}

// Only figures the server already confirmed: registrations and declared capacity.
// Door scans live on the check-in page, which reads them from validated tickets.
export default function HostOperationsPanel({ eventId, confirmedCount, maxCapacity, canCheckIn }: HostOperationsPanelProps) {
  const hasCapacity = typeof maxCapacity === 'number' && maxCapacity > 0
  const occupancy = hasCapacity ? Math.min(100, Math.round((confirmedCount / maxCapacity) * 100)) : null
  const action = 'flex min-h-11 items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400'

  return (
    <section aria-labelledby="host-panel-title" className="rounded-3xl border border-violet-500/30 bg-gradient-to-br from-violet-950/30 via-black/40 to-black/60 p-6 backdrop-blur-xl shadow-xl space-y-5">
      <div className="flex items-center gap-3 border-b border-white/10 pb-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-violet-500/20 text-violet-400">
          <QrCode className="h-5 w-5" />
        </div>
        <div>
          <h3 id="host-panel-title" className="text-base font-bold text-foreground">Panel del anfitrión</h3>
          <p className="text-xs text-muted-foreground">Solo tú ves este panel.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
            <span>Registros confirmados</span>
            <Users className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="font-mono text-2xl font-black text-emerald-400">
            {confirmedCount}{hasCapacity ? ` / ${maxCapacity}` : ''}
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">Confirmar asistencia no equivale a haber entrado.</p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
            <span>Ocupación sobre el aforo</span>
            <TrendingUp className="h-4 w-4 text-cyan-400" />
          </div>
          {occupancy === null ? (
            <p className="text-sm text-muted-foreground">Sin aforo declarado. Añádelo al editar el evento.</p>
          ) : <>
            <div className="font-mono text-2xl font-black text-cyan-400">{occupancy}%</div>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/10" role="progressbar" aria-valuenow={occupancy} aria-valuemin={0} aria-valuemax={100} aria-label="Ocupación sobre el aforo">
              <div className="h-1.5 rounded-full bg-cyan-400 transition-all duration-500" style={{ width: `${occupancy}%` }} />
            </div>
          </>}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        {canCheckIn && (
          <Link href={`/events/${eventId}/check-in`} className={`${action} border-violet-500/40 bg-violet-600/20 text-violet-100 hover:bg-violet-600/30`}>
            <QrCode className="h-4 w-4" />Control de acceso
          </Link>
        )}
        <Link href={`/events/${eventId}/edit`} className={`${action} border-white/10 bg-white/5 text-foreground hover:bg-white/10`}>
          <Edit className="h-4 w-4" />Editar evento
        </Link>
        <Link href={`/events/${eventId}/planning`} className={`${action} border-white/10 bg-white/5 text-foreground hover:bg-white/10`}>
          <ClipboardList className="h-4 w-4" />Planificación
        </Link>
      </div>
    </section>
  )
}
