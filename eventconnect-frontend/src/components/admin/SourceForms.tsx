'use client'

import { useEffect, useRef, useState } from 'react'
import { apiClient } from '@/lib/api/client'
import { adapterNames, sourceInput, sourceButton, sourceCurrencies, sourceErrorMessage, type EventSource } from '@/lib/source-registry'
import { useAuthStore } from '@/stores/authStore'

export function SourceConfigForm({ source, onSaved, onCancel }: { source?: EventSource; onSaved: () => void; onCancel: () => void }) {
  const [error, setError] = useState(''), [busy, setBusy] = useState(false)
  const lock = useRef(false), alive = useRef(true)
  useEffect(() => { alive.current = true; return () => { alive.current = false } }, [])
  const save = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault(); if (lock.current) return
    const owner = useAuthStore.getState().user?.id || useAuthStore.getState().user?._id
    const data = new FormData(event.currentTarget)
    const values = { sourceId: data.get('sourceId'), name: data.get('name'), endpointUrl: data.get('endpointUrl'), adapterType: data.get('adapterType'), classification: data.get('classification'), country: String(data.get('country') || '').toUpperCase(), frequencyHours: Number(data.get('frequencyHours')) }
    lock.current = true; setBusy(true); setError('')
    try {
      const response = source ? await apiClient.patch(`/sources/${source.sourceId}/config`, values) : await apiClient.post('/sources', values)
      if (!response.data?.success) throw new Error()
      if (alive.current && owner === (useAuthStore.getState().user?.id || useAuthStore.getState().user?._id)) onSaved()
    } catch (err) { if (alive.current) setError(sourceErrorMessage(err, 'No se pudo guardar la fuente. Conservamos tus datos.')) }
    finally { lock.current = false; if (alive.current) setBusy(false) }
  }
  return <form onSubmit={save} className="space-y-4 rounded-2xl border border-border bg-card p-5 sm:p-6" aria-label={source ? 'Configurar fuente' : 'Registrar fuente'}>
    <h2 className="break-words text-xl font-semibold">{source ? `Configurar ${source.name}` : 'Registrar una fuente'}</h2>
    <p className="text-sm leading-6 text-muted-foreground">Guardar la configuración deja la fuente en evaluación. Después revisa los permisos y apruébala antes de importar.</p>
    <div className="grid gap-4 sm:grid-cols-2">
      {!source && <label className="text-sm font-medium">Identificador<input name="sourceId" required pattern="[a-z0-9-]{3,80}" maxLength={80} placeholder="agenda-cultural-madrid" className={sourceInput} /></label>}
      <label className="text-sm font-medium">Nombre<input name="name" required maxLength={120} defaultValue={source?.name || ''} className={sourceInput} /></label>
      <label className="text-sm font-medium sm:col-span-2">Dirección HTTPS del feed<input name="endpointUrl" type="url" required pattern="https://.*" defaultValue={source?.accessConfig?.endpointUrl || ''} className={sourceInput} /></label>
      <label className="text-sm font-medium">Formato<select name="adapterType" defaultValue={source?.adapterType || 'json_feed'} className={sourceInput}>{Object.entries(adapterNames).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      <label className="text-sm font-medium">Tipo de fuente<select name="classification" defaultValue={source?.classification || 'O'} className={sourceInput}><option value="O">Organizador</option><option value="D">Descubrimiento documentado</option><option value="W">Web o directorio</option><option value="P">Prospecto por investigar</option></select></label>
      <label className="text-sm font-medium">País (opcional, código de dos letras)<input name="country" pattern="[A-Za-z]{2}" maxLength={2} defaultValue={source?.coverage?.country || ''} placeholder="ES" className={sourceInput} /></label>
      <label className="text-sm font-medium">Intervalo solicitado (horas)<input name="frequencyHours" type="number" required min={1} max={168} step={1} defaultValue={source?.syncSchedule?.frequencyHours || 24} className={sourceInput} /></label>
    </div>
    <p className="text-xs leading-5 text-muted-foreground">El planificador comprueba las fuentes cada seis horas en producción. Un intervalo menor no implica sincronización en vivo. Las integraciones marcadas como pendientes no se pueden activar.</p>
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    <div className="flex flex-wrap gap-3"><button disabled={busy} className={`${sourceButton} bg-primary text-primary-foreground hover:bg-primary/90`}>{busy ? 'Guardando…' : 'Guardar configuración'}</button><button type="button" disabled={busy} onClick={onCancel} className={sourceButton}>Cancelar</button></div>
  </form>
}

