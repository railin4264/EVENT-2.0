import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Image, ScrollView, KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { feedService } from '@/services';

const MAX_CHARS = 500;

type Visibility = 'public' | 'friends' | 'private';

export default function CreatePostScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const { user } = useAuth();

  const [content, setContent] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [visibility, setVisibility] = useState<Visibility>('public');

  const visibilityOptions: { value: Visibility; label: string; icon: string }[] = [
    { value: 'public', label: 'Público', icon: 'globe-outline' },
    { value: 'friends', label: 'Amigos', icon: 'people-outline' },
    { value: 'private', label: 'Privado', icon: 'lock-closed-outline' },
  ];

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permiso requerido', 'Necesitamos acceso a tu galería para subir fotos.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled && result.assets) {
      const newImages = result.assets.map(a => a.uri);
      setImages(prev => [...prev, ...newImages].slice(0, 4));
    }
  };

  const removeImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
  };

  const handlePost = async () => {
    if (!content.trim() && images.length === 0) {
      Alert.alert('Error', 'Añade texto o imágenes a tu publicación');
      return;
    }

    setLoading(true);
    try {
      await feedService.createPost({
        content: content.trim(),
        type: 'general',
        visibility,
      });
      router.back();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'No se pudo publicar. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const styles = getStyles(theme);
  const canPost = (content.trim().length > 0 || images.length > 0) && !loading;

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
            <Ionicons name="close" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Nueva publicación</Text>
          <TouchableOpacity
            onPress={handlePost}
            disabled={!canPost}
            style={[styles.postBtn, { backgroundColor: canPost ? theme.colors.primary : theme.colors.border }]}
          >
            {loading ? (
              <Text style={styles.postBtnText}>...</Text>
            ) : (
              <Text style={styles.postBtnText}>Publicar</Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView style={{ flex: 1 }} keyboardShouldPersistTaps="handled">
          {/* User row */}
          <View style={styles.userRow}>
            <View style={[styles.avatar, { backgroundColor: theme.colors.primary + '40' }]}>
              <Text style={[styles.avatarText, { color: theme.colors.primary }]}>
                {user?.firstName?.charAt(0) || user?.username?.charAt(0) || '?'}
              </Text>
            </View>
            <View>
              <Text style={[styles.userName, { color: theme.colors.text }]}>
                {user?.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : user?.username}
              </Text>
              {/* Visibility selector */}
              <View style={styles.visibilityRow}>
                {visibilityOptions.map(opt => (
                  <TouchableOpacity
                    key={opt.value}
                    style={[
                      styles.visibilityChip,
                      {
                        backgroundColor: visibility === opt.value ? theme.colors.primary + '20' : theme.colors.surface,
                        borderColor: visibility === opt.value ? theme.colors.primary : theme.colors.border,
                      }
                    ]}
                    onPress={() => setVisibility(opt.value)}
                  >
                    <Ionicons
                      name={opt.icon as any}
                      size={12}
                      color={visibility === opt.value ? theme.colors.primary : theme.colors.textSecondary}
                    />
                    <Text style={[
                      styles.visibilityText,
                      { color: visibility === opt.value ? theme.colors.primary : theme.colors.textSecondary }
                    ]}>
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>

          {/* Text input */}
          <TextInput
            style={[styles.textInput, { color: theme.colors.text }]}
            placeholder="¿Qué está pasando?"
            placeholderTextColor={theme.colors.textSecondary}
            value={content}
            onChangeText={setContent}
            multiline
            autoFocus
            maxLength={MAX_CHARS}
            textAlignVertical="top"
          />

          {/* Char counter */}
          <Text style={[styles.charCount, {
            color: content.length > MAX_CHARS * 0.9 ? '#ef4444' : theme.colors.textSecondary
          }]}>
            {content.length}/{MAX_CHARS}
          </Text>

          {/* Images */}
          {images.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imagesRow} contentContainerStyle={{ gap: 8 }}>
              {images.map((uri, index) => (
                <View key={index} style={styles.imageWrapper}>
                  <Image source={{ uri }} style={styles.image} />
                  <TouchableOpacity
                    style={[styles.removeBtn, { backgroundColor: theme.colors.background }]}
                    onPress={() => removeImage(index)}
                  >
                    <Ionicons name="close" size={14} color={theme.colors.text} />
                  </TouchableOpacity>
                </View>
              ))}
              {images.length < 4 && (
                <TouchableOpacity
                  style={[styles.addMoreBtn, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
                  onPress={pickImage}
                >
                  <Ionicons name="add" size={28} color={theme.colors.textSecondary} />
                </TouchableOpacity>
              )}
            </ScrollView>
          )}
        </ScrollView>

        {/* Bottom toolbar */}
        <View style={[styles.toolbar, { borderTopColor: theme.colors.border, backgroundColor: theme.colors.background }]}>
          <TouchableOpacity style={styles.toolBtn} onPress={pickImage} disabled={images.length >= 4}>
            <Ionicons name="image-outline" size={24} color={images.length >= 4 ? theme.colors.border : theme.colors.primary} />
            <Text style={[styles.toolLabel, { color: theme.colors.textSecondary }]}>Foto</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.toolBtn}>
            <Ionicons name="location-outline" size={24} color={theme.colors.textSecondary} />
            <Text style={[styles.toolLabel, { color: theme.colors.textSecondary }]}>Lugar</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.toolBtn}>
            <Ionicons name="happy-outline" size={24} color={theme.colors.textSecondary} />
            <Text style={[styles.toolLabel, { color: theme.colors.textSecondary }]}>Estado</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.toolBtn}>
            <Ionicons name="pricetag-outline" size={24} color={theme.colors.textSecondary} />
            <Text style={[styles.toolLabel, { color: theme.colors.textSecondary }]}>Etiquetar</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const getStyles = (theme: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerBtn: { padding: 4 },
  headerTitle: { fontSize: 17, fontWeight: '600' },
  postBtn: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 20,
  },
  postBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  userRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 16,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: { fontSize: 18, fontWeight: '700' },
  userName: { fontSize: 15, fontWeight: '600', marginBottom: 8 },
  visibilityRow: { flexDirection: 'row', gap: 6 },
  visibilityChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  visibilityText: { fontSize: 11, fontWeight: '500' },
  textInput: {
    fontSize: 18,
    lineHeight: 26,
    paddingHorizontal: 16,
    paddingBottom: 16,
    minHeight: 120,
  },
  charCount: { fontSize: 12, textAlign: 'right', paddingHorizontal: 16, marginBottom: 8 },
  imagesRow: { paddingHorizontal: 16, paddingBottom: 16 },
  imageWrapper: { position: 'relative' },
  image: { width: 100, height: 100, borderRadius: 12 },
  removeBtn: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addMoreBtn: {
    width: 100,
    height: 100,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  toolbar: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderTopWidth: 1,
  },
  toolBtn: { flex: 1, alignItems: 'center', gap: 4, paddingVertical: 4 },
  toolLabel: { fontSize: 11 },
});
