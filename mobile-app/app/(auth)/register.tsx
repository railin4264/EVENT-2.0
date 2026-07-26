/**
 * Register — EventNow 2.0
 * Dark Neon Urban · 3 pasos con estados completos
 * Idéntico al sistema de diseño de HomeScreen
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

// ─── Tokens (mismo sistema que HomeScreen) ────────────────────────────────────
const BG     = '#0C0B10';
const PINK   = '#ec4899';
const VIOLET = '#8b5cf6';
const BLUE   = '#3b82f6';
const GLASS  = 'rgba(255,255,255,0.06)';
const BORDER = 'rgba(255,255,255,0.08)';
const MUTED  = 'rgba(255,255,255,0.30)';
const SUBTLE = 'rgba(255,255,255,0.50)';

// ─── Configuración de los 3 pasos ─────────────────────────────────────────────
const STEPS = [
  { label: 'Cuenta',    icon: 'person-outline'         as const, gradient: [PINK, VIOLET]  as [string,string] },
  { label: 'Acceso',    icon: 'lock-closed-outline'    as const, gradient: [VIOLET, BLUE]  as [string,string] },
  { label: 'Intereses', icon: 'sparkles-outline'       as const, gradient: [BLUE, '#06b6d4'] as [string,string] },
];

const INTERESTS = [
  { id: 'music',    label: '🎵 Música'      },
  { id: 'art',      label: '🎨 Arte'        },
  { id: 'tech',     label: '💻 Tech'        },
  { id: 'sport',    label: '🏃 Deporte'     },
  { id: 'food',     label: '🍕 Gastronomía' },
  { id: 'social',   label: '🎉 Social'      },
  { id: 'travel',   label: '✈️ Viajes'      },
  { id: 'culture',  label: '🎭 Cultura'     },
  { id: 'wellness', label: '🧘 Bienestar'   },
  { id: 'gaming',   label: '🎮 Gaming'      },
];

// ─── Animated orb ─────────────────────────────────────────────────────────────
const Orb = ({ color, size, x, y, duration, delay }: {
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
  const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [0, -14] });
  return (
    <Animated.View style={[styles.orb, { width: size, height: size, borderRadius: size / 2, left: x, top: y, transform: [{ translateY }] }]}>
      <LinearGradient colors={[color + '2E', 'transparent']} style={{ flex: 1, borderRadius: size / 2 }} />
    </Animated.View>
  );
};

// ─── Progress bar ─────────────────────────────────────────────────────────────
const ProgressBar = ({ step, total }: { step: number; total: number }) => {
  const widthAnim = useRef(new Animated.Value((step / total) * 100)).current;

  useEffect(() => {
    Animated.timing(widthAnim, {
      toValue: (step / total) * 100,
      duration: 350,
      easing: Easing.out(Easing.quad),
      useNativeDriver: false,
    }).start();
  }, [step]);

  return (
    <View style={styles.progressTrack}>
      <Animated.View
        style={[
          styles.progressFill,
          { width: widthAnim.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] }) },
        ]}
      >
        <LinearGradient
          colors={STEPS[step - 1]?.gradient || [PINK, VIOLET]}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
    </View>
  );
};

// ─── Animated field ───────────────────────────────────────────────────────────
const Field = ({
  icon, placeholder, value, onChange,
  keyboardType, autoCapitalize, secure,
  showToggle, onToggle, autoComplete,
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

  const focus = () => {
    setFocused(true);
    Animated.timing(borderAnim, { toValue: 1, duration: 200, useNativeDriver: false }).start();
  };
  const blur = () => {
    setFocused(false);
    Animated.timing(borderAnim, { toValue: 0, duration: 200, useNativeDriver: false }).start();
  };

  const borderColor = borderAnim.interpolate({ inputRange: [0, 1], outputRange: [BORDER, PINK] });
  const bgColor     = borderAnim.interpolate({ inputRange: [0, 1], outputRange: [GLASS, 'rgba(236,72,153,0.07)'] });

  return (
    <Animated.View style={[styles.field, { borderColor, backgroundColor: bgColor }]}>
      <Ionicons name={icon} size={17} color={focused ? PINK : MUTED} style={styles.fieldIcon} />
      <TextInput
        style={[styles.fieldInput, showToggle && { flex: 1 }]}
        placeholder={placeholder}
        placeholderTextColor="rgba(255,255,255,0.20)"
        value={value}
        onChangeText={onChange}
        onFocus={focus}
        onBlur={blur}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize || 'none'}
        secureTextEntry={secure}
        autoComplete={autoComplete}
        autoCorrect={false}
      />
      {showToggle && (
        <TouchableOpacity onPress={onToggle} style={styles.eyeBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name={secure ? 'eye-outline' : 'eye-off-outline'} size={17} color={MUTED} />
        </TouchableOpacity>
      )}
    </Animated.View>
  );
};

// ─── Strength indicator ───────────────────────────────────────────────────────
const PasswordStrength = ({ password }: { password: string }) => {
  const strength =
    password.length === 0 ? 0 :
    password.length < 6   ? 1 :
    password.length < 10 && !/[^a-zA-Z0-9]/.test(password) ? 2 :
    password.length >= 10 && /[^a-zA-Z0-9]/.test(password) ? 4 : 3;

  const labels = ['', 'Débil', 'Regular', 'Buena', 'Fuerte'];
  const colors = ['', '#f87171', '#fbbf24', '#34d399', '#06b6d4'];

  if (!password) return null;

  return (
    <View style={styles.strengthRow}>
      {[1, 2, 3, 4].map(i => (
        <View
          key={i}
          style={[
            styles.strengthBar,
            { backgroundColor: i <= strength ? colors[strength] : BORDER },
          ]}
        />
      ))}
      <Text style={[styles.strengthLabel, { color: colors[strength] }]}>
        {labels[strength]}
      </Text>
    </View>
  );
};

// ─── Main component ───────────────────────────────────────────────────────────
export default function RegisterScreen() {
  const router = useRouter();
  const { register } = useAuth();

  const [step, setStep]           = useState(1);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');
  const [showPass, setShowPass]   = useState(false);
  const [showConf, setShowConf]   = useState(false);
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);

  const [form, setForm] = useState({
    firstName: '', lastName: '', username: '', email: '',
    password: '', confirmPassword: '',
  });

  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;
  const stepFade  = useRef(new Animated.Value(1)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, duration: 800, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 700, easing: Easing.out(Easing.quad), useNativeDriver: true }),
    ]).start();
  }, []);

  const animateStepChange = (cb: () => void) => {
    Animated.timing(stepFade, { toValue: 0, duration: 180, useNativeDriver: true }).start(() => {
      cb();
      Animated.timing(stepFade, { toValue: 1, duration: 260, useNativeDriver: true }).start();
    });
  };

  const shake = () =>
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue:  10, duration: 55, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 55, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue:  7,  duration: 55, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -7,  duration: 55, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue:  0,  duration: 55, useNativeDriver: true }),
    ]).start();

  const set = (key: keyof typeof form) => (val: string) => setForm(f => ({ ...f, [key]: val }));

  const validateStep1 = () => {
    if (!form.firstName.trim()) return 'Ingresa tu nombre';
    if (!form.lastName.trim())  return 'Ingresa tu apellido';
    if (!form.username.trim())  return 'Elige un nombre de usuario';
    if (!form.email.trim() || !form.email.includes('@')) return 'Ingresa un email válido';
    return null;
  };

  const validateStep2 = () => {
    if (!form.password)                        return 'Crea una contraseña';
    if (form.password.length < 6)              return 'Mínimo 6 caracteres';
    if (form.password !== form.confirmPassword) return 'Las contraseñas no coinciden';
    return null;
  };

  const goNext = () => {
    const err = step === 1 ? validateStep1() : validateStep2();
    if (err) { setError(err); shake(); return; }
    setError('');
    animateStepChange(() => setStep(s => s + 1));
  };

  const goBack = () => {
    setError('');
    if (step > 1) animateStepChange(() => setStep(s => s - 1));
    else router.back();
  };

  const toggleInterest = (id: string) =>
    setSelectedInterests(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );

  const handleRegister = async () => {
    setLoading(true);
    try {
      await register({
        username:        form.username.trim(),
        email:           form.email.trim().toLowerCase(),
        password:        form.password,
        confirmPassword: form.confirmPassword,
        firstName:       form.firstName.trim(),
        lastName:        form.lastName.trim(),
      });
      router.replace('/(tabs)');
    } catch (e: any) {
      setError(e?.message || 'No se pudo crear la cuenta. Inténtalo de nuevo.');
      shake();
    } finally {
      setLoading(false);
    }
  };

  const isLastStep = step === STEPS.length;
  const currentStep = STEPS[step - 1];

  return (
    <View style={styles.root}>
      <StatusBar style="light" />

      <LinearGradient
        colors={[BG, '#14082A', BG]}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* Orbs */}
      <Orb color={VIOLET} size={280} x={-60}          y={-40}          duration={4500} delay={0}    />
      <Orb color={PINK}   size={240} x={width - 150}  y={height * 0.3} duration={5200} delay={600} />
      <Orb color={BLUE}   size={180} x={width * 0.15} y={height * 0.65} duration={3800} delay={300} />

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
              style={[styles.content, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}
            >

              {/* ── Header row ───────────────────────────────────────────── */}
              <View style={styles.headerRow}>
                <TouchableOpacity onPress={goBack} style={styles.backBtnInner}>
                  <Ionicons name="chevron-back" size={22} color="#fff" />
                </TouchableOpacity>
                <View style={{ flex: 1, marginHorizontal: 12 }}>
                  <ProgressBar step={step} total={STEPS.length} />
                </View>
                <Text style={styles.stepCounter}>{step} / {STEPS.length}</Text>
              </View>

              {/* ── Step indicator tabs ──────────────────────────────────── */}
              <View style={styles.stepTabs}>
                {STEPS.map((s, i) => {
                  const isCurrent = i + 1 === step;
                  const isDone    = i + 1 < step;
                  return (
                    <View key={i} style={styles.stepTab}>
                      <View style={[
                        styles.stepDot,
                        isDone    && styles.stepDotDone,
                        isCurrent && styles.stepDotActive,
                      ]}>
                        {isDone ? (
                          <Ionicons name="checkmark" size={12} color="#fff" />
                        ) : isCurrent ? (
                          <LinearGradient
                            colors={s.gradient}
                            style={StyleSheet.absoluteFill}
                          />
                        ) : null}
                        {!isDone && !isCurrent && (
                          <Text style={styles.stepDotNum}>{i + 1}</Text>
                        )}
                      </View>
                      <Text style={[styles.stepTabLabel, isCurrent && styles.stepTabLabelActive]}>
                        {s.label}
                      </Text>
                    </View>
                  );
                })}
              </View>

              {/* ── Logo for current step ────────────────────────────────── */}
              <View style={styles.stepLogoArea}>
                <View style={styles.stepLogoWrap}>
                  <LinearGradient
                    colors={currentStep.gradient}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                    style={styles.stepLogoGrad}
                  >
                    <Ionicons name={currentStep.icon} size={28} color="#fff" />
                  </LinearGradient>
                </View>
              </View>

              {/* ── Card ─────────────────────────────────────────────────── */}
              <Animated.View style={[styles.card, { transform: [{ translateX: shakeAnim }] }]}>
                <LinearGradient
                  colors={['rgba(255,255,255,0.07)', 'rgba(255,255,255,0.02)']}
                  style={styles.cardInner}
                >
                  {/* Card header */}
                  <Text style={styles.cardTitle}>
                    {step === 1 ? 'Crea tu cuenta' :
                     step === 2 ? 'Asegura tu acceso' :
                                  '¿Qué te mueve?'}
                  </Text>
                  <Text style={styles.cardSub}>
                    {step === 1 ? 'Únete a miles que ya descubren eventos' :
                     step === 2 ? 'Tu contraseña protege tu experiencia' :
                                  'Personaliza tu feed con lo que amas'}
                  </Text>

                  {/* Error banner */}
                  {error ? (
                    <View style={styles.errorBanner}>
                      <Ionicons name="alert-circle" size={15} color="#f87171" />
                      <Text style={styles.errorText}>{error}</Text>
                    </View>
                  ) : null}

                  {/* ── STEP 1: Cuenta ─────────────────────────────────── */}
                  {step === 1 && (
                    <Animated.View style={{ opacity: stepFade }}>
                      <View style={styles.nameRow}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.fieldLabel}>Nombre</Text>
                          <Field
                            icon="person-outline"
                            placeholder="Tu nombre"
                            value={form.firstName}
                            onChange={set('firstName')}
                            autoCapitalize="words"
                            autoComplete="name"
                          />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.fieldLabel}>Apellido</Text>
                          <Field
                            icon="person-outline"
                            placeholder="Tu apellido"
                            value={form.lastName}
                            onChange={set('lastName')}
                            autoCapitalize="words"
                            autoComplete="name-family"
                          />
                        </View>
                      </View>

                      <Text style={styles.fieldLabel}>Usuario</Text>
                      <Field
                        icon="at-outline"
                        placeholder="usuario_único"
                        value={form.username}
                        onChange={set('username')}
                        autoComplete="username"
                      />

                      <Text style={styles.fieldLabel}>Correo electrónico</Text>
                      <Field
                        icon="mail-outline"
                        placeholder="tu@email.com"
                        value={form.email}
                        onChange={set('email')}
                        keyboardType="email-address"
                        autoComplete="email"
                      />
                    </Animated.View>
                  )}

                  {/* ── STEP 2: Contraseña ─────────────────────────────── */}
                  {step === 2 && (
                    <Animated.View style={{ opacity: stepFade }}>
                      <Text style={styles.fieldLabel}>Contraseña</Text>
                      <Field
                        icon="lock-closed-outline"
                        placeholder="Mínimo 6 caracteres"
                        value={form.password}
                        onChange={set('password')}
                        secure={!showPass}
                        showToggle
                        onToggle={() => setShowPass(p => !p)}
                        autoComplete="password-new"
                      />
                      <PasswordStrength password={form.password} />

                      <Text style={[styles.fieldLabel, { marginTop: 16 }]}>Confirmar contraseña</Text>
                      <Field
                        icon="lock-closed-outline"
                        placeholder="Repite tu contraseña"
                        value={form.confirmPassword}
                        onChange={set('confirmPassword')}
                        secure={!showConf}
                        showToggle
                        onToggle={() => setShowConf(c => !c)}
                        autoComplete="password-new"
                      />
                      {form.confirmPassword && form.password !== form.confirmPassword && (
                        <Text style={styles.matchError}>Las contraseñas no coinciden</Text>
                      )}
                      {form.confirmPassword && form.password === form.confirmPassword && form.password.length >= 6 && (
                        <View style={styles.matchOk}>
                          <Ionicons name="checkmark-circle" size={14} color="#34d399" />
                          <Text style={styles.matchOkText}>Contraseñas coinciden</Text>
                        </View>
                      )}
                    </Animated.View>
                  )}

                  {/* ── STEP 3: Intereses ──────────────────────────────── */}
                  {step === 3 && (
                    <Animated.View style={{ opacity: stepFade }}>
                      <View style={styles.interestGrid}>
                        {INTERESTS.map(item => {
                          const active = selectedInterests.includes(item.id);
                          return (
                            <TouchableOpacity
                              key={item.id}
                              onPress={() => toggleInterest(item.id)}
                              activeOpacity={0.75}
                              style={[styles.interestTag, active && styles.interestTagActive]}
                            >
                              {active && (
                                <LinearGradient
                                  colors={[PINK, VIOLET]}
                                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                                  style={StyleSheet.absoluteFill}
                                />
                              )}
                              <Text style={[styles.interestText, active && styles.interestTextActive]}>
                                {item.label}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                      {selectedInterests.length > 0 && (
                        <Text style={styles.selectedCount}>
                          {selectedInterests.length} seleccionado{selectedInterests.length !== 1 ? 's' : ''}
                        </Text>
                      )}
                    </Animated.View>
                  )}

                  <View style={{ height: 20 }} />

                  {/* ── CTA button ─────────────────────────────────────── */}
                  <TouchableOpacity
                    onPress={isLastStep ? handleRegister : goNext}
                    disabled={loading}
                    activeOpacity={0.85}
                    style={[styles.ctaWrap, { shadowColor: currentStep.gradient[0] }, loading && { opacity: 0.7 }]}
                  >
                    <LinearGradient
                      colors={loading ? ['#374151', '#374151'] : currentStep.gradient}
                      start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                      style={styles.cta}
                    >
                      {loading ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <>
                          {isLastStep && <Ionicons name="rocket-outline" size={18} color="#fff" style={{ marginRight: 8 }} />}
                          <Text style={styles.ctaText}>
                            {isLastStep ? '¡Crear mi cuenta!' : 'Continuar'}
                          </Text>
                          {!isLastStep && <Ionicons name="arrow-forward" size={18} color="#fff" style={{ marginLeft: 8 }} />}
                        </>
                      )}
                    </LinearGradient>
                  </TouchableOpacity>

                  {/* Skip interests (step 3) */}
                  {step === 3 && (
                    <TouchableOpacity style={styles.skipBtn} onPress={handleRegister} disabled={loading}>
                      <Text style={styles.skipText}>Omitir por ahora</Text>
                    </TouchableOpacity>
                  )}
                </LinearGradient>
              </Animated.View>

              {/* ── Footer ───────────────────────────────────────────────── */}
              <View style={styles.footer}>
                <Text style={styles.footerText}>¿Ya tienes cuenta?</Text>
                <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
                  <LinearGradient
                    colors={[PINK, VIOLET]}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                    style={styles.footerGrad}
                  >
                    <Text style={styles.footerLink}>Inicia sesión</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>

              {/* Terms */}
              <Text style={styles.termsText}>
                Al crear tu cuenta aceptas nuestros{' '}
                <Text style={styles.termsLink}>Términos de servicio</Text>
                {' '}y{' '}
                <Text style={styles.termsLink}>Política de privacidad</Text>
              </Text>

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
    paddingHorizontal: 24,
    paddingVertical: 20,
    minHeight: height,
  },

  // Header
  headerRow: {
    flexDirection: 'row', alignItems: 'center',
    marginBottom: 20,
  },
  backBtnInner: {
    width: 42, height: 42, borderRadius: 13,
    backgroundColor: GLASS,
    borderWidth: 1, borderColor: BORDER,
    alignItems: 'center', justifyContent: 'center',
  },
  progressTrack: {
    height: 4, borderRadius: 2,
    backgroundColor: BORDER, overflow: 'hidden',
  },
  progressFill: {
    height: '100%', borderRadius: 2, overflow: 'hidden',
  },
  stepCounter: {
    fontSize: 12, color: MUTED, fontWeight: '600', minWidth: 32, textAlign: 'right',
  },

  // Step tabs
  stepTabs: {
    flexDirection: 'row', justifyContent: 'center',
    gap: 28, marginBottom: 24,
  },
  stepTab: { alignItems: 'center', gap: 6 },
  stepDot: {
    width: 28, height: 28, borderRadius: 14, overflow: 'hidden',
    backgroundColor: GLASS,
    borderWidth: 1, borderColor: BORDER,
    alignItems: 'center', justifyContent: 'center',
  },
  stepDotActive: { borderColor: PINK, overflow: 'hidden' },
  stepDotDone: { backgroundColor: '#34d399', borderColor: '#34d399' },
  stepDotNum: { fontSize: 12, color: MUTED, fontWeight: '600' },
  stepTabLabel: { fontSize: 11, color: MUTED, fontWeight: '500' },
  stepTabLabelActive: { color: '#fff' },

  // Step logo
  stepLogoArea: { alignItems: 'center', marginBottom: 20 },
  stepLogoWrap: {
    borderRadius: 18, padding: 3,
    borderWidth: 1, borderColor: 'rgba(236,72,153,0.3)',
    shadowColor: PINK,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4, shadowRadius: 18, elevation: 8,
  },
  stepLogoGrad: {
    width: 60, height: 60, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
  },

  // Card
  card: {
    borderRadius: 24, overflow: 'hidden',
    borderWidth: 1, borderColor: BORDER,
    marginBottom: 20,
  },
  cardInner: { padding: 24 },
  cardTitle: {
    fontSize: 22, fontWeight: '700', color: '#fff',
    letterSpacing: -0.3, marginBottom: 6,
  },
  cardSub: {
    fontSize: 14, color: SUBTLE, marginBottom: 20, lineHeight: 20,
  },

  // Error
  errorBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(248,113,113,0.10)',
    borderRadius: 12, padding: 12, marginBottom: 16,
    borderWidth: 1, borderColor: 'rgba(248,113,113,0.20)',
  },
  errorText: { color: '#f87171', fontSize: 13, flex: 1 },

  // Fields
  nameRow: { flexDirection: 'row', gap: 10, marginBottom: 0 },
  fieldLabel: {
    fontSize: 11, fontWeight: '600', color: MUTED,
    textTransform: 'uppercase', letterSpacing: 0.8,
    marginBottom: 6, marginTop: 10,
  },
  field: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 13, borderWidth: 1,
    paddingHorizontal: 14, height: 50,
    marginBottom: 4,
  },
  fieldIcon: { marginRight: 10 },
  fieldInput: { flex: 1, fontSize: 15, color: '#fff' },
  eyeBtn: { padding: 4 },

  // Password strength
  strengthRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6, marginBottom: 4 },
  strengthBar: { flex: 1, height: 3, borderRadius: 2 },
  strengthLabel: { fontSize: 11, fontWeight: '600', marginLeft: 4, minWidth: 40 },
  matchError: { fontSize: 12, color: '#f87171', marginTop: 4 },
  matchOk: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  matchOkText: { fontSize: 12, color: '#34d399' },

  // Interests grid
  interestGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  interestTag: {
    position: 'relative', overflow: 'hidden',
    paddingHorizontal: 14, paddingVertical: 9,
    borderRadius: 20,
    borderWidth: 1, borderColor: BORDER,
    backgroundColor: GLASS,
  },
  interestTagActive: { borderColor: 'transparent' },
  interestText: { fontSize: 13, color: SUBTLE, fontWeight: '500' },
  interestTextActive: { color: '#fff', fontWeight: '600' },
  selectedCount: {
    fontSize: 12, color: MUTED, marginTop: 10, textAlign: 'center',
  },

  // Skip
  skipBtn: { alignItems: 'center', marginTop: 12 },
  skipText: { fontSize: 13, color: MUTED },

  // CTA
  ctaWrap: {
    borderRadius: 14, overflow: 'hidden',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45, shadowRadius: 20, elevation: 10,
  },
  cta: {
    height: 52, flexDirection: 'row',
    justifyContent: 'center', alignItems: 'center',
  },
  ctaText: { fontSize: 16, fontWeight: '700', color: '#fff', letterSpacing: 0.3 },

  // Footer
  footer: {
    flexDirection: 'row', justifyContent: 'center',
    alignItems: 'center', gap: 6, marginBottom: 12,
  },
  footerText: { fontSize: 15, color: SUBTLE },
  footerGrad: { borderRadius: 6, paddingHorizontal: 2, paddingVertical: 1 },
  footerLink: { fontSize: 15, fontWeight: '700', color: '#fff' },

  // Terms
  termsText: {
    fontSize: 11, color: MUTED, textAlign: 'center',
    lineHeight: 16, paddingHorizontal: 8, paddingBottom: 24,
  },
  termsLink: { color: 'rgba(139,92,246,0.8)' },
});
