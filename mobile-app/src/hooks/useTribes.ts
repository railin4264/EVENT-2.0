import { useState, useEffect, useCallback, useRef } from 'react';
import { tribesService, Tribe, CreateTribeRequest } from '../services/tribesService';
import { useAuth } from '../contexts/AuthContext';
import { tribeAccess } from '../utils/tribeAccess';

export interface UseTribesOptions {
  autoFetch?: boolean;
  category?: string;
  search?: string;
  limit?: number;
}
const EMPTY_PAGINATION = { page: 1, pages: 1, total: 0, hasMore: false };

export const useTribes = (options: UseTribesOptions = {}) => {
  const { autoFetch = true, category, search, limit = 10 } = options;
  const { user } = useAuth();
  const ownerId = String(user?._id || user?.id || 'guest');
  const scope = JSON.stringify([ownerId, category, search, limit]);
  const latest = useRef(scope);
  latest.current = scope;
  const mounted = useRef(true);
  const busyScope = useRef<string | null>(null);
  const version = useRef(0);
  const initialPagination = EMPTY_PAGINATION;
  const [record, setRecord] = useState<{ scope: string; items: Tribe[]; pagination: typeof initialPagination } | null>(null);
  const [fetching, setFetching] = useState<string | null>(null);
  const [failure, setFailure] = useState<{ scope: string; message: string } | null>(null);
  const fetchTribes = useCallback(async (page = 1, append = false) => {
    if (!mounted.current || latest.current !== scope || busyScope.current === scope) return;
    busyScope.current = scope;
    const request = ++version.current;
    setFetching(scope);
    setFailure(null);
    try {
      const response = await tribesService.getTribes({ page, limit, category, search });
      if (!mounted.current || latest.current !== scope || request !== version.current) return;
      if (!response.success) throw new Error('No se pudieron cargar las tribus.');
      const pagination = response.pagination ? { page: response.pagination.page, pages: response.pagination.pages,
        total: response.pagination.total, hasMore: response.pagination.page < response.pagination.pages } : initialPagination;
      setRecord(previous => ({ scope, items: append && previous?.scope === scope ?
        [...new Map([...previous.items, ...response.tribes].map(tribe => [tribe._id, tribe])).values()] : response.tribes, pagination }));
    } catch (cause: any) {
      if (mounted.current && latest.current === scope && request === version.current) setFailure({ scope, message: cause.response?.data?.message || 'No se pudieron cargar las tribus.' });
    } finally {
      if (busyScope.current === scope) busyScope.current = null;
      if (mounted.current && latest.current === scope && request === version.current) setFetching(null);
    }
  }, [scope, category, search, limit, initialPagination]);
  const pagination = record?.scope === scope ? record.pagination : initialPagination;
  const loadMore = useCallback(() => {
    if (pagination.hasMore) void fetchTribes(pagination.page + 1, true);
  }, [pagination.hasMore, pagination.page, fetchTribes]);
  const refresh = useCallback(() => { void fetchTribes(1, false); }, [fetchTribes]);
  useEffect(() => {
    mounted.current = true;
    if (autoFetch) void fetchTribes();
    return () => { mounted.current = false; version.current += 1; };
  }, [autoFetch, fetchTribes]);
  return { tribes: record?.scope === scope ? record.items : [], loading: fetching === scope,
    error: failure?.scope === scope ? failure.message : null, pagination, fetchTribes, loadMore, refresh };
};

