import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Dimensions, StatusBar, AppState, Linking, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useIsFocused } from '@react-navigation/native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import eventService from '@/services/EventService';
import ticketService, { AdmissionError } from '@/services/TicketService';
import { useAuth } from '@/contexts/AuthContext';
import { canScanAdmissions, isAdmissionCode } from '@/utils/admission';
import { eventParam } from '@/utils/eventAuthReturn';
import type { Event } from '@/types';

const { width } = Dimensions.get('window');
const SCANNER_SIZE = width * 0.72;

export default function QRScannerScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ eventId?: string }>();
  const eventId = eventParam(params.eventId);
  const { user } = useAuth();
  const focused = useIsFocused();
  const [foreground, setForeground] = useState(AppState.currentState !== 'background' && AppState.currentState !== 'inactive');
  const [permission, requestPermission] = useCameraPermissions();
  const owner = user?._id || user?.id || null;
  const scope = `${owner || 'guest'}:${eventId}`;
  const [access, setAccess] = useState<{ scope: string; event: Event | null; error?: string } | null>(null);
  const [startedScope, setStartedScope] = useState<string | null>(null);
  const [scanned, setScanned] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const lock = useRef<object | null>(null);
  const permissionBusy = useRef(false);
  const alive = useRef(true);
  const current = useRef({ scope, enabled: false, foreground, focused });
  const allowed = access?.scope === scope && canScanAdmissions(access.event, user);
  const enabled = Boolean(allowed && startedScope === scope && permission?.granted && focused && foreground);
  current.current = { scope, enabled, foreground, focused };
  const styles = getStyles();
  const close = () => { if (router.canGoBack()) router.back(); else router.replace('/(tabs)'); };

  useEffect(() => { alive.current = true; return () => { alive.current = false; lock.current = null; }; }, []);
  useEffect(() => {
    if (!foreground || !focused) {
      lock.current = null;
      setScanned(false);
      setScanning(false);
      setStartedScope(null);
    }
  }, [foreground, focused]);
  useEffect(() => {
    const listener = AppState.addEventListener('change', next => {
      setForeground(next === 'active');
      if (next !== 'active') setStartedScope(null);
    });
    return () => listener.remove();
  }, []);
  useEffect(() => {
    let cancelled = false;
    lock.current = null;
    setScanned(false);
    setScanning(false);
    setStartedScope(null);
    setCameraError('');
    if (!eventId || !owner) {
      setAccess({ scope, event: null, error: 'Abre el control de entrada desde el detalle de uno de tus eventos.' });
      return;
    }
    void eventService.getEventById(eventId).then(event => {
      if (!cancelled) setAccess({ scope, event });
    }).catch(() => {
      if (!cancelled) setAccess({ scope, event: null, error: 'No se pudo comprobar tu acceso. Regresa al evento e inténtalo de nuevo.' });
    });
    return () => { cancelled = true; };
  }, [scope, eventId, owner]);

  const startCamera = async () => {
    if (current.current.scope !== scope || !allowed || !foreground || !focused || permissionBusy.current) return;
    permissionBusy.current = true;
    setCameraError('');
    try {
      if (permission?.canAskAgain === false && !permission.granted) { await Linking.openSettings(); return; }
      const result = permission?.granted ? permission : await requestPermission();
      if (!alive.current || current.current.scope !== scope || !current.current.foreground || !current.current.focused) return;
      if (result.granted) setStartedScope(scope);
      else setCameraError('La cámara no está habilitada. Puedes conceder permiso cuando quieras o regresar al evento.');
    } catch {
      if (alive.current && current.current.scope === scope) setCameraError('No se pudo abrir la cámara. Inténtalo de nuevo.');
    } finally { permissionBusy.current = false; }
  };

  const handleBarCodeScanned = async ({ data }: { type: string; data: string }) => {
    if (current.current.scope !== scope || !enabled || !current.current.enabled || lock.current) return;
    const ticket = {};
    lock.current = ticket;
    setScanned(true);
    const valid = () => alive.current && current.current.scope === scope && current.current.enabled && lock.current === ticket;
    const reset = () => {
      if (!valid()) return;
      lock.current = null;
      setScanned(false);
      setScanning(false);
    };
    if (!isAdmissionCode(data)) {
      Alert.alert('Código no compatible', 'Escanea una entrada de EventNow. Un enlace u otro código QR no registra asistencia.', [{ text: 'Escanear otro', onPress: reset }], { cancelable: false });
      return;
    }
    setScanning(true);
    try {
      const result = await ticketService.validateByQR(data, eventId!);
      if (!valid()) return;
      setScanning(false);
      if (result.valid !== true) throw new Error(result.message || 'El servidor no confirmó la entrada.');
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      Alert.alert('Entrada registrada', `${result.message}\nEvento: ${access?.event?.title || 'Evento'}${result.orderNumber ? `\nEntrada: ${result.orderNumber}` : ''}${result.quantity ? `\nCantidad: ${result.quantity}` : ''}`, [
        { text: 'Escanear siguiente', onPress: reset }, { text: 'Listo', onPress: close },
      ], { cancelable: false });
    } catch (error: any) {
      if (!valid()) return;
      setScanning(false);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      const title = error instanceof AdmissionError && error.status === 409 ? 'Entrada no registrada de nuevo' : 'No se registró la entrada';
      Alert.alert(title, error.message || 'Comprueba tu conexión y el estado de la entrada antes de reintentar.', [
        { text: 'Escanear otro', onPress: reset }, { text: 'Volver', onPress: close },
      ], { cancelable: false });
    }
  };

  if (access?.scope !== scope) return <View style={styles.centerContainer}><ActivityIndicator color="#8b5cf6" /><Text style={styles.text}>Comprobando acceso al evento…</Text></View>;
  if (!allowed) return <View style={styles.centerContainer}><Ionicons name="lock-closed-outline" size={56} color="#8b5cf6" /><Text style={styles.text}>Control de entrada restringido</Text><Text style={styles.subText}>{access.error || 'Solo el organizador de este evento puede registrar entradas. El servidor verifica cada registro.'}</Text><TouchableOpacity accessibilityRole="button" style={styles.button} onPress={close}><Text style={styles.buttonText}>Volver al evento</Text></TouchableOpacity></View>;
  if (!enabled) return <View style={styles.centerContainer}>
    <Ionicons name="qr-code-outline" size={64} color="#8b5cf6" />
    <Text style={styles.text}>{access.event?.title}</Text>
    <Text style={styles.subText}>Cada escaneo registra una entrada en este evento. Activa la cámara para empezar; el servidor comprueba permisos y entradas ya utilizadas.</Text>
    {cameraError ? <Text accessibilityRole="alert" style={styles.subText}>{cameraError}</Text> : null}
    <TouchableOpacity accessibilityRole="button" style={styles.button} onPress={() => void startCamera()}><Text style={styles.buttonText}>{permission?.canAskAgain === false && !permission.granted ? 'Abrir ajustes de cámara' : 'Activar cámara'}</Text></TouchableOpacity>
    <TouchableOpacity accessibilityRole="button" style={[styles.button, { marginTop: 12 }]} onPress={close}><Text style={styles.buttonText}>Volver al evento</Text></TouchableOpacity>
  </View>;

  return <View style={styles.container}>
    <StatusBar barStyle="light-content" />
    <CameraView style={styles.camera} facing="back" onBarcodeScanned={scanned ? undefined : handleBarCodeScanned} barcodeScannerSettings={{ barcodeTypes: ['qr'] }} onMountError={() => { setStartedScope(null); setCameraError('La cámara no está disponible. Comprueba sus permisos e inténtalo de nuevo.'); }}>
      <View style={styles.header}><TouchableOpacity accessibilityRole="button" accessibilityLabel="Cerrar escáner" style={styles.closeButton} onPress={close}><Ionicons name="close" size={24} color="#fff" /></TouchableOpacity><View style={styles.headerTitleWrap}><Text style={styles.headerTitle}>Control de entrada</Text><Text style={styles.headerSub}>{access.event?.title}</Text></View></View>
      <View style={styles.overlay}><View style={styles.overlayTop} /><View style={styles.overlayMiddle}><View style={styles.overlaySide} /><View style={styles.scannerWindow}><View style={[styles.corner, styles.cornerTopLeft]} /><View style={[styles.corner, styles.cornerTopRight]} /><View style={[styles.corner, styles.cornerBottomLeft]} /><View style={[styles.corner, styles.cornerBottomRight]} />{!scanned && <View style={styles.scanLine} />}</View><View style={styles.overlaySide} /></View><View style={styles.overlayBottom}><View style={styles.instructionBadge}><Ionicons name={scanning ? 'sync' : 'qr-code'} size={18} color="#ec4899" /><Text style={styles.instructionText}>{scanning ? 'Registrando entrada en el servidor…' : 'Apunta al QR de la entrada'}</Text></View><Text style={styles.subInstructionText}>Espera la confirmación antes de permitir el acceso.</Text></View></View>
    </CameraView>
  </View>;
}

