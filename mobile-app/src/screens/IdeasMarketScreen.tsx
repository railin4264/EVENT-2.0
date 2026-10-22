import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../contexts/ThemeContext';
import { discoveryAppearance } from '../constants/discoveryAppearance';
import { useAuth } from '../contexts/AuthContext';
import { apiClient } from '../services/apiClient';

const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
type Idea = { _id: string; title: string; expiresAt?: string; isExpired?: boolean; linkedEvent?: string; status?: string };
type Proposal = { _id: string; accepted: boolean; note: string; event: { _id: string; title: string; date: string; city?: string; price?: { amount: number; currency: string } } };
type Detail = { conditions: { own: { maxBudget?: number; currency?: string; dayOfWeek?: number; zone?: string } | null; summary: { ready: boolean; days?: { value: string; count: number }[]; budgets?: { value: string; count: number }[]; zones?: { value: string; count: number }[] } }; proposals: { proposals: Proposal[]; canAccept: boolean } };
export default function IdeasMarketScreen() {
  const { user, token } = useAuth();
  return <Market key={`${user?._id || user?.id || 'guest'}:${token || ''}`} owner={user?._id || user?.id || ''} />;
}
function Market({ owner }: { owner: string }) {
  const router = useRouter(), insets = useSafeAreaInsets();
  const { isDark } = useTheme();
  const appearance = discoveryAppearance(isDark);
  const s = useMemo(() => ideaStyles(appearance), [isDark]);
  const [view, setView] = useState<'open' | 'expired' | 'launched'>('open');
  const listGeneration = useRef(0);
  const mounted = useRef(true), lock = useRef(false), generation = useRef(0);
  const [ideas, setIdeas] = useState<Idea[]>([]), [selected, setSelected] = useState(''), [detail, setDetail] = useState<Detail | null>(null);
  const [events, setEvents] = useState<Idea[]>([]), [eventId, setEventId] = useState('');
  const [budget, setBudget] = useState(''), [currency, setCurrency] = useState('DOP'), [day, setDay] = useState<number | null>(null), [zone, setZone] = useState(''), [note, setNote] = useState('');
  const [busy, setBusy] = useState(false), [message, setMessage] = useState(''), [loading, setLoading] = useState(false);
  useEffect(() => { mounted.current = true; setSelected(''); setDetail(null); void load(); return () => { mounted.current = false; generation.current += 1; listGeneration.current += 1; }; }, [view]);
  async function load() {
    const request = ++listGeneration.current;
    setLoading(true); setMessage('');
    try {
      const response = await apiClient.get('/ideas', { params: { limit: 50, status: view } });
      if (mounted.current && request === listGeneration.current) setIdeas(response.data.data || []);
      if (owner) {
        const result = await apiClient.get('/events', { params: { createdBy: owner, timeFilter: 'upcoming', limit: 100 } });
        const rows = result.data.data?.events || result.data.events || result.data.data || [];
        if (mounted.current && request === listGeneration.current) setEvents((Array.isArray(rows) ? rows : []).filter((event: any) => (event.createdBy?._id || event.createdBy?.id || event.createdBy) === owner && event.status === 'published' && !event.isPrivate && !event.sourceIdeaId && new Date(event.endDate || event.date).getTime() > Date.now()));
      }
    } catch (error: any) { if (mounted.current && request === listGeneration.current) setMessage(error.response?.data?.message || 'No se pudieron cargar las ideas o tus eventos. Reintenta.'); }
    finally { if (mounted.current && request === listGeneration.current) setLoading(false); }
  }
  async function select(id: string) {
    const request = ++generation.current;
    setSelected(id); setDetail(null); setMessage(''); setEventId(''); setNote('');
    try {
      const [conditions, proposals] = await Promise.all([apiClient.get(`/ideas/${id}/conditions`), apiClient.get(`/ideas/${id}/proposals`)]);
      if (!mounted.current || generation.current !== request) return;
      setDetail({ conditions: conditions.data.data, proposals: proposals.data.data });
      const own = conditions.data.data.own;
      setBudget(own?.maxBudget === undefined ? '' : String(own.maxBudget)); setCurrency(own?.currency || 'DOP'); setDay(own?.dayOfWeek ?? null); setZone(own?.zone || '');
    } catch (error: any) { if (mounted.current && generation.current === request) setMessage(error.response?.data?.message || 'No se pudo cargar la idea. Tócala para reintentar.'); }
  }
  async function mutate(path: string, body: unknown, method: 'put' | 'post' = 'post') {
    if (!owner || lock.current || !selected) return;
    lock.current = true; setBusy(true); setMessage(''); const request = generation.current, id = selected;
    try {
      const response = await apiClient[method](`/ideas/${id}/${path}`, body);
      if (!response.data.success) throw new Error('No se pudo guardar');
      if (!mounted.current || generation.current !== request) return;
      await select(id);
      if (mounted.current) setMessage(path.includes('/accept') ? 'Evento vinculado. Cada persona decide si confirma asistencia.' : 'Guardado correctamente.');
    } catch (error: any) { if (mounted.current && generation.current === request) setMessage(error.response?.data?.message || error.message || 'No se pudo guardar.'); }
    finally { lock.current = false; if (mounted.current) setBusy(false); }
  }
  const button = (label: string, action: () => void, disabled = false) => <TouchableOpacity accessibilityRole="button" disabled={disabled} onPress={action} style={[s.button, disabled && { opacity: 0.4 }]}><Text style={s.link}>{label}</Text></TouchableOpacity>;
  return <ScrollView style={s.page} contentContainerStyle={{ padding: 22, paddingTop: insets.top + 12, paddingBottom: insets.bottom + 40 }} keyboardShouldPersistTaps="handled">
    {button('← Volver', () => router.back())}<Text accessibilityRole="header" style={s.title}>De una idea a un plan</Text><Text style={s.copy}>Indica qué te animaría a ir y compara propuestas reales. Tus respuestas no confirman asistencia.</Text>
    <View style={s.row}>{([['open','Activas'],['expired','Vencidas'],['launched','Con evento']] as const).map(([key,label]) => <TouchableOpacity accessibilityRole="button" accessibilityState={{ selected: view === key }} key={key} disabled={busy} onPress={() => setView(key)} style={[s.chip, view === key && { borderColor: appearance.accent }]}><Text style={view === key ? s.link : s.copy}>{label}</Text></TouchableOpacity>)}</View>
    {button(loading ? 'Cargando…' : 'Actualizar ideas y eventos', () => void load(), loading || busy)}
    {ideas.map(idea => <TouchableOpacity accessibilityRole="button" accessibilityState={{ selected: selected === idea._id }} disabled={busy || view !== 'open'} key={idea._id} onPress={() => void select(idea._id)} style={[s.card, selected === idea._id && { borderColor: appearance.accent }]}><Text style={s.white}>{idea.title}</Text>{idea.expiresAt && <Text style={s.copy}>{idea.isExpired ? 'Vigencia terminada' : idea.status === 'launched' ? 'Convertida en evento' : 'Apoyos hasta'} · {new Date(idea.expiresAt).toLocaleDateString('es-DO')}</Text>}</TouchableOpacity>)}
    {!loading && !ideas.length && <Text style={s.copy}>No hay ideas en esta sección. Cambia el filtro o vuelve más tarde.</Text>}
    {detail && <View style={s.card}>{button('Yo aporto · Ofrecer mi talento', () => router.push(`/community-event/${selected}?scope=ideas` as any))}<Text style={s.heading}>Yo voy si…</Text><Text style={s.copy}>Respuestas privadas. Sólo mostramos grupos con al menos 5 coincidencias; no publicamos quién respondió.</Text>
      {!detail.conditions.summary.ready && <Text style={s.copy}>Aún no hay suficientes respuestas para tendencias.</Text>}
      {detail.conditions.summary.budgets?.map(b => <Text key={b.value} style={s.copy}>{b.value}: {b.count}</Text>)}
      {detail.conditions.summary.days?.map(b => <Text key={b.value} style={s.copy}>{days[Number(b.value)]}: {b.count}</Text>)}
      {detail.conditions.summary.zones?.map(b => <Text key={b.value} style={s.copy}>{b.value}: {b.count}</Text>)}
      {owner ? <><Text style={s.white}>Presupuesto máximo (opcional)</Text><TextInput accessibilityLabel="Presupuesto máximo" style={s.input} value={budget} onChangeText={setBudget} keyboardType="decimal-pad" editable={!busy} />
        <View style={s.row}>{['DOP', 'USD', 'EUR'].map(c => <TouchableOpacity accessibilityRole="button" accessibilityState={{ selected: currency === c }} key={c} disabled={busy} onPress={() => setCurrency(c)} style={s.chip}><Text style={currency === c ? s.link : s.copy}>{c}</Text></TouchableOpacity>)}</View>
        <Text style={s.white}>Día preferido</Text><View style={s.row}>{days.map((name, index) => <TouchableOpacity accessibilityRole="button" accessibilityState={{ selected: day === index }} disabled={busy} key={name} onPress={() => setDay(day === index ? null : index)} style={s.chip}><Text style={day === index ? s.link : s.copy}>{name}</Text></TouchableOpacity>)}</View>
        <Text style={s.white}>Zona (sin dirección personal)</Text><TextInput accessibilityLabel="Zona preferida" style={s.input} value={zone} onChangeText={setZone} maxLength={80} editable={!busy} />
        {button('Guardar mis condiciones', () => void mutate('conditions', { ...(budget !== '' ? { maxBudget: Number(budget.replace(',', '.')), currency } : {}), ...(day !== null ? { dayOfWeek: day } : {}), ...(zone.trim() ? { zone: zone.trim() } : {}) }, 'put'), busy)}
        {detail.conditions.own && button('Eliminar mis respuestas', () => void mutate('conditions', { remove: true }, 'put'), busy)}
      </> : <Text style={s.copy}>Inicia sesión para indicar tus condiciones.</Text>}
      <Text style={s.heading}>Propuestas de organizadores</Text>
      {detail.proposals.proposals.map(p => <View style={s.card} key={p._id}>{button(p.event.title, () => router.push(`/event/${p.event._id}` as any))}<Text style={s.copy}>{new Date(p.event.date).toLocaleDateString('es-DO')} {p.event.city || ''}</Text><Text style={s.copy}>{p.event.price?.amount === 0 ? 'Gratis' : p.event.price ? `${p.event.price.currency} ${p.event.price.amount}` : 'Consultar precio'}</Text>{p.note ? <Text style={s.copy}>{p.note}</Text> : null}{p.accepted ? <Text style={s.link}>Propuesta aceptada</Text> : detail.proposals.canAccept && button('Elegir propuesta', () => Alert.alert('Aceptar propuesta', 'Se vinculará este evento y avisaremos a quienes apoyaron la idea. Nadie se inscribe automáticamente.', [{ text: 'Cancelar', style: 'cancel' }, { text: 'Aceptar', onPress: () => void mutate(`proposals/${p._id}/accept`, {}) }]), busy)}</View>)}
      {!detail.proposals.proposals.length && <Text style={s.copy}>Sin propuestas vigentes todavía.</Text>}
      {owner && <><Text style={s.heading}>Proponer mi evento publicado</Text>{events.map(event => <TouchableOpacity accessibilityRole="button" accessibilityState={{ selected: eventId === event._id }} disabled={busy} key={event._id} onPress={() => setEventId(event._id)} style={s.chip}><Text style={eventId === event._id ? s.link : s.white}>{event.title}</Text></TouchableOpacity>)}{!events.length && <Text style={s.copy}>Necesitas un evento propio, público, publicado y vigente.</Text>}<TextInput accessibilityLabel="Mensaje de propuesta" placeholder="Mensaje opcional" placeholderTextColor="#a39bad" style={s.input} value={note} onChangeText={setNote} maxLength={300} editable={!busy} multiline />{button('Enviar propuesta', () => void mutate('proposals', { eventId, note: note.trim() }), busy || !eventId)}</>}
    </View>}
    {message ? <Text accessibilityRole="alert" style={s.message}>{message}</Text> : null}
  </ScrollView>;
}
function ideaStyles(p: ReturnType<typeof discoveryAppearance>) { return StyleSheet.create({ page: { flex: 1, backgroundColor: p.background }, title: { fontSize: 30, color: p.text, fontWeight: '700', marginVertical: 18 }, heading: { fontSize: 20, color: p.text, fontWeight: '600', marginVertical: 16 }, white: { color: p.text, fontSize: 15 }, copy: { color: p.muted, fontSize: 14, lineHeight: 22 }, link: { color: p.accent, fontSize: 15, fontWeight: '600' }, card: { borderWidth: 1, borderColor: p.border, borderRadius: 18, padding: 16, marginVertical: 6 }, button: { minHeight: 48, justifyContent: 'center', paddingVertical: 12 }, input: { backgroundColor: p.surface, color: p.text, borderRadius: 12, minHeight: 48, padding: 12, marginVertical: 12 }, row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginVertical: 12 }, chip: { padding: 10, borderWidth: 1, borderColor: p.border, borderRadius: 12, marginVertical: 3 }, message: { color: p.accent, padding: 16, lineHeight: 23 } }); }
