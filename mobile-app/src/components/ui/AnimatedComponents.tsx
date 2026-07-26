import React, { useEffect, useRef } from 'react';
import { View, Animated, Easing, TouchableOpacity, ViewStyle } from 'react-native';

// Bouncy Button with micro-interactions
interface AnimatedButtonProps {
  children: React.ReactNode;
  onPress?: () => void;
  style?: ViewStyle;
  disabled?: boolean;
  hapticFeedback?: boolean;
}

export function AnimatedButton({
  children,
  onPress,
  style,
  disabled = false,
  hapticFeedback = true
}: AnimatedButtonProps) {
  const scaleValue = useRef(new Animated.Value(1)).current;
  const pressValue = useRef(new Animated.Value(0)).current;

  const animatePress = () => {
    if (disabled) return;

    Animated.parallel([
      Animated.sequence([
        Animated.timing(scaleValue, {
          toValue: 0.95,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.spring(scaleValue, {
          toValue: 1,
          tension: 300,
          friction: 10,
          useNativeDriver: true,
        }),
      ]),
      Animated.sequence([
        Animated.timing(pressValue, {
          toValue: 1,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(pressValue, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]),
    ]).start();

    onPress?.();
  };

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={animatePress}
      disabled={disabled}
      style={style}
    >
      <Animated.View
        style={{
          transform: [{ scale: scaleValue }],
          opacity: disabled ? 0.5 : 1,
        }}
      >
        {children}
      </Animated.View>
    </TouchableOpacity>
  );
}

// Floating Action Button with advanced animations
interface FloatingButtonProps {
  onPress?: () => void;
  icon?: React.ReactNode;
  style?: ViewStyle;
  size?: number;
}

export function FloatingButton({
  onPress,
  icon,
  style,
  size = 56
}: FloatingButtonProps) {
  const floatValue = useRef(new Animated.Value(0)).current;
  const scaleValue = useRef(new Animated.Value(1)).current;
  const rotateValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const floatAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(floatValue, {
          toValue: 1,
          duration: 2000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(floatValue, {
          toValue: 0,
          duration: 2000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );

    floatAnimation.start();
    return () => floatAnimation.stop();
  }, [floatValue]);

  const handlePress = () => {
    Animated.parallel([
      Animated.sequence([
        Animated.timing(scaleValue, {
          toValue: 0.9,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(scaleValue, {
          toValue: 1.1,
          duration: 150,
          easing: Easing.bounce,
          useNativeDriver: true,
        }),
        Animated.timing(scaleValue, {
          toValue: 1,
          duration: 100,
          useNativeDriver: true,
        }),
      ]),
      Animated.timing(rotateValue, {
        toValue: 1,
        duration: 300,
        easing: Easing.elastic(1.2),
        useNativeDriver: true,
      }),
    ]).start(() => {
      rotateValue.setValue(0);
    });

    onPress?.();
  };

  const translateY = floatValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -8],
  });

  const rotation = rotateValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <TouchableOpacity
      onPress={handlePress}
      style={[
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          justifyContent: 'center',
          alignItems: 'center',
          elevation: 8,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 8,
        },
        style,
      ]}
    >
      <Animated.View
        style={{
          transform: [
            { translateY },
            { scale: scaleValue },
            { rotate: rotation },
          ],
        }}
      >
        {icon}
      </Animated.View>
    </TouchableOpacity>
  );
}

// Loading dots with staggered animation
export function LoadingDots({ color = '#10B981', size = 8 }: { color?: string; size?: number }) {
  const dot1 = useRef(new Animated.Value(0.3)).current;
  const dot2 = useRef(new Animated.Value(0.3)).current;
  const dot3 = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const createDotAnimation = (dotValue: Animated.Value, delay: number) => {
      return Animated.loop(
        Animated.sequence([
          Animated.timing(dotValue, {
            toValue: 1,
            duration: 600,
            delay,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(dotValue, {
            toValue: 0.3,
            duration: 600,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      );
    };

    const animations = [
      createDotAnimation(dot1, 0),
      createDotAnimation(dot2, 200),
      createDotAnimation(dot3, 400),
    ];

    animations.forEach(anim => anim.start());

    return () => animations.forEach(anim => anim.stop());
  }, [dot1, dot2, dot3]);

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
      <Animated.View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
          opacity: dot1,
        }}
      />
      <Animated.View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
          opacity: dot2,
        }}
      />
      <Animated.View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
          opacity: dot3,
        }}
      />
    </View>
  );
}

// Slide-in animation for content
interface SlideInViewProps {
  children: React.ReactNode;
  direction?: 'left' | 'right' | 'up' | 'down';
  duration?: number;
  delay?: number;
}

export function SlideInView({
  children,
  direction = 'up',
  duration = 500,
  delay = 0
}: SlideInViewProps) {
  const slideValue = useRef(new Animated.Value(0)).current;
  const opacityValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.parallel([
      Animated.timing(slideValue, {
        toValue: 1,
        duration,
        delay,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(opacityValue, {
        toValue: 1,
        duration: duration * 0.8,
        delay,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
    ]);

    animation.start();
  }, [slideValue, opacityValue, duration, delay]);

  const getTransform = () => {
    const distance = 50;
    switch (direction) {
      case 'left':
        return {
          translateX: slideValue.interpolate({
            inputRange: [0, 1],
            outputRange: [-distance, 0],
          }),
        };
      case 'right':
        return {
          translateX: slideValue.interpolate({
            inputRange: [0, 1],
            outputRange: [distance, 0],
          }),
        };
      case 'up':
        return {
          translateY: slideValue.interpolate({
            inputRange: [0, 1],
            outputRange: [distance, 0],
          }),
        };
      case 'down':
        return {
          translateY: slideValue.interpolate({
            inputRange: [0, 1],
            outputRange: [-distance, 0],
          }),
        };
      default:
        return {};
    }
  };

  return (
    <Animated.View
      style={{
        opacity: opacityValue,
        transform: [getTransform()] as any,
      }}
    >
      {children}
    </Animated.View>
  );
}