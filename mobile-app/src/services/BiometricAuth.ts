import * as LocalAuthentication from 'expo-local-authentication';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BIOMETRIC_ENABLED_KEY = '@biometric_enabled';

/**
 * BiometricAuthService - Servicio de autenticación biométrica
 * Tendencia 2025: Passwordless authentication con Face ID / Touch ID
 */
class BiometricAuthService {
  /**
   * Verifica si el dispositivo soporta autenticación biométrica
   */
  async isAvailable(): Promise<boolean> {
    try {
      const compatible = await LocalAuthentication.hasHardwareAsync();
      if (!compatible) return false;

      const enrolled = await LocalAuthentication.isEnrolledAsync();
      return enrolled;
    } catch (error) {
      console.error('Error checking biometric availability:', error);
      return false;
    }
  }

  /**
   * Obtiene el tipo de biometría disponible
   */
  async getBiometricType(): Promise<string> {
    try {
      const types = await LocalAuthentication.supportedAuthenticationTypesAsync();

      if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
        return Platform.OS === 'ios' ? 'Face ID' : 'Reconocimiento Facial';
      }

      if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
        return Platform.OS === 'ios' ? 'Touch ID' : 'Huella Dactilar';
      }

      if (types.includes(LocalAuthentication.AuthenticationType.IRIS)) {
        return 'Iris';
      }

      return 'Biometría';
    } catch (error) {
      console.error('Error getting biometric type:', error);
      return 'Biometría';
    }
  }

  /**
   * Autentica al usuario con biometría
   */
  async authenticate(reason?: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      const available = await this.isAvailable();
      if (!available) {
        return {
          success: false,
          error: 'La autenticación biométrica no está disponible en este dispositivo',
        };
      }

      const biometricType = await this.getBiometricType();
      const defaultReason = `Usa ${biometricType} para continuar`;

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: reason || defaultReason,
        cancelLabel: 'Cancelar',
        fallbackLabel: 'Usar contraseña',
        disableDeviceFallback: false,
      });

      if (result.success) {
        return { success: true };
      }

      return {
        success: false,
        error: (result as any).error || 'Autenticación fallida',
      };
    } catch (error: any) {
      console.error('Authentication error:', error);
      return {
        success: false,
        error: error.message || 'Error durante la autenticación',
      };
    }
  }

  /**
   * Verifica si el usuario tiene habilitada la autenticación biométrica
   */
  async isEnabled(): Promise<boolean> {
    try {
      const enabled = await AsyncStorage.getItem(BIOMETRIC_ENABLED_KEY);
      return enabled === 'true';
    } catch (error) {
      console.error('Error checking if biometric is enabled:', error);
      return false;
    }
  }

  /**
   * Habilita la autenticación biométrica
   */
  async enable(): Promise<boolean> {
    try {
      const available = await this.isAvailable();
      if (!available) {
        return false;
      }

      // Autenticar antes de habilitar
      const authResult = await this.authenticate(
        'Autentica para habilitar el acceso biométrico'
      );

      if (authResult.success) {
        await AsyncStorage.setItem(BIOMETRIC_ENABLED_KEY, 'true');
        return true;
      }

      return false;
    } catch (error) {
      console.error('Error enabling biometric:', error);
      return false;
    }
  }

  /**
   * Deshabilita la autenticación biométrica
   */
  async disable(): Promise<void> {
    try {
      await AsyncStorage.setItem(BIOMETRIC_ENABLED_KEY, 'false');
    } catch (error) {
      console.error('Error disabling biometric:', error);
    }
  }

  /**
   * Login rápido con biometría
   */
  async quickLogin(): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      const enabled = await this.isEnabled();
      if (!enabled) {
        return {
          success: false,
          error: 'La autenticación biométrica no está habilitada',
        };
      }

      const biometricType = await this.getBiometricType();
      return await this.authenticate(`Usa ${biometricType} para iniciar sesión`);
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Error en el login rápido',
      };
    }
  }

  /**
   * Confirmación de acción sensible (compras, transferencias, etc.)
   */
  async confirmSensitiveAction(action: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    const biometricType = await this.getBiometricType();
    return await this.authenticate(
      `Confirma con ${biometricType} para ${action}`
    );
  }
}

export default new BiometricAuthService();
