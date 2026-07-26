import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Share,
  Linking,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import { useTribe } from '@/hooks/useTribes';
import { TRIBE_CATEGORIES } from '@/services/tribesService';
import { useAuth } from '@/contexts/AuthContext';
import TribePosts from '@/components/TribePosts';
import TribeStories from '@/components/TribeStories';

export default function TribeDetailScreen() {
  const router = useRouter();
  const { id: tribeId } = useLocalSearchParams<{ id: string }>();
  const { theme } = useTheme();
  const { user } = useAuth();

  const { tribe, loading, error, joinTribe, leaveTribe } = useTribe(tribeId);
  const [actionLoading, setActionLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'feed' | 'about'>('feed');

  const getCategoryInfo = () => {
    if (!tribe) return { label: '', icon: '📋' };
    return TRIBE_CATEGORIES.find(cat => cat.value === tribe.category) || 
           { label: tribe.category, icon: '📋' };
  };

  const handleJoinLeave = useCallback(async () => {
    if (!tribe || actionLoading) return;

    try {
      setActionLoading(true);
      
      if (tribe.isMember) {
        const result = await leaveTribe(tribe._id);
        if (result?.success) {
          Alert.alert('¡Listo!', result.message);
        } else {
          Alert.alert('Error', result?.message || 'No se pudo salir de la tribu');
        }
      } else {
        const result = await joinTribe(tribe._id);
        if (result?.success) {
          Alert.alert('¡Bienvenido!', result.message);
        } else {
          Alert.alert('Error', result?.message || 'No se pudo unir a la tribu');
        }
      }
    } catch (error: any) {
      Alert.alert('Error', 'Ocurrió un error inesperado');
    } finally {
      setActionLoading(false);
    }
  }, [tribe, joinTribe, leaveTribe, actionLoading]);

  const handleShare = useCallback(async () => {
    if (!tribe) return;
    
    try {
      await Share.share({
        message: `¡Únete a la tribu "${tribe.name}"! ${tribe.description}`,
        title: tribe.name,
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  }, [tribe]);

  const handleLocationPress = useCallback(() => {
    if (!tribe?.location?.coordinates || tribe.location.isVirtual) return;
    
    const [lng, lat] = tribe.location.coordinates;
    const url = `https://maps.google.com/?q=${lat},${lng}`;
    Linking.openURL(url);
  }, [tribe]);

  const handleMemberPress = useCallback((memberId: string) => {
    router.push('/user/' + memberId);
  }, [router]);

  const renderHeader = () => {
    if (!tribe) return null;

    const categoryInfo = getCategoryInfo();

    return (
      <View style={styles.header}>
        {/* Cover Image or Placeholder */}
        <View style={[styles.cover, { backgroundColor: theme.colors.surfaceVariant }]}>
          {tribe.avatar?.url ? (
            <Image source={{ uri: tribe.avatar.url }} style={styles.coverImage} />
          ) : (
            <View style={styles.coverPlaceholder}>
              <Text style={[styles.coverEmoji, { color: theme.colors.onSurfaceVariant }]}>
                {categoryInfo.icon}
              </Text>
            </View>
          )}
          
          {/* Header Actions */}
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: 'rgba(0,0,0,0.5)' }]}
              onPress={() => router.back()}
            >
              <Ionicons name="arrow-back" size={24} color="white" />
            </TouchableOpacity>
            
            <View style={styles.headerActionsRight}>
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: 'rgba(0,0,0,0.5)' }]}
                onPress={handleShare}
              >
                <Ionicons name="share-outline" size={24} color="white" />
              </TouchableOpacity>
              
              {tribe.isAdmin && (
                <TouchableOpacity
                  style={[styles.actionButton, { backgroundColor: 'rgba(0,0,0,0.5)' }]}
                  onPress={() => router.push('/create-tribe')}
                >
                  <Ionicons name="settings-outline" size={24} color="white" />
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>

        {/* Tribe Info */}
        <View style={styles.tribeInfo}>
          <View style={styles.tribeHeader}>
            <View style={styles.tribeTitle}>
              <Text style={[styles.tribeName, { color: theme.colors.onSurface }]}>
                {tribe.name}
              </Text>
              
              <View style={styles.badgesRow}>
                <View style={[styles.categoryBadge, { backgroundColor: theme.colors.primaryContainer }]}>
                  <Text style={styles.categoryEmoji}>{categoryInfo.icon}</Text>
                  <Text style={[styles.categoryText, { color: theme.colors.onPrimaryContainer }]}>
                    {categoryInfo.label}
                  </Text>
                </View>
                
                {tribe.settings.privacy !== 'public' && (
                  <View style={[styles.privacyBadge, { backgroundColor: theme.colors.errorContainer }]}>
                    <Ionicons
                      name={tribe.settings.privacy === 'private' ? 'lock-closed' : 'eye-off'}
                      size={14}
                      color={theme.colors.onErrorContainer}
                    />
                    <Text style={[styles.privacyText, { color: theme.colors.onErrorContainer }]}>
                      {tribe.settings.privacy === 'private' ? 'Privada' : 'Secreta'}
                    </Text>
                  </View>
                )}
              </View>
            </View>

            {/* Action Button */}
            <TouchableOpacity
              style={[
                styles.joinButton,
                {
                  backgroundColor: tribe.isMember 
                    ? theme.colors.errorContainer 
                    : theme.colors.primary,
                },
                actionLoading && styles.joinButtonDisabled,
              ]}
              onPress={handleJoinLeave}
              disabled={actionLoading}
            >
              {actionLoading ? (
                <ActivityIndicator 
                  size="small" 
                  color={tribe.isMember ? theme.colors.onErrorContainer : theme.colors.onPrimary} 
                />
              ) : (
                <>
                  <Ionicons
                    name={tribe.isMember ? 'exit-outline' : 'add'}
                    size={20}
                    color={tribe.isMember ? theme.colors.onErrorContainer : theme.colors.onPrimary}
                  />
                  <Text
                    style={[
                      styles.joinButtonText,
                      {
                        color: tribe.isMember 
                          ? theme.colors.onErrorContainer 
                          : theme.colors.onPrimary,
                      },
                    ]}
                  >
                    {tribe.isMember ? 'Salir' : 'Unirse'}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Stats */}
          <View style={styles.stats}>
            <View style={styles.stat}>
              <Text style={[styles.statNumber, { color: theme.colors.primary }]}>
                {tribe.stats.totalMembers}
              </Text>
              <Text style={[styles.statLabel, { color: theme.colors.onSurfaceVariant }]}>
                Miembros
              </Text>
            </View>
            
            <View style={styles.stat}>
              <Text style={[styles.statNumber, { color: theme.colors.primary }]}>
                {tribe.stats.totalEvents}
              </Text>
              <Text style={[styles.statLabel, { color: theme.colors.onSurfaceVariant }]}>
                Eventos
              </Text>
            </View>
            
            {tribe.stats.averageRating > 0 && (
              <View style={styles.stat}>
                <View style={styles.ratingContainer}>
                  <Text style={[styles.statNumber, { color: theme.colors.primary }]}>
                    {tribe.stats.averageRating.toFixed(1)}
                  </Text>
                  <Ionicons name="star" size={16} color={theme.colors.primary} />
                </View>
                <Text style={[styles.statLabel, { color: theme.colors.onSurfaceVariant }]}>
                  Rating
                </Text>
              </View>
            )}
          </View>
        </View>
      </View>
    );
  };

  const renderDescription = () => {
    if (!tribe) return null;

    return (
      <View style={[styles.section, { backgroundColor: theme.colors.surface }]}>
        <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
          Descripción
        </Text>
        <Text style={[styles.description, { color: theme.colors.onSurfaceVariant }]}>
          {tribe.description}
        </Text>
      </View>
    );
  };

  const renderLocation = () => {
    if (!tribe?.location) return null;

    return (
      <View style={[styles.section, { backgroundColor: theme.colors.surface }]}>
        <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
          Ubicación
        </Text>
        
        {tribe.location.isVirtual ? (
          <View style={styles.locationItem}>
            <Ionicons name="globe-outline" size={20} color={theme.colors.primary} />
            <Text style={[styles.locationText, { color: theme.colors.onSurfaceVariant }]}>
              Tribu Virtual
            </Text>
          </View>
        ) : (
          <TouchableOpacity style={styles.locationItem} onPress={handleLocationPress}>
            <Ionicons name="location-outline" size={20} color={theme.colors.primary} />
            <Text style={[styles.locationText, { color: theme.colors.onSurfaceVariant }]}>
              {tribe.location.address || 'Ver en mapa'}
            </Text>
            <Ionicons name="chevron-forward" size={16} color={theme.colors.outline} />
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const renderTags = () => {
    if (!tribe?.tags || tribe.tags.length === 0) return null;

    return (
      <View style={[styles.section, { backgroundColor: theme.colors.surface }]}>
        <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
          Intereses
        </Text>
        <View style={styles.tagsContainer}>
          {tribe.tags.map((tag, index) => (
            <View
              key={`${tribe._id}-tag-${tag}-${index}`}
              style={[styles.tag, { backgroundColor: theme.colors.primaryContainer }]}
            >
              <Text style={[styles.tagText, { color: theme.colors.onPrimaryContainer }]}>
                #{tag}
              </Text>
            </View>
          ))}
        </View>
      </View>
    );
  };

  const renderMembers = () => {
    if (!tribe?.members || tribe.members.length === 0) return null;

    const renderMember = ({ item }: { item: any }) => (
      <TouchableOpacity
        style={styles.memberItem}
        onPress={() => handleMemberPress(item.user)}
      >
        <View style={styles.memberInfo}>
          <View style={[styles.memberAvatar, { backgroundColor: theme.colors.primary }]}>
            <Text style={[styles.memberInitial, { color: theme.colors.onPrimary }]}>
              {item.user?.charAt(0)?.toUpperCase() || 'U'}
            </Text>
          </View>
          <View style={styles.memberDetails}>
            <Text style={[styles.memberName, { color: theme.colors.onSurface }]}>
              Usuario #{item.user?.slice(-4)}
            </Text>
            <Text style={[styles.memberRole, { color: theme.colors.onSurfaceVariant }]}>
              {item.role === 'admin' ? 'Administrador' : 
               item.role === 'moderator' ? 'Moderador' : 'Miembro'}
            </Text>
          </View>
        </View>
        
        {item.role === 'admin' && (
          <Ionicons name="star" size={16} color={theme.colors.primary} />
        )}
        {item.role === 'moderator' && (
          <Ionicons name="shield-checkmark" size={16} color={theme.colors.secondary} />
        )}
      </TouchableOpacity>
    );

    return (
      <View style={[styles.section, { backgroundColor: theme.colors.surface }]}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
            Miembros ({tribe.members.length})
          </Text>
          {tribe.members.length > 5 && (
            <TouchableOpacity>
              <Text style={[styles.seeAllText, { color: theme.colors.primary }]}>
                Ver todos
              </Text>
            </TouchableOpacity>
          )}
        </View>
        
        <FlatList
          data={tribe.members.slice(0, 5)}
          renderItem={renderMember}
          keyExtractor={(item, index) => `${item.user}-${index}`}
          scrollEnabled={false}
        />
      </View>
    );
  };

  const renderTabs = () => (
    <View style={[styles.tabsContainer, { backgroundColor: theme.colors.surface }]}>
      <TouchableOpacity
        style={[
          styles.tab,
          activeTab === 'feed' && { borderBottomColor: theme.colors.primary, borderBottomWidth: 2 },
        ]}
        onPress={() => setActiveTab('feed')}
      >
        <Text
          style={[
            styles.tabText,
            { color: activeTab === 'feed' ? theme.colors.primary : theme.colors.onSurfaceVariant },
          ]}
        >
          Feed
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.tab,
          activeTab === 'about' && { borderBottomColor: theme.colors.primary, borderBottomWidth: 2 },
        ]}
        onPress={() => setActiveTab('about')}
      >
        <Text
          style={[
            styles.tabText,
            { color: activeTab === 'about' ? theme.colors.primary : theme.colors.onSurfaceVariant },
          ]}
        >
          Acerca
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderActions = () => {
    if (!tribe?.isMember) return null;

    return (
      <View style={[styles.section, { backgroundColor: theme.colors.surface }]}>
        <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
          Acciones
        </Text>

        <View style={styles.actionsList}>
          <TouchableOpacity style={styles.actionItem}>
            <Ionicons name="chatbubbles-outline" size={24} color={theme.colors.primary} />
            <Text style={[styles.actionText, { color: theme.colors.onSurface }]}>
              Chat de la Tribu
            </Text>
            <Ionicons name="chevron-forward" size={16} color={theme.colors.outline} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionItem}>
            <Ionicons name="calendar-outline" size={24} color={theme.colors.primary} />
            <Text style={[styles.actionText, { color: theme.colors.onSurface }]}>
              Eventos de la Tribu
            </Text>
            <Ionicons name="chevron-forward" size={16} color={theme.colors.outline} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionItem}>
            <Ionicons name="notifications-outline" size={24} color={theme.colors.primary} />
            <Text style={[styles.actionText, { color: theme.colors.onSurface }]}>
              Configurar Notificaciones
            </Text>
            <Ionicons name="chevron-forward" size={16} color={theme.colors.outline} />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={[styles.loadingText, { color: theme.colors.onSurfaceVariant }]}>
            Cargando tribu...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !tribe) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color={theme.colors.error} />
          <Text style={[styles.errorTitle, { color: theme.colors.error }]}>
            Error al cargar tribu
          </Text>
          <Text style={[styles.errorMessage, { color: theme.colors.onSurfaceVariant }]}>
            {error || 'No se pudo encontrar la tribu'}
          </Text>
          <TouchableOpacity
            style={[styles.retryButton, { backgroundColor: theme.colors.primary }]}
            onPress={() => router.back()}
          >
            <Text style={[styles.retryButtonText, { color: theme.colors.onPrimary }]}>
              Volver
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        stickyHeaderIndices={[2]}
      >
        {renderHeader()}

        {/* Stories Bar */}
        <TribeStories tribeId={tribeId} isMember={tribe?.isMember || false} />

        {/* Tabs */}
        {renderTabs()}

        {/* Content based on active tab */}
        {activeTab === 'feed' ? (
          <TribePosts
            tribeId={tribeId}
            isMember={tribe?.isMember || false}
            isAdmin={tribe?.isAdmin || false}
          />
        ) : (
          <>
            {renderDescription()}
            {renderLocation()}
            {renderTags()}
            {renderMembers()}
            {renderActions()}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    gap: 16,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 14,
    textAlign: 'center',
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    marginBottom: 16,
  },
  cover: {
    height: 200,
    position: 'relative',
  },
  coverImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  coverPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  coverEmoji: {
    fontSize: 64,
  },
  headerActions: {
    position: 'absolute',
    top: 16,
    left: 16,
    right: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  headerActionsRight: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tribeInfo: {
    padding: 16,
    gap: 16,
  },
  tribeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 16,
  },
  tribeTitle: {
    flex: 1,
  },
  tribeName: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  badgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  categoryEmoji: {
    fontSize: 14,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '600',
  },
  privacyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  privacyText: {
    fontSize: 12,
    fontWeight: '600',
  },
  joinButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
    gap: 8,
  },
  joinButtonDisabled: {
    opacity: 0.7,
  },
  joinButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  stats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  stat: {
    alignItems: 'center',
    gap: 4,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  section: {
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  seeAllText: {
    fontSize: 14,
    fontWeight: '600',
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
  },
  locationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  locationText: {
    flex: 1,
    fontSize: 16,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  tagText: {
    fontSize: 12,
    fontWeight: '600',
  },
  memberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  memberInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  memberAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  memberInitial: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  memberDetails: {
    gap: 2,
  },
  memberName: {
    fontSize: 16,
    fontWeight: '600',
  },
  memberRole: {
    fontSize: 12,
    fontWeight: '500',
  },
  actionsList: {
    gap: 4,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    gap: 16,
  },
  actionText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
  },
  tabsContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
  },
  tabText: {
    fontSize: 16,
    fontWeight: '600',
  },
});

























