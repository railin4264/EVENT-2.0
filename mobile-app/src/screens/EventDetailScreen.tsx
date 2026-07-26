import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Dimensions,
  Share,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { eventService } from '@/services';
import { Event } from '@/types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Button, Card, Badge, Avatar } from '@/components/ui';

const { width, height } = Dimensions.get('window');

// ──────────────────────────────────────────────
// Skeleton loader
// ──────────────────────────────────────────────
function SkeletonBlock({
  width: w,
  height: h,
  borderRadius = 8,
  style,
}: {
  width: number | string;
  height: number;
  borderRadius?: number;
  style?: object;
}) {
  return (
    <View
      style={[
        {
          width: w as any,
          height: h,
          borderRadius,
          backgroundColor: 'rgba(255,255,255,0.07)',
        },
        style,
      ]}
    />
  );
}

function EventDetailSkeleton({ bgColor }: { bgColor: string }) {
  return (
    <View style={[styles.container, { backgroundColor: bgColor }]}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
      {/* Hero placeholder */}
      <View style={[styles.imageContainer, { backgroundColor: 'rgba(255,255,255,0.05)' }]} />
      <ScrollView style={styles.scrollContent} contentContainerStyle={styles.content}>
        <SkeletonBlock width="70%" height={32} borderRadius={8} style={{ marginBottom: 12 }} />
        <SkeletonBlock width="90%" height={20} borderRadius={6} style={{ marginBottom: 24 }} />
        {/* Quick info row */}
        <View style={styles.quickInfoGrid}>
          {[0, 1, 2, 3].map(i => (
            <SkeletonBlock
              key={i}
              width={(width - 48) / 2}
              height={100}
              borderRadius={12}
              style={{ marginBottom: 12 }}
            />
          ))}
        </View>
        <SkeletonBlock width="100%" height={80} borderRadius={12} style={{ marginBottom: 20 }} />
        <SkeletonBlock width="100%" height={120} borderRadius={12} style={{ marginBottom: 20 }} />
        <SkeletonBlock width="100%" height={100} borderRadius={12} />
      </ScrollView>
    </View>
  );
}

// ──────────────────────────────────────────────
// Price helpers
// ──────────────────────────────────────────────
function formatPrice(price: any): string {
  if (price === undefined || price === null) return 'Gratis';
  if (typeof price === 'object' && price !== null) {
    const amount = price.amount ?? 0;
    if (amount === 0) return 'Gratis';
    const currency = price.currency || '';
    return `${currency}${amount}`.trim();
  }
  if (typeof price === 'number') {
    return price === 0 ? 'Gratis' : `$${price}`;
  }
  return 'Gratis';
}

