import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { useTheme } from '../../src/contexts/ThemeContext';
import { useAuth } from '../../src/contexts/AuthContext';

export default function WelcomeScreen() {
  const router = useRouter();
  const { isDark } = useTheme();
  const { isAuthenticated } = useAuth();
  const { width, fontScale } = useWindowDimensions();
  const compact = width < 370 || fontScale > 1.2;
  const styles = useMemo(() => createStyles(isDark), [isDark]);
  const color = isDark ? '#F28BB6' : '#A91D56';
  const enter = (returnTo?: string) => router.push({ pathname: '/(auth)/login', params: returnTo ? { returnTo } : {} });
  const openPrivate = (path: '/create-event' | '/tribes/discover') => {
    if (isAuthenticated) router.push(path);
    else enter(path);
  };

  return (
    <SafeAreaView style={styles.page} edges={['top', 'left', 'right', 'bottom']}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <View style={styles.content}>
          <View style={styles.header}>
            <View style={styles.brand} accessibilityLabel="EventNow">
              <View style={styles.brandIcon}><Ionicons name="ticket-outline" size={22} color={color} /></View>
              <Text style={styles.wordmark}>eventnow<Text style={styles.accent}>.</Text></Text>
            </View>
            <TouchableOpacity accessibilityRole="button" onPress={() => enter()} style={styles.headerLink}>
              <Text style={styles.linkText}>Entrar</Text>
              <Ionicons name="arrow-forward" size={17} color={color} />
            </TouchableOpacity>
          </View>

          <View style={styles.intro}>
            <Text style={styles.eyebrow}>Haz espacio para un buen plan</Text>
            <Text accessibilityRole="header" style={[styles.title, compact && styles.titleCompact]}>Tu próximo{ compact ? ' ' : '\n'}buen recuerdo.</Text>
            <Text style={styles.description}>Descubre eventos, encuentra tu gente y convierte una idea en algo que vivir.</Text>
          </View>

          <View style={styles.planBoard} accessible accessibilityLabel="Música, aire libre y gastronomía. Encuentra un plan a tu manera.">
            <View style={styles.boardTop}><Text style={styles.boardLabel}>A tu manera</Text><Ionicons name="sparkles-outline" size={20} color={color} /></View>
            <Text style={styles.boardTitle}>{'Un buen plan.\nBuena compañía.'}</Text>
            <View style={[styles.categories, compact && styles.categoriesCompact]}>
              {([['musical-notes-outline', 'Música'], ['leaf-outline', 'Aire libre'], ['restaurant-outline', 'Gastronomía']] as const).map(([icon, label]) => (
                <View key={label} style={styles.category}><Ionicons name={icon} size={18} color={color} /><Text style={styles.categoryText}>{label}</Text></View>
              ))}
            </View>
          </View>

          <View style={styles.actions}>
            <TouchableOpacity accessibilityRole="button" accessibilityHint="Abre los eventos sin crear una cuenta" onPress={() => router.replace('/(tabs)/discover')} style={styles.primary} activeOpacity={0.85}>
              <Text style={styles.primaryText}>Explorar eventos</Text><Ionicons name="arrow-forward" size={20} color={isDark ? '#21101A' : '#FFFFFF'} />
            </TouchableOpacity>
            <Text style={styles.reassurance}>Puedes explorar sin registrarte.</Text>
            <TouchableOpacity accessibilityRole="button" onPress={() => router.push('/(auth)/register')} style={styles.register}>
              <Text style={styles.registerText}>Crear una cuenta</Text>
            </TouchableOpacity>
          </View>

          <View style={[styles.moreActions, compact && styles.moreActionsCompact]}>
            <TouchableOpacity accessibilityRole="button" onPress={() => openPrivate('/create-event')} style={styles.secondary}>
              <Ionicons name="add-circle-outline" size={22} color={color} /><View style={styles.secondaryCopy}><Text style={styles.secondaryTitle}>Crear evento</Text><Text style={styles.secondaryHint}>Dale forma a tu idea</Text></View>
            </TouchableOpacity>
            <TouchableOpacity accessibilityRole="button" onPress={() => openPrivate('/tribes/discover')} style={styles.secondary}>
              <Ionicons name="people-outline" size={22} color={color} /><View style={styles.secondaryCopy}><Text style={styles.secondaryTitle}>Encontrar mi tribu</Text><Text style={styles.secondaryHint}>Conecta por intereses</Text></View>
            </TouchableOpacity>
          </View>
          <Text style={styles.communityNote}>Tribus, planes compartidos y logros: tus experiencias siguen contigo.</Text>
          <View style={styles.legalLinks}>
            <TouchableOpacity accessibilityRole="link" onPress={() => router.push('/legal/terms')} style={styles.legalLink}><Text style={styles.legalText}>Términos</Text></TouchableOpacity>
            <Text style={styles.legalText}>·</Text>
            <TouchableOpacity accessibilityRole="link" onPress={() => router.push('/legal/privacy')} style={styles.legalLink}><Text style={styles.legalText}>Privacidad</Text></TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (dark: boolean) => {
  const bg = dark ? '#111016' : '#FAF8F5';
  const text = dark ? '#FAF7FA' : '#241C24';
  const muted = dark ? '#C1B7C5' : '#6B5E69';
  const accent = dark ? '#F28BB6' : '#A91D56';
  return StyleSheet.create({
    page: { flex: 1, backgroundColor: bg },
    scroll: { flexGrow: 1, paddingHorizontal: 22, paddingBottom: 20 },
    content: { width: '100%', maxWidth: 520, alignSelf: 'center' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingVertical: 12 },
    brand: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 9 },
    brandIcon: { height: 36, width: 36, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: dark ? '#2A1B27' : '#F5E4EB' },
    wordmark: { flexShrink: 1, fontSize: 23, fontWeight: '800', color: text, letterSpacing: -0.8 },
    accent: { color: accent },
    headerLink: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 5, paddingLeft: 6 },
    linkText: { fontSize: 15, fontWeight: '600', color: accent },
    intro: { paddingTop: 24, paddingBottom: 24 },
    eyebrow: { fontSize: 13, fontWeight: '600', color: accent, marginBottom: 12, lineHeight: 20 },
    title: { fontSize: 39, lineHeight: 44, fontWeight: '800', color: text, letterSpacing: -1.4 },
    titleCompact: { fontSize: 33, lineHeight: 39 },
    description: { fontSize: 16, lineHeight: 25, color: muted, marginTop: 14, maxWidth: 410 },
    planBoard: { padding: 20, borderRadius: 24, backgroundColor: dark ? '#221B26' : '#F0E6EC', marginBottom: 26 },
    boardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
    boardLabel: { flex: 1, fontSize: 13, color: muted, fontWeight: '500' },
    boardTitle: { color: text, fontSize: 25, lineHeight: 32, fontWeight: '700', letterSpacing: -0.6, marginTop: 12 },
    categories: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, marginTop: 20 },
    categoriesCompact: { gap: 12 },
    category: { flexDirection: 'row', gap: 6, alignItems: 'center' },
    categoryText: { color: muted, fontSize: 12, fontWeight: '500' },
    actions: { gap: 10 },
    primary: { backgroundColor: accent, borderRadius: 16, paddingVertical: 17, paddingHorizontal: 20, minHeight: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 14 },
    primaryText: { flexShrink: 1, color: dark ? '#21101A' : '#FFFFFF', fontSize: 17, fontWeight: '700' },
    reassurance: { fontSize: 12, lineHeight: 18, textAlign: 'center', color: muted },
    register: { minHeight: 50, paddingVertical: 14, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: dark ? '#4A3D4C' : '#CEBDC9', borderRadius: 16, marginTop: 4 },
    registerText: { fontSize: 16, fontWeight: '600', color: text, textAlign: 'center' },
    moreActions: { flexDirection: 'row', gap: 16, marginTop: 28 },
    moreActionsCompact: { flexDirection: 'column', gap: 6 },
    secondary: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 9, minHeight: 58, paddingVertical: 8 },
    secondaryCopy: { flex: 1 },
    secondaryTitle: { color: text, fontSize: 13, lineHeight: 20, fontWeight: '600' },
    secondaryHint: { color: muted, fontSize: 11, lineHeight: 17, marginTop: 2 },
    communityNote: { color: muted, fontSize: 12, lineHeight: 20, marginTop: 14 },
    legalLinks: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', gap: 12, marginTop: 16 },
    legalLink: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 4 },
    legalText: { color: muted, fontSize: 12 },
  });
};
