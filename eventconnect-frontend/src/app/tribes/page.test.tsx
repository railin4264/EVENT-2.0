// @vitest-environment jsdom
import React from 'react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import TribesPage from './page'

const api = vi.hoisted(() => ({ get: vi.fn(), push: vi.fn(), user: { _id: 'a', firstName: 'Ana', username: 'ana' } }))
vi.mock('@/lib/api/client', () => ({ apiClient: { get: api.get } }))
vi.mock('@/stores/authStore', () => ({ useAuthStore: Object.assign(() => ({ user: api.user, isAuthenticated: true }), { getState: () => ({ user: api.user }) }) }))
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: api.push }) }))
vi.mock('@/hooks/useLiveLocation', () => ({ useLiveLocation: () => ({ location: { address: 'Ciudad', lat: 0, lng: 0, city: 'Ciudad', country: 'País', countryCode: 'XX' }, refreshNow: vi.fn(), presets: [] }) }))
beforeEach(() => { vi.stubGlobal('React', React); vi.clearAllMocks() })
afterEach(() => { cleanup(); vi.unstubAllGlobals() })

it('loads the server requests scope with pagination instead of filtering the first discovery page', async () => {
  api.get.mockImplementation((url: string) => {
    const params = new URL(url, 'https://example.test').searchParams
    const page = Number(params.get('page') || 1)
    const requests = params.get('scope') === 'requests'
    const tribes = requests ? [{ _id: `pending-${page}`, name: `Comunidad pendiente ${page}`, description: 'Comunidad con ingreso por aprobación.', category: 'other', privacy: 'private', membership: 'approval_required', hasPendingRequest: true, isMember: false, canManageRequests: false, canViewContent: false, canRequestJoin: false, canJoin: false, createdAt: '2026-10-10T12:00:00Z' }] : []
    return Promise.resolve({ data: { tribes, pagination: { page, pages: requests ? 2 : 1, total: requests ? 25 : 0 } } })
  })
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(<QueryClientProvider client={client}><TribesPage /></QueryClientProvider>)
  fireEvent.click(screen.getByRole('button', { name: /Solicitudes/i }))
  await screen.findByText('Comunidad pendiente 1')
  expect(api.get.mock.calls.some(([url]) => new URL(url, 'https://example.test').searchParams.get('scope') === 'requests')).toBe(true)
  expect(screen.getByRole('navigation', { name: 'Páginas de comunidades' }).textContent).toContain('25 comunidades')
  fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }))
  await screen.findByText('Comunidad pendiente 2')
  await waitFor(() => expect(api.get.mock.calls.some(([url]) => {
    const params = new URL(url, 'https://example.test').searchParams
    return params.get('scope') === 'requests' && params.get('page') === '2' && params.get('limit') === '24'
  })).toBe(true))
})
