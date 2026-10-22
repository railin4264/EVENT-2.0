import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { authService } from '../services/AuthService';
import { useTheme } from '../contexts/ThemeContext';
import { discoveryAppearance } from '../constants/discoveryAppearance';
export default function PasswordRecoveryScreen({ reset = false }: { reset?: boolean }) {
  const router = useRouter();
  const { token } = useLocalSearchParams<{ token?: string }>();
  const { isDark } = useTheme();
  const p = discoveryAppearance(isDark);
  const validToken = typeof token === 'string' && /^[a-f0-9]{64}$/i.test(token);
  const [email, setEmail] = useState(''), [password, setPassword] = useState(''), [confirmation, setConfirmation] = useState('');
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [done, setDone] = useState(false);
  const lock = useRef(false), active = useRef(true);
  useEffect(() => { active.current = true; return () => { active.current = false; }; }, []);
  const submit = async () => {
    if (lock.current || done) return;
    setError('');
    if (!reset && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { setError('Escribe un correo electrónico válido.'); return; }
    if (reset && (!validToken || password.length < 8 || password.length > 128 || !/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9])/.test(password))) { setError('Usa entre 8 y 128 caracteres con mayúsculas, minúsculas, números y un símbolo.'); return; }
    if (reset && password !== confirmation) { setError('Las contraseñas no coinciden.'); return; }
    lock.current = true; setBusy(true);
    try {
      const result = reset ? await authService.resetPassword(token!, password) : await authService.forgotPassword(email.trim().toLowerCase());
      if (!result.success) throw new Error('Request not confirmed');
      if (active.current) { setDone(true); setPassword(''); setConfirmation(''); }
    } catch {
      if (active.current) setError(reset ? 'No pudimos cambiar la contraseña. El enlace puede haber expirado; solicita uno nuevo.' : 'No pudimos procesar la solicitud. Inténtalo de nuevo en unos minutos.');
    } finally { lock.current = false; if (active.current) setBusy(false); }
  };
  const invalid = reset && !validToken;
  return <SafeAreaView style={{ flex: 1, backgroundColor: p.background }}><KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
    <TouchableOpacity accessibilityRole="button" accessibilityLabel="Volver al acceso" style={styles.back} onPress={() => router.canGoBack() ? router.back() : router.replace('/(auth)/login')}><Ionicons name="arrow-back" size={24} color={p.text} /></TouchableOpacity>
    <Ionicons name="key-outline" size={34} color={p.accent} />
    <Text accessibilityRole="header" style={[styles.title, { color: p.text }]}>{reset ? 'Elige una nueva contraseña' : 'Recupera tu acceso'}</Text>
    <Text style={[styles.copy, { color: p.muted }]}>{done ? reset ? 'Contraseña actualizada. Inicia sesión de nuevo.' : 'Si existe una cuenta con ese correo, recibirás un enlace para restablecer tu contraseña.' : invalid ? 'Este enlace no es válido. Solicita uno nuevo para continuar.' : reset ? 'Usa una contraseña única que no compartas con otras aplicaciones.' : 'Escribe el correo con el que creaste tu cuenta.'}</Text>
    {!done && !invalid && <View style={styles.form}>
      {reset ? <><Text style={[styles.label, { color: p.text }]}>Nueva contraseña</Text><TextInput accessibilityLabel="Nueva contraseña" secureTextEntry autoComplete="new-password" value={password} onChangeText={setPassword} maxLength={128} editable={!busy} style={[styles.input, { color: p.text, borderColor: p.border }]} /><Text style={[styles.copy, { color: p.muted }]}>Al menos 8 caracteres, con mayúsculas, minúsculas, números y un símbolo.</Text><Text style={[styles.label, { color: p.text }]}>Repite tu contraseña</Text><TextInput accessibilityLabel="Repite tu contraseña" secureTextEntry autoComplete="new-password" value={confirmation} onChangeText={setConfirmation} maxLength={128} editable={!busy} style={[styles.input, { color: p.text, borderColor: p.border }]} /></>
        : <><Text style={[styles.label, { color: p.text }]}>Correo electrónico</Text><TextInput accessibilityLabel="Correo electrónico" autoComplete="email" autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} maxLength={254} editable={!busy} style={[styles.input, { color: p.text, borderColor: p.border }]} /></>}
      {error ? <Text accessibilityRole="alert" style={[styles.copy, { color: p.error }]}>{error}</Text> : null}
      <TouchableOpacity accessibilityRole="button" disabled={busy} onPress={() => void submit()} style={[styles.button, { backgroundColor: p.accent, opacity: busy ? 0.7 : 1 }]}>{busy ? <ActivityIndicator color={p.onAccent} /> : <Text style={{ color: p.onAccent, fontWeight: '700' }}>{reset ? 'Guardar contraseña' : 'Enviar enlace'}</Text>}</TouchableOpacity>
    </View>}
    {(done || invalid || (reset && error)) && <TouchableOpacity accessibilityRole="button" style={styles.back} onPress={() => router.replace(reset && !done ? '/(auth)/forgot-password' : '/(auth)/login')}><Text style={{ color: p.accent, fontWeight: '600' }}>{reset && !done ? 'Solicitar otro enlace' : 'Volver al acceso'}</Text></TouchableOpacity>}
  </ScrollView></KeyboardAvoidingView></SafeAreaView>;
}
const styles = StyleSheet.create({ content: { flexGrow: 1, padding: 24, width: '100%', maxWidth: 520, alignSelf: 'center' }, back: { minHeight: 48, justifyContent: 'center', marginBottom: 24 }, title: { fontSize: 30, lineHeight: 37, fontWeight: '800', marginTop: 20 }, copy: { fontSize: 14, lineHeight: 23, marginTop: 14 }, form: { marginTop: 24 }, label: { fontSize: 14, fontWeight: '600', marginVertical: 10 }, input: { minHeight: 54, borderWidth: 1, borderRadius: 14, padding: 14, fontSize: 16 }, button: { minHeight: 52, alignItems: 'center', justifyContent: 'center', padding: 15, borderRadius: 14, marginTop: 24 } });
