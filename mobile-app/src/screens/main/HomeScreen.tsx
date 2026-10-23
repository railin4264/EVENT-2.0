import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Image, FlatList, ScrollView, useWindowDimensions, StatusBar,
  Platform, ActivityIndicator, AppState, Switch,
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { discoveryAppearance } from '@/constants/discoveryAppearance';
import { useNearbyEvents } from '@/hooks/useNearbyEvents';
import { useNotifications } from '@/contexts/NotificationsContext';
import { eventService } from '@/services';
import * as Haptics from 'expo-haptics';
import { BlurView } from 'expo-blur';
import { bindHomeForegroundRefresh, confirmedHomeAttendees, createHomeRequestGate, homeEventImage, homeEventPrice, homeEventTiming, homeEventsQuery, visibleHomeEvents, type HomeEvent } from '@/utils/homeToday';
import Animated, {
  useSharedValue, useAnimatedScrollHandler, useAnimatedStyle,
  interpolate, Extrapolation, withSpring, withRepeat, withTiming,
  type SharedValue
} from 'react-native-reanimated';

// Colors used over event photographs
const PINK   = '#F28BB6';
const VIOLET = '#302334';
const NEON   = '#F28BB6';

const CATEGORIES = [
  { id: 'all',        label: 'Descubrir',            icon: 'sparkles' },
  { id: 'recurring',  label: '🔁 Fijos Semanales',   icon: 'repeat' },
  { id: 'education',  label: '🎓 Cursos & IA',       icon: 'school' },
  { id: 'sports',     label: '🏅 Deportes',  icon: 'baseball' },
  { id: 'art',        label: '🎨 Arte & Museos',     icon: 'color-palette' },
  { id: 'travel',     label: '🚌 Tours & Escapadas', icon: 'compass' },
  { id: 'music',      label: '🎵 Música',            icon: 'musical-notes' },
  { id: 'food',       label: '🍽️ Gourmet & Café',    icon: 'restaurant' },
  { id: 'technology', label: '💻 Tech',              icon: 'code-slash' },
  { id: 'outdoors',   label: '🌿 Aire libre',        icon: 'leaf' },
  { id: 'wellness',   label: '🧘 Bienestar',         icon: 'heart' },
  { id: 'social',     label: '👥 Social & Coros',    icon: 'people' },
];

