import React from 'react';
import {
  View,
  StyleSheet,
  ViewStyle,
  Platform,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';

interface GlassmorphicCardProps {
  children: React.ReactNode;
  intensity?: number;
  tint?: 'light' | 'dark' | 'default';
  borderRadius?: number;
  padding?: number;
  style?: ViewStyle;
  gradient?: boolean;
  gradientColors?: readonly [string, string, ...string[]];
}

/**
 * GlassmorphicCard - Componente con efecto de vidrio esmerilado
 * Tendencia 2025: Glassmorphism para interfaces modernas y elegantes
 */
export default function GlassmorphicCard({
  children,
  intensity = 80,
  tint = 'light',
  borderRadius = 20,
  padding = 16,
  style,
  gradient = false,
  gradientColors = ['rgba(255, 255, 255, 0.1)', 'rgba(255, 255, 255, 0.05)'] as any
}: GlassmorphicCardProps) {
  const containerStyle: ViewStyle = {
    borderRadius,
    overflow: 'hidden',
    ...style,
  };

  if (Platform.OS === 'ios') {
    return (
      <View style={[styles.container, containerStyle]}>
        <BlurView
          intensity={intensity}
          tint={tint}
          style={StyleSheet.absoluteFill}
        />

        {gradient && (
          <LinearGradient
            colors={gradientColors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
        )}

        <View style={[styles.border, { borderRadius }]} />

        <View style={[styles.content, { padding }]}>
          {children}
        </View>
      </View>
    );
  }

  // Fallback para Android
  return (
    <View style={[styles.container, containerStyle]}>
      <LinearGradient
        colors={
          tint === 'dark'
            ? ['rgba(0, 0, 0, 0.7)', 'rgba(0, 0, 0, 0.5)']
            : ['rgba(255, 255, 255, 0.7)', 'rgba(255, 255, 255, 0.5)']
        }
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      <View style={[styles.border, { borderRadius }]} />

      <View style={[styles.content, { padding }]}>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    backgroundColor: 'transparent',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  border: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  content: {
    position: 'relative',
    zIndex: 1,
  },
});
