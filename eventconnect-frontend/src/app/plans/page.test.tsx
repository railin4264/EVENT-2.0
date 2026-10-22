// @vitest-environment jsdom
import React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import PlansPage from './page'

const mocks = vi.hoisted(() => ({ authenticated: false, get: vi.fn(), post: vi.fn(), push: vi.fn() }))
vi.mock('@/lib/api/client', () => ({ apiClient: { get: mocks.get, post: mocks.post } }))
vi.mock('@/stores/authStore', () => { const session = () => ({ isAuthenticated: mocks.authenticated, user: mocks.authenticated ? { id: 'viewer' } : null }); return { useAuthStore: Object.assign(session, { getState: session }) } })
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: mocks.push }) }))
vi.mock('next/link', () => ({ default: ({ children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => <a {...props}>{children}</a> }))
vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }))

let queryClient: QueryClient
const show = () => render(<QueryClientProvider client={queryClient}><PlansPage /></QueryClientProvider>)

describe('Spontaneous plans actions', () => {
  beforeEach(() => {
    vi.stubGlobal('React', React)
    vi.clearAllMocks()
    mocks.authenticated = false
    mocks.get.mockResolvedValue({ data: { data: [] } })
    mocks.post.mockResolvedValue({ data: { success: true } })
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  })
  afterEach(() => { cleanup(); queryClient.clear(); vi.unstubAllGlobals() })

  it('asks guests to log in from the empty-state creation button without submitting a request', () => {
    // This case verifies the empty-state action, independently of query notification timing.
    queryClient.setQueryData(['spontaneous-coros', 'Santo Domingo', 'all', ''], [])
    show()
    fireEvent.click(screen.getByRole('button', { name: /Coro Espontáneo/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Lanzar mi Faro Ahora' }))
    expect(mocks.push).toHaveBeenCalledWith('/login?redirect=%2Fplans')
    expect(mocks.post).not.toHaveBeenCalled()
    expect(screen.queryByRole('textbox', { name: '¿Cuál es el plan?' })).toBeNull()
  })

  it('posts the selected city instead of silently creating the plan in Santo Domingo', async () => {
    mocks.authenticated = true
    show()
    fireEvent.click(screen.getByRole('button', { name: /Coro Espontáneo/ }))
    fireEvent.change(screen.getByRole('combobox', { name: 'Ciudad del coro' }), { target: { value: 'Santiago' } })
    fireEvent.click(screen.getByRole('button', { name: 'Lanzar mi Faro de Coro' }))
    fireEvent.change(screen.getByRole('textbox', { name: '¿Cuál es el plan?' }), { target: { value: 'Café en Santiago' } })
    fireEvent.click(screen.getByRole('button', { name: 'Publicar Faro' }))
    await waitFor(() => expect(mocks.post).toHaveBeenCalledWith('/plans/spontaneous', expect.objectContaining({ city: 'Santiago', title: 'Café en Santiago', meetingSpot: '' })))
  })

  it('shows an API failure with retry instead of a blank list', async () => {
    mocks.get.mockImplementation(async (path: string) => {
      if (path === '/plans/spontaneous') throw new Error('Offline')
      return { data: { data: [] } }
    })
    show()
    fireEvent.click(screen.getByRole('button', { name: /Coro Espontáneo/ }))
    expect((await screen.findByRole('alert')).textContent).toContain('No pudimos cargar los coros')
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeTruthy()
  })
})
