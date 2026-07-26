/**
 * Input.tsx - Modern Input Component with Glassmorphism
 *
 * Features:
 * - Glassmorphism effect
 * - Label support
 * - Error states
 * - Icon support (left/right)
 * - Secure text entry
 * - Multiple variants
 *
 * Fecha: 2025-10-21
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TextInputProps,
  TouchableOpacity,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '@/theme';

export interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: keyof typeof Ionicons.glyphMap;
  rightIcon?: keyof typeof Ionicons.glyphMap;
  onRightIconPress?: () => void;
  variant?: 'glass' | 'solid' | 'outline';
  glassIntensity?: 'light' | 'medium' | 'strong';
  containerStyle?: ViewStyle;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  helperText,
  leftIcon,
  rightIcon,
  onRightIconPress,
  variant = 'glass',
  glassIntensity = 'medium',
  containerStyle,
  secureTextEntry,
  style,
  ...textInputProps
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  const getContainerStyle = (): ViewStyle => {
    if (variant === 'glass') {
      const glassStyle = theme.glass[glassIntensity];
      return {
        ...glassStyle,
        borderWidth: 1,
        borderColor: error
          ? theme.colors.pink
          : isFocused
          ? theme.colors.primary
          : glassStyle.borderColor,
      };
    }

    if (variant === 'solid') {
      return {
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderWidth: 1,
        borderColor: error
          ? theme.colors.pink
          : isFocused
          ? theme.colors.primary
          : 'rgba(255, 255, 255, 0.1)',
      };
    }

    // outline variant
    return {
      backgroundColor: 'transparent',
      borderWidth: 2,
      borderColor: error
        ? theme.colors.pink
        : isFocused
        ? theme.colors.primary
        : 'rgba(255, 255, 255, 0.2)',
    };
  };

  const handleTogglePassword = () => {
    setIsPasswordVisible(!isPasswordVisible);
  };

  const showPasswordToggle = secureTextEntry && !rightIcon;

  return (
    <View style={[styles.wrapper, containerStyle]}>
      {label && <Text style={styles.label}>{label}</Text>}

      <View style={[styles.container, getContainerStyle()]}>
        {leftIcon && (
          <View style={styles.leftIconContainer}>
            <Ionicons
              name={leftIcon}
              size={20}
              color={error ? theme.colors.pink : 'rgba(255, 255, 255, 0.7)'}
            />
          </View>
        )}

        <TextInput
          {...textInputProps}
          style={[styles.input, leftIcon && styles.inputWithLeftIcon, style]}
          placeholderTextColor="rgba(255, 255, 255, 0.5)"
          secureTextEntry={secureTextEntry && !isPasswordVisible}
          onFocus={(e) => {
            setIsFocused(true);
            textInputProps.onFocus?.(e);
          }}
          onBlur={(e) => {
            setIsFocused(false);
            textInputProps.onBlur?.(e);
          }}
        />

        {showPasswordToggle ? (
          <TouchableOpacity
            style={styles.rightIconContainer}
            onPress={handleTogglePassword}
          >
            <Ionicons
              name={isPasswordVisible ? 'eye-off-outline' : 'eye-outline'}
              size={20}
              color="rgba(255, 255, 255, 0.7)"
            />
          </TouchableOpacity>
        ) : rightIcon ? (
          <TouchableOpacity
            style={styles.rightIconContainer}
            onPress={onRightIconPress}
          >
            <Ionicons
              name={rightIcon}
              size={20}
              color={error ? theme.colors.pink : 'rgba(255, 255, 255, 0.7)'}
            />
          </TouchableOpacity>
        ) : null}
      </View>

      {error && (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={14} color={theme.colors.pink} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {helperText && !error && (
        <Text style={styles.helperText}>{helperText}</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 8,
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 16,
    minHeight: 52,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#fff',
    fontWeight: '500',
    paddingVertical: 12,
  },
  inputWithLeftIcon: {
    paddingLeft: 12,
  },
  leftIconContainer: {
    marginRight: 4,
  },
  rightIconContainer: {
    marginLeft: 8,
    padding: 4,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 6,
  },
  errorText: {
    fontSize: 13,
    color: theme.colors.pink,
    fontWeight: '500',
  },
  helperText: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.6)',
    marginTop: 6,
    fontWeight: '400',
  },
});
