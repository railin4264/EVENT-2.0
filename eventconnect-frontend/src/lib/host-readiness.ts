export type ReadinessAnswer = 'unknown' | 'yes' | 'no'
export type ReadinessRole = { title: string; slots: number; acceptedCount: number; closed: boolean }
export type AgendaTask = { time: string; task: string; responsible: string }
export const ACCESS_QUESTIONS = [
  ['stepFree', '¿Revisaste si la entrada y el recorrido pueden hacerse sin escalones?'],
  ['toilet', '¿Comprobaste las condiciones de acceso a los baños?'],
  ['seating', '¿Hay asientos o zonas de descanso disponibles?'],
  ['quiet', '¿Identificaste un espacio tranquilo o una alternativa al ruido?'],
  ['information', '¿Preparaste información clara sobre barreras y apoyos disponibles?']
] as const
export const WELCOME_QUESTIONS = [
  ['signage', '¿Está preparada la señalización de entrada y orientación?'],
  ['languages', '¿Confirmaste qué idiomas puede atender el equipo?'],
  ['briefing', '¿El equipo conoce cómo recibir a personas que vienen por primera vez?']
] as const
export const READINESS_NOTICE = 'Borrador privado con información declarada por el anfitrión. El guardado en tu cuenta es opcional; no acredita accesibilidad ni certificación y no representa asistencia, aforo o demanda verificados.'
export function answerMap(rows: readonly (readonly [string, string])[]): Record<string, ReadinessAnswer> { return Object.fromEntries(rows.map(([key]) => [key, 'unknown'])) }
function plainText(value: string, max: number, required = true): string {
  if (typeof value !== 'string' || value.length > max || (required && !value.trim())) throw new Error('Revisa los campos de texto y su longitud.')
  if (/@|\b(?:\d[\s()+.-]*){7,}\b|https?:\/\//i.test(value)) throw new Error('Usa roles o referencias breves; no incluyas teléfonos, correos ni enlaces privados.')
  return value.trim()
}
export function parseLanguages(value: string): string[] {
  if (value.length > 240) throw new Error('Escribe hasta ocho idiomas, separados por comas.')
  const values = [...new Set(value.split(',').map(row => row.trim()).filter(Boolean))]
  if (values.length > 8) throw new Error('Escribe hasta ocho idiomas, separados por comas.')
  return values.map(row => plainText(row, 40))
}
export function prepareAgendaTask(time: string, task: string, responsible: string, existing: AgendaTask[]): AgendaTask[] {
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) throw new Error('La hora debe tener formato HH:mm, entre 00:00 y 23:59.')
  if (existing.length >= 24) throw new Error('La agenda admite hasta 24 tareas.')
  const row = { time, task: plainText(task, 120), responsible: plainText(responsible, 80, false) }
  if (existing.some(item => item.time === row.time && item.task === row.task && item.responsible === row.responsible)) throw new Error('Esta tarea ya está en la agenda.')
  return [...existing, row].sort((a, b) => a.time.localeCompare(b.time))
}
export function calculateSupplies(people: string, perPerson: string, reserve: string) {
  const number = (value: string) => value.trim() !== '' && /^\d+(?:\.\d{1,3})?$/.test(value) ? Number(value) : NaN
  const participants = number(people), unitsPerPerson = number(perPerson), reservePercent = number(reserve)
  if (!Number.isInteger(participants) || participants < 1 || participants > 100000) throw new Error('Indica entre 1 y 100 000 personas para planificar.')
  if (!Number.isFinite(unitsPerPerson) || unitsPerPerson <= 0 || unitsPerPerson > 1000) throw new Error('Las unidades por persona deben estar entre 0,001 y 1000, con hasta tres decimales.')
  if (!Number.isFinite(reservePercent) || reservePercent < 0 || reservePercent > 100) throw new Error('La reserva debe estar entre 0 % y 100 %, con hasta tres decimales.')
  const scaled = (value: string) => { const [whole, fraction = ''] = value.split('.'); return BigInt(whole) * 1000n + BigInt(fraction.padEnd(3, '0')) }
  const numerator = BigInt(participants) * scaled(perPerson) * (100000n + scaled(reserve)), denominator = 100000000n
  return { participants, unitsPerPerson, reservePercent, totalUnits: Number((numerator + denominator - 1n) / denominator), source: 'manual-planning' as const }
}
export function buildHelpCall(title: string, roles: ReadinessRole[]): string | null {
  const open = roles.filter(role => role.closed === false && Number.isInteger(role.slots) && role.slots >= 1 && role.slots <= 50 && Number.isInteger(role.acceptedCount) && role.acceptedCount >= 0 && role.acceptedCount < role.slots && typeof role.title === 'string' && role.title.trim()).slice(0, 20)
  if (!open.length) return null
  return [`Buscamos colaboración para «${String(title).slice(0, 100)}».`, ...open.map(role => `• ${role.title.slice(0, 100)}: ${role.slots - role.acceptedCount} plaza(s) disponibles.`), 'Ofrecer ayuda requiere la aceptación del anfitrión. No incluye una entrada ni una reserva del evento. Revisa la convocatoria en EventNow; disponibilidad sujeta a cambios.'].join('\n')
}
type Draft = { accessibility: Record<string, ReadinessAnswer>; welcome: Record<string, ReadinessAnswer>; languages: string; localSupport: string; localSupportConsent: boolean; agenda: AgendaTask[]; supplies: ReturnType<typeof calculateSupplies> | null }
export function buildReadinessReport(title: string, draft: Draft, generatedAt = new Date()) {
  const checklist = (questions: readonly (readonly [string, string])[], answers: Record<string, ReadinessAnswer>) => questions.map(([key, question]) => ({ question, answer: ['yes', 'no', 'unknown'].includes(answers[key]) ? answers[key] : 'unknown' }))
  const agenda = draft.agenda.reduce((rows, row) => prepareAgendaTask(row.time, row.task, row.responsible, rows), [] as AgendaTask[])
  const supplies = draft.supplies ? calculateSupplies(String(draft.supplies.participants), String(draft.supplies.unitsPerPerson), String(draft.supplies.reservePercent)) : null
  return { type: 'eventnow-preparation-draft', version: 1, title: String(title).slice(0, 100), generatedAt: generatedAt.toISOString(), notice: READINESS_NOTICE,
    accessibility: checklist(ACCESS_QUESTIONS, draft.accessibility), welcome: checklist(WELCOME_QUESTIONS, draft.welcome), languages: parseLanguages(draft.languages),
    localSupport: draft.localSupportConsent ? { reference: plainText(draft.localSupport, 80), voluntaryConsentDeclared: true } : null,
    agenda, supplies }
}
