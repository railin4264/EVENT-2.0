/**
 * ThemeContext — Sistema de Diseño Unificado
 * EventNow 2.0 · Dark Neon Urban
 *
 * Paleta oficial:
 *   BG       #0C0B10   fondo principal de toda la app
 *   SURFACE  #110F1B   superficies / cards
 *   PINK     #ec4899   color primario / CTA
 *   VIOLET   #8b5cf6   color secundario / gradientes
 *   BLUE     #3b82f6   color terciario / info
 *   CYAN     #06b6d4   acento / éxito
 *   ERROR    #f87171
 */

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useColorScheme, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── Token types ──────────────────────────────────────────────────────────────
export interface DesignTokens {
  colors: {
    // Backgrounds
    bg: string;
    bgSecondary: string;
    surface: string;
    surfaceElevated: string;
    overlay: string;

    // Brand
    pink: string;
    violet: string;
    blue: string;
    cyan: string;

    // Semantic
    primary: string;
    secondary: string;
    accent: string;
    error: string;
    success: string;
    warning: string;

    // Text
    text: string;
    textSecondary: string;
    textMuted: string;
    textDisabled: string;

    // Borders
    border: string;
    borderStrong: string;
    borderFocus: string;

    // Glass
    glass: string;
    glassBorder: string;

    // Legacy aliases (para compatibilidad con pantallas existentes)
    background: string;
    onPrimary: string;
    primaryContainer: string;
    onPrimaryContainer: string;
    onSurface: string;
    onSurfaceVariant: string;
    surfaceVariant: string;
    outline: string;
    errorContainer: string;
    onErrorContainer: string;
    textVariant: string;
    info: string;
  };
  gradients: {
    primary: [string, string];
    secondary: [string, string];
    feature: [string, string];
    card: [string, string];
    bg: [string, string, string];
    story: [string, string];
    danger: [string, string];
    success: [string, string];
  };
  glass: {
    light: { backgroundColor: string; borderColor: string; borderWidth: number };
    medium: { backgroundColor: string; borderColor: string; borderWidth: number };
    heavy: { backgroundColor: string; borderColor: string; borderWidth: number };
  };
  spacing: {
    xs: number; sm: number; md: number;
    lg: number; xl: number; xxl: number; xxxl: number;
  };
  borderRadius: {
    sm: number; md: number; lg: number; xl: number; xxl: number;
  };
  typography: {
    h1: { fontSize: number; fontWeight: any; lineHeight: number; letterSpacing: number };
    h2: { fontSize: number; fontWeight: any; lineHeight: number; letterSpacing: number };
    h3: { fontSize: number; fontWeight: any; lineHeight: number; letterSpacing: number };
    body: { fontSize: number; fontWeight: any; lineHeight: number; letterSpacing: number };
    caption: { fontSize: number; fontWeight: any; lineHeight: number; letterSpacing: number };
    button: { fontSize: number; fontWeight: any; lineHeight: number; letterSpacing: number };
  };
  shadows: {
    neonPink: object;
    neonViolet: object;
    neonBlue: object;
    card: object;
  };
}

