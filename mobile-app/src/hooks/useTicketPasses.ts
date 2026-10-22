import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { ticketService } from '@/services/TicketService';
import type { Ticket } from '@/types';

export function useTicketPasses() {
  const { user } = useAuth();
  const owner = user?._id || user?.id || '';
  const identity = useRef(owner);
  identity.current = owner;
  const generation = useRef(0);
  const [state, setState] = useState({ owner: '', tickets: [] as Ticket[], loading: true, offline: false, savedAt: null as number | null, error: '' });
  const reload = useCallback(async () => {
    const request = ++generation.current;
    const current = () => identity.current === owner && generation.current === request;
    if (!owner) { setState({ owner, tickets: [], loading: false, offline: false, savedAt: null, error: 'Inicia sesión para ver tus entradas.' }); return; }
    setState(previous => ({ ...previous, owner, tickets: previous.owner === owner ? previous.tickets : [], loading: true, error: '' }));
    try {
      const result = await ticketService.getOwnedPasses(owner, current);
      if (current()) setState({ owner, ...result, loading: false, error: '' });
    } catch (error: any) {
      if (current()) setState({ owner, tickets: [], loading: false, offline: false, savedAt: null, error: error.message || 'No se pudieron cargar tus entradas.' });
    }
  }, [owner]);
  useEffect(() => { const requestGeneration = generation; void reload(); return () => { requestGeneration.current++; }; }, [reload]);
  return { ...state, tickets: state.owner === owner ? state.tickets : [], loading: state.owner !== owner || state.loading, reload };
}
