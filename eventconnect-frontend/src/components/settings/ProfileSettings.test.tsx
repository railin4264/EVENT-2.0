// @vitest-environment jsdom
import React from 'react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { fireEvent, cleanup, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import ProfileSettings from './ProfileSettings'
const mock = vi.hoisted(() => ({ put: vi.fn(), updateUser: vi.fn(), user: { id: 'owner' } }))
vi.mock('@/lib/api/client', () => ({ apiClient: { put: mock.put, post: vi.fn() } }))
vi.mock('@/stores/authStore', () => ({ useAuthStore: { getState: () => ({ user: mock.user, updateUser: mock.updateUser }) } }))
vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }))
vi.mock('next-cloudinary', () => ({ CldImage: () => { throw new Error('Cloud name not configured') } }))
const user = { id: 'owner', firstName: 'Rosa', lastName: '', username: 'rosa_owner', avatar: 'https://example.test/avatar.jpg', coverImage: 'https://example.test/cover.jpg', interests: [] }
const mount = () => render(<QueryClientProvider client={new QueryClient()}><ProfileSettings user={user} /></QueryClientProvider>)
beforeEach(() => { vi.stubGlobal('React', React); vi.clearAllMocks(); mock.user = { id: 'owner' }; mock.put.mockResolvedValue({ data: { success: true, user } }) })
afterEach(() => { cleanup(); vi.unstubAllGlobals() })
it('renders profile photos without requiring Cloudinary configuration', () => {
  mount(); expect(screen.getByRole('img', { name: 'Rosa' }).getAttribute('src')).toBe(user.avatar)
  expect(screen.getByDisplayValue('Rosa')).toBeTruthy()
})
it('saves a minimal profile without sending empty optional phone or surname', async () => {
  mount(); fireEvent.click(screen.getByRole('button', { name: 'Guardar Cambios' }))
  await waitFor(() => expect(mock.put).toHaveBeenCalled())
  expect(mock.put.mock.calls[0][1].phone).toBeUndefined()
  expect(mock.put.mock.calls[0][1].lastName).toBeUndefined()
  await waitFor(() => expect(mock.updateUser).toHaveBeenCalledWith(user))
})
