import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Linking, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { discoveryAppearance } from '../constants/discoveryAppearance';
import { officialWebPage } from '../utils/webOperations';
export default function OperationsScreen() {
  const { isDark } = useTheme();
  const { user } = useAuth();
  const p = discoveryAppearance(isDark);
  const [error, setError] = useState('');
  const panels: { path: '/organizers' | '/dashboard' | '/admin'; title: string; detail: string }[] = [
    { path: '/organizers', title: 'Anfitriones y promoción', detail: 'Publicación, solicitudes de difusión y herramientas comerciales.' },
    { path: '/dashboard', title: 'Panel de organización', detail: 'Consulta la gestión y las métricas disponibles en la web.' },
    ...((user as { role?: string } | null)?.role === 'admin' ? [{ path: '/admin' as const, title: 'Administración', detail: 'Moderación, soporte y control de la plataforma.' }] : []),
  ];
  const open = async (path: '/organizers' | '/dashboard' | '/admin') => {
    const url = officialWebPage(path); if (!url) return;
    setError('');
    try { await Linking.openURL(url); } catch { setError('No pudimos abrir el navegador. Inténtalo de nuevo.'); }
  };
  return <SafeAreaView edges={['bottom', 'left', 'right']} style={{ flex: 1, backgroundColor: p.background }}><ScrollView style={{ flex: 1, backgroundColor: p.background }} contentContainerStyle={styles.content}>
    <Text accessibilityRole="header" style={[styles.title, { color: p.text }]}>Gestión y anfitriones</Text>
    <Text style={[styles.copy, { color: p.muted }]}>Estos paneles se abren en el sitio oficial. El navegador puede pedirte que inicies sesión; la app no envía tus credenciales en el enlace.</Text>
    {!officialWebPage('/dashboard') && <Text style={[styles.notice, { color: p.text, backgroundColor: p.surface }]}>Los accesos web se habilitarán cuando conectemos el dominio oficial de EventNow.</Text>}
    {panels.map(panel => <View key={panel.path} style={[styles.card, { backgroundColor: p.surface }]}><Text style={[styles.heading, { color: p.text }]}>{panel.title}</Text><Text style={[styles.copy, { color: p.muted }]}>{panel.detail}</Text><TouchableOpacity accessibilityRole="link" disabled={!officialWebPage(panel.path)} style={styles.button} onPress={() => void open(panel.path)}><Text style={{ color: officialWebPage(panel.path) ? p.accent : p.muted, fontWeight: '600' }}>{officialWebPage(panel.path) ? 'Abrir panel web' : 'Pendiente de conectar el dominio'}</Text></TouchableOpacity></View>)}
    {!!error && <Text accessibilityRole="alert" style={[styles.copy, { color: p.error }]}>{error}</Text>}
  </ScrollView></SafeAreaView>;
}
const styles = StyleSheet.create({ content: { padding: 24, paddingBottom: 40 }, title: { fontSize: 28, fontWeight: '800' }, heading: { fontSize: 18, fontWeight: '700' }, copy: { fontSize: 14, lineHeight: 23, marginTop: 12 }, notice: { padding: 16, marginTop: 22, borderRadius: 16, fontSize: 14, lineHeight: 22 }, card: { padding: 20, borderRadius: 20, marginTop: 18 }, button: { minHeight: 48, justifyContent: 'center', marginTop: 12 } });
