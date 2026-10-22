import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import { Tribe, TRIBE_CATEGORIES } from '@/services/tribesService';
import { tribeAccess } from '@/utils/tribeAccess';
import { useAuth } from '@/contexts/AuthContext';

interface TribeCardProps {
  tribe: Tribe;
  onPress: (_tribe: Tribe) => void;
  showJoinButton?: boolean;
  onJoin?: (_tribeId: string) => void | Promise<void>;
  compact?: boolean;
}

const { width } = Dimensions.get('window');
const cardWidth = (width - 48) / 2; // For grid layout

export default function TribeCard({ 
  tribe, 
  onPress, 
  showJoinButton = true,
  onJoin,
  compact = false
}: TribeCardProps) {
  const { theme } = useTheme();
  const { user } = useAuth();
  const access = tribeAccess(tribe, user?._id || user?.id);
  const [joining, setJoining] = useState(false);
  const joiningRef = useRef(false);
  const mounted = useRef(true);
  const scope = `${user?._id || user?.id || 'guest'}:${tribe._id}`;
  const latestScope = useRef(scope);
  latestScope.current = scope;
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  useEffect(() => { joiningRef.current = false; setJoining(false); }, [scope]);

  const getCategoryInfo = () => {
    return TRIBE_CATEGORIES.find(cat => cat.value === tribe.category) || 
           { label: tribe.category, icon: '📋' };
  };

  const categoryInfo = getCategoryInfo();

  const handleJoin = async (e: any) => {
    e.stopPropagation();
    if (!onJoin || joiningRef.current || !['join', 'request'].includes(access.action)) return;
    joiningRef.current = true;
    setJoining(true);
    try { await onJoin(tribe._id); }
    catch { if (mounted.current && latestScope.current === scope) Alert.alert('No se completó la acción', 'Comprueba tu conexión e inténtalo de nuevo.'); }
    finally { if (mounted.current && latestScope.current === scope) { joiningRef.current = false; setJoining(false); } }
  };

  const cardStyles = compact 
    ? [styles.compactCard, { backgroundColor: theme.colors.surface }]
    : [styles.card, { backgroundColor: theme.colors.surface, width: cardWidth }];

  const isPrivate = access.isPrivate;
  const avatarUrl = typeof tribe.avatar === 'string' ? tribe.avatar : tribe.avatar?.url;
  const memberCount = tribe.stats?.totalMembers ?? tribe.stats?.memberCount ?? tribe.membersCount ?? tribe.memberCount ?? (Array.isArray(tribe.members) ? tribe.members.filter(member => member.status === 'active').length : 0);
  const eventCount = tribe.stats?.totalEvents ?? tribe.stats?.eventCount ?? 0;
  const tagsList = Array.isArray(tribe.tags) ? tribe.tags : [];

  return (
    <TouchableOpacity
      style={cardStyles}
      onPress={() => onPress(tribe)}
      activeOpacity={0.7}
    >
      {/* Header with avatar/icon */}
      <View style={styles.header}>
        {avatarUrl ? (
          <Image source={{ uri: avatarUrl }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatarPlaceholder, { backgroundColor: theme.colors.primary }]}>
            <Text style={[styles.avatarEmoji, { color: theme.colors.onPrimary }]}>
              {categoryInfo.icon}
            </Text>
          </View>
        )}
        
        <View style={styles.headerRight}>
          <View style={[styles.categoryBadge, { backgroundColor: theme.colors.primaryContainer }]}>
            <Text style={[styles.categoryText, { color: theme.colors.onPrimaryContainer }]}>
              {categoryInfo.label}
            </Text>
          </View>
          
          {isPrivate && (
            <Ionicons
              name="lock-closed"
              size={15}
              color="#f59e0b"
            />
          )}
        </View>
      </View>

      {/* Content */}
      <View style={styles.content}>
        <Text 
          style={[styles.name, { color: theme.colors.onSurface }]}
          numberOfLines={compact ? 1 : 2}
        >
          {tribe.name}
        </Text>
        
        <Text 
          style={[styles.description, { color: theme.colors.onSurfaceVariant }]}
          numberOfLines={compact ? 2 : 3}
        >
          {tribe.description}
        </Text>

        {/* Stats */}
        <View style={styles.stats}>
          <View style={styles.stat}>
            <Ionicons 
              name="people" 
              size={14} 
              color={theme.colors.primary} 
            />
            <Text style={[styles.statText, { color: theme.colors.onSurfaceVariant }]}>
              {memberCount} miembros
            </Text>
          </View>
          
          {eventCount > 0 && (
            <View style={styles.stat}>
              <Ionicons 
                name="calendar" 
                size={14} 
                color={theme.colors.primary} 
              />
              <Text style={[styles.statText, { color: theme.colors.onSurfaceVariant }]}>
                {eventCount} eventos
              </Text>
            </View>
          )}
        </View>

        {/* Tags */}
        {tagsList.length > 0 && !compact && (
          <View style={styles.tags}>
            {tagsList.slice(0, 3).map((tag, index) => (
              <View
                key={`${tribe._id}-tag-${tag}-${index}`}
                style={[styles.tag, { backgroundColor: theme.colors.surfaceVariant }]}
              >
                <Text style={[styles.tagText, { color: theme.colors.onSurfaceVariant }]}>
                  #{tag}
                </Text>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        {access.isMember ? (
          <View style={[styles.memberBadge, { backgroundColor: theme.colors.primary }]}>
            <Ionicons name="checkmark" size={14} color={theme.colors.onPrimary} />
            <Text style={[styles.memberText, { color: theme.colors.onPrimary }]}>
              Miembro
            </Text>
          </View>
        ) : access.pending ? (
          <View style={[styles.memberBadge, { backgroundColor: 'rgba(245, 158, 11, 0.2)', borderWidth: 1, borderColor: '#f59e0b' }]}>
            <Ionicons name="time-outline" size={14} color="#f59e0b" />
            <Text style={[styles.memberText, { color: '#f59e0b' }]}>
              Pendiente
            </Text>
          </View>
        ) : access.isBanned || (!access.canJoin && !access.canRequestJoin) ? (
          <Text style={[styles.memberText, { color: theme.colors.onSurfaceVariant }]}>{access.actionLabel}</Text>
        ) : showJoinButton && onJoin ? (
          <TouchableOpacity
            style={[styles.joinButton, { backgroundColor: isPrivate ? 'rgba(139, 92, 246, 0.15)' : theme.colors.primaryContainer, borderWidth: isPrivate ? 1 : 0, borderColor: isPrivate ? '#8b5cf6' : 'transparent' }]}
            onPress={handleJoin}
            disabled={joining}
            activeOpacity={0.7}
          >
            {joining ? <ActivityIndicator size="small" color={theme.colors.primary} /> : <Ionicons
              name={access.canRequestJoin ? "lock-closed-outline" : "add"}
              size={14}
              color={isPrivate ? "#a78bfa" : theme.colors.onPrimaryContainer}
            />}
            <Text style={[styles.joinText, { color: isPrivate ? "#a78bfa" : theme.colors.onPrimaryContainer }]}>
              {access.canRequestJoin ? 'Solicitar' : 'Unirse'}
            </Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 16,
    borderRadius: 16,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  compactCard: {
    marginBottom: 12,
    borderRadius: 12,
    padding: 12,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarEmoji: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  headerRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  categoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  stats: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 8,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 12,
    fontWeight: '500',
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
  },
  tag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  tagText: {
    fontSize: 11,
    fontWeight: '500',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: 8,
  },
  memberBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  memberText: {
    fontSize: 12,
    fontWeight: '600',
  },
  joinButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  joinText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
