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
import type { Event, EventCategory } from '@/types';

type CategoryFilterId = 'all' | 'recurring' | EventCategory;

const CATEGORIES: { id: CategoryFilterId; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { id: 'all', label: 'Todo', icon: 'apps-outline' },
  { id: 'recurring', label: '🔁 Actividades Fijas', icon: 'repeat-outline' },
  { id: 'education', label: 'Cursos & Talleres', icon: 'school-outline' },
  { id: 'sports', label: 'Deportes & LIDOM', icon: 'baseball-outline' },
  { id: 'art', label: 'Arte & Museos', icon: 'color-palette-outline' },
  { id: 'travel', label: 'Tours & Ecoturismo', icon: 'compass-outline' },
  { id: 'music', label: 'Música & Conciertos', icon: 'musical-notes-outline' },
  { id: 'food', label: 'Gastronomía & Café', icon: 'restaurant-outline' },
  { id: 'business', label: 'Negocios & Finanzas', icon: 'briefcase-outline' },
  { id: 'technology', label: 'Tecnología & IA', icon: 'code-slash-outline' },
  { id: 'wellness', label: 'Bienestar', icon: 'leaf-outline' },
  { id: 'social', label: 'Social & Coros', icon: 'people-outline' },
  { id: 'fashion' as any, label: '👗 Moda & Pasarelas', icon: 'shirt-outline' },
  { id: 'other', label: 'Otros', icon: 'ellipsis-horizontal' },
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
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<CategoryFilterId>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const generation = useRef({ value: 0 });
  const columns = viewMode === 'grid' && width >= 380 && fontScale < 1.25 ? 2 : 1;
  const listLayout = viewMode === 'list';
  const cardWidth = Math.max(0, (width - insets.left - insets.right - 40 - (columns - 1) * 14) / columns);
  const load = useCallback(async () => {
    const ticket = ++generation.current.value;
    setError('');
    try {
      const response = await eventService.getEvents({
        limit: 50,
        category: category === 'all' || category === 'recurring' ? undefined : category,
        isRecurring: category === 'recurring' ? true : undefined,
      });
      if (ticket !== generation.current.value) return;
      if (!response.success || !Array.isArray(response.data)) throw new Error('Invalid catalog');
      setEvents(response.data.filter(event => event && event._id && event.status === 'published' && !event.isPrivate));
    } catch {
      if (ticket === generation.current.value) setError('No pudimos cargar los eventos. Comprueba tu conexión e inténtalo de nuevo.');
    } finally {
      if (ticket === generation.current.value) { setLoading(false); setRefreshing(false); }
    }
  }, [category]);
  useEffect(() => {
    const requests = generation.current;
    setLoading(true); setEvents([]); void load();
    return () => { requests.value++; };
  }, [load]);
  const filtered = events.filter(event => !search.trim() || [event.title, place(event)].join(' ').toLocaleLowerCase('es').includes(search.trim().toLocaleLowerCase('es')));

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
              <Text style={styles.recurringBadgeText}>Fijo Semanal</Text>
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
            {item.category === 'travel' && <Text style={styles.catPill}>🚌 Tour / Aventura</Text>}
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
        <TextInput accessibilityLabel="Buscar eventos por nombre o lugar" style={styles.searchInput} placeholder="Un evento, un lugar…" placeholderTextColor={palette.muted} value={search} onChangeText={setSearch} returnKeyType="search" autoCorrect={false} />
        {search.length > 0 && <TouchableOpacity accessibilityRole="button" accessibilityLabel="Limpiar búsqueda" onPress={() => setSearch('')} style={styles.clear}><Ionicons name="close" size={20} color={palette.muted} /></TouchableOpacity>}
      </View>
      <TouchableOpacity accessibilityRole="button" style={{ minHeight: 44, marginHorizontal: 20, justifyContent: 'center' }} onPress={() => router.push('/search')}><Text style={{ color: palette.accent, fontSize: 13 }}>Buscar personas, tribus y anfitriones →</Text></TouchableOpacity>
      <View><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categories}>
        {CATEGORIES.map(item => {
          const selected = category === item.id;
          return <TouchableOpacity key={item.id} accessibilityRole="button" accessibilityState={{ selected }} onPress={() => setCategory(item.id)} style={[styles.category, selected && { backgroundColor: palette.accent, borderColor: palette.accent }]}>
            <Ionicons name={item.icon} size={16} color={selected ? palette.onAccent : palette.muted} /><Text style={[styles.categoryText, selected && { color: palette.onAccent }]}>{item.label}</Text>
          </TouchableOpacity>;
        })}
      </ScrollView></View>
      {loading ? <View style={styles.state}><ActivityIndicator size="large" color={palette.accent} accessibilityLabel="Buscando eventos" /><Text style={styles.stateCopy}>Buscando tu próximo plan…</Text></View>
        : error ? <View style={styles.state}><Ionicons name="cloud-offline-outline" size={34} color={palette.accent} /><Text accessibilityRole="header" style={styles.stateTitle}>Volvamos a intentarlo</Text><Text style={styles.stateCopy}>{error}</Text><TouchableOpacity accessibilityRole="button" style={styles.retry} onPress={() => { setLoading(true); void load(); }}><Text style={styles.retryText}>Reintentar</Text></TouchableOpacity></View>
        : <FlatList key={`${viewMode}-${columns}`} data={filtered} numColumns={columns} keyExtractor={item => item._id}
          contentContainerStyle={styles.results} columnWrapperStyle={columns > 1 ? { gap: 14 } : undefined}
          keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} tintColor={palette.accent} colors={[palette.accent]} />}
          ListHeaderComponent={<Text style={styles.resultsLabel}>{filtered.length === 1 ? '1 plan para explorar' : `${filtered.length} planes para explorar`}</Text>}
          renderItem={renderCard}
          ListEmptyComponent={<View style={styles.state}><Ionicons name="search-outline" size={34} color={palette.accent} /><Text style={styles.stateTitle}>El próximo plan está por llegar</Text><Text style={styles.stateCopy}>Prueba otra categoría o cambia tu búsqueda.</Text>{(search || category !== 'all') && <TouchableOpacity accessibilityRole="button" style={styles.retry} onPress={() => { setSearch(''); setCategory('all'); }}><Text style={styles.retryText}>Ver todos los planes</Text></TouchableOpacity>}</View>} />}
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
