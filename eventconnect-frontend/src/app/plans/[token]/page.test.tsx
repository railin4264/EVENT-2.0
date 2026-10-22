// @vitest-environment jsdom
import React from 'react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import SharedPlanPage from './page'
const mocks = vi.hoisted(() => ({ auth: { user: null as any, isAuthenticated: false }, get: vi.fn(), vote: vi.fn(), decide: vi.fn() }))
vi.mock('next/navigation', () => ({ useParams: () => ({ token: 'a'.repeat(48) }) }))
vi.mock('next/link', () => ({ default: ({ children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => <a {...props}>{children}</a> }))
vi.mock('@/stores/authStore', () => ({ useAuthStore: Object.assign(() => mocks.auth, { getState: () => mocks.auth }) }))
vi.mock('@/lib/api/plans', () => ({ plansApi: { get: mocks.get, vote: mocks.vote, decide: mocks.decide } }))
const plan = { title: 'Nuestro coro', shareToken: 'a'.repeat(48), status: 'open', totalVotes: 0, myVote: null, isOwner: false,
  expiresAt: '2027-01-01T00:00:00Z', options: [{ id: 'one', votes: 0, available: true, event: { id: 'event-one', title: 'Café en grupo', date: '2027-01-02T00:00:00Z', location: 'Centro' } }] }
let client: QueryClient
const show = () => <QueryClientProvider client={client}><SharedPlanPage /></QueryClientProvider>
beforeEach(() => { vi.stubGlobal('React', React); vi.clearAllMocks(); mocks.auth = { user: null, isAuthenticated: false }; mocks.get.mockResolvedValue(plan); client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } }) })
afterEach(() => { cleanup(); client.clear(); vi.unstubAllGlobals() })
it('opens a guest invitation and prepares WhatsApp without publishing identities', async () => {
  render(show()); await screen.findByText('Nuestro coro')
  const link = screen.getByRole('link', { name: 'Armar la votación por WhatsApp' }) as HTMLAnchorElement
  const target = new URL(link.href)
  expect(target.hostname).toBe('wa.me')
  expect(target.searchParams.get('text')).toContain(`/plans/${'a'.repeat(48)}`)
  expect(screen.getByRole('button', { name: 'Votar este plan' })).toBeTruthy()
  expect(mocks.vote).not.toHaveBeenCalled()
})
it('locks double clicks and only announces a persisted vote', async () => {
  let resolve!: (value: any) => void
  mocks.vote.mockImplementation(() => new Promise(done => { resolve = done }))
  render(show()); const button = await screen.findByRole('button', { name: 'Votar este plan' })
  fireEvent.click(button); fireEvent.click(button)
  await waitFor(() => expect(mocks.vote).toHaveBeenCalledTimes(1))
  expect(screen.queryByText(/Tu voto quedó guardado/)).toBeNull()
  await act(async () => resolve({ ...plan, myVote: 'one', totalVotes: 1, options: [{ ...plan.options[0], votes: 1 }] }))
  expect(await screen.findByText(/Tu voto quedó guardado/)).toBeTruthy()
})
it('discards a pending vote notice after changing account', async () => {
  let resolve!: (value: any) => void
  mocks.vote.mockImplementation(() => new Promise(done => { resolve = done }))
  const view = render(show()); fireEvent.click(await screen.findByRole('button', { name: 'Votar este plan' }))
  await waitFor(() => expect(mocks.vote).toHaveBeenCalledTimes(1))
  mocks.auth = { user: { _id: 'other' }, isAuthenticated: true }; view.rerender(show())
  await act(async () => resolve({ ...plan, totalVotes: 1, myVote: 'one' }))
  expect(screen.queryByText(/Tu voto quedó guardado/)).toBeNull()
})
it('requires owner confirmation and never registers attendance when deciding', async () => {
  mocks.auth = { user: { _id: 'owner' }, isAuthenticated: true }
  mocks.get.mockResolvedValue({ ...plan, isOwner: true, totalVotes: 1, options: [{ ...plan.options[0], votes: 1 }] })
  mocks.decide.mockResolvedValue({ ...plan, status: 'decided', selectedOptionId: 'one' })
  render(show()); fireEvent.click(await screen.findByRole('button', { name: 'Confirmar este plan' }))
  expect(mocks.decide).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button', { name: 'Sí, este será el plan' }))
  await waitFor(() => expect(mocks.decide).toHaveBeenCalledTimes(1))
  expect(mocks.vote).not.toHaveBeenCalled()
})