export const useTribe = (tribeId?: string) => {
  const { user } = useAuth();
  const ownerId = String(user?._id || (user as { id?: string } | null)?.id || 'guest');
  const scope = `${ownerId}:${tribeId || ''}`;
  const scopeRef = useRef(scope);
  scopeRef.current = scope;
  const mounted = useRef(true);
  const version = useRef(0);
  const mutationScope = useRef<string | null>(null);
  const [record, setRecord] = useState<{ scope: string; value: Tribe } | null>(null);
  const [failure, setFailure] = useState<{ scope: string; message: string } | null>(null);
  const [fetchingScope, setFetchingScope] = useState<string | null>(null);
  const [actionScope, setActionScope] = useState<string | null>(null);
  const current = useCallback(() => mounted.current && scopeRef.current === scope, [scope]);
  const tribe = record?.scope === scope ? record.value : null;
  const error = failure?.scope === scope ? failure.message : null;

  const fetchTribe = useCallback(async (id: string) => {
    if (!current() || id !== tribeId) return false;
    const request = ++version.current;
    setFetchingScope(scope);
    setFailure(null);
    try {
      const response = await tribesService.getTribe(id);
      if (!current() || request !== version.current) return false;
      if (!response.success || !response.tribe) throw new Error('No se pudo cargar la tribu.');
      let value = response.tribe;
      if (tribeAccess(value, ownerId).canManageRequests) {
        try {
          const requests = await tribesService.getJoinRequests(id);
          if (!current() || request !== version.current) return false;
          if (!requests.success) throw new Error('No se pudieron leer las solicitudes.');
          value = { ...value, joinRequests: requests.joinRequests };
        } catch (cause: any) {
          if (!current() || request !== version.current) return false;
          value = { ...value, joinRequests: [], ...(cause.response?.status === 403 ? { canManageRequests: false } : {}) };
          setFailure({ scope, message: 'No pudimos actualizar las solicitudes. Puedes reintentar.' });
        }
      }
      setRecord({ scope, value });
      return true;
    } catch (cause: any) {
      if (!current() || request !== version.current) return false;
      if ([401, 403, 404].includes(cause.response?.status)) setRecord(null);
      setFailure({ scope, message: cause.response?.data?.message || cause.message || 'No se pudo cargar la tribu.' });
      return false;
    } finally {
      if (current() && request === version.current) setFetchingScope(null);
    }
  }, [current, scope, tribeId, ownerId]);

  const mutate = useCallback(async (operation: () => Promise<{ success: boolean; message: string; status?: string; hasPendingRequest?: boolean }>, kind: 'join' | 'leave' | 'cancel' | 'approve' | 'reject', target?: string) => {
    if (!tribeId || !current()) return { success: false, message: 'La sesión o la tribu cambió.' };
    if (mutationScope.current === scope) return { success: false, message: 'Espera a que termine la acción actual.' };
    mutationScope.current = scope;
    setActionScope(scope);
    try {
      const response = await operation();
      if (!current()) return { success: false, message: 'La sesión cambió; no se aplicaron datos a la nueva cuenta.' };
      if (!response.success) return response;
      // A successful leave must hide restricted content even if the refresh is offline.
      setRecord(previous => {
        if (!current() || previous?.scope !== scope) return previous;
        const value = previous.value;
        if (kind === 'leave') return { scope, value: { ...value, isMember: false, isAdmin: false, userRole: null,
          canViewContent: false, canManageRequests: false, canJoin: false, canRequestJoin: false,
          members: [], joinRequests: [], hasPendingRequest: false, joinRequestStatus: 'none' } };
        if (kind === 'join') return { scope, value: { ...value, hasPendingRequest: response.status === 'pending',
          isMember: response.status === 'joined', joinRequestStatus: response.status === 'pending' ? 'pending' : 'member', canJoin: false, canRequestJoin: false } };
        if (kind === 'cancel') return { scope, value: { ...value, hasPendingRequest: false, joinRequestStatus: 'none' } };
        return { scope, value: { ...value, joinRequests: (value.joinRequests || []).filter(request => String(typeof request.user === 'object' ? request.user?._id || request.user?.id : request.user) !== target) } };
      });
      const refreshed = await fetchTribe(tribeId);
      if (!current()) return { success: false, message: 'La sesión cambió.' };
      return { ...response, message: response.message + (refreshed ? '' : ' La acción se completó, pero falta actualizar la ficha.') };
    } catch (cause: any) {
      if (!current()) return { success: false, message: 'La sesión cambió.' };
      if ([401, 403].includes(cause.response?.status)) {
        setRecord(null);
        setFailure({ scope, message: cause.response?.data?.message || 'Tu acceso a esta tribu cambió.' });
      }
      return { success: false, message: cause.response?.data?.message || 'No se pudo completar la acción. Inténtalo de nuevo.' };
    } finally {
      if (mutationScope.current === scope) mutationScope.current = null;
      if (current()) setActionScope(null);
    }
  }, [current, scope, tribeId, fetchTribe]);

  const joinTribe = useCallback((id: string, message?: string) => id === tribeId ? mutate(() => tribesService.joinTribe(id, message), 'join') : Promise.resolve({ success: false, message: 'La tribu cambió.' }), [mutate, tribeId]);
  const leaveTribe = useCallback((id: string) => id === tribeId ? mutate(() => tribesService.leaveTribe(id), 'leave') : Promise.resolve({ success: false, message: 'La tribu cambió.' }), [mutate, tribeId]);
  const cancelJoinRequest = useCallback((id: string) => id === tribeId ? mutate(() => tribesService.cancelJoinRequest(id), 'cancel') : Promise.resolve({ success: false, message: 'La tribu cambió.' }), [mutate, tribeId]);
  const approveRequest = useCallback((id: string) => mutate(() => tribesService.approveJoinRequest(tribeId!, id), 'approve', id), [mutate, tribeId]);
  const rejectRequest = useCallback((id: string) => mutate(() => tribesService.rejectJoinRequest(tribeId!, id), 'reject', id), [mutate, tribeId]);

  useEffect(() => {
    mounted.current = true;
    if (tribeId) void fetchTribe(tribeId);
    return () => { mounted.current = false; version.current += 1; };
  }, [tribeId, fetchTribe]);

  return { tribe, loading: Boolean(tribeId) && (fetchingScope === scope || (!tribe && !error)), refreshing: fetchingScope === scope,
    actionLoading: actionScope === scope, error, fetchTribe, joinTribe, leaveTribe, cancelJoinRequest, approveRequest, rejectRequest };
};

