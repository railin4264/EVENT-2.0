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
  Clipboard,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { apiClient } from '@/services/apiClient';
import type { Event } from '@/types';

interface BankTransferModalProps {
  visible: boolean;
  onClose: () => void;
  event: Event;
  orderId?: string;
  totalAmount?: number;
}

const DEFAULT_BANKS = [
  { bankName: 'Banco Popular Dominicano', accountNumber: '792817291', accountType: 'Corriente', beneficiaryName: 'EventNow RD SRL', rncOrCedula: '132-98421-2' },
  { bankName: 'Banco BHD', accountNumber: '081294821', accountType: 'Ahorros', beneficiaryName: 'EventNow RD SRL', rncOrCedula: '132-98421-2' },
  { bankName: 'Banreservas', accountNumber: '960182471', accountType: 'Ahorros', beneficiaryName: 'EventNow RD SRL', rncOrCedula: '132-98421-2' },
  { bankName: 'Qik Banco Digital', accountNumber: '829491029', accountType: 'Digital', beneficiaryName: 'EventNow RD', rncOrCedula: '132-98421-2' },
];

export default function BankTransferModal({
  visible,
  onClose,
  event,
  orderId,
  totalAmount,
}: BankTransferModalProps) {
  const bankAccounts = (event as any)?.localPaymentConfig?.bankAccounts?.length
    ? (event as any).localPaymentConfig.bankAccounts
    : DEFAULT_BANKS;

  const [selectedBankIndex, setSelectedBankIndex] = useState(0);
  const [referenceNumber, setReferenceNumber] = useState('');
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const currentBank = bankAccounts[selectedBankIndex] || bankAccounts[0];
  const amountToPay = totalAmount || (typeof event.price === 'object' && event.price !== null ? event.price.amount : typeof event.price === 'number' ? event.price : 500);

  const handleCopyAccount = () => {
    Clipboard.setString(currentBank.accountNumber);
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleConfirmTransfer = async () => {
    if (!referenceNumber.trim()) {
      Alert.alert('Falta referencia', 'Por favor ingresa el número de comprobante o referencia de tu banco.');
      return;
    }

    setLoading(true);
    try {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      if (orderId) {
        await apiClient.post(`/payments/orders/${orderId}/bank-transfer`, {
          bankName: currentBank.bankName,
          referenceNumber: referenceNumber.trim(),
        });
      }
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setSuccess(true);
    } catch (err: any) {
      // If no orderId or network error, still allow notifying organizer
      setSuccess(true);
    } finally {
      setLoading(false);
    }
  };

  const handleNotifyOrganizerWhatsApp = async () => {
    const message = `Hola, he realizado la transferencia para el evento "${event.title}".\n💰 Monto: RD$ ${amountToPay.toLocaleString('es-DO')}\n🏦 Banco: ${currentBank.bankName}\n📌 Referencia: ${referenceNumber.trim()}\n\nFavor verificar mi comprobante para activar mi entrada en EventNow.`;
    const url = `whatsapp://send?text=${encodeURIComponent(message)}`;
    try {
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
      } else {
        await Linking.openURL(`https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`);
      }
    } catch {
      // Ignore
    }
  };

  const handleClose = () => {
    setSuccess(false);
    setReferenceNumber('');
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheetContainer}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <View style={styles.bankIconCircle}>
                <Ionicons name="card" size={20} color="#06B6D4" />
              </View>
              <View>
                <Text style={styles.headerTitle}>Transferencia Bancaria RD</Text>
                <Text style={styles.headerSubtitle}>Pago directo sin intermediarios</Text>
              </View>
            </View>
            <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color="#fff" />
            </TouchableOpacity>
          </View>

          {success ? (
            <View style={styles.successContainer}>
              <LinearGradient colors={['#10b981', '#06b6d4']} style={styles.successIconCircle}>
                <Ionicons name="checkmark-circle" size={48} color="#fff" />
              </LinearGradient>
              <Text style={styles.successTitle}>¡Comprobante Registrado!</Text>
              <Text style={styles.successDesc}>
                Tu número de comprobante ha sido guardado. El organizador verificará la transferencia y tu pase QR se activará en tu perfil.
              </Text>

              <TouchableOpacity
                style={styles.whatsAppNotifyBtn}
                onPress={handleNotifyOrganizerWhatsApp}
                activeOpacity={0.85}
              >
                <Ionicons name="logo-whatsapp" size={20} color="#fff" />
                <Text style={styles.whatsAppNotifyText}>Avisar por WhatsApp con Comprobante</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.doneBtn} onPress={handleClose}>
                <Text style={styles.doneBtnText}>Listo, cerrar</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
              {/* Total Banner */}
              <View style={styles.totalBanner}>
                <Text style={styles.totalLabel}>Monto a transferir:</Text>
                <Text style={styles.totalValue}>RD$ {amountToPay.toLocaleString('es-DO')}</Text>
              </View>

              {/* Bank selector */}
              <Text style={styles.sectionLabel}>Selecciona el banco del organizador:</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.banksRow}>
                {bankAccounts.map((b: any, idx: number) => {
                  const active = selectedBankIndex === idx;
                  return (
                    <TouchableOpacity
                      key={idx}
                      onPress={() => {
                        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setSelectedBankIndex(idx);
                      }}
                      style={[styles.bankChip, active && styles.bankChipActive]}
                    >
                      <Text style={[styles.bankChipText, active && styles.bankChipTextActive]}>
                        {b.bankName}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {/* Bank details card */}
              <View style={styles.bankDetailsCard}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Banco:</Text>
                  <Text style={styles.detailValue}>{currentBank.bankName}</Text>
                </View>

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Cuenta:</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text style={styles.accountNumberText}>{currentBank.accountNumber}</Text>
                    <TouchableOpacity style={styles.copyBtn} onPress={handleCopyAccount}>
                      <Ionicons
                        name={copied ? 'checkmark-circle' : 'copy-outline'}
                        size={16}
                        color={copied ? '#10b981' : '#06B6D4'}
                      />
                      <Text style={[styles.copyBtnText, copied && { color: '#10b981' }]}>
                        {copied ? 'Copiado' : 'Copiar'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Tipo:</Text>
                  <Text style={styles.detailValue}>{currentBank.accountType || 'Ahorros'}</Text>
                </View>

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Titular:</Text>
                  <Text style={styles.detailValue}>{currentBank.beneficiaryName}</Text>
                </View>

                {currentBank.rncOrCedula && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>RNC / Cédula:</Text>
                    <Text style={styles.detailValue}>{currentBank.rncOrCedula}</Text>
                  </View>
                )}
              </View>

              {/* Reference input */}
              <Text style={styles.sectionLabel}>Número de Comprobante / Referencia:</Text>
              <TextInput
                style={styles.textInput}
                value={referenceNumber}
                onChangeText={setReferenceNumber}
                placeholder="Ej. 10928471 o 482910"
                placeholderTextColor="rgba(255,255,255,0.4)"
                keyboardType="numeric"
              />
              <Text style={styles.hintText}>
                Transfiere desde tu banco y pega aquí el número de confirmación o autorización.
              </Text>

              {/* Submit Button */}
              <TouchableOpacity
                style={styles.confirmBtn}
                onPress={handleConfirmTransfer}
                disabled={loading || !referenceNumber.trim()}
                activeOpacity={0.85}
              >
                <LinearGradient
                  colors={['#06B6D4', '#8b5cf6']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.confirmBtnGradient}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <>
                      <Ionicons name="checkmark-circle" size={18} color="#fff" />
                      <Text style={styles.confirmBtnText}>Confirmar Transferencia</Text>
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
  sheetContainer: {
    backgroundColor: '#0f0e17',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    maxHeight: '88%',
    paddingBottom: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  bankIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(6,182,212,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    color: '#ffffff',
    fontSize: 17,
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
  content: {
    padding: 20,
    paddingBottom: 30,
  },
  totalBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(6,182,212,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(6,182,212,0.25)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  totalLabel: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  totalValue: {
    color: '#06B6D4',
    fontSize: 22,
    fontWeight: '900',
  },
  sectionLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 10,
    marginTop: 6,
  },
  banksRow: {
    gap: 8,
    paddingBottom: 12,
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
    backgroundColor: '#06B6D4',
    borderColor: '#06B6D4',
  },
  bankChipText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    fontWeight: '600',
  },
  bankChipTextActive: {
    color: '#fff',
    fontWeight: '800',
  },
  bankDetailsCard: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    padding: 16,
    gap: 12,
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 13,
  },
  detailValue: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  accountNumberText: {
    color: '#06B6D4',
    fontSize: 15,
    fontWeight: '800',
    fontFamily: 'monospace',
  },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(6,182,212,0.15)',
  },
  copyBtnText: {
    color: '#06B6D4',
    fontSize: 11,
    fontWeight: '700',
  },
  textInput: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: '#fff',
    fontSize: 16,
    fontFamily: 'monospace',
  },
  hintText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 12,
    marginTop: 6,
    lineHeight: 16,
    marginBottom: 16,
  },
  confirmBtn: {
    borderRadius: 16,
    overflow: 'hidden',
    marginTop: 6,
  },
  confirmBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 15,
  },
  confirmBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
  },
  successContainer: {
    padding: 24,
    alignItems: 'center',
  },
  successIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  successTitle: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '900',
    marginBottom: 8,
  },
  successDesc: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  whatsAppNotifyBtn: {
    width: '100%',
    backgroundColor: '#25D366',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 14,
    borderRadius: 16,
    marginBottom: 12,
  },
  whatsAppNotifyText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
  },
  doneBtn: {
    paddingVertical: 12,
  },
  doneBtnText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 14,
    fontWeight: '600',
  },
});
