import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import { reportsService, CreateReportRequest, ReportCategory, ReportType } from '@/services/reportsService';

interface ReportModalProps {
  visible: boolean;
  onClose: () => void;
  reportType: 'user' | 'event' | 'tribe' | 'post' | 'comment' | 'message';
  reportedItemId: string;
  reportedItemName?: string;
  onReportSubmitted?: () => void;
}

export default function ReportModal({
  visible,
  onClose,
  reportType,
  reportedItemId,
  reportedItemName,
  onReportSubmitted,
}: ReportModalProps) {
  const { theme } = useTheme();
  const [categories, setCategories] = useState<ReportCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [reason, setReason] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [configLoading, setConfigLoading] = useState(false);

  // Load report configuration
  useEffect(() => {
    const loadConfig = async () => {
      try {
        setConfigLoading(true);
        const response = await reportsService.getConfig();
        if (response.success) {
          setCategories(response.config.categories);
        }
      } catch (error) {
        console.error('Error loading report config:', error);
        Alert.alert('Error', 'No se pudo cargar la configuración de reportes');
      } finally {
        setConfigLoading(false);
      }
    };

    if (visible) {
      loadConfig();
    }
  }, [visible]);

  const resetForm = useCallback(() => {
    setSelectedCategory('');
    setReason('');
    setDescription('');
  }, []);

  const handleClose = useCallback(() => {
    resetForm();
    onClose();
  }, [resetForm, onClose]);

  const validateForm = useCallback(() => {
    if (!selectedCategory) {
      Alert.alert('Error', 'Debes seleccionar una categoría');
      return false;
    }

    if (!reason.trim() || reason.trim().length < 10) {
      Alert.alert('Error', 'La razón debe tener al menos 10 caracteres');
      return false;
    }

    return true;
  }, [selectedCategory, reason]);

  const handleSubmit = useCallback(async () => {
    if (!validateForm()) return;

    try {
      setLoading(true);

      const reportData: CreateReportRequest = {
        type: reportType,
        category: selectedCategory,
        reason: reason.trim(),
        description: description.trim() || undefined,
      };

      // Set the appropriate reported item ID
      switch (reportType) {
        case 'user':
          reportData.reportedUserId = reportedItemId;
          break;
        case 'event':
          reportData.reportedEventId = reportedItemId;
          break;
        case 'tribe':
          reportData.reportedTribeId = reportedItemId;
          break;
        case 'post':
          reportData.reportedPostId = reportedItemId;
          break;
        case 'comment':
          reportData.reportedCommentId = reportedItemId;
          break;
        default:
          break;
      }

      const response = await reportsService.createReport(reportData);

      if (response.success) {
        Alert.alert(
          'Reporte enviado',
          'Tu reporte ha sido enviado exitosamente. Nuestro equipo lo revisará pronto.',
          [
            {
              text: 'OK',
              onPress: () => {
                handleClose();
                onReportSubmitted?.();
              }
            }
          ]
        );
      } else {
        Alert.alert('Error', response.message || 'No se pudo enviar el reporte');
      }
    } catch (error: any) {
      console.error('Error submitting report:', error);
      const errorMessage = error.response?.data?.message || 'Error al enviar el reporte';
      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  }, [validateForm, reportType, selectedCategory, reason, description, reportedItemId, handleClose, onReportSubmitted]);

  const getReportTypeLabel = () => {
    const labels = {
      user: 'usuario',
      event: 'evento',
      tribe: 'tribu',
      post: 'publicación',
      comment: 'comentario',
      message: 'mensaje'
    };
    return labels[reportType] || reportType;
  };

  const renderCategoryOption = (category: ReportCategory) => (
    <TouchableOpacity
      key={category.value}
      style={[
        styles.categoryOption,
        {
          backgroundColor: selectedCategory === category.value
            ? theme.colors.primary
            : theme.colors.surface,
          borderColor: selectedCategory === category.value
            ? theme.colors.primary
            : theme.colors.border,
        }
      ]}
      onPress={() => setSelectedCategory(category.value)}
    >
      <View style={styles.categoryContent}>
        <Text
          style={[
            styles.categoryTitle,
            {
              color: selectedCategory === category.value
                ? theme.colors.background
                : theme.colors.text,
            }
          ]}
        >
          {category.label}
        </Text>
        <Text
          style={[
            styles.categoryDescription,
            {
              color: selectedCategory === category.value
                ? theme.colors.background
                : theme.colors.textVariant,
            }
          ]}
        >
          {category.description}
        </Text>
      </View>
      {selectedCategory === category.value && (
        <Ionicons
          name="checkmark-circle"
          size={20}
          color={theme.colors.primary}
        />
      )}
    </TouchableOpacity>
  );

  if (configLoading) {
    return (
      <Modal visible={visible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.colors.surface }]}>
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={theme.colors.primary} />
              <Text style={[styles.loadingText, { color: theme.colors.text }]}>
                Cargando configuración...
              </Text>
            </View>
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: theme.colors.surface }]}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={theme.colors.text} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
              Reportar {getReportTypeLabel()}
            </Text>
            <View style={styles.headerSpacer} />
          </View>

          {/* Content */}
          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Reported Item Info */}
            {reportedItemName && (
              <View style={[styles.itemInfo, { backgroundColor: theme.colors.surface }]}>
                <Ionicons
                  name="information-circle-outline"
                  size={20}
                  color={theme.colors.primary}
                />
                <Text style={[styles.itemInfoText, { color: theme.colors.textVariant }]}>
                  Reportando: {reportedItemName}
                </Text>
              </View>
            )}

            {/* Category Selection */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                ¿Cuál es el problema? *
              </Text>
              <Text style={[styles.sectionDescription, { color: theme.colors.textVariant }]}>
                Selecciona la categoría que mejor describe el problema
              </Text>
              <View style={styles.categoriesContainer}>
                {categories.map(renderCategoryOption)}
              </View>
            </View>

            {/* Reason Input */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                Razón específica *
              </Text>
              <Text style={[styles.sectionDescription, { color: theme.colors.textVariant }]}>
                Explica brevemente por qué estás reportando esto (mínimo 10 caracteres)
              </Text>
              <TextInput
                style={[
                  styles.textInput,
                  styles.reasonInput,
                  {
                    backgroundColor: theme.colors.surface,
                    color: theme.colors.textVariant,
                    borderColor: theme.colors.border,
                  }
                ]}
                placeholder="Describe el problema específico..."
                placeholderTextColor={theme.colors.border}
                value={reason}
                onChangeText={setReason}
                multiline
                numberOfLines={3}
                maxLength={1000}
              />
              <Text style={[styles.charCount, { color: theme.colors.border }]}>
                {reason.length}/1000
              </Text>
            </View>

            {/* Description Input (Optional) */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                Información adicional (opcional)
              </Text>
              <Text style={[styles.sectionDescription, { color: theme.colors.textVariant }]}>
                Proporciona más detalles si es necesario
              </Text>
              <TextInput
                style={[
                  styles.textInput,
                  styles.descriptionInput,
                  {
                    backgroundColor: theme.colors.surface,
                    color: theme.colors.textVariant,
                    borderColor: theme.colors.border,
                  }
                ]}
                placeholder="Información adicional, contexto, etc..."
                placeholderTextColor={theme.colors.border}
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={4}
                maxLength={2000}
              />
              <Text style={[styles.charCount, { color: theme.colors.border }]}>
                {description.length}/2000
              </Text>
            </View>

            {/* Disclaimer */}
            <View style={[styles.disclaimer, { backgroundColor: theme.colors.errorContainer }]}>
              <Ionicons
                name="warning-outline"
                size={20}
                color={theme.colors.onErrorContainer}
              />
              <Text style={[styles.disclaimerText, { color: theme.colors.onErrorContainer }]}>
                Los reportes falsos pueden resultar en acciones en tu cuenta. 
                Solo reporta contenido que realmente viole nuestras normas comunitarias.
              </Text>
            </View>
          </ScrollView>

          {/* Footer */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.cancelButton, { backgroundColor: theme.colors.surface }]}
              onPress={handleClose}
              disabled={loading}
            >
              <Text style={[styles.cancelButtonText, { color: theme.colors.textVariant }]}>
                Cancelar
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.submitButton,
                { backgroundColor: theme.colors.primary },
                loading && styles.submitButtonDisabled
              ]}
              onPress={handleSubmit}
              disabled={loading || !selectedCategory || reason.length < 10}
            >
              {loading ? (
                <ActivityIndicator size="small" color={theme.colors.onPrimary} />
              ) : (
                <Text style={[styles.submitButtonText, { color: theme.colors.onPrimary }]}>
                  Enviar Reporte
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    maxHeight: '90%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 16,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  closeButton: {
    padding: 4,
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  headerSpacer: {
    width: 32,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  itemInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
    gap: 8,
  },
  itemInfoText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
  },
  section: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  sectionDescription: {
    fontSize: 14,
    marginBottom: 12,
    lineHeight: 20,
  },
  categoriesContainer: {
    gap: 8,
  },
  categoryOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
  },
  categoryContent: {
    flex: 1,
  },
  categoryTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  categoryDescription: {
    fontSize: 12,
    lineHeight: 16,
  },
  textInput: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    fontSize: 16,
    textAlignVertical: 'top',
  },
  reasonInput: {
    height: 80,
  },
  descriptionInput: {
    height: 100,
  },
  charCount: {
    fontSize: 12,
    textAlign: 'right',
    marginTop: 4,
  },
  disclaimer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
    borderRadius: 8,
    marginTop: 24,
    marginBottom: 16,
    gap: 8,
  },
  disclaimerText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 16,
  },
  footer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  submitButton: {
    flex: 2,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
