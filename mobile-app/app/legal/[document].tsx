import React from 'react';
import { ScrollView, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../src/contexts/ThemeContext';
import documents from '../../src/content/legalDocuments.json';

export default function LegalDocumentScreen() {
  const { document } = useLocalSearchParams<{ document?: string }>();
  const router = useRouter();
  const { theme } = useTheme();
  const data = document === 'terms' || document === 'privacy' ? documents[document] : null;
  return (
    <SafeAreaView style={[styles.page, { backgroundColor: theme.colors.bg }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Volver" onPress={() => router.canGoBack() ? router.back() : router.replace('/(auth)/welcome')} style={styles.back}>
          <Ionicons name="arrow-back" size={22} color={theme.colors.text} /><Text style={{ color: theme.colors.text }}>Volver</Text>
        </TouchableOpacity>
        <Text accessibilityRole="header" style={[styles.title, { color: theme.colors.text }]}>{data?.title || 'Documento no disponible'}</Text>
        {data ? data.blocks.map((block, index) => (
          <Text key={index} accessibilityRole={block.kind === 'heading' ? 'header' : undefined} style={[block.kind === 'heading' ? styles.heading : styles.copy, { color: theme.colors.text }, block.kind === 'bullet' && styles.bullet]}>{block.kind === 'bullet' ? '• ' : ''}{block.text}</Text>
        )) : <View><Text style={[styles.copy, { color: theme.colors.text }]}>Vuelve a la pantalla anterior y selecciona Términos o Privacidad.</Text></View>}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  content: { paddingHorizontal: 24, paddingBottom: 36, maxWidth: 680, width: '100%', alignSelf: 'center' },
  back: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 48, marginBottom: 12 },
  title: { fontSize: 29, lineHeight: 37, fontWeight: '700', marginBottom: 16 },
  heading: { fontSize: 20, lineHeight: 29, fontWeight: '700', marginTop: 24, marginBottom: 12 },
  copy: { fontSize: 15, lineHeight: 25, marginBottom: 12 },
  bullet: { paddingLeft: 12 },
});
