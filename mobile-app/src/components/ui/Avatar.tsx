/**
 * Avatar.tsx - Modern Avatar Component
 *
 * Avatar con borders de gradiente opcionales y badges
 * Soporta imágenes, iniciales y variantes de tamaño
 *
 * Fecha: 2025-10-20
 */

import React from 'react';
import { View, Image, Text, StyleSheet, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import theme from '../../theme';

export interface AvatarProps {
  uri?: string;
  name?: string; // Para mostrar iniciales si no hay imagen
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showBorder?: boolean;
  gradient?: readonly [string, string, ...string[]]; // Gradient para el border
  onlineIndicator?: boolean;
  badge?: number; // Para mostrar un contador (ej: mensajes no leídos)
  style?: ViewStyle;
}

export const Avatar: React.FC<AvatarProps> = ({
  uri,
  name,
  size = 'md',
  showBorder = false,
  gradient,
  onlineIndicator = false,
  badge,
  style,
}) => {
  // Size configurations
  const sizeConfig = {
    sm: { size: 32, fontSize: 14, borderWidth: 2 },
    md: { size: 48, fontSize: 18, borderWidth: 3 },
    lg: { size: 64, fontSize: 24, borderWidth: 3 },
    xl: { size: 96, fontSize: 32, borderWidth: 4 },
  };

  const config = sizeConfig[size];

  // Get initials from name
  const getInitials = (): string => {
    if (!name) return '?';
    const names = name.split(' ');
    if (names.length >= 2) {
      return `${names[0][0]}${names[1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  // Avatar content (image or initials)
  const renderContent = () => {
    const contentStyle = {
      width: config.size,
      height: config.size,
      borderRadius: config.size / 2,
    };

    if (uri) {
      return <Image source={{ uri }} style={[contentStyle, styles.image]} />;
    }

    return (
      <View style={[contentStyle, styles.initialsContainer]}>
        <Text style={[styles.initials, { fontSize: config.fontSize }]}>{getInitials()}</Text>
      </View>
    );
  };

  // Online indicator
  const renderOnlineIndicator = () => {
    if (!onlineIndicator) return null;

    const indicatorSize = config.size * 0.25;
    return (
      <View
        style={[
          styles.onlineIndicator,
          {
            width: indicatorSize,
            height: indicatorSize,
            borderRadius: indicatorSize / 2,
            right: config.size * 0.05,
            bottom: config.size * 0.05,
          },
        ]}
      />
    );
  };

  // Badge (contador)
  const renderBadge = () => {
    if (!badge || badge === 0) return null;

    const badgeSize = config.size * 0.35;
    return (
      <View
        style={[
          styles.badge,
          {
            width: badgeSize,
            height: badgeSize,
            borderRadius: badgeSize / 2,
            right: -badgeSize * 0.2,
            top: -badgeSize * 0.2,
          },
        ]}
      >
        <Text style={[styles.badgeText, { fontSize: badgeSize * 0.5 }]}>
          {badge > 99 ? '99+' : badge}
        </Text>
      </View>
    );
  };

  // If showing gradient border
  if (showBorder && gradient) {
    const borderSize = config.size + config.borderWidth * 2;
    return (
      <View style={[{ width: borderSize, height: borderSize }, style]}>
        <LinearGradient
          colors={gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.gradientBorder, { width: borderSize, height: borderSize, borderRadius: borderSize / 2 }]}
        >
          <View style={[styles.avatarInner, { padding: config.borderWidth }]}>
            {renderContent()}
          </View>
        </LinearGradient>
        {renderOnlineIndicator()}
        {renderBadge()}
      </View>
    );
  }

  // Simple avatar without gradient border
  return (
    <View style={[{ width: config.size, height: config.size }, style]}>
      {renderContent()}
      {renderOnlineIndicator()}
      {renderBadge()}
    </View>
  );
};

const styles = StyleSheet.create({
  image: {
    width: '100%',
    height: '100%',
  },
  initialsContainer: {
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  initials: {
    color: '#fff',
    fontWeight: '700',
  },
  gradientBorder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInner: {
    backgroundColor: theme.colors.background,
    borderRadius: 999,
  },
  onlineIndicator: {
    position: 'absolute',
    backgroundColor: theme.colors.success,
    borderWidth: 2,
    borderColor: theme.colors.background,
  },
  badge: {
    position: 'absolute',
    backgroundColor: theme.colors.error,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: theme.colors.background,
  },
  badgeText: {
    color: '#fff',
    fontWeight: '700',
  },
});

export default Avatar;
