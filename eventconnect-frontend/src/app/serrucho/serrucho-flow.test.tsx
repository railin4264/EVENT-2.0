// @vitest-environment jsdom
import React from 'react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import SerruchoPage from './[code]/page'

const mock = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), put: vi.fn(), push: vi.fn(), auth: { isAuthenticated: false, user: null as null | { id: string } } }))
vi.mock('next/navigation', () => ({ useParams: () => ({ code: 'coro-demo' }), useRouter: () => ({ push: mock.push }) }))
vi.mock('next/link', () => ({ default: ({ children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => <a {...props}>{children}</a> }))
vi.mock('@/stores/authStore', () => ({ useAuthStore: () => mock.auth }))
vi.mock('@/lib/api/client', () => ({ apiClient: { get: mock.get, post: mock.post, put: mock.put } }))
vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }))
const pool = (patch = {}) => ({ title: 'Mesa del coro', currency: 'USD', targetAmount: 300, perPersonAmount: 100, totalCollected: 0,
  targetParticipants: 3, participantCount: 1, status: 'open', canManage: false, canJoin: false, isExpired: false, isParticipant: false,
  event: { _id: 'event1', title: 'Plan con amigos' }, participants: [{ name: 'Participante 1', amount: 100, paid: true, paymentStatus: 'pending' }], ...patch })
function mount() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return render(<QueryClientProvider client={client}><SerruchoPage /></QueryClientProvider>)
}
beforeEach(() => {
  vi.stubGlobal('React', React); vi.clearAllMocks(); mock.auth = { isAuthenticated: false, user: null }
  mock.get.mockResolvedValue({ data: { success: true, data: pool() } })
  mock.post.mockResolvedValue({ data: { success: true } }); mock.put.mockResolvedValue({ data: { success: true } })
})
afterEach(() => { cleanup(); vi.unstubAllGlobals() })

it('shows safe public instructions and requires login with a return before joining', async () => {
  mount(); await screen.findByRole('heading', { name: 'Mesa del coro' })
  expect(screen.getByText(/EventNow no cobra, retiene ni garantiza/)).toBeTruthy()
  expect(screen.getByText(/No se muestran datos bancarios/)).toBeTruthy()
  expect(screen.queryByPlaceholderText('Tu nombre')).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: 'Entrar para sumarme' }))
  expect(mock.push).toHaveBeenCalledWith('/login?redirect=%2Fserrucho%2Fcoro-demo')
  expect(mock.post).not.toHaveBeenCalled()
  expect(screen.queryByText('Recepción confirmada')).toBeNull()
  expect(screen.getByText(/de USD/)).toBeTruthy()
})
it('joins only once during an in-flight request and leaves the payment pending', async () => {
  mock.auth = { isAuthenticated: true, user: { id: 'user1' } }
  mock.get.mockResolvedValue({ data: { success: true, data: pool({ canJoin: true }) } })
  let finish!: (result: unknown) => void
  mock.post.mockReturnValue(new Promise(resolve => { finish = resolve }))
  mount(); const join = await screen.findByRole('button', { name: 'Me anoto · aporte pendiente' })
  fireEvent.click(join); fireEvent.click(join)
  expect(mock.post).toHaveBeenCalledTimes(1)
  expect(mock.post).toHaveBeenCalledWith('/serrucho/coro-demo/join', { amount: 100 })
  finish({ data: { success: true } })
  await waitFor(() => expect(screen.queryByText('Sumando...')).toBeNull())
})
it('requires an explicit receipt check before manager confirmation', async () => {
  mock.auth = { isAuthenticated: true, user: { id: 'owner' } }
  mock.get.mockResolvedValue({ data: { success: true, data: pool({ canManage: true, participants: [{ _id: 'participant1', name: 'Rosa', amount: 100, paymentStatus: 'submitted' }] }) } })
  mount(); fireEvent.click(await screen.findByRole('button', { name: 'Registrar recepción' }))
  expect(mock.put).not.toHaveBeenCalled()
  expect(screen.getByRole('dialog')).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: 'Sí, recibí el aporte' }))
  await waitFor(() => expect(mock.put).toHaveBeenCalledWith('/serrucho/coro-demo/confirm/participant1'))
})
it('submits a reference for an existing participant without claiming a verified payment', async () => {
  mock.auth = { isAuthenticated: true, user: { id: 'user1' } }
  mock.get.mockResolvedValue({ data: { success: true, data: pool({ isParticipant: true, canSubmitEvidence: true }) } })
  mount(); fireEvent.change(await screen.findByLabelText('Referencia del comprobante'), { target: { value: 'TRX-123' } })
  fireEvent.click(screen.getByRole('button', { name: 'Enviar para revisión' }))
  await waitFor(() => expect(mock.post).toHaveBeenCalledWith('/serrucho/coro-demo/join', { voucherRef: 'TRX-123' }))
  expect(screen.queryByText('Recepción confirmada')).toBeNull()
})
it.each([{ isExpired: true }, { status: 'cancelled' }, { status: 'completed' }])('does not offer new commitments for a closed pool %p', async patch => {
  mock.get.mockResolvedValue({ data: { success: true, data: pool(patch) } })
  mount(); await screen.findByRole('heading', { name: 'Mesa del coro' })
  expect(screen.queryByRole('button', { name: 'Entrar para sumarme' })).toBeNull()
  expect(screen.getByText('Este serrucho no admite nuevas adhesiones.')).toBeTruthy()
})
