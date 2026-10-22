import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TextInput, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../contexts/AuthContext';
import { apiClient } from '../services/apiClient';

export default function AccountToolsScreen() {
  const { kind } = useLocalSearchParams<{ kind?: string }>();
  const { user } = useAuth();
  const owner = user?._id || user?.id || '';
  return <AccountTool key={`${owner}:${kind}`} kind={kind || 'help'} email={user?.email || ''} owner={owner} />;
}
function AccountTool({ kind, email, owner }: { kind: string; email: string; owner: string }) {
  const router = useRouter(), insets = useSafeAreaInsets();
  const mounted = useRef(true), lock = useRef(false);
  const [subject, setSubject] = useState(''), [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false), [failure, setFailure] = useState(''), [success, setSuccess] = useState('');
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const isPassword = kind === 'password', isSupport = kind === 'support' || kind === 'verification' || kind === 'data';
  const title = isPassword ? 'Recuperar contraseña' : kind === 'verification' ? 'Ayuda con verificación' : kind === 'data' ? 'Mis datos y privacidad' : isSupport ? 'Contactar soporte' : kind === 'about' ? 'Acerca de EventNow' : 'Centro de ayuda';
  const submit = async () => {
    if (!owner || lock.current || (isPassword ? !email : !subject.trim() || !message.trim())) return;
    lock.current = true; setBusy(true); setFailure(''); setSuccess('');
    try {
      const { data } = isPassword ? await apiClient.post('/auth/forgot-password', { email }) : await apiClient.post('/support/tickets', {
        subject: subject.trim(), message: message.trim(), category: kind === 'verification' ? 'organizer_verification' : kind === 'data' ? 'other' : 'technical'
      });
      if (data.success !== true) throw new Error(data.message || 'No se pudo registrar la solicitud.');
      if (mounted.current) { setSuccess(isPassword ? 'Solicitud procesada. Si el correo está registrado y el envío está disponible, recibirás las instrucciones. No se ha cambiado tu contraseña.' : `Solicitud registrada${data.data?.ticketNumber ? `: ${data.data.ticketNumber}` : ''}. El equipo revisará tu mensaje.`); setSubject(''); setMessage(''); }
    } catch (error: any) { if (mounted.current) setFailure(error.response?.data?.message || error.message || 'No se pudo completar la acción.'); }
    finally { lock.current = false; if (mounted.current) setBusy(false); }
  };
  return <ScrollView style={styles.page} contentContainerStyle={{ padding: 24, paddingTop: insets.top + 20, paddingBottom: insets.bottom + 40 }} keyboardShouldPersistTaps="handled">
    <TouchableOpacity accessibilityRole="button" onPress={() => router.back()} style={styles.button}><Text style={styles.link}>← Volver</Text></TouchableOpacity>
    <Text accessibilityRole="header" style={styles.title}>{title}</Text>
    {!isPassword && !isSupport && <View style={styles.panel}><Text style={styles.label}>{kind === 'about' ? 'Buenos planes, conexiones reales.' : 'Explora y participa con claridad'}</Text><Text style={styles.copy}>Puedes explorar eventos públicos sin crear una cuenta. Para confirmar asistencia, guardar preferencias o participar en una comunidad necesitas iniciar sesión.</Text><Text style={styles.copy}>Si el evento tiene precio, sigue las instrucciones del organizador. EventNow no procesa pagos en esta etapa. Una confirmación de asistencia no acredita una compra.</Text><Text style={styles.copy}>El serrucho es un registro manual de aportes. Un comprobante queda pendiente hasta que el organizador registre su recepción.</Text><Text style={styles.copy}>En Configuración eliges si compartes tu asistencia y recibes planes de amigos. No se activa el permiso de notificaciones ni la ubicación por cambiar esas preferencias.</Text></View>}
    {isPassword && <Text style={styles.copy}>Solicita instrucciones para {email || 'el correo de tu cuenta'}. El envío depende de que el servicio de correo esté configurado.</Text>}
    {isSupport && <><Text style={styles.copy}>Describe tu solicitud. No incluyas contraseñas, números de tarjeta ni documentos de identidad. {kind === 'data' ? 'Puedes pedir información, corrección o revisión de tus datos; este formulario no elimina tu cuenta automáticamente.' : ''}</Text><Text style={styles.label}>Asunto</Text><TextInput accessibilityLabel="Asunto" style={styles.input} value={subject} onChangeText={setSubject} maxLength={200} editable={!busy} /><Text style={styles.label}>Mensaje</Text><TextInput accessibilityLabel="Mensaje" style={[styles.input, { height: 150, textAlignVertical: 'top' }]} value={message} onChangeText={setMessage} multiline maxLength={4000} editable={!busy} /></>}
    {failure ? <Text accessibilityRole="alert" style={styles.error}>{failure}</Text> : null}
    {success ? <Text style={styles.success}>{success}</Text> : null}
    {(isPassword || isSupport) && <TouchableOpacity accessibilityRole="button" disabled={busy || !owner || (isPassword ? !email : !subject.trim() || !message.trim())} onPress={() => void submit()} style={[styles.button, styles.primary, busy && { opacity: 0.5 }]}><Text style={styles.primaryText}>{busy ? 'Enviando…' : isPassword ? 'Solicitar instrucciones por correo' : 'Enviar solicitud a soporte'}</Text></TouchableOpacity>}
  </ScrollView>;
}
const styles = StyleSheet.create({ page: { flex: 1, backgroundColor: '#0C0B10' }, title: { color: 'white', fontSize: 28, fontWeight: '700', marginVertical: 20 }, label: { color: 'white', fontSize: 16, fontWeight: '600', marginTop: 18, marginBottom: 10 }, copy: { color: '#c4c0ce', fontSize: 15, lineHeight: 24, marginBottom: 18 }, panel: { padding: 18, borderColor: '#35303e', borderWidth: 1, borderRadius: 20 }, input: { color: 'white', backgroundColor: '#201b29', borderRadius: 12, padding: 14, minHeight: 48, marginBottom: 16 }, button: { minHeight: 48, justifyContent: 'center', paddingVertical: 12 }, link: { color: '#c4b5fd', fontSize: 16 }, primary: { backgroundColor: '#7c3aed', padding: 16, borderRadius: 12, marginTop: 15 }, primaryText: { color: 'white', fontSize: 15, fontWeight: '600', textAlign: 'center' }, error: { color: '#fca5a5', marginVertical: 12 }, success: { color: '#86efac', marginVertical: 12, lineHeight: 22 } });
