import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { eventService, ticketService, paymentService } from '@/services';
import type { Event, TicketType } from '@/types';
import { useTheme } from '@/contexts/ThemeContext';

export default function CheckoutScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const styles = getStyles(theme);
  const { eventId, ticketTypeId } = useLocalSearchParams<{ eventId: string; ticketTypeId?: string }>();

  const [event, setEvent] = useState<Event | null>(null);
  const [ticketTypes, setTicketTypes] = useState<TicketType[]>([]);
  const [selectedTicketType, setSelectedTicketType] = useState<TicketType | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'wallet'>('card');
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  // Form fields
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvc, setCardCvc] = useState('');
  const [cardName, setCardName] = useState('');

  useEffect(() => {
    loadEventData();
  }, [eventId]);

  const loadEventData = async () => {
    try {
      const [eventResult, ticketsResult] = await Promise.all([
        eventService.getEventById(eventId),
        ticketService.getEventTickets(eventId),
      ]);

      setEvent(eventResult as unknown as Event);
      setTicketTypes(ticketsResult as unknown as TicketType[]);

      // Select ticket type if provided
      if (ticketTypeId) {
        const ticketType = (ticketsResult as unknown as TicketType[]).find(
          (tt: TicketType) => tt.id === ticketTypeId
        );
        if (ticketType) setSelectedTicketType(ticketType);
      } else if ((ticketsResult as unknown as TicketType[]).length > 0) {
        setSelectedTicketType((ticketsResult as unknown as TicketType[])[0]);
      }
    } catch (error: any) {
      console.error('Error loading event data:', error);
      Alert.alert('Error', 'Failed to load event data');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const calculateTotal = () => {
    if (!selectedTicketType) return 0;
    const subtotal = selectedTicketType.price * quantity;
    const serviceFee = subtotal * 0.1; // 10% service fee
    return subtotal + serviceFee;
  };

  const calculateServiceFee = () => {
    if (!selectedTicketType) return 0;
    return selectedTicketType.price * quantity * 0.1;
  };

  const handleQuantityChange = (delta: number) => {
    const newQuantity = quantity + delta;
    if (newQuantity >= 1 && newQuantity <= 10) {
      setQuantity(newQuantity);
    }
  };

  const validateForm = () => {
    if (!selectedTicketType) {
      Alert.alert('Error', 'Please select a ticket type');
      return false;
    }

    if (paymentMethod === 'card') {
      if (!cardNumber || cardNumber.replace(/\s/g, '').length !== 16) {
        Alert.alert('Error', 'Please enter a valid card number');
        return false;
      }
      if (!cardExpiry || !cardExpiry.match(/^\d{2}\/\d{2}$/)) {
        Alert.alert('Error', 'Please enter expiry date (MM/YY)');
        return false;
      }
      if (!cardCvc || cardCvc.length !== 3) {
        Alert.alert('Error', 'Please enter a valid CVC');
        return false;
      }
      if (!cardName) {
        Alert.alert('Error', 'Please enter cardholder name');
        return false;
      }
    }

    return true;
  };

  const handlePurchase = async () => {
    if (!validateForm()) return;

    setProcessing(true);
    try {
      const purchaseData = {
        eventId,
        ticketTypeId: selectedTicketType!.id,
        quantity,
        paymentMethod,
        totalAmount: calculateTotal(),
      };

      // Create payment intent
      const paymentResult = await paymentService.createPaymentIntent(
        Math.round(calculateTotal() * 100), // Convert to cents
        selectedTicketType!.currency || 'USD',
        eventId,
        [selectedTicketType!.id]
      );

      // Purchase tickets
      const result = await ticketService.purchaseTickets(
        eventId,
        [{ ticketTypeId: selectedTicketType!.id, quantity }],
        paymentMethod
      );

      Alert.alert(
        'Success!',
        `You have successfully purchased ${quantity} ticket(s)!`,
        [
          {
            text: 'View Tickets',
            onPress: () => router.push('/tickets'),
          },
          {
            text: 'OK',
            onPress: () => router.back(),
          },
        ]
      );
    } catch (error: any) {
      console.error('Error purchasing tickets:', error);
      Alert.alert('Error', error.message || 'Failed to complete purchase');
    } finally {
      setProcessing(false);
    }
  };

  const formatCardNumber = (text: string) => {
    const cleaned = text.replace(/\s/g, '');
    const chunks = cleaned.match(/.{1,4}/g);
    return chunks ? chunks.join(' ') : cleaned;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  if (!event || !selectedTicketType) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Event or ticket type not found</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backButton}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Checkout</Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Event Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Event</Text>
          <View style={styles.eventCard}>
            <Text style={styles.eventName}>{event.title}</Text>
            <Text style={styles.eventDate}>
              {new Date(event.date).toLocaleDateString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Text>
          </View>
        </View>

        {/* Ticket Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ticket Type</Text>
          <View style={styles.ticketTypes}>
            {ticketTypes.map((ticketType) => (
              <TouchableOpacity
                key={ticketType.id}
                style={[
                  styles.ticketTypeCard,
                  selectedTicketType?.id === ticketType.id &&
                    styles.ticketTypeCardSelected,
                ]}
                onPress={() => setSelectedTicketType(ticketType)}
              >
                <Text style={styles.ticketTypeName}>{ticketType.name}</Text>
                <Text style={styles.ticketTypePrice}>
                  {ticketType.currency} {ticketType.price.toFixed(2)}
                </Text>
                <Text style={styles.ticketTypeAvailable}>
                  {ticketType.available} available
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Quantity */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quantity</Text>
          <View style={styles.quantityControl}>
            <TouchableOpacity
              style={styles.quantityButton}
              onPress={() => handleQuantityChange(-1)}
            >
              <Text style={styles.quantityButtonText}>−</Text>
            </TouchableOpacity>
            <Text style={styles.quantityText}>{quantity}</Text>
            <TouchableOpacity
              style={styles.quantityButton}
              onPress={() => handleQuantityChange(1)}
            >
              <Text style={styles.quantityButtonText}>+</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Payment Method */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payment Method</Text>
          <View style={styles.paymentMethods}>
            <TouchableOpacity
              style={[
                styles.paymentMethodCard,
                paymentMethod === 'card' && styles.paymentMethodCardSelected,
              ]}
              onPress={() => setPaymentMethod('card')}
            >
              <Text style={styles.paymentMethodText}>💳 Credit Card</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.paymentMethodCard,
                paymentMethod === 'wallet' && styles.paymentMethodCardSelected,
              ]}
              onPress={() => setPaymentMethod('wallet')}
            >
              <Text style={styles.paymentMethodText}>👛 Wallet</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Card Details */}
        {paymentMethod === 'card' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Card Details</Text>
            <TextInput
              style={styles.input}
              placeholder="Card Number"
              value={cardNumber}
              onChangeText={(text) => setCardNumber(formatCardNumber(text))}
              keyboardType="numeric"
              maxLength={19}
            />
            <View style={styles.row}>
              <TextInput
                style={[styles.input, styles.halfInput]}
                placeholder="MM/YY"
                value={cardExpiry}
                onChangeText={setCardExpiry}
                keyboardType="numeric"
                maxLength={5}
              />
              <TextInput
                style={[styles.input, styles.halfInput]}
                placeholder="CVC"
                value={cardCvc}
                onChangeText={setCardCvc}
                keyboardType="numeric"
                maxLength={3}
                secureTextEntry
              />
            </View>
            <TextInput
              style={styles.input}
              placeholder="Cardholder Name"
              value={cardName}
              onChangeText={setCardName}
              autoCapitalize="words"
            />
          </View>
        )}

        {/* Order Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Order Summary</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>
              {selectedTicketType.name} x {quantity}
            </Text>
            <Text style={styles.summaryValue}>
              {selectedTicketType.currency}{' '}
              {(selectedTicketType.price * quantity).toFixed(2)}
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Service Fee</Text>
            <Text style={styles.summaryValue}>
              {selectedTicketType.currency} {calculateServiceFee().toFixed(2)}
            </Text>
          </View>
          <View style={[styles.summaryRow, styles.summaryTotal]}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>
              {selectedTicketType.currency} {calculateTotal().toFixed(2)}
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Purchase Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.purchaseButton, processing && styles.purchaseButtonDisabled]}
          onPress={handlePurchase}
          disabled={processing}
        >
          {processing ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.purchaseButtonText}>
              Complete Purchase ({selectedTicketType.currency}{' '}
              {calculateTotal().toFixed(2)})
            </Text>
          )}
        </TouchableOpacity>
      </View>
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
    width: 40,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
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
  },
  eventCard: {
    padding: 12,
    backgroundColor: theme.colors.surface,
    borderRadius: 8,
  },
  eventName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  eventDate: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  ticketTypes: {
    gap: 12,
  },
  ticketTypeCard: {
    padding: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: theme.colors.border,
  },
  ticketTypeCardSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: '#f0f8ff',
  },
  ticketTypeName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  ticketTypePrice: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.primary,
    marginBottom: 4,
  },
  ticketTypeAvailable: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  quantityControl: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
  },
  quantityButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityButtonText: {
    color: theme.colors.background,
    fontSize: 24,
    fontWeight: '300',
  },
  quantityText: {
    fontSize: 24,
    fontWeight: '600',
  },
  paymentMethods: {
    flexDirection: 'row',
    gap: 12,
  },
  paymentMethodCard: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: theme.colors.border,
    alignItems: 'center',
  },
  paymentMethodCardSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: '#f0f8ff',
  },
  paymentMethodText: {
    fontSize: 14,
    fontWeight: '600',
  },
  input: {
    backgroundColor: theme.colors.surface,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  halfInput: {
    flex: 1,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '500',
  },
  summaryTotal: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  footer: {
    padding: 16,
    backgroundColor: theme.colors.background,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  purchaseButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  purchaseButtonDisabled: {
    opacity: 0.5,
  },
  purchaseButtonText: {
    color: theme.colors.background,
    fontSize: 18,
    fontWeight: '600',
  },
});