// ─── Dark & Electric Theme (2025) ────────────────────────────────────────────
const darkTheme: DesignTokens = {
  colors: {
    // Backgrounds — deepest electric black
    bg:              '#04040A',
    bgSecondary:     '#07070F',
    surface:         '#0D0B14',
    surfaceElevated: '#13101E',
    overlay:         'rgba(4,4,10,0.92)',

    // Brand — Electric palette
    pink:   '#EC4899',
    violet: '#8B5CF6',
    blue:   '#3B82F6',
    cyan:   '#06B6D4',

    // Semantic — violet as primary
    primary:   '#8B5CF6',
    secondary: '#06B6D4',
    accent:    '#EC4899',
    error:     '#f87171',
    success:   '#34d399',
    warning:   '#fbbf24',

    // Text
    text:          '#F8FAFC',
    textSecondary: 'rgba(248,250,252,0.60)',
    textMuted:     'rgba(248,250,252,0.35)',
    textDisabled:  'rgba(248,250,252,0.18)',

    // Borders — violet-tinted
    border:      'rgba(139,92,246,0.15)',
    borderStrong:'rgba(139,92,246,0.28)',
    borderFocus: '#8B5CF6',

    // Glass — violet-tinted
    glass:       'rgba(139,92,246,0.06)',
    glassBorder: 'rgba(139,92,246,0.15)',

    // Legacy aliases
    background:          '#04040A',
    onPrimary:           '#ffffff',
    primaryContainer:    'rgba(139,92,246,0.15)',
    onPrimaryContainer:  '#8B5CF6',
    onSurface:           '#F8FAFC',
    onSurfaceVariant:    'rgba(248,250,252,0.60)',
    surfaceVariant:      '#0D0B14',
    outline:             'rgba(139,92,246,0.15)',
    errorContainer:      'rgba(248,113,113,0.12)',
    onErrorContainer:    '#f87171',
    textVariant:         'rgba(248,250,252,0.35)',
    info:                '#3B82F6',
  },

  gradients: {
    primary:   ['#8B5CF6', '#7C3AED'],
    secondary: ['#8B5CF6', '#06B6D4'],
    feature:   ['#8B5CF6', '#EC4899'],
    card:      ['rgba(139,92,246,0.07)', 'rgba(139,92,246,0.02)'],
    bg:        ['#04040A', '#0D0B14', '#04040A'],
    story:     ['#8B5CF6', '#06B6D4'],
    danger:    ['#f87171', '#ef4444'],
    success:   ['#34d399', '#06b6d4'],
  },

  glass: {
    light: {
      backgroundColor: 'rgba(139,92,246,0.06)',
      borderColor:     'rgba(139,92,246,0.14)',
      borderWidth: 1,
    },
    medium: {
      backgroundColor: 'rgba(139,92,246,0.08)',
      borderColor:     'rgba(139,92,246,0.18)',
      borderWidth: 1,
    },
    heavy: {
      backgroundColor: 'rgba(139,92,246,0.04)',
      borderColor:     'rgba(255,255,255,0.06)',
      borderWidth: 1,
    },
  },

  spacing: {
    xs: 4, sm: 8, md: 16,
    lg: 24, xl: 32, xxl: 48, xxxl: 64,
  },

  borderRadius: {
    sm: 8, md: 12, lg: 16, xl: 24, xxl: 32,
  },

  typography: {
    h1: { fontSize: 32, fontWeight: '800', lineHeight: 40, letterSpacing: -0.8 },
    h2: { fontSize: 24, fontWeight: '700', lineHeight: 32, letterSpacing: -0.5 },
    h3: { fontSize: 20, fontWeight: '600', lineHeight: 28, letterSpacing: -0.3 },
    body:    { fontSize: 16, fontWeight: '400', lineHeight: 24, letterSpacing: 0 },
    caption: { fontSize: 13, fontWeight: '400', lineHeight: 18, letterSpacing: 0.2 },
    button:  { fontSize: 16, fontWeight: '700', lineHeight: 20, letterSpacing: 0.3 },
  },

  shadows: {
    neonPink: Platform.select({
      ios:     { shadowColor: '#ec4899', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.55, shadowRadius: 24 },
      android: { elevation: 10 },
      web:     { boxShadow: '0 0 24px rgba(236,72,153,0.55)' },
      default: {},
    }) as any,
    neonViolet: Platform.select({
      ios:     { shadowColor: '#8B5CF6', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.55, shadowRadius: 24 },
      android: { elevation: 10 },
      web:     { boxShadow: '0 0 24px rgba(139,92,246,0.55)' },
      default: {},
    }) as any,
    neonBlue: Platform.select({
      ios:     { shadowColor: '#3b82f6', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.50, shadowRadius: 20 },
      android: { elevation: 8 },
      web:     { boxShadow: '0 0 20px rgba(59,130,246,0.50)' },
      default: {},
    }) as any,
    card: Platform.select({
      ios:     { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 12 },
      android: { elevation: 6 },
      web:     { boxShadow: '0 4px 16px rgba(0,0,0,0.35)' },
      default: {},
    }) as any,
  },
};

