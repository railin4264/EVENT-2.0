import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import eventService from '../services/EventService';
import type { Event } from '../types';
import { eventIsAttending } from '../utils/admission';
import { eventParam } from '../utils/eventAuthReturn';

export function useEventRsvp(eventId: string | null) {
  const { user } = useAuth();
  const owner = user?._id || user?.id || null;
  const scope = `${owner || 'guest'}:${eventId}`;
  const current = useRef(scope);
  const generation = useRef(0);
  if (current.current !== scope) generation.current += 1;
  current.current = scope;
  const epoch = generation.current;
  const mounted = useRef(true);
  const sequence = useRef(0);
  const action = useRef<object | null>(null);
  const [record, setRecord] = useState<{ scope: string; event: Event | null; loading: boolean; error: string | null }>({ scope, event: null, loading: true, error: null });
  const [pending, setPending] = useState<string | null>(null);
  const load = useCallback(async () => {
    if (!mounted.current || current.current !== scope || generation.current !== epoch) return;
    const request = ++sequence.current;
    const valid = () => mounted.current && current.current === scope && sequence.current === request;
    if (!eventParam(eventId)) {
      setRecord({ scope, event: null, loading: false, error: 'Identificador de evento inválido.' });
      return;
    }
    setRecord(previous => ({ scope, event: previous.scope === scope ? previous.event : null, loading: true, error: null }));
    try {
      const event = await eventService.getEventById(eventId!);
      if (valid()) setRecord({ scope, event, loading: false, error: null });
    } catch (error: any) {
      if (valid()) setRecord(previous => ({ ...previous, loading: false, error: error.message || 'No se pudo cargar el evento.' }));
    }
  }, [eventId, scope, epoch]);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; sequence.current += 1; action.current = null; }; }, []);
  useEffect(() => { action.current = null; setPending(null); void load(); }, [load]);
  const event = record.scope === scope ? record.event : null;
  const isAttending = event ? eventIsAttending(event, owner) : false;
  const toggle = async () => {
    if (!mounted.current || current.current !== scope || generation.current !== epoch || !owner || !event || action.current) return false;
    const ticket = {};
    action.current = ticket;
    setPending(scope);
    const valid = () => mounted.current && current.current === scope && generation.current === epoch && action.current === ticket;
    // An in-flight fetch may not overwrite the result of this mutation.
    sequence.current += 1;
    try {
      const response = await (isAttending ? eventService.leaveEvent(event._id) : eventService.joinEvent(event._id));
      if (!valid()) return false;
      if (!response.success) throw new Error(response.message || 'No se pudo actualizar tu asistencia.');
      const returned = (response as typeof response & { event?: Event }).event;
      setRecord(previous => previous.scope !== scope ? previous : { ...previous, loading: false, error: null,
        event: returned || { ...event, isAttending: !isAttending } });
      return true;
    } catch (error) { if (valid()) throw error; return false; }
    finally {
      if (valid()) setPending(null);
      if (action.current === ticket) action.current = null;
    }
  };
  return { event, isAttending, loading: record.scope !== scope || record.loading,
    error: record.scope === scope ? record.error : null, actionLoading: pending === scope, load, toggle };
}
