import React, { useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  RefreshControl, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import { useTicketPasses } from '@/hooks/useTicketPasses';
import type { Ticket } from '@/types';

type FilterTab = 'active' | 'used' | 'expired';

export default function TicketsScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const { tickets, loading, offline, savedAt, error, reload } = useTicketPasses();
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<FilterTab>('active');
  const loadTickets = async () => { try { await reload(); } finally { setRefreshing(false); } };

  const now = new Date();

  const filteredTickets = tickets.filter(t => {
    const expired = t.validUntil ? new Date(t.validUntil) < now : false;
    switch (activeTab) {
      case 'active': return (t.status === 'active' || (t.status as string) === 'valid') && !expired;
      case 'used': return t.status === 'used';
      case 'expired': return t.status !== 'used' && expired;
      default: return true;
    }
  });

  const getStatusColor = (ticket: Ticket) => {
    if (ticket.status === 'used') return '#9ca3af';
    if (ticket.validUntil && new Date(ticket.validUntil) < now) return '#ef4444';
    if (ticket.status === 'active' || (ticket.status as string) === 'valid') return '#10b981';
    return '#f59e0b';
  };

  const getStatusLabel = (ticket: Ticket) => {
    if (ticket.status === 'used') return 'Usado';
    if (ticket.validUntil && new Date(ticket.validUntil) < now) return 'Expirado';
    if (ticket.status === 'active' || (ticket.status as string) === 'valid') return 'Válido';
    return 'Cancelado';
  };

  const styles = getStyles(theme);

  const renderTicket = ({ item }: { item: Ticket }) => {
    const event = typeof item.event === 'object' ? item.event : null;
    const statusColor = getStatusColor(item);

    return (
      <TouchableOpacity
        style={[styles.ticketCard, { borderColor: statusColor + '30' }]}
        onPress={() => router.push('/ticket/' + item._id)}
        activeOpacity={0.8}
      >
        {/* Color stripe */}
        <View style={[styles.ticketStripe, { backgroundColor: statusColor }]} />

        <View style={styles.ticketBody}>
          {/* Top row */}
          <View style={styles.ticketTop}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.ticketType, { color: theme.colors.textSecondary }]}>
                {item.ticketType?.name || 'Entrada'}
              </Text>
              <Text style={[styles.eventName, { color: theme.colors.text }]} numberOfLines={2}>
                {event?.title || 'Evento'}
              </Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
              <Text style={[styles.statusText, { color: statusColor }]}>
                {getStatusLabel(item)}
              </Text>
            </View>
          </View>

          {/* Info row */}
          <View style={styles.infoRow}>
            <View style={styles.infoItem}>
              <Ionicons name="calendar-outline" size={14} color={theme.colors.textSecondary} />
              <Text style={[styles.infoText, { color: theme.colors.textSecondary }]}>
                {new Date(item.validFrom || event?.date || item.purchaseDate).toLocaleDateString('es', { day: '2-digit', month: 'short', year: 'numeric' })}
              </Text>
            </View>
            {event?.location && (
              <View style={styles.infoItem}>
                <Ionicons name="location-outline" size={14} color={theme.colors.textSecondary} />
                <Text style={[styles.infoText, { color: theme.colors.textSecondary }]} numberOfLines={1}>
                  {typeof event.location === 'object' ? event.location.address : event.location}
                </Text>
              </View>
            )}
          </View>

          {/* Footer */}
          <View style={[styles.ticketFooter, { borderTopColor: theme.colors.border }]}>
            <Text style={[styles.ticketPrice, { color: theme.colors.primary }]}>
              {item.currency} {Number(item.price || 0).toFixed(2)}
            </Text>
            <View style={styles.qrButton}>
              <Ionicons name="qr-code-outline" size={16} color={theme.colors.primary} />
              <Text style={[styles.qrText, { color: theme.colors.primary }]}>Ver QR</Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const TABS: { key: FilterTab; label: string; icon: string }[] = [
    { key: 'active', label: 'Activos', icon: 'checkmark-circle-outline' },
    { key: 'used', label: 'Usados', icon: 'checkbox-outline' },
    { key: 'expired', label: 'Expirados', icon: 'time-outline' },
  ];

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
        <Text style={[styles.title, { color: theme.colors.text }]}>Mis Entradas</Text>
        <Text style={[styles.count, { color: theme.colors.textSecondary }]}>
          {tickets.filter(t => ['active', 'valid'].includes(t.status) && new Date(t.validUntil) >= now).length} activas
        </Text>
      </View>

      {offline && <Text style={{ color: theme.colors.textSecondary, padding: 16 }}>Pases guardados · Sin conexión. Última actualización: {savedAt ? new Date(savedAt).toLocaleString('es') : 'desconocida'}. El acceso se valida en la puerta.</Text>}
      {!!error && <TouchableOpacity onPress={loadTickets} accessibilityRole="button"><Text style={{ color: theme.colors.error || '#ef4444', padding: 16 }}>{error} Toca para reintentar.</Text></TouchableOpacity>}
      {/* Tabs */}
      <View style={[styles.tabBar, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.border }]}>
        {TABS.map(tab => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && { borderBottomColor: theme.colors.primary, borderBottomWidth: 2 }]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Ionicons
              name={tab.icon as any}
              size={16}
              color={activeTab === tab.key ? theme.colors.primary : theme.colors.textSecondary}
            />
            <Text style={[styles.tabText, { color: activeTab === tab.key ? theme.colors.primary : theme.colors.textSecondary }]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={filteredTickets}
        renderItem={renderTicket}
        keyExtractor={item => item._id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); loadTickets(); }}
            tintColor={theme.colors.primary}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="ticket-outline" size={64} color={theme.colors.textSecondary} />
            <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>Sin entradas</Text>
            <Text style={[styles.emptySubtitle, { color: theme.colors.textSecondary }]}>
              {activeTab === 'active'
                ? 'Confirma tu asistencia a un evento para encontrar tu pase aquí'
                : activeTab === 'used'
                ? 'Aquí aparecerán tus entradas usadas'
                : 'No tienes entradas expiradas'}
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const getStyles = (theme: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  centered: { justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  title: { fontSize: 24, fontWeight: 'bold' },
  count: { fontSize: 14 },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
  },
  tabText: { fontSize: 14, fontWeight: '500' },
  listContent: { padding: 16, gap: 12 },
  ticketCard: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
  },
  ticketStripe: { width: 6 },
  ticketBody: { flex: 1, padding: 14 },
  ticketTop: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10, gap: 12 },
  ticketType: { fontSize: 11, fontWeight: '500', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  eventName: { fontSize: 17, fontWeight: '700', lineHeight: 22 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, alignSelf: 'flex-start' },
  statusText: { fontSize: 12, fontWeight: '700' },
  infoRow: { gap: 6, marginBottom: 12 },
  infoItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  infoText: { fontSize: 13, flex: 1 },
  ticketFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
  },
  ticketPrice: { fontSize: 18, fontWeight: '800' },
  qrButton: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  qrText: { fontSize: 14, fontWeight: '600' },
  emptyState: { alignItems: 'center', paddingTop: 80, paddingHorizontal: 32 },
  emptyTitle: { fontSize: 20, fontWeight: '700', marginTop: 16, marginBottom: 8, textAlign: 'center' },
  emptySubtitle: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
});
