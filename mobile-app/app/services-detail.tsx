import React from 'react';
import { View, Text, StyleSheet, ScrollView, Image, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/contexts/ThemeContext';
import { api } from '@/services/api';

export default function ServicesDetailPage() {
  const { identifier } = useLocalSearchParams<{ identifier: string }>();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();

  const { data: service, isLoading, error } = useQuery({
    queryKey: ['service', identifier],
    queryFn: async () => {
      const res = await api.get(`/services/${identifier}`);
      return res.data.data;
    },
    enabled: !!identifier,
  });

  if (isLoading) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (error || !service) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
        <Text style={{ color: theme.colors.text }}>Servicio no disponible</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={{ color: theme.colors.primary }}>Volver</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background, paddingTop: insets.top }]}>
      <TouchableOpacity style={styles.header} onPress={() => router.back()}>
        <Ionicons name="chevron-back" size={24} color={theme.colors.text} />
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>{service.name}</Text>
      </TouchableOpacity>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 20 }}>
        {service.image && (
          <Image source={{ uri: service.image }} style={styles.image} resizeMode="cover" />
        )}

        <Text style={[styles.title, { color: theme.colors.text }]}>{service.name}</Text>
        <Text style={[styles.description, { color: theme.colors.textSecondary }]}>{service.description}</Text>

        {service.features?.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Características</Text>
            {service.features.map((feature: string, i: number) => (
              <View key={i} style={styles.featureRow}>
                <Ionicons name="checkmark-circle" size={18} color={theme.colors.primary} />
                <Text style={[styles.featureText, { color: theme.colors.textSecondary }]}>{feature}</Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 8 },
  headerTitle: { fontSize: 18, fontWeight: '600' },
  image: { width: '100%', height: 200, borderRadius: 12, marginBottom: 16 },
  title: { fontSize: 24, fontWeight: '700', marginBottom: 8 },
  description: { fontSize: 15, lineHeight: 22, marginBottom: 16 },
  section: { marginTop: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '600', marginBottom: 12 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  featureText: { fontSize: 14 },
  backBtn: { marginTop: 16, padding: 8 },
});
