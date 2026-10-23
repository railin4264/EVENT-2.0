export type EventPhase = 'upcoming' | 'live' | 'ended' | 'cancelled';

const ESTIMATED_DURATION_MS = 2 * 60 * 60 * 1000;
// Categories where requesting songs to the organizer makes sense.
const MUSICAL_CATEGORIES = new Set(['music', 'nightlife', 'party', 'dance']);

type PlanEvent = {
  date?: string | Date | null; endDate?: string | Date | null; status?: string; category?: string;
  isVirtual?: boolean; eventType?: string; location?: unknown; publicSource?: unknown;
};

/** Same convention as the web: without an end date, assume two hours. */
export function eventPhase(event: PlanEvent, now = Date.now()): EventPhase {
  if (event.status === 'cancelled') return 'cancelled';
  if (event.status === 'completed' || event.status === 'expired') return 'ended';
  const start = event.date ? new Date(event.date).getTime() : NaN;
  if (!Number.isFinite(start) || event.status === 'draft') return 'upcoming';
  const explicitEnd = event.endDate ? new Date(event.endDate).getTime() : NaN;
  const end = Number.isFinite(explicitEnd) && explicitEnd >= start ? explicitEnd : start + ESTIMATED_DURATION_MS;
  return now >= end ? 'ended' : now >= start ? 'live' : 'upcoming';
}

/** Exact map point of an in-person event, or null: never a default city. */
export function eventCoordinates(event: PlanEvent): { latitude: number; longitude: number } | null {
  const point = event.location && typeof event.location === 'object' ? (event.location as { coordinates?: unknown }).coordinates : null;
  if (!Array.isArray(point) || point.length !== 2) return null;
  const [longitude, latitude] = point.map(Number);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return null;
  if (latitude === 0 && longitude === 0) return null;
  return { latitude, longitude };
}

/**
 * Which detail sections fit an event, mirroring the web rules: a virtual event gets no
 * transport, weather or stays; song requests only appear for musical nights; planning
 * tools disappear once the event is over; imported listings have no organizer to read requests.
 */
export function eventSectionPlan(event: PlanEvent, now = Date.now()) {
  const phase = eventPhase(event, now);
  const online = event.eventType === 'virtual' || event.eventType === 'hybrid' || Boolean(event.isVirtual);
  const inPerson = event.eventType === 'hybrid' || !online;
  const upcoming = phase === 'upcoming';
  const active = upcoming || phase === 'live';
  const point = inPerson ? eventCoordinates(event) : null;
  const countryCode = event.location && typeof event.location === 'object' ? (event.location as { countryCode?: string }).countryCode : undefined;
  return {
    phase, online, inPerson,
    navigation: Boolean(point) && active,
    calendar: upcoming,
    transitDominicanRepublic: Boolean(point) && active && countryCode === 'DO',
    hospitality: inPerson && upcoming,
    tripBudget: inPerson && upcoming,
    songVoting: MUSICAL_CATEGORIES.has(String(event.category || '').toLowerCase()) && active && !event.publicSource,
    splitCosts: inPerson && active,
  };
}
