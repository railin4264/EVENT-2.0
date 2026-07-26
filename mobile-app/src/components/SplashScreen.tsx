/**
 * SplashScreen — EventNow 2.0
 * Dark Neon Urban · fondo #0C0B10 con orbs PINK + VIOLET animados
 */

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  Easing,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

const PINK   = '#ec4899';
const VIOLET = '#8b5cf6';
const BLUE   = '#3b82f6';
const BG     = '#0C0B10';

// ─── Animated floating orb ───────────────────────────────────────────────────
const FloatOrb = ({
  color, size, x, y, duration, delay,
}: {
  color: string; size: number; x: number; y: number;
  duration: number; delay: number;
}) => {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(anim, {
          toValue: 1,
          duration,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(anim, {
          toValue: 0,
          duration,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [0, -18] });

  return (
    <Animated.View
      style={[
        styles.orb,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          left: x,
          top: y,
          transform: [{ translateY }],
        },
      ]}
    >
      <LinearGradient
        colors={[color + '55', 'transparent']}
        style={{ flex: 1, borderRadius: size / 2 }}
      />
    </Animated.View>
  );
};

// ─── Pulsing ring ─────────────────────────────────────────────────────────────
const PulseRing = ({ delay }: { delay: number }) => {
  const scale  = useRef(new Animated.Value(0.8)).current;
  const opacity = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.parallel([
          Animated.timing(scale,   { toValue: 1.4, duration: 1400, easing: Easing.out(Easing.quad), useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 0,   duration: 1400, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(scale,   { toValue: 0.8, duration: 0, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 0.6, duration: 0, useNativeDriver: true }),
        ]),
      ])
    ).start();
  }, []);

  return (
    <Animated.View
      style={[
        styles.ring,
        { transform: [{ scale }], opacity },
      ]}
    >
      <LinearGradient
        colors={[PINK + '40', VIOLET + '20']}
        style={{ flex: 1, borderRadius: 60 }}
      />
    </Animated.View>
  );
};

// ─── Loading dots ─────────────────────────────────────────────────────────────
const LoadingDots = () => {
  const dots = [
    useRef(new Animated.Value(0.3)).current,
    useRef(new Animated.Value(0.3)).current,
    useRef(new Animated.Value(0.3)).current,
  ];

  useEffect(() => {
    const animations = dots.map((dot, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 180),
          Animated.timing(dot, { toValue: 1, duration: 400, useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0.3, duration: 400, useNativeDriver: true }),
          Animated.delay((dots.length - i) * 180),
        ])
      )
    );
    animations.forEach(a => a.start());
    return () => animations.forEach(a => a.stop());
  }, []);

  return (
    <View style={styles.dotsRow}>
      {dots.map((dot, i) => (
        <Animated.View key={i} style={[styles.dot, { opacity: dot }]}>
          {i === 0 ? (
            <LinearGradient
              colors={[PINK, VIOLET]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={{ flex: 1, borderRadius: 4 }}
            />
          ) : (
            <View style={[StyleSheet.absoluteFill, { borderRadius: 4, backgroundColor: i === 1 ? VIOLET : BLUE }]} />
          )}
        </Animated.View>
      ))}
    </View>
  );
};

// ─── Main SplashScreen ────────────────────────────────────────────────────────
export const SplashScreen: React.FC = () => {
  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.7)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 900,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 60,
        friction: 8,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 700,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <View style={styles.container}>
      {/* Background gradient */}
      <LinearGradient
        colors={[BG, '#150D26', BG]}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* Background orbs */}
      <FloatOrb color={PINK}   size={320} x={-80}         y={-60}         duration={4000} delay={0}    />
      <FloatOrb color={VIOLET} size={280} x={width - 180} y={height * 0.25} duration={5000} delay={600} />
      <FloatOrb color={BLUE}   size={200} x={width * 0.2} y={height * 0.6}  duration={3800} delay={300} />

      {/* Centered content */}
      <View style={styles.center}>

        {/* Pulsing rings behind logo */}
        <PulseRing delay={0} />
        <PulseRing delay={700} />

        {/* Logo mark */}
        <Animated.View
          style={[
            styles.logoWrap,
            {
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          <LinearGradient
            colors={[PINK, VIOLET]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={styles.logoGradient}
          >
            {/* Lightning bolt shape with nested views */}
            <View style={styles.logoInner}>
              <View style={styles.bolt1} />
              <View style={styles.bolt2} />
            </View>
          </LinearGradient>
        </Animated.View>

        {/* App name */}
        <Animated.View
          style={{
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
            alignItems: 'center',
          }}
        >
          <Text style={styles.appName}>EventNow</Text>
          <Text style={styles.tagline}>Conectando experiencias</Text>
        </Animated.View>

      </View>

      {/* Loading indicator */}
      <Animated.View style={[styles.bottom, { opacity: fadeAnim }]}>
        <LoadingDots />
        <Text style={styles.loadingText}>Cargando tu mundo...</Text>
      </Animated.View>

      {/* Bottom gradient fade */}
      <LinearGradient
        colors={['transparent', BG + 'CC']}
        style={styles.bottomFade}
        pointerEvents="none"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG,
  },
  orb: {
    position: 'absolute',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ring: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  logoWrap: {
    borderRadius: 28,
    padding: 4,
    borderWidth: 1,
    borderColor: 'rgba(236,72,153,0.35)',
    marginBottom: 28,
    shadowColor: PINK,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.55,
    shadowRadius: 28,
    elevation: 14,
  },
  logoGradient: {
    width: 88,
    height: 88,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoInner: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bolt1: {
    width: 16,
    height: 26,
    backgroundColor: '#fff',
    borderRadius: 3,
    transform: [{ rotate: '15deg' }, { translateX: 2 }],
    opacity: 0.95,
  },
  bolt2: {
    width: 16,
    height: 26,
    backgroundColor: 'rgba(255,255,255,0.6)',
    borderRadius: 3,
    position: 'absolute',
    transform: [{ rotate: '15deg' }, { translateX: -6 }, { translateY: 8 }],
  },
  appName: {
    fontSize: 36,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: -1,
    marginBottom: 8,
  },
  tagline: {
    fontSize: 15,
    color: 'rgba(196,181,253,0.75)',
    fontWeight: '400',
    letterSpacing: 0.5,
  },
  bottom: {
    alignItems: 'center',
    paddingBottom: 48,
    gap: 12,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  dot: {
    width: 28,
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  loadingText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.28)',
    letterSpacing: 0.3,
  },
  bottomFade: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 120,
  },
});
