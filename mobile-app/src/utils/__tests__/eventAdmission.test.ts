import type { Event } from '../../types';
import { canRsvp, canScanAdmissions, eventIsAttending, isAdmissionCode } from '../admission';
import { eventAuthReturn, eventParam, isPublicEventRoute } from '../eventAuthReturn';

const id = 'a'.repeat(24);
const event = { _id: id, createdBy: { _id: 'owner' }, status: 'published', date: '2026-10-19T12:00:00Z', endDate: '2026-10-19T15:00:00Z', attendees: [] } as unknown as Event;

test('login and registration accept only a public event return path', () => {
  expect(eventAuthReturn(`/event/${id}`)).toBe(`/event/${id}`);
  for (const value of ['https://example.com', '//example.com', '/qr-scanner', `/event/${id}/join`, `/event/${id}?autoAttend=1`, ['/event/' + id], '/event/%2Fadmin']) expect(eventAuthReturn(value)).toBe('/(tabs)');
  expect(eventParam([id])).toBeNull();
  expect(eventParam(id)).toBe(id);
  expect(isPublicEventRoute(['event', '[id]'])).toBe(true);
  expect(isPublicEventRoute(['qr-scanner'])).toBe(false);
});

test('only an authenticated event creator or existing admin can open its scanner', () => {
  expect(canScanAdmissions(event, { id: 'owner' })).toBe(true);
  expect(canScanAdmissions({ ...event, createdBy: 'owner' }, { _id: 'owner' })).toBe(true);
  expect(canScanAdmissions(event, { id: 'other', role: 'admin' })).toBe(true);
  expect(canScanAdmissions(event, { id: 'other', role: 'moderator' })).toBe(false);
  expect(canScanAdmissions(event, null)).toBe(false);
  expect(canScanAdmissions({ ...event, status: 'cancelled' }, { id: 'owner' })).toBe(false);
});

test('QR format rejects URLs, identifiers alone and malformed signatures before any mutation', () => {
  expect(isAdmissionCode(`EC:${id}:${id}:${'a'.repeat(64)}`)).toBe(true);
  expect(isAdmissionCode(`${id}:${id}`)).toBe(true);
  for (const code of [id, 'https://example.com', `${id}:${id}:extra`, `EC:${id}:${id}:invalid`]) expect(isAdmissionCode(code)).toBe(false);
});

test('RSVP eligibility includes ongoing explicit schedules and reads only active attendance', () => {
  expect(canRsvp(event, Date.parse('2026-10-19T13:00:00Z'))).toBe(true);
  expect(canRsvp({ ...event, status: 'cancelled' }, Date.parse(event.date))).toBe(false);
  expect(canRsvp(event, Date.parse('2026-10-19T15:00:01Z'))).toBe(false);
  expect(eventIsAttending({ ...event, attendees: [{ user: 'owner', status: 'cancelled', joinedAt: '' }] }, 'owner')).toBe(false);
  expect(eventIsAttending({ ...event, attendees: [{ user: 'owner', status: 'confirmed', joinedAt: '' }] }, 'owner')).toBe(true);
  expect(eventIsAttending({ ...event, isAttending: true }, null)).toBe(false);
});
