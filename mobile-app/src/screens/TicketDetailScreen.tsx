import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Share,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import QRCode from 'react-native-qrcode-svg';
import { ticketService } from '@/services';
import type { Ticket, Event } from '@/types';
import { useTheme } from '@/contexts/ThemeContext';

export default function TicketDetailScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const { id: ticketId } = useLocalSearchParams<{ id: string }>();

  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTicket();
  }, [ticketId]);

  const loadTicket = async () => {
    try {
      const result = await ticketService.getTicketById(ticketId);
      setTicket(result);
    } catch (error: any) {
      console.error('Error loading ticket:', error);
      Alert.alert('Error', 'Failed to load ticket');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    if (!ticket) return;

    try {
      await Share.share({
        message: `Check out my ticket for ${ticket.event.title}!`,
        title: 'Event Ticket',
      });
    } catch (error) {
      console.error('Error sharing ticket:', error);
    }
  };

  const handleTransfer = () => {
    if (!ticket) return;

    Alert.alert(
      'Transfer Ticket',
      'Do you want to transfer this ticket to another user?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Transfer',
          onPress: () => {
            // Navigate to transfer screen or show transfer dialog
            Alert.alert('Coming Soon', 'Ticket transfer feature coming soon!');
          },
        },
      ]
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return '#4CAF50';
      case 'used':
        return theme.colors.textSecondary;
      case 'cancelled':
        return '#f44336';
      case 'transferred':
        return '#FF9800';
      default:
        return theme.colors.textSecondary;
    }
  };

  const getStatusText = (status: string) => {
    return status.charAt(0).toUpperCase() + status.slice(1);
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
        <Text style={styles.errorText}>Ticket not found</Text>
      </View>
    );
  }

  const event = typeof ticket.event === 'object' ? ticket.event : null;
  const isActive = ticket.status === 'active';
  const isExpired = new Date(ticket.validUntil).getTime() < new Date().getTime();

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backButton}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Ticket Details</Text>
        <TouchableOpacity onPress={handleShare}>
          <Text style={styles.shareButton}>↗</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* QR Code Section */}
        <View style={styles.qrContainer}>
          <View style={styles.qrCodeWrapper}>
            <QRCode value={ticket.qrCode} size={220} />
          </View>
          <Text style={styles.qrLabel}>Show this QR code at the event</Text>
          <Text style={styles.ticketNumber}>#{ticket._id.slice(-8).toUpperCase()}</Text>
        </View>

        {/* Status Badge */}
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: getStatusColor(ticket.status) },
          ]}
        >
          <Text style={styles.statusText}>{getStatusText(ticket.status)}</Text>
        </View>

        {/* Event Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Event</Text>
          <View style={styles.eventCard}>
            <Text style={styles.eventName}>{event?.title || 'Event'}</Text>
            <Text style={styles.eventLocation}>
              📍 {typeof event?.location === 'object' ? event?.location?.address : event?.location || 'Location TBD'}
            </Text>
            <Text style={styles.eventDate}>
              📅 {new Date(event?.date || ticket.validFrom).toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </Text>
            <Text style={styles.eventTime}>
              🕐 {new Date(event?.date || ticket.validFrom).toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Text>
          </View>
        </View>

        {/* Ticket Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ticket Information</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Type</Text>
            <Text style={styles.infoValue}>{ticket.ticketType.name}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Price</Text>
            <Text style={styles.infoValue}>
              {ticket.currency} {ticket.price.toFixed(2)}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Valid From</Text>
            <Text style={styles.infoValue}>
              {new Date(ticket.validFrom).toLocaleDateString()}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Valid Until</Text>
            <Text style={styles.infoValue}>
              {new Date(ticket.validUntil).toLocaleDateString()}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Purchase Date</Text>
            <Text style={styles.infoValue}>
              {new Date(ticket.purchaseDate).toLocaleDateString()}
            </Text>
          </View>
        </View>

        {/* Usage History */}
        {ticket.usedAt && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Usage History</Text>
            <View style={styles.usageCard}>
              <Text style={styles.usageText}>
                ✓ Used on {new Date(ticket.usedAt).toLocaleString()}
              </Text>
            </View>
          </View>
        )}

        {/* Actions */}
        {isActive && !isExpired && (
          <View style={styles.actionsSection}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => router.push('/event/' + event?._id)}
            >
              <Text style={styles.actionButtonText}>View Event Details</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.actionButtonOutline]}
              onPress={handleTransfer}
            >
              <Text style={[styles.actionButtonText, styles.actionButtonOutlineText]}>
                Transfer Ticket
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Warning for expired/used tickets */}
        {(isExpired || ticket.status === 'used') && (
          <View style={styles.warningCard}>
            <Text style={styles.warningText}>
              {isExpired
                ? '⚠️ This ticket has expired'
                : '⚠️ This ticket has already been used'}
            </Text>
          </View>
        )}

        {/* Terms */}
        <View style={styles.termsSection}>
          <Text style={styles.termsTitle}>Terms & Conditions</Text>
          <Text style={styles.termsText}>
            • This ticket is non-refundable{'\n'}
            • Valid for one-time entry only{'\n'}
            • ID verification may be required at the venue{'\n'}
            • Screenshots are not accepted - show the original QR code{'\n'}
            • Event organizers reserve the right to refuse entry
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
    backgroundColor: theme.colors.background,
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