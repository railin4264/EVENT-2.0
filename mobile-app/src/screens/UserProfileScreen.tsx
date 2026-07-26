import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';

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
  stats: {
    eventsAttended: number;
    eventsCreated: number;
    tribesJoined: number;
    connections: number;
  };
  isPrivate: boolean;
  isFollowing?: boolean;
  isFollowedBy?: boolean;
  hasRequestedFollow?: boolean;
  verified?: boolean;
}

export default function UserProfileScreen() {
  const router = useRouter();
  const { id: userId, username } = useLocalSearchParams<{ id: string; username?: string }>();
  const { theme } = useTheme();
  const { user: currentUser } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const queryClient = useQueryClient();

  // Check if this is the current user's profile
  const isOwnProfile = currentUser?.id === userId;

  // Fetch user profile
  const { data: profile, isLoading, refetch } = useQuery({
    queryKey: ['userProfile', userId],
    queryFn: async () => {
      const response = await api.get(`/users/profile/${userId}`);
      return response.data.user;
    },
    enabled: !!userId,
  });

  // Follow/Unfollow mutation
  const followMutation = useMutation({
    mutationFn: async (action: 'follow' | 'unfollow') => {
      const response = await api.post(`/users/${userId}/${action}`);
      return response.data;
    },
    onSuccess: (data, action) => {
      queryClient.invalidateQueries({ queryKey: ['userProfile', userId] });
      const message = action === 'follow' ? 'Usuario seguido' : 'Usuario no seguido';
      Alert.alert('Éxito', message);
    },
    onError: () => {
      Alert.alert('Error', 'No se pudo realizar la acción');
    },
  });

  // Block user mutation
  const blockMutation = useMutation({
    mutationFn: async () => {
      const response = await api.post(`/users/${userId}/block`);
      return response.data;
    },
    onSuccess: () => {
      Alert.alert('Usuario bloqueado', 'El usuario ha sido bloqueado exitosamente');
      router.back();
    },
    onError: () => {
      Alert.alert('Error', 'No se pudo bloquear al usuario');
    },
  });

  const handleFollowToggle = () => {
    if (!profile) return;

    const action = profile.isFollowing ? 'unfollow' : 'follow';
    followMutation.mutate(action);
  };

  const handleMessageUser = () => {
    router.push('/new-chat');
  };

  const handleBlockUser = () => {
    if (!profile) return;

    Alert.alert(
      'Bloquear Usuario',
      `¿Estás seguro de que deseas bloquear a ${profile.firstName} ${profile.lastName}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Bloquear',
          style: 'destructive',
          onPress: () => blockMutation.mutate(),
        },
      ]
    );
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
          Cargando perfil{username ? ` de ${username}` : ''}...
        </Text>
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={[styles.errorContainer, { backgroundColor: theme.colors.background }]}>
        <Ionicons name="alert-circle" size={64} color={theme.colors.error} />
        <Text style={[styles.errorText, { color: theme.colors.text }]}>
          No se pudo cargar el perfil
        </Text>
        <TouchableOpacity
          style={[styles.retryButton, { backgroundColor: theme.colors.primary }]}
          onPress={() => refetch()}
        >
          <Text style={styles.retryButtonText}>Reintentar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // If profile is private and not following, show limited view
  if (profile.isPrivate && !profile.isFollowing && !isOwnProfile) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        {/* Header */}
        <View style={[styles.header, { backgroundColor: theme.colors.surface }]}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
            Perfil
          </Text>
          <TouchableOpacity style={styles.moreButton}>
            <Ionicons name="ellipsis-horizontal" size={24} color={theme.colors.text} />
          </TouchableOpacity>
        </View>

        {/* Private Profile View */}
        <View style={styles.privateProfileContainer}>
          <Image
            source={{
              uri: profile.avatar ||
                `https://ui-avatars.com/api/?name=${profile.firstName}+${profile.lastName}&background=6366f1&color=fff&size=200`
            }}
            style={styles.privateAvatar}
          />
          <View style={styles.privateUserInfo}>
            <Text style={[styles.privateName, { color: theme.colors.text }]}>
              {profile.firstName} {profile.lastName}
            </Text>
            {profile.verified && (
              <Ionicons name="checkmark-circle" size={20} color={theme.colors.primary} />
            )}
          </View>
          <Text style={[styles.privateUsername, { color: theme.colors.textSecondary }]}>
            @{profile.username}
          </Text>

          <View style={styles.privateIconContainer}>
            <Ionicons name="lock-closed" size={48} color={theme.colors.textSecondary} />
          </View>

          <Text style={[styles.privateTitle, { color: theme.colors.text }]}>
            Esta cuenta es privada
          </Text>
          <Text style={[styles.privateSubtitle, { color: theme.colors.textSecondary }]}>
            Sigue a {profile.firstName} para ver sus fotos, videos y actividad.
          </Text>

          {/* Follow Button */}
          <TouchableOpacity
            style={[
              styles.followButton,
              {
                backgroundColor: profile.hasRequestedFollow
                  ? theme.colors.textSecondary
                  : theme.colors.primary,
              }
            ]}
            onPress={handleFollowToggle}
            disabled={followMutation.isPending}
          >
            {followMutation.isPending ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Text style={styles.followButtonText}>
                {profile.hasRequestedFollow ? 'Solicitado' : 'Seguir'}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.colors.surface }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
          {profile.firstName} {profile.lastName}
        </Text>
        <TouchableOpacity style={styles.moreButton} onPress={handleBlockUser}>
          <Ionicons name="ellipsis-horizontal" size={24} color={theme.colors.text} />
        </TouchableOpacity>
      </View>

      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Cover Photo */}
        <View style={styles.coverContainer}>
          <View style={[styles.coverPhoto, { backgroundColor: theme.colors.primary }]}>
            {profile.coverImage && (
              <Image source={{ uri: profile.coverImage }} style={styles.coverImage} />
            )}
          </View>
        </View>

        {/* Profile Info */}
        <View style={styles.profileContainer}>
          <Image
            source={{
              uri: profile.avatar ||
                `https://ui-avatars.com/api/?name=${profile.firstName}+${profile.lastName}&background=6366f1&color=fff&size=200`
            }}
            style={styles.avatar}
          />

          <View style={styles.userInfoContainer}>
            <View style={styles.nameContainer}>
              <Text style={[styles.userName, { color: theme.colors.text }]}>
                {profile.firstName} {profile.lastName}
              </Text>
              {profile.verified && (
                <Ionicons name="checkmark-circle" size={20} color={theme.colors.primary} />
              )}
            </View>
            <Text style={[styles.userHandle, { color: theme.colors.textSecondary }]}>
              @{profile.username}
            </Text>
          </View>

          {/* Action Buttons */}
          {!isOwnProfile && (
            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={[
                  styles.followButton,
                  {
                    backgroundColor: profile.isFollowing
                      ? theme.colors.textSecondary
                      : theme.colors.primary,
                  }
                ]}
                onPress={handleFollowToggle}
                disabled={followMutation.isPending}
              >
                {followMutation.isPending ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <>
                    <Ionicons
                      name={profile.isFollowing ? "person-remove" : "person-add"}
                      size={16}
                      color="white"
                    />
                    <Text style={styles.followButtonText}>
                      {profile.isFollowing ? 'Siguiendo' : 'Seguir'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.messageButton, { borderColor: theme.colors.primary }]}
                onPress={handleMessageUser}
              >
                <Ionicons name="chatbubble-outline" size={16} color={theme.colors.primary} />
                <Text style={[styles.messageButtonText, { color: theme.colors.primary }]}>
                  Mensaje
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Stats */}
        <View style={[styles.statsContainer, { backgroundColor: theme.colors.surface }]}>
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: theme.colors.primary }]}>
              {profile.stats.eventsAttended}
            </Text>
            <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
              Eventos
            </Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: theme.colors.secondary }]}>
              {profile.stats.eventsCreated}
            </Text>
            <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
              Creados
            </Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: theme.colors.accent }]}>
              {profile.stats.tribesJoined}
            </Text>
            <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
              Tribus
            </Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: theme.colors.warning }]}>
              {profile.stats.connections}
            </Text>
            <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
              Conexiones
            </Text>
          </View>
        </View>

        {/* Bio */}
        {profile.bio && (
          <View style={[styles.section, { backgroundColor: theme.colors.surface }]}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
              Acerca de
            </Text>
            <Text style={[styles.bioText, { color: theme.colors.textSecondary }]}>
              {profile.bio}
            </Text>
          </View>
        )}

        {/* Interests */}
        {profile.interests && profile.interests.length > 0 && (
          <View style={[styles.section, { backgroundColor: theme.colors.surface }]}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
              Intereses
            </Text>
            <View style={styles.interestsContainer}>
              {profile.interests.map((interest, index) => (
                <View
                  key={index}
                  style={[styles.interestTag, { backgroundColor: theme.colors.primary + '20' }]}
                >
                  <Text style={[styles.interestText, { color: theme.colors.primary }]}>
                    {interest}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  errorText: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 24,
    textAlign: 'center',
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
  moreButton: {
    padding: 8,
  },
  // Private Profile Styles
  privateProfileContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  privateAvatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 16,
  },
  privateUserInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  privateName: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  privateUsername: {
    fontSize: 16,
    marginBottom: 32,
  },
  privateIconContainer: {
    marginBottom: 24,
  },
  privateTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  privateSubtitle: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  // Public Profile Styles
  coverContainer: {
    height: 160,
  },
  coverPhoto: {
    height: '100%',
    position: 'relative',
  },
  coverImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  profileContainer: {
    paddingHorizontal: 20,
    marginTop: -40,
    alignItems: 'center',
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 4,
    borderColor: 'white',
    marginBottom: 16,
  },
  userInfoContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  nameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  userName: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  userHandle: {
    fontSize: 16,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  followButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  followButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  messageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    gap: 6,
  },
  messageButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  statsContainer: {
    flexDirection: 'row',
    paddingVertical: 20,
    paddingHorizontal: 16,
    marginHorizontal: 16,
    borderRadius: 12,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    textAlign: 'center',
  },
  section: {
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 20,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  bioText: {
    fontSize: 16,
    lineHeight: 22,
  },
  interestsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  interestTag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  interestText: {
    fontSize: 14,
    fontWeight: '500',
  },
});


























