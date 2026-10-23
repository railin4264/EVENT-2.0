import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Image,
  ActivityIndicator,
} from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { Input, Button, Card } from '@/components/ui';
import { theme } from '@/theme';
import * as ImagePicker from 'expo-image-picker';
import { api } from '@/services/api';
import { buildMobileEventPayload } from '@/utils/planningDraft';

const createEventSchema = z.object({
  title: z.string().min(3, 'El título debe tener al menos 3 caracteres'),
  description: z
    .string()
    .min(10, 'La descripción debe tener al menos 10 caracteres'),
  category: z.string().min(1, 'Selecciona una categoría'),
  date: z.string().min(1, 'La fecha es requerida'),
  time: z.string().min(1, 'La hora es requerida'),
  location: z.string().min(3, 'La ubicación es requerida'),
  price: z.string().optional(),
  capacity: z.string().optional(),
});

type CreateEventForm = z.infer<typeof createEventSchema>;

const CATEGORIES = [
  {
    id: 'music',
    label: 'Música',
    icon: 'musical-notes',
    gradient: theme.gradients.music,
  },
  {
    id: 'sports',
    label: 'Deportes',
    icon: 'football',
    gradient: theme.gradients.sports,
  },
  {
    id: 'technology',
    label: 'Tecnología',
    icon: 'laptop',
    gradient: theme.gradients.technology,
  },
  {
    id: 'art',
    label: 'Arte',
    icon: 'color-palette',
    gradient: theme.gradients.art,
  },
  {
    id: 'food',
    label: 'Comida',
    icon: 'restaurant',
    gradient: theme.gradients.food,
  },
  {
    id: 'business',
    label: 'Negocios',
    icon: 'briefcase',
    gradient: theme.gradients.business,
  },
];

