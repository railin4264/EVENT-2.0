import React, { useEffect, useRef } from 'react';
import { View, TouchableOpacity, StyleSheet, Animated, Easing } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';

interface ThemeToggleProps {
  size?: number;
  onToggle?: () => void;
}

export function ThemeToggle({ size = 60, onToggle }: ThemeToggleProps) {
  const { theme, isDark, toggleTheme } = useTheme();

  // Animation values
  const switchAnimation = useRef(new Animated.Value(isDark ? 1 : 0)).current;
  const scaleAnimation = useRef(new Animated.Value(1)).current;
  const rotateAnimation = useRef(new Animated.Value(0)).current;
  const glowAnimation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Switch animation
    Animated.timing(switchAnimation, {
      toValue: isDark ? 1 : 0,
      duration: 300,
      easing: Easing.bezier(0.25, 0.46, 0.45, 0.94),
      useNativeDriver: false,
    }).start();

    // Rotation animation
    Animated.timing(rotateAnimation, {
      toValue: isDark ? 1 : 0,
      duration: 500,
      easing: Easing.bezier(0.25, 0.46, 0.45, 0.94),
      useNativeDriver: true,
    }).start();
  }, [isDark, switchAnimation, rotateAnimation]);

  const handlePress = () => {
    // Scale animation on press
    Animated.sequence([
      Animated.timing(scaleAnimation, {
        toValue: 0.9,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnimation, {
        toValue: 1,
        duration: 150,
        easing: Easing.bounce,
        useNativeDriver: true,
      }),
    ]).start();

    // Glow animation
    Animated.sequence([
      Animated.timing(glowAnimation, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(glowAnimation, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();

    toggleTheme();
    onToggle?.();
  };

  // Interpolated values
  const translateX = switchAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [2, size - 32],
  });

  const backgroundColor = switchAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [
      isDark ? 'rgba(52, 211, 153, 0.3)' : 'rgba(16, 185, 129, 0.3)',
      isDark ? 'rgba(16, 185, 129, 0.8)' : 'rgba(52, 211, 153, 0.8)'
    ],
  });

  const borderColor = switchAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [
      theme.colors.border,
      theme.colors.primary
    ],
  });

  const rotation = rotateAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  const glowOpacity = glowAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.6],
  });

  const iconScale = switchAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.1],
  });

  return (
    <View style={styles.container}>
      {/* Glow effect */}
      <Animated.View
        style={[
          styles.glow,
          {
            width: size + 20,
            height: (size * 0.6) + 20,
            opacity: glowOpacity,
            shadowColor: theme.colors.primary,
          },
        ]}
      />

      <TouchableOpacity
        activeOpacity={0.8}
        onPress={handlePress}
        style={[styles.touchable, { transform: [{ scale: scaleAnimation }] }]}
      >
        <Animated.View
          style={[
            styles.track,
            {
              width: size,
              height: size * 0.6,
              backgroundColor,
              borderColor,
              borderRadius: size * 0.3,
            },
          ]}
        >
          {/* Background icons */}
          <View style={styles.backgroundIcons}>
            <Animated.Text
              style={[
                styles.backgroundIcon,
                styles.sunIcon,
                {
                  opacity: switchAnimation.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.6, 0.2],
                  }),
                },
              ]}
            >
              ☀️
            </Animated.Text>
            <Animated.Text
              style={[
                styles.backgroundIcon,
                styles.moonIcon,
                {
                  opacity: switchAnimation.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.2, 0.6],
                  }),
                },
              ]}
            >
              🌙
            </Animated.Text>
          </View>

          {/* Thumb */}
          <Animated.View
            style={[
              styles.thumb,
              {
                width: size * 0.5,
                height: size * 0.5,
                borderRadius: size * 0.25,
                backgroundColor: theme.colors.background,
                transform: [
                  { translateX },
                  { rotate: rotation },
                  { scale: iconScale },
                ],
                shadowColor: theme.colors.primary,
                shadowOffset: {
                  width: 0,
                  height: 2,
                },
                shadowOpacity: 0.25,
                shadowRadius: 4,
                elevation: 5,
              },
            ]}
          >
            <Animated.Text
              style={[
                styles.thumbIcon,
                {
                  fontSize: size * 0.25,
                },
              ]}
            >
              {isDark ? '🌙' : '☀️'}
            </Animated.Text>
          </Animated.View>
        </Animated.View>
      </TouchableOpacity>
    </View>
  );
}

