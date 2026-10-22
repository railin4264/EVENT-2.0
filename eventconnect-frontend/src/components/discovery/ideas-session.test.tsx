// @vitest-environment jsdom
import React from 'react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { IdeaCard, IdeasRadar, useIdeaSupport } from './DiscoveryRows'
import IdeasPage from '@/app/ideas/page'

const mocks = vi.hoisted(() => ({ auth: { isAuthenticated: true, user: { id: 'ana' }, token: 'ana-token' }, getIdeas: vi.fn(), toggle: vi.fn(), create: vi.fn(), push: vi.fn(), success: vi.fn(), error: vi.fn() }))
vi.mock('@/stores/authStore', () => ({ useAuthStore: Object.assign(() => mocks.auth, { getState: () => mocks.auth }) }))
vi.mock('@/lib/api/discovery', () => ({ discoveryApi: { getIdeas: mocks.getIdeas, toggleSupport: mocks.toggle, createIdea: mocks.create, getDemand: async () => ({ opportunities: [] }) } }))
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: mocks.push }) }))
vi.mock('react-hot-toast', () => ({ default: { success: mocks.success, error: mocks.error } }))
vi.mock('next/link', () => ({ default: ({ children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => <a {...props}>{children}</a> }))
const idea = { _id: 'idea', title: 'Ajedrez al aire libre', category: 'other', supportersCount: 2, quorumTarget: 10 }
let client: QueryClient
beforeEach(() => {
  vi.stubGlobal('React', React)
  mocks.auth = { isAuthenticated: true, user: { id: 'ana' }, token: 'ana-token' }
  mocks.getIdeas.mockImplementation(async () => ({ ideas: [{ ...idea, supported: mocks.auth.user.id === 'ana' }] }))
  client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
})
afterEach(() => { cleanup(); client.clear(); vi.clearAllMocks(); vi.unstubAllGlobals() })
function wrapper({ children }: { children: React.ReactNode }) { return <QueryClientProvider client={client}>{children}</QueryClientProvider> }
function Support() { const { support, pending } = useIdeaSupport('ideas'); return <button onClick={() => { support('idea'); support('idea') }} disabled={pending}>Votar</button> }

it('does not reuse another account’s supported flag in the home radar', async () => {
  const { rerender } = render(<IdeasRadar />, { wrapper })
  await screen.findByRole('button', { name: '✓ Me interesa' })
  mocks.auth = { isAuthenticated: true, user: { id: 'bea' }, token: 'bea-token' }
  rerender(<IdeasRadar />)
  expect(screen.queryByRole('button', { name: '✓ Me interesa' })).toBeNull()
  await screen.findByRole('button', { name: 'Me interesa' })
  expect(client.getQueryData(['ideas-home', 'ana'])).toBeTruthy()
  expect(client.getQueryData(['ideas-home', 'bea'])).toBeTruthy()
})
it('synchronously locks a support request and ignores late success after account switch', async () => {
  let resolve!: (value: unknown) => void
  mocks.toggle.mockImplementation(() => new Promise(done => { resolve = done }))
  const invalidate = vi.spyOn(client, 'invalidateQueries')
  const { rerender } = render(<Support />, { wrapper })
  fireEvent.click(screen.getByRole('button'))
  await waitFor(() => expect(mocks.toggle).toHaveBeenCalledOnce())
  mocks.auth = { isAuthenticated: true, user: { id: 'bea' }, token: 'bea-token' }; rerender(<Support />)
  await act(async () => { resolve({ quorumReached: true }) })
  expect(mocks.success).not.toHaveBeenCalled()
  expect(invalidate).not.toHaveBeenCalled()
})
it('does not toast a late error after logging out', async () => {
  let reject!: (value: Error) => void
  mocks.toggle.mockImplementation(() => new Promise((_done, fail) => { reject = fail }))
  const { rerender } = render(<Support />, { wrapper })
  fireEvent.click(screen.getByRole('button')); await waitFor(() => expect(mocks.toggle).toHaveBeenCalledOnce())
  mocks.auth.isAuthenticated = false; rerender(<Support />)
  await act(async () => { reject(new Error('offline')) })
  expect(mocks.error).not.toHaveBeenCalled()
})
it('invalidates both current-account idea surfaces and demand after a confirmed vote', async () => {
  mocks.toggle.mockResolvedValue({ quorumReached: false })
  const invalidate = vi.spyOn(client, 'invalidateQueries')
  render(<Support />, { wrapper }); fireEvent.click(screen.getByRole('button'))
  await waitFor(() => expect(invalidate).toHaveBeenCalledWith({ queryKey: ['ideas', 'ana'] }))
  expect(invalidate).toHaveBeenCalledWith({ queryKey: ['ideas-home', 'ana'] })
  expect(invalidate).toHaveBeenCalledWith({ queryKey: ['ideas-demand'] })
})
it('resets the idea draft and account-specific feed when switching users', async () => {
  const { rerender } = render(<IdeasPage />, { wrapper })
  await screen.findByText('Ajedrez al aire libre')
  const title = screen.getByPlaceholderText('Ej. Violín en el parque al atardecer')
  fireEvent.change(title, { target: { value: 'Borrador privado de Ana' } })
  mocks.auth = { isAuthenticated: true, user: { id: 'bea' }, token: 'bea-token' }; rerender(<IdeasPage />)
  expect((screen.getByPlaceholderText('Ej. Violín en el parque al atardecer') as HTMLInputElement).value).toBe('')
  expect(screen.queryByRole('button', { name: '✓ Me interesa' })).toBeNull()
  await screen.findByRole('button', { name: 'Me interesa' })
})

it('does not announce a publication started by the previous account', async () => {
  let resolve!: (value: unknown) => void
  mocks.create.mockImplementation(() => new Promise(done => { resolve = done }))
  const { rerender } = render(<IdeasPage />, { wrapper })
  fireEvent.change(screen.getByPlaceholderText('Ej. Violín en el parque al atardecer'), { target: { value: 'Una actividad de Ana' } })
  fireEvent.click(screen.getByRole('button', { name: 'Publicar idea' }))
  await waitFor(() => expect(mocks.create).toHaveBeenCalledOnce())
  mocks.auth = { isAuthenticated: true, user: { id: 'bea' }, token: 'bea-token' }; rerender(<IdeasPage />)
  await act(async () => { resolve(idea) })
  expect(mocks.success).not.toHaveBeenCalled()
  expect((screen.getByPlaceholderText('Ej. Violín en el parque al atardecer') as HTMLInputElement).value).toBe('')
})

it('shows an expired idea without offering another support action', () => {
  const support = vi.fn()
  render(<IdeaCard idea={{ ...idea, status: 'open', expiresAt: '2000-01-01T00:00:00Z', isExpired: true } as any} onSupport={support} pending={false} />)
  const button = screen.getByRole('button', { name: 'Cerrada' }) as HTMLButtonElement
  expect(button.disabled).toBe(true)
  expect(screen.getByText(/Vigencia terminada/)).toBeTruthy()
  fireEvent.click(button)
  expect(support).not.toHaveBeenCalled()
})
