export type PartnerFilters = { query: string; kind: string; city: string; country: string; minimumCapacity: string }
export const emptyPartnerFilters: PartnerFilters = { query: '', kind: '', city: '', country: '', minimumCapacity: '' }
export type SearchableNeed = { title: string; description: string; kind: string; resource?: { title: string; city?: string } | null }
export type SearchableSpace = { city: string; country: string; capacity: number }
export const normalizePartnerText = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase().trim()
export function partnerOptions(values: (string | undefined)[]) {
  const unique = new Map<string, string>()
  values.forEach(value => { if (value?.trim()) unique.set(normalizePartnerText(value), value.trim()) })
  return [...unique.values()].sort((a, b) => a.localeCompare(b))
}
export function filterPartnerNeeds<T extends SearchableNeed>(rows: T[], filters: PartnerFilters): T[] {
  const query = normalizePartnerText(filters.query)
  return rows.filter(row => (!query || normalizePartnerText(`${row.title} ${row.description} ${row.resource?.title || ''}`).includes(query)) && (!filters.kind || filters.kind === row.kind) && (!filters.city || normalizePartnerText(row.resource?.city || '') === normalizePartnerText(filters.city)))
}
export function filterPartnerSpaces<T extends SearchableSpace>(rows: T[], filters: PartnerFilters): T[] {
  const minimum = filters.minimumCapacity.trim() ? Number(filters.minimumCapacity) : 0
  if (!Number.isInteger(minimum) || minimum < 0) return []
  return rows.filter(row => (!filters.country || normalizePartnerText(row.country) === normalizePartnerText(filters.country)) && Number.isFinite(row.capacity) && row.capacity >= minimum)
}
export const partnerChecklist = ['Preparación: definir público y necesidades', 'Acuerdo: revisar condiciones con la otra parte', 'Entrega: reunir referencias para revisión'] as const
export type PartnerBriefDraft = { objective: string; deliverables: string; measurement: string; checklist: boolean[] }
export const emptyPartnerBrief = (): PartnerBriefDraft => ({ objective: '', deliverables: '', measurement: '', checklist: partnerChecklist.map(() => false) })
export function exportPartnerBrief(draft: PartnerBriefDraft) {
  return JSON.stringify({ version: 1, documentType: 'Borrador personal de patrocinio', objective: draft.objective.slice(0, 800), proposedDeliverables: draft.deliverables.slice(0, 1200), manualMeasurementPlan: draft.measurement.slice(0, 800), personalChecklist: partnerChecklist.map((label, i) => ({ label, markedByUser: draft.checklist[i] === true })), notice: 'Borrador temporal: se borra al salir, recargar o cambiar de cuenta. Las marcas del checklist son personales; no confirman acuerdos ni entregas del servidor. Sin contrato legal, métricas verificadas, ROI ni resultados garantizados.' }, null, 2)
}
export function partnerBriefPrintText(draft: PartnerBriefDraft) {
  return `Objetivo propuesto\n${draft.objective}\n\nEntregables propuestos\n${draft.deliverables}\n\nCómo medir manualmente\n${draft.measurement}\n\nChecklist personal\n${partnerChecklist.map((label, i) => `${draft.checklist[i] ? '[x]' : '[ ]'} ${label}`).join('\n')}\n\nLas marcas son personales y no cambian el estado del servidor. Sin contrato legal ni resultados garantizados.`
}
