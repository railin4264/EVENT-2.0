import React from 'react';
import { View, Image, Text, StyleSheet } from 'react-native';
import { theme } from '@/theme';

export const AvatarStack = ({ users, limit = 3 }: { users: any[], limit?: number }) => {
  if (!users || users.length === 0) return null;

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      {users.slice(0, limit).map((user, i) => (
        <Image
          key={user._id || i}
          source={{ uri: user.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=100&auto=format&fit=crop' }}
          style={[styles.stackAvatar, { marginLeft: i === 0 ? 0 : -8, zIndex: limit - i }]}
        />
      ))}
      {users.length > limit && (
        <View style={[styles.stackAvatar, styles.stackMore, { marginLeft: -8, zIndex: 0 }]}>
          <Text style={styles.stackMoreText}>+{users.length - limit}</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  stackAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: theme.colors.surface, // Ideally matches parent bg
    backgroundColor: theme.colors.surfaceLight,
  },
  stackMore: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceElevated,
  },
  stackMoreText: {
    fontSize: 10,
    fontWeight: '700',
    color: theme.colors.text,
  },
});
