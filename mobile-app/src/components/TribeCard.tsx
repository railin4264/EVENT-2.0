import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import { Tribe, TRIBE_CATEGORIES } from '@/services/tribesService';

interface TribeCardProps {
  tribe: Tribe;
  onPress: (tribe: Tribe) => void;
  showJoinButton?: boolean;
  onJoin?: (tribeId: string) => void;
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

  const getCategoryInfo = () => {
    return TRIBE_CATEGORIES.find(cat => cat.value === tribe.category) || 
           { label: tribe.category, icon: '📋' };
  };

  const categoryInfo = getCategoryInfo();

  const handleJoin = (e: any) => {
    e.stopPropagation();
    if (onJoin) {
      onJoin(tribe._id);
    }
  };

  const cardStyles = compact 
    ? [styles.compactCard, { backgroundColor: theme.colors.surface }]
    : [styles.card, { backgroundColor: theme.colors.surface, width: cardWidth }];

  return (
    <TouchableOpacity
      style={cardStyles}
      onPress={() => onPress(tribe)}
      activeOpacity={0.7}
    >
      {/* Header with avatar/icon */}
      <View style={styles.header}>
        {tribe.avatar?.url ? (
          <Image source={{ uri: tribe.avatar.url }} style={styles.avatar} />
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
          
          {tribe.settings.privacy !== 'public' && (
            <Ionicons
              name={tribe.settings.privacy === 'private' ? 'lock-closed' : 'eye-off'}
              size={16}
              color={theme.colors.onSurfaceVariant}
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
              {tribe.stats.totalMembers} miembros
            </Text>
          </View>
          
          {tribe.stats.totalEvents > 0 && (
            <View style={styles.stat}>
              <Ionicons 
                name="calendar" 
                size={14} 
                color={theme.colors.primary} 
              />
              <Text style={[styles.statText, { color: theme.colors.onSurfaceVariant }]}>
                {tribe.stats.totalEvents} eventos
              </Text>
            </View>
          )}
        </View>

        {/* Tags */}
        {tribe.tags.length > 0 && !compact && (
          <View style={styles.tags}>
            {tribe.tags.slice(0, 3).map((tag, index) => (
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
        {tribe.isMember ? (
          <View style={[styles.memberBadge, { backgroundColor: theme.colors.primary }]}>
            <Ionicons name="checkmark" size={14} color={theme.colors.onPrimary} />
            <Text style={[styles.memberText, { color: theme.colors.onPrimary }]}>
              Miembro
            </Text>
          </View>
        ) : showJoinButton ? (
          <TouchableOpacity
            style={[styles.joinButton, { backgroundColor: theme.colors.primaryContainer }]}
            onPress={handleJoin}
            activeOpacity={0.7}
          >
            <Ionicons 
              name="add" 
              size={16} 
              color={theme.colors.onPrimaryContainer} 
            />
            <Text style={[styles.joinText, { color: theme.colors.onPrimaryContainer }]}>
              Unirse
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
