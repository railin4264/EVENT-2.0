import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Share,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import QRCode from 'react-native-qrcode-svg';
import { useTicketPasses } from '@/hooks/useTicketPasses';
import { isAdmissionCode } from '@/utils/ticketPassStore';
import { useTheme } from '@/contexts/ThemeContext';

export default function TicketDetailScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const { id: ticketId } = useLocalSearchParams<{ id: string }>();

  const { tickets, loading, offline, savedAt, error, reload } = useTicketPasses();
  const ticket = tickets.find(item => (item._id || item.id) === ticketId) || null;
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 30000); return () => clearInterval(timer); }, []);

  const handleShare = async () => {
    if (!ticket) return;

    try {
      await Share.share({
        message: `Tengo un plan para ${ticket.event.title} en EventNow.`,
        title: 'Mi plan en EventNow',
      });
    } catch (error) {
      console.error('Error sharing ticket:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
      case 'valid':
        return '#10b981';
      case 'used':
        return '#9ca3af';
      case 'cancelled':
        return '#ef4444';
      case 'transferred':
        return '#f59e0b';
      default:
        return '#8b5cf6';
    }
  };

  const getStatusText = (status: string) => {
    if (status === 'valid' || status === 'active') return offline ? 'Pase guardado · Pendiente de validar' : 'Asistencia confirmada';
    if (status === 'used') return 'Usado';
    if (status === 'cancelled') return 'Cancelado';
    if (status === 'transferred') return 'Transferido';
    return status;
  };

  const styles = getStyles(theme);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  if (!ticket) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>{error || 'No se encontró esta entrada en tu cuenta.'}</Text><TouchableOpacity onPress={reload}><Text style={styles.backButton}>Reintentar</Text></TouchableOpacity>
      </View>
    );
  }

  const event = typeof ticket.event === 'object' ? ticket.event : null;
  const isActive = ticket.status === 'active' || (ticket.status as string) === 'valid';
  const isExpired = !Number.isFinite(Date.parse(ticket.validUntil)) || Date.parse(ticket.validUntil) <= now;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backButton}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Mi pase</Text>
        <TouchableOpacity onPress={handleShare}>
          <Text style={styles.shareButton}>↗</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={[styles.qrLabel, { paddingHorizontal: 16 }]}>{offline ? 'Pase guardado · Sin conexión' : !isActive || isExpired || !isAdmissionCode(ticket.qrCode) ? 'Estado actualizado con conexión' : savedAt ? 'Pase guardado en este dispositivo' : 'Pase abierto con conexión. No se pudo guardar una copia'}. {savedAt ? 'Actualizado: ' + new Date(savedAt).toLocaleString('es') + '.' : ''} La admisión y cualquier cambio se comprueban en la puerta con el servidor.</Text>
        {/* QR Code Section */}
        <View style={styles.qrContainer}>
          <View style={styles.qrCodeWrapper}>
            {isActive && !isExpired && isAdmissionCode(ticket.qrCode) ? <QRCode value={ticket.qrCode} size={220} backgroundColor="#ffffff" color="#000000" /> : <Text style={styles.errorText}>QR no disponible para esta entrada.</Text>}
          </View>
          <Text style={styles.qrLabel}>Muestra este QR en la entrada</Text>
          <Text style={styles.ticketNumber}>#{(ticket._id || ticket.id).slice(-8).toUpperCase()}</Text>
          <Text style={styles.qrLabel}>{Number((ticket as any).quantity || ticket.data?.quantity || 1)} persona(s) en este pase. El QR se registra una sola vez.</Text>
        </View>

        {/* Status Badge */}
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: getStatusColor(ticket.status) },
          ]}
        >
          <Text style={styles.statusText}>{isExpired ? 'Expirado' : getStatusText(ticket.status)}</Text>
        </View>

        {/* Event Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Evento</Text>
          <View style={styles.eventCard}>
            <Text style={styles.eventName}>{event?.title || 'Evento'}</Text>
            <Text style={styles.eventLocation}>
              📍 {typeof event?.location === 'object' ? event?.location?.address : event?.location || 'Lugar por confirmar'}
            </Text>
            <Text style={styles.eventDate}>
              📅 {new Date(event?.date || ticket.validFrom).toLocaleDateString('es-DO', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </Text>
            <Text style={styles.eventTime}>
              🕐 {new Date(event?.date || ticket.validFrom).toLocaleTimeString('es-DO', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Text>
          </View>
        </View>

        {/* Ticket Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Datos de la entrada</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Tipo</Text>
            <Text style={styles.infoValue}>{typeof ticket.ticketType === 'object' ? (ticket.ticketType as any)?.name : ((ticket as any).name || ticket.ticketType || 'Entrada General')}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Precio</Text>
            <Text style={styles.infoValue}>
              {ticket.currency || 'DOP'} {Number(ticket.price || 0).toFixed(2)}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Desde</Text>
            <Text style={styles.infoValue}>
              {new Date(ticket.validFrom || event?.date || ticket.purchaseDate).toLocaleDateString()}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Hasta</Text>
            <Text style={styles.infoValue}>
              {new Date(ticket.validUntil).toLocaleDateString()}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Confirmada el</Text>
            <Text style={styles.infoValue}>
              {new Date(ticket.purchaseDate).toLocaleDateString()}
            </Text>
          </View>
        </View>

        {/* Usage History */}
        {ticket.usedAt && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Registro de acceso</Text>
            <View style={styles.usageCard}>
              <Text style={styles.usageText}>
                ✓ Registrada el {new Date(ticket.usedAt).toLocaleString()}
              </Text>
            </View>
          </View>
        )}

        {/* Actions */}
        {isActive && !isExpired && (
          <View style={styles.actionsSection}>
            <TouchableOpacity
              style={styles.actionButton}
              disabled={!event?._id}
              onPress={() => event?._id && router.push('/event/' + event._id)}
            >
              <Text style={styles.actionButtonText}>Ver evento</Text>
            </TouchableOpacity>

          </View>
        )}

        {/* Warning for expired/used tickets */}
        {(isExpired || ticket.status === 'used') && (
          <View style={styles.warningCard}>
            <Text style={styles.warningText}>
              {isExpired
                ? '⚠️ Esta entrada expiró'
                : '⚠️ Esta entrada ya fue utilizada'}
            </Text>
          </View>
        )}

        {/* Terms */}
        <View style={styles.termsSection}>
          <Text style={styles.termsTitle}>Tu pase y el acceso</Text>
          <Text style={styles.termsText}>
            • Conserva tu QR privado: permite identificar tu entrada.{'\n'}
            • Abre este pase con internet antes de salir para guardarlo.{'\n'}
            • Un pase guardado no refleja cancelaciones o usos posteriores hasta actualizarlo.{'\n'}
            • El personal necesita conexión para validar y registrar la admisión.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const getStyles = (theme: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    color: theme.colors.textSecondary,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: theme.colors.background,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  backButton: {
    fontSize: 24,
    color: theme.colors.primary,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  shareButton: {
    fontSize: 24,
    color: theme.colors.primary,
  },
  content: {
    flex: 1,
  },
  qrContainer: {
    backgroundColor: theme.colors.background,
    alignItems: 'center',
    paddingVertical: 32,
    marginTop: 16,
  },
  qrCodeWrapper: {
    padding: 20,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    shadowColor: theme.colors.text,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  qrLabel: {
    marginTop: 16,
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  ticketNumber: {
    marginTop: 8,
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  statusBadge: {
    alignSelf: 'center',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    marginTop: 16,
  },
  statusText: {
    color: theme.colors.background,
    fontSize: 14,
    fontWeight: 'bold',
  },
  section: {
    backgroundColor: theme.colors.background,
    padding: 16,
    marginTop: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    color: theme.colors.text,
  },
  eventCard: {
    padding: 12,
    backgroundColor: theme.colors.surface,
    borderRadius: 8,
  },
  eventName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  eventLocation: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: 4,
  },
  eventDate: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: 4,
  },
  eventTime: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.surface,
  },
  infoLabel: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
  },
  usageCard: {
    padding: 12,
    backgroundColor: '#e8f5e9',
    borderRadius: 8,
  },
  usageText: {
    fontSize: 14,
    color: '#2e7d32',
  },
  actionsSection: {
    padding: 16,
    gap: 12,
  },
  actionButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  actionButtonOutline: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: theme.colors.primary,
  },
  actionButtonText: {
    color: theme.colors.background,
    fontSize: 16,
    fontWeight: '600',
  },
  actionButtonOutlineText: {
    color: theme.colors.primary,
  },
  warningCard: {
    margin: 16,
    padding: 16,
    backgroundColor: '#fff3e0',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#ff9800',
  },
  warningText: {
    fontSize: 14,
    color: '#e65100',
    fontWeight: '500',
  },
  termsSection: {
    padding: 16,
    marginBottom: 24,
  },
  termsTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    color: theme.colors.text,
  },
  termsText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    lineHeight: 20,
  },
});
