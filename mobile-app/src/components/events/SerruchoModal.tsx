import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Alert,
  Linking,
  Share,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { apiClient } from '@/services/apiClient';
import type { Event, User } from '@/types';
import { regionalFor, formatMoney } from '@/utils/regional';

interface SerruchoModalProps {
  visible: boolean;
  onClose: () => void;
  event: Event;
  user: User | null;
}

const PARTICIPANT_OPTIONS = [2, 3, 4, 5, 6, 8, 10];

export default function SerruchoModal({ visible, onClose, event, user }: SerruchoModalProps) {
  // Money and wording of the place the event happens; amounts start from the real ticket price or empty.
  const regional = regionalFor(event, user);
  const money = (amount: number) => formatMoney(amount, regional);
  const ticketPrice = typeof event.price === 'object' && event.price !== null ? event.price.amount : typeof event.price === 'number' ? event.price : 0;
  const defaultAmount = ticketPrice > 0 ? String(ticketPrice) : '';

  const [title, setTitle] = useState(`${regional.splitBill}: ${event.title}`);
  const [isCarpool, setIsCarpool] = useState(false);
  const [participantsCount, setParticipantsCount] = useState(4);
  const [perPersonAmount, setPerPersonAmount] = useState(defaultAmount);
  const [tollsAmount, setTollsAmount] = useState('');
  const [fuelAmount, setFuelAmount] = useState('');
  const [selectedBank, setSelectedBank] = useState(regional.banks[0]);
  const [accountNumber, setAccountNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [createdPool, setCreatedPool] = useState<{ shareCode: string; targetAmount: number } | null>(null);

  const carpoolTotal = (parseFloat(tollsAmount) || 0) + (parseFloat(fuelAmount) || 0);
  const carpoolPerPerson = Math.ceil(carpoolTotal / Math.max(1, participantsCount));

  const parsedAmount = isCarpool ? carpoolPerPerson : parseFloat(perPersonAmount) || 0;
  const totalAmount = isCarpool ? carpoolTotal : Math.round(participantsCount * parsedAmount);

  const resetState = () => {
    setTitle(`${regional.splitBill}: ${event.title}`);
    setIsCarpool(false);
    setParticipantsCount(4);
    setPerPersonAmount(defaultAmount);
    setTollsAmount('');
    setFuelAmount('');
    setAccountNumber('');
    setCreatedPool(null);
    setLoading(false);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const handleCreateSerrucho = async () => {
    if (!user) {
      Alert.alert('Inicia sesión', `Debes iniciar sesión para ${regional.splitBillAction.toLowerCase()}.`);
      return;
    }

    if (!parsedAmount || parsedAmount < 1) {
      Alert.alert('Monto inválido', 'Indica un monto válido por persona.');
      return;
    }

    setLoading(true);
    try {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const res = await apiClient.post('/serrucho', {
        eventId: event._id,
        title: title.trim() || `${regional.splitBill}: ${event.title}`,
        targetParticipants: participantsCount,
        perPersonAmount: parsedAmount,
        targetAmount: totalAmount,
        currency: regional.currency,
        paymentInstructions: {
          bankName: selectedBank,
          accountNumber: accountNumber.trim() || 'Solicitar cuenta por WhatsApp',
        },
      });

      if (res.data?.success && res.data?.data?.shareCode) {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setCreatedPool({
          shareCode: res.data.data.shareCode,
          targetAmount: totalAmount,
        });
      } else {
        throw new Error(res.data?.message || 'No se pudo crear la colecta.');
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Error al crear la colecta.';
      Alert.alert(`No se pudo ${regional.splitBillAction.toLowerCase()}`, msg);
    } finally {
      setLoading(false);
    }
  };

  const handleShareWhatsApp = async () => {
    if (!createdPool) return;
    const shareUrl = `https://eventnow.do/serrucho/${createdPool.shareCode}`;
    const message = isCarpool
      ? `🚗 *${regional.splitBill} de gasolina y peajes*\n🎉 *Ruta al evento:* "${event.title}"\n👥 *Pasajeros:* ${participantsCount} ${regional.friends}\n⛽ *Gasolina:* ${money(parseFloat(fuelAmount) || 0)}\n🛣️ *Peajes:* ${money(parseFloat(tollsAmount) || 0)}\n🎯 *Costo total:* ${money(carpoolTotal)}\n💰 *Nos toca a:* ${money(carpoolPerPerson)} c/u\n\n💳 Banco: ${selectedBank}${accountNumber ? `\n📌 Cuenta: ${accountNumber}` : ''}\n\n👉 Confirma aquí: ${shareUrl}`
      : `🔥 ${regional.splitBill} para "${event.title}".\n👥 Somos ${participantsCount} personas, nos toca de ${money(parsedAmount)} cada uno.\n\n💳 Banco: ${selectedBank}${accountNumber ? `\n📌 Cuenta: ${accountNumber}` : ''}\n\n👉 Confirma tu parte aquí: ${shareUrl}`;

    const whatsappUrl = `whatsapp://send?text=${encodeURIComponent(message)}`;
    try {
      const canOpen = await Linking.canOpenURL(whatsappUrl);
      if (canOpen) {
        await Linking.openURL(whatsappUrl);
      } else {
        await Share.share({ message, title: `${regional.splitBill} · EventNow` });
      }
    } catch {
      await Share.share({ message, title: `${regional.splitBill} · EventNow` });
    }
  };

  const handleGeneralShare = async () => {
    if (!createdPool) return;
    const shareUrl = `https://eventnow.do/serrucho/${createdPool.shareCode}`;
    const message = `${regional.splitBill} para "${event.title}": nos toca de ${money(parsedAmount)}. Únete: ${shareUrl}`;
    await Share.share({ message, title: `${regional.splitBill} · EventNow` });
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <View style={styles.backdrop}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <View style={styles.iconCircle}>
                <Ionicons name="people" size={20} color="#ec4899" />
              </View>
              <View>
                <Text style={styles.headerTitle}>{regional.splitBillAction}</Text>
                <Text style={styles.headerSubtitle}>Divide los gastos del coro</Text>
              </View>
            </View>
            <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color="#fff" />
            </TouchableOpacity>
          </View>

          {createdPool ? (
            /* Success View */
            <View style={styles.successContainer}>
              <LinearGradient colors={['#ec4899', '#8b5cf6']} style={styles.celebrationCircle}>
                <Ionicons name="checkmark-circle" size={48} color="#fff" />
              </LinearGradient>
              <Text style={styles.successTitle}>¡{regional.splitBill} listo!</Text>
              <Text style={styles.successDesc}>
                Comparte este enlace con tus {regional.friends} para que confirmen y aporten su parte.
              </Text>

              <View style={styles.summaryCard}>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Meta total:</Text>
                  <Text style={styles.summaryValue}>{money(totalAmount)}</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Por persona ({participantsCount}):</Text>
                  <Text style={[styles.summaryValue, { color: '#ec4899' }]}>
                    {money(parsedAmount)}
                  </Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Código de sala:</Text>
                  <Text style={styles.codeText}>{createdPool.shareCode}</Text>
                </View>
              </View>

              {/* WhatsApp Share Button */}
              <TouchableOpacity
                style={styles.whatsAppBtn}
                onPress={handleShareWhatsApp}
                activeOpacity={0.8}
              >
                <Ionicons name="logo-whatsapp" size={22} color="#fff" />
                <Text style={styles.whatsAppBtnText}>Compartir en WhatsApp</Text>
              </TouchableOpacity>

              {/* General Share Button */}
              <TouchableOpacity
                style={styles.secondaryShareBtn}
                onPress={handleGeneralShare}
                activeOpacity={0.8}
              >
                <Ionicons name="share-social-outline" size={20} color="#fff" />
                <Text style={styles.secondaryShareText}>Otros canales</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.doneBtn} onPress={handleClose}>
                <Text style={styles.doneBtnText}>Listo</Text>
              </TouchableOpacity>
            </View>
          ) : (
            /* Create Form */
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.formContent}>
              {/* Type Switcher */}
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
                <TouchableOpacity
                  onPress={() => setIsCarpool(false)}
                  style={{
                    flex: 1,
                    paddingVertical: 10,
                    borderRadius: 12,
                    backgroundColor: !isCarpool ? '#8b5cf6' : 'rgba(255,255,255,0.06)',
                    alignItems: 'center',
                  }}
                >
                  <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>👥 Mesa o Boletas</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setIsCarpool(true)}
                  style={{
                    flex: 1,
                    paddingVertical: 10,
                    borderRadius: 12,
                    backgroundColor: isCarpool ? '#10b981' : 'rgba(255,255,255,0.06)',
                    alignItems: 'center',
                  }}
                >
                  <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>⛽ Gasolina & Peajes</Text>
                </TouchableOpacity>
              </View>

              {isCarpool && (
                <View style={{ backgroundColor: 'rgba(16,185,129,0.1)', borderColor: 'rgba(16,185,129,0.3)', borderWidth: 1, borderRadius: 14, padding: 12, marginBottom: 16 }}>
                  <Text style={{ color: '#34d399', fontSize: 12, fontWeight: '800', marginBottom: 8 }}>Rutas Frecuentes (Presets RD):</Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
                    {[
                      { name: 'Samaná', tolls: '1200', fuel: '2400' },
                      { name: 'Santiago', tolls: '200', fuel: '1800' },
                      { name: 'Jarabacoa', tolls: '200', fuel: '2100' },
                      { name: 'Punta Cana', tolls: '360', fuel: '2200' },
                    ].map((p) => (
                      <TouchableOpacity
                        key={p.name}
                        onPress={() => {
                          setTollsAmount(p.tolls);
                          setFuelAmount(p.fuel);
                          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        }}
                        style={{ backgroundColor: 'rgba(16,185,129,0.2)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 }}
                      >
                        <Text style={{ color: '#a7f3d0', fontSize: 11, fontWeight: '700' }}>{p.name}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: '#94a3b8', fontSize: 11, marginBottom: 4 }}>Peajes ({regional.currencySymbol})</Text>
                      <TextInput
                        style={[styles.textInput, { marginBottom: 0 }]}
                        value={tollsAmount}
                        onChangeText={setTollsAmount}
                        keyboardType="numeric"
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: '#94a3b8', fontSize: 11, marginBottom: 4 }}>Gasolina ({regional.currencySymbol})</Text>
                      <TextInput
                        style={[styles.textInput, { marginBottom: 0 }]}
                        value={fuelAmount}
                        onChangeText={setFuelAmount}
                        keyboardType="numeric"
                      />
                    </View>
                  </View>
                </View>
              )}

              {/* Title input */}
              <Text style={styles.inputLabel}>Nombre del coro o motivo</Text>
              <TextInput
                style={styles.textInput}
                value={title}
                onChangeText={setTitle}
                placeholder="Ej. Entradas y transporte"
                placeholderTextColor="rgba(255,255,255,0.4)"
              />

              {/* Participants selection */}
              <Text style={styles.inputLabel}>¿Cuántos son en el coro?</Text>
              <View style={styles.chipsRow}>
                {PARTICIPANT_OPTIONS.map((count) => {
                  const active = participantsCount === count;
                  return (
                    <TouchableOpacity
                      key={count}
                      onPress={() => {
                        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setParticipantsCount(count);
                      }}
                      style={[styles.chip, active && styles.chipActive]}
                    >
                      <Text style={[styles.chipText, active && styles.chipTextActive]}>
                        {count} {regional.friends}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Amount per person */}
              <Text style={styles.inputLabel}>Monto por persona ({regional.currencySymbol})</Text>
              <TextInput
                style={styles.textInput}
                value={perPersonAmount}
                onChangeText={setPerPersonAmount}
                keyboardType="numeric"
                placeholder="500"
                placeholderTextColor="rgba(255,255,255,0.4)"
              />

              {/* Total Calculation Display */}
              <LinearGradient colors={['rgba(236,72,153,0.15)', 'rgba(139,92,246,0.15)']} style={styles.totalBanner}>
                <View>
                  <Text style={styles.totalBannerLabel}>Total a juntar:</Text>
                  <Text style={styles.totalBannerSub}>{participantsCount} personas × {money(parsedAmount)}</Text>
                </View>
                <Text style={styles.totalBannerValue}>{money(totalAmount)}</Text>
              </LinearGradient>

              {/* Bank Selection */}
              <Text style={styles.inputLabel}>Banco receptor / Método</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.banksRow}>
                {regional.banks.map((b) => {
                  const active = selectedBank === b;
                  return (
                    <TouchableOpacity
                      key={b}
                      onPress={() => {
                        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setSelectedBank(b);
                      }}
                      style={[styles.bankChip, active && styles.bankChipActive]}
                    >
                      <Text style={[styles.bankChipText, active && styles.bankChipTextActive]}>
                        {b}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {/* Account Number / Note */}
              <Text style={styles.inputLabel}>Número de cuenta o Nota de pago</Text>
              <TextInput
                style={styles.textInput}
                value={accountNumber}
                onChangeText={setAccountNumber}
                placeholder="Ej. Cta Ahorros 829XXXXXXX o Tírame al WhatsApp"
                placeholderTextColor="rgba(255,255,255,0.4)"
              />

              {/* Submit Button */}
              <TouchableOpacity
                style={styles.createBtn}
                onPress={handleCreateSerrucho}
                disabled={loading}
                activeOpacity={0.85}
              >
                <LinearGradient
                  colors={['#ec4899', '#8b5cf6']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.createBtnGradient}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <>
                      <Ionicons name="flash" size={18} color="#fff" />
                      <Text style={styles.createBtnText}>{regional.splitBillAction}</Text>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#12101b',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    maxHeight: '90%',
    paddingBottom: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(236,72,153,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '800',
  },
  headerSubtitle: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
    marginTop: 2,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  formContent: {
    padding: 20,
    paddingBottom: 40,
  },
  inputLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
    fontWeight: '600',
    marginTop: 14,
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    color: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  chipActive: {
    backgroundColor: '#ec4899',
    borderColor: '#ec4899',
  },
  chipText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
    fontWeight: '600',
  },
  chipTextActive: {
    color: '#fff',
    fontWeight: '800',
  },
  totalBanner: {
    marginTop: 16,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(236,72,153,0.3)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  totalBannerLabel: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  totalBannerSub: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
    marginTop: 2,
  },
  totalBannerValue: {
    color: '#22c55e',
    fontSize: 20,
    fontWeight: '900',
  },
  banksRow: {
    gap: 8,
    paddingVertical: 4,
  },
  bankChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  bankChipActive: {
    backgroundColor: '#8b5cf6',
    borderColor: '#8b5cf6',
  },
  bankChipText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
    fontWeight: '600',
  },
  bankChipTextActive: {
    color: '#fff',
    fontWeight: '800',
  },
  createBtn: {
    marginTop: 22,
    borderRadius: 16,
    overflow: 'hidden',
  },
  createBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 15,
  },
  createBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
  },
  // Success styles
  successContainer: {
    padding: 24,
    alignItems: 'center',
  },
  celebrationCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  successTitle: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '900',
    marginBottom: 6,
  },
  successDesc: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  summaryCard: {
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    marginBottom: 20,
    gap: 10,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 13,
  },
  summaryValue: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  codeText: {
    color: '#06B6D4',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 1,
  },
  whatsAppBtn: {
    width: '100%',
    backgroundColor: '#25D366',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 14,
    borderRadius: 16,
    marginBottom: 10,
  },
  whatsAppBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
  },
  secondaryShareBtn: {
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.08)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    marginBottom: 10,
  },
  secondaryShareText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  doneBtn: {
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  doneBtnText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 14,
    fontWeight: '600',
  },
});
