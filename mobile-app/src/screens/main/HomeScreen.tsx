import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Image, FlatList, Dimensions, StatusBar,
  Platform, ActivityIndicator,
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { eventService } from '@/services';
import { Event } from '@/types';
import * as Haptics from 'expo-haptics';
import { BlurView } from 'expo-blur';
import Animated, {
  useSharedValue, useAnimatedScrollHandler, useAnimatedStyle,
  interpolate, Extrapolation, withSpring, withRepeat, withTiming,
  type SharedValue
} from 'react-native-reanimated';

const { width, height } = Dimensions.get('window');
const CARD_W = width * 0.75;
const HERO_H = height * 0.55;

// Core Colors
const DARK_BG = '#050505';
const PINK   = '#E11D48';
const VIOLET = '#7C3AED';
const NEON   = '#06B6D4';

const CATEGORIES = [
  { id: 'all',     label: 'Descubrir', icon: 'sparkles',          gradient: [PINK, VIOLET]   as [string,string] },
  { id: 'music',   label: 'Música',    icon: 'musical-notes',     gradient: ['#f97316','#ef4444'] as [string,string] },
  { id: 'social',  label: 'Social',    icon: 'people',            gradient: [NEON, VIOLET]   as [string,string] },
  { id: 'food',    label: 'Gourmet',   icon: 'restaurant',        gradient: ['#10b981','#059669'] as [string,string] },
  { id: 'tech',    label: 'Tech',      icon: 'code-slash',        gradient: ['#06b6d4', '#3b82f6'] as [string,string] },
];

const MOCK_EVENTS: Partial<Event>[] = [
  {
    _id: '1', title: 'Neon Electronic Festival', category: 'music',
    image: 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=800',
    date: new Date(Date.now() + 86400000 * 3).toISOString(),
    location: { address: 'Bogotá, Colombia' } as any,
    price: 45000, attendees: ['a','b','c','d','e','f','g','h'] as any,
  },
  {
    _id: '2', title: 'Tech Summit 2026', category: 'technology' as any,
    image: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800',
    date: new Date(Date.now() + 86400000 * 7).toISOString(),
    location: { address: 'Medellín, Colombia' } as any,
    price: 0, attendees: ['a','b','c','d','e'] as any,
  },
  {
    _id: '3', title: 'Street Food Fiesta', category: 'food',
    image: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=800',
    date: new Date(Date.now() + 86400000 * 2).toISOString(),
    location: { address: 'Cali, Colombia' } as any,
    price: 15000, attendees: ['a','b','c'] as any,
  },
];

