/**
 * shadow.ts — Cross-platform shadow utility
 *
 * React Native Web deprecated `shadowColor/shadowOffset/shadowOpacity/shadowRadius`.
 * Use this helper to get the correct shadow style per platform.
 *
 * Usage:
 *   import { shadow } from '@/utils/shadow';
 *   style={[styles.card, shadow('violet', 'md')]}
 */
import { Platform, ViewStyle } from 'react-native';

type ShadowColor = 'violet' | 'cyan' | 'pink' | 'black' | 'none';
type ShadowSize  = 'sm' | 'md' | 'lg' | 'xl' | 'neon';

const COLORS: Record<ShadowColor, string> = {
  violet: '139,92,246',
  cyan:   '6,182,212',
  pink:   '236,72,153',
  black:  '0,0,0',
  none:   '0,0,0',
};

const NATIVE: Record<ShadowSize, { radius: number; opacity: number; offsetY: number }> = {
  sm:   { radius: 6,  opacity: 0.18, offsetY: 2 },
  md:   { radius: 12, opacity: 0.22, offsetY: 4 },
  lg:   { radius: 20, opacity: 0.28, offsetY: 6 },
  xl:   { radius: 28, opacity: 0.35, offsetY: 8 },
  neon: { radius: 24, opacity: 0.55, offsetY: 0 },
};

const WEB_BOX: Record<ShadowSize, string> = {
  sm:   '0 2px 8px',
  md:   '0 4px 16px',
  lg:   '0 6px 28px',
  xl:   '0 8px 40px',
  neon: '0 0 24px',
};

export function shadow(
  color: ShadowColor = 'black',
  size: ShadowSize = 'md',
  elevation = 6
): ViewStyle {
  if (color === 'none') return {};

  const rgb = COLORS[color];
  const nat = NATIVE[size];

  if (Platform.OS === 'web') {
    const opacity = nat.opacity;
    return {
      // @ts-ignore — boxShadow is valid on RN Web
      boxShadow: `${WEB_BOX[size]} rgba(${rgb}, ${opacity})`,
    } as ViewStyle;
  }

  return Platform.select({
    ios: {
      shadowColor: `rgb(${rgb})`,
      shadowOffset: { width: 0, height: nat.offsetY },
      shadowOpacity: nat.opacity,
      shadowRadius: nat.radius,
    },
    android: { elevation },
    default: {},
  }) as ViewStyle;
}

/** Convenience presets */
export const shadows = {
  violetSm:  shadow('violet', 'sm',  3),
  violetMd:  shadow('violet', 'md',  6),
  violetLg:  shadow('violet', 'lg',  9),
  violetNeon:shadow('violet', 'neon',10),
  cyanMd:    shadow('cyan',   'md',  6),
  cyanNeon:  shadow('cyan',   'neon',10),
  pinkMd:    shadow('pink',   'md',  6),
  pinkNeon:  shadow('pink',   'neon',10),
  blackSm:   shadow('black',  'sm',  2),
  blackMd:   shadow('black',  'md',  5),
  blackLg:   shadow('black',  'lg',  8),
} as const;