export function SourceReviewForm({ source, onSaved, onCancel }: { source: EventSource; onSaved: () => void; onCancel: () => void }) {
  const [error, setError] = useState(''), [busy, setBusy] = useState(false), [free, setFree] = useState(source.eventDefaults?.freeAdmissionConfirmed === true), [attribution, setAttribution] = useState(source.license?.attributionRequired === true)
  const lock = useRef(false), alive = useRef(true)
  useEffect(() => { alive.current = true; return () => { alive.current = false } }, [])
  const save = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault(); if (lock.current) return
    const owner = useAuthStore.getState().user?.id || useAuthStore.getState().user?._id
    const data = new FormData(event.currentTarget); lock.current = true; setBusy(true); setError('')
    try {
      const response = await apiClient.patch(`/sources/${source.sourceId}/review`, {
        termsUrl: data.get('termsUrl'), licenseType: data.get('licenseType'), commercialAllowed: data.has('commercial'), displayAllowed: data.has('display'),
        attributionRequired: attribution, attributionText: data.get('attributionText') || '', freeAdmissionConfirmed: free,
        currency: data.get('currency') || undefined, ...(source.responsibleOrganizer ? { responsibleOrganizer: source.responsibleOrganizer } : {})
      })
      if (!response.data?.success) throw new Error()
      if (alive.current && owner === (useAuthStore.getState().user?.id || useAuthStore.getState().user?._id)) onSaved()
    } catch (err) { if (alive.current) setError(sourceErrorMessage(err, 'No se pudo guardar la revisión. Conservamos tus datos.')) }
    finally { lock.current = false; if (alive.current) setBusy(false) }
  }
  return <form onSubmit={save} aria-label="Revisar permisos" className="space-y-4 rounded-2xl border border-border bg-card p-5 sm:p-6">
    <h2 className="break-words text-xl font-semibold">Revisar permisos · {source.name}</h2>
    <p className="text-sm leading-6 text-muted-foreground">Registra lo que autorizan las condiciones o el acuerdo del proveedor. Guardar esta revisión no activa ni publica contenido.</p>
    <label className="block text-sm font-medium">Condiciones o acuerdo (HTTPS)<input type="url" name="termsUrl" required pattern="https://.*" defaultValue={source.accessConfig?.termsUrl || ''} className={sourceInput} /></label>
    <label className="block text-sm font-medium">Nombre de licencia o acuerdo<input name="licenseType" required maxLength={160} defaultValue={source.license?.licenseType === 'Unreviewed' ? '' : source.license?.licenseType || ''} className={sourceInput} /></label>
    <fieldset className="space-y-2"><legend className="mb-2 text-sm font-medium">Permisos comprobados</legend>
      <label className="flex min-h-11 items-center gap-3 text-sm"><input type="checkbox" name="commercial" defaultChecked={source.license?.reviewedAt ? source.license.commercialAllowed : false} />Permite el uso comercial previsto.</label>
      <label className="flex min-h-11 items-center gap-3 text-sm"><input type="checkbox" name="display" defaultChecked={source.license?.reviewedAt ? source.license.displayAllowed : false} />Permite mostrar estos eventos en EventNow.</label>
      <label className="flex min-h-11 items-center gap-3 text-sm"><input type="checkbox" checked={attribution} onChange={event => setAttribution(event.target.checked)} />Requiere atribución.</label>
    </fieldset>
    <label className="block text-sm font-medium">Texto de atribución<textarea name="attributionText" required={attribution} maxLength={500} rows={2} defaultValue={source.license?.attributionText || ''} className={`${sourceInput} py-3`} /></label>
    <label className="flex min-h-11 items-start gap-3 text-sm"><input type="checkbox" className="mt-1" checked={free} onChange={event => setFree(event.target.checked)} />Confirmé que todos los eventos sin precio de esta agenda tienen entrada gratuita.</label>
    <label className="block text-sm font-medium">Moneda predeterminada (solo si está confirmada)<select name="currency" required={free} defaultValue={source.eventDefaults?.currency || ''} className={sourceInput}><option value="">Sin valor predeterminado</option>{sourceCurrencies.map(code => <option key={code}>{code}</option>)}</select></label>
    <p className="text-xs leading-5 text-muted-foreground">Se conserva el responsable existente; si no hay uno, tu cuenta queda como responsable. Si falta permiso comercial o de exhibición, la fuente se suspende. La atribución registrada debe acompañar la publicación del contenido.</p>
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    <div className="flex flex-wrap gap-3"><button disabled={busy} className={`${sourceButton} bg-primary text-primary-foreground hover:bg-primary/90`}>{busy ? 'Guardando…' : 'Guardar revisión'}</button><button type="button" disabled={busy} onClick={onCancel} className={sourceButton}>Cancelar</button></div>
  </form>
}
