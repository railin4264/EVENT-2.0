import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, Animated, Dimensions,
  StatusBar, ActivityIndicator, ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

const { width } = Dimensions.get('window');
const PINK = '#ec4899';
const VIOLET = '#8b5cf6';
const BLUE = '#3b82f6';

const STEPS = [
  { label: 'Cuenta', icon: 'person-outline' },
  { label: 'Acceso', icon: 'lock-closed-outline' },
  { label: 'Perfil', icon: 'sparkles-outline' },
];

export default function RegisterScreen() {
  const router = useRouter();
  const { register: registerUser, isLoading } = useAuth();

  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    firstName: '', lastName: '', username: '',
    email: '', password: '', confirmPassword: '',
    birthDate: '', acceptTerms: false,
  });
  const [showPass, setShowPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [error, setError] = useState('');

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
    ]).start();
  }, []);

  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: (step + 1) / STEPS.length,
      duration: 400,
      useNativeDriver: false,
    }).start();
  }, [step]);

  const update = (key: keyof typeof form, val: any) =>
    setForm(prev => ({ ...prev, [key]: val }));

  const validateStep = () => {
    if (step === 0) {
      if (!form.firstName.trim()) return 'El nombre es requerido';
      if (!form.lastName.trim()) return 'El apellido es requerido';
      if (!form.username.trim() || form.username.length < 3) return 'El usuario debe tener al menos 3 caracteres';
    }
    if (step === 1) {
      if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return 'Email inválido';
      if (form.password.length < 8) return 'La contraseña debe tener al menos 8 caracteres';
      if (form.password !== form.confirmPassword) return 'Las contraseñas no coinciden';
    }
    if (step === 2) {
      if (!form.birthDate) return 'La fecha de nacimiento es requerida';
      if (!form.acceptTerms) return 'Debes aceptar los términos';
    }
    return null;
  };

  const handleNext = async () => {
    const err = validateStep();
    if (err) {
      setError(err);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }
    setError('');

    if (step < STEPS.length - 1) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setStep(s => s + 1);
      return;
    }

    try {
      await registerUser({
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        username: form.username.trim(),
        email: form.email.trim().toLowerCase(),
        password: form.password,
        confirmPassword: form.confirmPassword,
        birthDate: form.birthDate,
        acceptTerms: true,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e: any) {
      setError(e?.message || 'Error al crear la cuenta');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  const field = (
    key: keyof typeof form,
    placeholder: string,
    icon: string,
    opts: {
      secure?: boolean; showToggle?: boolean; onToggle?: () => void;
      keyboard?: any; autoCapitalize?: any; hint?: string;
    } = {}
  ) => (
    <View style={{ marginBottom: 12 }}>
      {opts.hint && <Text style={styles.fieldHint}>{opts.hint}</Text>}
      <View style={[styles.fieldWrapper, focusedField === key && styles.fieldFocused]}>
        <Ionicons name={icon as any} size={20} color={focusedField === key ? PINK : '#6b7280'} style={styles.fieldIcon} />
        <TextInput
          style={[styles.input, opts.showToggle && { flex: 1 }]}
          placeholder={placeholder}
          placeholderTextColor="#4b5563"
          value={form[key] as string}
          onChangeText={v => update(key, v)}
          onFocus={() => setFocusedField(key)}
          onBlur={() => setFocusedField(null)}
          secureTextEntry={opts.secure}
          keyboardType={opts.keyboard || 'default'}
          autoCapitalize={opts.autoCapitalize || 'sentences'}
          autoCorrect={false}
        />
        {opts.showToggle && (
          <TouchableOpacity onPress={opts.onToggle} style={styles.eyeBtn}>
            <Ionicons name={(opts.secure ? 'eye-outline' : 'eye-off-outline') as any} size={20} color="#6b7280" />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1], outputRange: ['0%', '100%'],
  });

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />

      {/* Background orbs */}
      <View style={[styles.orb, { top: -60, right: -60, width: 240, height: 240 }]}>
        <LinearGradient colors={[VIOLET + '50', 'transparent']} style={{ flex: 1, borderRadius: 120 }} />
      </View>
      <View style={[styles.orb, { bottom: 40, left: -40, width: 200, height: 200 }]}>
        <LinearGradient colors={[PINK + '40', 'transparent']} style={{ flex: 1, borderRadius: 100 }} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <SafeAreaView style={{ flex: 1 }}>
          <Animated.View style={[{ flex: 1 }, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>

            {/* Header */}
            <View style={styles.header}>
              <TouchableOpacity
                onPress={() => step > 0 ? setStep(s => s - 1) : router.back()}
                style={styles.backBtn}
              >
                <Ionicons name="chevron-back" size={24} color="#fff" />
              </TouchableOpacity>
              <View style={{ flex: 1 }}>
                <Text style={styles.headerTitle}>Crear cuenta</Text>
                <Text style={styles.headerSub}>Paso {step + 1} de {STEPS.length}</Text>
              </View>
              <LinearGradient colors={[PINK, VIOLET]} style={styles.headerBadge}>
                <Ionicons name={STEPS[step].icon as any} size={18} color="#fff" />
              </LinearGradient>
            </View>

            {/* Progress bar */}
            <View style={styles.progressTrack}>
              <Animated.View style={[styles.progressFill, { width: progressWidth }]}>
                <LinearGradient colors={[PINK, VIOLET]} style={{ flex: 1 }} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} />
              </Animated.View>
            </View>

            {/* Step indicators */}
            <View style={styles.stepsRow}>
              {STEPS.map((s, i) => (
                <View key={i} style={styles.stepItem}>
                  <View style={[styles.stepDot, i <= step && styles.stepDotActive]}>
                    {i < step
                      ? <Ionicons name="checkmark" size={12} color="#fff" />
                      : <Text style={[styles.stepDotText, i <= step && { color: '#fff' }]}>{i + 1}</Text>
                    }
                  </View>
                  <Text style={[styles.stepLabel, i <= step && styles.stepLabelActive]}>{s.label}</Text>
                </View>
              ))}
            </View>

            <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">

              {/* Card */}
              <View style={styles.card}>
                <LinearGradient colors={['rgba(255,255,255,0.07)', 'rgba(255,255,255,0.02)']} style={styles.cardInner}>

                  {error ? (
                    <View style={styles.errorBox}>
                      <Ionicons name="alert-circle" size={16} color="#f87171" />
                      <Text style={styles.errorText}>{error}</Text>
                    </View>
                  ) : null}

                  {step === 0 && (
                    <>
                      <Text style={styles.stepTitle}>¿Cómo te llamas?</Text>
                      {field('firstName', 'Nombre', 'person-outline', { hint: 'Nombre' })}
                      {field('lastName', 'Apellido', 'person-outline', { hint: 'Apellido' })}
                      {field('username', '@usuario', 'at-outline', { autoCapitalize: 'none', hint: 'Nombre de usuario' })}
                    </>
                  )}

                  {step === 1 && (
                    <>
                      <Text style={styles.stepTitle}>Datos de acceso</Text>
                      {field('email', 'tu@email.com', 'mail-outline', { keyboard: 'email-address', autoCapitalize: 'none', hint: 'Email' })}
                      {field('password', 'Mínimo 8 caracteres', 'lock-closed-outline', {
                        secure: !showPass, showToggle: true, onToggle: () => setShowPass(!showPass), hint: 'Contraseña',
                      })}
                      {field('confirmPassword', 'Repite tu contraseña', 'lock-closed-outline', {
                        secure: !showConfirmPass, showToggle: true, onToggle: () => setShowConfirmPass(!showConfirmPass), hint: 'Confirmar contraseña',
                      })}
                    </>
                  )}

                  {step === 2 && (
                    <>
                      <Text style={styles.stepTitle}>Un poco más...</Text>
                      {field('birthDate', 'AAAA-MM-DD', 'calendar-outline', { hint: 'Fecha de nacimiento (ej: 1995-06-15)', keyboard: 'numeric' })}

                      <TouchableOpacity
                        style={styles.termsRow}
                        onPress={() => update('acceptTerms', !form.acceptTerms)}
                        activeOpacity={0.7}
                      >
                        <View style={[styles.checkbox, form.acceptTerms && styles.checkboxActive]}>
                          {form.acceptTerms && <Ionicons name="checkmark" size={14} color="#fff" />}
                        </View>
                        <Text style={styles.termsText}>
                          Acepto los{' '}
                          <Text style={{ color: PINK }}>Términos y condiciones</Text>
                          {' '}y la{' '}
                          <Text style={{ color: PINK }}>Política de privacidad</Text>
                        </Text>
                      </TouchableOpacity>

                      <View style={styles.perksRow}>
                        {['Eventos cerca de ti', 'Conecta con gente', 'Experiencias únicas'].map((p, i) => (
                          <View key={i} style={styles.perkChip}>
                            <Ionicons name="checkmark-circle" size={14} color={PINK} />
                            <Text style={styles.perkText}>{p}</Text>
                          </View>
                        ))}
                      </View>
                    </>
                  )}

                  {/* CTA Button */}
                  <TouchableOpacity onPress={handleNext} disabled={isLoading} activeOpacity={0.85} style={{ marginTop: 24 }}>
                    <LinearGradient
                      colors={isLoading ? ['#374151', '#374151'] : [PINK, VIOLET]}
                      start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                      style={styles.ctaBtn}
                    >
                      {isLoading
                        ? <ActivityIndicator size="small" color="#fff" />
                        : <>
                          <Text style={styles.ctaBtnText}>
                            {step < STEPS.length - 1 ? 'Continuar' : '¡Crear mi cuenta!'}
                          </Text>
                          <Ionicons name={step < STEPS.length - 1 ? 'arrow-forward' : 'flash'} size={20} color="#fff" style={{ marginLeft: 8 }} />
                        </>
                      }
                    </LinearGradient>
                  </TouchableOpacity>

                </LinearGradient>
              </View>

              {/* Footer */}
              <View style={styles.footer}>
                <Text style={styles.footerText}>¿Ya tienes cuenta? </Text>
                <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
                  <Text style={[styles.footerLink, { color: PINK }]}>Inicia sesión</Text>
                </TouchableOpacity>
              </View>

            </ScrollView>
          </Animated.View>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0C0B10' },
  orb: { position: 'absolute', borderRadius: 120 },

  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingTop: 8, paddingBottom: 16, gap: 12,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.07)',
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#fff' },
  headerSub: { fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 2 },
  headerBadge: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },

  progressTrack: { height: 3, backgroundColor: 'rgba(255,255,255,0.07)', marginHorizontal: 16, borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 2 },

  stepsRow: { flexDirection: 'row', justifyContent: 'center', gap: 32, paddingVertical: 16 },
  stepItem: { alignItems: 'center', gap: 6 },
  stepDot: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.07)',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  stepDotActive: { backgroundColor: '#ec4899', borderColor: '#ec4899' },
  stepDotText: { fontSize: 12, fontWeight: '600', color: 'rgba(255,255,255,0.3)' },
  stepLabel: { fontSize: 11, color: 'rgba(255,255,255,0.3)', fontWeight: '500' },
  stepLabelActive: { color: '#fff' },

  scrollContent: { paddingHorizontal: 16, paddingBottom: 32 },

  card: {
    borderRadius: 24, overflow: 'hidden',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  cardInner: { padding: 24 },

  stepTitle: { fontSize: 20, fontWeight: '700', color: '#fff', marginBottom: 20 },

  errorBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(248,113,113,0.1)', borderRadius: 12,
    padding: 12, marginBottom: 16,
    borderWidth: 1, borderColor: 'rgba(248,113,113,0.2)',
  },
  errorText: { color: '#f87171', fontSize: 13, flex: 1 },

  fieldHint: { fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 6, fontWeight: '500' },
  fieldWrapper: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 14,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 16, height: 52,
  },
  fieldFocused: { borderColor: '#ec4899', backgroundColor: 'rgba(236,72,153,0.06)' },
  fieldIcon: { marginRight: 12 },
  input: { flex: 1, fontSize: 15, color: '#fff' },
  eyeBtn: { padding: 4 },

  termsRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginTop: 8 },
  checkbox: {
    width: 22, height: 22, borderRadius: 6,
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center', alignItems: 'center', marginTop: 1, flexShrink: 0,
  },
  checkboxActive: { backgroundColor: '#ec4899', borderColor: '#ec4899' },
  termsText: { flex: 1, fontSize: 13, color: 'rgba(255,255,255,0.6)', lineHeight: 20 },

  perksRow: { gap: 8, marginTop: 20 },
  perkChip: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  perkText: { fontSize: 13, color: 'rgba(255,255,255,0.6)' },

  ctaBtn: {
    height: 54, borderRadius: 14, justifyContent: 'center', alignItems: 'center',
    flexDirection: 'row',
  },
  ctaBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  footer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 20 },
  footerText: { fontSize: 14, color: 'rgba(255,255,255,0.5)' },
  footerLink: { fontSize: 14, fontWeight: '700' },
});
