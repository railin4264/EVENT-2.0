/**
 * Card.tsx - Glassmorphism Card Component
 *
 * Card con efecto glass automático, elevación y variants
 * Soporta gradientes opcionales y sombras neon
 *
 * Fecha: 2025-10-20
 */

import React, { ReactNode } from 'react';
import { View, StyleSheet, ViewStyle, StyleProp, TouchableOpacity, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import theme from '../../theme';

export interface CardProps {
  children: ReactNode;
  variant?: 'glass' | 'elevated' | 'gradient';
  glassIntensity?: 'light' | 'medium' | 'strong';
  gradient?: readonly [string, string, ...string[]]; // Custom gradient colors
  neonColor?: string; // For neon glow effect
  padding?: number;
  onPress?: () => void;
  style?: ViewStyle;
}

export const Card: React.FC<CardProps> = ({
  children,
  variant = 'glass',
  glassIntensity = 'light',
  gradient,
  neonColor,
  padding = 16,
  onPress,
  style,
}) => {
  // Glass effect styles based on intensity
  const getGlassStyle = (): ViewStyle => {
    switch (glassIntensity) {
      case 'medium':
        return {
          backgroundColor: theme.colors.glassMedium,
          borderColor: 'rgba(255, 255, 255, 0.15)',
        };
      case 'strong':
        return {
          backgroundColor: theme.colors.glassStrong,
          borderColor: 'rgba(255, 255, 255, 0.2)',
        };
      default:
        return {
          backgroundColor: theme.colors.glassLight,
          borderColor: 'rgba(255, 255, 255, 0.1)',
        };
    }
  };

  // Neon shadow effect — cross-platform
  const getNeonShadow = (): ViewStyle => {
    if (!neonColor) return {};
    if (Platform.OS === 'web') {
      return { boxShadow: `0 0 20px ${neonColor}80` } as ViewStyle;
    }
    return Platform.select({
      ios: {
        shadowColor: neonColor,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 20,
      },
      android: { elevation: 8 },
      default: {},
    }) as ViewStyle;
  };

  // Base card style
  const baseCardStyle: ViewStyle = {
    borderRadius: theme.borderRadius.lg,
    padding,
    overflow: 'hidden',
  };

  // If card has onPress, wrap in TouchableOpacity
  const CardWrapper = onPress ? TouchableOpacity : View;
  const cardProps = onPress
    ? {
        onPress,
        activeOpacity: 0.8,
      }
    : {};

  // Gradient variant
  if (variant === 'gradient' && gradient) {
    return (
      <CardWrapper {...cardProps} style={[baseCardStyle, getNeonShadow(), style]}>
        <LinearGradient
          colors={gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.gradientContainer, { padding }]}
        >
          {children}
        </LinearGradient>
      </CardWrapper>
    );
  }

  // Elevated variant
  if (variant === 'elevated') {
    return (
      <CardWrapper
        {...cardProps}
        style={[baseCardStyle, styles.elevated, getGlassStyle(), getNeonShadow(), style]}
      >
        {children}
      </CardWrapper>
    );
  }

  // Default glass variant
  return (
    <CardWrapper
      {...cardProps}
      style={[baseCardStyle, styles.glass, getGlassStyle(), getNeonShadow(), style]}
    >
      {children}
    </CardWrapper>
  );
};

const styles = StyleSheet.create({
  glass: {
    borderWidth: 1,
  },
  elevated: {
    borderWidth: 1,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 6,
  },
  gradientContainer: {
    borderRadius: theme.borderRadius.lg,
  },
});

export default Card;
