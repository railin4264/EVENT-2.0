import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, ScrollView, View, Text, TextInput, TouchableOpacity, Switch, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { apiClient } from '../services/apiClient';
import { useAuth } from '../contexts/AuthContext';
import HostReadinessTools from '../components/HostReadinessTools';

type Offer = { userId: string; name?: string; note: string; status: string };
type Community = { title: string; canManage: boolean; canContribute: boolean; canRepeat: boolean; canJoinMeetup: boolean; canSetMeetup: boolean; roles: { id: string; title: string; slots: number; acceptedCount: number; closed: boolean; offers: Offer[] }[]; repeat: { interested: boolean; interestedCount: number; days: string[]; dayCounts: Record<string, number> }; meetup: null | { place: string; time: string; expiresAt: string; participantCount: number; joined: boolean; names: string[] } };
const DAYS = [['monday', 'Lunes'], ['tuesday', 'Martes'], ['wednesday', 'Miércoles'], ['thursday', 'Jueves'], ['friday', 'Viernes'], ['saturday', 'Sábado'], ['sunday', 'Domingo']];
const message = (failure: any) => failure.response?.data?.message || failure.message || 'No se pudo completar la acción.';
const accept = (response: any): Community => { if (response.data?.success !== true || !Array.isArray(response.data?.data?.roles)) throw new Error('El servidor no confirmó la operación.'); return response.data.data; };
export default function CommunityEventScreen() {
  const { id, scope: rawScope } = useLocalSearchParams<{ id: string; scope?: string }>();
  const { user } = useAuth();
  const owner = user?._id || user?.id || '';
  const scope = rawScope === 'ideas' ? 'ideas' : 'events';
  return <Actions key={`${owner}:${scope}:${id}`} id={id} scope={scope} owner={owner} />;
}
function ActionButton({ children, onPress, disabled = false }: { children: React.ReactNode; onPress: () => void; disabled?: boolean }) { return <TouchableOpacity accessibilityRole="button" disabled={disabled} onPress={onPress} style={[s.button, disabled && { opacity: 0.4 }]}><Text style={s.buttonText}>{children}</Text></TouchableOpacity>; }
function Actions({ id, scope, owner }: { id: string; scope: string; owner: string }) {
  const router = useRouter(), insets = useSafeAreaInsets();
  const [data, setData] = useState<Community | null>(null), [loading, setLoading] = useState(true), [busy, setBusy] = useState(false), [error, setError] = useState('');
  const [title, setTitle] = useState(''), [slots, setSlots] = useState('1'), [notes, setNotes] = useState<Record<string, string>>({}), [days, setDays] = useState<string[]>([]);
  const [place, setPlace] = useState(''), [time, setTime] = useState(''), [publicPlace, setPublicPlace] = useState(false), [shareName, setShareName] = useState(false);
  const mounted = useRef(true), locked = useRef(false), version = useRef(0);
  const base = `/community-actions/${scope}/${encodeURIComponent(id)}`;
  const load = useCallback(async () => {
    const request = ++version.current; setLoading(true); setError('');
    try { const next = accept(await apiClient.get(base)); if (mounted.current && request === version.current) { setData(next); setDays(next.repeat.days); } }
    catch (failure) { if (mounted.current && request === version.current) setError(message(failure)); }
    finally { if (mounted.current && request === version.current) setLoading(false); }
  }, [base]);
  useEffect(() => { const requestVersion = version; mounted.current = true; void load(); return () => { mounted.current = false; requestVersion.current++; }; }, [load]);
  useEffect(() => {
    const expiry = Date.parse(data?.meetup?.expiresAt || ''), meeting = Date.parse(data?.meetup?.time || '');
    if (!Number.isFinite(expiry)) return;
    let timer: ReturnType<typeof setTimeout>;
    const update = () => {
      clearTimeout(timer);
      const now = Date.now();
      if (now >= expiry) { setData(current => current ? { ...current, meetup: null, canJoinMeetup: false, canSetMeetup: false, canContribute: false } : current); return; }
      if (now >= meeting) setData(current => current ? { ...current, canJoinMeetup: false } : current);
      timer = setTimeout(update, Math.min(2147483647, (meeting > now ? Math.min(expiry, meeting) : expiry) - now + 10));
    };
    update(); const listener = AppState.addEventListener('change', state => { if (state === 'active') update(); });
    return () => { clearTimeout(timer); listener.remove(); };
  }, [data?.meetup?.expiresAt, data?.meetup?.time]);
  const act = async (method: 'post' | 'put' | 'patch' | 'delete', path: string, body?: unknown) => {
    if (!owner || locked.current) return false;
    locked.current = true; setBusy(true); setError('');
    try { const next = accept(await apiClient[method](`${base}${path}`, body)); if (mounted.current) { setData(next); setDays(next.repeat.days); } return true; }
    catch (failure) { if (mounted.current) setError(message(failure)); return false; }
    finally { locked.current = false; if (mounted.current) setBusy(false); }
  };
  const publishMeeting = () => { const parsed = new Date(time); if (!Number.isFinite(parsed.getTime())) { setError('Escribe una fecha válida: AAAA-MM-DDTHH:mm, en tu hora local.'); return; } void act('put', '/meetup', { place: place.trim(), time: parsed.toISOString(), isPublicPlace: publicPlace }); };
  return <ScrollView style={s.page} contentContainerStyle={{ padding: 20, paddingTop: insets.top + 15, paddingBottom: insets.bottom + 40 }} keyboardShouldPersistTaps="handled">
    <ActionButton onPress={() => router.back()}>← Volver</ActionButton>
    {loading ? <Text style={s.copy}>Cargando la comunidad…</Text> : <>
      {error ? <Text accessibilityRole="alert" style={s.error}>{error}</Text> : null}
      {!data ? <ActionButton onPress={() => void load()}>Reintentar carga</ActionButton> : <>
        <Text style={s.eyebrow}>EL PLAN LO HACEMOS JUNTOS</Text><Text accessibilityRole="header" style={s.title}>{data.title}</Text><Text style={s.copy}>Participar es voluntario. Estas acciones no compran entradas, no reservan plazas del evento y no procesan pagos.</Text>
        {!owner && <View><Text style={s.copy}>Inicia sesión para ofrecer tu ayuda o guardar tus preferencias.</Text><ActionButton onPress={() => router.push({ pathname: '/(auth)/login', params: { returnTo: `/community-event/${id}${scope === 'ideas' ? '?scope=ideas' : ''}` } } as any)}>Entrar y volver a esta actividad</ActionButton></View>}
        <HostReadinessTools actorKey={owner} targetKey={`${scope}:${id}`} title={data.title} roles={data.roles} canManage={data.canManage} canShareCall={(data as Community & { canShareCall?: boolean }).canShareCall === true} />
        <View style={s.panel}><Text accessibilityRole="header" style={s.heading}>Yo aporto</Text><Text style={s.copy}>Tu nombre y oferta se comparten con el anfitrión. Las ofertas son privadas para el anfitrión y su autor. Acordad los detalles antes de comprometeros.</Text>
          {data.canManage && data.canContribute && <><Text style={s.label}>¿Qué hace falta?</Text><TextInput accessibilityLabel="Necesidad" value={title} onChangeText={setTitle} maxLength={100} editable={!busy} style={s.input} /><Text style={s.label}>Plazas (1 a 50)</Text><TextInput accessibilityLabel="Plazas" value={slots} onChangeText={setSlots} keyboardType="number-pad" editable={!busy} style={s.input} /><ActionButton disabled={busy || !title.trim()} onPress={() => void act('post', '/roles', { title: title.trim(), slots: Number(slots) }).then(ok => { if (ok && mounted.current) { setTitle(''); setSlots('1'); } })}>Añadir necesidad</ActionButton></>}
          {!data.roles.length && <Text style={s.copy}>Todavía no hay necesidades publicadas.</Text>}
          {data.roles.map(role => <View key={role.id} style={s.item}><Text style={s.label}>{role.title}</Text><Text style={s.copy}>{role.acceptedCount}/{role.slots} colaboradores aceptados · {role.closed ? 'Cerrada' : 'Abierta'}</Text>
            {data.canManage && data.canContribute && <ActionButton disabled={busy} onPress={() => void act('patch', `/roles/${role.id}`, { closed: !role.closed })}>{role.closed ? 'Reabrir convocatoria' : 'Cerrar convocatoria'}</ActionButton>}
            {role.offers.map((offer, index) => <View key={offer.userId} style={s.item}><Text style={s.label}>{offer.userId === owner ? 'Tu oferta' : offer.name || `Propuesta ${index + 1}`} · {offer.status === 'accepted' ? 'Aceptada' : offer.status === 'declined' ? 'No aceptada' : 'Por revisar'}</Text><Text style={s.copy}>{offer.note}</Text>{data.canManage && data.canContribute && <><ActionButton disabled={busy || offer.status === 'accepted' || role.acceptedCount >= role.slots} onPress={() => void act('patch', `/roles/${role.id}/offers/${offer.userId}`, { status: 'accepted' })}>Aceptar aporte</ActionButton><ActionButton disabled={busy || offer.status === 'declined'} onPress={() => void act('patch', `/roles/${role.id}/offers/${offer.userId}`, { status: 'declined' })}>No aceptar</ActionButton></>}{offer.userId === owner && <ActionButton disabled={busy} onPress={() => void act('delete', `/roles/${role.id}/offer`)}>Retirar mi oferta</ActionButton>}</View>)}
            {owner && !data.canManage && data.canContribute && !role.closed && !role.offers.length ? <><Text style={s.label}>¿Qué puedes aportar?</Text><TextInput accessibilityLabel={`Aporte para ${role.title}`} value={notes[role.id] || ''} onChangeText={value => setNotes({ ...notes, [role.id]: value })} maxLength={300} multiline editable={!busy} style={s.input} /><ActionButton disabled={busy || !notes[role.id]?.trim()} onPress={() => void act('post', `/roles/${role.id}/offer`, { note: notes[role.id] })}>Ofrecer mi ayuda</ActionButton></> : null}
          </View>)}
        </View>
        {scope === 'events' && <><View style={s.panel}><Text accessibilityRole="header" style={s.heading}>¿Lo repetimos?</Text><Text style={s.copy}>{data.repeat.interestedCount} asistentes piden otra edición. Respuestas agrupadas; no se crea una inscripción automática.</Text>{DAYS.map(([key, label]) => <View key={key} style={s.row}><Text style={s.copy}>{label}: {data.repeat.dayCounts[key] || 0}</Text>{owner && data.canRepeat ? <Switch accessibilityLabel={`Me encaja ${label}`} disabled={busy} value={days.includes(key)} onValueChange={checked => setDays(checked ? [...days, key] : days.filter(day => day !== key))} /> : null}</View>)}{owner && data.canRepeat ? <><ActionButton disabled={busy} onPress={() => void act('put', '/repeat', { interested: true, days })}>{data.repeat.interested ? 'Actualizar mis días' : 'Quiero otra edición'}</ActionButton>{data.repeat.interested && <ActionButton disabled={busy} onPress={() => void act('put', '/repeat', { interested: false, days: [] })}>Retirar interés</ActionButton>}</> : <Text style={s.copy}>Disponible para asistentes confirmados después del evento.</Text>}</View>
        <View style={s.panel}><Text accessibilityRole="header" style={s.heading}>Nos encontramos aquí</Text><Text style={s.copy}>Un lugar público antes del evento. No utiliza GPS y deja de mostrarse al terminar el evento.</Text>{data.meetup ? <><Text style={s.label}>{data.meetup.place}</Text><Text style={s.copy}>{new Date(data.meetup.time).toLocaleString('es-DO')} · {data.meetup.participantCount} personas apuntadas</Text>{data.meetup.names.length > 0 && <Text style={s.copy}>Nombres compartidos: {data.meetup.names.join(', ')}</Text>}{data.meetup.joined ? <ActionButton disabled={busy} onPress={() => void act('put', '/meetup/join', { joined: false })}>Salir del encuentro</ActionButton> : owner && data.canJoinMeetup ? <><View style={s.row}><Text style={[s.copy, { flex: 1 }]}>Compartir mi nombre con el grupo (opcional)</Text><Switch accessibilityLabel="Compartir mi nombre con el encuentro" value={shareName} onValueChange={setShareName} disabled={busy} /></View><ActionButton disabled={busy} onPress={() => void act('put', '/meetup/join', { joined: true, shareName })}>Apuntarme al encuentro</ActionButton></> : <Text style={s.copy}>Necesitas asistencia confirmada y que la hora del encuentro no haya pasado.</Text>}</> : <Text style={s.copy}>No hay un punto de encuentro vigente.</Text>}
          {data.canSetMeetup && <><Text style={s.label}>Lugar público</Text><TextInput accessibilityLabel="Lugar público" value={place} onChangeText={setPlace} maxLength={200} editable={!busy} style={s.input} /><Text style={s.label}>Fecha y hora local (AAAA-MM-DDTHH:mm)</Text><TextInput accessibilityLabel="Fecha y hora local del encuentro" value={time} onChangeText={setTime} placeholder="2026-10-25T17:30" placeholderTextColor="#888" autoCapitalize="none" editable={!busy} style={s.input} /><View style={s.row}><Text style={[s.copy, { flex: 1 }]}>Es un lugar público dentro de las 24 horas previas al evento.</Text><Switch accessibilityLabel="Confirmo lugar público" value={publicPlace} onValueChange={setPublicPlace} disabled={busy} /></View><Text style={s.copy}>Cambiar lugar u hora reinicia la lista para pedir consentimiento de nuevo.</Text><ActionButton disabled={busy || !publicPlace || !place.trim() || !time.trim()} onPress={publishMeeting}>{data.meetup ? 'Cambiar punto y reiniciar participantes' : 'Publicar punto de encuentro'}</ActionButton></>}
        </View></>}
      </>}
    </>}
  </ScrollView>;
}
const s = StyleSheet.create({ page: { flex: 1, backgroundColor: '#0c0b10' }, eyebrow: { color: '#c4b5fd', fontSize: 12, fontWeight: '700', marginTop: 24 }, title: { fontSize: 28, color: '#fff', fontWeight: '700', marginVertical: 16 }, heading: { fontSize: 22, color: '#fff', fontWeight: '700', marginBottom: 12 }, copy: { color: '#c4c0ce', fontSize: 14, lineHeight: 22, marginBottom: 12 }, label: { color: '#fff', fontSize: 15, fontWeight: '600', marginVertical: 10 }, panel: { padding: 18, marginTop: 20, borderColor: '#39323f', borderWidth: 1, borderRadius: 20 }, item: { borderTopColor: '#39323f', borderTopWidth: 1, marginTop: 16, paddingTop: 12 }, input: { padding: 14, backgroundColor: '#221c2c', color: '#fff', borderRadius: 12, minHeight: 48, marginBottom: 12 }, row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginVertical: 4 }, button: { minHeight: 48, backgroundColor: '#6d28d9', justifyContent: 'center', padding: 14, borderRadius: 12, marginTop: 10 }, buttonText: { color: '#fff', fontSize: 14, fontWeight: '600', textAlign: 'center' }, error: { color: '#fca5a5', marginVertical: 20 } });
