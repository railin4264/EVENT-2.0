import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { apiClient } from '../services/apiClient';

export type NotificationPreference = 'push' | 'email' | 'friendPlans' | 'shareAttendance';
const empty = () => ({ push: false, email: false, friendPlans: false, shareAttendance: false });
type Preferences = ReturnType<typeof empty>;
const read = (value: any): Preferences => ({ push: value?.push === true, email: value?.email === true,
  friendPlans: value?.friendPlans === true, shareAttendance: value?.shareAttendance === true });

export function useNotificationPreferences() {
  const { user } = useAuth();
  const owner = user?._id || user?.id || null;
  const current = useRef(owner);
  const generation = useRef(0);
  if (current.current !== owner) { current.current = owner; generation.current += 1; }
  const mounted = useRef(true);
  const action = useRef<object | null>(null);
  const [record, setRecord] = useState<{ owner: string | null; values: Preferences; ready: boolean; saving: boolean; error: string | null }>({ owner, values: empty(), ready: false, saving: false, error: null });
  const load = useCallback(async () => {
    if (!mounted.current || current.current !== owner) return;
    const request = ++generation.current;
    const valid = () => mounted.current && current.current === owner && request === generation.current;
    setRecord({ owner, values: empty(), ready: false, saving: false, error: null });
    if (!owner) return;
    try {
      const { data } = await apiClient.get('/users/me/settings');
      if (!valid()) return;
      if (data.success !== true || !data.settings?.notifications) throw new Error('No se pudieron cargar las preferencias.');
      setRecord({ owner, values: read(data.settings.notifications), ready: true, saving: false, error: null });
    } catch (error: any) {
      if (valid()) setRecord(previous => ({ ...previous, error: error.response?.data?.message || error.message || 'No se pudieron cargar las preferencias.' }));
    }
  }, [owner]);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; generation.current += 1; }; }, []);
  useEffect(() => { action.current = null; void load(); }, [load]);
  const ready = record.owner === owner && record.ready;
  const save = async (key: NotificationPreference, value: boolean) => {
    if (!mounted.current || current.current !== owner || !owner || !ready || action.current || typeof value !== 'boolean') return;
    const request = generation.current;
    const ticket = {};
    const before = record.values;
    const optimistic = { ...before, [key]: value };
    action.current = ticket;
    const valid = () => mounted.current && current.current === owner && request === generation.current && action.current === ticket;
    setRecord(previous => ({ ...previous, values: optimistic, saving: true, error: null }));
    try {
      const { data } = await apiClient.put('/users/me/notifications', { [key]: value });
      if (!valid()) return;
      if (data.success !== true || !data.notifications || typeof data.notifications[key] !== 'boolean') throw new Error('El servidor no confirmó el cambio.');
      setRecord({ owner, values: read(data.notifications), ready: true, saving: false, error: null });
    } catch (error: any) {
      if (valid()) setRecord({ owner, values: before, ready: true, saving: false, error: error.response?.data?.message || error.message || 'No se guardó el cambio. Inténtalo de nuevo.' });
    } finally { if (action.current === ticket) action.current = null; }
  };
  return { values: record.owner === owner ? record.values : empty(), ready, saving: record.owner === owner && record.saving,
    error: record.owner === owner ? record.error : null, load, save };
}
