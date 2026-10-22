import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { apiClient } from '../../services/apiClient';
import { useTheme } from '../../contexts/ThemeContext';

export function PrivateWorkspaceControls<T extends object>({ ownerKey, kind, workspaceKey = 'personal', data, onLoad }: { ownerKey?: string; kind: 'partner-brief' | 'host-readiness'; workspaceKey?: string; data: T; onLoad: (value: T) => void }) {
  const { theme } = useTheme(), colors = theme.colors;
  const owner = typeof ownerKey === 'string' && /^[a-f0-9]{24}$/i.test(ownerKey) ? ownerKey : '';
  const key = `${owner}:${kind}:${workspaceKey}`, active = useRef(key), alive = useRef(true); active.current = key;
  const [record, setRecord] = useState<{ key: string; version: string | 0 } | null>(null);
  const [busy, setBusy] = useState(false), [status, setStatus] = useState('');
  const lock = useRef(false), path = `/users/me/workspaces/${kind}/${encodeURIComponent(workspaceKey)}`;
  useEffect(() => {
    alive.current = true; setRecord(null); setBusy(false); setStatus(''); lock.current = false;
    let mounted = true;
    if (owner) void apiClient.get(`${path}?ownerId=${owner}`).then(response => { if (mounted && active.current === key) setRecord({ key, version: response.data.data.version }); }).catch(() => { if (mounted && active.current === key) setStatus('No se pudo consultar el guardado. Usa «Cargar guardado» para reintentar.'); });
    return () => { mounted = false; alive.current = false; };
  }, [owner, path, key]);
  const run = async (action: 'save' | 'load' | 'delete') => {
    if (!owner || lock.current) return;
    lock.current = true; setBusy(true); setStatus('');
    const current = () => alive.current && active.current === key;
    try {
      if (action === 'load') {
        const response = await apiClient.get(`${path}?ownerId=${owner}`);
        if (!current()) return;
        const saved = response.data.data; setRecord({ key, version: saved.version });
        if (saved.data) { onLoad(saved.data as T); setStatus('Guardado cargado. Revisa el borrador antes de usarlo.'); }
        else setStatus('Todavía no hay un borrador guardado aquí.');
      } else if (record?.key === key) {
        if (action === 'save') {
          const response = await apiClient.put(path, { ownerId: owner, data, version: record.version });
          if (current()) { setRecord({ key, version: response.data.data.version }); setStatus('Guardado en tu cuenta. Sólo tú puedes recuperarlo.'); }
        } else {
          await apiClient.delete(`${path}?version=${record.version}&ownerId=${owner}`);
          if (current()) { setRecord({ key, version: 0 }); setStatus('Guardado eliminado; puedes seguir editando esta pantalla.'); }
        }
      }
    } catch (error) {
      if (current()) setStatus((error as { response?: { status?: number } }).response?.status === 409 ? 'El guardado cambió o alcanzaste 20 borradores. Carga la versión guardada antes de guardar.' : 'No se pudo completar la acción. Tu edición de esta pantalla sigue disponible.');
    } finally { if (current()) { lock.current = false; setBusy(false); } }
  };
  if (!owner) return <Text style={{ color: colors.textSecondary, marginVertical: 12 }}>Inicia sesión para guardar en tu cuenta, o exporta el borrador.</Text>;
  return <View style={{ padding: 14, borderRadius: 14, borderWidth: 1, borderColor: colors.border, marginVertical: 14 }}><Text style={{ color: colors.text, fontWeight: '600' }}>Tu espacio privado</Text><Text style={{ color: colors.textSecondary, marginTop: 8, lineHeight: 21 }}>Guardado opcional, hasta 20 borradores. No publica información ni cambia el evento.</Text>{(['save', 'load', 'delete'] as const).map(action => <TouchableOpacity key={action} accessibilityRole="button" disabled={busy || (action !== 'load' && record?.key !== key) || (action === 'delete' && !record?.version)} onPress={() => void run(action)} style={{ minHeight: 48, justifyContent: 'center', opacity: busy ? 0.4 : 1 }}><Text style={{ color: colors.primary }}>{action === 'save' ? 'Guardar en mi cuenta' : action === 'load' ? 'Cargar guardado' : 'Eliminar guardado'}</Text></TouchableOpacity>)}{status ? <Text accessibilityLiveRegion="polite" style={{ color: colors.textSecondary }}>{status}</Text> : null}</View>;
}