const DARK_MAP = [
  { elementType: 'geometry', stylers: [{ color: '#0c0b10' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#9ca3af' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#0c0b10' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#1f1d2b' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0d1b2a' }] },
  { featureType: 'poi', elementType: 'geometry', stylers: [{ color: '#131220' }] },
];

function useHomeAppearance() {
  const { isDark } = useTheme();
  const palette = useMemo(() => discoveryAppearance(isDark), [isDark]);
  const styles = useMemo(() => createStyles(palette), [palette]);
  const mapStyles = useMemo(() => createMapStyles(palette), [palette]);
  return { palette, styles, mapStyles, isDark };
}

// Hero Component (Parallax)
function HeroSection({ event, scrollY, now, today, heroHeight }: { event?: HomeEvent; scrollY: SharedValue<number>; now: number; today: boolean; heroHeight: number }) {

  const { styles } = useHomeAppearance();
  const rImageStyle = useAnimatedStyle(() => {
    const ty = interpolate(scrollY.value, [-100, 0, heroHeight], [-50, 0, heroHeight * 0.5], Extrapolation.CLAMP);
    const sc = interpolate(scrollY.value, [-100, 0], [1.2, 1], Extrapolation.CLAMP);
    return {
      transform: [{ translateY: ty }, { scale: sc }] as any,
    } as any;
  });

  const rOverlayStyle = useAnimatedStyle(() => {
    return {
      opacity: 1,
    };
  });

  if (!event) return null;
  const price = homeEventPrice(event);
  const timing = homeEventTiming(event, now);
  const confirmed = confirmedHomeAttendees(event);
  const dateStr = event.date ? new Date(event.date).toLocaleString('es', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '';

  return (
    <TouchableOpacity style={[styles.heroContainer, { height: heroHeight }]} activeOpacity={0.9} accessibilityRole="button" accessibilityLabel={`Ver evento ${event.title}`} onPress={() => router.push(`/event/${event._id}` as any)}>
      {homeEventImage(event) ? <Animated.Image source={{ uri: homeEventImage(event) }} style={[styles.heroImage, rImageStyle] as any} /> : <View style={[styles.heroImage, { backgroundColor: VIOLET }]} />}
      <Animated.View style={[styles.heroOverlay, rOverlayStyle] as any}>
        <LinearGradient
          colors={['rgba(17,16,22,0.05)', 'rgba(17,16,22,0.94)']}
          style={StyleSheet.absoluteFillObject}
        />
      </Animated.View>
      
      <View style={styles.heroContent}>
        <View style={styles.heroBadgeRow}>
          <BlurView intensity={40} tint="dark" style={styles.glassBadge}>
            <Text style={styles.glassBadgeText}>{today ? 'En las próximas 12 horas' : 'Un plan para descubrir'}</Text>
          </BlurView>
          <BlurView intensity={40} tint="dark" style={[styles.glassBadge, { borderColor: 'rgba(255,255,255,0.35)' }]}>
            <Text style={[styles.glassBadgeText, { color: '#FFFFFF' }]}>
              {price.label}
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
        <Text style={[styles.heroMetaText, { marginTop: 8 }]}>{timing.label}{confirmed !== null ? ` · ${confirmed} confirmados` : ''}</Text>
      </View>
    </TouchableOpacity>
  );
}

// Glassmorphic List Card
function GlassEventCard({ event, now, cardWidth }: { event: HomeEvent; now: number; cardWidth: number }) {
  const { styles } = useHomeAppearance();
  const { fontScale } = useWindowDimensions();
  const scale = useSharedValue(1);
  const price = homeEventPrice(event);
  const timing = homeEventTiming(event, now);
  const confirmed = confirmedHomeAttendees(event);
  const dateStr = event.date ? new Date(event.date).toLocaleString('es', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '';

  const rStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }]
  }));

  return (
    <TouchableOpacity
      accessibilityRole="button" accessibilityLabel={`Ver evento ${event.title}`}
      activeOpacity={0.85}
      onPressIn={() => { scale.value = withSpring(0.96, { mass: 0.5 }); }}
      onPressOut={() => { scale.value = withSpring(1, { mass: 0.5 }); }}
      onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push('/event/' + event._id as any); }}
    >
      <Animated.View style={[styles.glassCardContainer, { width: cardWidth, height: Math.max(340, 240 + 84 * fontScale) }, rStyle]}>
        {homeEventImage(event) ? <Image source={{ uri: homeEventImage(event) }} style={styles.glassCardImage} /> : <View style={[styles.glassCardImage, { backgroundColor: VIOLET }]} />}
        <LinearGradient colors={['transparent', 'rgba(5,5,5,0.95)']} style={styles.glassCardOverlay} />
        
        <View style={styles.glassCardContent}>
          <Text style={styles.glassCardDate}>{dateStr} · {timing.label}</Text>
          {confirmed !== null && <Text style={styles.glassCardDate}>{confirmed} confirmados</Text>}
          <Text style={styles.glassCardTitle} numberOfLines={2}>{event.title}</Text>
          <View style={styles.glassCardFooter}>
            <BlurView intensity={30} tint="light" style={styles.glassPriceBadge}>
              <Text style={styles.glassPriceText}>{price.label}</Text>
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
  const { mapStyles } = useHomeAppearance();
  const pulse = useSharedValue(1);
  React.useEffect(() => {
    pulse.value = withRepeat(
      withTiming(1.7, { duration: 1000 }),
      -1,
      true
    );
  }, [pulse]);
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
function MapPreviewSection({ nearby, onOpenMap }: {
  nearby: ReturnType<typeof useNearbyEvents>;
  onOpenMap: () => void;
}) {
  const { palette, styles, mapStyles, isDark } = useHomeAppearance();
  const { events, status, coordinates, message, locate } = nearby;
  const loading = status === 'loading';
  const mapRef = React.useRef<MapView>(null);
  const valid = events.filter(
    (e) => e.location && typeof e.location !== 'string' && (e.location as any).coordinates
  );
  const region = coordinates
    ? {
        latitude: coordinates.latitude,
        longitude: coordinates.longitude,
        latitudeDelta: 0.1,
        longitudeDelta: 0.1,
      }
    : valid.length ? {
        latitude: (valid[0].location as any).coordinates[1],
        longitude: (valid[0].location as any).coordinates[0],
        latitudeDelta: 0.1,
        longitudeDelta: 0.1,
      }
    : { latitude: 18.4861, longitude: -69.9312, latitudeDelta: 0.1, longitudeDelta: 0.1 };

  if (status !== 'ready' || valid.length === 0) return (
    <View style={mapStyles.wrap}>
      <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>Cerca de ti</Text></View>
      <View style={mapStyles.locationPrompt}>
        <Ionicons name="location-outline" size={26} color={palette.accent} />
        <Text style={mapStyles.promptTitle}>{status === 'ready' ? 'Todavía no hay planes en esta zona' : 'Descubre lo que tienes cerca'}</Text>
        <Text style={mapStyles.promptCopy}>{message || (status === 'ready' ? 'No encontramos eventos con ubicación pública a menos de 50 km. Puedes explorar otros lugares y fechas.' : 'Usa tu ubicación cuando quieras. También puedes explorar eventos sin activarla.')}</Text>
        <TouchableOpacity accessibilityRole="button" disabled={loading} onPress={() => void locate()} style={mapStyles.locateButton}>
          {loading && <ActivityIndicator color={palette.accent} />}<Text style={mapStyles.locateText}>{loading ? 'Buscando cerca de ti…' : status === 'idle' ? 'Usar mi ubicación' : 'Volver a intentar'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

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
          customMapStyle={isDark ? DARK_MAP : undefined}
          initialRegion={region}
          scrollEnabled={false}
          zoomEnabled={false}
          rotateEnabled={false}
          pitchEnabled={false}
          showsUserLocation={false}
          onPress={onOpenMap}
        >
          {valid.map((ev) => {
            const c = (ev.location as any).coordinates;
            const col = palette.accent;
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
  const { palette, styles, isDark } = useHomeAppearance();
  const insets = useSafeAreaInsets();
  const { width, height, fontScale } = useWindowDimensions();
  const heroHeight = Math.max(400, Math.min(height * 0.6, 580), insets.top + 120 + 150 * fontScale);
  const cardWidth = Math.min(width * 0.8, 380);
  const { user } = useAuth();
  const { unreadCount } = useNotifications();
  
  const [activeCategory, setActiveCategory] = useState('all');
  const [onlyNext12Hours, setOnlyNext12Hours] = useState(false);
  const [clock, setClock] = useState(Date.now());
  const owner = String(user?._id || user?.id || 'guest');
  const nearby = useNearbyEvents(owner);
  const scope = `${owner}:${onlyNext12Hours}`;
  const latestScope = useRef(scope);
  latestScope.current = scope;
  const mounted = useRef(true);
  const requestGate = useRef(createHomeRequestGate());
  requestGate.current.setScope(scope);
  const [catalog, setCatalog] = useState<{ scope: string; events: HomeEvent[] } | null>(null);
  const [pendingScope, setPendingScope] = useState<string | null>(null);
  const [catalogError, setCatalogError] = useState<{ scope: string; message: string } | null>(null);
  const scrollY = useSharedValue(0);

  const loadEvents = useCallback(async () => {
    if (!mounted.current || latestScope.current !== scope || AppState.currentState === 'background' || AppState.currentState === 'inactive') return;
    const request = requestGate.current.begin(scope);
    if (!request) return;
    setPendingScope(scope);
    setCatalogError(null);
    try {
      const filters = homeEventsQuery(onlyNext12Hours, Date.now());
      const response = await eventService.getEvents(filters);
      if (!mounted.current || latestScope.current !== scope || !requestGate.current.isCurrent(request)) return;
      if (!response.success || !Array.isArray(response.data)) throw new Error();
      setCatalog({ scope, events: response.data });
    } catch {
      if (mounted.current && latestScope.current === scope && requestGate.current.isCurrent(request)) setCatalogError({ scope, message: 'No pudimos actualizar los eventos. Inténtalo de nuevo.' });
    } finally {
      if (mounted.current && latestScope.current === scope && requestGate.current.isCurrent(request)) setPendingScope(null);
      requestGate.current.finish(request);
    }
  }, [scope, onlyNext12Hours]);

  useEffect(() => {
    const gate = requestGate.current;
    mounted.current = true;
    return () => { mounted.current = false; gate.invalidate(); };
  }, []);
  useEffect(() => bindHomeForegroundRefresh(
    AppState.currentState,
    listener => {
      const subscription = AppState.addEventListener('change', listener);
      return () => subscription.remove();
    },
    () => { setClock(Date.now()); void loadEvents(); },
    onlyNext12Hours,
  ), [loadEvents, onlyNext12Hours]);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

  const greetingText = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Buenos días';
    if (h < 18) return 'Buenas tardes';
    return 'Buenas noches';
  };

  const firstName = user?.firstName || user?.username || 'Explorador';
  const visible = visibleHomeEvents(catalog?.scope === scope ? catalog.events : [], onlyNext12Hours, clock);
  const categoryEvents = activeCategory === 'all' ? visible : visible.filter(event =>
    (activeCategory === 'recurring' ? Boolean((event as any).isRecurring) : false) ||
    event.category === activeCategory ||
    (activeCategory === 'technology' && (event.category as string) === 'tech') ||
    (activeCategory === 'art' && (event.category as string) === 'arts') ||
    (activeCategory === 'travel' && (Boolean((event as any).isTourOrTrip) || (event.category as string) === 'outdoors'))
  );
  const heroEvent = categoryEvents[0];
  const filteredEvents = categoryEvents.slice(1);
  const catalogLoading = pendingScope === scope;
  const currentError = catalogError?.scope === scope ? catalogError.message : null;

  return (
    <View style={styles.container}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={palette.background} />

      {/* Header stays separate from event photography. */}
      <View style={[styles.headerContainer, { paddingTop: insets.top }]}>
        <View style={styles.headerInner}>
          <View style={{ flex: 1 }}>
            <Text style={styles.greetingText}>{greetingText()},</Text>
            <Text style={styles.userNameText} numberOfLines={1}>{firstName}</Text>
          </View>
          
          {/* Top Nav Icons */}
          <View style={styles.headerActions}>
            <TouchableOpacity 
              style={styles.iconButton} accessibilityRole="button" accessibilityLabel="Buscar eventos"
              onPress={() => router.push('/search' as any)}
            >
              <Ionicons name="search" size={22} color={palette.text} />
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.iconButton} 
              accessibilityRole="button" accessibilityLabel={user ? `Notificaciones${unreadCount > 0 ? `, ${unreadCount} sin leer` : ''}` : 'Iniciar sesión para ver notificaciones'} onPress={() => router.push(user ? '/notifications' : '/(auth)/login')}
            >
              <Ionicons name="notifications-outline" size={22} color={palette.text} />
              {user && unreadCount > 0 && <View style={styles.notifDot} />}
            </TouchableOpacity>
            <TouchableOpacity accessibilityRole="button" accessibilityLabel={user ? 'Mi perfil' : 'Iniciar sesión'} onPress={() => router.push(user ? '/(tabs)/profile' : '/(auth)/login')}>
              <View style={styles.avatarRing}>
                <View style={styles.avatarInner}>
                  <Text style={styles.avatarInitial}>{firstName.charAt(0).toUpperCase()}</Text>
                </View>
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <Animated.ScrollView
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 32 }}
      >
        <View style={[styles.todayPanel, onlyNext12Hours && { borderColor: palette.accent }]}>
          <View style={{ flex: 1 }}><Text style={styles.todayTitle}>¿Qué hay hoy?</Text><Text style={styles.todayCopy}>En curso y en las próximas 12 horas.</Text></View>
          <Switch value={onlyNext12Hours} onValueChange={setOnlyNext12Hours} accessibilityLabel="Mostrar solo eventos en curso y próximas 12 horas" trackColor={{ false: palette.border, true: palette.accent }} thumbColor={isDark && onlyNext12Hours ? palette.onAccent : '#FFFFFF'} />
        </View>
        {catalogLoading && <View style={{ padding: 12 }}><ActivityIndicator color={palette.accent} accessibilityLabel="Actualizando eventos" /></View>}
        {currentError && <View style={{ marginHorizontal: 20, marginTop: 12 }}><Text style={{ color: palette.error }}>{currentError}</Text><TouchableOpacity onPress={() => void loadEvents()} accessibilityRole="button"><Text style={{ color: palette.accent, marginTop: 6, paddingVertical: 12 }}>Reintentar</Text></TouchableOpacity></View>}

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
                  accessibilityRole="button" accessibilityState={{ selected: isActive }} activeOpacity={0.8}
                >
                  <View style={[styles.categoryPill, isActive && styles.categoryPillActive]}>
                    <Ionicons name={item.icon as any} size={16} color={isActive ? palette.onAccent : palette.muted} />
                    <Text style={isActive ? styles.categoryPillTextActive : styles.categoryPillText}>{item.label}</Text>
                  </View>
                </TouchableOpacity>
              );
            }}
          />
        </View>

        {/* Parallax Hero */}
        <HeroSection event={heroEvent} scrollY={scrollY} now={clock} today={onlyNext12Hours} heroHeight={heroHeight} />
        {/* Nearby map preview — real interactive map with nearby events */}
        {!onlyNext12Hours && <MapPreviewSection
          nearby={nearby}
          onOpenMap={() => router.push('/map')}
        />}

        {/* More public events */}
        {filteredEvents.length > 0 && <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{onlyNext12Hours ? 'En las próximas 12 horas' : 'Para descubrir'}</Text>
          <TouchableOpacity onPress={() => router.push('/(tabs)/discover' as any)}>
            <Text style={styles.sectionLink}>Explorar más</Text>
          </TouchableOpacity>
        </View>}

        <FlatList
          data={filteredEvents}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={i => i._id!}
          contentContainerStyle={styles.cardsList}
          snapToInterval={cardWidth + 16}
          decelerationRate="fast"
          renderItem={({ item }) => <GlassEventCard event={item} now={clock} cardWidth={cardWidth} />}
        />

        <View style={styles.toolsSection}>
          <Text style={styles.toolsTitle}>Haz más con tu plan</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.toolsList}>
            {([
              { path: '/group-plans', icon: 'people-outline', title: 'Con amigos', hint: 'Resuelvan el coro' },
              { path: '/ideas-market', icon: 'bulb-outline', title: 'Yo voy si…', hint: 'Dale público a una idea' },
              { path: '/planning-tools', icon: 'calendar-outline', title: 'Mi itinerario', hint: 'Organiza tu tiempo' },
              { path: '/partners', icon: 'storefront-outline', title: 'Marcas y espacios', hint: 'Prepara una propuesta' },
            ] as const).map(tool => <TouchableOpacity key={tool.path} accessibilityRole="button" onPress={() => router.push(tool.path)} style={styles.toolLink}>
              <Ionicons name={tool.icon} size={20} color={palette.accent} /><View style={{ flex: 1 }}><Text style={styles.toolLabel}>{tool.title}</Text><Text style={styles.toolHint}>{tool.hint}</Text></View>
            </TouchableOpacity>)}
          </ScrollView>
        </View>
        {categoryEvents.length === 0 && !catalogLoading && !currentError && (
          <View style={styles.emptyState}>
            <Ionicons name="calendar-outline" size={36} color={palette.accent} />
            <Text style={styles.emptyTitle}>{onlyNext12Hours ? 'Sin planes en esta ventana' : 'Sin eventos por ahora'}</Text>
            <Text style={styles.emptySubtitle}>{onlyNext12Hours ? 'No hay eventos públicos de esta categoría en curso o en las próximas 12 horas. Puedes desactivar el filtro para explorar más fechas.' : 'No hay eventos públicos en esta categoría aún.'}</Text>
          </View>
        )}
      </Animated.ScrollView>
    </View>
  );
}

