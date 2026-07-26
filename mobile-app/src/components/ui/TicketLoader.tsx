import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';

interface TicketLoaderProps {
  size?: number;
  message?: string;
}

export function TicketLoader({ size = 120, message = "Cargando evento..." }: TicketLoaderProps) {
  const { theme } = useTheme();
  const rotateValue = useRef(new Animated.Value(0)).current;
  const scaleValue = useRef(new Animated.Value(1)).current;
  const fadeValue = useRef(new Animated.Value(0.7)).current;

  useEffect(() => {
    const createAnimation = () => {
      return Animated.loop(
        Animated.sequence([
          Animated.parallel([
            Animated.timing(rotateValue, {
              toValue: 1,
              duration: 2000,
              easing: Easing.linear,
              useNativeDriver: true,
            }),
            Animated.sequence([
              Animated.timing(scaleValue, {
                toValue: 1.1,
                duration: 1000,
                easing: Easing.inOut(Easing.ease),
                useNativeDriver: true,
              }),
              Animated.timing(scaleValue, {
                toValue: 1,
                duration: 1000,
                easing: Easing.inOut(Easing.ease),
                useNativeDriver: true,
              }),
            ]),
            Animated.sequence([
              Animated.timing(fadeValue, {
                toValue: 1,
                duration: 1000,
                easing: Easing.inOut(Easing.ease),
                useNativeDriver: true,
              }),
              Animated.timing(fadeValue, {
                toValue: 0.7,
                duration: 1000,
                easing: Easing.inOut(Easing.ease),
                useNativeDriver: true,
              }),
            ]),
          ]),
        ])
      );
    };

    const animation = createAnimation();
    animation.start();

    return () => animation.stop();
  }, [rotateValue, scaleValue, fadeValue]);

  const rotation = rotateValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const ticketStyles = [
    styles.ticket,
    {
      width: size,
      height: size * 0.6,
      backgroundColor: theme.colors.primary + '15',
      borderColor: theme.colors.primary,
      transform: [
        { rotate: rotation },
        { scale: scaleValue },
      ] as any,
      opacity: fadeValue,
    },
  ];

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.loaderContainer}>
        <Animated.View style={ticketStyles as any}>
          {/* Ticket holes */}
          <View style={[styles.hole, styles.leftHole, { backgroundColor: theme.colors.background }]} />
          <View style={[styles.hole, styles.rightHole, { backgroundColor: theme.colors.background }]} />

          {/* Ticket content */}
          <View style={styles.ticketContent}>
            <View style={[styles.dashedLine, { borderColor: theme.colors.primary + '60' }]} />
            <Text style={[styles.ticketText, { color: theme.colors.primary }]}>🎫</Text>
            <View style={[styles.dashedLine, { borderColor: theme.colors.primary + '60' }]} />
          </View>
        </Animated.View>

        {/* Loading dots */}
        <View style={styles.dotsContainer}>
          <LoadingDot delay={0} color={theme.colors.primary} />
          <LoadingDot delay={200} color={theme.colors.primary} />
          <LoadingDot delay={400} color={theme.colors.primary} />
        </View>
      </View>

      <Text style={[styles.message, { color: theme.colors.text }]}>
        {message}
      </Text>
    </View>
  );
}

function LoadingDot({ delay, color }: { delay: number; color: string }) {
  const opacityValue = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacityValue, {
          toValue: 1,
          duration: 600,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(opacityValue, {
          toValue: 0.3,
          duration: 600,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );

    const timeout = setTimeout(() => {
      animation.start();
    }, delay);

    return () => {
      clearTimeout(timeout);
      animation.stop();
    };
  }, [opacityValue, delay]);

  return (
    <Animated.View
      style={[
        styles.dot,
        {
          backgroundColor: color,
          opacity: opacityValue,
        },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loaderContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  ticket: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderRadius: 12,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  hole: {
    position: 'absolute',
    width: 16,
    height: 16,
    borderRadius: 8,
    top: '50%',
    marginTop: -8,
  },
  leftHole: {
    left: -8,
  },
  rightHole: {
    right: -8,
  },
  ticketContent: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    width: '100%',
  },
  dashedLine: {
    width: '60%',
    height: 1,
    borderTopWidth: 1,
    borderStyle: 'dashed',
  },
  ticketText: {
    fontSize: 32,
    fontWeight: 'bold',
    marginVertical: 8,
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  message: {
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
    marginTop: 16,
  },
});