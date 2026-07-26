import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  SafeAreaView,
  Dimensions,
  Animated,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';

const { width, height } = Dimensions.get('window');

// Componente de Avatar para Social Proof
const Avatar = ({ letter, delay }: { letter: string; delay: number }) => {
  const animValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(animValue, {
      toValue: 1,
      delay,
      friction: 8,
      tension: 40,
      useNativeDriver: true,
    }).start();
  }, []);

  return (
    <Animated.View style={[styles.avatar, { transform: [{ scale: animValue }] }]}>
      <LinearGradient
        colors={['#a855f7', '#3b82f6', '#10b981']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.avatarGradient}
      >
        <Text style={styles.avatarText}>{letter}</Text>
      </LinearGradient>
    </Animated.View>
  );
};

// Componente de Feature Pill
const FeaturePill = ({ icon, label, delay }: { icon: string; label: string; delay: number }) => {
  const animValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(animValue, {
      toValue: 1,
      delay,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, []);

  return (
    <Animated.View
      style={[
        styles.featurePillCard,
        {
          opacity: animValue,
          transform: [{ translateY: animValue.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }],
        },
      ]}
    >
      <View style={styles.featurePillContent}>
        <Text style={styles.featurePillIcon}>{icon}</Text>
        <Text style={styles.featurePillLabel}>{label}</Text>
      </View>
    </Animated.View>
  );
};

export default function WelcomeScreen() {
  const router = useRouter();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideUpAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const floatAnim = useRef(new Animated.Value(0)).current;

  // Partículas animadas
  const particle1 = useRef(new Animated.Value(0)).current;
  const particle2 = useRef(new Animated.Value(0)).current;
  const particle3 = useRef(new Animated.Value(0)).current;
  const particle4 = useRef(new Animated.Value(0)).current;
  const particle5 = useRef(new Animated.Value(0)).current;

  // Features
  const features = [
    { icon: '🎮', label: 'Sistema de Niveles' },
    { icon: '🏆', label: 'Achievements' },
    { icon: '🔥', label: 'Tribus Sociales' },
    { icon: '📊', label: 'Dashboard Personal' },
    { icon: '🎯', label: 'Eventos IA' },
    { icon: '💬', label: 'Chat en vivo' },
  ];

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.timing(slideUpAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, friction: 8, tension: 40, useNativeDriver: true }),
    ]).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, { toValue: -10, duration: 2000, useNativeDriver: true }),
        Animated.timing(floatAnim, { toValue: 0, duration: 2000, useNativeDriver: true }),
      ])
    ).start();

    // Animaciones de partículas
    Animated.loop(
      Animated.sequence([
        Animated.timing(particle1, { toValue: -15, duration: 3000, useNativeDriver: true }),
        Animated.timing(particle1, { toValue: 0, duration: 3000, useNativeDriver: true }),
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(particle2, { toValue: -20, duration: 4000, useNativeDriver: true }),
        Animated.timing(particle2, { toValue: 0, duration: 4000, useNativeDriver: true }),
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(particle3, { toValue: -12, duration: 3500, useNativeDriver: true }),
        Animated.timing(particle3, { toValue: 0, duration: 3500, useNativeDriver: true }),
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(particle4, { toValue: -18, duration: 4500, useNativeDriver: true }),
        Animated.timing(particle4, { toValue: 0, duration: 4500, useNativeDriver: true }),
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(particle5, { toValue: -10, duration: 2500, useNativeDriver: true }),
        Animated.timing(particle5, { toValue: 0, duration: 2500, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} bounces={false}>
        <LinearGradient colors={['#0f172a', '#5b21b6', '#0f172a']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.gradient}>
          <View style={styles.backgroundShapes}>
            <Animated.View style={[styles.blob1, { transform: [{ translateY: particle1 }], opacity: 0.3 }]} />
            <Animated.View style={[styles.blob2, { transform: [{ translateY: particle2 }], opacity: 0.3 }]} />
            <Animated.View style={[styles.blob3, { transform: [{ translateY: particle3 }], opacity: 0.3 }]} />
            {[particle1, particle2, particle3, particle4, particle5].map((p, i) => (
              <Animated.View key={i} style={[styles.particle, { left: `${20 + i * 15}%`, top: `${15 + i * 12}%`, transform: [{ translateY: p }], opacity: 0.6 }]}>
                <LinearGradient colors={['#06b6d4', '#a855f7', '#10b981']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.particleGradient} />
              </Animated.View>
            ))}
          </View>
          <View style={styles.content}>
            <Animated.View style={[styles.topBadge, { opacity: fadeAnim, transform: [{ translateY: slideUpAnim }] }]}>
              <LinearGradient colors={['rgba(59, 130, 246, 0.1)', 'rgba(168, 85, 247, 0.1)']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.badgeGradient}>
                <Text style={styles.badgeEmoji}>🎉</Text>
                <Text style={styles.badgeText}><Text style={styles.badgeHighlight}>+10,000</Text> personas descubriendo eventos hoy</Text>
              </LinearGradient>
            </Animated.View>
            <Animated.View style={[styles.logoContainer, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
              <View style={styles.logoWrapper}>
                <LinearGradient colors={['#3b82f6', '#8b5cf6', '#06b6d4']} style={styles.logoGradient}>
                  <Image source={require('../../assets/icon.png')} style={styles.logo} resizeMode="contain" />
                </LinearGradient>
              </View>
            </Animated.View>
            <Animated.View style={[styles.headlineContainer, { opacity: fadeAnim, transform: [{ translateY: slideUpAnim }] }]}>
              <Text style={styles.headline}>Descubre. Conecta. Crece.</Text>
              <Text style={styles.subheadline}>Tu comunidad de eventos y experiencias.</Text>
            </Animated.View>
            <Animated.View style={[styles.subtitleContainer, { opacity: fadeAnim }]}>
              <Text style={styles.subtitle}>Más que eventos: una comunidad donde cada experiencia cuenta. Sube de nivel, desbloquea achievements y conoce personas que vibran como tú.</Text>
            </Animated.View>
            <Animated.View style={[styles.featuresScrollContainer, { opacity: fadeAnim }]}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.featuresScroll}>
                {features.map((feature, index) => (
                  <FeaturePill key={index} icon={feature.icon} label={feature.label} delay={800 + index * 100} />
                ))}
              </ScrollView>
            </Animated.View>
            <Animated.View style={[styles.ctaContainer, { opacity: fadeAnim }]}>
              <TouchableOpacity style={styles.primaryCTA} onPress={() => router.push('/(auth)/register')} activeOpacity={0.85}>
                <LinearGradient colors={['#8b5cf6', '#06b6d4', '#10b981']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.primaryCTAGradient}>
                  <Text style={styles.primaryCTAIcon}>🎟️</Text>
                  <Text style={styles.primaryCTAText}>Explorar Eventos</Text>
                </LinearGradient>
              </TouchableOpacity>
              <TouchableOpacity style={styles.secondaryCTA} onPress={() => router.push('/(auth)/login')} activeOpacity={0.85}>
                <LinearGradient colors={['rgba(59, 130, 246, 0.1)', 'rgba(168, 85, 247, 0.1)']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.secondaryCTAGradient}>
                  <Text style={styles.secondaryCTAIcon}>➕</Text>
                  <Text style={styles.secondaryCTAText}>Crear Evento</Text>
                </LinearGradient>
              </TouchableOpacity>
              <TouchableOpacity style={styles.tertiaryCTA} onPress={() => router.push('/(auth)/login')} activeOpacity={0.85}>
                <View style={styles.tertiaryCTAContent}>
                  <Text style={styles.tertiaryCTAIcon}>🔥</Text>
                  <Text style={styles.tertiaryCTAText}>Unirme a una Tribu</Text>
                </View>
              </TouchableOpacity>
            </Animated.View>
            <Animated.View style={[styles.socialProofContainer, { opacity: fadeAnim }]}>
              <View style={styles.avatarStack}>
                <Avatar letter="M" delay={900} />
                <Avatar letter="J" delay={950} />
                <Avatar letter="S" delay={1000} />
                <Avatar letter="A" delay={1050} />
                <Avatar letter="L" delay={1100} />
                <View style={styles.avatarCountBadge}>
                  <LinearGradient colors={['#8b5cf6', '#06b6d4']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.avatarCountGradient}>
                    <Text style={styles.avatarCountText}>+3K</Text>
                  </LinearGradient>
                </View>
              </View>
              <Text style={styles.socialProofText}><Text style={styles.socialProofHighlight}>10,000+ personas</Text> ya forman parte de la comunidad</Text>
              <View style={styles.statsGrid}>
                <View style={styles.statItem}>
                  <LinearGradient colors={['#8b5cf6', '#06b6d4']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.statGradient}>
                    <Text style={styles.statNumber}>500+</Text>
                  </LinearGradient>
                  <Text style={styles.statLabel}>Eventos/mes</Text>
                </View>
                <View style={styles.statItem}>
                  <LinearGradient colors={['#10b981', '#fbbf24']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.statGradient}>
                    <Text style={styles.statNumber}>15K+</Text>
                  </LinearGradient>
                  <Text style={styles.statLabel}>Usuarios activos</Text>
                </View>
                <View style={styles.statItem}>
                  <LinearGradient colors={['#ec4899', '#ef4444']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.statGradient}>
                    <Text style={styles.statNumber}>50+</Text>
                  </LinearGradient>
                  <Text style={styles.statLabel}>Tribus</Text>
                </View>
              </View>
            </Animated.View>
            <Animated.View style={[styles.footer, { opacity: fadeAnim }]}>
              <Text style={styles.footerText}>Al continuar, aceptas nuestros <Text style={styles.footerLink}>Términos</Text> y <Text style={styles.footerLink}>Privacidad</Text></Text>
            </Animated.View>
          </View>
        </LinearGradient>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  scrollContent: { flexGrow: 1, minHeight: height },
  gradient: { flex: 1, minHeight: height },
  backgroundShapes: { position: 'absolute', width: '100%', height: '100%' },
  blob1: { position: 'absolute', top: '5%', left: '20%', width: 300, height: 300, borderRadius: 150, backgroundColor: '#06b6d4' },
  blob2: { position: 'absolute', top: '10%', right: '15%', width: 250, height: 250, borderRadius: 125, backgroundColor: '#a855f7' },
  blob3: { position: 'absolute', bottom: '15%', left: '40%', width: 280, height: 280, borderRadius: 140, backgroundColor: '#10b981' },
  particle: { position: 'absolute', width: 8, height: 8, borderRadius: 4 },
  particleGradient: { width: '100%', height: '100%', borderRadius: 4 },
  content: { flex: 1, paddingHorizontal: 24, paddingTop: height * 0.06, paddingBottom: 40, justifyContent: 'space-between' },
  topBadge: { alignSelf: 'center', marginBottom: 20 },
  badgeGradient: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 24, borderWidth: 1, borderColor: 'rgba(59, 130, 246, 0.3)' },
  badgeEmoji: { fontSize: 16 },
  badgeText: { color: '#cbd5e1', fontSize: 13, fontWeight: '500' },
  badgeHighlight: { color: '#60a5fa', fontWeight: '700' },
  logoContainer: { alignItems: 'center', marginVertical: 30 },
  logoWrapper: { borderRadius: 35, padding: 5, shadowColor: '#3b82f6', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.5, shadowRadius: 24, elevation: 10 },
  logoGradient: { borderRadius: 30, padding: 24 },
  logo: { width: 90, height: 90 },
  headlineContainer: { alignItems: 'center', marginBottom: 16 },
  headline: { fontSize: 36, fontWeight: '800', color: '#ffffff', textAlign: 'center', lineHeight: 44, marginBottom: 8 },
  subheadline: { fontSize: 18, fontWeight: '600', color: '#60a5fa', textAlign: 'center' },
  subtitleContainer: { paddingHorizontal: 12, marginBottom: 24 },
  subtitle: { fontSize: 15, color: '#94a3b8', textAlign: 'center', lineHeight: 24, fontWeight: '400' },
  featuresScrollContainer: { marginBottom: 32 },
  featuresScroll: { paddingHorizontal: 4, gap: 12 },
  featurePillCard: { marginHorizontal: 4 },
  featurePillContent: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(59, 130, 246, 0.1)', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.15)' },
  featurePillIcon: { fontSize: 18 },
  featurePillLabel: { color: '#e0e7ff', fontSize: 13, fontWeight: '600' },
  ctaContainer: { gap: 14, marginBottom: 32 },
  primaryCTA: { borderRadius: 20, overflow: 'hidden', shadowColor: '#8b5cf6', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.6, shadowRadius: 24, elevation: 12 },
  primaryCTAGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 18, gap: 10 },
  primaryCTAIcon: { fontSize: 20 },
  primaryCTAText: { color: '#ffffff', fontSize: 17, fontWeight: '700' },
  secondaryCTA: { borderRadius: 20, overflow: 'hidden', borderWidth: 1.5, borderColor: 'rgba(148, 163, 184, 0.3)' },
  secondaryCTAGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 18, gap: 10 },
  secondaryCTAIcon: { fontSize: 18 },
  secondaryCTAText: { color: '#e2e8f0', fontSize: 16, fontWeight: '600' },
  tertiaryCTA: { borderRadius: 20, borderWidth: 1.5, borderColor: 'rgba(168, 85, 247, 0.4)', overflow: 'hidden' },
  tertiaryCTAContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, gap: 10 },
  tertiaryCTAIcon: { fontSize: 18 },
  tertiaryCTAText: { color: '#c4b5fd', fontSize: 15, fontWeight: '600' },
  socialProofContainer: { alignItems: 'center', marginBottom: 24, gap: 20 },
  avatarStack: { flexDirection: 'row', alignItems: 'center', marginLeft: 20 },
  avatar: { width: 48, height: 48, borderRadius: 24, marginLeft: -20, borderWidth: 3, borderColor: '#0f172a' },
  avatarGradient: { width: '100%', height: '100%', borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#ffffff', fontSize: 18, fontWeight: '700' },
  avatarCountBadge: { width: 48, height: 48, borderRadius: 24, marginLeft: -20, borderWidth: 3, borderColor: '#0f172a' },
  avatarCountGradient: { width: '100%', height: '100%', borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  avatarCountText: { color: '#ffffff', fontSize: 13, fontWeight: '700' },
  socialProofText: { fontSize: 13, color: '#64748b', textAlign: 'center' },
  socialProofHighlight: { color: '#60a5fa', fontWeight: '700' },
  statsGrid: { flexDirection: 'row', gap: 16, marginTop: 8 },
  statItem: { alignItems: 'center', gap: 8 },
  statGradient: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12 },
  statNumber: { fontSize: 24, fontWeight: '700', color: '#ffffff' },
  statLabel: { fontSize: 11, color: '#64748b', fontWeight: '500' },
  footer: { alignItems: 'center', paddingHorizontal: 20, marginTop: 16 },
  footerText: { fontSize: 12, color: '#64748b', textAlign: 'center', lineHeight: 18 },
  footerLink: { color: '#60a5fa', fontWeight: '600' },
});
