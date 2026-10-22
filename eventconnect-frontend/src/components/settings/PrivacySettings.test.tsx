// @vitest-environment jsdom
import React from 'react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { fireEvent, cleanup, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import PrivacySettings from './PrivacySettings'
const mock = vi.hoisted(() => ({ get: vi.fn(), put: vi.fn() }))
vi.mock('@/lib/api/client', () => ({ apiClient: { get: mock.get, put: mock.put } }))
vi.mock('@/stores/authStore', () => ({ useAuthStore: { getState: () => ({ user: null }) } }))
vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }))
const settings = { privacy: { showProfile: true, showAttendedEvents: true, showLocation: false }, notifications: { push: false } }
const mount = () => render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })}><PrivacySettings user={{ _id: 'owner' }} /></QueryClientProvider>)
beforeEach(() => { vi.stubGlobal('React', React); vi.clearAllMocks(); mock.get.mockResolvedValue({ data: { success: true, settings } }); mock.put.mockResolvedValue({ data: { success: true, settings: { ...settings, privacy: { ...settings.privacy, showLocation: true } } } }) })
afterEach(() => { cleanup(); vi.unstubAllGlobals() })
const location = () => screen.getByRole('checkbox', { name: 'Mostrar ubicación en mi perfil' }) as HTMLInputElement
it('patches just the intended privacy choice and preserves the server response', async () => {
  mount(); await waitFor(() => expect(location().disabled).toBe(false))
  fireEvent.click(location())
  await waitFor(() => expect(mock.put).toHaveBeenCalledWith('/users/me/settings', { privacy: { showLocation: true } }))
  await waitFor(() => expect(location().checked).toBe(true))
})
it('rolls a failed privacy write back instead of leaving a false saved state', async () => {
  mock.put.mockRejectedValue(new Error('Sin conexión')); mount()
  await waitFor(() => expect(location().disabled).toBe(false)); fireEvent.click(location())
  await waitFor(() => expect(location().checked).toBe(false))
})
it('keeps visibility disabled until settings have loaded', async () => {
  mock.get.mockReturnValue(new Promise(() => {})); mount()
  for (const input of screen.getAllByRole('checkbox') as HTMLInputElement[]) expect(input.disabled).toBe(true)
  fireEvent.click(location()); expect(mock.put).not.toHaveBeenCalled()
})
