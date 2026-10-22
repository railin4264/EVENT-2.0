import { planningCalendar, planningItinerary, type GlobalPlanningEvent } from './global-planning'
export function populatePlanningPrintDocument(doc: Document, lines: string[], print: () => void) {
  doc.documentElement.lang = 'es'
  const style = doc.createElement('style')
  style.textContent = 'body{font:16px/1.6 system-ui,sans-serif;max-width:760px;margin:40px auto;padding:0 24px;color:#111;background:white}pre{white-space:pre-wrap;font:inherit}button{padding:12px 20px;font:inherit;cursor:pointer}@media print{button{display:none}body{margin:0}}'
  const title = doc.createElement('h1'); title.textContent = 'Mis opciones de salida'
  const content = doc.createElement('pre'); content.textContent = lines.join('\n')
  const button = doc.createElement('button'); button.type = 'button'; button.textContent = 'Imprimir este resumen'; button.addEventListener('click', print)
  doc.head.replaceChildren(style); doc.title = 'EventNow · Resumen de opciones'; doc.body.replaceChildren(title, content, button)
}
export function openPlanningPrint(events: GlobalPlanningEvent[], visitorZone: string, comparisonZone: string) {
  const lines = planningItinerary(events, visitorZone, comparisonZone)
  const preview = window.open('about:blank', '_blank')
  if (!preview) throw Error('El navegador bloqueó la vista del resumen. Permite abrir esta ventana y vuelve a intentarlo.')
  preview.opener = null
  populatePlanningPrintDocument(preview.document, lines, () => preview.print())
}
export function downloadPlanningCalendar(event: GlobalPlanningEvent) {
  const contents = planningCalendar(event, window.location.origin)
  const url = URL.createObjectURL(new Blob([contents], { type: 'text/calendar;charset=utf-8' }))
  const link = document.createElement('a'); link.href = url; link.download = `eventnow-${event._id}.ics`; link.rel = 'noopener'; document.body.appendChild(link)
  try { link.click() } finally { link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000) }
}