// ──────────────────────────────────────────────
// Main component
// ──────────────────────────────────────────────
export default function EventDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { theme } = useTheme();
  const { user } = useAuth();

  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAttending, setIsAttending] = useState(false);
  const [attendeesCount, setAttendeesCount] = useState(0);
  const [actionLoading, setActionLoading] = useState(false);

  // ── Load event ──────────────────────────────
  const loadEvent = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const data = await eventService.getEventById(id);
      setEvent(data);

      // Determine if current user is attending
      const userId = user?._id || user?.id;
      const attending =
        Array.isArray(data.attendees) &&
        data.attendees.some((a: any) => (typeof a === 'string' ? a === userId : (a.user?._id || a.user?.id || a.user || a._id || a) === userId));
      setIsAttending(attending);
      setAttendeesCount(Array.isArray(data.attendees) ? data.attendees.length : 0);
    } catch {
      Alert.alert('Error', 'No se pudo cargar el evento', [
        { text: 'Volver', onPress: () => router.back() },
      ]);
    } finally {
      setLoading(false);
    }
  }, [id, user]);

  useEffect(() => {
    loadEvent();
  }, [loadEvent]);

  // ── Attend / Leave ──────────────────────────
  const handleAttend = async () => {
    if (!event) return;
    setActionLoading(true);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const eventId = event._id || (event as any).id;
      if (isAttending) {
        await eventService.leaveEvent(eventId);
        setIsAttending(false);
        setAttendeesCount(prev => Math.max(0, prev - 1));
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        await eventService.joinEvent(eventId);
        setIsAttending(true);
        setAttendeesCount(prev => prev + 1);
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (error: any) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', error.message || 'No se pudo procesar la accion');
    } finally {
      setActionLoading(false);
    }
  };

  // ── Share ───────────────────────────────────
  const handleShare = async () => {
    if (!event) return;
    try {
      await Share.share({
        message: `Mira este evento: "${event.title}" el ${format(
          new Date(event.date),
          "dd 'de' MMMM",
          { locale: es }
        )}`,
        title: event.title,
      });
    } catch {
      // User cancelled or share failed silently
    }
  };

  // ── Report ──────────────────────────────────
  const handleReport = () => {
    Alert.alert(
      'Reportar Evento',
      'Estas seguro de que quieres reportar este evento?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Reportar',
          style: 'destructive',
          onPress: () => Alert.alert('Gracias', 'Tu reporte ha sido enviado'),
        },
      ]
    );
  };

  // ── Loading skeleton ────────────────────────
  if (loading) {
    return <EventDetailSkeleton bgColor={theme.colors.background} />;
  }

  if (!event) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.colors.background }]}>
        <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
        <Ionicons name="alert-circle-outline" size={64} color={theme.colors.textSecondary} />
        <Text style={[styles.errorText, { color: theme.colors.text }]}>
          Evento no encontrado
        </Text>
        <TouchableOpacity
          style={[styles.backButtonSolid, { backgroundColor: theme.colors.primary }]}
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonSolidText}>Volver</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── Derived values ──────────────────────────
  const coverImage =
    (event as any).coverImage ||
    (Array.isArray(event.images) && event.images.length > 0
      ? (typeof event.images[0] === 'string' ? event.images[0] : (event.images[0] as any)?.url)
      : undefined) ||
    (event as any).image ||
    null;

  const eventDate = new Date(event.date);
  const isEventPast = eventDate < new Date();

  const organizer = (event as any).createdBy || (event as any).organizer;
  const organizerName = organizer
    ? `${organizer.firstName || ''} ${organizer.lastName || ''}`.trim() ||
      organizer.username ||
      'Organizador'
    : 'Organizador';

  const categoryGradient: [string, string] =
    (theme.gradients as any)[event.category?.toLowerCase()] ||
    theme.gradients.primary;

  const priceText = formatPrice(event.price);

  const locationAddress =
    typeof event.location === 'object'
      ? (event.location as any)?.address ||
        (event.location as any)?.city ||
        'Ubicacion por confirmar'
      : event.location || 'Ubicacion por confirmar';

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />

      {/* ── Hero image ───────────────────────── */}
      <View style={styles.imageContainer}>
        {coverImage ? (
          <Image source={{ uri: coverImage }} style={styles.eventImage} resizeMode="cover" />
        ) : (
          <LinearGradient
            colors={categoryGradient}
            style={[styles.eventImage, styles.placeholderGradient]}
          >
            <Ionicons name="calendar" size={80} color="rgba(255,255,255,0.3)" />
          </LinearGradient>
        )}

        {/* Gradient overlay */}
        <LinearGradient
          colors={['transparent', 'rgba(12,11,16,0.97)']}
          style={styles.imageGradient}
        />

        {/* Floating back + share buttons */}
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={[styles.floatingButton, { backgroundColor: 'rgba(255,255,255,0.12)', borderColor: 'rgba(255,255,255,0.15)', borderWidth: 1 }]}
            onPress={() => router.back()}
            activeOpacity={0.8}
          >
            <Ionicons name="arrow-back" size={22} color="#ffffff" />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.floatingButton, { backgroundColor: 'rgba(255,255,255,0.12)', borderColor: 'rgba(255,255,255,0.15)', borderWidth: 1 }]}
            onPress={handleShare}
            activeOpacity={0.8}
          >
            <Ionicons name="share-outline" size={22} color="#ffffff" />
          </TouchableOpacity>
        </View>

        {/* Category badge on image */}
        {event.category ? (
          <View style={styles.imageBadgeContainer}>
            <Badge variant="gradient" gradient={categoryGradient} size="md">
              {event.category}
            </Badge>
          </View>
        ) : null}
      </View>

      {/* ── Scrollable content ───────────────── */}
      <ScrollView
        style={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        {/* Title */}
        <Text style={[styles.eventTitle, { color: theme.colors.text }]}>
          {event.title}
        </Text>

        {/* Quick info grid */}
        <View style={styles.quickInfoGrid}>
          {/* Date */}
          <Card variant="glass" glassIntensity="light" padding={16} style={styles.quickInfoCard}>
            <View style={[styles.quickInfoIcon, { backgroundColor: 'rgba(59,130,246,0.2)' }]}>
              <Ionicons name="calendar-outline" size={20} color={theme.colors.primary} />
            </View>
            <Text style={[styles.quickInfoLabel, { color: theme.colors.textSecondary }]}>
              Fecha
            </Text>
            <Text style={[styles.quickInfoValue, { color: theme.colors.text }]}>
              {format(eventDate, 'dd MMM', { locale: es })}
            </Text>
          </Card>

          {/* Time */}
          <Card variant="glass" glassIntensity="light" padding={16} style={styles.quickInfoCard}>
            <View style={[styles.quickInfoIcon, { backgroundColor: 'rgba(236,72,153,0.2)' }]}>
              <Ionicons name="time-outline" size={20} color={theme.colors.pink} />
            </View>
            <Text style={[styles.quickInfoLabel, { color: theme.colors.textSecondary }]}>
              Hora
            </Text>
            <Text style={[styles.quickInfoValue, { color: theme.colors.text }]}>
              {format(eventDate, 'HH:mm')}
            </Text>
          </Card>

          {/* Attendees */}
          <Card variant="glass" glassIntensity="light" padding={16} style={styles.quickInfoCard}>
            <View style={[styles.quickInfoIcon, { backgroundColor: 'rgba(139,92,246,0.2)' }]}>
              <Ionicons name="people-outline" size={20} color={theme.colors.violet} />
            </View>
            <Text style={[styles.quickInfoLabel, { color: theme.colors.textSecondary }]}>
              Asistentes
            </Text>
            <Text style={[styles.quickInfoValue, { color: theme.colors.text }]}>
              {attendeesCount}
              {event.maxAttendees ? `/${event.maxAttendees}` : ''}
            </Text>
          </Card>

          {/* Price */}
          <Card variant="glass" glassIntensity="light" padding={16} style={styles.quickInfoCard}>
            <View style={[styles.quickInfoIcon, { backgroundColor: 'rgba(34,197,94,0.2)' }]}>
              <Ionicons name="pricetag-outline" size={20} color="#22c55e" />
            </View>
            <Text style={[styles.quickInfoLabel, { color: theme.colors.textSecondary }]}>
              Precio
            </Text>
            <Text style={[styles.quickInfoValue, { color: theme.colors.text }]}>
              {priceText}
            </Text>
          </Card>
        </View>

        {/* Badges row */}
        <View style={styles.badgesRow}>
          {event.isVirtual && (
            <Badge variant="primary" size="sm" icon="videocam" style={styles.badgeItem}>
              Virtual
            </Badge>
          )}
          {(event as any).ageRestriction && (
            <Badge variant="gradient" gradient={['#f59e0b', '#ef4444']} size="sm" style={styles.badgeItem}>
              {"+" + (event as any).ageRestriction}
            </Badge>
          )}
          {event.status && event.status !== 'published' && (
            <Badge
              variant="gradient"
              gradient={['#6b7280', '#374151']}
              size="sm"
              style={styles.badgeItem}
            >
              {event.status}
            </Badge>
          )}
        </View>

        {/* Location */}
        <Card
          variant="glass"
          glassIntensity="medium"
          padding={16}
          style={styles.locationCard}
        >
          <View style={styles.locationHeader}>
            <View style={[styles.locationIcon, { backgroundColor: 'rgba(139,92,246,0.2)' }]}>
              <Ionicons name="location" size={24} color={theme.colors.violet} />
            </View>
            <View style={styles.locationInfo}>
              <Text style={[styles.locationLabel, { color: theme.colors.textSecondary }]}>
                Ubicacion
              </Text>
              <Text style={[styles.locationAddress, { color: theme.colors.text }]}>
                {locationAddress}
              </Text>
            </View>
          </View>
          <TouchableOpacity
            style={[styles.viewMapButton, { borderTopColor: 'rgba(255,255,255,0.08)' }]}
          >
            <Text style={[styles.viewMapText, { color: theme.colors.primary }]}>
              Ver en el mapa
            </Text>
            <Ionicons name="arrow-forward" size={16} color={theme.colors.primary} />
          </TouchableOpacity>
        </Card>

        {/* Description */}
        {event.description ? (
          <Card variant="glass" glassIntensity="light" padding={20} style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
              Acerca del evento
            </Text>
            <Text style={[styles.description, { color: theme.colors.textSecondary }]}>
              {event.description}
            </Text>
          </Card>
        ) : null}

        {/* End date */}
        {event.endDate ? (
          <Card variant="glass" glassIntensity="light" padding={16} style={styles.section}>
            <View style={styles.endDateRow}>
              <View style={[styles.quickInfoIcon, { backgroundColor: 'rgba(59,130,246,0.15)' }]}>
                <Ionicons name="flag-outline" size={18} color={theme.colors.primary} />
              </View>
              <View style={{ marginLeft: 12 }}>
                <Text style={[styles.quickInfoLabel, { color: theme.colors.textSecondary }]}>
                  Fecha de fin
                </Text>
                <Text style={[styles.quickInfoValue, { color: theme.colors.text }]}>
                  {format(new Date(event.endDate), "dd MMM yyyy 'a las' HH:mm", { locale: es })}
                </Text>
              </View>
            </View>
          </Card>
        ) : null}

        {/* Organizer */}
        {organizer ? (
          <Card variant="glass" glassIntensity="medium" padding={20} style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
              Organizador
            </Text>
            <View style={styles.organizerRow}>
              <Avatar
                uri={organizer.avatar}
                name={organizerName}
                size="lg"
                showBorder
                gradient={theme.gradients.primary as any}
              />
              <View style={styles.organizerInfo}>
                <Text style={[styles.organizerName, { color: theme.colors.text }]}>
                  {organizerName}
                </Text>
                {organizer.username ? (
                  <Text style={[styles.organizerHandle, { color: theme.colors.textSecondary }]}>
                    @{organizer.username}
                  </Text>
                ) : null}
                <TouchableOpacity
                  style={styles.viewProfileButton}
                  onPress={() =>
                    router.push('/profile/' + (organizer._id || organizer.id))
                  }
                >
                  <Text style={[styles.viewProfileText, { color: theme.colors.primary }]}>
                    Ver perfil
                  </Text>
                  <Ionicons name="arrow-forward" size={14} color={theme.colors.primary} />
                </TouchableOpacity>
              </View>
            </View>
          </Card>
        ) : null}

        {/* Report */}
        <TouchableOpacity style={styles.reportButton} onPress={handleReport}>
          <Ionicons name="flag-outline" size={18} color={theme.colors.textSecondary} />
          <Text style={[styles.reportButtonText, { color: theme.colors.textSecondary }]}>
            Reportar evento
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* ── Floating attend/leave button ────── */}
      {!isEventPast && (
        <View
          style={[
            styles.joinContainer,
            {
              backgroundColor: theme.colors.background,
              borderTopColor: 'rgba(255,255,255,0.08)',
            },
          ]}
        >
          <Button
            variant={isAttending ? 'outline' : 'primary'}
            size="lg"
            icon={isAttending ? 'checkmark-circle' : 'add-circle'}
            onPress={handleAttend}
            loading={actionLoading}
            disabled={actionLoading}
            gradient={isAttending ? undefined : theme.gradients.primary as any}
            fullWidth
          >
            {isAttending ? 'Ya estas inscrito' : 'Unirse al evento'}
          </Button>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  errorText: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 24,
    textAlign: 'center',
  },
  backButtonSolid: {
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
  },
  backButtonSolidText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  // Hero
  imageContainer: {
    position: 'relative',
    height: height * 0.42,
  },
  eventImage: {
    width: '100%',
    height: '100%',
  },
  placeholderGradient: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '75%',
  },
  headerActions: {
    position: 'absolute',
    top: 52,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  floatingButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageBadgeContainer: {
    position: 'absolute',
    bottom: 20,
    left: 16,
  },
  // Scroll content
  scrollContent: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 100,
  },
  eventTitle: {
    fontSize: 26,
    fontWeight: '700',
    lineHeight: 34,
    marginBottom: 20,
  },
  // Quick info
  quickInfoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  quickInfoCard: {
    width: (width - 48) / 2,
    alignItems: 'center',
  },
  quickInfoIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  quickInfoLabel: {
    fontSize: 11,
    fontWeight: '500',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  quickInfoValue: {
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
  },
  // Badges row
  badgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  badgeItem: {
    marginRight: 0,
  },
  // Location
  locationCard: {
    marginBottom: 16,
  },
  locationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  locationIcon: {
    width: 46,
    height: 46,
    borderRadius: 23,
    justifyContent: 'center',
    alignItems: 'center',
  },
  locationInfo: {
    flex: 1,
  },
  locationLabel: {
    fontSize: 11,
    fontWeight: '500',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  locationAddress: {
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 20,
  },
  viewMapButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  viewMapText: {
    fontSize: 14,
    fontWeight: '600',
  },
  // Sections
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
  },
  description: {
    fontSize: 15,
    lineHeight: 24,
  },
  // End date
  endDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  // Organizer
  organizerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  organizerInfo: {
    flex: 1,
  },
  organizerName: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
  },
  organizerHandle: {
    fontSize: 14,
    marginBottom: 8,
  },
  viewProfileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  viewProfileText: {
    fontSize: 14,
    fontWeight: '600',
  },
  // Report
  reportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    marginTop: 4,
    marginBottom: 20,
  },
  reportButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  // Floating join
  joinContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    paddingBottom: 32,
    borderTopWidth: 1,
  },
});