export const useUserTribes = () => {
  const { user } = useAuth();
  const scope = String(user?._id || user?.id || '');
  const latest = useRef(scope);
  latest.current = scope;
  const mounted = useRef(true);
  const [record, setRecord] = useState<{ scope: string; tribes: Tribe[] } | null>(null);
  const [pending, setPending] = useState<string | null>(null);
  const [failure, setFailure] = useState<{ scope: string; message: string } | null>(null);
  const fetchUserTribes = useCallback(async () => {
    if (!scope || !mounted.current || latest.current !== scope) return;
    setPending(scope);
    setFailure(null);
    try {
      const response = await tribesService.getUserTribes();
      if (!mounted.current || latest.current !== scope) return;
      if (!response.success) throw new Error();
      setRecord({ scope, tribes: response.tribes });
    } catch (cause: any) {
      if (mounted.current && latest.current === scope) setFailure({ scope, message: cause.response?.data?.message || 'No se pudieron cargar tus tribus.' });
    } finally { if (mounted.current && latest.current === scope) setPending(null); }
  }, [scope]);
  useEffect(() => {
    mounted.current = true;
    void fetchUserTribes();
    return () => { mounted.current = false; };
  }, [fetchUserTribes]);
  return { tribes: record?.scope === scope ? record.tribes : [], loading: pending === scope,
    error: failure?.scope === scope ? failure.message : null, refresh: fetchUserTribes };
};

export const useCreateTribe = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createTribe = useCallback(async (data: CreateTribeRequest) => {
    try {
      setLoading(true);
      setError(null);

      const response = await tribesService.createTribe(data);
      
      if (response.success) {
        return { success: true, tribe: response.tribe };
      }
    } catch (err: any) {
      console.error('Error creating tribe:', err);
      const errorMessage = err.response?.data?.message || 'Error creating tribe';
      setError(errorMessage);
      return { success: false, message: errorMessage };
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    createTribe,
    loading,
    error,
  };
};
