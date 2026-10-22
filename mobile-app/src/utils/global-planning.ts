import { explicitEventInstant } from './planningDraft'
export type GlobalPlanningEvent = { _id: string; title: string; date: string; endDate: string; city?: string; timeZone?: string }
export type PlanningSort = 'date' | 'duration'
export function validPlanningZone(zone: string) {
  if (!zone || zone.length > 100) return false
  try { new Intl.DateTimeFormat('es', { timeZone: zone }).format(); return true } catch { return false }
}
export function planningDeviceZone() {
  const zone = Intl.DateTimeFormat().resolvedOptions().timeZone
  return validPlanningZone(zone) ? zone : 'UTC'
}
export function planningLocalInput(instant: Date, zone: string) {
  if (!validPlanningZone(zone) || !Number.isFinite(instant.getTime())) throw Error('Revisa la fecha y la zona horaria.')
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(instant).map(p => [p.type, p.value]))
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`
}
export function planningInputInstant(value: string, zone: string) {
  if (!/^\d{4}-\d{2}-\d{2}T([01]\d|2[0-3]):[0-5]\d$/.test(value)) throw Error('Indica fecha AAAA-MM-DD y hora HH:mm.')
  return explicitEventInstant(value.slice(0,10), value.slice(11), zone)
}
export function planningWindow(from: string, until: string, zone: string, now = Date.now()) {
  const start = planningInputInstant(from, zone), end = planningInputInstant(until, zone)
  if (Date.parse(start) < now || Date.parse(end) <= Date.parse(start) || Date.parse(end) - Date.parse(start) > 7 * 86400000) throw Error('Elige un intervalo futuro de hasta siete días y un regreso posterior al inicio.')
  return { from: start, until: end }
}
export function planningPreset(kind: '2h' | '4h' | 'weekend', zone: string, now = new Date()) {
  let start = new Date((Math.floor(now.getTime() / 60000) + 1) * 60000)
  if (kind !== 'weekend') return { from: planningLocalInput(start, zone), until: planningLocalInput(new Date(start.getTime() + (kind === '2h' ? 2 : 4) * 3600000), zone), explanation: `Ventana de ${kind === '2h' ? 'dos' : 'cuatro'} horas reales desde el próximo minuto. El traslado cabe dentro de ese tiempo.` }
  const day = planningLocalInput(start, zone).slice(0, 10), weekday = new Date(`${day}T12:00:00Z`).getUTCDay()
  const plus = (days: number) => new Date(Date.parse(`${day}T12:00:00Z`) + days * 86400000).toISOString().slice(0, 10)
  let untilDay: string
  if (weekday >= 1 && weekday <= 4) { const friday = plus(5 - weekday); start = new Date(planningInputInstant(`${friday}T18:00`, zone)); untilDay = plus(7 - weekday) }
  else if (weekday === 5) { const fridayStart = new Date(planningInputInstant(`${day}T18:00`, zone)); if (start < fridayStart) start = fridayStart; untilDay = plus(2) }
  else untilDay = weekday === 6 ? plus(1) : day
  if (start.getTime() >= Date.parse(planningInputInstant(`${untilDay}T23:59`, zone))) { start = new Date(planningInputInstant(`${plus(5)}T18:00`, zone)); untilDay = plus(7) }
  return { from: planningLocalInput(start, zone), until: `${untilDay}T23:59`, explanation: 'Esta sugerencia usa viernes desde las 18:00 hasta domingo a las 23:59, en la zona de tu dispositivo. Puedes cambiarla según tus días libres.' }
}
const instant = (value: unknown) => typeof value === 'string' && /(?:Z|[+-]\d\d:\d\d)$/i.test(value) && Number.isFinite(Date.parse(value))
export function planningEvents(values: unknown): GlobalPlanningEvent[] {
  if (!Array.isArray(values)) return []
  const seen = new Set<string>()
  return values.filter(v => v && /^[a-f\d]{24}$/i.test(v._id) && typeof v.title === 'string' && instant(v.date) && instant(v.endDate) && Date.parse(v.endDate) > Date.parse(v.date) && !seen.has(v._id) && (seen.add(v._id), true)).slice(0, 30).map(v => ({ _id: v._id, title: [...v.title].slice(0, 100).join(''), date: v.date, endDate: v.endDate, city: typeof v.city === 'string' ? v.city.slice(0, 100) : undefined, timeZone: typeof v.timeZone === 'string' && validPlanningZone(v.timeZone) ? v.timeZone : undefined }))
}
export const planningDuration = (event: GlobalPlanningEvent) => Math.round((Date.parse(event.endDate) - Date.parse(event.date)) / 60000)
export function sortPlanningEvents(events: GlobalPlanningEvent[], title: string, sort: PlanningSort) {
  const normalize = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es')
  const query = normalize(title.trim())
  return events.filter(event => normalize(event.title).includes(query)).sort((a, b) => (sort === 'duration' ? planningDuration(a) - planningDuration(b) : 0) || Date.parse(a.date) - Date.parse(b.date) || a._id.localeCompare(b._id))
}
export function planningSchedule(event: GlobalPlanningEvent, zone: string) {
  if (!validPlanningZone(zone)) throw Error('La zona horaria de comparación no es válida.')
  const formatter = new Intl.DateTimeFormat('es', { timeZone: zone, year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', timeZoneName: 'short' })
  return `${formatter.format(new Date(event.date))} → ${formatter.format(new Date(event.endDate))}`
}
export function planningItinerary(events: GlobalPlanningEvent[], visitorZone: string, comparisonZone: string) {
  const safe = planningEvents(events)
  if (!safe.length) throw Error('Selecciona al menos un evento con horario completo.')
  if (!validPlanningZone(visitorZone) || !validPlanningZone(comparisonZone)) throw Error('Revisa las zonas horarias antes de preparar el resumen.')
  const lines = ['EventNow · Mis opciones de salida', 'Este resumen no confirma asistencia ni reserva entradas.', `Tu zona: ${visitorZone}`, '']
  for (const event of sortPlanningEvents(safe, '', 'date')) {
    const destination = event.timeZone || comparisonZone
    lines.push(event.title, `Tu horario: ${planningSchedule(event, visitorZone)}`, `${event.timeZone ? 'Zona declarada del evento' : 'Zona de comparación elegida'} (${destination}): ${planningSchedule(event, destination)}`, `Duración del evento: ${planningDuration(event)} minutos`, `Ciudad: ${event.city || 'No indicada'}`, '')
  }
  lines.push('Los desplazamientos no se calculan aquí. Revisa solapamientos y cambios del organizador antes de salir.')
  return lines
}
function foldCalendarLine(line: string) {
  const output: string[] = []; let current = '', bytes = 0
  for (const character of line) {
    const code = character.codePointAt(0)!, size = code > 65535 ? 4 : code > 2047 ? 3 : code > 127 ? 2 : 1
    if (bytes + size > 75) { output.push(current); current = ' '; bytes = 1 }
    current += character; bytes += size
  }
  output.push(current); return output.join('\r\n')
}
export function planningCalendar(event: GlobalPlanningEvent, origin?: string) {
  const safe = planningEvents([event])[0]
  if (!safe) throw Error('No se puede exportar un horario incompleto.')
  const site = origin ? new URL(origin) : undefined
  if (site && !['https:', 'http:'].includes(site.protocol)) throw Error('El enlace del calendario no es válido.')
  const clean = (s: string) => s.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '')
  const escape = (text: string) => clean(text).replace(/\\/g, '\\\\').replace(/\r?\n|\r/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;')
  const stamp = (value: string) => new Date(value).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z')
  const source = ['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//EventNow//Planes//ES','CALSCALE:GREGORIAN','BEGIN:VEVENT',`UID:${safe._id}@eventnow`,`DTSTAMP:${stamp(new Date().toISOString())}`,`DTSTART:${stamp(safe.date)}`,`DTEND:${stamp(safe.endDate)}`,`SUMMARY:${escape(safe.title)}`,`LOCATION:${escape(safe.city || 'Ciudad no indicada')}`,...(site ? [`URL:${site.origin}/events/${safe._id}`] : []),'END:VEVENT','END:VCALENDAR',''].join('\r\n')
  return source.split('\r\n').map(foldCalendarLine).join('\r\n')
}