// ─── Light Theme (mantiene la misma identidad pero más claro) ─────────────────
const lightTheme: DesignTokens = {
  ...darkTheme,
  colors: {
    ...darkTheme.colors,
    bg:              '#F8F7FF',
    bgSecondary:     '#EEE9FF',
    surface:         '#FFFFFF',
    surfaceElevated: '#F4F0FF',
    overlay:         'rgba(248,247,255,0.95)',

    text:          '#0C0B10',
    textSecondary: 'rgba(12,11,16,0.60)',
    textMuted:     'rgba(12,11,16,0.35)',
    textDisabled:  'rgba(12,11,16,0.20)',

    border:       'rgba(12,11,16,0.10)',
    borderStrong: 'rgba(12,11,16,0.18)',
    borderFocus:  '#ec4899',

    glass:       'rgba(255,255,255,0.70)',
    glassBorder: 'rgba(12,11,16,0.10)',

    background:      '#F8F7FF',
    onSurface:       '#0C0B10',
    onSurfaceVariant:'rgba(12,11,16,0.60)',
    surfaceVariant:  '#EEE9FF',
    outline:         'rgba(12,11,16,0.10)',
    textVariant:     'rgba(12,11,16,0.35)',
  },
  glass: {
    light: {
      backgroundColor: 'rgba(255,255,255,0.80)',
      borderColor:     'rgba(12,11,16,0.08)',
      borderWidth: 1,
    },
    medium: {
      backgroundColor: 'rgba(255,255,255,0.60)',
      borderColor:     'rgba(12,11,16,0.06)',
      borderWidth: 1,
    },
    heavy: {
      backgroundColor: 'rgba(255,255,255,0.40)',
      borderColor:     'rgba(12,11,16,0.04)',
      borderWidth: 1,
    },
  },
};

// ─── Context ──────────────────────────────────────────────────────────────────
type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: DesignTokens;
  themeMode: ThemeMode;
  isDark: boolean;
  setThemeMode: (mode: ThemeMode) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);
const STORAGE_KEY = '@eventnow_theme_mode';

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemColorScheme = useColorScheme();
  const [themeMode, setThemeModeState] = useState<ThemeMode>('dark');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then(saved => {
      if (saved && ['light', 'dark', 'system'].includes(saved)) {
        setThemeModeState(saved as ThemeMode);
      }
      setReady(true);
    }).catch(() => setReady(true));
  }, []);

  const setThemeMode = async (mode: ThemeMode) => {
    try { await AsyncStorage.setItem(STORAGE_KEY, mode); } catch {}
    setThemeModeState(mode);
  };

  const toggleTheme = () =>
    setThemeMode(themeMode === 'dark' ? 'light' : 'dark');

  const isDark =
    themeMode === 'dark' ||
    (themeMode === 'system' && systemColorScheme === 'dark');

  // EventNow es dark-first — default dark incluso en sistema
  const theme = isDark ? darkTheme : lightTheme;

  if (!ready) return null;

  return (
    <ThemeContext.Provider value={{ theme, themeMode, isDark, setThemeMode, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    return {
      theme: darkTheme,
      isDark: true,
      themeMode: 'dark' as ThemeMode,
      setThemeMode: (_mode: ThemeMode) => {},
      toggleTheme: () => {},
      setTheme: () => {},
    };
  }
  return ctx;
}

// ─── Convenience export (para screens que importan `theme` directamente) ────
export { darkTheme as theme };
export default darkTheme;

export { darkTheme, lightTheme };
