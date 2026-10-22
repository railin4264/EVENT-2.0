import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, Linking, Share } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import { discoveryAppearance } from '@/constants/discoveryAppearance';
import { hospitalityPlan, type HospitalityEvent } from '@/utils/hospitalityPlan';

export default function EventHospitalityPanel({ event, onOpenSerrucho }: { event: HospitalityEvent; onOpenSerrucho: () => void }) {
  const { isDark } = useTheme();
  const colors = discoveryAppearance(isDark);
  const [stayOptions, setStayOptions] = useState({ nightsBefore: 0, nightsAfter: 1, guests: 4 });
  const plan = hospitalityPlan(event, stayOptions);
  const [error, setError] = useState('');
  async function open(url: string) {
    try { setError(''); await Linking.openURL(url); }
    catch { setError('No se pudo abrir el servicio. Inténtalo de nuevo.'); }
  }
  async function share() {
    try { setError(''); await Share.share({ message: [event.title, plan.venue, plan.destination, plan.uber].filter(Boolean).join('\n') }); }
    catch { setError('No se pudo compartir la ubicación. Inténtalo de nuevo.'); }
  }
  function paragraph(text: string) { return <Text style={[styles.description, { color: colors.muted }]}>{text}</Text>; }
  function heading(icon: React.ComponentProps<typeof Ionicons>['name'], text: string) {
    return <View style={styles.heading}><Ionicons name={icon} size={21} color={colors.accent} /><Text style={[styles.subheading, { color: colors.text }]}>{text}</Text></View>;
  }
  function button(label: string, url: string | null, primary = false) {
    return <Pressable accessibilityRole="link" accessibilityLabel={`${label}, servicio externo`} accessibilityState={{ disabled: !url }} disabled={!url} onPress={() => url && void open(url)} style={({ pressed }) => [styles.button, { backgroundColor: primary ? colors.accent : colors.elevated, borderColor: primary ? colors.accent : colors.border, opacity: !url ? 0.45 : pressed ? 0.7 : 1 }]}>
      <Text style={[styles.buttonLabel, { color: primary ? colors.onAccent : colors.text }]}>{label}</Text><Ionicons name="open-outline" size={16} color={primary ? colors.onAccent : colors.muted} />
    </Pressable>;
  }
  return <View style={styles.wrapper}>
    {(event.isRecurring || event.isCommercialDeal || event.isTourOrTrip) && <View style={[styles.card, { backgroundColor: colors.elevated, borderColor: colors.border }]}>
      {event.isRecurring && <View style={styles.block}>{heading('repeat-outline', 'Actividad recurrente')}<Text style={[styles.detail, { color: colors.text }]}>{plan.recurrence}</Text>{paragraph('Confirma la próxima sesión y el horario antes de salir.')}</View>}
      {event.isCommercialDeal && <View style={styles.block}>{heading('pricetag-outline', event.commercialBrand || 'Promoción comercial')}{paragraph(event.commercialOffer || 'Consulta los beneficios y condiciones con el organizador.')}</View>}
      {event.isTourOrTrip && <View style={styles.block}>{heading('compass-outline', 'Antes de partir')}{!plan.reserved && event.tourDetails?.departurePoint && paragraph(`Salida: ${event.tourDetails.departurePoint}`)}{event.tourDetails?.includes?.map((item, index) => <View key={index} style={styles.includes}><Ionicons name="checkmark" size={17} color={colors.accent} /><Text style={[styles.includeText, { color: colors.muted }]}>{item}</Text></View>)}</View>}
    </View>}
    <View style={[styles.card, { backgroundColor: colors.elevated, borderColor: colors.border }]}>
      <Text style={[styles.eyebrow, { color: colors.accent }]}>Tu plan, bien organizado</Text>
      <Text style={[styles.title, { color: colors.text }]}>Llega fácil.{ '\n' }Quédate cerca.</Text>
      {paragraph('Transporte para llegar y opciones para quedarte con tu coro.')}
      <View style={[styles.destination, { backgroundColor: colors.surface }]}><Ionicons name="location-outline" size={22} color={colors.accent} /><View style={styles.flex}><Text style={[styles.detail, { color: colors.text }]}>{plan.reserved ? 'Ubicación reservada' : plan.venue || 'Lugar por confirmar'}</Text>{!!plan.destination && paragraph(plan.destination)}</View>{plan.uber && <Pressable accessibilityRole="button" accessibilityLabel="Compartir ubicación" onPress={() => void share()} style={styles.share}><Ionicons name="share-outline" size={21} color={colors.accent} /></Pressable>}</View>
      <View style={styles.block}>{heading('car-outline', 'Cómo llegar')}{paragraph(plan.reserved ? 'El transporte estará disponible cuando la ubicación sea pública.' : plan.uber ? 'Consulta el viaje y su precio antes de solicitarlo en Uber.' : 'El organizador todavía debe confirmar el destino.')}{button('Abrir Uber', plan.uber, true)}</View>
      <View style={[styles.divider, { borderColor: colors.border }]} />
      <View style={styles.block}>{heading('home-outline', '¿Te quedas por la zona?')}{paragraph(plan.destination ? `Busca alojamiento en ${plan.destination}. Airbnb abre una búsqueda para ${plan.guests} personas; puedes ajustar el grupo.` : 'Las opciones se activarán cuando se publique la ciudad.')}{!!plan.stay && paragraph(`Fechas sugeridas: ${plan.stay}. Ajústalas antes de reservar.`)}{!!plan.stay && <View style={{ gap: 8 }}>{([
        ['nightsBefore', 'Llegar antes', 3], ['nightsAfter', 'Noches al terminar', 7], ['guests', 'Adultos', 16],
      ] as const).map(([key, label, max]) => <View key={key} style={styles.heading}><Text style={[styles.includeText, { color: colors.muted }]}>{label}: {stayOptions[key]}</Text><Pressable accessibilityRole="button" accessibilityLabel={`Reducir ${label}`} disabled={stayOptions[key] <= (key === 'nightsBefore' ? 0 : 1)} onPress={() => setStayOptions(current => ({ ...current, [key]: Math.max(key === 'nightsBefore' ? 0 : 1, current[key] - 1) }))} style={styles.share}><Ionicons name="remove" size={21} color={colors.accent} /></Pressable><Pressable accessibilityRole="button" accessibilityLabel={`Aumentar ${label}`} disabled={stayOptions[key] >= max} onPress={() => setStayOptions(current => ({ ...current, [key]: Math.min(max, current[key] + 1) }))} style={styles.share}><Ionicons name="add" size={21} color={colors.accent} /></Pressable></View>)}</View>}{button(`Airbnb · ${plan.guests} personas`, plan.airbnb)}{button('Booking.com', plan.booking)}{button('Trivago', plan.trivago)}</View>
      <View style={[styles.divider, { borderColor: colors.border }]} />
      <View style={styles.block}>{heading('people-outline', 'Los gastos, entre todos')}{paragraph('Calcula cuánto aporta cada persona al plan.')}<Pressable accessibilityRole="button" onPress={onOpenSerrucho} style={({ pressed }) => [styles.button, { borderColor: colors.border, backgroundColor: colors.surface, opacity: pressed ? 0.7 : 1 }]}><Text style={[styles.buttonLabel, { color: colors.text }]}>Dividir Serrucho</Text><Ionicons name="arrow-forward" size={17} color={colors.accent} /></Pressable></View>
      <Text style={[styles.footnote, { color: colors.muted }]}>Los enlaces abren servicios externos. Revisa allí las fechas, disponibilidad y tarifas.</Text>
      {!!error && <Text accessibilityRole="alert" style={[styles.description, { color: colors.error }]}>{error}</Text>}
    </View>
  </View>;
}

