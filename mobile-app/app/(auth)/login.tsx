/**
 * Login — EventNow 2.0
 * Dark Neon Urban · 100% coherente con HomeScreen
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Dimensions,
  Animated,
  Easing,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useAuth } from '../../src/contexts/AuthContext';

const { width, height } = Dimensions.get('window');

// ─── Exact same tokens as HomeScreen ─────────────────────────────────────────
const BG      = '#0C0B10';
const PINK    = '#ec4899';
const VIOLET  = '#8b5cf6';
const BLUE    = '#3b82f6';
const GLASS   = 'rgba(255,255,255,0.06)';
const BORDER  = 'rgba(255,255,255,0.08)';
const MUTED   = 'rgba(255,255,255,0.30)';
const SUBTLE  = 'rgba(255,255,255,0.50)';

// ─── Animated orb (same pattern as HomeScreen ambientOrb) ─────────────────────
const Orb = ({
  color, size, x, y, duration, delay,
}: {
  color: string; size: number; x: number; y: number;
  duration: number; delay: number;
}) => {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(anim, { toValue: 1, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    ).start();
  }, []);
  const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [0, -16] });
  return (
    <Animated.View style={[styles.orb, { width: size, height: size, borderRadius: size / 2, left: x, top: y, transform: [{ translateY }] }]}>
      <LinearGradient colors={[color + '30', 'transparent']} style={{ flex: 1, borderRadius: size / 2 }} />
    </Animated.View>
  );
};

// ─── Field component ──────────────────────────────────────────────────────────
const Field = ({
  icon, placeholder, value, onChange, keyboardType,
  autoCapitalize, secure, showToggle, onToggle, autoComplete,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  keyboardType?: any;
  autoCapitalize?: any;
  secure?: boolean;
  showToggle?: boolean;
  onToggle?: () => void;
  autoComplete?: any;
}) => {
  const [focused, setFocused] = useState(false);
  const borderAnim = useRef(new Animated.Value(0)).current;

  const handleFocus = () => {
    setFocused(true);
    Animated.timing(borderAnim, { toValue: 1, duration: 200, useNativeDriver: false }).start();
  };
  const handleBlur = () => {
    setFocused(false);
    Animated.timing(borderAnim, { toValue: 0, duration: 200, useNativeDriver: false }).start();
  };

  const borderColor = borderAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [BORDER, PINK],
  });
  const bgColor = borderAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [GLASS, 'rgba(236,72,153,0.08)'],
  });

  return (
    <Animated.View style={[styles.field, { borderColor, backgroundColor: bgColor }]}>
      <Ionicons name={icon} size={18} color={focused ? PINK : MUTED} style={styles.fieldIcon} />
      <TextInput
        style={styles.fieldInput}
        placeholder={placeholder}
        placeholderTextColor="rgba(255,255,255,0.20)"
        value={value}
        onChangeText={onChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize || 'none'}
        secureTextEntry={secure}
        autoComplete={autoComplete}
        autoCorrect={false}
      />
      {showToggle && (
        <TouchableOpacity onPress={onToggle} style={styles.eyeBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name={secure ? 'eye-outline' : 'eye-off-outline'} size={18} color={MUTED} />
        </TouchableOpacity>
      )}
    </Animated.View>
  );
};

// ─── Error banner ─────────────────────────────────────────────────────────────
const ErrorBanner = ({ message }: { message: string }) => (
  <View style={styles.errorBanner}>
    <Ionicons name="alert-circle" size={16} color="#f87171" />
    <Text style={styles.errorText}>{message}</Text>
  </View>
);

// ─── Main screen ──────────────────────────────────────────────────────────────
export default function LoginScreen() {
  const router = useRouter();
  const { login } = useAuth();

  const [email, setEmail]         = useState('');
  const [password, setPassword]   = useState('');
  const [showPass, setShowPass]   = useState(false);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');

  // Entrance animations
  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, duration: 800, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 700, easing: Easing.out(Easing.quad), useNativeDriver: true }),
    ]).start();
  }, []);

  const shake = () =>
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue:  10, duration: 55, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 55, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue:  7,  duration: 55, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -7,  duration: 55, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue:  0,  duration: 55, useNativeDriver: true }),
    ]).start();

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      setError('Completa todos los campos para continuar');
      shake();
      return;
    }
    setError('');
    setLoading(true);
    try {
      await login({ email: email.trim().toLowerCase(), password });
      router.replace('/(tabs)');
    } catch (e: any) {
      setError(e?.message || 'Credenciales incorrectas. Inténtalo de nuevo.');
      shake();
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.root}>
      <StatusBar style="light" />

      {/* Background */}
      <LinearGradient
        colors={[BG, '#140D24', BG]}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* Ambient orbs — same as HomeScreen */}
      <Orb color={PINK}   size={300} x={-80}         y={-60}          duration={4200} delay={0}    />
      <Orb color={VIOLET} size={260} x={width - 160} y={height * 0.28} duration={5200} delay={800} />
      <Orb color={BLUE}   size={180} x={30}           y={height * 0.62} duration={3800} delay={400} />

      <SafeAreaView style={{ flex: 1 }}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <ScrollView
            contentContainerStyle={styles.scroll}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <Animated.View
              style={[
                styles.content,
                {
                  opacity: fadeAnim,
                  transform: [{ translateY: slideAnim }],
                },
              ]}
            >

              {/* ── Back button ─────────────────────────────────────────── */}
              <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
                <View style={styles.backBtnInner}>
                  <Ionicons name="chevron-back" size={22} color="#fff" />
                </View>
              </TouchableOpacity>

              {/* ── Logo / Brand ─────────────────────────────────────────── */}
              <View style={styles.brand}>
                <View style={styles.logoWrap}>
                  <LinearGradient
                    colors={[PINK, VIOLET]}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                    style={styles.logoGradient}
                  >
                    <Ionicons name="flash" size={34} color="#fff" />
                  </LinearGradient>
                </View>
                <Text style={styles.appName}>EventNow</Text>
                <Text style={styles.appTagline}>Tu próxima experiencia te espera</Text>
              </View>

              {/* ── Card ─────────────────────────────────────────────────── */}
              <Animated.View style={[styles.card, { transform: [{ translateX: shakeAnim }] }]}>
                <LinearGradient
                  colors={['rgba(255,255,255,0.07)', 'rgba(255,255,255,0.02)']}
                  style={styles.cardInner}
                >
                  <Text style={styles.cardTitle}>Iniciar sesión</Text>

                  {error ? <ErrorBanner message={error} /> : null}

                  <Field
                    icon="mail-outline"
                    placeholder="Correo electrónico"
                    value={email}
                    onChange={setEmail}
                    keyboardType="email-address"
                    autoComplete="email"
                  />

                  <View style={{ height: 12 }} />

                  <Field
                    icon="lock-closed-outline"
                    placeholder="Contraseña"
                    value={password}
                    onChange={setPassword}
                    secure={!showPass}
                    showToggle
                    onToggle={() => setShowPass(p => !p)}
                    autoComplete="password"
                  />

                  <TouchableOpacity
                    style={styles.forgotBtn}
                    onPress={() => router.push('/(auth)/forgot-password')}
                  >
                    <Text style={styles.forgotText}>¿Olvidaste tu contraseña?</Text>
                  </TouchableOpacity>

                  {/* CTA */}
                  <TouchableOpacity
                    onPress={handleLogin}
                    disabled={loading}
                    activeOpacity={0.85}
                    style={[styles.ctaWrap, loading && { opacity: 0.7 }]}
                  >
                    <LinearGradient
                      colors={loading ? ['#374151', '#374151'] : [PINK, VIOLET]}
                      start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                      style={styles.cta}
                    >
                      {loading ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <Text style={styles.ctaText}>Entrar</Text>
                      )}
                    </LinearGradient>
                  </TouchableOpacity>

                  {/* Divider */}
                  <View style={styles.divider}>
                    <View style={styles.divLine} />
                    <Text style={styles.divText}>o continúa con</Text>
                    <View style={styles.divLine} />
                  </View>

                  {/* Social */}
                  <View style={styles.socialRow}>
                    {[
                      { icon: 'logo-google' as const, label: 'Google' },
                      { icon: 'logo-apple'  as const, label: 'Apple'  },
                    ].map(({ icon, label }) => (
                      <TouchableOpacity key={label} style={styles.socialBtn} activeOpacity={0.75}>
                        <Ionicons name={icon} size={20} color="rgba(255,255,255,0.75)" />
                        <Text style={styles.socialLabel}>{label}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </LinearGradient>
              </Animated.View>

              {/* ── Footer ───────────────────────────────────────────────── */}
              <View style={styles.footer}>
                <Text style={styles.footerText}>¿No tienes cuenta?</Text>
                <TouchableOpacity onPress={() => router.push('/(auth)/register')}>
                  <LinearGradient
                    colors={[PINK, VIOLET]}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                    style={styles.footerGrad}
                  >
                    <Text style={styles.footerLink}>Regístrate gratis</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>

            </Animated.View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },

  orb: { position: 'absolute' },

  scroll: { flexGrow: 1 },

  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingVertical: 20,
    justifyContent: 'center',
    minHeight: height - 40,
  },

  // Back
  backBtn: { position: 'absolute', top: 20, left: 24, zIndex: 10 },
  backBtnInner: {
    width: 42, height: 42, borderRadius: 13,
    backgroundColor: GLASS,
    borderWidth: 1, borderColor: BORDER,
    alignItems: 'center', justifyContent: 'center',
  },

  // Brand
  brand: { alignItems: 'center', marginBottom: 36, marginTop: 56 },
  logoWrap: {
    borderRadius: 24, padding: 3,
    borderWidth: 1, borderColor: 'rgba(236,72,153,0.4)',
    marginBottom: 16,
    shadowColor: PINK,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.55, shadowRadius: 24, elevation: 12,
  },
  logoGradient: {
    width: 76, height: 76, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center',
  },
  appName: { fontSize: 30, fontWeight: '800', color: '#fff', letterSpacing: -0.8 },
  appTagline: { fontSize: 14, color: SUBTLE, marginTop: 6 },

  // Card
  card: {
    borderRadius: 24, overflow: 'hidden',
    borderWidth: 1, borderColor: BORDER,
  },
  cardInner: { padding: 24 },
  cardTitle: {
    fontSize: 22, fontWeight: '700', color: '#fff',
    textAlign: 'center', marginBottom: 20, letterSpacing: -0.3,
  },

  // Error
  errorBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(248,113,113,0.10)',
    borderRadius: 12, padding: 12, marginBottom: 16,
    borderWidth: 1, borderColor: 'rgba(248,113,113,0.20)',
  },
  errorText: { color: '#f87171', fontSize: 13, flex: 1, lineHeight: 18 },

  // Field
  field: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 14, borderWidth: 1,
    paddingHorizontal: 16, height: 52,
  },
  fieldIcon: { marginRight: 12 },
  fieldInput: { flex: 1, fontSize: 15, color: '#fff' },
  eyeBtn: { padding: 4 },

  // Forgot
  forgotBtn: { alignSelf: 'flex-end', marginTop: 10, marginBottom: 20 },
  forgotText: { fontSize: 13, color: MUTED },

  // CTA
  ctaWrap: {
    borderRadius: 14, overflow: 'hidden',
    shadowColor: PINK,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45, shadowRadius: 20, elevation: 10,
  },
  cta: { height: 52, justifyContent: 'center', alignItems: 'center' },
  ctaText: { fontSize: 16, fontWeight: '700', color: '#fff', letterSpacing: 0.3 },

  // Divider
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 20, gap: 10 },
  divLine: { flex: 1, height: 1, backgroundColor: BORDER },
  divText: { fontSize: 12, color: MUTED },

  // Social
  socialRow: { flexDirection: 'row', gap: 12 },
  socialBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 8,
    height: 48, borderRadius: 14,
    backgroundColor: GLASS,
    borderWidth: 1, borderColor: BORDER,
  },
  socialLabel: { fontSize: 14, color: 'rgba(255,255,255,0.70)', fontWeight: '500' },

  // Footer
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 28, gap: 6 },
  footerText: { fontSize: 15, color: SUBTLE },
  footerGrad: { borderRadius: 6, paddingHorizontal: 2, paddingVertical: 1 },
  footerLink: { fontSize: 15, fontWeight: '700', color: '#fff' },
});