const DARK_MAP = [
  { elementType: 'geometry', stylers: [{ color: '#0c0b10' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#9ca3af' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#0c0b10' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#1f1d2b' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0d1b2a' }] },
  { featureType: 'poi', elementType: 'geometry', stylers: [{ color: '#131220' }] },
];

const AnimatedBlurView = Animated.createAnimatedComponent(BlurView);

// Hero Component (Parallax)
function HeroSection({ event, scrollY }: { event?: Partial<Event>, scrollY: SharedValue<number> }) {
  if (!event) return null;

  const rImageStyle = useAnimatedStyle(() => {
    const ty = interpolate(scrollY.value, [-100, 0, HERO_H], [-50, 0, HERO_H * 0.5], Extrapolation.CLAMP);
    const sc = interpolate(scrollY.value, [-100, 0], [1.2, 1], Extrapolation.CLAMP);
    return {
      transform: [{ translateY: ty }, { scale: sc }] as any,
    } as any;
  });

  const rOverlayStyle = useAnimatedStyle(() => {
    return {
      opacity: interpolate(scrollY.value, [0, HERO_H * 0.8], [0.3, 1], Extrapolation.CLAMP),
    };
  });

  const isFree = !event.price || event.price === 0;
  const dateStr = event.date ? new Date(event.date).toLocaleDateString('es', { day: '2-digit', month: 'short' }) : '';

  return (
    <View style={styles.heroContainer}>
      <Animated.Image source={{ uri: event.image }} style={[styles.heroImage, rImageStyle] as any} />
      <Animated.View style={[styles.heroOverlay, rOverlayStyle] as any}>
        <LinearGradient
          colors={['transparent', DARK_BG]}
          style={StyleSheet.absoluteFillObject}
        />
      </Animated.View>
      
      <View style={styles.heroContent}>
        <View style={styles.heroBadgeRow}>
          <BlurView intensity={40} tint="dark" style={styles.glassBadge}>
            <Text style={styles.glassBadgeText}>🔥 DESTACADO</Text>
          </BlurView>
          <BlurView intensity={40} tint="dark" style={[styles.glassBadge, { borderColor: isFree ? '#10b981' : PINK }]}>
            <Text style={[styles.glassBadgeText, { color: isFree ? '#10b981' : '#fff' }]}>
              {isFree ? 'GRATIS' : `$${(Number(event.price) / 1000).toFixed(0)}K`}
            </Text>
          </BlurView>
        </View>
        <Text style={styles.heroTitle} numberOfLines={2}>{event.title}</Text>
        <View style={styles.heroMetaRow}>
          <View style={styles.heroMetaItem}>
            <Ionicons name="calendar" size={14} color={PINK} />
            <Text style={styles.heroMetaText}>{dateStr}</Text>
          </View>
          <View style={styles.heroMetaItem}>
            <Ionicons name="location" size={14} color={NEON} />
            <Text style={styles.heroMetaText} numberOfLines={1}>{(event.location as any)?.address || 'Ubicación'}</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

// Glassmorphic List Card
function GlassEventCard({ event, index }: { event: Partial<Event>; index: number }) {
  const scale = useSharedValue(1);
  const isFree = !event.price || event.price === 0;
  const dateStr = event.date ? new Date(event.date).toLocaleDateString('es', { day: '2-digit', month: 'short' }) : '';

  const rStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }]
  }));

  return (
    <TouchableOpacity
      activeOpacity={1}
      onPressIn={() => { scale.value = withSpring(0.96, { mass: 0.5 }); }}
      onPressOut={() => { scale.value = withSpring(1, { mass: 0.5 }); }}
      onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push('/event/' + event._id as any); }}
    >
      <Animated.View style={[styles.glassCardContainer, rStyle]}>
        <Image source={{ uri: event.image }} style={styles.glassCardImage} />
        <LinearGradient colors={['transparent', 'rgba(5,5,5,0.95)']} style={styles.glassCardOverlay} />
        
        <View style={styles.glassCardContent}>
          <Text style={styles.glassCardDate}>{dateStr}</Text>
          <Text style={styles.glassCardTitle} numberOfLines={2}>{event.title}</Text>
          <View style={styles.glassCardFooter}>
            <BlurView intensity={30} tint="light" style={styles.glassPriceBadge}>
              <Text style={styles.glassPriceText}>{isFree ? 'GRATIS' : `$${(Number(event.price) / 1000).toFixed(0)}K`}</Text>
            </BlurView>
            <View style={styles.glassIconBtn}>
              <Ionicons name="arrow-forward" size={16} color="#fff" />
            </View>
          </View>
        </View>
      </Animated.View>
    </TouchableOpacity>
  );
}

// Pulsing map marker (reused pattern from MapScreen)
function PulseMarker({ color = PINK }: { color?: string }) {
  const pulse = useSharedValue(1);
  React.useEffect(() => {
    pulse.value = withRepeat(
      withTiming(1.7, { duration: 1000 }),
      -1,
      true
    );
  }, []);
  return (
    <View style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View style={{ position: 'absolute', width: 34, height: 34, borderRadius: 17, backgroundColor: color + '28', transform: [{ scale: pulse }] }} />
      <LinearGradient colors={[color, VIOLET] as any} style={mapStyles.pin}>
        <Ionicons name="flash" size={13} color="#fff" />
      </LinearGradient>
    </View>
  );
}

