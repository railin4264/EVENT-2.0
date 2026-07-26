import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import { useCreateTribe } from '@/hooks/useTribes';
import { TRIBE_CATEGORIES, CreateTribeRequest } from '@/services/tribesService';
import * as Location from 'expo-location';

export default function CreateTribeScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const { createTribe, loading, error } = useCreateTribe();

  const [formData, setFormData] = useState<CreateTribeRequest>({
    name: '',
    description: '',
    category: '',
    tags: [],
    location: {
      coordinates: [0, 0],
      isVirtual: true,
    },
    settings: {
      privacy: 'public',
      membership: 'open',
    },
  });

  const [tagInput, setTagInput] = useState('');
  const [locationLoading, setLocationLoading] = useState(false);

  const handleInputChange = useCallback((field: keyof CreateTribeRequest, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  }, []);

  const handleSettingChange = useCallback((field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      settings: {
        ...prev.settings!,
        [field]: value,
      },
    }));
  }, []);

  const handleLocationChange = useCallback((field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      location: {
        ...prev.location!,
        [field]: value,
      },
    }));
  }, []);

  const addTag = useCallback(() => {
    if (tagInput.trim() && !formData.tags?.includes(tagInput.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...(prev.tags || []), tagInput.trim()],
      }));
      setTagInput('');
    }
  }, [tagInput, formData.tags]);

  const removeTag = useCallback((tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags?.filter(tag => tag !== tagToRemove) || [],
    }));
  }, []);

  const getCurrentLocation = useCallback(async () => {
    try {
      setLocationLoading(true);
      
      // Request permission
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permiso denegado', 'Se necesita acceso a la ubicación para crear tribus con ubicación física.');
        return;
      }

      // Get current position
      const location = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = location.coords;

      // Get address from coordinates
      const reverseGeocode = await Location.reverseGeocodeAsync({
        latitude,
        longitude,
      });

      const address = reverseGeocode[0] ? 
        `${reverseGeocode[0].street || ''} ${reverseGeocode[0].city || ''}, ${reverseGeocode[0].region || ''}`.trim() :
        'Ubicación actual';

      handleLocationChange('coordinates', [longitude, latitude]);
      handleLocationChange('address', address);
      
      Alert.alert('¡Listo!', 'Ubicación obtenida correctamente');
    } catch (error) {
      console.error('Error getting location:', error);
      Alert.alert('Error', 'No se pudo obtener la ubicación actual');
    } finally {
      setLocationLoading(false);
    }
  }, [handleLocationChange]);

  const validateForm = useCallback(() => {
    if (!formData.name.trim()) {
      Alert.alert('Error', 'El nombre de la tribu es requerido');
      return false;
    }

    if (!formData.description.trim()) {
      Alert.alert('Error', 'La descripción de la tribu es requerida');
      return false;
    }

    if (!formData.category) {
      Alert.alert('Error', 'Debes seleccionar una categoría');
      return false;
    }

    if (!formData.location?.isVirtual && formData.location?.coordinates[0] === 0) {
      Alert.alert('Error', 'Debes obtener la ubicación para tribus físicas');
      return false;
    }

    return true;
  }, [formData]);

  const handleSubmit = useCallback(async () => {
    if (!validateForm()) return;

    try {
      const result = await createTribe(formData);
      
      if (result?.success) {
        Alert.alert(
          '¡Tribu creada!',
          'Tu tribu ha sido creada exitosamente',
          [
            {
              text: 'OK',
              onPress: () => {
                router.back();
                // Navigate to the created tribe
                router.push('/tribe/' + result.tribe._id);
              },
            },
          ]
        );
      } else {
        Alert.alert('Error', result?.message || 'No se pudo crear la tribu');
      }
    } catch (error: any) {
      Alert.alert('Error', 'Ocurrió un error inesperado');
    }
  }, [formData, createTribe, router, validateForm]);

  const renderFormField = (
    label: string,
    value: string,
    onChangeText: (text: string) => void,
    placeholder: string,
    multiline = false,
    required = false
  ) => (
    <View style={styles.formField}>
      <Text style={[styles.label, { color: theme.colors.onSurface }]}>
        {label} {required && <Text style={{ color: theme.colors.error }}>*</Text>}
      </Text>
      <TextInput
        style={[
          styles.input,
          multiline && styles.textArea,
          { 
            backgroundColor: theme.colors.surfaceVariant,
            color: theme.colors.onSurfaceVariant,
            borderColor: theme.colors.outline,
          }
        ]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.colors.outline}
        multiline={multiline}
        numberOfLines={multiline ? 4 : 1}
      />
    </View>
  );

  const renderCategorySelector = () => (
    <View style={styles.formField}>
      <Text style={[styles.label, { color: theme.colors.onSurface }]}>
        Categoría <Text style={{ color: theme.colors.error }}>*</Text>
      </Text>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoriesContainer}
      >
        {TRIBE_CATEGORIES.map((category) => (
          <TouchableOpacity
            key={category.value}
            style={[
              styles.categoryOption,
              {
                backgroundColor: formData.category === category.value
                  ? theme.colors.primary
                  : theme.colors.surfaceVariant,
              },
            ]}
            onPress={() => handleInputChange('category', category.value)}
          >
            <Text style={styles.categoryEmoji}>{category.icon}</Text>
            <Text
              style={[
                styles.categoryOptionText,
                {
                  color: formData.category === category.value
                    ? theme.colors.onPrimary
                    : theme.colors.onSurfaceVariant,
                },
              ]}
            >
              {category.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  const renderTagsInput = () => (
    <View style={styles.formField}>
      <Text style={[styles.label, { color: theme.colors.onSurface }]}>
        Intereses (Tags)
      </Text>
      
      <View style={styles.tagInputContainer}>
        <TextInput
          style={[
            styles.tagInput,
            { 
              backgroundColor: theme.colors.surfaceVariant,
              color: theme.colors.onSurfaceVariant,
              borderColor: theme.colors.outline,
            }
          ]}
          value={tagInput}
          onChangeText={setTagInput}
          placeholder="Agregar interés..."
          placeholderTextColor={theme.colors.outline}
          onSubmitEditing={addTag}
          returnKeyType="done"
        />
        <TouchableOpacity
          style={[styles.addTagButton, { backgroundColor: theme.colors.primary }]}
          onPress={addTag}
          disabled={!tagInput.trim()}
        >
          <Ionicons name="add" size={20} color={theme.colors.onPrimary} />
        </TouchableOpacity>
      </View>

      {formData.tags && formData.tags.length > 0 && (
        <View style={styles.tagsContainer}>
          {formData.tags.map((tag, index) => (
            <View
              key={`tag-${tag}-${index}`}
              style={[styles.tag, { backgroundColor: theme.colors.primaryContainer }]}
            >
              <Text style={[styles.tagText, { color: theme.colors.onPrimaryContainer }]}>
                #{tag}
              </Text>
              <TouchableOpacity onPress={() => removeTag(tag)}>
                <Ionicons 
                  name="close-circle" 
                  size={16} 
                  color={theme.colors.onPrimaryContainer} 
                />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}
    </View>
  );

  const renderLocationSettings = () => (
    <View style={styles.formField}>
      <Text style={[styles.label, { color: theme.colors.onSurface }]}>
        Ubicación
      </Text>
      
      <View style={styles.switchContainer}>
        <Text style={[styles.switchLabel, { color: theme.colors.onSurfaceVariant }]}>
          Tribu virtual (solo online)
        </Text>
        <Switch
          value={formData.location?.isVirtual}
          onValueChange={(value) => handleLocationChange('isVirtual', value)}
          trackColor={{ false: theme.colors.outline, true: theme.colors.primary }}
          thumbColor={theme.colors.surface}
        />
      </View>

      {!formData.location?.isVirtual && (
        <View style={styles.locationContainer}>
          <TouchableOpacity
            style={[
              styles.locationButton,
              { backgroundColor: theme.colors.primaryContainer },
              locationLoading && styles.locationButtonDisabled,
            ]}
            onPress={getCurrentLocation}
            disabled={locationLoading}
          >
            {locationLoading ? (
              <ActivityIndicator size="small" color={theme.colors.onPrimaryContainer} />
            ) : (
              <Ionicons 
                name="location" 
                size={20} 
                color={theme.colors.onPrimaryContainer} 
              />
            )}
            <Text style={[styles.locationButtonText, { color: theme.colors.onPrimaryContainer }]}>
              {locationLoading ? 'Obteniendo...' : 'Obtener ubicación actual'}
            </Text>
          </TouchableOpacity>

          {formData.location?.address && (
            <View style={styles.locationInfo}>
              <Ionicons name="location-outline" size={16} color={theme.colors.primary} />
              <Text style={[styles.locationText, { color: theme.colors.onSurfaceVariant }]}>
                {formData.location.address}
              </Text>
            </View>
          )}
        </View>
      )}
    </View>
  );

  const renderPrivacySettings = () => (
    <View style={styles.formField}>
      <Text style={[styles.label, { color: theme.colors.onSurface }]}>
        Configuración de Privacidad
      </Text>
      
      <View style={styles.settingGroup}>
        <Text style={[styles.settingLabel, { color: theme.colors.onSurfaceVariant }]}>
          Privacidad
        </Text>
        <View style={styles.optionsContainer}>
          {[
            { value: 'public', label: 'Pública', description: 'Visible para todos' },
            { value: 'private', label: 'Privada', description: 'Solo miembros pueden ver' },
            { value: 'secret', label: 'Secreta', description: 'Solo por invitación' },
          ].map((option) => (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.option,
                {
                  backgroundColor: formData.settings?.privacy === option.value
                    ? theme.colors.primaryContainer
                    : theme.colors.surface,
                  borderColor: theme.colors.outline,
                },
              ]}
              onPress={() => handleSettingChange('privacy', option.value)}
            >
              <View style={styles.optionContent}>
                <Text
                  style={[
                    styles.optionTitle,
                    {
                      color: formData.settings?.privacy === option.value
                        ? theme.colors.onPrimaryContainer
                        : theme.colors.onSurface,
                    },
                  ]}
                >
                  {option.label}
                </Text>
                <Text
                  style={[
                    styles.optionDescription,
                    {
                      color: formData.settings?.privacy === option.value
                        ? theme.colors.onPrimaryContainer
                        : theme.colors.onSurfaceVariant,
                    },
                  ]}
                >
                  {option.description}
                </Text>
              </View>
              {formData.settings?.privacy === option.value && (
                <Ionicons
                  name="checkmark-circle"
                  size={20}
                  color={theme.colors.onPrimaryContainer}
                />
              )}
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.settingGroup}>
        <Text style={[styles.settingLabel, { color: theme.colors.onSurfaceVariant }]}>
          Membresía
        </Text>
        <View style={styles.optionsContainer}>
          {[
            { value: 'open', label: 'Abierta', description: 'Cualquiera puede unirse' },
            { value: 'approval_required', label: 'Con aprobación', description: 'Requiere aprobación del admin' },
            { value: 'invite_only', label: 'Solo invitación', description: 'Solo por invitación directa' },
          ].map((option) => (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.option,
                {
                  backgroundColor: formData.settings?.membership === option.value
                    ? theme.colors.primaryContainer
                    : theme.colors.surface,
                  borderColor: theme.colors.outline,
                },
              ]}
              onPress={() => handleSettingChange('membership', option.value)}
            >
              <View style={styles.optionContent}>
                <Text
                  style={[
                    styles.optionTitle,
                    {
                      color: formData.settings?.membership === option.value
                        ? theme.colors.onPrimaryContainer
                        : theme.colors.onSurface,
                    },
                  ]}
                >
                  {option.label}
                </Text>
                <Text
                  style={[
                    styles.optionDescription,
                    {
                      color: formData.settings?.membership === option.value
                        ? theme.colors.onPrimaryContainer
                        : theme.colors.onSurfaceVariant,
                    },
                  ]}
                >
                  {option.description}
                </Text>
              </View>
              {formData.settings?.membership === option.value && (
                <Ionicons
                  name="checkmark-circle"
                  size={20}
                  color={theme.colors.onPrimaryContainer}
                />
              )}
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => router.back()}
        >
          <Ionicons name="close" size={24} color={theme.colors.onSurface} />
        </TouchableOpacity>
        
        <Text style={[styles.headerTitle, { color: theme.colors.onSurface }]}>
          Crear Tribu
        </Text>
        
        <TouchableOpacity
          style={[
            styles.headerButton,
            styles.saveButton,
            { backgroundColor: theme.colors.primary },
            loading && styles.saveButtonDisabled,
          ]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color={theme.colors.onPrimary} />
          ) : (
            <Ionicons name="checkmark" size={24} color={theme.colors.onPrimary} />
          )}
        </TouchableOpacity>
      </View>

      {/* Form */}
      <ScrollView style={styles.form} showsVerticalScrollIndicator={false}>
        {renderFormField(
          'Nombre de la tribu',
          formData.name,
          (text) => handleInputChange('name', text),
          'Ej: Amantes del café en DR',
          false,
          true
        )}

        {renderFormField(
          'Descripción',
          formData.description,
          (text) => handleInputChange('description', text),
          'Describe de qué trata tu tribu, qué actividades realizan, etc.',
          true,
          true
        )}

        {renderCategorySelector()}
        {renderTagsInput()}
        {renderLocationSettings()}
        {renderPrivacySettings()}

        <View style={styles.bottomSpacing} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveButton: {
    // Additional styles for save button
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  form: {
    flex: 1,
    paddingHorizontal: 16,
  },
  formField: {
    marginVertical: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    fontSize: 16,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  categoriesContainer: {
    paddingRight: 16,
    gap: 8,
  },
  categoryOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    gap: 8,
  },
  categoryEmoji: {
    fontSize: 16,
  },
  categoryOptionText: {
    fontSize: 14,
    fontWeight: '600',
  },
  tagInputContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  tagInput: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    fontSize: 14,
  },
  addTagButton: {
    width: 44,
    height: 44,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  tagText: {
    fontSize: 12,
    fontWeight: '600',
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  switchLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
  locationContainer: {
    marginTop: 12,
    gap: 12,
  },
  locationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  locationButtonDisabled: {
    opacity: 0.7,
  },
  locationButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  locationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
  },
  locationText: {
    flex: 1,
    fontSize: 14,
  },
  settingGroup: {
    marginBottom: 20,
  },
  settingLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  optionsContainer: {
    gap: 8,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  optionContent: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  optionDescription: {
    fontSize: 12,
  },
  bottomSpacing: {
    height: 32,
  },
});

























