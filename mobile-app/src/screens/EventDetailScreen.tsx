import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Alert,
  Dimensions,
  Share,
  StatusBar,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { useEventRsvp } from '@/hooks/useEventRsvp';
import OrganizerReliabilityPanel from '@/components/events/OrganizerReliabilityPanel';
import SerruchoModal from '@/components/events/SerruchoModal';
import EventHospitalityPanel from '@/components/events/EventHospitalityPanel';
import EventSongVotingModal from '@/components/events/EventSongVotingModal';
import BankTransferModal from '@/components/events/BankTransferModal';
import OrganizerTransfersModal from '@/components/events/OrganizerTransfersModal';
import OrganizerPromotersModal from '@/components/events/OrganizerPromotersModal';
import { canRsvp, canScanAdmissions } from '@/utils/admission';
import { eventParam } from '@/utils/eventAuthReturn';
import { getMobileImageUrl } from '@/utils/imageFallbacks';
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
  const [serruchoVisible, setSerruchoVisible] = useState(false);
  const [songModalVisible, setSongModalVisible] = useState(false);
  const [bankModalVisible, setBankModalVisible] = useState(false);
  const [organizerTransfersVisible, setOrganizerTransfersVisible] = useState(false);
  const [organizerPromotersVisible, setOrganizerPromotersVisible] = useState(false);

  const eventId = eventParam(id);
  const { event, loading, isAttending, actionLoading, toggle, error, load } = useEventRsvp(eventId);
  const attendeesCount = event?.attendeesCount ?? (Array.isArray(event?.attendees) ? event.attendees.length : 0);

  const handleAttend = async () => {
    if (!event || actionLoading) return;
    if (!user) {
      router.push({ pathname: '/(auth)/login', params: { returnTo: `/event/${event._id}` } } as any);
      return;
    }
    if (!isAttending && !canRsvp(event)) return;
    try {
      if (await toggle()) void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    } catch (error: any) {
      Alert.alert('No se pudo actualizar la asistencia', error.message || 'Inténtalo de nuevo.');
    }
  };

  // ── Share ───────────────────────────────────
  const handleWhatsAppCoro = async () => {
    if (!event) return;
    const url = `https://eventnow.do/events/${event._id}`;
    const dateFormatted = format(new Date(event.date), "dd 'de' MMMM, HH:mm", { locale: es });
    const message = `🔥 ¡Actívate pal coro! Vamos para "${event.title}".\n📅 Fecha: ${dateFormatted}\n📍 Ubicación: ${locationAddress}\n🎟️ Entrada: ${priceText}\n\n👉 Confirma tu asistencia aquí: ${url}`;
    const waUrl = `whatsapp://send?text=${encodeURIComponent(message)}`;
    try {
      const canOpen = await Linking.canOpenURL(waUrl);
      if (canOpen) {
        await Linking.openURL(waUrl);
      } else {
        await Share.share({ message, title: event.title });
      }
    } catch {
      await Share.share({ message, title: event.title });
    }
  };

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
    Alert.alert('Reportar evento', 'El formulario de reportes aún no está disponible en esta pantalla. No se ha enviado ningún reporte.');
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
          {error || 'Evento no encontrado'}
        </Text>
        <TouchableOpacity accessibilityRole="button" style={[styles.backButtonSolid, { backgroundColor: theme.colors.primary, marginBottom: 12 }]} onPress={() => void load()}>
          <Text style={styles.backButtonSolidText}>Reintentar</Text>
        </TouchableOpacity>
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
  const rawCover =
    (event as any).coverImage ||
    (Array.isArray(event.images) && event.images.length > 0
      ? (typeof event.images[0] === 'string' ? event.images[0] : (event.images[0] as any)?.url)
      : undefined) ||
    (event as any).image ||
    null;
  const coverImage = getMobileImageUrl(rawCover, event.category, event.title, (event as any).activityType);

  const eventDate = new Date(event.date);
  const isEventPast = !canRsvp(event);
  const now = new Date();
  const eventStartTime = new Date(event.date);
  const eventEndTime = event.endDate ? new Date(event.endDate) : new Date(eventStartTime.getTime() + 4 * 60 * 60 * 1000);
  const isLiveNow = now >= eventStartTime && now <= eventEndTime;
  const isToday = eventStartTime.toDateString() === now.toDateString();

  const attendeesRaw = Array.isArray(event.attendees) ? event.attendees : [];
  const attendeesList = attendeesRaw.map((a: any) => {
    if (typeof a === 'object' && a !== null) {
      if (typeof a.user === 'object' && a.user !== null) {
        return a.user;
      }
      return a;
    }
    return { _id: String(a), username: 'Asistente' };
  });

  const organizer = (event as any).createdBy || (event as any).organizer;
  const importedSource = (event as any).publicSource;
  const organizerName = organizer
    ? `${organizer.firstName || ''} ${organizer.lastName || ''}`.trim() ||
      organizer.username ||
      'Organizador'
    : 'Organizador';

  const isOrganizer = canScanAdmissions(event, user);

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
          {Boolean((event as any).isOfficial) && (
            <Badge variant="gradient" gradient={['#f59e0b', '#d97706']} size="sm" style={styles.badgeItem}>
              ⭐ Oficial EventNow
            </Badge>
          )}
          {Boolean((event as any).isRecurring) && (
            <Badge variant="gradient" gradient={['#3b82f6', '#1d4ed8']} size="sm" style={styles.badgeItem}>
              🔄 Fijo Semanal
            </Badge>
          )}
          {Boolean((event as any).isCommercialDeal) && (
            <Badge variant="gradient" gradient={['#10b981', '#059669']} size="sm" style={styles.badgeItem}>
              🏷️ Oferta Especial
            </Badge>
          )}
          {Boolean((event as any).isTourOrTrip) && (
            <Badge variant="gradient" gradient={['#06b6d4', '#0891b2']} size="sm" style={styles.badgeItem}>
              🚌 Tour / Excursión
            </Badge>
          )}
          {Boolean((event as any).familyDetails?.isFamilyEvent) && (
            <Badge variant="gradient" gradient={['#ec4899', '#db2777']} size="sm" style={styles.badgeItem}>
              {`👶 ${(event as any).familyDetails?.targetAudience === 'babies' ? 'Bebés & Gateo' : 'Familiar'}`}
            </Badge>
          )}
          {Boolean((event as any).holidayLabel) && (
            <Badge variant="gradient" gradient={['#f43f5e', '#e11d48']} size="sm" style={styles.badgeItem}>
              {`💐 ${(event as any).holidayLabel || 'Festivo'}`}
            </Badge>
          )}
          {Boolean((event as any).healthDetails?.isHealthInitiative) && (
            <Badge variant="gradient" gradient={['#10b981', '#0d9488']} size="sm" style={styles.badgeItem}>
              {`🏥 ${(event as any).healthDetails?.healthType === 'clinical_trial_info' ? 'Investigación Clínica' : 'Salud Comunitaria'}`}
            </Badge>
          )}
          {event.category === 'education' && (
            <Badge variant="gradient" gradient={['#8b5cf6', '#6d28d9']} size="sm" style={styles.badgeItem}>
              🎓 Formación & Cursos
            </Badge>
          )}
          {event.category === 'sports' && (
            <Badge variant="gradient" gradient={['#10b981', '#047857']} size="sm" style={styles.badgeItem}>
              ⚾ Deportes & LIDOM
            </Badge>
          )}
          {event.category === 'art' && (
            <Badge variant="gradient" gradient={['#ec4899', '#be185d']} size="sm" style={styles.badgeItem}>
              🏛️ Arte & Museos
            </Badge>
          )}
          {isLiveNow && (
            <Badge variant="gradient" gradient={['#ef4444', '#dc2626']} size="sm" style={styles.badgeItem}>
              🔴 EN VIVO AHORA
            </Badge>
          )}
          {isToday && !isLiveNow && (
            <Badge variant="gradient" gradient={['#f59e0b', '#d97706']} size="sm" style={styles.badgeItem}>
              ⚡ HOY
            </Badge>
          )}
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

        {/* ── Actividad Fija Recurrente Banner ── */}
        {Boolean((event as any).isRecurring) && (
          <Card variant="glass" glassIntensity="medium" padding={16} style={[styles.section, { borderColor: '#3b82f6', borderWidth: 1, backgroundColor: 'rgba(59,130,246,0.12)' }] as any}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(59,130,246,0.25)', alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="repeat" size={24} color="#60a5fa" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: '#fff', fontSize: 15, fontWeight: '800' }}>Actividad Fija Recurrente</Text>
                <Text style={{ color: '#93c5fd', fontSize: 13, marginTop: 2, lineHeight: 18 }}>
                  {(event as any).recurrenceSchedule || 'Se celebra todas las semanas de forma continua en este mismo horario y lugar.'}
                </Text>
              </View>
            </View>
          </Card>
        )}

        {/* ── Educación & Cursos Banner ── */}
        {event.category === 'education' && (
          <Card variant="glass" glassIntensity="medium" padding={16} style={[styles.section, { borderColor: '#8b5cf6', borderWidth: 1, backgroundColor: 'rgba(139,92,246,0.12)' }] as any}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(139,92,246,0.25)', alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="school" size={22} color="#c084fc" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: '#fff', fontSize: 15, fontWeight: '800' }}>Curso & Masterclass Práctica</Text>
                <Text style={{ color: '#d8b4fe', fontSize: 12, marginTop: 2, lineHeight: 17 }}>
                  Desarrolla habilidades aplicadas con instructores dominicanos y networking profesional.
                </Text>
              </View>
            </View>
          </Card>
        )}

        {/* ── Deportes & LIDOM Banner ── */}
        {event.category === 'sports' && (
          <Card variant="glass" glassIntensity="medium" padding={16} style={[styles.section, { borderColor: '#10b981', borderWidth: 1, backgroundColor: 'rgba(16,185,129,0.12)' }] as any}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(16,185,129,0.25)', alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="trophy" size={22} color="#34d399" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: '#fff', fontSize: 15, fontWeight: '800' }}>Deporte, Salud & Fanatismo Quisqueyano</Text>
                <Text style={{ color: '#a7f3d0', fontSize: 12, marginTop: 2, lineHeight: 17 }}>
                  Béisbol invernal LIDOM, pádel, running o baloncesto. ¡Llega temprano para coger buen puesto!
                </Text>
              </View>
            </View>
          </Card>
        )}

        {/* ── Arte, Cultura & Museos Banner ── */}
        {event.category === 'art' && (
          <Card variant="glass" glassIntensity="medium" padding={16} style={[styles.section, { borderColor: '#ec4899', borderWidth: 1, backgroundColor: 'rgba(236,72,153,0.12)' }] as any}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(236,72,153,0.25)', alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="color-palette" size={22} color="#f472b6" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: '#fff', fontSize: 15, fontWeight: '800' }}>Patrimonio, Arte & Museos RD</Text>
                <Text style={{ color: '#fbcfe8', fontSize: 12, marginTop: 2, lineHeight: 17 }}>
                  Experiencia cultural guiada, expresiones visuales y preservación de nuestras raíces.
                </Text>
              </View>
            </View>
          </Card>
        )}

        {/* ── Día Festivo Conmemorativo Banner ── */}
        {Boolean((event as any).holidayLabel) && (
          <Card variant="glass" glassIntensity="medium" padding={16} style={[styles.section, { borderColor: '#f43f5e', borderWidth: 1, backgroundColor: 'rgba(244,63,94,0.12)' }] as any}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(244,63,94,0.25)', alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: 22 }}>💐</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: '#f43f5e', fontSize: 12, fontWeight: '800', textTransform: 'uppercase' }}>Fecha Festiva Especial</Text>
                <Text style={{ color: '#fff', fontSize: 15, fontWeight: '800', marginTop: 1 }}>{(event as any).holidayLabel}</Text>
                <Text style={{ color: '#fda4af', fontSize: 12, marginTop: 2, lineHeight: 17 }}>
                  Actividad preparada especialmente para celebrar y compartir en familia.
                </Text>
              </View>
            </View>
          </Card>
        )}

        {/* ── Espacio Infantil, Maternidad & Bebés Protegidos ── */}
        {Boolean((event as any).familyDetails?.isFamilyEvent) && (
          <Card variant="glass" glassIntensity="medium" padding={16} style={[styles.section, { borderColor: '#ec4899', borderWidth: 1, backgroundColor: 'rgba(236,72,153,0.12)' }] as any}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
              <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(236,72,153,0.25)', alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: 22 }}>👶</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: '#f472b6', fontSize: 11, fontWeight: '800', textTransform: 'uppercase' }}>
                  Espacio Familiar & Primera Infancia
                </Text>
                <Text style={{ color: '#fff', fontSize: 15, fontWeight: '800', marginTop: 1 }}>
                  {(event as any).familyDetails?.targetAudience === 'babies' ? 'Estimulación & Bebés (6 a 18 meses)' : 'Actividad Infantil & Familiar'}
                </Text>

                {/* Amenidades de confort para padres */}
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                  {Boolean((event as any).familyDetails?.nursingRoomAvailable) && (
                    <View style={{ backgroundColor: 'rgba(255,255,255,0.08)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <Text style={{ fontSize: 12 }}>🤱</Text>
                      <Text style={{ color: '#fbcfe8', fontSize: 11, fontWeight: '600' }}>Lactario Privado</Text>
                    </View>
                  )}
                  {Boolean((event as any).familyDetails?.diaperChangingStation) && (
                    <View style={{ backgroundColor: 'rgba(255,255,255,0.08)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <Text style={{ fontSize: 12 }}>🚼</Text>
                      <Text style={{ color: '#fbcfe8', fontSize: 11, fontWeight: '600' }}>Cambiador</Text>
                    </View>
                  )}
                  {Boolean((event as any).familyDetails?.strollerAccessible) && (
                    <View style={{ backgroundColor: 'rgba(255,255,255,0.08)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <Text style={{ fontSize: 12 }}>👶</Text>
                      <Text style={{ color: '#fbcfe8', fontSize: 11, fontWeight: '600' }}>Acceso Cochecitos</Text>
                    </View>
                  )}
                </View>

                {Boolean((event as any).familyDetails?.safetyNotes) && (
                  <View style={{ marginTop: 8, backgroundColor: 'rgba(236,72,153,0.15)', padding: 8, borderRadius: 8 }}>
                    <Text style={{ color: '#fdf2f8', fontSize: 11, lineHeight: 15 }}>
                      🛡️ <Text style={{ fontWeight: '700' }}>Protección Infantil:</Text> {(event as any).familyDetails?.safetyNotes}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          </Card>
        )}

        {/* ── Iniciativa de Salud Comunitaria & Protocolo Clínico ── */}
        {Boolean((event as any).healthDetails?.isHealthInitiative) && (
          <Card variant="glass" glassIntensity="medium" padding={16} style={[styles.section, { borderColor: '#10b981', borderWidth: 1, backgroundColor: 'rgba(16,185,129,0.12)' }] as any}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
              <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(16,185,129,0.25)', alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="fitness" size={24} color="#34d399" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: '#34d399', fontSize: 11, fontWeight: '800', textTransform: 'uppercase' }}>
                  {(event as any).healthDetails?.healthType === 'clinical_trial_info' ? 'Investigación Clínica Acreditada' : 'Salud Comunitaria Gratuita'}
                </Text>
                <Text style={{ color: '#fff', fontSize: 15, fontWeight: '800', marginTop: 1 }}>
                  {(event as any).healthDetails?.hospitalOrInstitution || 'Patronato de Salud / Cruz Roja'}
                </Text>

                {Boolean((event as any).healthDetails?.ethicsApprovalRef) && (
                  <Text style={{ color: '#a7f3d0', fontSize: 11, fontFamily: 'monospace', marginTop: 4 }}>
                    Ref. Bioética: {(event as any).healthDetails?.ethicsApprovalRef}
                  </Text>
                )}

                <View style={{ marginTop: 8, backgroundColor: 'rgba(0,0,0,0.3)', padding: 8, borderRadius: 8 }}>
                  <Text style={{ color: '#94a3b8', fontSize: 11, lineHeight: 15 }}>
                    ⚖️ <Text style={{ fontWeight: '700', color: '#cbd5e1' }}>Aviso Médico Oficial:</Text> {(event as any).healthDetails?.medicalDisclaimer || 'Iniciativa médica con fines asistenciales o informativos. Sujeta a consentimiento informado.'}
                  </Text>
                </View>
              </View>
            </View>
          </Card>
        )}

        {/* Organizer Controls Card */}
        {isOrganizer && (
          <Card variant="glass" glassIntensity="medium" padding={16} style={[styles.section, { borderColor: '#8b5cf6', borderWidth: 1, backgroundColor: 'rgba(139,92,246,0.1)' }] as any}>
            <View style={{ marginBottom: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <Ionicons name="shield-checkmark" size={18} color="#8b5cf6" />
                <Text style={{ color: '#8b5cf6', fontWeight: '800', fontSize: 13, textTransform: 'uppercase', letterSpacing: 0.5 }}>Panel del Organizador</Text>
              </View>
              <Text style={{ color: '#94a3b8', fontSize: 12 }}>Herramientas de control de puerta, pagos directos y embajadores VIP.</Text>
            </View>

            <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
              <TouchableOpacity
                style={{
                  flex: 1,
                  minWidth: '45%',
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  paddingHorizontal: 10,
                  paddingVertical: 10,
                  backgroundColor: '#8b5cf6',
                  borderRadius: 12,
                }}
                onPress={() => router.push({ pathname: '/qr-scanner', params: { eventId: event._id } } as any)}
              >
                <Ionicons name="qr-code" size={16} color="#fff" />
                <Text style={{ color: '#fff', fontWeight: '700', fontSize: 12 }}>Escanear QR</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={{
                  flex: 1,
                  minWidth: '45%',
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  paddingHorizontal: 10,
                  paddingVertical: 10,
                  backgroundColor: 'rgba(245,158,11,0.2)',
                  borderColor: 'rgba(245,158,11,0.4)',
                  borderWidth: 1,
                  borderRadius: 12,
                }}
                onPress={() => setOrganizerTransfersVisible(true)}
              >
                <Ionicons name="card" size={16} color="#f59e0b" />
                <Text style={{ color: '#f59e0b', fontWeight: '700', fontSize: 12 }}>Transferencias</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={{
                  width: '100%',
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  backgroundColor: 'rgba(236,72,153,0.15)',
                  borderColor: 'rgba(236,72,153,0.3)',
                  borderWidth: 1,
                  borderRadius: 12,
                }}
                onPress={() => setOrganizerPromotersVisible(true)}
              >
                <Ionicons name="sparkles" size={16} color="#ec4899" />
                <Text style={{ color: '#ec4899', fontWeight: '700', fontSize: 12 }}>Pases VIP & RRPP (Promotores)</Text>
              </TouchableOpacity>
            </View>
          </Card>
        )}

        {/* ── ¿Quién va al coro? (Visual Attendees) ── */}
        <Card variant="glass" glassIntensity="medium" padding={18} style={styles.section}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Ionicons name="people" size={20} color={theme.colors.pink} />
              <Text style={[styles.sectionTitle, { color: theme.colors.text, marginBottom: 0 }]}>
                ¿Quién va al coro?
              </Text>
            </View>
            <Badge variant="primary" size="sm">
              {String(attendeesCount) + (attendeesCount === 1 ? ' persona' : ' personas')}
            </Badge>
          </View>

          {attendeesList.length > 0 ? (
            <View>
              {/* Stacked avatars */}
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  {attendeesList.slice(0, 5).map((att: any, idx: number) => {
                    const name = `${att.firstName || ''} ${att.lastName || ''}`.trim() || att.username || 'Panas';
                    return (
                      <View
                        key={att._id || att.id || idx}
                        style={{
                          marginLeft: idx === 0 ? 0 : -12,
                          borderWidth: 2,
                          borderColor: theme.colors.background,
                          borderRadius: 22,
                        }}
                      >
                        <Avatar
                          uri={att.avatar}
                          name={name}
                          size="md"
                        />
                      </View>
                    );
                  })}
                  {attendeesList.length > 5 && (
                    <View
                      style={{
                        marginLeft: -12,
                        width: 40,
                        height: 40,
                        borderRadius: 20,
                        backgroundColor: '#8b5cf6',
                        justifyContent: 'center',
                        alignItems: 'center',
                        borderWidth: 2,
                        borderColor: theme.colors.background,
                      }}
                    >
                      <Text style={{ color: '#fff', fontSize: 12, fontWeight: '800' }}>
                        +{attendeesList.length - 5}
                      </Text>
                    </View>
                  )}
                </View>
                <Text style={{ color: theme.colors.textSecondary, fontSize: 13, marginLeft: 14, flex: 1 }}>
                  {isAttending ? '¡Tú y ' + (attendeesCount - 1 > 0 ? `${attendeesCount - 1} panas más van!` : 'el coro están listos!') : 'Ya confirmaron asistencia. ¡Súmate al coro!'}
                </Text>
              </View>

              {/* Names preview */}
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                {attendeesList.slice(0, 4).map((att: any, idx: number) => {
                  const name = att.firstName || att.username || 'Amigo';
                  return (
                    <View
                      key={att._id || idx}
                      style={{
                        paddingHorizontal: 10,
                        paddingVertical: 4,
                        borderRadius: 12,
                        backgroundColor: 'rgba(255,255,255,0.06)',
                      }}
                    >
                      <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 12 }}>
                        {name}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </View>
          ) : (
            <View style={{ paddingVertical: 8 }}>
              <Text style={{ color: theme.colors.textSecondary, fontSize: 14 }}>
                Aún no hay asistentes confirmados. ¡Sé el primero en armar el coro!
              </Text>
            </View>
          )}

          {/* Viral Action Buttons: WhatsApp & Serrucho */}
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
            <TouchableOpacity
              style={{
                flex: 1,
                backgroundColor: '#25D366',
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                paddingVertical: 12,
                borderRadius: 14,
              }}
              onPress={handleWhatsAppCoro}
              activeOpacity={0.85}
            >
              <Ionicons name="logo-whatsapp" size={18} color="#fff" />
              <Text style={{ color: '#fff', fontSize: 13, fontWeight: '800' }}>
                Armar en WhatsApp
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={{
                flex: 1,
                backgroundColor: 'rgba(236,72,153,0.15)',
                borderColor: '#ec4899',
                borderWidth: 1,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                paddingVertical: 12,
                borderRadius: 14,
              }}
              onPress={() => {
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setSerruchoVisible(true);
              }}
              activeOpacity={0.85}
            >
              <Ionicons name="pie-chart-outline" size={18} color="#ec4899" />
              <Text style={{ color: '#ec4899', fontSize: 13, fontWeight: '800' }}>
                Hacer Serrucho
              </Text>
            </TouchableOpacity>
          </View>
        </Card>

        {/* ── DJ Crowd Request & Live Music Voting ── */}
        <Card variant="glass" glassIntensity="medium" padding={18} style={[styles.section, { borderColor: 'rgba(236,72,153,0.3)', borderWidth: 1 }] as any}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <LinearGradient colors={['#ec4899', '#8b5cf6']} style={{ width: 34, height: 34, borderRadius: 17, justifyContent: 'center', alignItems: 'center' }}>
                <Ionicons name="musical-notes" size={18} color="#fff" />
              </LinearGradient>
              <View>
                <Text style={{ color: '#fff', fontSize: 16, fontWeight: '800' }}>DJ Crowd Request</Text>
                <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11 }}>Pide y vota temas en vivo pal coro</Text>
              </View>
            </View>
            <TouchableOpacity
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                backgroundColor: 'rgba(236,72,153,0.2)',
                borderColor: '#ec4899',
                borderWidth: 1,
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderRadius: 12,
              }}
              onPress={() => {
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setSongModalVisible(true);
              }}
            >
              <Ionicons name="flame" size={14} color="#ec4899" />
              <Text style={{ color: '#ec4899', fontSize: 12, fontWeight: '800' }}>Pedir Canción</Text>
            </TouchableOpacity>
          </View>
        </Card>

        {/* ── Transferencia Bancaria Directa RD (Sin pasarela) ── */}
        {Boolean(event.price && (typeof event.price === 'number' ? event.price > 0 : (event.price as any).amount > 0)) && (
          <Card variant="glass" glassIntensity="medium" padding={16} style={[styles.section, { borderColor: 'rgba(6,182,212,0.3)', borderWidth: 1, backgroundColor: 'rgba(6,182,212,0.08)' }] as any}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ flex: 1, paddingRight: 10 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                  <Ionicons name="card-outline" size={18} color="#06B6D4" />
                  <Text style={{ color: '#fff', fontSize: 15, fontWeight: '800' }}>Transferencia RD (Directa)</Text>
                </View>
                <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11 }}>
                  Paga a Banco Popular, BHD, Banreservas o Qik sin pasarela ni comisiones.
                </Text>
              </View>
              <TouchableOpacity
                style={{
                  backgroundColor: '#06B6D4',
                  paddingHorizontal: 14,
                  paddingVertical: 10,
                  borderRadius: 12,
                }}
                onPress={() => {
                  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setBankModalVisible(true);
                }}
              >
                <Text style={{ color: '#fff', fontWeight: '800', fontSize: 13 }}>Ver Cuentas</Text>
              </TouchableOpacity>
            </View>
          </Card>
        )}

        {/* Serrucho Digital RD Card */}
        <Card variant="glass" glassIntensity="medium" padding={16} style={[styles.section, { borderColor: '#f59e0b', borderWidth: 1, backgroundColor: 'rgba(245,158,11,0.08)' }] as any}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flex: 1, paddingRight: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <Ionicons name="pie-chart" size={18} color="#f59e0b" />
                <Text style={{ color: '#fff', fontSize: 14, fontWeight: '800' }}>El Serrucho Digital 🇩🇴</Text>
              </View>
              <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12 }}>
                Divide la mesa, bebidas o transporte entre panas y recibe confirmaciones por WhatsApp.
              </Text>
            </View>
            <TouchableOpacity
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                backgroundColor: '#f59e0b',
                paddingHorizontal: 14,
                paddingVertical: 10,
                borderRadius: 12,
              }}
              onPress={() => {
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setSerruchoVisible(true);
              }}
            >
              <Ionicons name="people" size={16} color="#000" />
              <Text style={{ color: '#000', fontWeight: '800', fontSize: 13 }}>Armar Vaca</Text>
            </TouchableOpacity>
          </View>
        </Card>

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

          {/* 1-Tap Navigation Buttons: Waze & Google Maps */}
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
            <TouchableOpacity
              style={{
                flex: 1,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                backgroundColor: '#06b6d4',
                paddingVertical: 10,
                borderRadius: 12,
              }}
              onPress={() => {
                const lat = (event.location as any)?.coordinates?.[1] || 18.4861;
                const lng = (event.location as any)?.coordinates?.[0] || -69.9312;
                Linking.openURL(`https://waze.com/ul?ll=${lat},${lng}&navigate=yes`);
              }}
            >
              <Ionicons name="navigate" size={16} color="#fff" />
              <Text style={{ color: '#fff', fontSize: 12, fontWeight: '800' }}>Waze (Tapones)</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={{
                flex: 1,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                backgroundColor: '#10b981',
                paddingVertical: 10,
                borderRadius: 12,
              }}
              onPress={() => {
                const lat = (event.location as any)?.coordinates?.[1] || 18.4861;
                const lng = (event.location as any)?.coordinates?.[0] || -69.9312;
                Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`);
              }}
            >
              <Ionicons name="map" size={16} color="#fff" />
              <Text style={{ color: '#fff', fontSize: 12, fontWeight: '800' }}>Google Maps</Text>
            </TouchableOpacity>
          </View>
        </Card>

        {/* ── Agendar en Calendario ── */}
        <Card variant="glass" glassIntensity="medium" padding={16} style={[styles.section, { borderColor: 'rgba(139,92,246,0.3)', borderWidth: 1 }] as any}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flex: 1, paddingRight: 10 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                <Ionicons name="calendar" size={18} color="#c084fc" />
                <Text style={{ color: '#fff', fontSize: 14, fontWeight: '800' }}>Agendar a Calendario</Text>
              </View>
              <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11 }}>
                Activa alarmas y recordatorios automáticos en tu móvil para no olvidar el plan.
              </Text>
            </View>
            <TouchableOpacity
              style={{
                backgroundColor: '#8b5cf6',
                paddingHorizontal: 12,
                paddingVertical: 10,
                borderRadius: 12,
              }}
              onPress={() => {
                const d = new Date(event.date);
                const gDates = d.toISOString().replace(/-|:|\.\d\d\d/g, '');
                const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(event.title)}&dates=${gDates}/${gDates}&details=${encodeURIComponent(event.description || '')}&location=${encodeURIComponent(locationAddress)}`;
                Linking.openURL(url);
              }}
            >
              <Text style={{ color: '#fff', fontWeight: '800', fontSize: 12 }}>+ Recordatorio</Text>
            </TouchableOpacity>
          </View>
        </Card>

        {/* ── Directorio de Seguridad Oficial & Transporte RD ── */}
        <Card variant="glass" glassIntensity="medium" padding={16} style={[styles.section, { borderColor: 'rgba(16,185,129,0.3)', borderWidth: 1 }] as any}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
            <Ionicons name="shield-checkmark" size={18} color="#10b981" />
            <Text style={{ color: '#10b981', fontSize: 13, fontWeight: '800', textTransform: 'uppercase' }}>Seguridad Oficial & Transporte</Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity
              style={{ flex: 1, backgroundColor: 'rgba(59,130,246,0.15)', borderColor: '#3b82f6', borderWidth: 1, padding: 8, borderRadius: 12, alignItems: 'center' }}
              onPress={() => Linking.openURL('tel:8092222026')}
            >
              <Ionicons name="call" size={16} color="#60a5fa" />
              <Text style={{ color: '#fff', fontSize: 11, fontWeight: '800', marginTop: 2 }}>POLITUR</Text>
              <Text style={{ color: '#93c5fd', fontSize: 10 }}>809-222-2026</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={{ flex: 1, backgroundColor: 'rgba(239,68,68,0.15)', borderColor: '#ef4444', borderWidth: 1, padding: 8, borderRadius: 12, alignItems: 'center' }}
              onPress={() => Linking.openURL('tel:911')}
            >
              <Ionicons name="alert-circle" size={16} color="#f87171" />
              <Text style={{ color: '#fff', fontSize: 11, fontWeight: '800', marginTop: 2 }}>9-1-1 RD</Text>
              <Text style={{ color: '#fca5a5', fontSize: 10 }}>Emergencias</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.08)', borderColor: 'rgba(255,255,255,0.2)', borderWidth: 1, padding: 8, borderRadius: 12, alignItems: 'center' }}
              onPress={() => {
                const lat = (event.location as any)?.coordinates?.[1] || 18.4861;
                const lng = (event.location as any)?.coordinates?.[0] || -69.9312;
                Linking.openURL(`https://m.uber.com/ul/?action=setPickup&pickup=my_location&dropoff[latitude]=${lat}&dropoff[longitude]=${lng}`);
              }}
            >
              <Ionicons name="car" size={16} color="#fff" />
              <Text style={{ color: '#fff', fontSize: 11, fontWeight: '800', marginTop: 2 }}>Pedir Uber</Text>
              <Text style={{ color: '#94a3b8', fontSize: 10 }}>Al evento</Text>
            </TouchableOpacity>
          </View>
        </Card>

        <EventHospitalityPanel event={{ ...event, isAttending }} onOpenSerrucho={() => {
          if (!user) { router.push({ pathname: '/(auth)/login', params: { returnTo: `/event/${eventId}` } } as any); return; }
          setSerruchoVisible(true);
        }} />

        {/* ── Calculadora de Presupuesto de Viaje & Serrucho (Mobile) ── */}
        <Card variant="glass" glassIntensity="medium" padding={18} style={[styles.section, { borderColor: '#8b5cf6', borderWidth: 1, backgroundColor: 'rgba(139,92,246,0.12)' }] as any}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(139,92,246,0.3)', alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="calculator" size={20} color="#c084fc" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: '#fff', fontSize: 16, fontWeight: '800' }}>Calculadora de Viaje & Serrucho</Text>
              <Text style={{ color: '#c084fc', fontSize: 11, fontWeight: '600' }}>Vuelos, Barcos, Gasolina & Hotel</Text>
            </View>
          </View>
          <Text style={{ color: '#cbd5e1', fontSize: 12, lineHeight: 18, marginBottom: 12 }}>
            Estima el costo integral para ti y tu grupo: transporte, alojamiento, comida y entradas, y divide la cuenta en partes iguales con un toque.
          </Text>

          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity
              style={{ flex: 1, backgroundColor: '#8b5cf6', paddingVertical: 10, paddingHorizontal: 12, borderRadius: 12, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6 }}
              onPress={() => {
                if (!user) { router.push({ pathname: '/(auth)/login', params: { returnTo: `/event/${eventId}` } } as any); return; }
                setSerruchoVisible(true);
              }}
            >
              <Ionicons name="people" size={16} color="#fff" />
              <Text style={{ color: '#fff', fontWeight: '800', fontSize: 13 }}>Dividir Serrucho</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.08)', borderColor: 'rgba(255,255,255,0.2)', borderWidth: 1, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 12, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6 }}
              onPress={() => {
                const destination = (event.location as any)?.city || (event.location as any)?.venue || 'Santo Domingo';
                Linking.openURL(`https://www.google.com/travel/flights?q=Flights%20to%20${encodeURIComponent(destination)}`);
              }}
            >
              <Ionicons name="airplane" size={16} color="#38bdf8" />
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>Buscar Vuelos</Text>
            </TouchableOpacity>
          </View>
        </Card>

        <Card variant="glass" glassIntensity="light" padding={20} style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Prepara tu salida</Text>
          <Text style={{ color: theme.colors.textSecondary, lineHeight: 22 }}>Cómo llegar, qué llevar y presupuesto de entrada y gastos adicionales. Si el evento se cancela, compara un Plan B.</Text>
          <TouchableOpacity accessibilityRole="button" onPress={() => router.push(`/event-planning/${eventId}` as any)} style={{ minHeight: 48, justifyContent: 'center' }}><Text style={{ color: theme.colors.primary, fontWeight: '600' }}>Ver información práctica y presupuesto</Text></TouchableOpacity>
          <TouchableOpacity accessibilityRole="button" onPress={() => router.push(`/community-event/${eventId}` as any)} style={{ minHeight: 48, justifyContent: 'center' }}><Text style={{ color: theme.colors.primary, fontWeight: '600' }}>Yo aporto · Encuentro · ¿Lo repetimos?</Text></TouchableOpacity>
        </Card>
        {!importedSource && <OrganizerReliabilityPanel eventId={String(eventId)} organizerId={typeof event.createdBy === 'string' ? event.createdBy : event.createdBy?._id || event.createdBy?.id || ''} isPublic={['published', 'completed', 'expired'].includes(event.status) && !event.isPrivate && !event.isSecretLocation} />}

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
        {importedSource ? <Card variant="glass" glassIntensity="medium" padding={20} style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Agenda pública · {importedSource.name}</Text>
          <Text style={{ color: theme.colors.textSecondary, lineHeight: 22 }}>Información importada con atribución. Comprueba inscripción, disponibilidad y cambios en la publicación original. Marcar asistencia aquí no sustituye una reserva oficial. Sin afiliación ni patrocinio de la fuente.</Text>
          {typeof (event as any).externalUrl === 'string' && /^https?:\/\//i.test((event as any).externalUrl) && <TouchableOpacity accessibilityRole="link" style={{ minHeight: 48, justifyContent: 'center' }} onPress={() => Linking.openURL((event as any).externalUrl).catch(() => Alert.alert('No se pudo abrir', 'Vuelve a intentarlo desde la publicación original.'))}><Text style={{ color: theme.colors.primary, fontWeight: '600' }}>Consultar evento original</Text></TouchableOpacity>}
          <Text style={{ color: theme.colors.textSecondary, marginTop: 8 }}>{importedSource.license}</Text>
        </Card> : organizer ? (
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
                    router.push('/user/' + (organizer._id || organizer.id))
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
      {user && <SerruchoModal key={`${event._id}:${user._id || user.id}`} visible={serruchoVisible} onClose={() => setSerruchoVisible(false)} event={event} user={user} />}
      {(!isEventPast || isAttending) && (
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
            {!user ? 'Inicia sesión para asistir' : isAttending ? 'Cancelar mi asistencia' : 'Asistir al evento'}
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
