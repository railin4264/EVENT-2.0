import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  TextInput,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { api } from '@/services/api';
import { Button, Card, Badge, Avatar } from '@/components/ui';
import { theme } from '@/theme';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/navigation/types';
import { useToast } from '@/contexts/ToastContext';

interface UserProfile {
  id: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  bio?: string;
  location?: string;
  avatar?: string;
  coverImage?: string;
  interests: string[];
  socialLinks: {
    website?: string;
    instagram?: string;
    twitter?: string;
  };
  stats: {
    eventsAttended: number;
    eventsCreated: number;
    tribesJoined: number;
    connections: number;
  };
  phone?: string;
  isPrivate: boolean;
}

export default function ProfileScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const { user, logout, updateUser } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<Partial<UserProfile>>({});
  const [refreshing, setRefreshing] = useState(false);
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  // Fetch gamification profile
  const { data: gamification } = useQuery({
    queryKey: ['gamificationProfile', user?.id],
    queryFn: async () => {
      const response = await api.get('/gamification/profile');
      return response.data.data;
    },
    enabled: !!user
  });

  // Fetch profile data
  const { data: profile, isLoading } = useQuery({
    queryKey: ['userProfile', user?.id],
    queryFn: async () => {
      const response = await api.get('/users/profile');
      return response.data.user;
    },
    enabled: !!user
  });

  // Fetch wallet balance
  const { data: walletData } = useQuery({
    queryKey: ['wallet', user?.id],
    queryFn: () => api.get('/wallet/balance').then(r => r.data),
    enabled: !!user
  });

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (data: Partial<UserProfile>) => {
      const response = await api.put('/users/profile', data);
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['userProfile', user?.id] });
      updateUser(data.user);
      setIsEditing(false);
      showToast({ message: 'Perfil actualizado correctamente', type: 'success' });
    },
    onError: () => {
      showToast({ message: 'No se pudo actualizar el perfil', type: 'error' });
    }
  });

  // Upload avatar mutation
  const uploadAvatarMutation = useMutation({
    mutationFn: async (imageUri: string) => {
      const formData = new FormData();
      formData.append('avatar', {
        uri: imageUri,
        type: 'image/jpeg',
        name: 'avatar.jpg'
      } as any);

      const response = await api.post('/users/avatar', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['userProfile', user?.id] });
      updateUser({ avatar: data.avatarUrl });
      showToast({ message: 'Avatar actualizado', type: 'success' });
    },
    onError: () => {
      showToast({ message: 'No se pudo subir la imagen', type: 'error' });
    }
  });

  const handleEdit = () => {
    setFormData(profile || {});
    setIsEditing(true);
  };

  const handleSave = () => {
    updateProfileMutation.mutate(formData);
  };

  const handleCancel = () => {
    setFormData({});
    setIsEditing(false);
  };

  const handleImagePicker = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      uploadAvatarMutation.mutate(result.assets[0].uri);
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      'Cerrar Sesión',
      '¿Estás seguro de que deseas cerrar sesión?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Sí, cerrar sesión', onPress: () => logout() }
      ]
    );
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ['userProfile', user?.id] });
    setRefreshing(false);
  };

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
          Cargando perfil...
        </Text>
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={[styles.errorContainer, { backgroundColor: theme.colors.background }]}>
        <Ionicons name="alert-circle" size={64} color={theme.colors.error} />
        <Text style={[styles.errorText, { color: theme.colors.text }]}>
          Error al cargar el perfil
        </Text>
        <TouchableOpacity
          style={[styles.retryButton, { backgroundColor: theme.colors.primary }]}
          onPress={onRefresh}
        >
          <Text style={styles.retryButtonText}>Reintentar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Header with Gradient Cover */}
      <View style={styles.headerContainer}>
        <LinearGradient
          colors={theme.gradients.primary as any}
          style={styles.coverGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          {profile.coverImage && (
            <Image source={{ uri: profile.coverImage }} style={styles.coverImage} />
          )}
          <LinearGradient
            colors={['transparent', 'rgba(12, 11, 16, 0.8)']}
            style={styles.headerOverlay}
          />
        </LinearGradient>

        {/* Avatar and Basic Info */}
        <View style={styles.profileHeader}>
          <TouchableOpacity
            onPress={isEditing ? handleImagePicker : undefined}
            disabled={!isEditing}
          >
            <Avatar
              uri={profile.avatar}
              name={`${profile.firstName} ${profile.lastName}`}
              size="xl"
              showBorder
              gradient={theme.gradients.primary}
              style={styles.avatarContainer}
            />
            {isEditing && (
              <View style={[styles.editAvatarButton, theme.glass.medium]}>
                <Ionicons name="camera" size={18} color="#fff" />
              </View>
            )}
            {uploadAvatarMutation.isPending && (
              <View style={styles.avatarLoadingOverlay}>
                <ActivityIndicator size="small" color="white" />
              </View>
            )}
          </TouchableOpacity>

          <View style={styles.userInfoSection}>
            <Text style={styles.userName}>
              {profile.firstName} {profile.lastName}
            </Text>
            <Text style={styles.userHandle}>
              @{profile.username}
            </Text>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            {!isEditing ? (
              <Button
                variant="primary"
                size="md"
                icon="pencil"
                onPress={handleEdit}
                gradient={theme.gradients.primary}
              >
                Editar Perfil
              </Button>
            ) : (
              <View style={styles.editingButtons}>
                <Button
                  variant="primary"
                  size="md"
                  icon="checkmark"
                  onPress={handleSave}
                  loading={updateProfileMutation.isPending}
                  gradient={theme.gradients.secondary}
                  style={{ flex: 1 }}
                >
                  Guardar
                </Button>
                <Button
                  variant="outline"
                  size="md"
                  icon="close"
                  onPress={handleCancel}
                  style={{ flex: 1 }}
                >
                  Cancelar
                </Button>
              </View>
            )}
          </View>
        </View>
      </View>

      {/* Gamification Level Frame */}
      {gamification && (
        <View style={{ paddingHorizontal: 20, marginBottom: 16, marginTop: -10 }}>
          <Card variant="glass" glassIntensity="strong" padding={16} style={{ overflow: 'hidden', alignItems: 'center' } as any}>
            <LinearGradient
              colors={theme.gradients.feature as any}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={[StyleSheet.absoluteFillObject, { opacity: 0.15, position: 'absolute', width: '200%', height: '200%' }]}
            />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', width: '100%', alignItems: 'center', marginBottom: 10 }}>
              <Text style={{ color: '#fff', fontSize: 18, fontWeight: 'bold' }}>
                🌟 Nivel {gamification.levelInfo?.level || 1}
              </Text>
              <Text style={{ color: theme.colors.primary, fontWeight: '700' }}>
                Top {gamification.leaderboardPosition?.percentile || 0}%
              </Text>
            </View>
            <View style={{ width: '100%', height: 8, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 4, overflow: 'hidden' }}>
              <View style={{ width: `${gamification.levelInfo?.progressToNext || 0}%`, height: '100%', backgroundColor: theme.colors.primary }} />
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginTop: 6 }}>
              <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12 }}>{gamification.levelInfo?.xp} XP</Text>
              <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12 }}>Next: {gamification.levelInfo?.xpForNextLevel} XP</Text>
            </View>
          </Card>
        </View>
      )}

      {/* Stats with Glassmorphism */}
      <View style={styles.statsGrid}>
        <Card variant="glass" glassIntensity="medium" padding={16} style={styles.statCard}>
          <View style={[styles.statIcon, { backgroundColor: 'rgba(59, 130, 246, 0.2)' }]}>
            <Ionicons name="calendar" size={20} color={theme.colors.primary} />
          </View>
          <Text style={styles.statNumber}>{profile.stats?.eventsAttended || 0}</Text>
          <Text style={styles.statLabel}>Eventos</Text>
        </Card>

        <Card variant="glass" glassIntensity="medium" padding={16} style={styles.statCard}>
          <View style={[styles.statIcon, { backgroundColor: 'rgba(236, 72, 153, 0.2)' }]}>
            <Ionicons name="add-circle" size={20} color={theme.colors.pink} />
          </View>
          <Text style={styles.statNumber}>{profile.stats?.eventsCreated || 0}</Text>
          <Text style={styles.statLabel}>Creados</Text>
        </Card>

        <Card variant="glass" glassIntensity="medium" padding={16} style={styles.statCard}>
          <View style={[styles.statIcon, { backgroundColor: 'rgba(139, 92, 246, 0.2)' }]}>
            <Ionicons name="people" size={20} color={theme.colors.violet} />
          </View>
          <Text style={styles.statNumber}>{profile.stats?.tribesJoined || 0}</Text>
          <Text style={styles.statLabel}>Tribus</Text>
        </Card>

        <Card variant="glass" glassIntensity="medium" padding={16} style={styles.statCard}>
          <View style={[styles.statIcon, { backgroundColor: 'rgba(34, 197, 94, 0.2)' }]}>
            <Ionicons name="link" size={20} color="#22c55e" />
          </View>
          <Text style={styles.statNumber}>{profile.stats?.connections || 0}</Text>
          <Text style={styles.statLabel}>Conexiones</Text>
        </Card>
      </View>

      {/* EventPay Wallet Section */}
      <Card variant="glass" glassIntensity="light" padding={0} style={[styles.section, { overflow: 'hidden' }] as any}>
        <TouchableOpacity
          onPress={() => router.push('/wallet')}
        >
          <LinearGradient
            colors={['rgba(79, 70, 229, 0.2)', 'rgba(124, 58, 237, 0.2)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.walletCard}
          >
            <View style={styles.walletIconContainer}>
              <Ionicons name="wallet" size={24} color="#fff" />
            </View>
            <View style={styles.walletInfo}>
              <Text style={styles.walletTitle}>EventPay</Text>
              <Text style={styles.walletSubtitle}>Gestiona tu saldo y pagos</Text>
            </View>
            <View style={styles.walletBalanceContainer}>
              <Text style={styles.walletBalance}>
                {walletData?.balance !== undefined ? `$${walletData.balance.toFixed(2)}` : '—'}
              </Text>
              <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.5)" />
            </View>
          </LinearGradient>
        </TouchableOpacity>
      </Card>

      {/* Bio Section */}
      <Card variant="glass" glassIntensity="light" padding={20} style={styles.section}>
        <Text style={styles.sectionTitle}>
          Acerca de mí
        </Text>
        {isEditing ? (
          <TextInput
            style={[styles.bioInput, theme.glass.medium, { borderWidth: 1, color: '#fff' }]}
            multiline
            numberOfLines={4}
            placeholder="Cuéntanos sobre ti..."
            placeholderTextColor="rgba(255,255,255,0.5)"
            value={formData.bio || ''}
            onChangeText={(text) => setFormData({ ...formData, bio: text })}
          />
        ) : (
          <Text style={styles.bioText}>
            {profile.bio || 'No hay información disponible.'}
          </Text>
        )}
      </Card>

      {/* Interests Section */}
      <Card variant="glass" glassIntensity="light" padding={20} style={styles.section}>
        <Text style={styles.sectionTitle}>
          Intereses
        </Text>
        <View style={styles.interestsContainer}>
          {(profile.interests || []).map((interest, index) => (
            <Badge
              key={index}
              variant="gradient"
              gradient={theme.gradients.primary}
              size="md"
            >
              {interest}
            </Badge>
          ))}
        </View>
      </Card>

      {/* Contact Info Section */}
      <Card variant="glass" glassIntensity="light" padding={20} style={styles.section}>
        <Text style={styles.sectionTitle}>
          Contacto
        </Text>

        <View style={styles.contactItem}>
          <View style={[styles.contactIcon, { backgroundColor: 'rgba(59, 130, 246, 0.2)' }]}>
            <Ionicons name="mail" size={18} color={theme.colors.primary} />
          </View>
          <Text style={styles.contactText}>
            {profile.email}
          </Text>
        </View>

        {profile.phone && (
          <View style={styles.contactItem}>
            <View style={[styles.contactIcon, { backgroundColor: 'rgba(34, 197, 94, 0.2)' }]}>
              <Ionicons name="call" size={18} color="#22c55e" />
            </View>
            <Text style={styles.contactText}>
              {profile.phone}
            </Text>
          </View>
        )}

        {profile.location && (
          <View style={styles.contactItem}>
            <View style={[styles.contactIcon, { backgroundColor: 'rgba(139, 92, 246, 0.2)' }]}>
              <Ionicons name="location" size={18} color={theme.colors.violet} />
            </View>
            <Text style={styles.contactText}>
              {profile.location?.address || `${profile.location?.lat}, ${profile.location?.lng}`}
            </Text>
          </View>
        )}
      </Card>

      {/* Settings and Actions */}
      <Card variant="glass" glassIntensity="light" padding={20} style={styles.section}>
        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => router.push('/settings')}
        >
          <View style={[styles.menuIcon, { backgroundColor: 'rgba(59, 130, 246, 0.2)' }]}>
            <Ionicons name="settings-outline" size={22} color={theme.colors.primary} />
          </View>
          <Text style={styles.menuItemText}>
            Configuración
          </Text>
          <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.5)" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => router.push('/notifications')}
        >
          <View style={[styles.menuIcon, { backgroundColor: 'rgba(236, 72, 153, 0.2)' }]}>
            <Ionicons name="notifications-outline" size={22} color={theme.colors.pink} />
          </View>
          <Text style={styles.menuItemText}>
            Notificaciones
          </Text>
          <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.5)" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem} onPress={handleLogout}>
          <View style={[styles.menuIcon, { backgroundColor: 'rgba(239, 68, 68, 0.2)' }]}>
            <Ionicons name="log-out-outline" size={22} color="#ef4444" />
          </View>
          <Text style={[styles.menuItemText, { color: '#ef4444' }]}>
            Cerrar Sesión
          </Text>
        </TouchableOpacity>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    backgroundColor: theme.colors.background,
  },
  errorText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    marginTop: 16,
    marginBottom: 24,
    textAlign: 'center',
  },
  retryButton: {
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  // Header
  headerContainer: {
    marginBottom: 24,
  },
  coverGradient: {
    height: 220,
    position: 'relative',
  },
  coverImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  headerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  profileHeader: {
    paddingHorizontal: 20,
    marginTop: -60,
    alignItems: 'center',
  },
  avatarContainer: {
    marginBottom: 16,
    position: 'relative',
  },
  editAvatarButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  avatarLoadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userInfoSection: {
    alignItems: 'center',
    marginBottom: 20,
  },
  userName: {
    fontSize: 26,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 6,
  },
  userHandle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.7)',
    fontWeight: '500',
  },
  actionButtons: {
    width: '100%',
    paddingHorizontal: 20,
  },
  editingButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  // Stats
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  statCard: {
    width: '48%',
    alignItems: 'center',
  },
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
    fontWeight: '500',
  },
  // Sections
  section: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 16,
  },
  bioInput: {
    borderRadius: 12,
    padding: 16,
    minHeight: 100,
    textAlignVertical: 'top',
    fontSize: 15,
  },
  bioText: {
    fontSize: 15,
    lineHeight: 22,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  interestsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  // Contact
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  contactIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  contactText: {
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.8)',
    flex: 1,
    fontWeight: '500',
  },
  // Menu
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    gap: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  menuIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuItemText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    flex: 1,
  },
  // Wallet
  walletCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
  },
  walletIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  walletInfo: {
    flex: 1,
  },
  walletTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  walletSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  walletBalanceContainer: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  walletBalance: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
});
