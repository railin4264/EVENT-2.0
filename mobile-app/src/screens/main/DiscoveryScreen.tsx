import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, FlatList, Image,
  ActivityIndicator, RefreshControl, TextInput, useWindowDimensions, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/contexts/ThemeContext';
import { discoveryAppearance } from '@/constants/discoveryAppearance';
import { eventService } from '@/services';
import { homeEventImage, homeEventPrice } from '@/utils/homeToday';
import { useNearbyEvents } from '@/hooks/useNearbyEvents';
import { discoveryFilters, mergeDiscoveryPage, hasMoreDiscoveryPages, type DiscoveryFilterId, type DiscoveryPoint } from '@/utils/discoveryQuery';
import type { Event } from '@/types';

const CATEGORIES: { id: DiscoveryFilterId; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { id: 'all', label: 'Todo', icon: 'apps-outline' },
  { id: 'music', label: 'Música & Conciertos', icon: 'musical-notes-outline' },
  { id: 'nightlife', label: 'Vida nocturna', icon: 'moon-outline' },
  { id: 'food', label: 'Gastronomía & Café', icon: 'restaurant-outline' },
  { id: 'art', label: 'Arte & Museos', icon: 'color-palette-outline' },
  { id: 'sports', label: 'Deportes', icon: 'football-outline' },
  { id: 'tours', label: 'Tours & Excursiones', icon: 'compass-outline' },
  { id: 'outdoors', label: 'Naturaleza', icon: 'leaf-outline' },
  { id: 'recurring', label: 'Actividades recurrentes', icon: 'repeat-outline' },
  { id: 'education', label: 'Cursos & Talleres', icon: 'school-outline' },
  { id: 'business', label: 'Negocios & Finanzas', icon: 'briefcase-outline' },
  { id: 'technology', label: 'Tecnología & IA', icon: 'code-slash-outline' },
  { id: 'wellness', label: 'Bienestar', icon: 'heart-outline' },
  { id: 'family', label: 'En familia', icon: 'people-circle-outline' },
  { id: 'social', label: 'Social & Coros', icon: 'people-outline' },
  { id: 'fashion', label: 'Moda & Pasarelas', icon: 'shirt-outline' },
];
function place(event: Event) {
  if (event.isSecretLocation) return 'Ubicación reservada';
  if (event.isVirtual) return 'Evento en línea';
  return typeof event.location === 'string' ? event.location : event.location?.city || event.location?.address || 'Ver ubicación';
}
function dateLabel(value: string) {
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toLocaleString('es', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'Fecha por confirmar';
}

export default function DiscoveryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width, fontScale } = useWindowDimensions();
  const { isDark } = useTheme();
  const palette = useMemo(() => discoveryAppearance(isDark), [isDark]);
  const styles = useMemo(() => createStyles(palette), [palette]);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<DiscoveryFilterId>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [nearMe, setNearMe] = useState(false);
  const [page, setPage] = useState({ current: 0, hasMore: false, total: 0 });
  const nearby = useNearbyEvents('discovery');
  const near: DiscoveryPoint | null = nearMe ? nearby.coordinates : null;
  const generation = useRef({ value: 0 });
  const columns = viewMode === 'grid' && width >= 380 && fontScale < 1.25 ? 2 : 1;
  const listLayout = viewMode === 'list';
  const cardWidth = Math.max(0, (width - insets.left - insets.right - 40 - (columns - 1) * 14) / columns);
  useEffect(() => {
    const timer = setTimeout(() => setQuery(search), 350);
    return () => clearTimeout(timer);
  }, [search]);
  const load = useCallback(async (next: number) => {
    const ticket = next === 1 ? ++generation.current.value : generation.current.value;
    setError('');
    if (next > 1) setLoadingMore(true);
    try {
      const response = await eventService.getEvents(discoveryFilters({ filter: category, search: query, page: next, near }));
      if (ticket !== generation.current.value) return;
      if (!response.success || !Array.isArray(response.data)) throw new Error('Invalid catalog');
      setEvents(current => mergeDiscoveryPage(next === 1 ? [] : current, response.data));
      setPage({ current: next, hasMore: hasMoreDiscoveryPages(response.pagination), total: Number(response.pagination?.total) || 0 });
    } catch {
      if (ticket === generation.current.value && next === 1) setError('No pudimos cargar los eventos. Comprueba tu conexión e inténtalo de nuevo.');
    } finally {
      if (ticket === generation.current.value) { setLoading(false); setRefreshing(false); setLoadingMore(false); }
    }
  }, [category, query, near]);
  useEffect(() => {
    if (nearMe && !near) return;
    const requests = generation.current;
    setLoading(true); setEvents([]); void load(1);
    return () => { requests.value++; };
  }, [load, nearMe, near]);
  const loadMore = () => { if (!loading && !loadingMore && page.hasMore) void load(page.current + 1); };
  const toggleNearMe = () => {
    if (nearMe) { setNearMe(false); return; }
    setNearMe(true);
    if (!nearby.coordinates) void nearby.locate();
  };
  useEffect(() => {
    if (nearMe && (nearby.status === 'denied' || nearby.status === 'error')) setNearMe(false);
  }, [nearMe, nearby.status]);
  const resultsLabel = page.total > events.length ? `${events.length} de ${page.total} planes` : events.length === 1 ? '1 plan para explorar' : `${events.length} planes para explorar`;

  const renderCard = ({ item }: { item: Event }) => {
    const image = homeEventImage(item);
    return (
      <TouchableOpacity accessibilityRole="button" accessibilityLabel={`Ver evento ${item.title}`} activeOpacity={0.85}
        style={[styles.card, { width: cardWidth }, listLayout && styles.listCard]}
        onPress={() => router.push(`/event/${item._id}` as any)}>
        <View style={{ position: 'relative' }}>
          {image ? <Image source={{ uri: image }} style={listLayout ? styles.listImage : styles.image} />
            : <View style={[listLayout ? styles.listImage : styles.image, styles.imageFallback]}><Ionicons name="ticket-outline" size={32} color={palette.accent} /></View>}
          {Boolean(item.isRecurring) && (
            <View style={styles.recurringBadge}>
              <Ionicons name="repeat" size={11} color="#fff" />
              <Text style={styles.recurringBadgeText}>Recurrente</Text>
            </View>
          )}
          {Boolean((item as any).isOfficial) && (
            <View style={[styles.recurringBadge, { backgroundColor: '#f59e0b', top: item.isRecurring ? 30 : 8 }]}>
              <Ionicons name="shield-checkmark" size={11} color="#fff" />
              <Text style={styles.recurringBadgeText}>Oficial</Text>
            </View>
          )}
        </View>
        <View style={styles.cardCopy}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 4 }}>
            <Text style={styles.date}>{dateLabel(item.date)}</Text>
            {item.category === 'education' && <Text style={styles.catPill}>🎓 Taller / Masterclass</Text>}
            {item.category === 'sports' && <Text style={styles.catPill}>⚾ Deporte</Text>}
            {item.category === 'art' && <Text style={styles.catPill}>🎨 Arte & Museo</Text>}
            {Boolean(item.isTourOrTrip) && <Text style={styles.catPill}>🚌 Tour / Excursión</Text>}
          </View>
          <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
          <View style={styles.location}><Ionicons name="location-outline" size={14} color={palette.muted} /><Text style={styles.locationText} numberOfLines={2}>{place(item)}</Text></View>
          <View style={styles.cardFooter}><Text style={styles.price}>{homeEventPrice(item).label}</Text><Ionicons name="arrow-forward" size={18} color={palette.accent} /></View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.page, { paddingTop: insets.top, paddingLeft: insets.left, paddingRight: insets.right }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <View style={styles.header}>
        <View style={{ flex: 1 }}><Text style={styles.eyebrow}>Encuentra tu próximo plan</Text><Text accessibilityRole="header" style={styles.title}>Explorar</Text></View>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Ver mapa" onPress={() => router.push('/map')} style={styles.iconButton}><Ionicons name="map-outline" size={22} color={palette.accent} /></TouchableOpacity>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel={listLayout ? 'Ver en tarjetas' : 'Ver en lista'} onPress={() => setViewMode(mode => mode === 'grid' ? 'list' : 'grid')} style={styles.iconButton}>
          <Ionicons name={listLayout ? 'grid-outline' : 'list-outline'} size={23} color={palette.text} />
        </TouchableOpacity>
      </View>
      <View style={styles.search}>
        <Ionicons name="search-outline" size={20} color={palette.muted} />
        <TextInput accessibilityLabel="Buscar eventos" style={styles.searchInput} placeholder="Un evento, un artista, un lugar…" placeholderTextColor={palette.muted} value={search} onChangeText={setSearch} returnKeyType="search" autoCorrect={false} />
        {search.length > 0 && <TouchableOpacity accessibilityRole="button" accessibilityLabel="Limpiar búsqueda" onPress={() => setSearch('')} style={styles.clear}><Ionicons name="close" size={20} color={palette.muted} /></TouchableOpacity>}
      </View>
      <TouchableOpacity accessibilityRole="button" style={{ minHeight: 44, marginHorizontal: 20, justifyContent: 'center' }} onPress={() => router.push('/search')}><Text style={{ color: palette.accent, fontSize: 13 }}>Buscar personas, tribus y anfitriones →</Text></TouchableOpacity>
      <View><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categories}>
        <TouchableOpacity accessibilityRole="button" accessibilityState={{ selected: nearMe, busy: nearby.status === 'loading' }} accessibilityLabel="Cerca de mí" onPress={toggleNearMe} style={[styles.category, nearMe && { backgroundColor: palette.accent, borderColor: palette.accent }]}>
          {nearby.status === 'loading' ? <ActivityIndicator size="small" color={nearMe ? palette.onAccent : palette.accent} /> : <Ionicons name="navigate-outline" size={16} color={nearMe ? palette.onAccent : palette.muted} />}<Text style={[styles.categoryText, nearMe && { color: palette.onAccent }]}>Cerca de mí</Text>
        </TouchableOpacity>
        {CATEGORIES.map(item => {
          const selected = category === item.id;
          return <TouchableOpacity key={item.id} accessibilityRole="button" accessibilityState={{ selected }} onPress={() => setCategory(item.id)} style={[styles.category, selected && { backgroundColor: palette.accent, borderColor: palette.accent }]}>
            <Ionicons name={item.icon} size={16} color={selected ? palette.onAccent : palette.muted} /><Text style={[styles.categoryText, selected && { color: palette.onAccent }]}>{item.label}</Text>
          </TouchableOpacity>;
        })}
      </ScrollView></View>
      {Boolean(nearby.message) && !nearMe && <Text accessibilityRole="alert" style={styles.notice}>{nearby.message}</Text>}
      {loading ? <View style={styles.state}><ActivityIndicator size="large" color={palette.accent} accessibilityLabel="Buscando eventos" /><Text style={styles.stateCopy}>Buscando tu próximo plan…</Text></View>
        : error ? <View style={styles.state}><Ionicons name="cloud-offline-outline" size={34} color={palette.accent} /><Text accessibilityRole="header" style={styles.stateTitle}>Volvamos a intentarlo</Text><Text style={styles.stateCopy}>{error}</Text><TouchableOpacity accessibilityRole="button" style={styles.retry} onPress={() => { setLoading(true); void load(1); }}><Text style={styles.retryText}>Reintentar</Text></TouchableOpacity></View>
        : <FlatList key={`${viewMode}-${columns}`} data={events} numColumns={columns} keyExtractor={item => item._id}
          contentContainerStyle={styles.results} columnWrapperStyle={columns > 1 ? { gap: 14 } : undefined}
          keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(1); }} tintColor={palette.accent} colors={[palette.accent]} />}
          ListHeaderComponent={<Text style={styles.resultsLabel}>{nearMe ? `${resultsLabel} cerca de ti` : resultsLabel}</Text>}
          onEndReached={loadMore} onEndReachedThreshold={0.6}
          ListFooterComponent={loadingMore ? <ActivityIndicator style={{ marginVertical: 20 }} color={palette.accent} accessibilityLabel="Cargando más eventos" /> : null}
          renderItem={renderCard}
          ListEmptyComponent={<View style={styles.state}><Ionicons name="search-outline" size={34} color={palette.accent} /><Text style={styles.stateTitle}>El próximo plan está por llegar</Text><Text style={styles.stateCopy}>{nearMe ? 'No hay planes publicados cerca de ti con estos filtros. Prueba sin ubicación u otra categoría.' : 'Prueba otra categoría o cambia tu búsqueda.'}</Text>{(search || category !== 'all' || nearMe) && <TouchableOpacity accessibilityRole="button" style={styles.retry} onPress={() => { setSearch(''); setCategory('all'); setNearMe(false); }}><Text style={styles.retryText}>Ver todos los planes</Text></TouchableOpacity>}</View>} />}
    </View>
  );
}
const createStyles = (p: ReturnType<typeof discoveryAppearance>) => StyleSheet.create({
  page: { flex: 1, backgroundColor: p.background },
  header: { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 20, flexDirection: 'row', gap: 14, alignItems: 'center' },
  eyebrow: { fontSize: 13, color: p.muted, lineHeight: 20, marginBottom: 4 },
  title: { fontSize: 32, fontWeight: '800', letterSpacing: -1, color: p.text },
  iconButton: { width: 46, height: 46, backgroundColor: p.surface, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  search: { marginHorizontal: 20, paddingHorizontal: 14, minHeight: 54, borderWidth: 1, borderColor: p.border, borderRadius: 16, flexDirection: 'row', alignItems: 'center', gap: 10 },
  searchInput: { flex: 1, fontSize: 15, color: p.text, paddingVertical: 14 },
  clear: { width: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  categories: { gap: 10, paddingHorizontal: 20, paddingVertical: 18 },
  category: { minHeight: 44, paddingVertical: 11, paddingHorizontal: 14, gap: 7, flexDirection: 'row', alignItems: 'center', borderRadius: 14, borderWidth: 1, borderColor: p.border },
  categoryText: { fontSize: 13, fontWeight: '600', color: p.muted },
  results: { paddingHorizontal: 20, paddingBottom: 28, gap: 14 },
  resultsLabel: { fontSize: 13, color: p.muted, marginBottom: 4 },
  notice: { marginHorizontal: 20, marginBottom: 8, fontSize: 13, lineHeight: 20, color: p.muted },
  card: { borderRadius: 20, backgroundColor: p.surface, overflow: 'hidden' },
  image: { width: '100%', aspectRatio: 1.55 },
  imageFallback: { backgroundColor: p.elevated, alignItems: 'center', justifyContent: 'center' },
  cardCopy: { flex: 1, padding: 16, gap: 8 },
  date: { fontSize: 12, lineHeight: 18, fontWeight: '600', color: p.accent },
  cardTitle: { fontSize: 18, lineHeight: 25, fontWeight: '700', color: p.text },
  location: { flexDirection: 'row', alignItems: 'flex-start', gap: 5 },
  locationText: { flex: 1, fontSize: 13, lineHeight: 20, color: p.muted },
  cardFooter: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingTop: 8 },
  price: { flex: 1, fontSize: 14, fontWeight: '700', lineHeight: 21, color: p.text },
  recurringBadge: { position: 'absolute', top: 8, left: 8, flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#3b82f6', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 8, zIndex: 2 },
  recurringBadgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  catPill: { fontSize: 10, fontWeight: '700', color: p.accent, backgroundColor: 'rgba(242,139,182,0.12)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  listCard: { flexDirection: 'row', alignItems: 'stretch' },
  listImage: { width: 88, minHeight: 140 },
  state: { flex: 1, padding: 28, alignItems: 'center', justifyContent: 'center', gap: 14 },
  stateTitle: { fontSize: 19, fontWeight: '700', color: p.text, textAlign: 'center', lineHeight: 26 },
  stateCopy: { color: p.muted, fontSize: 14, textAlign: 'center', lineHeight: 23 },
  retry: { minHeight: 48, paddingHorizontal: 20, paddingVertical: 14, borderRadius: 14, backgroundColor: p.accent, marginTop: 4 },
  retryText: { color: p.onAccent, fontSize: 14, fontWeight: '600', textAlign: 'center' },
});
