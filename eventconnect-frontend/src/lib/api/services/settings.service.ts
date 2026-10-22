import { apiClient } from '../client'
import type { ApiResponse } from '@/types/models'

export interface UserSettings {
  notifications: {
    eventReminders: boolean
    newFollowers: boolean
    eventInvites: boolean
    achievements: boolean
    weeklyDigest: boolean
    pushNotifications: boolean
    emailNotifications: boolean
  }
  privacy: {
    profilePublic: boolean
    showLocation: boolean
    allowDirectMessages: boolean
    showOnlineStatus: boolean
    showActivityStatus: boolean
    dataCollection: boolean
  }
  appearance: {
    darkMode: boolean
    language: string
    animations: boolean
    autoPlay: boolean
  }
  account: {
    twoFactorAuth: boolean
    loginAlerts: boolean
    sessionTimeout: number
  }
}

class SettingsService {
  async getUserSettings(userId: string): Promise<ApiResponse<UserSettings>> {
    const response = await apiClient.get<ApiResponse<UserSettings>>(
      `/users/${userId}/settings`
    )
    return response.data
  }

  async updateSettings(userId: string, settings: Partial<UserSettings>): Promise<ApiResponse<UserSettings>> {
    // Use /users/me/settings (token-based) so it works without relying on a client-side userId
    const response = await apiClient.put<ApiResponse<UserSettings>>(
      `/users/me/settings`,
      settings
    )
    return response.data
  }

  async updateNotificationSettings(
    userId: string,
    notifications: Partial<UserSettings['notifications']>
  ): Promise<ApiResponse<UserSettings>> {
    const response = await apiClient.patch<ApiResponse<UserSettings>>(
      `/users/${userId}/settings/notifications`,
      notifications
    )
    return response.data
  }

  async updatePrivacySettings(
    userId: string,
    privacy: Partial<UserSettings['privacy']>
  ): Promise<ApiResponse<UserSettings>> {
    const response = await apiClient.patch<ApiResponse<UserSettings>>(
      `/users/${userId}/settings/privacy`,
      privacy
    )
    return response.data
  }

  async updateAppearanceSettings(
    userId: string,
    appearance: Partial<UserSettings['appearance']>
  ): Promise<ApiResponse<UserSettings>> {
    const response = await apiClient.patch<ApiResponse<UserSettings>>(
      `/users/${userId}/settings/appearance`,
      appearance
    )
    return response.data
  }

  async updateAccountSettings(
    userId: string,
    account: Partial<UserSettings['account']>
  ): Promise<ApiResponse<UserSettings>> {
    const response = await apiClient.patch<ApiResponse<UserSettings>>(
      `/users/${userId}/settings/account`,
      account
    )
    return response.data
  }

  async resetSettings(userId: string): Promise<ApiResponse<UserSettings>> {
    const response = await apiClient.post<ApiResponse<UserSettings>>(
      `/users/${userId}/settings/reset`
    )
    return response.data
  }
}

export const settingsService = new SettingsService()
