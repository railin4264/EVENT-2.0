'use client'

import { useEffect, useRef, useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { apiClient } from '@/lib/api/client'
import { useAuthStore } from '@/stores/authStore'
import { sourceButton, sourceInput, adapterNames, sourceErrorMessage } from '@/lib/source-registry'
import { formatEventDate } from '@/lib/event-display'

type Agenda = { sourceId: string; name: string; endpointUrl: string; adapterType: string }
type Result = { previewCount: number; created: number; updated: number; unchanged: number; skipped: number; failedWrites: number; incomplete?: boolean; events: Array<{ title: string; date: string; timeZone?: string }>; dryRun: boolean }
export default function ConnectAgendaModal({ isOpen, onClose, onSuccess }: { isOpen: boolean; onClose: () => void; onSuccess?: () => void }) {
  const owner = useAuthStore(state => state.user?.id || state.user?._id || '')
  const sequence = useRef(0), lock = useRef(false)
  const [agendas, setAgendas] = useState<Agenda[]>([]), [selected, setSelected] = useState(''), [loading, setLoading] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState('')
  const [result, setResult] = useState<Result | null>(null)
  const load = async () => {
    const ticket = ++sequence.current; setLoading(true); setError('')
    try {
      const response = await apiClient.get('/sources/my-agendas')
      if (ticket !== sequence.current) return
      if (!response.data?.success || !Array.isArray(response.data.data)) throw new Error()
      setAgendas(response.data.data); setSelected(response.data.data.length === 1 ? response.data.data[0].sourceId : '')
    } catch (err) { if (ticket === sequence.current) setError(sourceErrorMessage(err, 'No se pudieron cargar tus agendas aprobadas.')) }
    finally { if (ticket === sequence.current) setLoading(false) }
  }
  useEffect(() => {
    sequence.current++; lock.current = false; setAgendas([]); setSelected(''); setResult(null); setBusy(false); setError('')
    if (isOpen) void load()
    return () => { sequence.current++ }
    // Opening or changing accounts starts an independent request scope.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, owner])
  const agenda = agendas.find(item => item.sourceId === selected)
  const run = async (dryRun: boolean) => {
    if (!agenda || lock.current || (!dryRun && (!result?.dryRun || !result.previewCount))) return
    const ticket = sequence.current; lock.current = true; setBusy(true); setError('')
    try {
      const response = await apiClient.post('/sources/connect-agenda', { agendaUrl: agenda.endpointUrl, dryRun })
      if (ticket !== sequence.current) return
      if (!response.data?.success) throw new Error()
      setResult({ ...response.data, dryRun })
      if (!dryRun) onSuccess?.()
    } catch (err) { if (ticket === sequence.current) setError(sourceErrorMessage(err, 'No se pudo consultar la agenda. Vuelve a intentarlo.')) }
    finally { if (ticket === sequence.current) { lock.current = false; setBusy(false) } }
  }
  return <Dialog.Root open={isOpen} onOpenChange={open => { if (!open) onClose() }}><Dialog.Portal><Dialog.Overlay className="fixed inset-0 z-50 bg-black/60" /><Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[85dvh] w-[calc(100%_-_2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 space-y-4 overflow-y-auto rounded-2xl border border-border bg-background p-5 text-foreground shadow-xl focus:outline-none sm:p-6">
    <header className="space-y-2 pr-10"><Dialog.Title className="text-xl font-semibold">Consultar una agenda aprobada</Dialog.Title><Dialog.Description className="text-sm leading-6 text-muted-foreground">Elige una fuente vinculada a tu cuenta. Primero comprueba una muestra; después puedes enviar sus eventos a moderación.</Dialog.Description></header><Dialog.Close aria-label="Cerrar agenda" className="absolute right-2 top-2 flex min-h-11 min-w-11 items-center justify-center rounded-xl hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><X className="h-5 w-5" /></Dialog.Close>
    {loading ? <p role="status" className="text-sm text-muted-foreground">Cargando agendas…</p> : agendas.length ? <>
      <label className="text-sm font-medium">Agenda<select disabled={busy} value={selected} onChange={event => { setSelected(event.target.value); setResult(null); setError('') }} className={sourceInput}><option value="">Elige una agenda</option>{agendas.map(item => <option key={item.sourceId} value={item.sourceId}>{item.name}</option>)}</select></label>
      {agenda && <p className="text-sm text-muted-foreground">{adapterNames[agenda.adapterType] || 'Formato aprobado'}. La consulta es manual; la actualización programada requiere el servidor en producción.</p>}
    </> : !error && <p className="rounded-xl border border-border p-4 text-sm leading-6">Todavía no tienes agendas aprobadas. Un administrador debe registrar la fuente, revisar sus permisos y habilitar un formato compatible antes de consultarla.</p>}
    <p className="text-xs leading-5 text-muted-foreground">Formatos disponibles: iCalendar (.ics), JSON y WordPress The Events Calendar. OpenAgenda y otras APIs siguen pendientes de integración.</p>
    {error && <div role="alert" className="text-sm text-destructive">{error}{!agendas.length && <button type="button" className={`${sourceButton} mt-3`} onClick={() => void load()}>Volver a cargar agendas</button>}</div>}
    {result && <section aria-label="Resultado de la agenda" className="space-y-3 rounded-xl border border-border bg-muted/40 p-4"><h3 className="font-semibold">{result.dryRun ? 'Vista previa · sin guardar eventos' : 'Lote enviado a revisión'}</h3>
      <p className="text-sm">{result.dryRun ? `${result.previewCount || 0} registros válidos en este lote.` : `${result.created || 0} nuevos, ${result.updated || 0} actualizados y ${result.unchanged || 0} sin cambios.`}</p>
      <p className="text-xs text-muted-foreground">Omitidos: {result.skipped || 0} · Fallos de escritura: {result.failedWrites || 0}</p>
      {!!result.failedWrites && <p role="alert" className="text-sm">Algunos registros no pudieron guardarse. Revisa los resultados antes de reintentar.</p>}
      {result.incomplete && <p role="alert" className="text-sm">Lectura parcial: este lote no representa toda la agenda.</p>}
      {!!result.events?.length && <ul className="space-y-2 text-sm">{result.events.map((event, index) => <li key={index} className="break-words"><strong>{event.title}</strong><br />{formatEventDate(event.date, event.timeZone)}</li>)}</ul>}
      {result.dryRun && !result.previewCount && <p className="text-sm">No hay registros listos para importar. La fuente puede necesitar fechas, coordenadas o precios confirmados.</p>}
    </section>}
    <div className="flex flex-wrap gap-2 border-t border-border pt-4"><button type="button" disabled={busy || loading || !agenda} onClick={() => void run(true)} className={sourceButton}>{busy ? 'Consultando…' : 'Previsualizar agenda'}</button><button type="button" disabled={busy || !result?.dryRun || !result.previewCount} onClick={() => void run(false)} className={`${sourceButton} bg-primary text-primary-foreground hover:bg-primary/90`}>Importar lote para revisión</button><button type="button" onClick={onClose} className={sourceButton}>Cerrar</button></div>
  </Dialog.Content></Dialog.Portal></Dialog.Root>
}
