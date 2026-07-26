/**
 * Button.tsx - Modern Button Component with Gradients
 *
 * Variantes: primary (gradient), secondary, outline, ghost, icon
 * Incluye micro-animaciones y estados hover/pressed
 *
 * Fecha: 2025-10-20
 * Updated: 2025-10-21 - Added reanimated micro-animations
 */

import React from 'react';
import {
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  interpolate,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import theme from '../../theme';

export interface ButtonProps {
  children: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'icon';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  disabled?: boolean;
  loading?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  iconPosition?: 'left' | 'right';
  gradient?: readonly [string, string, ...string[]]; // Custom gradient colors
  style?: ViewStyle;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  onPress,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  disabled = false,
  loading = false,
  icon,
  iconPosition = 'left',
  gradient,
  style,
}) => {
  // Animated values
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  // Size configurations
  const sizeConfig = {
    sm: { height: 40, paddingHorizontal: 16, fontSize: 14 },
    md: { height: 48, paddingHorizontal: 24, fontSize: 16 },
    lg: { height: 56, paddingHorizontal: 32, fontSize: 18 },
  };

  const config = sizeConfig[size];

  // Gradient colors based on variant
  const getGradientColors = (): readonly [string, string, ...string[]] => {
    if (gradient) return gradient;

    switch (variant) {
      case 'primary':
        return theme.gradients.primaryCTA as any;
      case 'secondary':
        return theme.gradients.secondaryCTA as any;
      default:
        return ['transparent', 'transparent'];
    }
  };

  // Gesture handlers for micro-animations
  const tapGesture = Gesture.Tap()
    .enabled(!disabled && !loading)
    .onBegin(() => {
      scale.value = withSpring(0.95, {
        damping: 15,
        stiffness: 300,
      });
      opacity.value = withTiming(0.8, { duration: 100 });
    })
    .onFinalize(() => {
      scale.value = withSpring(1, {
        damping: 15,
        stiffness: 300,
      });
      opacity.value = withTiming(1, { duration: 150 });
      onPress();
    });

  // Animated style
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  // Render content
  const renderContent = () => (
    <>
      {loading ? (
        <ActivityIndicator color="#fff" size="small" />
      ) : (
        <>
          {icon && iconPosition === 'left' && (
            <Ionicons
              name={icon}
              size={config.fontSize + 2}
              color={variant === 'outline' || variant === 'ghost' ? theme.colors.primary : '#fff'}
              style={styles.iconLeft}
            />
          )}
          <Text
            style={[
              styles.text,
              { fontSize: config.fontSize },
              variant === 'outline' && styles.textOutline,
              variant === 'ghost' && styles.textGhost,
              disabled && styles.textDisabled,
            ]}
          >
            {children}
          </Text>
          {icon && iconPosition === 'right' && (
            <Ionicons
              name={icon}
              size={config.fontSize + 2}
              color={variant === 'outline' || variant === 'ghost' ? theme.colors.primary : '#fff'}
              style={styles.iconRight}
            />
          )}
        </>
      )}
    </>
  );

  // Button base styles
  const buttonStyle: ViewStyle = {
    height: config.height,
    paddingHorizontal: config.paddingHorizontal,
    width: fullWidth ? '100%' : 'auto',
    opacity: disabled ? 0.5 : 1,
  };

  // Primary & Secondary use gradients
  if (variant === 'primary' || variant === 'secondary') {
    return (
      <GestureDetector gesture={tapGesture}>
        <Animated.View style={[animatedStyle, buttonStyle, style]}>
          <LinearGradient
            colors={getGradientColors()}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[styles.gradient, theme.shadows.neonBlue]}
          >
            {renderContent()}
          </LinearGradient>
        </Animated.View>
      </GestureDetector>
    );
  }

  // Outline & Ghost variants
  return (
    <GestureDetector gesture={tapGesture}>
      <Animated.View
        style={[
          animatedStyle,
          styles.button,
          buttonStyle,
          variant === 'outline' && styles.buttonOutline,
          variant === 'ghost' && styles.buttonGhost,
          variant === 'icon' && styles.buttonIcon,
          style,
        ]}
      >
        {renderContent()}
      </Animated.View>
    </GestureDetector>
  );
};

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
  },
  gradient: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
  },
  buttonOutline: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: theme.colors.primary,
  },
  buttonGhost: {
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
  },
  buttonIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.colors.glassLight,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  text: {
    color: '#fff',
    fontWeight: '600',
    textAlign: 'center',
  },
  textOutline: {
    color: theme.colors.primary,
  },
  textGhost: {
    color: theme.colors.primary,
  },
  textDisabled: {
    opacity: 0.5,
  },
  iconLeft: {
    marginRight: 8,
  },
  iconRight: {
    marginLeft: 8,
  },
});

export default Button;
