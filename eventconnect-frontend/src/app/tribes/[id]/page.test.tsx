// @vitest-environment jsdom
import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import TribeDetailPage from './page'

const api = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), user: { _id: 'a', firstName: 'Ana', username: 'ana' }, push: vi.fn() }))
vi.mock('@/lib/api/client', () => ({ apiClient: { get: api.get, post: api.post } }))
vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }))
vi.mock('@/stores/authStore', () => {
  const store = Object.assign(() => ({ user: api.user, isAuthenticated: true }), { getState: () => ({ user: api.user }) })
  return { useAuthStore: store }
})
vi.mock('next/navigation', () => ({ useParams: () => ({ id: 'tribe-1' }), useRouter: () => ({ push: api.push }), useSearchParams: () => new URLSearchParams() }))
const detail = (overrides: any = {}) => ({
  _id: 'tribe-1', name: 'Amigos del sendero', description: 'Una comunidad para caminar juntos.', privacy: 'private', membership: 'approval_required',
  createdBy: { _id: 'creator', firstName: 'Luis', username: 'luis' }, createdAt: '2026-10-10T12:00:00Z',
  isMember: true, isAdmin: false, canViewContent: true, canManageRequests: false, canRequestJoin: false, canJoin: false,
  members: [{ user: { _id: 'a', firstName: 'Ana', username: 'ana' }, status: 'active', role: 'member' }],
  posts: [{ _id: 'post', content: 'Conversación privada de A', author: { _id: 'a', firstName: 'Ana', username: 'ana' }, createdAt: '2026-10-10T12:00:00Z' }],
  events: [{ _id: 'event', title: 'Salida privada de A', date: '2026-10-20T12:00:00Z' }],
  ...overrides,
})
beforeEach(() => { vi.stubGlobal('React', React); vi.clearAllMocks(); api.user = { _id: 'a', firstName: 'Ana', username: 'ana' } })
afterEach(() => { cleanup(); vi.unstubAllGlobals() })

describe('tribe detail integration', () => {
  it('shows a failed load explicitly and retries without treating a network failure as a missing community', async () => {
    api.get.mockRejectedValueOnce(new Error('Offline')).mockResolvedValue({ data: { tribe: detail() } })
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(<QueryClientProvider client={client}><TribeDetailPage /></QueryClientProvider>)
    await screen.findByRole('heading', { name: 'No pudimos cargar la comunidad' })
    expect(screen.queryByText('Conversación privada de A')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar carga' }))
    await screen.findByText('Conversación privada de A')
    expect(api.get).toHaveBeenCalledTimes(2)
  })

  it('removes private account content while another identity loads and respects the server content gate for every tab', async () => {
    api.get.mockResolvedValue({ data: { tribe: detail() } })
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const view = render(<QueryClientProvider client={client}><TribeDetailPage /></QueryClientProvider>)
    await screen.findByText('Conversación privada de A')
    let resolve!: (value: any) => void
    api.get.mockReturnValue(new Promise(yes => { resolve = yes }))
    api.user = { _id: 'b', firstName: 'Bea', username: 'bea' }
    view.rerender(<QueryClientProvider client={client}><TribeDetailPage /></QueryClientProvider>)
    expect(screen.queryByText('Conversación privada de A')).toBeNull()
    await act(async () => resolve({ data: { tribe: detail({ isMember: false, canViewContent: false, canRequestJoin: true }) } }))
    await screen.findByRole('heading', { name: 'Solicita tu lugar en la comunidad' })
    expect(screen.queryByText('Conversación privada de A')).toBeNull()
    fireEvent.click(screen.getByRole('tab', { name: /Eventos/ }))
    expect(screen.queryByText('Salida privada de A')).toBeNull()
    fireEvent.click(screen.getByRole('tab', { name: /Miembros/ }))
    expect(screen.queryByRole('heading', { name: /Miembros de la Comunidad/ })).toBeNull()
    expect(screen.queryByRole('tab', { name: /Solicitudes/ })).toBeNull()
    expect(api.post).not.toHaveBeenCalled()
  })

  it('shows the requests inbox to an active moderator and hides it immediately after losing that permission', async () => {
    const requests = [{ user: { _id: 'guest', firstName: 'Eva', username: 'eva' }, message: 'Quiero caminar en grupo', status: 'pending', requestedAt: '2026-10-17T12:00:00Z' }]
    api.get.mockResolvedValue({ data: { tribe: detail({ canManageRequests: true, userRole: 'moderator', joinRequests: requests }) } })
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(<QueryClientProvider client={client}><TribeDetailPage /></QueryClientProvider>)
    fireEvent.click(await screen.findByRole('tab', { name: /Solicitudes/ }))
    expect(screen.getByRole('button', { name: 'Aprobar a eva' })).toBeTruthy()
    expect(screen.queryByTitle('Configurar comunidad')).toBeNull()
    api.get.mockResolvedValue({ data: { tribe: detail({ isMember: false, canViewContent: false, canManageRequests: false, canRequestJoin: true, userRole: null, joinRequests: requests, members: [{ user: { _id: 'a' }, role: 'admin', status: 'inactive' }] }) } })
    await act(async () => { await client.invalidateQueries({ queryKey: ['tribe', 'tribe-1', 'a'] }) })
    await waitFor(() => expect(screen.queryByRole('tab', { name: /Solicitudes/ })).toBeNull())
    expect(screen.queryByRole('button', { name: 'Aprobar a eva' })).toBeNull()
    expect(screen.queryByText('Quiero caminar en grupo')).toBeNull()
  })
})
