// @vitest-environment jsdom
import React from 'react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { IdeaRealization } from './IdeaRealization'
const mock = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), put: vi.fn(), auth: { isAuthenticated: true, user: { id: 'owner' }, token: 'token' } }))
vi.mock('@/stores/authStore', () => ({ useAuthStore: Object.assign(() => mock.auth, { getState: () => mock.auth }) }))
vi.mock('@/lib/api/client', () => ({ apiClient: { get: mock.get, post: mock.post, put: mock.put } }))
vi.mock('next/link', () => ({ default: ({ children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => <a {...props}>{children}</a> }))
beforeEach(() => {
  vi.stubGlobal('React', React); vi.clearAllMocks()
  mock.get.mockImplementation((path: string) => Promise.resolve({ data: { data: path === '/events' ? [] : path.endsWith('conditions') ? { own: { maxBudget: 500, currency: 'DOP' }, summary: { ready: false } } : { proposals: [{ _id: 'proposal', note: '', accepted: false, event: { _id: 'event', title: 'Pintura', date: '2027-01-01', price: { amount: 0, currency: 'DOP' } } }], canAccept: true } } }))
  mock.post.mockResolvedValue({ data: { success: true } }); mock.put.mockResolvedValue({ data: { success: true } })
})
afterEach(() => { cleanup(); vi.unstubAllGlobals() })
const mount = () => render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><IdeaRealization ideaId="idea" identity="owner" /></QueryClientProvider>)
it('loads saved conditions and hides unavailable small-group statistics without writing', async () => {
  mount(); const budget = await screen.findByLabelText('Presupuesto máximo opcional')
  expect((budget as HTMLInputElement).value).toBe('500'); expect(mock.put).not.toHaveBeenCalled(); expect(mock.post).not.toHaveBeenCalled()
  expect(screen.getByText(/Todavía no hay suficientes respuestas/)).toBeTruthy()
})
it('requires explicit acceptance confirmation before linking the event', async () => {
  mount(); fireEvent.click(await screen.findByRole('button', { name: 'Elegir esta propuesta' }))
  expect(mock.post).not.toHaveBeenCalled(); fireEvent.click(screen.getByRole('button', { name: 'Aceptar y vincular' }))
  await screen.findByText(/Propuesta aceptada. Cada persona/)
  expect(mock.post).toHaveBeenCalledWith('/ideas/idea/proposals/proposal/accept', {})
})
it('shows a server rejection without reporting saved preferences', async () => {
  mock.put.mockRejectedValue({ response: { data: { message: 'La idea cerró' } } }); mount()
  fireEvent.click(await screen.findByRole('button', { name: 'Guardar condiciones' }))
  await screen.findByText('La idea cerró'); expect(screen.queryByText('Guardado correctamente.')).toBeNull()
})
