import React, { useState, useCallback, useEffect, useRef } from 'react';
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
import { tribeAccess } from '@/utils/tribeAccess';

export default function TribeDetailScreen() {
  const router = useRouter();
  const { id: tribeId } = useLocalSearchParams<{ id: string }>();
  const { theme } = useTheme();
  const { user } = useAuth();

  const { tribe, loading, error, joinTribe, leaveTribe, cancelJoinRequest, approveRequest, rejectRequest, fetchTribe, actionLoading: hookActionLoading } = useTribe(tribeId);
  const [actionLoading, setActionLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'feed' | 'about'>('feed');

  const userId = String(user?._id || (user as { id?: string } | null)?.id || '');
  const access = tribeAccess(tribe, userId);
  const { isPrivate } = access;
  const scope = `${userId}:${tribeId}`;
  const scopeRef = useRef(scope);
  scopeRef.current = scope;
  const mounted = useRef(true);
  const actionLock = useRef<string | null>(null);
  const dialogOpen = useRef(false);
  const [showAllMembers, setShowAllMembers] = useState(false);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  useEffect(() => { setActiveTab('feed'); setShowAllMembers(false); setActionLoading(false); dialogOpen.current = false; }, [scope]);
  const busy = actionLoading || hookActionLoading;

  const runAction = useCallback(async (operation: () => Promise<{ success: boolean; message: string }>, title = 'Listo') => {
    if (actionLock.current === scope || !mounted.current || scopeRef.current !== scope) return;
    actionLock.current = scope;
    setActionLoading(true);
    try {
      const result = await operation();
      if (mounted.current && scopeRef.current === scope) Alert.alert(result.success ? title : 'No se completó la acción', result.message || 'Inténtalo de nuevo.');
    } catch {
      if (mounted.current && scopeRef.current === scope) Alert.alert('No se completó la acción', 'Comprueba tu conexión e inténtalo de nuevo.');
    } finally {
      if (actionLock.current === scope) actionLock.current = null;
      if (mounted.current && scopeRef.current === scope) setActionLoading(false);
    }
  }, [scope]);

  const getCategoryInfo = () => {
    if (!tribe) return { label: '', icon: '📋' };
    return TRIBE_CATEGORIES.find(cat => cat.value === tribe.category) || 
           { label: tribe.category, icon: '📋' };
  };

  const handleJoinLeave = useCallback(() => {
    if (!tribe || busy || dialogOpen.current || ['blocked', 'invitation', 'unavailable'].includes(access.action)) return;
    if (access.action === 'join' || access.action === 'request') {
      void runAction(() => joinTribe(tribe._id), access.action === 'request' ? 'Solicitud enviada' : 'Bienvenido');
      return;
    }
    dialogOpen.current = true;
    const leaving = access.action === 'leave';
    Alert.alert(leaving ? 'Salir de la tribu' : 'Cancelar solicitud',
      leaving ? '¿Quieres salir de esta comunidad?' : '¿Quieres cancelar tu solicitud pendiente?', [
        { text: 'Volver', style: 'cancel', onPress: () => { dialogOpen.current = false; } },
        { text: leaving ? 'Salir' : 'Cancelar solicitud', style: 'destructive', onPress: () => {
          dialogOpen.current = false;
          void runAction(() => leaving ? leaveTribe(tribe._id) : cancelJoinRequest(tribe._id), leaving ? 'Saliste de la tribu' : 'Solicitud cancelada');
        } },
      ], { cancelable: true, onDismiss: () => { dialogOpen.current = false; } });
  }, [tribe, busy, access.action, runAction, joinTribe, leaveTribe, cancelJoinRequest]);

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
                
                {(tribe.privacy === 'private' || tribe.settings?.privacy === 'private' || isPrivate) && (
                  <View style={[styles.privacyBadge, { backgroundColor: theme.colors.errorContainer }]}>
                    <Ionicons
                      name="lock-closed"
                      size={14}
                      color={theme.colors.onErrorContainer}
                    />
                    <Text style={[styles.privacyText, { color: theme.colors.onErrorContainer }]}>
                      Privada
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
                  backgroundColor: access.isMember
                    ? theme.colors.errorContainer 
                    : access.pending
                    ? 'rgba(245, 158, 11, 0.2)'
                    : isPrivate
                    ? 'rgba(139, 92, 246, 0.25)'
                    : theme.colors.primary,
                  borderColor: access.pending ? '#f59e0b' : isPrivate && !access.isMember ? '#8b5cf6' : 'transparent',
                  borderWidth: access.pending || (isPrivate && !access.isMember) ? 1 : 0,
                },
                (busy || ['blocked', 'invitation', 'unavailable'].includes(access.action)) && styles.joinButtonDisabled,
              ]}
              onPress={handleJoinLeave}
              disabled={busy || ['blocked', 'invitation', 'unavailable'].includes(access.action)}
            >
              {busy ? (
                <ActivityIndicator 
                  size="small" 
                  color={access.isMember ? theme.colors.onErrorContainer : '#fff'}
                  />
              ) : (
                <>
                  <Ionicons
                    name={
                      access.isMember
                        ? 'exit-outline'
                        : access.pending
                        ? 'time-outline'
                        : isPrivate
                        ? 'lock-closed-outline'
                        : 'add'
                    }
                    size={20}
                    color={
                      access.isMember
                        ? theme.colors.onErrorContainer
                        : access.pending
                        ? '#f59e0b'
                        : isPrivate
                        ? '#a78bfa'
                        : theme.colors.onPrimary
                    }
                  />
                  <Text
                    style={[
                      styles.joinButtonText,
                      {
                        color: access.isMember
                          ? theme.colors.onErrorContainer 
                          : access.pending
                          ? '#f59e0b'
                          : isPrivate
                          ? '#a78bfa'
                          : theme.colors.onPrimary,
                      },
                    ]}
                  >
                    {access.actionLabel}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Stats */}
          <View style={styles.stats}>
            <View style={styles.stat}>
              <Text style={[styles.statNumber, { color: theme.colors.primary }]}>
                {tribe.stats?.totalMembers ?? tribe.stats?.memberCount ?? tribe.membersCount ?? tribe.members?.length ?? 0}
              </Text>
              <Text style={[styles.statLabel, { color: theme.colors.onSurfaceVariant }]}>
                Miembros
              </Text>
            </View>
            
            <View style={styles.stat}>
              <Text style={[styles.statNumber, { color: theme.colors.primary }]}>
                {tribe.stats?.totalEvents ?? tribe.stats?.eventCount ?? 0}
              </Text>
              <Text style={[styles.statLabel, { color: theme.colors.onSurfaceVariant }]}>
                Eventos
              </Text>
            </View>
            
            {Number(tribe.stats?.averageRating || 0) > 0 && (
              <View style={styles.stat}>
                <View style={styles.ratingContainer}>
                  <Text style={[styles.statNumber, { color: theme.colors.primary }]}>
                    {Number(tribe.stats?.averageRating || 0).toFixed(1)}
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
    if (!access.isMember || !access.canViewContent || !tribe?.members) return null;
    const activeMembers = tribe.members.filter(member => member.status === 'active');
    if (!activeMembers.length) return null;

    const renderMember = ({ item }: { item: any }) => {
      const u = item.user && typeof item.user === 'object' ? item.user : {};
      const userId = String(u._id || item.user || item._id || '');
      const displayName = u.firstName
        ? `${u.firstName} ${u.lastName || ''}`.trim()
        : u.username || item.username || `Usuario #${userId.slice(-4) || 'RD'}`;
      const initial = (displayName.charAt(0) || 'U').toUpperCase();

      return (
        <TouchableOpacity
          style={styles.memberItem}
          onPress={() => handleMemberPress(userId)}
        >
          <View style={styles.memberInfo}>
            <View style={[styles.memberAvatar, { backgroundColor: theme.colors.primary }]}>
              <Text style={[styles.memberInitial, { color: theme.colors.onPrimary }]}>
                {initial}
              </Text>
            </View>
            <View style={styles.memberDetails}>
              <Text style={[styles.memberName, { color: theme.colors.onSurface }]}>
                {displayName}
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
    };

    return (
      <View style={[styles.section, { backgroundColor: theme.colors.surface }]}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
            Miembros ({activeMembers.length})
          </Text>
          {activeMembers.length > 5 && (
            <TouchableOpacity onPress={() => setShowAllMembers(previous => !previous)}>
              <Text style={[styles.seeAllText, { color: theme.colors.primary }]}>
                {showAllMembers ? 'Ver menos' : 'Ver todos'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
        
        <FlatList
          data={activeMembers.slice(0, showAllMembers ? undefined : 5)}
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
    if (!access.isMember) return null;
    return <View style={[styles.section, { backgroundColor: theme.colors.surface }]}>
      <TouchableOpacity style={styles.actionItem} onPress={() => router.push('/settings')} accessibilityRole="button" accessibilityLabel="Abrir ajustes de tu cuenta">
        <Ionicons name="settings-outline" size={24} color={theme.colors.primary} />
        <Text style={[styles.actionText, { color: theme.colors.onSurface }]}>Ajustes de tu cuenta</Text>
        <Ionicons name="chevron-forward" size={16} color={theme.colors.outline} />
      </TouchableOpacity>
    </View>;
  };

  if (loading && !tribe) {
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

  if (!tribe) {
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
            onPress={() => void fetchTribe(tribeId)}
          >
            <Text style={[styles.retryButtonText, { color: theme.colors.onPrimary }]}>
              Reintentar
            </Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.back()} accessibilityRole="button"><Text style={{ color: theme.colors.primary }}>Volver</Text></TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const renderAdminRequests = () => {
    const pendingList = (tribe?.joinRequests || []).filter((r: any) => r.status === 'pending');
    if (!access.canManageRequests) return null;

    return (
      <View style={[styles.section, { backgroundColor: theme.colors.surface, marginHorizontal: 16, marginTop: 16, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: 'rgba(245,158,11,0.3)' }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <Ionicons name="people" size={18} color="#f59e0b" />
          <Text style={{ fontSize: 15, fontWeight: '700', color: theme.colors.onSurface, flex: 1 }}>
            Solicitudes pendientes ({pendingList.length})
          </Text>
        </View>

        {!pendingList.length && <Text style={{ color: theme.colors.onSurfaceVariant }}>No hay solicitudes pendientes.</Text>}
        {pendingList.map((req: any) => {
          const u = req.user || {};
          const displayName = u.firstName ? `${u.firstName} ${u.lastName || ''}`.trim() : u.username || 'Usuario';
          const userId = typeof req.user === 'string' ? req.user : u._id || u.id || '';

          return (
            <View key={String(req._id || userId)} style={{ paddingVertical: 10, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                <Text style={{ fontSize: 14, fontWeight: '600', color: theme.colors.onSurface }}>{displayName}</Text>
                <Text style={{ fontSize: 11, color: theme.colors.onSurfaceVariant }}>@{u.username || 'usuario'}</Text>
              </View>
              {Boolean(req.message) && (
                <Text style={{ fontSize: 12, color: theme.colors.onSurfaceVariant, fontStyle: 'italic', marginBottom: 8 }}>
                  "{req.message}"
                </Text>
              )}
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TouchableOpacity
                  disabled={busy || !userId}
                  style={{ flex: 1, opacity: busy ? 0.5 : 1, backgroundColor: '#10b981', paddingVertical: 8, borderRadius: 10, alignItems: 'center' }}
                  onPress={() => void runAction(() => approveRequest(String(userId)), 'Solicitud aprobada')}
                >
                  <Text style={{ color: '#fff', fontWeight: '700', fontSize: 12 }}>Aprobar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  disabled={busy || !userId}
                  style={{ flex: 1, opacity: busy ? 0.5 : 1, backgroundColor: 'rgba(239,68,68,0.2)', paddingVertical: 8, borderRadius: 10, alignItems: 'center' }}
                  onPress={() => void runAction(() => rejectRequest(String(userId)), 'Solicitud rechazada')}
                >
                  <Text style={{ color: '#ef4444', fontWeight: '700', fontSize: 12 }}>Rechazar</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })}
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}

      >
        {renderHeader()}

        {/* Stories Bar */}
        {access.canViewContent && <TribeStories key={scope} tribeId={tribeId} isMember={access.isMember} />}

        {error && <View style={[styles.section, { backgroundColor: theme.colors.errorContainer }]}>
          <Text style={{ color: theme.colors.onErrorContainer }}>{error}</Text>
          <TouchableOpacity onPress={() => void fetchTribe(tribeId)} accessibilityRole="button"><Text style={{ color: theme.colors.primary, marginTop: 8 }}>Reintentar actualización</Text></TouchableOpacity>
        </View>}
        {/* Tabs */}
        {renderTabs()}
        {renderAdminRequests()}

        {/* Content based on active tab */}
        {activeTab === 'feed' ? (
          !access.canViewContent ? (
            <View style={{ padding: 28, alignItems: 'center', margin: 16, borderRadius: 20, backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', gap: 12 }}>
              <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(245,158,11,0.15)', alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="lock-closed" size={32} color="#f59e0b" />
              </View>
              <Text style={{ fontSize: 18, fontWeight: '700', color: theme.colors.onSurface, textAlign: 'center' }}>
                {access.isBanned ? 'Acceso restringido' : 'Contenido de la comunidad'}
              </Text>
              <Text style={{ fontSize: 13, color: theme.colors.onSurfaceVariant, textAlign: 'center', lineHeight: 20, paddingHorizontal: 12 }}>
                {access.isBanned ? 'Tu acceso está bloqueado. No puedes consultar el contenido ni volver a unirte.' : access.action === 'invitation' ? 'Esta tribu solo admite incorporaciones mediante invitación. Contacta con sus responsables.' : 'Las publicaciones, historias y miembros están disponibles para integrantes activos. Puedes solicitar acceso cuando esté habilitado.'}
              </Text>
              <TouchableOpacity
                style={{ marginTop: 8, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 14, backgroundColor: access.pending ? 'rgba(245,158,11,0.2)' : theme.colors.primary, flexDirection: 'row', alignItems: 'center', gap: 6 }}
                onPress={handleJoinLeave}
                disabled={busy || ['blocked', 'invitation', 'unavailable'].includes(access.action)}
              >
                <Ionicons name={access.pending ? "time-outline" : "send-outline"} size={16} color={access.pending ? "#f59e0b" : "#fff"} />
                <Text style={{ color: access.pending ? "#f59e0b" : theme.colors.onPrimary, fontWeight: '700', fontSize: 14 }}>
                  {access.actionLabel}
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TribePosts
              key={scope}
              tribeId={tribeId}
              isMember={access.isMember}
              isAdmin={access.isAdmin}
            />
          )
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

























