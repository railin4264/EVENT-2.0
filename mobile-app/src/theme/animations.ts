/**
 * animations.ts - Reusable Animation Configurations
 *
 * Configuraciones de animaciones reutilizables para Event Connect 2025
 * Compatible con react-native-reanimated
 */

// Duraciones estándar (en ms)
export const durations = {
  fast: 200,
  normal: 300,
  slow: 500,
};

// Easing curves
export const easings = {
  easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
  easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
  easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
  bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
};

// Configuraciones de animación predefinidas
export const animations = {
  // Fade in/out
  fadeIn: {
    duration: durations.normal,
    type: 'timing',
    from: { opacity: 0 },
    to: { opacity: 1 },
  },
  fadeOut: {
    duration: durations.normal,
    type: 'timing',
    from: { opacity: 1 },
    to: { opacity: 0 },
  },

  // Scale effects
  scaleUp: {
    duration: durations.fast,
    type: 'spring',
    from: { scale: 1 },
    to: { scale: 1.05 },
  },
  scaleDown: {
    duration: durations.fast,
    type: 'spring',
    from: { scale: 1 },
    to: { scale: 0.95 },
  },

  // Slide in/out
  slideInUp: {
    duration: durations.normal,
    from: { translateY: 50, opacity: 0 },
    to: { translateY: 0, opacity: 1 },
  },
  slideInDown: {
    duration: durations.normal,
    from: { translateY: -50, opacity: 0 },
    to: { translateY: 0, opacity: 1 },
  },
  slideInLeft: {
    duration: durations.normal,
    from: { translateX: -50, opacity: 0 },
    to: { translateX: 0, opacity: 1 },
  },
  slideInRight: {
    duration: durations.normal,
    from: { translateX: 50, opacity: 0 },
    to: { translateX: 0, opacity: 1 },
  },

  // Bounce
  bounceIn: {
    duration: durations.slow,
    type: 'spring',
    from: { scale: 0 },
    to: { scale: 1 },
    config: {
      tension: 100,
      friction: 5,
    },
  },

  // Pulse (para notificaciones, badges, etc.)
  pulse: {
    duration: 1000,
    loop: true,
    from: { scale: 1 },
    to: { scale: 1.1 },
  },

  // Shimmer loading
  shimmer: {
    duration: 1500,
    loop: true,
    from: { translateX: -100 },
    to: { translateX: 100 },
  },
};

// Helper para crear delays escalonados (stagger)
export const createStaggerDelay = (index: number, baseDelay: number = 50) => {
  return index * baseDelay;
};

export default animations;
