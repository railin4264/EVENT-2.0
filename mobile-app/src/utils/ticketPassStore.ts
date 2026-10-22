import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Ticket } from '@/types';

const PREFIX = 'eventnow.pass.v1.';
const MAX_AGE = 7 * 86400000;
const revisions = new Map<string, number>();
const key = (owner: string, id: string) => PREFIX + encodeURIComponent(owner).replace(/%/g, '_') + '.' + id.replace(/:/g, '_');
const indexKey = (owner: string) => PREFIX + owner + '.index';
export const isAdmissionCode = (value: unknown): value is string => typeof value === 'string' && /^EC:[a-f0-9]{24}:[a-f0-9]{24}:[a-f0-9]{64}$/i.test(value);

// Never persist the server's populated attendee/user objects or payment metadata.
export function minimalTicketPass(input: Ticket, now = Date.now()): Ticket | null {
  const id = input?._id || input?.id;
  const expiry = Date.parse(input?.validUntil);
  if (typeof id !== 'string' || !/^[a-f0-9]{24}:[a-f0-9]{24}$/i.test(id) || !isAdmissionCode(input.qrCode)
    || !['valid', 'active'].includes(input.status) || !Number.isFinite(expiry) || expiry <= now
    || input.qrCode.slice(3, 52).toLowerCase() !== id.toLowerCase()) return null;
  const event = typeof input.event === 'object' && input.event ? input.event : {};
  return {
    id, _id: id, eventId: String(event._id || input.eventId || ''),
    event: { _id: String(event._id || input.eventId || ''), title: String(event.title || 'Evento').slice(0, 160), date: event.date },
    userId: '', type: 'general', ticketType: typeof input.ticketType === 'string' ? input.ticketType : { name: String(input.ticketType?.name || 'Entrada').slice(0, 80) },
    price: Number.isFinite(input.price) ? input.price : 0, currency: String(input.currency || 'DOP').slice(0, 3),
    status: input.status, qrCode: input.qrCode, validFrom: input.validFrom || event.date || '',
    data: { quantity: Math.max(1, Math.min(1000, Math.trunc(Number((input as Ticket & { quantity?: number }).quantity || input.data?.quantity) || 1))) },
    validUntil: input.validUntil, purchaseDate: input.purchaseDate, createdAt: input.createdAt,
  };
}

async function removePasses(owner: string): Promise<void> {
  if (!owner) return;
  let ids: string[] = [];
  try { ids = JSON.parse(await AsyncStorage.getItem(indexKey(owner)) || '[]'); } catch { /* Invalid index contains no usable passes. */ }
  await Promise.all((Array.isArray(ids) ? ids : []).filter(id => typeof id === 'string').map(id => SecureStore.deleteItemAsync(key(owner, id))));
  await AsyncStorage.removeItem(indexKey(owner));
}

export async function clearTicketPasses(owner: string): Promise<void> {
  revisions.set(owner, (revisions.get(owner) || 0) + 1);
  await removePasses(owner);
}

export async function saveTicketPasses(owner: string, tickets: Ticket[], current: () => boolean = () => true): Promise<void> {
  if (!owner || !current()) return;
  const revision = (revisions.get(owner) || 0) + 1;
  revisions.set(owner, revision);
  const active = () => current() && revisions.get(owner) === revision;
  const passes = tickets.map(ticket => minimalTicketPass(ticket)).filter((ticket): ticket is Ticket => !!ticket).slice(0, 200);
  await removePasses(owner);
  if (!active()) return;
  const ids = passes.map(ticket => ticket.id);
  // Index first so logout can delete a write that is still in flight.
  await AsyncStorage.setItem(indexKey(owner), JSON.stringify(ids));
  for (const ticket of passes) {
    if (!active()) break;
    await SecureStore.setItemAsync(key(owner, ticket.id), JSON.stringify({ owner, revision, savedAt: Date.now(), ticket }));
  }
  if (!active()) {
    // An older response must not delete a newer response's passes.
    for (const id of ids) {
      const raw = await SecureStore.getItemAsync(key(owner, id));
      if (raw && JSON.parse(raw).revision === revision) await SecureStore.deleteItemAsync(key(owner, id));
    }
  }
}

export async function readTicketPasses(owner: string, now = Date.now()): Promise<{ tickets: Ticket[]; savedAt: number | null }> {
  if (!owner) return { tickets: [], savedAt: null };
  let ids: unknown;
  try { ids = JSON.parse(await AsyncStorage.getItem(indexKey(owner)) || '[]'); } catch { ids = []; }
  if (!Array.isArray(ids)) return { tickets: [], savedAt: null };
  const tickets: Ticket[] = [];
  let savedAt: number | null = null;
  for (const id of ids.slice(0, 200)) {
    if (typeof id !== 'string') continue;
    try {
      const raw = await SecureStore.getItemAsync(key(owner, id));
      const item = raw ? JSON.parse(raw) : null;
      if (!item || item.owner !== owner || !Number.isFinite(item.savedAt) || item.savedAt > now || now - item.savedAt > MAX_AGE) continue;
      const ticket = minimalTicketPass(item.ticket, now);
      if (ticket && ticket.id === id) { tickets.push(ticket); savedAt = Math.min(savedAt ?? item.savedAt, item.savedAt); }
    } catch { /* Corrupt or unavailable secure storage must not produce a QR. */ }
  }
  return { tickets, savedAt };
}
