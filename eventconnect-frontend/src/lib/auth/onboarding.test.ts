import { afterEach, expect, it, vi } from 'vitest'
import { apiClient } from '@/lib/api/client'
import { initialInterests, saveOnboardingSettings } from './onboarding'
import { usersService } from '@/lib/api/services/users.service'
import { AxiosHeaders, type AxiosResponse } from 'axios'

vi.mock('@/lib/api/client', () => ({ apiClient: { get: vi.fn(), put: vi.fn() } }))
vi.mock('@/stores/authStore', () => ({ useAuthStore: { getState: vi.fn() } }))
afterEach(() => vi.clearAllMocks())
const response = <T,>(data: T): AxiosResponse<T> => ({ data, status: 200, statusText: 'OK', headers: {}, config: { headers: new AxiosHeaders() } })

it('normalizes old aliases without discarding legacy choices or silently truncating', () => {
  expect(initialInterests(['tech', 'technology', 'music', 'custom-interest'])).toEqual(['technology', 'music', 'custom-interest'])
  expect(initialInterests(Array.from({ length: 25 }, (_, index) => `legacy-${index}`))).toHaveLength(25)
})

it('accepts the current backend profile response and the normalized envelope', async () => {
  const user = { id: 'test', interests: ['technology'] }
  for (const payload of [{ success: true, user }, { success: true, data: user }]) {
    vi.mocked(apiClient.put).mockResolvedValueOnce(response(payload))
    expect(await usersService.updateProfile({ interests: ['technology'] })).toEqual(user)
  }
})

it('uses a small settings patch and treats unsuccessful responses as failures', async () => {
  vi.mocked(apiClient.put).mockResolvedValueOnce(response({ success: true, settings: { privacy: { showLocation: false } } }))
  await saveOnboardingSettings({ showLocation: false })
  expect(apiClient.put).toHaveBeenCalledWith('/users/me/settings', { privacy: { showLocation: false } })
  expect(apiClient.get).not.toHaveBeenCalled()
  vi.mocked(apiClient.put).mockResolvedValueOnce(response({ success: false }))
  await expect(saveOnboardingSettings({ email: true })).rejects.toThrow()
})
