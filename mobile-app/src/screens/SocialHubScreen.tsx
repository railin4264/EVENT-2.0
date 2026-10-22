import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { discoveryAppearance } from '../constants/discoveryAppearance';
import { MOBILE_SECTIONS } from '../constants/mobileNavigation';
export default function SocialHubScreen() {
  const router = useRouter();
  const { isDark } = useTheme();
  const { isAuthenticated } = useAuth();
  const p = discoveryAppearance(isDark);
  return <SafeAreaView edges={['top', 'left', 'right']} style={{ flex: 1, backgroundColor: p.background }}>
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={[styles.eyebrow, { color: p.accent }]}>Todo tiene su lugar</Text><Text accessibilityRole="header" style={[styles.title, { color: p.text }]}>Conecta y organiza</Text>
      <Text style={[styles.description, { color: p.muted }]}>Encuentra tu gente, prepara un plan y haz que pase.</Text>
      {MOBILE_SECTIONS.map(section => <View key={section.title} style={styles.section}>
        <Text accessibilityRole="header" style={[styles.sectionTitle, { color: p.text }]}>{section.title}</Text>
        <View style={[styles.group, { backgroundColor: p.surface }]}>{section.items.map(item => <TouchableOpacity key={item.route} accessibilityRole="button" accessibilityLabel={item.title} activeOpacity={0.8} style={styles.row}
          onPress={() => item.public || isAuthenticated ? router.push(item.route as any) : router.push({ pathname: '/(auth)/login', params: { returnTo: item.route } })}>
          <Ionicons name={item.icon} size={22} color={p.accent} /><View style={{ flex: 1 }}><Text style={[styles.rowTitle, { color: p.text }]}>{item.title}</Text><Text style={[styles.hint, { color: p.muted }]}>{item.description}</Text></View><Ionicons name="chevron-forward" size={17} color={p.muted} />
        </TouchableOpacity>)}</View>
      </View>)}
    </ScrollView>
  </SafeAreaView>;
}
const styles = StyleSheet.create({
  content: { padding: 20, paddingBottom: 32, width: '100%', maxWidth: 680, alignSelf: 'center' },
  eyebrow: { fontSize: 13, lineHeight: 20, marginBottom: 8, fontWeight: '600' },
  title: { fontSize: 30, fontWeight: '800', letterSpacing: -0.8 },
  description: { fontSize: 15, lineHeight: 24, marginTop: 12 },
  section: { marginTop: 28 }, sectionTitle: { fontSize: 19, fontWeight: '700', marginBottom: 12 },
  group: { borderRadius: 20, overflow: 'hidden' },
  row: { padding: 17, flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 80 },
  rowTitle: { fontSize: 15, fontWeight: '600', lineHeight: 23 }, hint: { fontSize: 13, lineHeight: 20, marginTop: 3 },
});
