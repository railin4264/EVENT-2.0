import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Image, ActivityIndicator, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { discoveryAppearance } from '@/constants/discoveryAppearance';
import { apiClient } from '@/services/apiClient';
import { homeEventPrice } from '@/utils/homeToday';
import { SEARCH_FILTERS, readSearchPage, searchResultPath, type SearchPage, type SearchType, type GlobalSearchResult } from '@/utils/globalSearch';
export default function SearchScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ q?: string }>();
  const { user, isAuthenticated } = useAuth();
  const { isDark } = useTheme();
  const p = discoveryAppearance(isDark);
  const [query, setQuery] = useState(typeof params.q === 'string' ? params.q.slice(0, 100) : '');
  const [type, setType] = useState<SearchType>('all'), [page, setPage] = useState(1), [retry, setRetry] = useState(0);
  const owner = String(user?._id || user?.id || 'guest');
  const key = `${owner}:${query.trim()}:${type}:${page}:${retry}`;
  const [state, setState] = useState<{ key: string; data?: SearchPage; error?: string } | null>(null);
  const generation = useRef({ value: 0 });
  useEffect(() => {
    const ticket = ++generation.current.value;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      if (query.trim().length < 2) return;
      try {
        const response = await apiClient.get('/search', { params: { q: query.trim(), type, page, limit: 12 }, signal: controller.signal });
        const data = readSearchPage(response.data);
        if (!controller.signal.aborted && ticket === generation.current.value) setState({ key, data });
      } catch {
        if (!controller.signal.aborted && ticket === generation.current.value) setState({ key, error: 'No pudimos completar la búsqueda. Revisa tu conexión e inténtalo de nuevo.' });
      }
    }, 350);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [key, query, type, page]);
  const current = state?.key === key ? state : null;
  const ready = query.trim().length >= 2;
  const loading = ready && !current;
  const data = current?.data;
  const open = (result: GlobalSearchResult) => {
    const path = searchResultPath(result, true); if (!path) return;
    if (result.type === 'event' || isAuthenticated) router.push(path as any);
    else router.push({ pathname: '/(auth)/login', params: { returnTo: path } });
  };
  const label = (item: GlobalSearchResult) => item.type === 'event' ? 'Evento' : item.type === 'tribe' ? 'Tribu' : item.metadata?.isHost ? item.metadata.role === 'creator' ? 'Creador' : 'Anfitrión' : 'Persona';
  return <SafeAreaView style={{ flex: 1, backgroundColor: p.background }}>
    <View style={styles.header}><View style={[styles.search, { borderColor: p.border }]}><Ionicons name="search-outline" size={21} color={p.accent} /><TextInput accessibilityLabel="Búsqueda global" autoFocus style={[styles.input, { color: p.text }]} placeholder="Eventos, lugares, tribus, anfitriones…" placeholderTextColor={p.muted} value={query} maxLength={100} autoCapitalize="none" onChangeText={value => { setQuery(value); setPage(1); }} returnKeyType="search" />{!!query && <TouchableOpacity accessibilityRole="button" accessibilityLabel="Limpiar búsqueda" style={styles.iconButton} onPress={() => { setQuery(''); setPage(1); }}><Ionicons name="close" size={20} color={p.muted} /></TouchableOpacity>}</View><TouchableOpacity accessibilityRole="button" accessibilityLabel="Cerrar búsqueda" style={styles.iconButton} onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')}><Ionicons name="arrow-back" size={23} color={p.text} /></TouchableOpacity></View>
    <View><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>{SEARCH_FILTERS.map(filter => <TouchableOpacity key={filter.value} accessibilityRole="button" accessibilityState={{ selected: type === filter.value }} style={[styles.chip, { backgroundColor: type === filter.value ? p.accent : p.surface }]} onPress={() => { setType(filter.value); setPage(1); }}><Text style={{ color: type === filter.value ? p.onAccent : p.text, fontWeight: '600' }}>{filter.label}</Text></TouchableOpacity>)}</ScrollView></View>
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
      {!ready ? <View style={styles.state}><Ionicons name="search-outline" size={38} color={p.accent} /><Text style={[styles.heading, { color: p.text }]}>Encuentra un plan y a su gente</Text><Text style={[styles.copy, { color: p.muted }]}>Escribe al menos dos caracteres. Puedes buscar eventos, tribus, personas y cuentas de creadores o anfitriones.</Text></View>
        : loading ? <View style={styles.state}><ActivityIndicator accessibilityLabel="Buscando" size="large" color={p.accent} /><Text style={[styles.copy, { color: p.muted }]}>Buscando…</Text></View>
        : current?.error ? <View style={styles.state}><Text accessibilityRole="alert" style={[styles.copy, { color: p.error }]}>{current.error}</Text><TouchableOpacity accessibilityRole="button" style={styles.action} onPress={() => setRetry(value => value + 1)}><Text style={{ color: p.accent }}>Reintentar</Text></TouchableOpacity></View>
        : <><Text accessibilityLiveRegion="polite" style={[styles.copy, { color: p.muted }]}>{data?.pagination.total || 0} resultados</Text>{!data?.results.length && <View style={styles.state}><Text style={[styles.heading, { color: p.text }]}>Sin resultados por ahora</Text><Text style={[styles.copy, { color: p.muted }]}>Prueba otro nombre o cambia el tipo de búsqueda.</Text></View>}
          {data?.results.map(item => <TouchableOpacity key={`${item.type}:${item.id}`} accessibilityRole="button" accessibilityLabel={`Ver ${label(item)}: ${item.title}`} activeOpacity={0.8} style={[styles.result, { borderColor: p.border }]} onPress={() => open(item)}>
            {item.image ? <Image source={{ uri: item.image }} style={styles.image} /> : <View style={[styles.image, styles.fallback, { backgroundColor: p.surface }]}><Ionicons name={item.type === 'event' ? 'ticket-outline' : item.type === 'tribe' ? 'people-outline' : 'person-outline'} size={25} color={p.accent} /></View>}
            <View style={{ flex: 1 }}><Text style={[styles.kind, { color: p.accent }]}>{label(item)}</Text><Text style={[styles.resultTitle, { color: p.text }]} numberOfLines={2}>{item.title}</Text><Text style={[styles.copy, { color: p.muted }]} numberOfLines={2}>{item.type === 'event' ? item.metadata?.location : item.type === 'user' && item.metadata?.username ? `@${item.metadata.username}` : item.description}</Text>{item.type === 'event' && <Text style={[styles.kind, { color: p.text }]}>{homeEventPrice({ price: item.metadata?.price }).label}</Text>}</View><Ionicons name="chevron-forward" size={18} color={p.muted} />
          </TouchableOpacity>)}
          <View style={styles.pages}>{page > 1 && <TouchableOpacity accessibilityRole="button" style={styles.action} onPress={() => setPage(value => value - 1)}><Text style={{ color: p.accent }}>Anterior</Text></TouchableOpacity>}{data?.pagination.hasMore && <TouchableOpacity accessibilityRole="button" style={styles.action} onPress={() => setPage(value => value + 1)}><Text style={{ color: p.accent }}>Más resultados</Text></TouchableOpacity>}</View>
        </>}
    </ScrollView>
  </SafeAreaView>;
}
const styles = StyleSheet.create({ header: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 8 }, search: { flex: 1, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 16, minHeight: 52, paddingLeft: 12, gap: 8 }, input: { flex: 1, fontSize: 15, paddingVertical: 14 }, iconButton: { minHeight: 44, minWidth: 44, alignItems: 'center', justifyContent: 'center' }, filters: { paddingHorizontal: 16, paddingBottom: 12, gap: 8 }, chip: { minHeight: 44, padding: 13, borderRadius: 14 }, content: { paddingHorizontal: 20, paddingBottom: 28 }, state: { alignItems: 'center', paddingVertical: 40, gap: 14 }, heading: { fontSize: 21, fontWeight: '700', textAlign: 'center' }, copy: { fontSize: 13, lineHeight: 21, marginTop: 4 }, result: { flexDirection: 'row', alignItems: 'center', gap: 13, paddingVertical: 18, borderBottomWidth: StyleSheet.hairlineWidth }, image: { width: 62, height: 68, borderRadius: 14 }, fallback: { alignItems: 'center', justifyContent: 'center' }, resultTitle: { fontSize: 16, lineHeight: 23, fontWeight: '600' }, kind: { fontSize: 12, fontWeight: '600', marginVertical: 4 }, action: { minHeight: 48, justifyContent: 'center', padding: 12 }, pages: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 16 } });
