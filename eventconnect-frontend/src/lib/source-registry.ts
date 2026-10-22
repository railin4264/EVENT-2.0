export interface EventSource {
  sourceId: string; name: string; domain?: string; classification: string; status: string; adapterType: string
  coverage?: { country?: string }; accessConfig?: { endpointUrl?: string; termsUrl?: string; documentationUrl?: string }
  license?: { commercialAllowed?: boolean; displayAllowed?: boolean; reviewedAt?: string; licenseType?: string; attributionRequired?: boolean; attributionText?: string }
  responsibleOrganizer?: string; eventDefaults?: { freeAdmissionConfirmed?: boolean; currency?: string }
  syncSchedule?: { frequencyHours?: number; nextSyncDue?: string }
  metrics?: { totalEventsHarvested?: number; lastSuccessAt?: string; lastError?: string }
  readiness?: { ready: boolean; blockers: string[] }
}
export interface IngestionResult {
  success: boolean; dryRun: boolean; incomplete?: boolean; message?: string
  stats: Record<string, number>; sampleEvents?: Array<{ sourceId?: string; title: string; date: string }>
  sources?: Array<{ sourceId: string; status: string; blockers?: string[]; incomplete?: boolean }>
}
export const sourceStates: Record<string, string> = { discovered: 'Descubierta', evaluating: 'En evaluación', approved: 'Aprobada', active: 'Activa', degraded: 'Con incidencias', suspended: 'Suspendida', retired: 'Retirada' }
export const adapterNames: Record<string, string> = { ics_feed: 'Calendario iCalendar (.ics)', json_feed: 'Feed JSON', wp_events_calendar: 'WordPress · The Events Calendar', rest_api: 'API de proveedor · pendiente', openagenda: 'OpenAgenda · pendiente', graphql: 'GraphQL · pendiente', schema_org_sitemap: 'Web estructurada · pendiente', telegram_channel: 'Telegram · pendiente', soda_socrata: 'Socrata · pendiente', manual_organizer: 'Organizador manual · pendiente' }
export const blockerNames: Record<string, string> = {
  source_not_approved: 'Falta aprobar la fuente', permission_not_reviewed: 'Falta revisar los permisos de uso', terms_missing: 'Falta el enlace a condiciones',
  adapter_not_ready: 'Esta integración todavía no está habilitada', credentials_integration_pending: 'Falta completar la integración y su acceso',
  responsible_organizer_missing: 'Falta un organizador responsable', invalid_endpoint: 'Revisa la dirección HTTPS de la fuente', prospect_only: 'Es un prospecto; falta validar su clasificación'
}
adapterNames.madrid_open_data = 'España · agenda municipal de Madrid'
adapterNames.helsinki_linked_events = 'Finlandia · Helsinki Linked Events'
adapterNames.nyc_parks_open_data = 'Estados Unidos · NYC Parks (datos abiertos)'
export const sourceCurrencies = ['DOP','USD','EUR','GBP','JPY','CNY','HKD','TWD','SGD','MXN','COP','ARS','CLP','PEN','BRL','VES','PYG','BOB','UYU','CRC','INR','EGP','AED','KRW','AUD','CAD','NZD','CZK','SEK','NOK','DKK','CHF','PLN','TRY','ZAR']
export const sourceInput = 'mt-1 min-h-11 w-full rounded-xl border border-input bg-background px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
export const sourceButton = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-border px-4 text-sm font-semibold hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50'
export function sourceErrorMessage(error: unknown, fallback: string) {
  return (error as { response?: { data?: { message?: string } } })?.response?.data?.message || fallback
}
