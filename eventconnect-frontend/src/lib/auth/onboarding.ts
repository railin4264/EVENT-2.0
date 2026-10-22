import { apiClient } from '@/lib/api/client'
import { categoryMeta } from '@/lib/categories'

export const MAX_ONBOARDING_INTERESTS = 20
export interface OnboardingChoices { email: boolean; push: boolean; showLocation: boolean }
export interface OnboardingSettings {
  notifications?: Record<string, boolean>
  privacy?: Record<string, boolean>
  preferences?: Record<string, unknown>
  [key: string]: unknown
}

export function initialInterests(interests: string[] = []) {
  const known = interests.map(raw => {
    const normalized = categoryMeta(raw.trim().toLowerCase()).slug
    return normalized === 'other' && raw !== 'other' ? raw.trim() : normalized
  }).filter((value): value is string => Boolean(value))
  return [...new Set(known)]
}

export function choicesFromSettings(settings: OnboardingSettings): OnboardingChoices {
  return { email: settings.notifications?.email === true, push: settings.notifications?.push === true,
    showLocation: settings.privacy?.showLocation === true }
}

export async function loadOnboardingSettings(): Promise<OnboardingSettings> {
  const response = await apiClient.get('/users/me/settings')
  const data = response.data
  const settings = data.settings || data.data
  if (!data.success || !settings || typeof settings !== 'object') throw new Error('No pudimos leer tus ajustes actuales.')
  return settings
}

export async function saveOnboardingSettings(choices: Partial<OnboardingChoices>): Promise<OnboardingSettings> {
  // The canonical endpoint merges individual keys. Only send explicit changes.
  const settings: OnboardingSettings = {}
  if (choices.email !== undefined || choices.push !== undefined) settings.notifications = {
    ...(choices.email !== undefined ? { email: choices.email } : {}),
    ...(choices.push !== undefined ? { push: choices.push } : {}),
  }
  if (choices.showLocation !== undefined) settings.privacy = { showLocation: choices.showLocation }
  const response = await apiClient.put('/users/me/settings', settings)
  if (!response.data.success || !response.data.settings) throw new Error('No pudimos guardar tus ajustes.')
  return response.data.settings
}
