import type { Event, User } from '../types';

export function canScanAdmissions(event: Event | null, actor: (Partial<User> & { role?: string }) | null): boolean {
  const actorId = actor?._id || actor?.id;
  if (!actorId || !event || event.status !== 'published') return false;
  const creator = typeof event.createdBy === 'string' ? event.createdBy : event.createdBy?._id || event.createdBy?.id;
  return actor?.role === 'admin' || Boolean(creator && String(creator) === String(actorId));
}

export function isAdmissionCode(value: unknown): value is string {
  return typeof value === 'string' && (/^EC:[a-f0-9]{24}:[a-f0-9]{24}:[a-f0-9]{64}$/i.test(value) || /^[a-f0-9]{24}:[a-f0-9]{24}$/i.test(value));
}

export function eventIsAttending(event: Event, userId: string | null): boolean {
  if (!userId) return false;
  if (typeof event.isAttending === 'boolean') return event.isAttending;
  return Array.isArray(event.attendees) && event.attendees.some(attendee => {
    if (typeof attendee === 'string') return attendee === userId;
    const id = typeof attendee.user === 'string' ? attendee.user : attendee.user?._id || attendee.user?.id;
    return id === userId && ['confirmed', 'attending'].includes(attendee.status);
  });
}

export function canRsvp(event: Event, now = Date.now()): boolean {
  const end = Date.parse(event.endDate || event.date);
  return event.status === 'published' && Number.isFinite(end) && end >= now;
}
