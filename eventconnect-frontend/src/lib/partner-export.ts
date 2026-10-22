export type PartnerExportRow = { title: string; description: string; kind: string; status: string; resource?: { title: string; city?: string; audience: number; audienceLabel: string } }
export function buildPartnerKit(row: PartnerExportRow) {
  return JSON.stringify({ generatedAt: new Date().toISOString(), title: row.title, needs: row.description, kind: row.kind, status: row.status, activity: row.resource ? { title: row.resource.title, city: row.resource.city, audience: row.resource.audience, audienceLabel: row.resource.audienceLabel } : null, notice: 'Datos registrados en EventNow. Interés e inscripciones no equivalen a asistentes presentes ni alcance publicitario. Sin contactos, perfiles individuales, cobros ni contratos automáticos.' }, null, 2)
}
function csv(value: unknown) { let cell = String(value ?? ''); if (/^[\s]*[=+\-@]/.test(cell)) cell = `'${cell}`; return `"${cell.replace(/"/g, '""')}"` }
export function buildPartnerReport(rows: PartnerExportRow[]) {
  return [['Convocatoria', 'Tipo', 'Estado registrado', 'Actividad', 'Interés o inscripciones', 'Unidad'], ...rows.map(r => [r.title, r.kind, r.status, r.resource?.title || '', r.resource?.audience ?? '', r.resource?.audienceLabel || ''])].map(row => row.map(csv).join(',')).join('\r\n')
}
/** Explicit user action only; untrusted content is always inserted as text. */
export function printPartnerKit(row: PartnerExportRow) {
  const preview = window.open('about:blank', '_blank')
  if (!preview) return false
  preview.opener = null
  const doc = preview.document
  doc.title = 'Ficha de colaboración · EventNow'
  const style = doc.createElement('style')
  style.textContent = 'body{font:17px/1.6 system-ui,sans-serif;color:#201530;max-width:760px;margin:60px auto;padding:24px}h1{font-size:42px;line-height:1.15}h2{font-size:23px}p{white-space:pre-wrap}small{color:#62566e}button{padding:12px 20px;font-size:16px}@media print{button{display:none}body{margin:0;max-width:none}}'
  doc.head.append(style)
  const block = (tag: string, value: string) => { const node = doc.createElement(tag); node.textContent = value; doc.body.append(node) }
  block('small', 'EVENTNOW · CONEXIONES PARA HACER QUE PASE')
  block('h1', row.title)
  if (row.resource) { block('h2', row.resource.title); block('p', `${row.resource.audience} ${row.resource.audienceLabel}${row.resource.city ? ` · ${row.resource.city}` : ''}`) }
  block('h2', 'Qué necesitamos y qué ofrecemos')
  block('p', row.description)
  block('small', 'El interés y las inscripciones no equivalen a asistencia presencial ni alcance publicitario. Sin contactos privados ni contratos automáticos. Las condiciones se acuerdan entre las partes.')
  const button = doc.createElement('button'); button.textContent = 'Imprimir o guardar como PDF'; button.onclick = () => preview.print(); doc.body.append(button)
  doc.close()
  return true
}
