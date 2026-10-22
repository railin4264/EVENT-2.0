import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { useOrganizerReliability } from '../../hooks/useOrganizerReliability';

type Props = { organizerId: string; eventId: string; isPublic: boolean };
export default function OrganizerReliabilityPanel(props: Props) {
  const { user } = useAuth();
  if (!props.isPublic) return null;
  return <Content key={`${user?._id || user?.id || 'guest'}:${props.eventId}`} {...props} />;
}
function Content({ organizerId, eventId, isPublic }: Props) {
  const { stats, own, loading, saving, saved, error, save, load } = useOrganizerReliability(organizerId, eventId, isPublic);
  const [rating, setRating] = useState<number | null>(null), [comment, setComment] = useState('');
  const edited = useRef(false), initialized = useRef(false);
  useEffect(() => {
    if (initialized.current || !own) return;
    initialized.current = true;
    if (!edited.current && own.review) { setRating(own.review.rating); setComment(own.review.comment); }
  }, [own]);
  return <View style={styles.card} accessibilityLabel="Historial del anfitrión">
    <Text style={styles.eyebrow}>CONFIANZA CON DATOS</Text><Text style={styles.title}>Historial del anfitrión</Text><Text style={styles.note}>Eventos públicos · últimos 365 días</Text>
    {loading && <ActivityIndicator accessibilityLabel="Consultando historial" color="#c4b5fd" />}
    {stats && <View style={styles.metrics}>
      <Text style={styles.text}>{stats.withCheckIns} eventos con entradas registradas</Text>
      <Text style={styles.text}>{stats.markedCompleted} marcados finalizados</Text>
      <Text style={styles.text}>Cancelados: {stats.cancelled} de {stats.scheduled}{stats.cancellationRate === null ? '' : ` (${stats.cancellationRate}%)`}</Text>
      <Text style={styles.text}>{stats.reviews.average === null ? 'Aún no hay opiniones con entrada registrada' : `${stats.reviews.average}/5 · ${stats.reviews.count} opiniones con entrada registrada`}</Text>
      <Text style={styles.note}>{stats.methodology}</Text>
    </View>}
    {own && !own.eligible && <Text style={styles.note}>{own.reason}</Text>}
    {own?.eligible && <View style={styles.metrics}>
      <Text style={styles.text}>{own.review ? `Tu valoración actual: ${own.review.rating}/5. Puedes reemplazarla.` : '¿Cómo estuvo el evento?'}</Text>
      <View style={styles.stars}>{[1, 2, 3, 4, 5].map(value => <Pressable key={value} accessibilityRole="radio" accessibilityState={{ checked: rating === value }} accessibilityLabel={`${value} de 5 estrellas`} onPress={() => { edited.current = true; setRating(value); }} style={[styles.star, rating === value && styles.selected]}><Text style={styles.text}>{value} ★</Text></Pressable>)}</View>
      {rating === null && <Text style={styles.note}>Elige tu valoración para guardar la opinión.</Text>}
      <TextInput accessibilityLabel="Comentario opcional" placeholder="Comentario opcional, sin datos personales" placeholderTextColor="#94a3b8" style={styles.input} value={comment} onChangeText={value => { edited.current = true; setComment(value); }} maxLength={600} multiline />
      <Text style={styles.note}>La puntuación entra en el promedio público. Tu identidad y este comentario no se muestran en el resumen.</Text>
      <Pressable accessibilityRole="button" disabled={saving || rating === null} style={[styles.button, (saving || rating === null) && styles.disabled]} onPress={() => { if (rating !== null && Number.isInteger(rating) && rating >= 1 && rating <= 5) void save(rating, comment); }}><Text style={styles.text}>{saving ? 'Guardando…' : 'Guardar opinión'}</Text></Pressable>
    </View>}
    {saved && <Text accessibilityLiveRegion="polite" style={styles.note}>Opinión guardada. Cuenta una sola vez por evento.</Text>}
    {!!error && <View><Text accessibilityLiveRegion="polite" style={styles.error}>{error}</Text><Pressable accessibilityRole="button" onPress={() => void load()}><Text style={styles.eyebrow}>Reintentar</Text></Pressable></View>}
  </View>;
}
const styles = StyleSheet.create({ card: { marginVertical: 12, padding: 18, borderRadius: 24, backgroundColor: '#171526', borderWidth: 1, borderColor: '#332d48', gap: 10 }, title: { color: '#fff', fontSize: 19, fontWeight: '700' }, eyebrow: { color: '#c4b5fd', fontSize: 12, fontWeight: '700' }, note: { color: '#a8a5b7', fontSize: 12, lineHeight: 18 }, text: { color: '#f1f0f7', fontSize: 14 }, metrics: { gap: 12 }, stars: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' }, star: { padding: 10, borderRadius: 10, backgroundColor: '#302840' }, selected: { backgroundColor: '#7c3aed' }, input: { minHeight: 85, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#484052', color: '#fff', textAlignVertical: 'top' }, button: { padding: 14, borderRadius: 12, backgroundColor: '#7c3aed', alignItems: 'center' }, disabled: { opacity: 0.5 }, error: { color: '#fca5a5', fontSize: 13 } });
