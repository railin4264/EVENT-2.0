import type { EventFilters } from '../services/EventService';
import type { Event, EventCategory } from '../types';

export type DiscoveryFilterId = 'all' | 'recurring' | 'tours' | EventCategory | 'fashion';
export type DiscoveryPoint = { latitude: number; longitude: number };

export const DISCOVERY_PAGE_SIZE = 30;
export const NEARBY_RADIUS_KM = 40;

/** One server query per screen state: search, category, location and page all run on the API. */
export function discoveryFilters({ filter, search, page, near }: {
  filter: DiscoveryFilterId; search: string; page: number; near: DiscoveryPoint | null;
}): EventFilters {
  const query = search.trim().slice(0, 100);
  return {
    page,
    limit: DISCOVERY_PAGE_SIZE,
    ...(filter === 'recurring' ? { isRecurring: true }
      : filter === 'tours' ? { isTourOrTrip: true }
        : filter !== 'all' ? { category: filter as EventCategory } : {}),
    ...(query ? { search: query } : {}),
    ...(near ? { lat: near.latitude, lng: near.longitude, radius: NEARBY_RADIUS_KM } : {}),
  };
}

/** Append a page without repeating events that shifted between pages, keeping only public listings. */
export function mergeDiscoveryPage(current: Event[], incoming: Event[]): Event[] {
  const seen = new Set(current.map(event => event._id));
  const fresh = incoming.filter(event => event && event._id && event.status === 'published' && !event.isPrivate && !seen.has(event._id) && seen.add(event._id));
  return [...current, ...fresh];
}

export function hasMoreDiscoveryPages(pagination: { page?: number; pages?: number } | undefined): boolean {
  return Boolean(pagination && Number(pagination.page) < Number(pagination.pages));
}
