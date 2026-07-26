/**
 * Badge.tsx - Modern Badge Component
 *
 * Badges con colores vibrantes para categorías, estados, etc.
 * Soporta variantes y gradientes
 *
 * Fecha: 2025-10-20
 */

import React from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import theme from '../../theme';

export interface BadgeProps {
  children: string;
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'gradient';
  size?: 'sm' | 'md' | 'lg';
  icon?: keyof typeof Ionicons.glyphMap;
  gradient?: readonly [string, string, ...string[]]; // Custom gradient
  style?: ViewStyle;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  icon,
  gradient,
  style,
}) => {
  // Size configuration
  const sizeConfig = {
    sm: { paddingH: 8, paddingV: 4, fontSize: 11 },
    md: { paddingH: 12, paddingV: 6, fontSize: 12 },
    lg: { paddingH: 16, paddingV: 8, fontSize: 14 },
  };

  const config = sizeConfig[size];

  // Get background color based on variant
  const getBackgroundColor = (): string => {
    switch (variant) {
      case 'primary':
        return theme.colors.primary;
      case 'secondary':
        return theme.colors.violet;
      case 'success':
        return theme.colors.success;
      case 'warning':
        return theme.colors.warning;
      case 'error':
        return theme.colors.error;
      default:
        return theme.colors.primary;
    }
  };

  // Badge style
  const badgeStyle: ViewStyle = {
    paddingHorizontal: config.paddingH,
    paddingVertical: config.paddingV,
  };

  // Text style
  const textStyle: TextStyle = {
    fontSize: config.fontSize,
  };

  // Gradient variant
  if (variant === 'gradient' && gradient) {
    return (
      <LinearGradient
        colors={gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={[styles.badge, badgeStyle, style]}
      >
        {icon && (
          <Ionicons name={icon} size={config.fontSize + 2} color="#fff" style={styles.icon} />
        )}
        <Text style={[styles.text, textStyle]}>{children}</Text>
      </LinearGradient>
    );
  }

  // Regular variants
  return (
    <View style={[styles.badge, badgeStyle, { backgroundColor: getBackgroundColor() }, style]}>
      {icon && (
        <Ionicons name={icon} size={config.fontSize + 2} color="#fff" style={styles.icon} />
      )}
      <Text style={[styles.text, textStyle]}>{children}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  text: {
    color: '#fff',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  icon: {
    marginRight: 4,
  },
});

export default Badge;
