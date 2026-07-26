import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

/**
 * HapticService - Servicio centralizado para feedback háptico
 * Tendencia 2025: Micro-interacciones que mejoran la experiencia del usuario
 */
class HapticService {
  private isEnabled: boolean = true;

  /**
   * Habilitar o deshabilitar haptics globalmente
   */
  setEnabled(enabled: boolean) {
    this.isEnabled = enabled;
  }

  /**
   * Feedback ligero - Para interacciones sutiles
   * Uso: Hover, selección de filtros, tabs
   */
  async light() {
    if (!this.isEnabled || Platform.OS === 'web') return;

    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (error) {
      console.warn('Haptic light failed:', error);
    }
  }

  /**
   * Feedback medio - Para interacciones estándar
   * Uso: Botones, selecciones, toggles
   */
  async medium() {
    if (!this.isEnabled || Platform.OS === 'web') return;

    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (error) {
      console.warn('Haptic medium failed:', error);
    }
  }

  /**
   * Feedback fuerte - Para interacciones importantes
   * Uso: Confirmaciones, acciones críticas
   */
  async heavy() {
    if (!this.isEnabled || Platform.OS === 'web') return;

    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    } catch (error) {
      console.warn('Haptic heavy failed:', error);
    }
  }

  /**
   * Feedback de éxito
   * Uso: Operaciones completadas, guardado exitoso
   */
  async success() {
    if (!this.isEnabled || Platform.OS === 'web') return;

    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.warn('Haptic success failed:', error);
    }
  }

  /**
   * Feedback de advertencia
   * Uso: Validaciones fallidas, campos requeridos
   */
  async warning() {
    if (!this.isEnabled || Platform.OS === 'web') return;

    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    } catch (error) {
      console.warn('Haptic warning failed:', error);
    }
  }

  /**
   * Feedback de error
   * Uso: Errores, fallos de operación
   */
  async error() {
    if (!this.isEnabled || Platform.OS === 'web') return;

    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } catch (error) {
      console.warn('Haptic error failed:', error);
    }
  }

  /**
   * Feedback de selección
   * Uso: Cambio entre items, carruseles, pickers
   */
  async selection() {
    if (!this.isEnabled || Platform.OS === 'web') return;

    try {
      await Haptics.selectionAsync();
    } catch (error) {
      console.warn('Haptic selection failed:', error);
    }
  }

  /**
   * Patrón de feedback para favoritos
   * Doble tap con feedback medio y success
   */
  async favorite() {
    if (!this.isEnabled || Platform.OS === 'web') return;

    await this.medium();
    setTimeout(async () => {
      await this.success();
    }, 100);
  }

  /**
   * Patrón de feedback para compartir
   */
  async share() {
    if (!this.isEnabled || Platform.OS === 'web') return;

    await this.light();
    setTimeout(async () => {
      await this.medium();
    }, 50);
  }

  /**
   * Patrón de feedback para like/react
   */
  async like() {
    if (!this.isEnabled || Platform.OS === 'web') return;

    await this.medium();
    setTimeout(async () => {
      await this.light();
    }, 80);
  }

  /**
   * Patrón de feedback para logros desbloqueados
   */
  async achievementUnlocked() {
    if (!this.isEnabled || Platform.OS === 'web') return;

    await this.heavy();
    setTimeout(async () => {
      await this.success();
    }, 150);
  }

  /**
   * Patrón de feedback para navegación
   */
  async navigation() {
    if (!this.isEnabled || Platform.OS === 'web') return;

    await this.light();
  }

  /**
   * Patrón de feedback para pull to refresh
   */
  async refresh() {
    if (!this.isEnabled || Platform.OS === 'web') return;

    await this.selection();
  }

  /**
   * Patrón de feedback para confirmación de compra/registro
   */
  async purchase() {
    if (!this.isEnabled || Platform.OS === 'web') return;

    await this.heavy();
    setTimeout(async () => {
      await this.success();
    }, 200);
    setTimeout(async () => {
      await this.light();
    }, 400);
  }

  /**
   * Patrón de feedback para deslizar (swipe)
   */
  async swipe() {
    if (!this.isEnabled || Platform.OS === 'web') return;

    await this.light();
  }

  /**
   * Patrón de feedback para mantener presionado (long press)
   */
  async longPress() {
    if (!this.isEnabled || Platform.OS === 'web') return;

    await this.medium();
    setTimeout(async () => {
      await this.heavy();
    }, 300);
  }
}

export default new HapticService();
