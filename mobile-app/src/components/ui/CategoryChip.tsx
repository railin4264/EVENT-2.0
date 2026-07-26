import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { theme } from '@/theme';

interface CategoryChipProps {
  label: string;
  isActive: boolean;
  onPress: () => void;
  categoryGradient?: readonly [string, string, ...string[]];
}

export const CategoryChip = ({ label, isActive, onPress, categoryGradient }: CategoryChipProps) => {
  if (isActive) {
    return (
      <TouchableOpacity onPress={onPress}>
        <LinearGradient
          colors={(categoryGradient || theme.gradients.primaryCTA) as any}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.chipActive}
        >
          <Text style={styles.chipActiveText}>{label}</Text>
        </LinearGradient>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity onPress={onPress} style={styles.chipInactive}>
      <Text style={styles.chipInactiveText}>{label}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  chipActive: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
  },
  chipInactive: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    backgroundColor: theme.colors.surfaceLight,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  chipActiveText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  chipInactiveText: {
    color: theme.colors.textSecondary,
    fontWeight: '500',
    fontSize: 14,
  },
});
