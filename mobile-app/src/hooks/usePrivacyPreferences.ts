import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { apiClient } from '../services/apiClient';

type Privacy = { showProfile: boolean; showAttendedEvents: boolean; showLocation: boolean };
const empty = (): Privacy => ({ showProfile: false, showAttendedEvents: false, showLocation: false });
const read = (value: any): Privacy => ({ showProfile: value?.showProfile === true, showAttendedEvents: value?.showAttendedEvents === true, showLocation: value?.showLocation === true });
export function usePrivacyPreferences() {
  const { user } = useAuth();
  const owner = user?._id || user?.id || null;
  const current = useRef(owner), generation = useRef(0), mounted = useRef(true), lock = useRef<object | null>(null);
  if (current.current !== owner) { current.current = owner; generation.current += 1; }
  const [record, setRecord] = useState({ owner, values: empty(), ready: false, saving: false, error: '' });
  const load = useCallback(async () => {
    if (!mounted.current || current.current !== owner) return;
    const epoch = ++generation.current;
    const valid = () => mounted.current && current.current === owner && generation.current === epoch;
    setRecord({ owner, values: empty(), ready: false, saving: false, error: '' });
    if (!owner) return;
    try {
      const { data } = await apiClient.get('/users/me/settings');
      if (data.success !== true || !data.settings?.privacy) throw new Error('El servidor no confirmó las preferencias.');
      if (valid()) setRecord({ owner, values: read(data.settings.privacy), ready: true, saving: false, error: '' });
    } catch (error: any) { if (valid()) setRecord(previous => ({ ...previous, error: error.response?.data?.message || error.message || 'No se pudo cargar la privacidad.' })); }
  }, [owner]);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; generation.current += 1; }; }, []);
  useEffect(() => { lock.current = null; void load(); }, [load]);
  const ready = record.owner === owner && record.ready;
  const save = async (key: keyof Privacy, value: boolean) => {
    if (!mounted.current || current.current !== owner || !owner || !ready || lock.current) return;
    const epoch = generation.current, ticket = {}, before = record.values;
    lock.current = ticket;
    const valid = () => mounted.current && current.current === owner && generation.current === epoch && lock.current === ticket;
    setRecord(previous => ({ ...previous, values: { ...before, [key]: value }, saving: true, error: '' }));
    try {
      const { data } = await apiClient.put('/users/me/settings', { privacy: { [key]: value } });
      if (data.success !== true || typeof data.settings?.privacy?.[key] !== 'boolean') throw new Error('El servidor no confirmó el cambio.');
      if (valid()) setRecord({ owner, values: read(data.settings.privacy), ready: true, saving: false, error: '' });
    } catch (error: any) { if (valid()) setRecord({ owner, values: before, ready: true, saving: false, error: error.response?.data?.message || error.message || 'No se guardó el cambio.' }); }
    finally { if (lock.current === ticket) lock.current = null; }
  };
  return { values: record.owner === owner ? record.values : empty(), ready, saving: record.owner === owner && record.saving,
    error: record.owner === owner ? record.error : '', load, save };
}
