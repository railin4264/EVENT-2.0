import { useCallback, useEffect, useRef, useState } from 'react';
import * as Location from 'expo-location';
import { eventService } from '../services';
import type { Event } from '../types';

type Coordinates = { latitude: number; longitude: number };
type NearbyResult = {
  owner: string;
  generation: number;
  status: 'idle' | 'loading' | 'ready' | 'denied' | 'error';
  events: Event[];
  coordinates: Coordinates | null;
  message: string;
};
const empty = (owner: string, generation = 0): NearbyResult => ({ owner, generation, status: 'idle', events: [], coordinates: null, message: '' });

async function locateWithTimeout(signal: AbortSignal) {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  let abort: (() => void) | undefined;
  try {
    return await Promise.race([
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
      new Promise<never>((_, reject) => { timeout = setTimeout(() => reject(new Error('Location timed out')), 20000); }),
      new Promise<never>((_, reject) => {
        abort = () => reject(new Error('Location cancelled'));
        signal.addEventListener('abort', abort, { once: true });
      }),
    ]);
  } finally {
    if (timeout) clearTimeout(timeout);
    if (abort) signal.removeEventListener('abort', abort);
  }
}

export function hasPublicMapLocation(event: Event): boolean {
  const point = typeof event.location === 'object' && event.location?.coordinates;
  return (event as Event & { isSecretLocation?: boolean }).isSecretLocation !== true &&
    Array.isArray(point) && point.length === 2 && point.every(Number.isFinite) &&
    Math.abs(point[0]) <= 180 && Math.abs(point[1]) <= 90;
}

/** One foreground location request, only after an explicit user action. */
export function useNearbyEvents(owner: string) {
  const [result, setResult] = useState<NearbyResult>(() => empty(owner));
  const scope = useRef(owner);
  const generation = useRef(0);
  const requestId = useRef(0);
  const active = useRef(true);
  const lock = useRef<string | null>(null);
  const pending = useRef<AbortController | null>(null);
  if (scope.current !== owner) {
    scope.current = owner;
    generation.current++;
    requestId.current++;
    lock.current = null;
    pending.current?.abort();
  }
  useEffect(() => {
    active.current = true;
    return () => { active.current = false; requestId.current++; pending.current?.abort(); };
  }, []);

  const locate = useCallback(async () => {
    if (!active.current || scope.current !== owner || lock.current === owner) return;
    const id = ++requestId.current;
    const epoch = generation.current;
    const controller = new AbortController();
    pending.current = controller;
    lock.current = owner;
    const current = () => active.current && scope.current === owner && requestId.current === id;
    setResult({ ...empty(owner, epoch), status: 'loading' });
    let phase: 'location' | 'events' = 'location';
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!current()) return;
      if (permission.status !== 'granted') {
        setResult({ ...empty(owner, epoch), status: 'denied', message: 'Puedes seguir explorando sin ubicación. Si quieres ver planes cerca, activa el permiso de ubicación para EventNow en los ajustes del teléfono.' });
        return;
      }
      const position = await locateWithTimeout(controller.signal);
      if (!current()) return;
      const { latitude, longitude } = position.coords;
      if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || Math.abs(latitude) > 90 || Math.abs(longitude) > 180) throw new Error('Invalid coordinates');
      phase = 'events';
      const events = await eventService.getNearbyEvents(latitude, longitude, 50, 30);
      if (!current()) return;
      if (!Array.isArray(events)) throw new Error('Invalid nearby response');
      setResult({ owner, generation: epoch, status: 'ready', events: events.filter(hasPublicMapLocation), coordinates: { latitude, longitude }, message: '' });
    } catch {
      if (current()) setResult({ ...empty(owner, epoch), status: 'error', message: phase === 'location'
        ? 'No pudimos obtener tu ubicación. Comprueba que el GPS esté disponible e inténtalo de nuevo.'
        : 'No pudimos cargar los eventos cercanos. Comprueba tu conexión e inténtalo de nuevo.' });
    } finally {
      if (requestId.current === id) { lock.current = null; pending.current = null; }
    }
  }, [owner]);
  return { ...(result.owner === owner && result.generation === generation.current ? result : empty(owner, generation.current)), locate };
}
