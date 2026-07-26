/**
 * gradients.ts — Dark & Electric Gradient System 2025
 *
 * Electric gradient palette for EVENT NOW 2.0
 */

export const gradients = {
  // ── Primary CTAs ──────────────────────────────────────────
  primaryCTA:   ['#8B5CF6', '#7C3AED'],     // electric violet
  electricCTA:  ['#8B5CF6', '#06B6D4'],     // violet → cyan
  cyanCTA:      ['#06B6D4', '#0891B2'],     // cyan
  pinkCTA:      ['#EC4899', '#BE185D'],     // hot pink
  secondaryCTA: ['#EC4899', '#8B5CF6'],     // pink → violet

  // ── Signature aurora gradient ─────────────────────────────
  aurora:  ['#8B5CF6', '#06B6D4', '#EC4899'],  // full electric spectrum
  auroraR: ['#EC4899', '#8B5CF6', '#06B6D4'],  // reversed

  // ── Category gradients ────────────────────────────────────
  music:       ['#8B5CF6', '#EC4899'],  // violet → pink
  technology:  ['#06B6D4', '#3B82F6'],  // cyan → blue
  sports:      ['#10B981', '#06B6D4'],  // emerald → cyan
  food:        ['#F59E0B', '#EF4444'],  // amber → red
  art:         ['#A855F7', '#EC4899'],  // purple → pink
  business:    ['#3B82F6', '#06B6D4'],  // blue → cyan
  gaming:      ['#EC4899', '#8B5CF6'],  // pink → violet
  health:      ['#10B981', '#06B6D4'],  // green → cyan
  education:   ['#8B5CF6', '#3B82F6'],  // violet → blue
  travel:      ['#06B6D4', '#10B981'],  // cyan → green
  social:      ['#F472B6', '#A78BFA'],  // pink light → violet light
  nightlife:   ['#7C3AED', '#EC4899'],  // dark violet → pink

  // ── Featured & Hero ───────────────────────────────────────
  featured:     ['#6D28D9', '#4C1D95'],   // deep violet
  hero:         ['#04040A', '#0D0B14'],   // deep dark
  heroOverlay:  ['transparent', 'rgba(4,4,10,0.92)'],
  heroGlow:     ['rgba(139,92,246,0.25)', 'rgba(6,182,212,0.10)', 'transparent'],

  // ── Card backgrounds ──────────────────────────────────────
  card:         ['rgba(139,92,246,0.06)', 'rgba(6,182,212,0.04)'],
  cardViolet:   ['rgba(139,92,246,0.10)', 'rgba(139,92,246,0.03)'],
  cardCyan:     ['rgba(6,182,212,0.10)',   'rgba(6,182,212,0.03)'],
  cardPink:     ['rgba(236,72,153,0.10)',  'rgba(236,72,153,0.03)'],

  // ── Status ────────────────────────────────────────────────
  success: ['#22c55e', '#16a34a'],
  warning: ['#f59e0b', '#d97706'],
  error:   ['#ef4444', '#dc2626'],

  // ── Loading shimmer ───────────────────────────────────────
  shimmer:      ['rgba(139,92,246,0.02)', 'rgba(139,92,246,0.10)', 'rgba(139,92,246,0.02)'],
  shimmerWhite: ['transparent', 'rgba(255,255,255,0.06)', 'transparent'],

  // ── Glass effect backgrounds ──────────────────────────────
  glass:       ['rgba(139,92,246,0.05)', 'rgba(139,92,246,0.02)'],
  glassStrong: ['rgba(139,92,246,0.10)', 'rgba(139,92,246,0.05)'],
};

export const getCategoryGradient = (category: string): string[] => {
  const key = category.toLowerCase() as keyof typeof gradients;
  const val = gradients[key];
  if (Array.isArray(val) && typeof val[0] === 'string') return val as string[];
  return gradients.primaryCTA;
};

export default gradients;
