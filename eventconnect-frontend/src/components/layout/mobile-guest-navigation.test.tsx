// @vitest-environment jsdom
import React from 'react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MobileHeader } from './MobileHeader'
import { MobileNav } from './MobileNav'

const mocks = vi.hoisted(() => ({ state: { isAuthenticated: false, user: undefined as { id: string; firstName: string } | undefined }, get: vi.fn() }))
vi.mock('@/stores/authStore', () => ({ useAuthStore: () => mocks.state }))
vi.mock('@/lib/api/client', () => ({ apiClient: { get: mocks.get } }))
vi.mock('next/navigation', () => ({ usePathname: () => '/events/public-event', useRouter: () => ({ back: vi.fn() }) }))
vi.mock('next/link', () => ({ default: ({ children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => <a {...props}>{children}</a> }))
beforeEach(() => { vi.stubGlobal('React', React); mocks.state = { isAuthenticated: false, user: undefined }; mocks.get.mockResolvedValue({ data: { unreadCount: 3 } }) })
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.clearAllMocks() })

it('sends visitors to the public home and offers login without requesting private notifications', () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(<QueryClientProvider client={client}><MobileHeader /><MobileNav /></QueryClientProvider>)
  for (const link of screen.getAllByRole('link', { name: 'Inicio' })) expect(link.getAttribute('href')).toBe('/')
  expect(screen.getByRole('link', { name: 'Entrar' }).getAttribute('href')).toBe('/login')
  expect(screen.getByRole('link', { name: 'Iniciar sesión' }).getAttribute('href')).toBe('/login')
  expect(screen.queryByRole('link', { name: 'Mi perfil' })).toBeNull()
  expect(mocks.get).not.toHaveBeenCalled()
})

it('does not expose a previous account notification count after logout', () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } })
  client.setQueryData(['notifications-count', 'one'], { unreadCount: 5 })
  mocks.state = { isAuthenticated: true, user: { id: 'one', firstName: 'Ana' } }
  const view = render(<QueryClientProvider client={client}><MobileNav /></QueryClientProvider>)
  expect(screen.getByText('5')).toBeTruthy()
  mocks.state = { isAuthenticated: false, user: undefined }
  view.rerender(<QueryClientProvider client={client}><MobileNav /></QueryClientProvider>)
  expect(screen.queryByText('5')).toBeNull()
  expect(screen.getByRole('link', { name: 'Entrar' }).getAttribute('href')).toBe('/login')
})
