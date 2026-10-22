import { discoveryFilters, mergeDiscoveryPage, hasMoreDiscoveryPages, DISCOVERY_PAGE_SIZE, NEARBY_RADIUS_KM } from '../discoveryQuery';
import type { Event } from '../../types';

const event = (id: string, extra: Partial<Event> = {}) => ({ _id: id, title: id, status: 'published', isPrivate: false, ...extra }) as Event;

describe('discoveryFilters', () => {
  it('sends search, category and page to the server instead of filtering a local sample', () => {
    expect(discoveryFilters({ filter: 'music', search: '  salsa  ', page: 2, near: null }))
      .toEqual({ page: 2, limit: DISCOVERY_PAGE_SIZE, category: 'music', search: 'salsa' });
  });

  it('maps tours and recurring activities to their real API flags', () => {
    expect(discoveryFilters({ filter: 'tours', search: '', page: 1, near: null })).toMatchObject({ isTourOrTrip: true });
    expect(discoveryFilters({ filter: 'tours', search: '', page: 1, near: null })).not.toHaveProperty('category');
    expect(discoveryFilters({ filter: 'recurring', search: '', page: 1, near: null })).toMatchObject({ isRecurring: true });
  });

  it('adds the location only when the person chose to search nearby', () => {
    expect(discoveryFilters({ filter: 'all', search: '', page: 1, near: { latitude: 19.45, longitude: -70.69 } }))
      .toMatchObject({ lat: 19.45, lng: -70.69, radius: NEARBY_RADIUS_KM });
    expect(discoveryFilters({ filter: 'all', search: '', page: 1, near: null })).not.toHaveProperty('lat');
  });
});

describe('mergeDiscoveryPage', () => {
  it('appends new public events once and drops private or unpublished rows', () => {
    const merged = mergeDiscoveryPage([event('a')], [event('a'), event('b'), event('c', { isPrivate: true }), event('d', { status: 'draft' } as Partial<Event>)]);
    expect(merged.map(e => e._id)).toEqual(['a', 'b']);
  });
});

it('knows when another page exists', () => {
  expect(hasMoreDiscoveryPages({ page: 1, pages: 3 })).toBe(true);
  expect(hasMoreDiscoveryPages({ page: 3, pages: 3 })).toBe(false);
  expect(hasMoreDiscoveryPages(undefined)).toBe(false);
});
