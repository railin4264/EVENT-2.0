/**
 * glassmorphism.ts — Electric Glass Effects 2025
 *
 * Violet-tinted glass for EVENT NOW 2.0 Dark & Electric theme
 */

export const glass = {
  // ── Neutral glass (subtle white tint) ─────────────────────
  light: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  medium: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  strong: {
    backgroundColor: 'rgba(255,255,255,0.09)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
  },

  // ── Electric violet glass (primary) ───────────────────────
  violet: {
    backgroundColor: 'rgba(139,92,246,0.07)',
    borderWidth: 1,
    borderColor: 'rgba(139,92,246,0.18)',
  },
  violetStrong: {
    backgroundColor: 'rgba(139,92,246,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(139,92,246,0.28)',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 6,
  },

  // ── Cyan electric glass ────────────────────────────────────
  cyan: {
    backgroundColor: 'rgba(6,182,212,0.07)',
    borderWidth: 1,
    borderColor: 'rgba(6,182,212,0.18)',
  },
  cyanStrong: {
    backgroundColor: 'rgba(6,182,212,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(6,182,212,0.28)',
    shadowColor: '#06B6D4',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 6,
  },

  // ── Hot pink glass ─────────────────────────────────────────
  pink: {
    backgroundColor: 'rgba(236,72,153,0.07)',
    borderWidth: 1,
    borderColor: 'rgba(236,72,153,0.18)',
  },
  pinkStrong: {
    backgroundColor: 'rgba(236,72,153,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(236,72,153,0.28)',
    shadowColor: '#EC4899',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 6,
  },

  // Deprecated aliases
  primary: {
    backgroundColor: 'rgba(139,92,246,0.07)',
    borderWidth: 1,
    borderColor: 'rgba(139,92,246,0.18)',
  },
};

export const glassCard = {
  base: {
    ...glass.violet,
    borderRadius: 20,
    padding: 16,
    overflow: 'hidden' as const,
  },
  elevated: {
    ...glass.violetStrong,
    borderRadius: 24,
    padding: 20,
    overflow: 'hidden' as const,
  },
  featured: {
    backgroundColor: 'rgba(13,11,20,0.85)',
    borderWidth: 1,
    borderColor: 'rgba(139,92,246,0.22)',
    borderRadius: 24,
    padding: 20,
    overflow: 'hidden' as const,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.20,
    shadowRadius: 20,
    elevation: 8,
  },
};

export const createGlassEffect = (
  opacity: number = 0.07,
  borderOpacity: number = 0.18,
  tintColor?: string
) => {
  const hexToRgb = (hex: string): string => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`
      : '139, 92, 246';
  };

  const rgb = tintColor ? hexToRgb(tintColor) : '139, 92, 246';

  return {
    backgroundColor: `rgba(${rgb}, ${opacity})`,
    borderWidth: 1,
    borderColor: `rgba(${rgb}, ${borderOpacity})`,
  };
};

export default glass;
