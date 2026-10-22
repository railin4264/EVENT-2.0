import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
  Clipboard,
  Linking,
  Share,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { apiClient } from '@/services/apiClient';
import type { Event } from '@/types';

interface OrganizerPromotersModalProps {
  visible: boolean;
  onClose: () => void;
  event: Event;
}

export default function OrganizerPromotersModal({
  visible,
  onClose,
  event,
}: OrganizerPromotersModalProps) {
  const [promoters, setPromoters] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [newPromoterCode, setNewPromoterCode] = useState('');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      loadPromoters();
    }
  }, [visible]);

  const loadPromoters = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get(`/events/${event._id}/promoters`);
      if (res.data?.success && Array.isArray(res.data?.data)) {
        setPromoters(res.data.data);
      }
    } catch {
      Alert.alert('Aviso', 'No se pudieron cargar los promotores de este evento.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = (code: string) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const link = `https://eventnow.do/events/${event._id}?rrpp=${code}`;
    Clipboard.setString(link);
    setCopiedCode(code);
    Alert.alert('¡Enlace Copiado!', `Enlace VIP para @${code} copiado al portapapeles.`);
    setTimeout(() => setCopiedCode(null), 2500);
  };

  const handleShareWhatsApp = async (code: string) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const link = `https://eventnow.do/events/${event._id}?rrpp=${code}`;
    const msg = `🔥 ¡Dímelo! Te paso el pase VIP para "${event.title}" cortesía de @${code}: ${link}`;
    const waUrl = `whatsapp://send?text=${encodeURIComponent(msg)}`;

    try {
      const canOpen = await Linking.canOpenURL(waUrl);
      if (canOpen) {
        await Linking.openURL(waUrl);
      } else {
        await Share.share({ message: msg, title: 'Invitación VIP EventNow' });
      }
    } catch {
      await Share.share({ message: msg, title: 'Invitación VIP EventNow' });
    }
  };

  const handleCreateNewPromoter = () => {
    const clean = newPromoterCode.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');
    if (!clean) {
      Alert.alert('Nombre requerido', 'Ingresa un identificador para el RRPP (ej: carlos, coro_zona).');
      return;
    }
    handleCopyLink(clean);
    setNewPromoterCode('');
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
                <Ionicons name="sparkles" size={14} color="#a855f7" />
                <Text style={styles.badgeText}>Gestión de RRPP & Promotores</Text>
              </View>
              <Text style={styles.title}>Pases VIP y Embajadores</Text>
              <Text style={styles.subtitle} numberOfLines={1}>{event.title}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color="#94a3b8" />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.scrollContent}>
            {/* Generator Box */}
            <View style={styles.generatorBox}>
              <Text style={styles.generatorTitle}>Crear nuevo enlace de RRPP:</Text>
              <View style={styles.generatorRow}>
                <TextInput
                  value={newPromoterCode}
                  onChangeText={setNewPromoterCode}
                  placeholder="ej: carlos, vip_santiago"
                  placeholderTextColor="#64748b"
                  autoCapitalize="none"
                  style={styles.input}
                />
                <TouchableOpacity
                  onPress={handleCreateNewPromoter}
                  disabled={!newPromoterCode.trim()}
                  style={[styles.createBtn, !newPromoterCode.trim() && { opacity: 0.5 }]}
                >
                  <Ionicons name="link" size={16} color="#fff" />
                  <Text style={styles.createBtnText}>Generar</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* List */}
            <Text style={styles.sectionHeader}>Invitados por RRPP:</Text>

            {loading ? (
              <View style={styles.emptyContainer}>
                <ActivityIndicator size="large" color="#8b5cf6" />
                <Text style={styles.emptyText}>Cargando promotores...</Text>
              </View>
            ) : promoters.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="people-outline" size={38} color="#64748b" />
                <Text style={styles.emptyTitle}>Sin promotores aún</Text>
                <Text style={styles.emptyText}>
                  Crea enlaces para tus embajadores arriba y compártelos por WhatsApp para rastrear sus invitados.
                </Text>
              </View>
            ) : (
              promoters.map((item, idx) => {
                const isOrganico = item.promoter === 'organico';
                return (
                  <View key={item.promoter || idx} style={styles.promoterCard}>
                    <View style={styles.promoterInfo}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={styles.promoterName}>@{item.promoter}</Text>
                        {isOrganico && (
                          <View style={styles.organicoBadge}>
                            <Text style={styles.organicoText}>Directo</Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.promoterStats}>
                        {item.totalGuests} registrados · <Text style={{ color: '#10b981', fontWeight: '700' }}>{item.checkedInGuests} en puerta</Text>
                      </Text>
                    </View>

                    <View style={styles.cardActions}>
                      <TouchableOpacity
                        onPress={() => handleCopyLink(item.promoter)}
                        style={styles.iconBtn}
                        accessibilityLabel="Copiar enlace"
                      >
                        <Ionicons
                          name={copiedCode === item.promoter ? 'checkmark' : 'copy-outline'}
                          size={16}
                          color={copiedCode === item.promoter ? '#10b981' : '#cbd5e1'}
                        />
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={() => handleShareWhatsApp(item.promoter)}
                        style={styles.waBtn}
                        accessibilityLabel="Compartir por WhatsApp"
                      >
                        <Ionicons name="logo-whatsapp" size={16} color="#fff" />
                        <Text style={styles.waBtnText}>WhatsApp</Text>
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
    color: '#a855f7',
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
  generatorBox: {
    backgroundColor: 'rgba(168,85,247,0.08)',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(168,85,247,0.25)',
    gap: 10,
  },
  generatorTitle: {
    color: '#f1f5f9',
    fontSize: 13,
    fontWeight: '700',
  },
  generatorRow: {
    flexDirection: 'row',
    gap: 8,
  },
  input: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#fff',
    fontSize: 13,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#8b5cf6',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  createBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  sectionHeader: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 4,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 36,
    paddingHorizontal: 20,
  },
  emptyTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    marginTop: 10,
    marginBottom: 4,
  },
  emptyText: {
    color: '#94a3b8',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
  promoterCard: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  promoterInfo: {
    flex: 1,
    gap: 3,
  },
  promoterName: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  organicoBadge: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  organicoText: {
    color: '#94a3b8',
    fontSize: 10,
    fontWeight: '600',
  },
  promoterStats: {
    color: '#94a3b8',
    fontSize: 11,
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  waBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#059669',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
  },
  waBtnText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
});
