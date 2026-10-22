// @vitest-environment jsdom
import React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import SearchPage from './page'
const mocks = vi.hoisted(() => ({ get: vi.fn(), replace: vi.fn() }))
vi.mock('next/navigation', () => ({ useSearchParams: () => ({ get: (key: string) => key === 'q' ? 'coro' : null }), useRouter: () => ({ replace: mocks.replace }) }))
vi.mock('@/stores/authStore', () => ({ useAuthStore: (select: any) => select({ user: null }) }))
vi.mock('@/hooks/useDebounce', () => ({ useDebounce: (value: unknown) => value }))
vi.mock('@/lib/api/client', () => ({ apiClient: { get: mocks.get } }))
vi.mock('next/link', () => ({ default: ({ children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => <a {...props}>{children}</a> }))
const result = { id: 'a'.repeat(24), type: 'user', title: 'Coro Ana', metadata: { username: 'ana', isHost: true, role: 'creator' } }
let client: QueryClient
beforeEach(() => { const saved = new Map<string, string>(); vi.stubGlobal('React', React); vi.stubGlobal('localStorage', { getItem: (key: string) => saved.get(key) ?? null, setItem: (key: string, value: string) => { saved.set(key, value) }, removeItem: (key: string) => { saved.delete(key) }, clear: () => saved.clear() }); mocks.get.mockReset(); mocks.replace.mockReset(); localStorage.clear(); client = new QueryClient({ defaultOptions: { queries: { retry: false } } }); mocks.get.mockResolvedValue({ data: { success: true, results: [result], pagination: { page: 1, total: 1, hasMore: false } } }) })
afterEach(() => { cleanup(); client?.clear(); vi.unstubAllGlobals() })
function mount() { render(<QueryClientProvider client={client}><SearchPage /></QueryClientProvider>) }
test('global search displays creator results with the correct public profile destination', async () => {
  mount(); const link = await screen.findByRole('link', { name: /Coro Ana/ }); expect(link.getAttribute('href')).toBe(`/users/${result.id}`)
  fireEvent.click(screen.getByRole('button', { name: 'Creadores y anfitriones' }))
  await waitFor(() => expect(mocks.get).toHaveBeenLastCalledWith('/search', expect.objectContaining({ params: expect.objectContaining({ type: 'hosts' }) })))
})
test('server errors are distinct from a valid empty search and allow retry', async () => {
  mocks.get.mockRejectedValueOnce(new Error('offline')); mount(); expect(await screen.findByRole('alert')).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: 'Reintentar' })); expect(await screen.findByRole('link', { name: /Coro Ana/ })).toBeTruthy()
})
test('a malformed local history does not break searching', async () => {
  localStorage.setItem('global-search-recent:guest', '{broken'); mount(); expect(await screen.findByRole('link', { name: /Coro Ana/ })).toBeTruthy()
})

test('location tab requests place matches and explains its published-event scope', async () => {
  mount(); await screen.findByRole('link', { name: /Coro Ana/ })
  fireEvent.click(screen.getByRole('button', { name: 'Ubicaciones' }))
  await waitFor(() => expect(mocks.get).toHaveBeenLastCalledWith('/search', expect.objectContaining({ params: expect.objectContaining({ type: 'locations' }) })))
  expect(await screen.findByText(/Eventos publicados que coinciden con una ciudad/)).toBeTruthy()
})
