import React from 'react';
import { ScrollView, Text, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { EventPlanningPanel } from '../../src/components/EventPlanningPanel';
export default function EventPlanningScreen() {
  const { id } = useLocalSearchParams<{ id: string }>(), router = useRouter(), insets = useSafeAreaInsets();
  return <ScrollView style={{ flex: 1, backgroundColor: '#0C0B10' }} contentContainerStyle={{ padding: 20, paddingTop: insets.top + 16, paddingBottom: insets.bottom + 30 }} keyboardShouldPersistTaps="handled"><TouchableOpacity accessibilityRole="button" onPress={() => router.back()} style={{ minHeight: 48, justifyContent: 'center' }}><Text style={{ color: '#c4b5fd' }}>← Volver</Text></TouchableOpacity>{id ? <EventPlanningPanel eventId={id} /> : <Text style={{ color: 'white' }}>Evento no disponible</Text>}</ScrollView>;
}