export default function CreateEventScreen() {
  const { user } = useAuth();
  return <OwnedCreateEvent key={user?._id || user?.id || ''} />;
}
function OwnedCreateEvent() {
  const router = useRouter();
  const { user } = useAuth();
  const { draft } = useLocalSearchParams<{ draft?: string }>();
  const owner = user?._id || user?.id || '';
  const alive = useRef(true),
    submitLock = useRef(false);
  const [importFields, setImportFields] = useState<any>(null);
  const [imported, setImported] = useState(false);
  const [details, setDetails] = useState({
    timeZone: '',
    latitude: '',
    longitude: '',
    city: '',
    country: '',
    currency: 'DOP',
  });
  useEffect(() => {
    alive.current = true;
    let current = true;
    setImportFields(null);
    setImported(false);
    if (draft && /^[a-f\d]{24}$/i.test(draft) && owner)
      api
        .get(`/planning-tools/drafts/${draft}`)
        .then(r => {
          if (current && alive.current && r.data.success)
            setImportFields(r.data.data.fields);
        })
        .catch(() => {
          if (current && alive.current)
            Alert.alert(
              'Borrador no disponible',
              'Abre un borrador guardado en tu cuenta.'
            );
        });
    return () => {
      current = false;
      alive.current = false;
    };
  }, [draft, owner]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [eventImage, setEventImage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [insights, setInsights] = useState<any>(null);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [friendDraftText, setFriendDraftText] = useState('');
  const [isParsingDraft, setIsParsingDraft] = useState(false);
  const [draftParsedSuccess, setDraftParsedSuccess] = useState(false);
  const [textPlanPrivate, setTextPlanPrivate] = useState(true);
  const friendDraftRequest = useRef(0);

  const {
    control,
    handleSubmit,
    formState: { errors },
    setValue,
  } = useForm<CreateEventForm>({
    resolver: zodResolver(createEventSchema),
    defaultValues: {
      title: '',
      description: '',
      category: '',
      date: '',
      time: '',
      location: '',
      price: '',
      capacity: '',
    },
  });

  const handleSelectCategory = (categoryId: string) => {
    setSelectedCategory(categoryId);
    setValue('category', categoryId);
  };

  // Creator tool: load real audience insights for the user's zone so they can
  // see what resonates before publishing.
  const loadInsights = async () => {
    setInsightsLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setInsights({
          hasData: false,
          message: 'Activa la ubicación para ver insights de tu zona.',
        });
        return;
      }
      const loc = await Location.getCurrentPositionAsync({});
      const res = await api.get('/analytics/audience-insights', {
        params: {
          lat: loc.coords.latitude,
          lng: loc.coords.longitude,
          radius: 25,
        },
      });
      setInsights(res.data?.data || res.data || null);
    } catch {
      setInsights({
        hasData: false,
        message: 'No pudimos cargar insights ahora. Intenta de nuevo.',
      });
    } finally {
      setInsightsLoading(false);
    }
  };

  useEffect(() => {
    loadInsights();
  }, []);

  const handlePickImage = async () => {
    const permissionResult =
      await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (permissionResult.granted === false) {
      Alert.alert(
        'Permiso denegado',
        'Necesitas dar permiso para acceder a tus fotos'
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    });

    if (!result.canceled) {
      setEventImage(result.assets[0].uri);
    }
  };

  const handleExtractFriendDraft = async () => {
    const text = friendDraftText.trim();
    if (!text || text.length > 10000) {
      Alert.alert('Texto requerido', 'Pega entre 1 y 10.000 caracteres del anuncio.');
      return;
    }
    const ticket = ++friendDraftRequest.current;
    setIsParsingDraft(true);
    try {
      const res = await api.post('/sources/friend-draft', { text });
      if (!alive.current || ticket !== friendDraftRequest.current) return;
      if (!res.data?.success || !res.data.draft) throw Error('No se pudo preparar el borrador.');
      const d = res.data.draft;
      Alert.alert(
        'Revisa el borrador',
        `Fecha: ${d.localDate || 'por confirmar'}\nHora: ${d.localTime || 'por confirmar'}\nZona horaria: ${d.timeZone || 'por confirmar'}\nLugar: ${d.venue || 'por confirmar'}\nPrecio: ${d.estimatedBudget || 'por confirmar'}\n\nAplicar reemplaza estos campos. Debes confirmar coordenadas, precio y moneda antes de publicar.`,
        [{ text: 'Cancelar', style: 'cancel' }, { text: 'Aplicar', onPress: () => {
          if (!alive.current || ticket !== friendDraftRequest.current) return;
          if (d.title) setValue('title', d.title);
          if (d.description) setValue('description', d.description);
          setValue('date', d.localDate || ''); setValue('time', d.localTime || '');
          setValue('location', d.venue || ''); setValue('price', '');
          setDetails(old => ({ ...old, timeZone: d.timeZone || '', latitude: '', longitude: '', city: '', country: '', currency: '' }));
          if (d.category) { setSelectedCategory(d.category); setValue('category', d.category); }
          setTextPlanPrivate(true); setDraftParsedSuccess(true);
        } }]
      );
    } catch (err: any) {
      if (alive.current && ticket === friendDraftRequest.current)
        Alert.alert('Error', err.response?.data?.message || err.message || 'No se pudo preparar el borrador.');
    } finally {
      if (alive.current && ticket === friendDraftRequest.current) setIsParsingDraft(false);
    }
  };

  // Reads a flyer photo (and any pasted text) on the server; only what the flyer states fills the form.
  const [isReadingFlyer, setIsReadingFlyer] = useState(false);
  const handleReadFlyer = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permiso denegado', 'Necesitas dar permiso para acceder a tus fotos');
      return;
    }
    const picked = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.8 });
    if (picked.canceled || !picked.assets?.[0]) return;
    const asset = picked.assets[0];
    const ticket = ++friendDraftRequest.current;
    setIsReadingFlyer(true);
    try {
      const form = new FormData();
      form.append('eventImage', { uri: asset.uri, name: asset.fileName || 'afiche.jpg', type: asset.mimeType || 'image/jpeg' } as any);
      if (friendDraftText.trim()) form.append('text', friendDraftText.trim());
      const res = await api.post('/events/ai-extract-flyer', form, { headers: { 'Content-Type': 'multipart/form-data' } });
      if (!alive.current || ticket !== friendDraftRequest.current) return;
      const f = res.data?.data;
      if (!res.data?.success || !f) throw Error('No se pudo leer el afiche.');
      const place = [f.venue, f.address].filter(Boolean).join(', ');
      const price = f.price ? (f.price.isFree ? 'Gratis' : `${f.price.amount}${f.price.currency ? ' ' + f.price.currency : ' (moneda por confirmar)'}`) : 'por confirmar';
      Alert.alert(
        'Revisa lo que dice el afiche',
        `Título: ${f.title || 'por confirmar'}\nFecha: ${f.date || 'por confirmar'}\nHora: ${f.time || 'por confirmar'}\nLugar: ${place || 'por confirmar'}\nPrecio: ${price}\n\nAplicar llena solo lo que el afiche indica. No se publica al aplicar.`,
        [{ text: 'Cancelar', style: 'cancel' }, { text: 'Aplicar', onPress: () => {
          if (!alive.current || ticket !== friendDraftRequest.current) return;
          if (f.title) setValue('title', f.title);
          if (f.description) setValue('description', f.description);
          if (f.date) setValue('date', f.date);
          if (f.time) setValue('time', f.time);
          if (place) setValue('location', place);
          if (f.price) setValue('price', String(f.price.amount));
          setDetails(old => ({ ...old, city: f.city || old.city, currency: f.price?.currency || old.currency }));
          if (f.category) { setSelectedCategory(f.category); setValue('category', f.category); }
          setEventImage(asset.uri);
        } }]
      );
    } catch (err: any) {
      if (alive.current && ticket === friendDraftRequest.current)
        Alert.alert('No se pudo leer el afiche', err.response?.data?.message || err.message || 'Pega el texto del anuncio y vuelve a intentarlo.');
    } finally {
      if (alive.current && ticket === friendDraftRequest.current) setIsReadingFlyer(false);
    }
  };

  const onSubmit = async (data: CreateEventForm) => {
    if (!alive.current || !user || submitLock.current) return;
    submitLock.current = true;
    setIsSubmitting(true);
    try {
      if (draftParsedSuccess && !data.price?.trim()) throw Error('Confirma el precio del anuncio. Escribe 0 únicamente si la entrada es gratuita.');
      const payload = { ...buildMobileEventPayload(data, details), ...(draftParsedSuccess ? { isPrivate: textPlanPrivate } : {}) };
      let images: { url: string }[] = [];
      if (eventImage) {
        const formData = new FormData();
        const filename = eventImage.split('/').pop() || 'event.jpg';
        formData.append('eventImages', {
          uri: eventImage,
          name: filename,
          type: /\.png$/i.test(filename) ? 'image/png' : 'image/jpeg',
        } as any);
        const uploaded = await api.post('/upload/event-images', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        if (
          !uploaded.data.success ||
          !Array.isArray(uploaded.data.data) ||
          !uploaded.data.data.length ||
          !uploaded.data.data.every(
            (image: any) => typeof image.url === 'string'
          )
        )
          throw Error(
            'No se pudo subir la imagen. Reintenta o retira la imagen seleccionada.'
          );
        images = uploaded.data.data;
      }
      if (!alive.current) return;
      const response = await api.post('/events', { ...payload, images });
      if (!response.data.success)
        throw Error(response.data.message || 'No se pudo crear el evento.');
      if (alive.current)
        Alert.alert(
          'Solicitud guardada',
          'El servidor guardó el evento. Su publicación depende de la revisión y las reglas de la plataforma.',
          [{ text: 'Continuar', onPress: () => router.back() }]
        );
    } catch (error: any) {
      if (alive.current)
        Alert.alert(
          'Revisa tu evento',
          error.response?.data?.message ||
            error.message ||
            'No se pudo crear el evento'
        );
    } finally {
      submitLock.current = false;
      if (alive.current) setIsSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Background Gradient */}
      <LinearGradient
        colors={['#0C0B10', '#1a1625', '#0C0B10']}
        style={styles.backgroundGradient}
      />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <View style={[styles.iconButton, theme.glass.medium]}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </View>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Crear Evento</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {importFields && !imported && (
          <Card variant="glass" padding={20} style={styles.formCard}>
            <Text style={styles.sectionTitle}>
              Borrador privado: {importFields.title || 'Sin título'}
            </Text>
            <Text style={styles.uploadSubtext}>
              Revisa y aplica los campos. No se publica ni se elimina tu
              borrador.
            </Text>
            <Button
              onPress={() =>
                Alert.alert(
                  '¿Aplicar este borrador?',
                  'Reemplazará los campos coincidentes que ya hayas escrito.',
                  [
                    { text: 'Cancelar', style: 'cancel' },
                    {
                      text: 'Aplicar',
                      onPress: () => {
                        if (!alive.current) return;
                        if (importFields.title)
                          setValue('title', importFields.title);
                        if (importFields.description)
                          setValue('description', importFields.description);
                        if (importFields.date)
                          setValue('date', importFields.date);
                        if (importFields.time)
                          setValue('time', importFields.time);
                        if (importFields.address)
                          setValue('location', importFields.address);
                        if (importFields.amount !== undefined)
                          setValue('price', String(importFields.amount));
                        setDetails(old => ({
                          ...old,
                          timeZone: importFields.timeZone || '',
                          city: importFields.city || old.city,
                          country: importFields.country || old.country,
                          currency: importFields.currency || old.currency,
                        }));
                        setImported(true);
                      },
                    },
                  ]
                )
              }
            >
              Aplicar borrador revisado
            </Button>
          </Card>
        )}
        <Card variant="glass" padding={20} style={styles.formCard}>
          <Text style={styles.sectionTitle}>Horario y ubicación reales</Text>
          <Text style={styles.uploadSubtext}>
            Confirma zona horaria IANA, ciudad, país y coordenadas del lugar. No
            usamos ubicación automática ni estimaciones.
          </Text>
          {Object.entries({
            timeZone: 'Zona horaria (ej. America/Santo_Domingo)',
            latitude: 'Latitud real',
            longitude: 'Longitud real',
            city: 'Ciudad',
            country: 'País',
            currency: 'Moneda (ej. DOP, USD, EUR, JPY)',
          }).map(([key, label]) => (
            <Input
              key={key}
              label={label}
              value={(details as any)[key]}
              onChangeText={value =>
                setDetails(old => ({ ...old, [key]: value }))
              }
              variant="glass"
            />
          ))}
        </Card>
        {/* Hero Section - Image Upload */}
        <Card variant="glass" glassIntensity="medium" style={styles.imageCard}>
          <TouchableOpacity
            style={styles.imageUploadContainer}
            onPress={handlePickImage}
          >
            {eventImage ? (
              <Image source={{ uri: eventImage }} style={styles.eventImage} />
            ) : (
              <View style={styles.imagePlaceholder}>
                <LinearGradient
                  colors={theme.gradients.primaryCTA as any}
                  style={styles.uploadIconContainer}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Ionicons name="image" size={32} color="#fff" />
                </LinearGradient>
                <Text style={styles.uploadText}>Subir imagen del evento</Text>
                <Text style={styles.uploadSubtext}>
                  Recomendado: 1200x675px
                </Text>
              </View>
            )}
            {eventImage && (
              <View style={styles.changeImageButton}>
                <Ionicons name="camera" size={20} color="#fff" />
                <Text style={styles.changeImageText}>Cambiar</Text>
              </View>
            )}
          </TouchableOpacity>
        </Card>

        {eventImage && (
          <Button onPress={() => setEventImage(null)}>
            Retirar imagen seleccionada
          </Button>
        )}

        {/* Quick Friend Coro Draft Auto-Fill Card */}
        <Card
          variant="glass"
          glassIntensity="strong"
          padding={20}
          style={{ ...styles.formCard, borderColor: 'rgba(99, 102, 241, 0.4)', borderWidth: 1 }}
        >
          <View style={styles.sectionHeader}>
            <Ionicons
              name="flash"
              size={24}
              color={theme.colors.secondary || '#8B5CF6'}
            />
            <Text style={styles.sectionTitle}>Tu anuncio, listo para revisar</Text>
          </View>
          <Text style={{ color: theme.colors.textSecondary, fontSize: 13, marginBottom: 12, lineHeight: 18 }}>
            Pega el texto de tu plan. Solo se recuperan datos escritos explícitamente; completa lo que falte. Las imágenes todavía no se procesan aquí.
          </Text>
          <Input
            label="Texto del Anuncio o Coro"
            placeholder="Ej: Coro este sábado 8pm en Zona Colonial, cerveza fría y buena música..."
            value={friendDraftText}
            onChangeText={value => { friendDraftRequest.current++; setFriendDraftText(value); setIsParsingDraft(false); }}
            maxLength={10000}
            variant="glass"
            glassIntensity="light"
            multiline
            numberOfLines={3}
            containerStyle={{ marginBottom: 12 }}
          />
          <Button
            variant="secondary"
            loading={isParsingDraft}
            disabled={isParsingDraft || !friendDraftText.trim()}
            icon="sparkles"
            onPress={handleExtractFriendDraft}
          >
            {draftParsedSuccess ? 'Revisar otro texto' : 'Preparar borrador'}
          </Button>
          <Button
            variant="secondary"
            loading={isReadingFlyer}
            disabled={isReadingFlyer || isParsingDraft}
            icon="image"
            onPress={handleReadFlyer}
            style={{ marginTop: 10 }}
          >
            Leer afiche (foto)
          </Button>
          {draftParsedSuccess && <>
            <Text style={{ color: theme.colors.textSecondary, marginTop: 12, lineHeight: 20 }}>Confirma fecha, zona horaria, ubicación, precio y moneda en el formulario. No se publica al aplicar.</Text>
            <TouchableOpacity accessibilityRole="switch" accessibilityLabel="Plan privado" accessibilityState={{ checked: textPlanPrivate }} onPress={() => setTextPlanPrivate(value => !value)} style={{ minHeight: 44, justifyContent: 'center', marginTop: 8 }}>
              <Text style={{ color: theme.colors.text }}>{textPlanPrivate ? 'Visibilidad: privado' : 'Visibilidad: público, sujeto a revisión'}</Text>
            </TouchableOpacity>
          </>}
        </Card>

        {/* Basic Info */}
        <Card
          variant="glass"
          glassIntensity="medium"
          padding={20}
          style={styles.formCard}
        >
          <View style={styles.sectionHeader}>
            <Ionicons
              name="information-circle"
              size={24}
              color={theme.colors.primary}
            />
            <Text style={styles.sectionTitle}>Información Básica</Text>
          </View>

          <Controller
            control={control}
            name="title"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Título del Evento"
                placeholder="Ej: Concierto de Rock 2024"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.title?.message}
                leftIcon="text-outline"
                variant="glass"
                glassIntensity="light"
              />
            )}
          />

          <Controller
            control={control}
            name="description"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Descripción"
                placeholder="Describe tu evento..."
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.description?.message}
                leftIcon="document-text-outline"
                multiline
                numberOfLines={4}
                variant="glass"
                glassIntensity="light"
                style={{ height: 100 }}
              />
            )}
          />
        </Card>

        {/* Category Selection */}
        <Card
          variant="glass"
          glassIntensity="medium"
          padding={20}
          style={styles.formCard}
        >
          <View style={styles.sectionHeader}>
            <Ionicons name="apps" size={24} color={theme.colors.primary} />
            <Text style={styles.sectionTitle}>Categoría</Text>
          </View>

          <View style={styles.categoriesGrid}>
            {CATEGORIES.map(category => (
              <TouchableOpacity
                key={category.id}
                style={[
                  styles.categoryItem,
                  selectedCategory === category.id &&
                    styles.categoryItemSelected,
                ]}
                onPress={() => handleSelectCategory(category.id)}
              >
                <LinearGradient
                  colors={
                    (selectedCategory === category.id
                      ? category.gradient
                      : [
                          'rgba(255,255,255,0.05)',
                          'rgba(255,255,255,0.05)',
                        ]) as any
                  }
                  style={styles.categoryGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Ionicons
                    name={category.icon as any}
                    size={24}
                    color={
                      selectedCategory === category.id
                        ? '#fff'
                        : 'rgba(255,255,255,0.6)'
                    }
                  />
                  <Text
                    style={[
                      styles.categoryLabel,
                      selectedCategory === category.id &&
                        styles.categoryLabelSelected,
                    ]}
                  >
                    {category.label}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            ))}
          </View>
          {errors.category && (
            <Text style={styles.errorText}>{errors.category.message}</Text>
          )}

          {/* Creator tool: audience insights for the zone */}
          <View style={styles.insightsBox}>
            <View style={styles.insightsHeader}>
              <Ionicons
                name="analytics"
                size={18}
                color={theme.colors.primary}
              />
              <Text style={styles.insightsTitle}>Insights de tu zona</Text>
              <TouchableOpacity
                onPress={loadInsights}
                disabled={insightsLoading}
              >
                <Ionicons
                  name="refresh"
                  size={16}
                  color={theme.colors.primary}
                />
              </TouchableOpacity>
            </View>

            {insightsLoading && (
              <View style={styles.insightsRow}>
                <ActivityIndicator size="small" color={theme.colors.primary} />
                <Text style={styles.insightsHint}>Analizando tu zona…</Text>
              </View>
            )}

            {!insightsLoading && insights && !insights.hasData && (
              <Text style={styles.insightsHint}>
                {insights.message || 'Sin datos en tu zona aún.'}
              </Text>
            )}

            {!insightsLoading && insights && insights.hasData && (
              <View>
                {insights.topCategories?.length > 0 && (
                  <View style={styles.insightsRow}>
                    <Text style={styles.insightsLabel}>
                      Categorías que dominan:
                    </Text>
                    <View style={styles.chipRow}>
                      {insights.topCategories.map((c: any) => (
                        <View key={c.category} style={styles.insightChip}>
                          <Text style={styles.insightChipText}>
                            {c.label} {c.share}%
                          </Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}
                {insights.bestDays?.length > 0 && (
                  <View style={styles.insightsRow}>
                    <Text style={styles.insightsLabel}>Mejores días:</Text>
                    <Text style={styles.insightsValue}>
                      {insights.bestDays.join(', ')}
                    </Text>
                  </View>
                )}
                {insights.priceBand && (
                  <View style={styles.insightsRow}>
                    <Text style={styles.insightsLabel}>Precio sugerido:</Text>
                    <Text style={styles.insightsValue}>
                      {insights.priceBand.recommendation}
                    </Text>
                  </View>
                )}
                {typeof insights.audienceConcentration === 'number' && (
                  <View style={styles.insightsRow}>
                    <Text style={styles.insightsLabel}>
                      Audiencia en la zona:
                    </Text>
                    <Text style={styles.insightsValue}>
                      {insights.audienceConcentration} asistentes ·{' '}
                      {insights.eventCount} eventos
                    </Text>
                  </View>
                )}
              </View>
            )}
          </View>
        </Card>

        {/* Date & Time */}
        <Card
          variant="glass"
          glassIntensity="medium"
          padding={20}
          style={styles.formCard}
        >
          <View style={styles.sectionHeader}>
            <Ionicons name="calendar" size={24} color={theme.colors.primary} />
            <Text style={styles.sectionTitle}>Fecha y Hora</Text>
          </View>

          <View style={styles.row}>
            <View style={styles.halfWidth}>
              <Controller
                control={control}
                name="date"
                render={({ field: { onChange, onBlur, value } }) => (
                  <Input
                    label="Fecha"
                    placeholder="AAAA-MM-DD"
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    error={errors.date?.message}
                    leftIcon="calendar-outline"
                    variant="glass"
                    glassIntensity="light"
                  />
                )}
              />
            </View>
            <View style={styles.halfWidth}>
              <Controller
                control={control}
                name="time"
                render={({ field: { onChange, onBlur, value } }) => (
                  <Input
                    label="Hora"
                    placeholder="HH:MM"
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    error={errors.time?.message}
                    leftIcon="time-outline"
                    variant="glass"
                    glassIntensity="light"
                  />
                )}
              />
            </View>
          </View>
        </Card>

        {/* Location */}
        <Card
          variant="glass"
          glassIntensity="medium"
          padding={20}
          style={styles.formCard}
        >
          <View style={styles.sectionHeader}>
            <Ionicons name="location" size={24} color={theme.colors.primary} />
            <Text style={styles.sectionTitle}>Ubicación</Text>
          </View>

          <Controller
            control={control}
            name="location"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Dirección"
                placeholder="Calle, Ciudad, País"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.location?.message}
                leftIcon="location-outline"
                variant="glass"
                glassIntensity="light"
              />
            )}
          />
        </Card>

        {/* Additional Info */}
        <Card
          variant="glass"
          glassIntensity="medium"
          padding={20}
          style={styles.formCard}
        >
          <View style={styles.sectionHeader}>
            <Ionicons name="settings" size={24} color={theme.colors.primary} />
            <Text style={styles.sectionTitle}>Información Adicional</Text>
          </View>

          <View style={styles.row}>
            <View style={styles.halfWidth}>
              <Controller
                control={control}
                name="price"
                render={({ field: { onChange, onBlur, value } }) => (
                  <Input
                    label="Precio"
                    placeholder="Gratis o $0.00"
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    error={errors.price?.message}
                    leftIcon="cash-outline"
                    keyboardType="numeric"
                    variant="glass"
                    glassIntensity="light"
                  />
                )}
              />
            </View>
            <View style={styles.halfWidth}>
              <Controller
                control={control}
                name="capacity"
                render={({ field: { onChange, onBlur, value } }) => (
                  <Input
                    label="Capacidad"
                    placeholder="Ilimitado o 100"
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    error={errors.capacity?.message}
                    leftIcon="people-outline"
                    keyboardType="numeric"
                    variant="glass"
                    glassIntensity="light"
                  />
                )}
              />
            </View>
          </View>
        </Card>

        {/* Submit Button */}
        <View style={styles.submitContainer}>
          <Button
            variant="primary"
            size="lg"
            onPress={handleSubmit(onSubmit)}
            loading={isSubmitting}
            gradient={theme.gradients.primaryCTA as any}
            icon="checkmark-circle"
          >
            {isSubmitting ? 'Creando Evento...' : 'Crear Evento'}
          </Button>
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  backgroundGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
  },
  backButton: {
    zIndex: 10,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    position: 'absolute',
    left: 0,
    right: 0,
    textAlign: 'center',
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  imageCard: {
    marginBottom: 16,
    overflow: 'hidden',
  },
  imageUploadContainer: {
    width: '100%',
    height: 200,
    borderRadius: 16,
    overflow: 'hidden',
  },
  eventImage: {
    width: '100%',
    height: '100%',
    borderRadius: 16,
  },
  imagePlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
  },
  uploadIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  uploadText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginTop: 8,
  },
  uploadSubtext: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.5)',
    marginTop: 4,
  },
  insightsBox: {
    marginTop: 18,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
  insightsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  insightsTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
  insightsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 10,
  },
  insightsLabel: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.5)',
    marginRight: 4,
  },
  insightsValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
    flexShrink: 1,
  },
  insightsHint: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 4,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  insightChip: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  insightChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  changeImageButton: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  changeImageText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  formCard: {
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  categoryItem: {
    width: '31%',
    aspectRatio: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  categoryItemSelected: {
    transform: [{ scale: 1.05 }],
  },
  categoryGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  categoryLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.6)',
  },
  categoryLabelSelected: {
    color: '#fff',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  halfWidth: {
    flex: 1,
  },
  submitContainer: {
    marginTop: 8,
  },
  bottomSpacer: {
    height: 40,
  },
  errorText: {
    color: theme.colors.pink,
    fontSize: 14,
    marginTop: 8,
  },
});