// Map preview section — shows nearby events on a real interactive map
function MapPreviewSection({ events, loading, onOpenMap }: {
  events: Partial<Event>[];
  loading: boolean;
  onOpenMap: () => void;
}) {
  const mapRef = React.useRef<MapView>(null);
  const valid = events.filter(
    (e) => e.location && typeof e.location !== 'string' && (e.location as any).coordinates
  );
  const region = valid.length
    ? {
        latitude: (valid[0].location as any).coordinates[1],
        longitude: (valid[0].location as any).coordinates[0],
        latitudeDelta: 0.1,
        longitudeDelta: 0.1,
      }
    : { latitude: 4.711, longitude: -74.072, latitudeDelta: 0.1, longitudeDelta: 0.1 };

  return (
    <View style={mapStyles.wrap}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Cerca de ti</Text>
        <TouchableOpacity onPress={onOpenMap}>
          <Text style={styles.sectionLink}>Ver mapa</Text>
        </TouchableOpacity>
      </View>

      <View style={mapStyles.card}>
        <MapView
          ref={mapRef}
          style={StyleSheet.absoluteFillObject}
          provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
          customMapStyle={DARK_MAP}
          initialRegion={region}
          scrollEnabled={false}
          zoomEnabled={false}
          rotateEnabled={false}
          pitchEnabled={false}
          showsUserLocation
          onPress={onOpenMap}
        >
          {valid.map((ev) => {
            const c = (ev.location as any).coordinates;
            const col = ev.category === 'music' ? '#f97316' : ev.category === 'food' ? '#10b981' : PINK;
            return (
              <Marker
                key={ev._id}
                coordinate={{ latitude: c[1], longitude: c[0] }}
                onPress={onOpenMap}
              >
                <PulseMarker color={col} />
              </Marker>
            );
          })}
        </MapView>

        {loading && (
          <View style={mapStyles.overlay}>
            <ActivityIndicator size="large" color={PINK} />
          </View>
        )}

        {!loading && valid.length === 0 && (
          <View style={mapStyles.overlay}>
            <Ionicons name="map-outline" size={40} color="rgba(255,255,255,0.2)" />
            <Text style={mapStyles.emptyText}>Activa la ubicación para ver eventos cerca</Text>
          </View>
        )}

        <BlurView intensity={80} tint="dark" style={mapStyles.badge}>
          <Ionicons name="location" size={14} color={NEON} />
          <Text style={mapStyles.badgeText}>{valid.length} eventos cerca</Text>
        </BlurView>
      </View>
    </View>
  );
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  
  const [activeCategory, setActiveCategory] = useState('all');
  const [events, setEvents] = useState<Partial<Event>[]>(MOCK_EVENTS);
  const [mapEvents, setMapEvents] = useState<Partial<Event>[]>([]);
  const [mapLoading, setMapLoading] = useState(true);
  const scrollY = useSharedValue(0);

  const loadEvents = useCallback(async () => {
    try {
      const res = await eventService.getEvents({ limit: 10 });
      if (res?.data?.length) setEvents(res.data);
    } catch { }
    // Load nearby events on a real map once we have the user's location
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({});
        const nearby = await eventService.getNearbyEvents(
          loc.coords.latitude,
          loc.coords.longitude,
          50,
          30
        );
        setMapEvents(nearby.length ? nearby : MOCK_EVENTS);
      } else {
        setMapEvents(MOCK_EVENTS);
      }
    } catch {
      setMapEvents(MOCK_EVENTS);
    } finally {
      setMapLoading(false);
    }
  }, []);

  useEffect(() => { loadEvents(); }, [loadEvents]);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

  const headerStyle = useAnimatedStyle(() => {
    const opacity = interpolate(scrollY.value, [0, HERO_H * 0.5], [0, 1], Extrapolation.CLAMP);
    return { opacity };
  });

  const greetingStyle = useAnimatedStyle(() => {
    const translateY = interpolate(scrollY.value, [0, HERO_H * 0.5], [0, -20], Extrapolation.CLAMP);
    const opacity = interpolate(scrollY.value, [0, 50], [1, 0], Extrapolation.CLAMP);
    return { transform: [{ translateY }], opacity };
  });

  const greetingText = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Buenos días';
    if (h < 18) return 'Buenas tardes';
    return 'Buenas noches';
  };

  const firstName = user?.firstName || user?.username || 'Explorador';
  const filteredEvents = activeCategory === 'all'
    ? events.slice(1) // exclude hero
    : events.filter(e => e.category === activeCategory);
  
  const heroEvent = events[0];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* Dynamic Header */}
      <View style={[styles.headerContainer, { paddingTop: insets.top }]}>
        <AnimatedBlurView intensity={80} tint="dark" style={[StyleSheet.absoluteFill, headerStyle]} />
        <View style={styles.headerInner}>
          <Animated.View style={[{ flex: 1 }, greetingStyle]}>
            <Text style={styles.greetingText}>{greetingText()},</Text>
            <Text style={styles.userNameText}>{firstName}</Text>
          </Animated.View>
          
          {/* Top Nav Icons */}
          <View style={styles.headerActions}>
            <TouchableOpacity 
              style={styles.iconButton} 
              onPress={() => router.push('/search' as any)}
            >
              <Ionicons name="search" size={22} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.iconButton} 
              onPress={() => router.push('/notifications' as any)}
            >
              <Ionicons name="notifications-outline" size={22} color="#fff" />
              <View style={styles.notifDot} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.push('/(tabs)/profile' as any)}>
              <LinearGradient colors={[PINK, VIOLET]} style={styles.avatarRing}>
                <View style={styles.avatarInner}>
                  <Text style={styles.avatarInitial}>{firstName.charAt(0).toUpperCase()}</Text>
                </View>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <Animated.ScrollView
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        {/* Parallax Hero */}
        <HeroSection event={heroEvent} scrollY={scrollY} />

        {/* Categories Section */}
        <View style={styles.categoriesWrapper}>
          <FlatList
            data={CATEGORIES}
            horizontal
            showsHorizontalScrollIndicator={false}
            keyExtractor={i => i.id}
            contentContainerStyle={styles.categoriesList}
            renderItem={({ item }) => {
              const isActive = activeCategory === item.id;
              return (
                <TouchableOpacity
                  onPress={() => { setActiveCategory(item.id); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                  activeOpacity={0.8}
                >
                  {isActive ? (
                    <LinearGradient colors={item.gradient} style={styles.categoryPillActive} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                      <Ionicons name={item.icon as any} size={16} color="#fff" />
                      <Text style={styles.categoryPillTextActive}>{item.label}</Text>
                    </LinearGradient>
                  ) : (
                    <BlurView intensity={20} tint="light" style={styles.categoryPill}>
                      <Ionicons name={item.icon as any} size={16} color="rgba(255,255,255,0.6)" />
                      <Text style={styles.categoryPillText}>{item.label}</Text>
                    </BlurView>
                  )}
                </TouchableOpacity>
              );
            }}
          />
        </View>

        {/* Nearby map preview — real interactive map with nearby events */}
        <MapPreviewSection
          events={mapEvents}
          loading={mapLoading}
          onOpenMap={() => router.push('/(tabs)/map' as any)}
        />

        {/* For You Section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Para ti</Text>
          <TouchableOpacity onPress={() => router.push('/(tabs)/discover' as any)}>
            <Text style={styles.sectionLink}>Ver todo</Text>
          </TouchableOpacity>
        </View>

        <FlatList
          data={filteredEvents}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={i => i._id!}
          contentContainerStyle={styles.cardsList}
          snapToInterval={CARD_W + 16}
          decelerationRate="fast"
          renderItem={({ item, index }) => <GlassEventCard event={item} index={index} />}
        />

        {/* Ambient Glow for bottom section */}
        <View style={styles.ambientBottomGlow}>
          <LinearGradient colors={[VIOLET + '15', 'transparent']} style={StyleSheet.absoluteFillObject} />
        </View>

        {filteredEvents.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="planet-outline" size={60} color="rgba(255,255,255,0.1)" />
            <Text style={styles.emptyTitle}>El vacío espacial</Text>
            <Text style={styles.emptySubtitle}>No hay eventos en esta categoría aún.</Text>
          </View>
        )}
      </Animated.ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: DARK_BG },
  
  headerContainer: {
    position: 'absolute', top: 0, left: 0, right: 0, zIndex: 100,
  },
  headerInner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingBottom: 16, paddingTop: 10,
  },
  greetingText: { fontSize: 13, color: 'rgba(255,255,255,0.6)', fontWeight: '500' },
  userNameText: { fontSize: 22, fontWeight: '800', color: '#fff', marginTop: 2, letterSpacing: -0.5 },
  
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconButton: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center', alignItems: 'center',
  },
  notifDot: {
    position: 'absolute', top: 10, right: 10, width: 8, height: 8,
    borderRadius: 4, backgroundColor: PINK, borderWidth: 1.5, borderColor: DARK_BG,
  },
  
  avatarRing: { width: 42, height: 42, borderRadius: 21, padding: 2 },
  avatarInner: { flex: 1, borderRadius: 19, backgroundColor: '#111', justifyContent: 'center', alignItems: 'center' },
  avatarInitial: { color: '#fff', fontSize: 16, fontWeight: '800' },

  heroContainer: { width, height: HERO_H, position: 'relative' },
  heroImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  heroOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  heroContent: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingHorizontal: 24, paddingBottom: 40,
  },
  heroBadgeRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  glassBadge: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12,
    overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
  },
  glassBadgeText: { fontSize: 11, fontWeight: '800', color: '#fff', letterSpacing: 0.5 },
  heroTitle: { fontSize: 32, fontWeight: '900', color: '#fff', lineHeight: 38, marginBottom: 16, letterSpacing: -1 },
  heroMetaRow: { flexDirection: 'row', gap: 16 },
  heroMetaItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  heroMetaText: { fontSize: 14, color: 'rgba(255,255,255,0.8)', fontWeight: '600' },

  categoriesWrapper: { marginTop: -20, zIndex: 10 },
  categoriesList: { paddingHorizontal: 20, gap: 12 },
  categoryPill: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 18, paddingVertical: 12,
    borderRadius: 20, overflow: 'hidden',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  categoryPillActive: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 18, paddingVertical: 12,
    borderRadius: 20,
  },
  categoryPillText: { fontSize: 14, color: 'rgba(255,255,255,0.8)', fontWeight: '600' },
  categoryPillTextActive: { fontSize: 14, color: '#fff', fontWeight: '700' },

  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end',
    paddingHorizontal: 20, marginTop: 40, marginBottom: 20,
  },
  sectionTitle: { fontSize: 24, fontWeight: '800', color: '#fff', letterSpacing: -0.5 },
  sectionLink: { fontSize: 14, fontWeight: '600', color: NEON },

  cardsList: { paddingHorizontal: 20, gap: 16, paddingBottom: 20 },
  glassCardContainer: {
    width: CARD_W, height: 320,
    borderRadius: 28, overflow: 'hidden',
    backgroundColor: '#111', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)',
  },
  glassCardImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  glassCardOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  glassCardContent: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    padding: 20,
  },
  glassCardDate: { fontSize: 12, color: NEON, fontWeight: '700', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 },
  glassCardTitle: { fontSize: 20, fontWeight: '800', color: '#fff', lineHeight: 26, marginBottom: 16 },
  glassCardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  glassPriceBadge: {
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, overflow: 'hidden',
  },
  glassPriceText: { fontSize: 13, fontWeight: '800', color: '#fff' },
  glassIconBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center', alignItems: 'center',
  },

  ambientBottomGlow: {
    position: 'absolute', bottom: -100, left: 0, right: 0, height: 300, zIndex: -1,
  },

  emptyState: { alignItems: 'center', paddingVertical: 60, paddingHorizontal: 32 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#fff', textAlign: 'center', marginTop: 16, marginBottom: 8 },
  emptySubtitle: { fontSize: 14, color: 'rgba(255,255,255,0.4)', textAlign: 'center', lineHeight: 20 },
});

// Map preview section styles
const mapStyles = StyleSheet.create({
  wrap: { marginTop: 36 },
  card: {
    marginHorizontal: 20,
    height: 220,
    borderRadius: 28,
    overflow: 'hidden',
    backgroundColor: '#111',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  pin: { width: 30, height: 30, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  overlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    justifyContent: 'center', alignItems: 'center',
    backgroundColor: 'rgba(12,11,16,0.7)',
  },
  emptyText: { fontSize: 13, color: 'rgba(255,255,255,0.4)', marginTop: 10, textAlign: 'center', paddingHorizontal: 24 },
  badge: {
    position: 'absolute', top: 14, left: 14,
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 14,
    overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
  },
  badgeText: { fontSize: 12, fontWeight: '700', color: '#fff' },
});