const getStyles = () => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0C0B10',
    padding: 24,
  },
  text: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 8,
  },
  subText: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 28,
    lineHeight: 20,
  },
  button: {
    backgroundColor: '#ec4899',
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 14,
    minWidth: 180,
    alignItems: 'center',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  camera: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 54,
    paddingBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  headerTitleWrap: {
    alignItems: 'center',
  },
  headerTitle: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '800',
  },
  headerSub: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
    marginTop: 2,
  },
  closeButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 22,
  },
  overlay: {
    flex: 1,
  },
  overlayTop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
  },
  overlayMiddle: {
    flexDirection: 'row',
    height: SCANNER_SIZE,
  },
  overlaySide: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
  },
  scannerWindow: {
    width: SCANNER_SIZE,
    height: SCANNER_SIZE,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  corner: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderColor: '#ec4899',
  },
  cornerTopLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopLeftRadius: 10,
  },
  cornerTopRight: {
    top: 0,
    right: 0,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopRightRadius: 10,
  },
  cornerBottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: 10,
  },
  cornerBottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: 10,
  },
  scanLine: {
    width: SCANNER_SIZE - 20,
    height: 2,
    backgroundColor: '#8b5cf6',
    shadowColor: '#ec4899',
    shadowOpacity: 0.8,
    shadowRadius: 8,
  },
  overlayBottom: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    alignItems: 'center',
    paddingTop: 28,
    paddingHorizontal: 20,
  },
  instructionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    marginBottom: 8,
  },
  instructionText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  subInstructionText: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 12,
    textAlign: 'center',
  },
});
