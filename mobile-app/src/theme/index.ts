/**
 * theme/index.ts - ACTUALIZADO 2025
 *
 * Sistema de theming completo para Event Connect Mobile
 * Incluye gradientes, sombras, animaciones y glassmorphism
 */

import gradients from './gradients';
import shadows from './shadows';
import animations from './animations';
import glass from './glassmorphism';

export const theme = {
  "colors": {
    // ── Electric primary palette ───────────────────────────
    "primary":      "#8B5CF6",   // electric violet
    "primaryDark":  "#7C3AED",
    "primaryLight": "#A78BFA",

    // ── Secondary & accent ────────────────────────────────
    "secondary":    "#06B6D4",   // cyan electric
    "secondaryDark":"#0891B2",
    "accent":       "#EC4899",   // hot pink
    "accentDark":   "#BE185D",
    "blue":         "#3B82F6",

    // ── Legacy color aliases (keep for component compatibility) ──
    "violet":       "#8B5CF6",   // alias → primary
    "pink":         "#EC4899",   // alias → accent
    "cyan":         "#06B6D4",   // alias → secondary

    // ── Backgrounds (deepest dark) ────────────────────────
    "background":        "#04040A",  // deepest electric black
    "backgroundSecondary":"#07070F",
    "surface":           "#0D0B14",  // slightly lighter
    "surfaceLight":      "#13101E",
    "surfaceElevated":   "#1A1628",
    "modalBg":           "#060510",
    "cardHover":         "rgba(139,92,246,0.08)",
    "navBarBg":          "rgba(4,4,10,0.92)",
    "featuredOverlay":   "rgba(4,4,10,0.55)",

    // ── Price tags ────────────────────────────────────────
    "priceTagFree": "#34d399",
    "priceTagPaid": "#A78BFA",

    // ── Text ──────────────────────────────────────────────
    "text":          "#F8FAFC",
    "textSecondary": "rgba(248,250,252,0.60)",
    "textMuted":     "rgba(248,250,252,0.35)",
    "textDisabled":  "rgba(248,250,252,0.18)",

    // ── Status colors ─────────────────────────────────────
    "success": "#22c55e",
    "warning": "#f59e0b",
    "error":   "#ef4444",
    "info":    "#3b82f6",

    // ── Borders & dividers (violet-tinted) ────────────────
    "border":  "rgba(139,92,246,0.15)",
    "borderStrong": "rgba(139,92,246,0.28)",
    "divider": "rgba(139,92,246,0.08)",

    // ── Glass effects base ────────────────────────────────
    "glassLight":  "rgba(139,92,246,0.05)",
    "glassMedium": "rgba(139,92,246,0.08)",
    "glassStrong": "rgba(139,92,246,0.12)",
    "glassWhite":  "rgba(255,255,255,0.04)",
    "glassCyan":   "rgba(6,182,212,0.07)",
    "glassPink":   "rgba(236,72,153,0.07)",
  },
  "spacing": {
    "xs": 4,
    "sm": 8,
    "md": 16,
    "lg": 24,
    "xl": 32,
    "xxl": 48
  },
  "borderRadius": {
    "sm": 8,
    "md": 12,
    "lg": 16,
    "xl": 20,
    "full": 9999
  },
  "typography": {
    "h1": {
      "fontSize": 48,
      "fontWeight": "800",
      "lineHeight": 56
    },
    "h2": {
      "fontSize": 32,
      "fontWeight": "700",
      "lineHeight": 40
    },
    "h3": {
      "fontSize": 24,
      "fontWeight": "600",
      "lineHeight": 32
    },
    "h4": {
      "fontSize": 20,
      "fontWeight": "600",
      "lineHeight": 28
    },
    "body": {
      "fontSize": 16,
      "fontWeight": "400",
      "lineHeight": 24
    },
    "bodySmall": {
      "fontSize": 14,
      "fontWeight": "400",
      "lineHeight": 20
    },
    "caption": {
      "fontSize": 12,
      "fontWeight": "500",
      "lineHeight": 16
    }
  },
  "shadows": shadows, // Importado de shadows.ts
  "gradients": gradients, // Importado de gradients.ts
  "animations": animations, // Importado de animations.ts
  "glass": glass, // Importado de glassmorphism.ts
};

// Export individual modules
export { gradients } from './gradients';
export { shadows } from './shadows';
export { animations } from './animations';
export { glass } from './glassmorphism';

export default theme;
