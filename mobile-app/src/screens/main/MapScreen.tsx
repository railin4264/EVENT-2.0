import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView, Image, Platform } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE, type Region } from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { useNearbyEvents, hasPublicMapLocation } from '@/hooks/useNearbyEvents';
import { discoveryAppearance } from '@/constants/discoveryAppearance';
import { MAP_CONFIG, EVENT_CATEGORIES } from '@/constants';
import { eventService } from '@/services';
import { homeEventImage, homeEventPrice, homeEventTiming } from '@/utils/homeToday';
import type { Event } from '@/types';

export default function MapScreen() {
  const router = useRouter();
  const { isDark } = useTheme();
  const { user } = useAuth();
  const p = useMemo(() => discoveryAppearance(isDark), [isDark]);
  const owner = String(user?._id || user?.id || 'guest');
  const nearby = useNearbyEvents(owner);
  const map = useRef<MapView>(null);
  const viewport = useRef<Region>({ ...MAP_CONFIG.DEFAULT_REGION });
  const requests = useRef({ value: 0 });
  const [mapReady, setMapReady] = useState(false);
  const [catalog, setCatalog] = useState<Event[]>([]);
  const [mode, setMode] = useState<'catalog' | 'nearby'>('catalog');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [clock, setClock] = useState(Date.now());
  const load = useCallback(async (region?: Region) => {
    const ticket = ++requests.current.value;
    setMode('catalog'); setSelectedId(null); setLoading(true); setError('');
    try {
      const data = region
        ? await eventService.getNearbyEvents(region.latitude, region.longitude, Math.min(250, Math.max(5, region.latitudeDelta * 111 / 2)), 50)
        : await eventService.getEvents({ limit: 50 }).then(response => {
          if (!response.success || !Array.isArray(response.data)) throw new Error('Invalid catalog');
          return response.data;
        });
      if (ticket !== requests.current.value) return;
      if (!Array.isArray(data)) throw new Error('Invalid map response');
      setCatalog(data.filter(event => event && event._id && event.status === 'published' && !event.isPrivate && hasPublicMapLocation(event)));
    } catch {
      if (ticket === requests.current.value) { setCatalog([]); setError('No pudimos cargar el mapa de eventos. Comprueba tu conexión y vuelve a intentarlo.'); }
    } finally { if (ticket === requests.current.value) setLoading(false); }
  }, []);
  useEffect(() => {
    const scope = requests.current;
    setMode('catalog'); setCatalog([]); void load();
    return () => { scope.value++; };
  }, [load, owner]);
  useEffect(() => {
    const timer = setInterval(() => setClock(Date.now()), 60000);
    return () => clearInterval(timer);
  }, []);
  const source = mode === 'nearby' ? nearby.events : catalog;
  const events = source.filter(event => event.status === 'published' && !event.isPrivate && hasPublicMapLocation(event));
  const filtered = events.filter(event => filter === 'all' || (filter === 'today'
    ? new Date(event.date).toDateString() === new Date(clock).toDateString() || homeEventTiming(event, clock).inProgress
    : event.category === filter));
  const selected = filtered.find(event => event._id === selectedId);
  useEffect(() => {
    if (!mapReady || mode !== 'nearby' || !nearby.coordinates) return;
    map.current?.animateToRegion({ ...nearby.coordinates, latitudeDelta: 0.12, longitudeDelta: 0.12 }, 500);
  }, [mapReady, mode, nearby.coordinates]);
  useEffect(() => {
    if (!mapReady || mode !== 'catalog' || !catalog.length) return;
    map.current?.fitToCoordinates(catalog.map(event => {
      const point = typeof event.location !== 'string' ? event.location.coordinates! : [0, 0];
      return { latitude: point[1], longitude: point[0] };
    }), { edgePadding: { top: 32, right: 32, bottom: 32, left: 32 }, animated: true });
  }, [mapReady, catalog, mode]);
  const locate = () => { setSelectedId(null); setMode('nearby'); void nearby.locate(); };
  const busy = loading || (mode === 'nearby' && nearby.status === 'loading');
  const message = mode === 'nearby' ? nearby.message : error;
  const image = selected ? homeEventImage(selected) : undefined;
  return <SafeAreaView edges={['top', 'bottom', 'left', 'right']} style={[styles.page, { backgroundColor: p.background }]}>
    <View style={styles.header}>
      <TouchableOpacity accessibilityRole="button" accessibilityLabel="Volver" style={styles.iconButton} onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)/discover')}><Ionicons name="chevron-back" size={24} color={p.text} /></TouchableOpacity>
      <View style={{ flex: 1 }}><Text accessibilityRole="header" style={[styles.title, { color: p.text }]}>Mapa de eventos</Text><Text style={[styles.muted, { color: p.muted }]}>{mode === 'nearby' ? 'A menos de 50 km de tu ubicación' : 'Eventos con ubicación pública'}</Text></View>
      <TouchableOpacity accessibilityRole="button" accessibilityLabel="Ver catálogo de eventos" style={styles.iconButton} onPress={() => router.push('/(tabs)/discover')}><Ionicons name="list-outline" size={23} color={p.text} /></TouchableOpacity>
    </View>
    <View><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
      {[{ value: 'all', label: 'Todo' }, { value: 'today', label: 'En vivo y hoy' }, ...EVENT_CATEGORIES].map(item => <TouchableOpacity key={item.value} accessibilityRole="button" accessibilityState={{ selected: filter === item.value }}
        onPress={() => { setFilter(item.value); setSelectedId(null); setClock(Date.now()); }} style={[styles.chip, { backgroundColor: filter === item.value ? p.accent : p.surface }]}><Text style={{ color: filter === item.value ? p.onAccent : p.text, fontSize: 13, fontWeight: '600' }}>{item.label}</Text></TouchableOpacity>)}
    </ScrollView></View>
    <View style={styles.mapArea}>
      <MapView ref={map} style={StyleSheet.absoluteFillObject} provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
        userInterfaceStyle={isDark ? 'dark' : 'light'} initialRegion={{ ...MAP_CONFIG.DEFAULT_REGION }} showsUserLocation={false}
        onMapReady={() => setMapReady(true)} onRegionChangeComplete={region => { viewport.current = region; }} onPress={() => setSelectedId(null)}>
        {filtered.map(event => {
          const point = typeof event.location !== 'string' ? event.location.coordinates! : [0, 0];
          return <Marker key={event._id} title={event.title} coordinate={{ latitude: point[1], longitude: point[0] }} onPress={e => { e.stopPropagation(); setSelectedId(event._id); }}>
            <View style={[styles.pin, { backgroundColor: p.accent }]}><Ionicons name="ticket-outline" size={20} color={p.onAccent} /></View>
          </Marker>;
        })}
      </MapView>
      <View style={[styles.mapTools, { backgroundColor: p.elevated }]}>
        <TouchableOpacity disabled={busy} accessibilityRole="button" style={styles.mapAction} onPress={() => void load(viewport.current)}><Ionicons name="search-outline" size={19} color={p.accent} /><Text style={[styles.actionLabel, { color: p.accent }]}>Buscar en esta zona</Text></TouchableOpacity>
        <TouchableOpacity disabled={busy} accessibilityRole="button" accessibilityLabel="Usar mi ubicación" style={styles.locate} onPress={locate}><Ionicons name="locate-outline" size={24} color={p.accent} /></TouchableOpacity>
      </View>
    </View>
    <View style={[styles.bottomPanel, { backgroundColor: p.background, maxHeight: '45%' }]}>
      {busy ? <View style={styles.status}><ActivityIndicator color={p.accent} /><Text style={[styles.muted, { color: p.muted }]}>Buscando eventos…</Text></View>
        : message ? <View><Text accessibilityRole="alert" style={[styles.muted, { color: p.error }]}>{message}</Text><TouchableOpacity accessibilityRole="button" style={styles.mapAction} onPress={() => void load()}><Text style={{ color: p.accent }}>Explorar sin ubicación</Text></TouchableOpacity></View>
        : selected ? <ScrollView><View style={styles.cardHeading}>{image && <Image source={{ uri: image }} style={styles.image} />}<View style={{ flex: 1 }}><Text style={[styles.eventTitle, { color: p.text }]}>{selected.title}</Text><Text style={[styles.muted, { color: p.muted }]}>{typeof selected.location === 'string' ? selected.location : selected.location.city || selected.location.address}</Text><Text style={[styles.price, { color: p.text }]}>{homeEventPrice(selected).label}</Text></View><TouchableOpacity accessibilityRole="button" accessibilityLabel="Cerrar evento seleccionado" style={styles.iconButton} onPress={() => setSelectedId(null)}><Ionicons name="close" size={20} color={p.muted} /></TouchableOpacity></View><TouchableOpacity accessibilityRole="button" style={[styles.details, { backgroundColor: p.accent }]} onPress={() => router.push(`/event/${selected._id}` as any)}><Text style={{ color: p.onAccent, fontWeight: '700' }}>Ver evento</Text></TouchableOpacity></ScrollView>
        : <View><Text style={[styles.eventTitle, { color: p.text }]}>{filtered.length ? `${filtered.length} eventos en el mapa` : 'Sin eventos en esta selección'}</Text><Text style={[styles.muted, { color: p.muted }]}>{mode === 'nearby' ? 'Mueve el mapa para explorar otras zonas.' : 'Mueve el mapa y pulsa «Buscar en esta zona».'}</Text></View>}
    </View>
  </SafeAreaView>;
}
const styles = StyleSheet.create({
  page: { flex: 1 }, header: { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 8 }, title: { fontSize: 18, fontWeight: '700' }, muted: { fontSize: 13, lineHeight: 20, marginTop: 4 },
  iconButton: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' }, filters: { paddingHorizontal: 20, paddingBottom: 12, gap: 8 }, chip: { minHeight: 44, paddingHorizontal: 14, paddingVertical: 12, borderRadius: 14 },
  mapArea: { flex: 1, minHeight: 160 }, pin: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' }, mapTools: { position: 'absolute', top: 12, alignSelf: 'center', maxWidth: '92%', borderRadius: 16, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8 },
  mapAction: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, flexShrink: 1 }, actionLabel: { fontSize: 13, fontWeight: '600', flexShrink: 1 }, locate: { minWidth: 48, minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  bottomPanel: { padding: 20 }, status: { flexDirection: 'row', alignItems: 'center', gap: 12 }, cardHeading: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 }, image: { width: 64, height: 72, borderRadius: 12 }, eventTitle: { fontSize: 17, lineHeight: 24, fontWeight: '700' }, price: { fontSize: 15, lineHeight: 23, fontWeight: '600', marginTop: 8 }, details: { minHeight: 48, marginTop: 14, borderRadius: 14, alignItems: 'center', justifyContent: 'center', padding: 12 },
});
