/**
 * Skeleton.tsx - Skeleton Loader Component with Glassmorphism
 *
 * Features:
 * - Glassmorphism effect
 * - Shimmer animation
 * - Multiple shapes (rectangle, circle, rounded)
 * - Multiple sizes
 *
 * Fecha: 2025-10-21
 */

import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, ViewStyle, DimensionValue } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { theme } from '@/theme';

export interface SkeletonProps {
  width?: DimensionValue;
  height?: number;
  variant?: 'rect' | 'circle' | 'rounded';
  style?: ViewStyle;
  animate?: boolean;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  width = '100%',
  height = 20,
  variant = 'rect',
  style,
  animate = true,
}) => {
  const animatedValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!animate) return;

    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(animatedValue, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(animatedValue, {
          toValue: 0,
          duration: 1200,
          useNativeDriver: true,
        }),
      ])
    );

    animation.start();

    return () => animation.stop();
  }, [animate, animatedValue]);

  const opacity = animatedValue.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.3, 0.7, 0.3],
  });

  const getBorderRadius = () => {
    if (variant === 'circle') return height / 2;
    if (variant === 'rounded') return 12;
    return 8;
  };

  return (
    <View
      style={[
        styles.container,
        {
          width,
          height,
          borderRadius: getBorderRadius(),
        },
        style,
      ]}
    >
      <Animated.View
        style={[
          styles.shimmer,
          {
            opacity: animate ? opacity : 0.4,
            borderRadius: getBorderRadius(),
          },
        ]}
      >
        <LinearGradient
          colors={[
            'rgba(255, 255, 255, 0.05)',
            'rgba(255, 255, 255, 0.15)',
            'rgba(255, 255, 255, 0.05)',
          ]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.gradient, { borderRadius: getBorderRadius() }]}
        />
      </Animated.View>
    </View>
  );
};

// Pre-built Skeleton components for common use cases
export const SkeletonCard: React.FC<{ style?: ViewStyle }> = ({ style }) => (
  <View style={[styles.card, theme.glass.light, style]}>
    <Skeleton width="100%" height={180} variant="rounded" />
    <View style={styles.cardContent}>
      <Skeleton width="70%" height={20} variant="rounded" />
      <Skeleton width="100%" height={16} variant="rounded" style={{ marginTop: 8 }} />
      <Skeleton width="40%" height={16} variant="rounded" style={{ marginTop: 8 }} />
    </View>
  </View>
);

export const SkeletonAvatar: React.FC<{ size?: number; style?: ViewStyle }> = ({
  size = 48,
  style,
}) => <Skeleton width={size} height={size} variant="circle" style={style} />;

export const SkeletonText: React.FC<{
  lines?: number;
  spacing?: number;
  style?: ViewStyle;
}> = ({ lines = 3, spacing = 8, style }) => (
  <View style={style}>
    {Array.from({ length: lines }).map((_, index) => (
      <Skeleton
        key={index}
        width={index === lines - 1 ? '60%' : '100%'}
        height={16}
        variant="rounded"
        style={{ marginBottom: index < lines - 1 ? spacing : 0 }}
      />
    ))}
  </View>
);

export const SkeletonEventCard: React.FC<{ style?: ViewStyle }> = ({ style }) => (
  <View style={[styles.eventCard, theme.glass.medium, style]}>
    <Skeleton width="100%" height={200} variant="rounded" />
    <View style={styles.eventCardContent}>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
        <SkeletonAvatar size={40} />
        <View style={{ marginLeft: 12, flex: 1 }}>
          <Skeleton width="70%" height={18} variant="rounded" />
          <Skeleton width="50%" height={14} variant="rounded" style={{ marginTop: 6 }} />
        </View>
      </View>
      <Skeleton width="100%" height={20} variant="rounded" />
      <Skeleton width="80%" height={16} variant="rounded" style={{ marginTop: 8 }} />
      <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
        <Skeleton width={80} height={32} variant="rounded" />
        <Skeleton width={80} height={32} variant="rounded" />
      </View>
    </View>
  </View>
);

export const SkeletonProfile: React.FC<{ style?: ViewStyle }> = ({ style }) => (
  <View style={[styles.profileSkeleton, style]}>
    {/* Cover */}
    <Skeleton width="100%" height={220} variant="rect" />

    {/* Avatar */}
    <View style={styles.profileAvatarContainer}>
      <SkeletonAvatar size={96} />
    </View>

    {/* Info */}
    <View style={styles.profileInfo}>
      <Skeleton width="60%" height={24} variant="rounded" />
      <Skeleton width="40%" height={16} variant="rounded" style={{ marginTop: 8 }} />

      {/* Stats */}
      <View style={styles.profileStats}>
        {[1, 2, 3, 4].map((i) => (
          <View key={i} style={styles.profileStatItem}>
            <Skeleton width={60} height={60} variant="rounded" />
          </View>
        ))}
      </View>
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    overflow: 'hidden',
  },
  shimmer: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  card: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    marginBottom: 16,
  },
  cardContent: {
    padding: 16,
  },
  eventCard: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    marginBottom: 16,
  },
  eventCardContent: {
    padding: 16,
  },
  profileSkeleton: {
    backgroundColor: theme.colors.background,
  },
  profileAvatarContainer: {
    alignItems: 'center',
    marginTop: -48,
    marginBottom: 16,
  },
  profileInfo: {
    padding: 20,
    alignItems: 'center',
  },
  profileStats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 20,
    width: '100%',
  },
  profileStatItem: {
    width: '48%',
  },
});
