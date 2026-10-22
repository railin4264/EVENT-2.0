import type { Event } from '../types';

export const HOME_HORIZON_MS = 12 * 60 * 60 * 1000;
const ESTIMATED_DURATION_MS = 2 * 60 * 60 * 1000;
export type HomeEvent = Partial<Event> & { isPrivate?: boolean; confirmedAttendeesCount?: number };

export function homeEventsQuery(onlyNext12Hours: boolean, now = Date.now()) {
  return { limit: 30, timeFilter: 'upcoming',
    ...(onlyNext12Hours ? { startsBefore: new Date(now + HOME_HORIZON_MS).toISOString() } : {}) };
}

export function homeEventTiming(event: HomeEvent, now = Date.now()) {
  const start = Date.parse(event.date || '');
  const estimated = !event.endDate;
  const end = estimated ? start + ESTIMATED_DURATION_MS : Date.parse(event.endDate!);
  const valid = Number.isFinite(start) && Number.isFinite(end) && end >= start;
  const inProgress = valid && start <= now && end > now;
  return { start, end, estimated, inProgress,
    label: inProgress ? estimated ? 'Inicio reciente · horario estimado' : 'En curso' : 'Próximamente' };
}

export function visibleHomeEvents(events: HomeEvent[], onlyNext12Hours: boolean, now = Date.now()) {
  return events.filter(event => {
    if (event.status !== 'published' || event.isPrivate) return false;
    const { start, end } = homeEventTiming(event, now);
    return Number.isFinite(start) && Number.isFinite(end) && end >= start && end > now &&
      (!onlyNext12Hours || start < now + HOME_HORIZON_MS);
  }).sort((a, b) => Date.parse(a.date || '') - Date.parse(b.date || ''));
}

export function confirmedHomeAttendees(event: HomeEvent): number | null {
  if (Number.isSafeInteger(event.confirmedAttendeesCount) && event.confirmedAttendeesCount! >= 0) return event.confirmedAttendeesCount!;
  if (!Array.isArray(event.attendees)) return null;
  if (event.attendees.some(attendee => typeof attendee !== 'object' || attendee === null || typeof attendee.status !== 'string')) return null;
  // IDs alone and generic attendance totals cannot establish confirmed RSVPs.
  return event.attendees.filter(attendee => typeof attendee === 'object' && attendee.status === 'confirmed').length;
}

export function homeEventImage(event: HomeEvent): string | undefined {
  if (event.image) return event.image;
  const first = event.images?.[0];
  return typeof first === 'string' ? first : first?.url;
}

export function homeEventPrice(event: HomeEvent) {
  const amount = typeof event.price === 'number' ? event.price : event.price?.amount;
  const currency = event.price && typeof event.price === 'object' ? event.price.currency : event.currency || 'USD';
  if (amount === 0) return { free: true, label: 'GRATIS' };
  if (typeof amount !== 'number' || !Number.isFinite(amount) || amount < 0) return { free: false, label: 'Consultar precio' };
  try { return { free: false, label: new Intl.NumberFormat('es', { style: 'currency', currency }).format(amount) }; }
  catch { return { free: false, label: `${amount} ${currency}` }; }
}

// A response may only update the account/filter generation that started it.
// Finishing an old request must not unlock a newer request for the same scope.
export function createHomeRequestGate() {
  let scope: string | null = null;
  let generation = 0;
  let active: { scope: string; generation: number } | null = null;
  return {
    setScope(next: string) {
      if (next !== scope) { scope = next; generation += 1; active = null; }
    },
    begin(expectedScope: string) {
      if (scope !== expectedScope || active) return null;
      active = { scope, generation };
      return active;
    },
    isCurrent(ticket: { scope: string; generation: number }) {
      return active === ticket && ticket.scope === scope && ticket.generation === generation;
    },
    finish(ticket: { scope: string; generation: number }) {
      if (active === ticket) active = null;
    },
    invalidate() { generation += 1; active = null; },
  };
}

export function bindHomeForegroundRefresh(
  initialState: string | null,
  subscribe: (_listener: (_next: string) => void) => () => void,
  refresh: () => void,
  repeat: boolean,
) {
  let active = initialState !== 'background' && initialState !== 'inactive';
  let interval: ReturnType<typeof setInterval> | undefined;
  const stop = () => { if (interval !== undefined) clearInterval(interval); interval = undefined; };
  const start = () => {
    refresh();
    if (repeat) interval = setInterval(refresh, 60000);
  };
  if (active) start();
  const unsubscribe = subscribe(next => {
    const nextActive = next === 'active';
    if (nextActive === active) return;
    active = nextActive;
    stop();
    if (active) start();
  });
  return () => { stop(); unsubscribe(); };
}
