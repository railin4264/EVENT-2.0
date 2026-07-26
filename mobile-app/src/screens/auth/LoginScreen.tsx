import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, Animated, Dimensions,
  StatusBar, ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

const { width, height } = Dimensions.get('window');

const ORB = { primary: '#ec4899', secondary: '#8b5cf6', accent: '#3b82f6' };

export default function LoginScreen() {
  const router = useRouter();
  const { login, isLoading } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [error, setError] = useState('');

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;
  const orb1Anim = useRef(new Animated.Value(0)).current;
  const orb2Anim = useRef(new Animated.Value(0)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 700, useNativeDriver: true }),
    ]).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(orb1Anim, { toValue: 1, duration: 4000, useNativeDriver: true }),
        Animated.timing(orb1Anim, { toValue: 0, duration: 4000, useNativeDriver: true }),
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(orb2Anim, { toValue: 1, duration: 5500, useNativeDriver: true }),
        Animated.timing(orb2Anim, { toValue: 0, duration: 5500, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const shake = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 60, useNativeDriver: true }),
    ]).start();
  };

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      setError('Por favor completa todos los campos');
      shake();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }
    setError('');
    try {
      await login({ email: email.trim(), password });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e: any) {
      setError(e?.message || 'Credenciales inválidas');
      shake();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  const orb1Y = orb1Anim.interpolate({ inputRange: [0, 1], outputRange: [0, -20] });
  const orb2Y = orb2Anim.interpolate({ inputRange: [0, 1], outputRange: [0, 15] });

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#0C0B10" />

      {/* Animated background orbs */}
      <Animated.View style={[styles.orb1, { transform: [{ translateY: orb1Y }] }]}>
        <LinearGradient colors={[ORB.primary + '60', 'transparent']} style={styles.orbGradient} />
      </Animated.View>
      <Animated.View style={[styles.orb2, { transform: [{ translateY: orb2Y }] }]}>
        <LinearGradient colors={[ORB.secondary + '50', 'transparent']} style={styles.orbGradient} />
      </Animated.View>
      <View style={styles.orb3}>
        <LinearGradient colors={[ORB.accent + '40', 'transparent']} style={styles.orbGradient} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <SafeAreaView style={{ flex: 1 }}>
          <Animated.View style={[styles.content, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>

            {/* Logo / Brand */}
            <View style={styles.brandSection}>
              <LinearGradient
                colors={[ORB.primary, ORB.secondary]}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                style={styles.logoGradient}
              >
                <Ionicons name="flash" size={34} color="#fff" />
              </LinearGradient>
              <Text style={styles.brandName}>EventNow</Text>
              <Text style={styles.tagline}>Tu próxima experiencia te espera</Text>
            </View>

            {/* Card */}
            <Animated.View style={[styles.card, { transform: [{ translateX: shakeAnim }] }]}>
              <LinearGradient
                colors={['rgba(255,255,255,0.07)', 'rgba(255,255,255,0.03)']}
                style={styles.cardGradient}
              >
                <Text style={styles.cardTitle}>Iniciar sesión</Text>

                {error ? (
                  <View style={styles.errorBox}>
                    <Ionicons name="alert-circle" size={16} color="#f87171" />
                    <Text style={styles.errorText}>{error}</Text>
                  </View>
                ) : null}

                {/* Email field */}
                <View style={[styles.fieldWrapper, focusedField === 'email' && styles.fieldFocused]}>
                  <Ionicons name="mail-outline" size={20} color={focusedField === 'email' ? ORB.primary : '#6b7280'} style={styles.fieldIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Email"
                    placeholderTextColor="#4b5563"
                    value={email}
                    onChangeText={setEmail}
                    onFocus={() => setFocusedField('email')}
                    onBlur={() => setFocusedField(null)}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    returnKeyType="next"
                  />
                </View>

                {/* Password field */}
                <View style={[styles.fieldWrapper, focusedField === 'pass' && styles.fieldFocused, { marginTop: 12 }]}>
                  <Ionicons name="lock-closed-outline" size={20} color={focusedField === 'pass' ? ORB.primary : '#6b7280'} style={styles.fieldIcon} />
                  <TextInput
                    style={[styles.input, { flex: 1 }]}
                    placeholder="Contraseña"
                    placeholderTextColor="#4b5563"
                    value={password}
                    onChangeText={setPassword}
                    onFocus={() => setFocusedField('pass')}
                    onBlur={() => setFocusedField(null)}
                    secureTextEntry={!showPass}
                    autoCapitalize="none"
                    returnKeyType="done"
                    onSubmitEditing={handleLogin}
                  />
                  <TouchableOpacity onPress={() => setShowPass(!showPass)} style={styles.eyeBtn}>
                    <Ionicons name={showPass ? 'eye-off-outline' : 'eye-outline'} size={20} color="#6b7280" />
                  </TouchableOpacity>
                </View>

                <TouchableOpacity style={styles.forgotBtn} onPress={() => {}}>
                  <Text style={styles.forgotText}>¿Olvidaste tu contraseña?</Text>
                </TouchableOpacity>

                {/* Login button */}
                <TouchableOpacity
                  onPress={handleLogin}
                  disabled={isLoading}
                  activeOpacity={0.85}
                  style={styles.loginBtnWrapper}
                >
                  <LinearGradient
                    colors={isLoading ? ['#374151', '#374151'] : [ORB.primary, ORB.secondary]}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                    style={styles.loginBtn}
                  >
                    {isLoading
                      ? <ActivityIndicator size="small" color="#fff" />
                      : <Text style={styles.loginBtnText}>Entrar</Text>
                    }
                  </LinearGradient>
                </TouchableOpacity>

                {/* Divider */}
                <View style={styles.divider}>
                  <View style={styles.dividerLine} />
                  <Text style={styles.dividerText}>o</Text>
                  <View style={styles.dividerLine} />
                </View>

                {/* Social login hints */}
                <View style={styles.socialRow}>
                  {(['logo-google', 'logo-apple', 'logo-facebook'] as const).map((icon, i) => (
                    <TouchableOpacity key={i} style={styles.socialBtn} activeOpacity={0.7}>
                      <Ionicons name={icon as any} size={22} color="#d1d5db" />
                    </TouchableOpacity>
                  ))}
                </View>
              </LinearGradient>
            </Animated.View>

            {/* Footer */}
            <View style={styles.footer}>
              <Text style={styles.footerText}>¿No tienes cuenta? </Text>
              <TouchableOpacity onPress={() => router.push('/(auth)/register')}>
                <LinearGradient
                  colors={[ORB.primary, ORB.secondary]}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                  style={styles.registerGradientText}
                >
                  <Text style={styles.registerLink}>Regístrate gratis</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>

          </Animated.View>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0C0B10' },

  orb1: { position: 'absolute', top: -80, left: -60, width: 280, height: 280, borderRadius: 140 },
  orb2: { position: 'absolute', top: height * 0.3, right: -80, width: 240, height: 240, borderRadius: 120 },
  orb3: { position: 'absolute', bottom: 60, left: 40, width: 180, height: 180, borderRadius: 90 },
  orbGradient: { flex: 1, borderRadius: 140 },

  content: { flex: 1, justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 20 },

  brandSection: { alignItems: 'center', marginBottom: 36 },
  logoGradient: {
    width: 72, height: 72, borderRadius: 22,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#ec4899', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5, shadowRadius: 20, elevation: 10,
  },
  brandName: { fontSize: 30, fontWeight: '800', color: '#fff', letterSpacing: -0.5 },
  tagline: { fontSize: 14, color: 'rgba(255,255,255,0.5)', marginTop: 6 },

  card: {
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  cardGradient: { padding: 24 },
  cardTitle: { fontSize: 22, fontWeight: '700', color: '#fff', marginBottom: 20, textAlign: 'center' },

  errorBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(248,113,113,0.1)', borderRadius: 12,
    padding: 12, marginBottom: 16,
    borderWidth: 1, borderColor: 'rgba(248,113,113,0.2)',
  },
  errorText: { color: '#f87171', fontSize: 13, flex: 1 },

  fieldWrapper: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 16, height: 52,
  },
  fieldFocused: {
    borderColor: '#ec4899',
    backgroundColor: 'rgba(236,72,153,0.06)',
  },
  fieldIcon: { marginRight: 12 },
  input: { flex: 1, fontSize: 15, color: '#fff' },
  eyeBtn: { padding: 4 },

  forgotBtn: { alignSelf: 'flex-end', marginTop: 10, marginBottom: 20 },
  forgotText: { fontSize: 13, color: 'rgba(255,255,255,0.4)' },

  loginBtnWrapper: { borderRadius: 14, overflow: 'hidden' },
  loginBtn: { height: 52, justifyContent: 'center', alignItems: 'center', borderRadius: 14 },
  loginBtnText: { color: '#fff', fontSize: 16, fontWeight: '700', letterSpacing: 0.3 },

  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 20, gap: 12 },
  dividerLine: { flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.08)' },
  dividerText: { color: 'rgba(255,255,255,0.3)', fontSize: 13 },

  socialRow: { flexDirection: 'row', justifyContent: 'center', gap: 16 },
  socialBtn: {
    width: 52, height: 52, borderRadius: 14, justifyContent: 'center', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },

  footer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 28 },
  footerText: { fontSize: 15, color: 'rgba(255,255,255,0.5)' },
  registerGradientText: { borderRadius: 4, paddingHorizontal: 2 },
  registerLink: { fontSize: 15, fontWeight: '700', color: '#fff' },
});
