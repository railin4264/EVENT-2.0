import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { apiClient } from '../services/apiClient';

export interface ReliabilityStats {
  scheduled: number; cancelled: number; markedCompleted: number; withCheckIns: number;
  cancellationRate: number | null; reviews: { count: number; average: number | null }; methodology: string;
}
interface OwnReview { eligible: boolean; review: { rating: number; comment: string } | null; reason: string | null }
const message = (error: any) => error.response?.data?.message || error.message || 'No se pudo completar la solicitud.';
export function useOrganizerReliability(organizerId: string, eventId: string, isPublic: boolean) {
  const { user } = useAuth();
  const owner = user?._id || user?.id || '';
  const scope = `${owner}:${organizerId}:${eventId}:${isPublic}`;
  const current = useRef(scope), generation = useRef(0), mounted = useRef(true), lock = useRef<object | null>(null);
  if (current.current !== scope) { current.current = scope; generation.current += 1; }
  const [record, setRecord] = useState<{ scope: string; stats: ReliabilityStats | null; own: OwnReview | null; loading: boolean; saving: boolean; error: string; saved: boolean }>({ scope, stats: null, own: null, loading: false, saving: false, error: '', saved: false });
  const load = useCallback(async () => {
    const epoch = ++generation.current;
    const valid = () => mounted.current && current.current === scope && generation.current === epoch;
    if (!valid()) return;
    setRecord({ scope, stats: null, own: null, loading: Boolean(isPublic && organizerId), saving: false, error: '', saved: false });
    if (!isPublic || !organizerId) return;
    try {
      const stats = await apiClient.get(`/organizer-reputation/${organizerId}`);
      if (stats.data.success !== true || !stats.data.data) throw new Error('El servidor no confirmó el historial.');
      if (!valid()) return;
      setRecord(previous => ({ ...previous, stats: stats.data.data }));
      if (owner && eventId) {
        const own = await apiClient.get(`/organizer-reputation/events/${eventId}/review`);
        if (own.data.success !== true || !own.data.data) throw new Error('No se pudo verificar tu entrada.');
        if (valid()) setRecord(previous => ({ ...previous, own: own.data.data }));
      }
    } catch (error) { if (valid()) setRecord(previous => ({ ...previous, error: message(error) })); }
    finally { if (valid()) setRecord(previous => ({ ...previous, loading: false })); }
  }, [eventId, isPublic, organizerId, owner, scope]);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; generation.current += 1; }; }, []);
  useEffect(() => { lock.current = null; void load(); }, [load]);
  const save = async (rating: number, comment: string) => {
    if (!owner || !isPublic || !eventId || record.scope !== scope || !record.own?.eligible || lock.current || !Number.isInteger(rating) || rating < 1 || rating > 5 || comment.length > 600) return;
    const ticket = {}, epoch = generation.current; lock.current = ticket;
    const valid = () => mounted.current && current.current === scope && generation.current === epoch && lock.current === ticket;
    setRecord(previous => ({ ...previous, saving: true, saved: false, error: '' }));
    try {
      const response = await apiClient.put(`/organizer-reputation/events/${eventId}/review`, { rating, comment });
      if (response.data.success !== true) throw new Error('El servidor no confirmó la opinión.');
      if (valid()) {
        setRecord(previous => ({ ...previous, saved: true, own: previous.own ? { ...previous.own, review: { rating, comment } } : null }));
        const stats = await apiClient.get(`/organizer-reputation/${organizerId}`);
        if (valid() && stats.data.success === true) setRecord(previous => ({ ...previous, stats: stats.data.data }));
      }
    } catch (error) { if (valid()) setRecord(previous => ({ ...previous, error: message(error) })); }
    finally { if (valid()) setRecord(previous => ({ ...previous, saving: false })); if (lock.current === ticket) lock.current = null; }
  };
  return { ...(record.scope === scope ? record : { stats: null, own: null, loading: false, saving: false, error: '', saved: false }), load, save };
}