const styles = StyleSheet.create({
  wrapper: { gap: 14, marginBottom: 20 },
  card: { borderRadius: 24, borderWidth: 1, padding: 20, gap: 10 },
  eyebrow: { fontSize: 12, fontWeight: '600', letterSpacing: 0.4 },
  title: { fontSize: 28, lineHeight: 34, fontWeight: '700', letterSpacing: -0.6 },
  description: { fontSize: 14, lineHeight: 22 },
  destination: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, borderRadius: 16, padding: 14, marginTop: 8 },
  flex: { flex: 1 },
  detail: { fontSize: 15, fontWeight: '600', lineHeight: 23 },
  share: { minHeight: 44, minWidth: 44, alignItems: 'center', justifyContent: 'center' },
  block: { gap: 10, paddingVertical: 10 },
  heading: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  subheading: { flex: 1, fontSize: 17, lineHeight: 24, fontWeight: '600' },
  button: { minHeight: 50, paddingVertical: 13, paddingHorizontal: 16, borderWidth: 1, borderRadius: 13, flexDirection: 'row', alignItems: 'center', gap: 10 },
  buttonLabel: { flex: 1, fontSize: 14, lineHeight: 21, fontWeight: '600' },
  divider: { borderTopWidth: 1, marginVertical: 4 },
  footnote: { fontSize: 12, lineHeight: 19 },
  includes: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  includeText: { flex: 1, fontSize: 14, lineHeight: 21 },
});
