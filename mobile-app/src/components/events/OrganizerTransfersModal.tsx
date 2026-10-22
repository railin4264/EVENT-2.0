import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Clipboard,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { apiClient } from '@/services/apiClient';
import type { Event } from '@/types';

interface OrganizerTransfersModalProps {
  visible: boolean;
  onClose: () => void;
  event: Event;
}

export default function OrganizerTransfersModal({
  visible,
  onClose,
  event,
}: OrganizerTransfersModalProps) {
  const [transfers, setTransfers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [copiedRef, setCopiedRef] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      loadTransfers();
    }
  }, [visible]);

  const loadTransfers = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/payments/organizer/pending-transfers');
      if (res.data?.success && Array.isArray(res.data?.data)) {
        // Filter transfers specifically for this event
        const forThisEvent = res.data.data.filter(
          (o: any) => String(o.eventId?._id || o.eventId) === String(event._id)
        );
        setTransfers(forThisEvent);
      }
    } catch {
      Alert.alert('Error', 'No se pudieron cargar los comprobantes pendientes.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (ref: string) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Clipboard.setString(ref);
    setCopiedRef(ref);
    setTimeout(() => setCopiedRef(null), 2500);
  };

  const handleApprove = async (orderId: string) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setActionLoadingId(orderId);
    try {
      const res = await apiClient.post(`/payments/orders/${orderId}/verify-transfer`, {
        action: 'approve',
      });
      if (res.data?.success) {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert('¡Aprobado!', 'La entrada y el código QR han sido activados para el comprador.');
        setTransfers(prev => prev.filter(o => o._id !== orderId));
      } else {
        throw new Error(res.data?.message || 'No se pudo aprobar');
      }
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message || 'Error al aprobar el pago.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleRejectPrompt = (order: any) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    Alert.alert(
      'Rechazar Transferencia',
      '¿Deseas marcar este comprobante como no válido?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sí, Rechazar',
          style: 'destructive',
          onPress: async () => {
            setActionLoadingId(order._id);
            try {
              const res = await apiClient.post(`/payments/orders/${order._id}/verify-transfer`, {
                action: 'reject',
                reason: 'Comprobante no coincide con el estado de cuenta bancario',
              });
              if (res.data?.success) {
                Alert.alert('Rechazado', 'Se ha notificado al comprador.');
                setTransfers(prev => prev.filter(o => o._id !== order._id));
              }
            } catch {
              Alert.alert('Error', 'No se pudo rechazar la transferencia.');
            } finally {
              setActionLoadingId(null);
            }
          },
        },
      ]
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.sheetContainer}>
          {/* Header */}
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <View style={styles.badgeRow}>
                <Ionicons name="card" size={14} color="#f59e0b" />
                <Text style={styles.badgeText}>Transferencias Bancarias RD 🇩🇴</Text>
              </View>
              <Text style={styles.title}>Validar Comprobantes</Text>
              <Text style={styles.subtitle} numberOfLines={1}>{event.title}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color="#94a3b8" />
            </TouchableOpacity>
          </View>

          {/* Content */}
          <ScrollView contentContainerStyle={styles.scrollContent}>
            {loading ? (
              <View style={styles.emptyContainer}>
                <ActivityIndicator size="large" color="#8b5cf6" />
                <Text style={styles.emptyText}>Buscando comprobantes...</Text>
              </View>
            ) : transfers.length === 0 ? (
              <View style={styles.emptyContainer}>
                <View style={styles.emptyIconCircle}>
                  <Ionicons name="checkmark-done" size={36} color="#10b981" />
                </View>
                <Text style={styles.emptyTitle}>¡Todo al día!</Text>
                <Text style={styles.emptyText}>
                  No hay comprobantes de transferencias bancarias pendientes de validación para este evento.
                </Text>
              </View>
            ) : (
              transfers.map((order) => {
                const proof = order.bankTransferProof || {};
                const buyer = order.userId || order.customerInfo || {};
                const buyerName = buyer.firstName
                  ? `${buyer.firstName} ${buyer.lastName || ''}`.trim()
                  : buyer.username || 'Comprador';
                const isActionBusy = actionLoadingId === order._id;

                return (
                  <View key={order._id} style={styles.orderCard}>
                    <View style={styles.orderHeader}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.buyerName}>{buyerName}</Text>
                        {buyer.phone ? (
                          <Text style={styles.buyerContact}>📞 {buyer.phone}</Text>
                        ) : null}
                      </View>
                      <View style={styles.amountBadge}>
                        <Text style={styles.amountText}>
                          RD$ {Number(order.total || 0).toLocaleString('es-DO')}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.bankDetailRow}>
                      <Text style={styles.bankLabel}>Banco:</Text>
                      <Text style={styles.bankVal}>{proof.bankName || 'Popular / BHD / Reservas'}</Text>
                    </View>

                    <View style={styles.refRow}>
                      <Text style={styles.bankLabel}>Referencia:</Text>
                      <View style={styles.refPill}>
                        <Text style={styles.refCode}>{proof.referenceNumber || 'No indicada'}</Text>
                        {proof.referenceNumber ? (
                          <TouchableOpacity
                            onPress={() => handleCopy(proof.referenceNumber)}
                            style={styles.copyBtn}
                          >
                            <Ionicons
                              name={copiedRef === proof.referenceNumber ? 'checkmark' : 'copy-outline'}
                              size={14}
                              color={copiedRef === proof.referenceNumber ? '#10b981' : '#94a3b8'}
                            />
                          </TouchableOpacity>
                        ) : null}
                      </View>
                    </View>

                    {proof.voucherUrl ? (
                      <TouchableOpacity
                        onPress={() => Linking.openURL(proof.voucherUrl)}
                        style={styles.voucherLink}
                      >
                        <Ionicons name="image-outline" size={14} color="#38bdf8" />
                        <Text style={styles.voucherText}>Ver imagen del comprobante</Text>
                      </TouchableOpacity>
                    ) : null}

                    {/* Actions */}
                    <View style={styles.actionButtons}>
                      <TouchableOpacity
                        onPress={() => handleRejectPrompt(order)}
                        disabled={isActionBusy}
                        style={styles.rejectBtn}
                      >
                        <Text style={styles.rejectBtnText}>Rechazar</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={() => handleApprove(order._id)}
                        disabled={isActionBusy}
                        style={styles.approveBtn}
                      >
                        <LinearGradient
                          colors={['#059669', '#10b981']}
                          style={styles.approveGradient}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 0 }}
                        >
                          {isActionBusy ? (
                            <ActivityIndicator size="small" color="#fff" />
                          ) : (
                            <>
                              <Ionicons name="checkmark-circle" size={16} color="#fff" />
                              <Text style={styles.approveBtnText}>Aprobar Boleta</Text>
                            </>
                          )}
                        </LinearGradient>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: '#0f172a',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '85%',
    paddingBottom: 24,
    borderTopWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 4,
  },
  badgeText: {
    color: '#f59e0b',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  title: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '800',
  },
  subtitle: {
    color: '#94a3b8',
    fontSize: 12,
    marginTop: 2,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    padding: 20,
    gap: 14,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  emptyIconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: 'rgba(16,185,129,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  emptyTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 6,
  },
  emptyText: {
    color: '#94a3b8',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
  },
  orderCard: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    gap: 10,
  },
  orderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  buyerName: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  buyerContact: {
    color: '#94a3b8',
    fontSize: 11,
    marginTop: 2,
  },
  amountBadge: {
    backgroundColor: 'rgba(16,185,129,0.15)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(16,185,129,0.3)',
  },
  amountText: {
    color: '#10b981',
    fontWeight: '800',
    fontSize: 14,
  },
  bankDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  bankLabel: {
    color: '#94a3b8',
    fontSize: 12,
  },
  bankVal: {
    color: '#f1f5f9',
    fontSize: 12,
    fontWeight: '600',
  },
  refRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  refPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(245,158,11,0.1)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(245,158,11,0.25)',
  },
  refCode: {
    color: '#f59e0b',
    fontFamily: 'monospace',
    fontWeight: '700',
    fontSize: 12,
  },
  copyBtn: {
    padding: 2,
  },
  voucherLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 2,
  },
  voucherText: {
    color: '#38bdf8',
    fontSize: 12,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 6,
  },
  rejectBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rejectBtnText: {
    color: '#ef4444',
    fontSize: 12,
    fontWeight: '700',
  },
  approveBtn: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  approveGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  approveBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
});