// Advanced theme selector with multiple options
interface ThemeSelectorProps {
  onThemeSelect?: (theme: 'light' | 'dark' | 'system') => void;
}

export function ThemeSelector({ onThemeSelect }: ThemeSelectorProps) {
  const { theme, themeMode, setThemeMode } = useTheme();
  const scaleAnimations = useRef([
    new Animated.Value(1),
    new Animated.Value(1),
    new Animated.Value(1),
  ]).current;

  const themes = [
    { key: 'light', icon: '☀️', label: 'Claro' },
    { key: 'dark', icon: '🌙', label: 'Oscuro' },
    { key: 'system', icon: '📱', label: 'Sistema' },
  ] as const;

  const handleThemeSelect = (selectedTheme: 'light' | 'dark' | 'system', index: number) => {
    // Animate the selected option
    Animated.sequence([
      Animated.timing(scaleAnimations[index], {
        toValue: 0.9,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnimations[index], {
        toValue: 1.1,
        duration: 150,
        easing: Easing.bounce,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnimations[index], {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();

    setThemeMode(selectedTheme);
    onThemeSelect?.(selectedTheme);
  };

  return (
    <View style={[styles.selectorContainer, { backgroundColor: theme.colors.surface }]}>
      {themes.map((themeOption, index) => {
        const isSelected = themeMode === themeOption.key;

        return (
          <TouchableOpacity
            key={themeOption.key}
            onPress={() => handleThemeSelect(themeOption.key, index)}
            style={styles.selectorOption}
          >
            <Animated.View
              style={[
                styles.selectorButton,
                {
                  backgroundColor: isSelected ? theme.colors.primary + '20' : 'transparent',
                  borderColor: isSelected ? theme.colors.primary : theme.colors.border,
                  transform: [{ scale: scaleAnimations[index] }],
                },
              ]}
            >
              <Animated.Text
                style={[
                  styles.selectorIcon,
                  {
                    transform: [
                      {
                        scale: isSelected
                          ? scaleAnimations[index].interpolate({
                              inputRange: [0.9, 1.1],
                              outputRange: [1.2, 1.3],
                              extrapolate: 'clamp',
                            })
                          : 1,
                      },
                    ],
                  },
                ]}
              >
                {themeOption.icon}
              </Animated.Text>
              <Animated.Text
                style={[
                  styles.selectorLabel,
                  {
                    color: isSelected ? theme.colors.primary : theme.colors.textSecondary,
                    fontWeight: isSelected ? '600' : '400',
                  },
                ]}
              >
                {themeOption.label}
              </Animated.Text>
            </Animated.View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  glow: {
    position: 'absolute',
    borderRadius: 20,
    shadowOffset: {
      width: 0,
      height: 0,
    },
    shadowOpacity: 1,
    shadowRadius: 10,
    elevation: 10,
  },
  touchable: {
    zIndex: 1,
  },
  track: {
    borderWidth: 2,
    justifyContent: 'center',
    position: 'relative',
  },
  backgroundIcons: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  backgroundIcon: {
    fontSize: 16,
  },
  sunIcon: {
    marginLeft: 4,
  },
  moonIcon: {
    marginRight: 4,
  },
  thumb: {
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    top: 2,
  },
  thumbIcon: {
    fontWeight: 'bold',
  },
  selectorContainer: {
    flexDirection: 'row',
    borderRadius: 16,
    padding: 8,
    gap: 8,
  },
  selectorOption: {
    flex: 1,
  },
  selectorButton: {
    borderWidth: 2,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  selectorIcon: {
    fontSize: 24,
  },
  selectorLabel: {
    fontSize: 12,
    textAlign: 'center',
  },
});