const createStyles = (palette: ReturnType<typeof discoveryAppearance>) => StyleSheet.create({
  toolsSection: { marginTop: 30 },
  todayPanel: { marginHorizontal: 20, marginTop: 10, padding: 16, borderRadius: 18, backgroundColor: palette.surface, borderWidth: 1, borderColor: palette.border, flexDirection: 'row', alignItems: 'center', gap: 12 },
  todayTitle: { color: palette.text, fontSize: 18, fontWeight: '700' },
  todayCopy: { color: palette.muted, fontSize: 13, lineHeight: 20, marginTop: 4 },
  toolsTitle: { color: palette.muted, fontSize: 13, fontWeight: '600', marginHorizontal: 20, marginBottom: 10 },
  toolsList: { paddingHorizontal: 20, gap: 12 },
  toolLink: { width: 188, minHeight: 74, padding: 14, borderRadius: 16, backgroundColor: palette.surface, flexDirection: 'row', alignItems: 'center', gap: 10 },
  toolLabel: { color: palette.text, fontSize: 14, lineHeight: 21, fontWeight: '600' },
  toolHint: { color: palette.muted, fontSize: 11, lineHeight: 17, marginTop: 3 },
  container: { flex: 1, backgroundColor: palette.background },
  
  headerContainer: {
    backgroundColor: palette.background,
  },
  headerInner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingBottom: 16, paddingTop: 10,
  },
  greetingText: { fontSize: 13, color: palette.muted, fontWeight: '500' },
  userNameText: { fontSize: 22, fontWeight: '700', color: palette.text, marginTop: 2, letterSpacing: -0.5 },
  
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  iconButton: {
    width: 44, height: 44, borderRadius: 15,
    backgroundColor: palette.surface,
    justifyContent: 'center', alignItems: 'center',
  },
  notifDot: {
    position: 'absolute', top: 10, right: 10, width: 8, height: 8,
    borderRadius: 4, backgroundColor: palette.accent, borderWidth: 1.5, borderColor: palette.background,
  },
  
  avatarRing: { width: 44, height: 44, borderRadius: 15, padding: 2, backgroundColor: palette.border },
  avatarInner: { flex: 1, borderRadius: 13, backgroundColor: palette.surface, justifyContent: 'center', alignItems: 'center' },
  avatarInitial: { color: palette.text, fontSize: 16, fontWeight: '800' },

  heroContainer: { marginHorizontal: 20, marginTop: 22, borderRadius: 26, overflow: 'hidden', position: 'relative' },
  heroImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  heroOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  heroContent: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingHorizontal: 22, paddingBottom: 24,
  },
  heroBadgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  glassBadge: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12,
    overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
  },
  glassBadgeText: { fontSize: 12, fontWeight: '600', color: '#fff' },
  heroTitle: { fontSize: 32, fontWeight: '900', color: '#fff', lineHeight: 38, marginBottom: 16, letterSpacing: -1 },
  heroMetaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  heroMetaItem: { flexDirection: 'row', alignItems: 'center', gap: 6, maxWidth: '100%', flexShrink: 1 },
  heroMetaText: { flexShrink: 1, fontSize: 14, color: 'rgba(255,255,255,0.8)', fontWeight: '600' },

  categoriesWrapper: { marginTop: 16, zIndex: 10 },
  categoriesList: { paddingHorizontal: 20, gap: 12 },
  categoryPill: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 18, paddingVertical: 12,
    borderRadius: 20, overflow: 'hidden',
    borderWidth: 1, borderColor: palette.border,
  },
  categoryPillActive: {
    backgroundColor: palette.accent, borderColor: palette.accent,
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 18, paddingVertical: 12,
    borderRadius: 20,
  },
  categoryPillText: { fontSize: 14, color: palette.muted, fontWeight: '600' },
  categoryPillTextActive: { fontSize: 14, color: palette.onAccent, fontWeight: '700' },

  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end',
    paddingHorizontal: 20, marginTop: 26, marginBottom: 14,
  },
  sectionTitle: { flex: 1, marginRight: 12, fontSize: 22, fontWeight: '700', color: palette.text, letterSpacing: -0.5 },
  sectionLink: { fontSize: 14, fontWeight: '600', color: palette.accent, paddingVertical: 12 },

  cardsList: { paddingHorizontal: 20, gap: 16, paddingBottom: 20 },
  glassCardContainer: {
    width: '100%', minHeight: 340,
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

  emptyState: { alignItems: 'center', paddingVertical: 60, paddingHorizontal: 32 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: palette.text, textAlign: 'center', marginTop: 16, marginBottom: 8 },
  emptySubtitle: { fontSize: 14, color: palette.muted, textAlign: 'center', lineHeight: 20 },
});

// Map preview section styles
const createMapStyles = (palette: ReturnType<typeof discoveryAppearance>) => StyleSheet.create({
  locationPrompt: { marginHorizontal: 20, padding: 22, borderRadius: 22, backgroundColor: palette.surface },
  promptTitle: { color: palette.text, fontSize: 18, lineHeight: 26, fontWeight: '600', marginTop: 12 },
  promptCopy: { color: palette.muted, fontSize: 14, lineHeight: 22, marginTop: 8 },
  locateButton: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 10, alignSelf: 'flex-start', paddingVertical: 12, marginTop: 10 },
  locateText: { color: palette.accent, fontSize: 14, lineHeight: 21, fontWeight: '600', flexShrink: 1 },
  wrap: { marginTop: 4 },
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
  emptyText: { fontSize: 13, color: palette.muted, marginTop: 10, textAlign: 'center', paddingHorizontal: 24 },
  badge: {
    position: 'absolute', top: 14, left: 14,
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 14,
    overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
  },
  badgeText: { fontSize: 12, fontWeight: '700', color: '#fff' },
});
