import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { BlurView } from 'expo-blur';
import { useTheme } from '@/contexts/ThemeContext';

interface GlassCardProps {
  children: React.ReactNode;
  intensity?: number;
  tint?: 'light' | 'dark' | 'default';
  style?: ViewStyle;
  blurRadius?: number;
}

export function GlassCard({
  children,
  intensity = 20,
  tint = 'default',
  style,
  blurRadius = 10
}: GlassCardProps) {
  const { theme, isDark } = useTheme();

  const blurTint = tint === 'default' ? (isDark ? 'dark' : 'light') : tint;

  return (
    <View style={[styles.container, style]}>
      <BlurView
        intensity={intensity}
        tint={blurTint}
        style={[
          styles.blurContainer,
          {
            backgroundColor: isDark
              ? 'rgba(6, 78, 59, 0.15)' // emerald-900 with opacity
              : 'rgba(209, 250, 229, 0.25)' // emerald-100 with opacity
          }
        ]}
      >
        <View style={[
          styles.glassOverlay,
          {
            backgroundColor: isDark
              ? 'rgba(139, 92, 246, 0.07)'
              : 'rgba(139, 92, 246, 0.04)',
            borderColor: isDark
              ? 'rgba(139, 92, 246, 0.20)'
              : 'rgba(139, 92, 246, 0.12)',
          }
        ]}>
          {children}
        </View>
      </BlurView>
    </View>
  );
}

interface GlassButtonProps {
  children: React.ReactNode;
  onPress?: () => void;
  style?: ViewStyle;
  intensity?: number;
  disabled?: boolean;
}

export function GlassButton({
  children,
  onPress,
  style,
  intensity = 15,
  disabled = false
}: GlassButtonProps) {
  const { theme, isDark } = useTheme();

  return (
    <View style={[styles.buttonContainer, style]}>
      <BlurView
        intensity={intensity}
        tint={isDark ? 'dark' : 'light'}
        style={[
          styles.buttonBlur,
          {
            opacity: disabled ? 0.5 : 1,
          }
        ]}
      >
        <View style={[
          styles.buttonOverlay,
          {
            backgroundColor: isDark
              ? 'rgba(16, 185, 129, 0.15)'
              : 'rgba(16, 185, 129, 0.12)',
            borderColor: isDark
              ? 'rgba(52, 211, 153, 0.3)'
              : 'rgba(16, 185, 129, 0.3)',
          }
        ]}>
          {children}
        </View>
      </BlurView>
    </View>
  );
}

interface GlassHeaderProps {
  children: React.ReactNode;
  style?: ViewStyle;
  intensity?: number;
}

export function GlassHeader({ children, style, intensity = 25 }: GlassHeaderProps) {
  const { isDark } = useTheme();

  return (
    <BlurView
      intensity={intensity}
      tint={isDark ? 'dark' : 'light'}
      style={[
        styles.headerContainer,
        {
          backgroundColor: isDark
            ? 'rgba(15, 23, 42, 0.8)' // slate-900 with opacity
            : 'rgba(255, 255, 255, 0.8)', // white with opacity
          borderBottomColor: isDark
            ? 'rgba(52, 211, 153, 0.2)'
            : 'rgba(16, 185, 129, 0.2)',
        },
        style
      ]}
    >
      {children}
    </BlurView>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  blurContainer: {
    flex: 1,
    borderRadius: 16,
  },
  glassOverlay: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  buttonContainer: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  buttonBlur: {
    borderRadius: 12,
  },
  buttonOverlay: {
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  headerContainer: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
});