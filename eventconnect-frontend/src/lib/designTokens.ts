/**
 * EventConnect 2.0 Design System
 * Shared design tokens between Mobile and Web
 * Matching mobile-app/src/styles/homeStyles.ts
 */

export const colors = {
  // Primary Gradients (matching mobile LinearGradient)
  primary: {
    purple: ['#8B5CF6', '#7C3AED'],    // Welcome Banner
    blue: ['#06B6D4', '#0284C7'],      // Streak Banner
    green: ['#10B981', '#059669'],     // Challenge Banner
    orange: ['#F59E0B', '#D97706'],    // Daily Challenge
    violet: ['#8B5CF6', '#7C3AED'],    // Weekly Challenge
    emerald: ['#10B981', '#059669'],   // Social Challenge
    rainbow: ['#8B5CF6', '#06B6D4', '#10B981'], // Stories Ring
  },

  // Neutrals
  neutral: {
    50: '#F9FAFB',
    100: '#F3F4F6',
    200: '#E5E7EB',
    300: '#D1D5DB',
    400: '#9CA3AF',
    500: '#6B7280',
    600: '#4B5563',
    700: '#374151',
    800: '#1F2937',
    900: '#111827',
  },

  // Status Colors
  status: {
    success: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444',
    info: '#3B82F6',
  },

  // Glassmorphism
  glass: {
    white: 'rgba(255, 255, 255, 0.95)',
    light: 'rgba(255, 255, 255, 0.2)',
    dark: 'rgba(0, 0, 0, 0.1)',
  },

  // Badge Colors
  badge: {
    location: {
      bg: '#ECFDF5',
      text: '#059669',
    },
    notification: {
      bg: '#EF4444',
      border: '#FFFFFF',
    },
  },
}

export const gradients = {
  // Mesh Background Gradients
  meshBackground: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',

  // Banner Gradients (matching mobile)
  welcome: `linear-gradient(135deg, ${colors.primary.purple[0]} 0%, ${colors.primary.purple[1]} 100%)`,
  streak: `linear-gradient(135deg, ${colors.primary.blue[0]} 0%, ${colors.primary.blue[1]} 100%)`,
  challenge: `linear-gradient(135deg, ${colors.primary.green[0]} 0%, ${colors.primary.green[1]} 100%)`,

  // Story Ring Gradient
  storyRing: `linear-gradient(135deg, #8B5CF6 0%, #06B6D4 50%, #10B981 100%)`,
  storyViewed: `linear-gradient(135deg, #E5E7EB 0%, #E5E7EB 100%)`,

  // Challenge Type Gradients
  dailyChallenge: `linear-gradient(135deg, ${colors.primary.orange[0]} 0%, ${colors.primary.orange[1]} 100%)`,
  weeklyChallenge: `linear-gradient(135deg, ${colors.primary.violet[0]} 0%, ${colors.primary.violet[1]} 100%)`,
  socialChallenge: `linear-gradient(135deg, ${colors.primary.emerald[0]} 0%, ${colors.primary.emerald[1]} 100%)`,
}

export const shadows = {
  // iOS-style shadows (matching Platform.select iOS)
  ios: {
    sm: '0 2px 8px rgba(0, 0, 0, 0.1)',
    md: '0 4px 12px rgba(0, 0, 0, 0.15)',
    lg: '0 8px 24px rgba(0, 0, 0, 0.2)',
    xl: '0 12px 32px rgba(0, 0, 0, 0.25)',
  },

  // Colored shadows for cards
  colored: {
    purple: '0 8px 24px rgba(139, 92, 246, 0.25)',
    blue: '0 8px 24px rgba(6, 182, 212, 0.25)',
    green: '0 8px 24px rgba(16, 185, 129, 0.25)',
    orange: '0 8px 24px rgba(245, 158, 11, 0.25)',
  },
}

export const spacing = {
  xs: '0.25rem',    // 4px
  sm: '0.5rem',     // 8px
  md: '0.75rem',    // 12px
  lg: '1rem',       // 16px
  xl: '1.25rem',    // 20px
  '2xl': '1.5rem',  // 24px
  '3xl': '2rem',    // 32px
  '4xl': '2.5rem',  // 40px
}

export const borderRadius = {
  sm: '0.5rem',     // 8px - logo, buttons
  md: '0.75rem',    // 12px - badges
  lg: '1rem',       // 16px - banners, cards
  xl: '1.25rem',    // 20px
  '2xl': '1.5rem',  // 24px
  full: '9999px',   // circles
}

export const typography = {
  // Font Sizes (matching mobile fontSize)
  fontSize: {
    xs: '0.625rem',   // 10px - badge text
    sm: '0.75rem',    // 12px - story names
    base: '0.8125rem', // 13px - location text, banner subtitle
    md: '0.875rem',   // 14px
    lg: '1rem',       // 16px - banner title
    xl: '1.125rem',   // 18px
    '2xl': '1.25rem', // 20px
    '3xl': '2rem',    // 32px - banner emoji
  },

  // Font Weights (matching mobile fontWeight)
  fontWeight: {
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },
}

export const zIndex = {
  base: 1,
  dropdown: 10,
  sticky: 100,
  overlay: 200,
  modal: 300,
  popover: 400,
  toast: 500,
}

export const animation = {
  // Matching React Native Reanimated timing
  duration: {
    fast: 200,
    normal: 300,
    slow: 500,
  },

  // Easing functions
  easing: {
    easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
    easeOut: 'cubic-bezier(0.0, 0, 0.2, 1)',
    easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
    spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)', // Matching Spring animation
  },
}

export const breakpoints = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
}
