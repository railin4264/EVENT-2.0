import { MOBILE_RETURN_ROUTES } from '../constants/mobileNavigation';

export function eventParam(value: unknown): string | null {
  return typeof value === 'string' && /^[a-f0-9]{24}$/i.test(value) ? value : null;
}

// RSVP returns to a public event, never to an arbitrary URL or a mutation.
export function eventAuthReturn(value: unknown): string {
  if (typeof value === 'string' && MOBILE_RETURN_ROUTES.includes(value)) return value;
  if (typeof value === 'string' && /^\/community-event\/[a-f0-9]{24}(?:\?scope=ideas)?$/i.test(value)) return value;
  if (typeof value === 'string' && /^\/(?:partners|planning-tools)(?:\?draftId=[a-f0-9]{24})?$/i.test(value)) return value;
  if (typeof value === 'string' && /^\/group-plans(?:\?token=[a-f0-9]{48})?$/i.test(value)) return value;
  return typeof value === 'string' && /^\/(?:event|user|tribe)\/[a-f0-9]{24}$/i.test(value) ? value : '/(tabs)';
}

export function isPublicEventRoute(segments: readonly string[]): boolean {
  if (segments.length === 0) return true;
  if (segments.length === 2 && segments[0] === 'legal') return true;
  if (segments[0] === '(tabs)' && (segments.length === 1 || (segments.length === 2 && ['index', 'discover', 'services'].includes(segments[1])))) return true;
  if (segments.length === 1 && ['index', 'search', 'map'].includes(segments[0])) return true;
  if (segments.length === 1 && ['group-plans', 'ideas-market', 'partners', 'planning-tools'].includes(segments[0])) return true;
  if (segments.length === 2 && ['event-planning', 'community-event'].includes(segments[0])) return true;
  return segments.length === 2 && segments[0] === 'event';
}
