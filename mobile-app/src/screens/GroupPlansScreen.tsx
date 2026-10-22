import React, { useEffect, useRef, useState } from 'react';
import { ScrollView, View, Text, TextInput, TouchableOpacity, Share, StyleSheet, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Linking from 'expo-linking';
import { useAuth } from '@/contexts/AuthContext';
import { apiClient } from '@/services/apiClient';

type EventOption = { _id: string; title: string; date: string; status: string; isPrivate?: boolean; isSecretLocation?: boolean; ageRestriction?: { minAge?: number; maxAge?: number; isAdultOnly?: boolean } };
type Plan = { title: string; shareToken: string; status: string; isOwner: boolean; totalVotes: number; myVote?: string;
  selectedOptionId?: string; options: { id: string; votes: number; available: boolean; event?: { id: string; title: string } }[] };
export function groupPlanLink(token: string): string {
  if (!/^[a-f0-9]{48}$/.test(token)) throw new Error('El enlace de votación no es válido.');
  const configured = process.env.EXPO_PUBLIC_WEB_URL;
  if (configured) {
    try { const base = new URL(configured); if (['https:', 'http:'].includes(base.protocol) && !base.username && !base.password) return `${base.origin}/plans/${token}`; } catch { /* Use the actual installed app link below. */ }
  }
  return Linking.createURL('/group-plans', { queryParams: { token } });
}
export default function GroupPlansScreen() {
  const { user } = useAuth();
  const { token } = useLocalSearchParams<{ token?: string }>();
  return <GroupPlans key={`${user?._id || user?.id || ''}:${token || ''}`} owner={user?._id || user?.id || ''} initialToken={token} />;
}
function GroupPlans({ owner, initialToken }: { owner: string; initialToken?: string }) {
  const router = useRouter();
  const live = useRef(true), lock = useRef(false), request = useRef(0);
  const [events, setEvents] = useState<EventOption[]>([]), [mine, setMine] = useState<Plan[]>([]);
  const [chosen, setChosen] = useState<string[]>([]), [title, setTitle] = useState('Resolvamos el coro');
  const [plan, setPlan] = useState<Plan | null>(null), [error, setError] = useState(''), [notice, setNotice] = useState(''), [busy, setBusy] = useState(false);
  const loadPlan = async (token: string) => {
    if (!live.current || lock.current) return;
    if (!/^[a-f0-9]{48}$/.test(token)) { setError('El enlace de votación no es válido.'); return; }
    const generation = ++request.current;
    try { const { data } = await apiClient.get(`/plans/${token}`); if (data.success !== true || !data.data || !Array.isArray(data.data.options)) throw new Error('No pudimos verificar la votación.'); if (live.current && generation === request.current) { setPlan(data.data); setError(''); } }
    catch (failure: any) { if (live.current && generation === request.current) setError(failure.response?.data?.message || 'No pudimos abrir la votación.'); }
  };
  const load = async () => {
    if (!live.current || lock.current) return;
    const generation = ++request.current;
    try {
      const [catalog, own] = await Promise.all([apiClient.get('/events', { params: { limit: 100, timeFilter: 'upcoming' } }), owner ? apiClient.get('/plans/mine') : Promise.resolve(null)]);
      if (!live.current || generation !== request.current) return;
      if (catalog.data.success !== true || !Array.isArray(catalog.data.events) || (own && (own.data.success !== true || !Array.isArray(own.data.data)))) throw new Error('El servidor no confirmó los planes.');
      setEvents(catalog.data.events.filter((event: EventOption) => event.status === 'published' && !event.isPrivate && !event.isSecretLocation && !event.ageRestriction?.isAdultOnly && !(event.ageRestriction?.minAge || event.ageRestriction?.maxAge) && Date.parse(event.date) > Date.now()));
      setMine(own?.data.data || []); setError('');
    } catch (failure: any) { if (live.current && generation === request.current) setError(failure.response?.data?.message || 'No pudimos cargar los planes.'); }
  };
  useEffect(() => {
    live.current = true;
    if (initialToken) void loadPlan(initialToken); else void load();
    // This is a request generation counter; cleanup must invalidate its latest value.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    return () => { live.current = false; request.current++; };
    // The parent remounts the workspace for a different account or link.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const mutate = async (path: string, body: object) => {
    if (!live.current) return;
    if (!owner) { router.push({ pathname: '/(auth)/login', params: { returnTo: plan ? `/group-plans?token=${plan.shareToken}` : '/group-plans' } } as any); return; }
    if (lock.current) return;
    lock.current = true; request.current++; setBusy(true); setError('');
    try { const { data } = await apiClient.post(path, body); if (data.success !== true || !data.data || !Array.isArray(data.data.options)) throw new Error('El servidor no confirmó la acción.'); if (live.current) { setPlan(data.data); setNotice('Cambio guardado. Votar o elegir un plan no reserva entradas.'); } }
    catch (failure: any) { if (live.current) setError(failure.response?.data?.message || failure.message || 'No pudimos guardar el cambio.'); }
    finally { lock.current = false; if (live.current) setBusy(false); }
  };
  const decide = (optionId: string, eventTitle?: string) => {
    if (!live.current || lock.current) return;
    Alert.alert('¿Cerrar la votación?', `Elegirás ${eventTitle || 'este evento'}. Después de cerrar no se podrán cambiar los votos. Cada persona debe confirmar su asistencia por separado.`, [
      { text: 'Seguir votando', style: 'cancel' },
      { text: 'Cerrar y elegir', onPress: () => { if (live.current) void mutate(`/plans/${plan!.shareToken}/decide`, { optionId }); } }
    ]);
  };
  const maximum = Math.max(0, ...(plan?.options.filter(option => option.available).map(option => option.votes) || []));
  return <ScrollView style={styles.page} contentContainerStyle={styles.content}>
    <TouchableOpacity accessibilityRole="button" onPress={() => router.back()} style={styles.button}><Text style={styles.link}>← Volver</Text></TouchableOpacity>
    <Text style={styles.title}>{plan?.title || 'Resolvamos el coro'}</Text>
    <Text style={styles.copy}>Elijan juntos. Cada persona confirma su asistencia en el evento por separado.</Text>
    {!!error && <View accessibilityRole="alert"><Text style={styles.error}>{error}</Text><TouchableOpacity accessibilityRole="button" onPress={() => void (plan ? loadPlan(plan.shareToken) : initialToken ? loadPlan(initialToken) : load())} style={styles.button}><Text style={styles.link}>Reintentar carga</Text></TouchableOpacity></View>}
    {!!notice && <Text accessibilityLiveRegion="polite" style={styles.copy}>{notice}</Text>}
    {plan ? <>
      <Text style={styles.copy}>{plan.totalVotes} votos · {plan.status === 'open' ? 'Abierta' : plan.status === 'decided' ? 'Plan elegido' : 'Plazo terminado'}</Text>
      {plan.options.map(option => <View key={option.id} style={styles.card}>
        <Text style={styles.heading}>{option.event?.title || 'Evento ya no disponible'}</Text><Text style={styles.copy}>{option.votes} votos{option.id === plan.myVote ? ' · Tu voto' : ''}</Text>
        {plan.status === 'open' && option.available && <TouchableOpacity accessibilityRole="button" disabled={busy || option.id === plan.myVote} onPress={() => void mutate(`/plans/${plan.shareToken}/vote`, { optionId: option.id })} style={styles.button}><Text style={styles.link}>{owner ? 'Votar este plan' : 'Entrar para votar'}</Text></TouchableOpacity>}
        {plan.isOwner && plan.status !== 'decided' && maximum > 0 && option.available && option.votes === maximum && <TouchableOpacity accessibilityRole="button" disabled={busy} onPress={() => decide(option.id, option.event?.title)} style={styles.button}><Text style={styles.link}>Cerrar votación y elegir este plan</Text></TouchableOpacity>}
        {plan.selectedOptionId === option.id && option.event && <TouchableOpacity accessibilityRole="button" onPress={() => router.push(`/event/${option.event!.id}` as any)} style={styles.button}><Text style={styles.link}>Plan elegido · Ver evento y confirmar asistencia</Text></TouchableOpacity>}
      </View>)}
      <TouchableOpacity accessibilityRole="button" onPress={() => void Share.share({ message: `${plan.title}. Vota aquí: ${groupPlanLink(plan.shareToken)}` }).catch(() => { if (live.current) setError('No pudimos abrir el menú para compartir.'); })} style={styles.button}><Text style={styles.link}>Compartir votación con mi gente</Text></TouchableOpacity>
      <TouchableOpacity accessibilityRole="button" onPress={() => void loadPlan(plan.shareToken)} style={styles.button}><Text style={styles.link}>Actualizar resultados</Text></TouchableOpacity>
      <Text style={styles.copy}>El enlace puede abrirse sin cuenta. En la app necesitas entrar para votar; los votos de visitantes en web se distinguen por navegador, no por identidad verificada.</Text>
    </> : <>
      <TextInput accessibilityLabel="Nombre del plan" style={styles.input} maxLength={80} value={title} onChangeText={setTitle} />
      <Text style={styles.copy}>Elige dos o tres eventos públicos futuros. {chosen.length}/3 elegidos.</Text>
      {events.slice(0, 100).map(event => <TouchableOpacity key={event._id} accessibilityRole="checkbox" accessibilityState={{ checked: chosen.includes(event._id), disabled: busy }} disabled={busy} onPress={() => setChosen(previous => previous.includes(event._id) ? previous.filter(id => id !== event._id) : previous.length < 3 ? [...previous, event._id] : previous)} style={styles.card}><Text style={styles.heading}>{chosen.includes(event._id) ? '✓ ' : ''}{event.title}</Text><Text style={styles.copy}>{new Date(event.date).toLocaleString('es-DO')}</Text></TouchableOpacity>)}
      {!events.length && !error && <Text style={styles.copy}>No hay opciones cargadas. Puedes actualizar o explorar los eventos.</Text>}
      <TouchableOpacity accessibilityRole="button" disabled={busy || chosen.length < 2 || title.trim().length < 4} onPress={() => void mutate('/plans', { title: title.trim(), eventIds: chosen, hours: 72 })} style={styles.button}><Text style={styles.link}>{busy ? 'Guardando…' : owner ? 'Crear votación' : 'Entrar para crear votación'}</Text></TouchableOpacity>
      {mine.map(item => <TouchableOpacity key={item.shareToken} accessibilityRole="button" onPress={() => void loadPlan(item.shareToken)} style={styles.card}><Text style={styles.heading}>{item.title}</Text><Text style={styles.copy}>{item.totalVotes} votos · Abrir</Text></TouchableOpacity>)}
    </>}
  </ScrollView>;
}
const styles = StyleSheet.create({ page: { flex: 1, backgroundColor: '#100d19' }, content: { padding: 22, paddingTop: 50, paddingBottom: 100 }, title: { fontSize: 30, fontWeight: '700', color: '#fff', marginVertical: 14 }, heading: { color: '#fff', fontSize: 17, fontWeight: '600' }, copy: { color: '#c4bfd0', lineHeight: 23, marginVertical: 8 }, input: { minHeight: 48, color: '#fff', borderColor: '#51465e', borderWidth: 1, borderRadius: 12, padding: 12, marginVertical: 12 }, button: { minHeight: 48, justifyContent: 'center', paddingVertical: 12 }, link: { color: '#c4b5fd', fontSize: 16, fontWeight: '600' }, card: { padding: 18, borderRadius: 16, backgroundColor: '#211a2e', marginVertical: 8 }, error: { color: '#fca5a5', lineHeight: 22 } });
