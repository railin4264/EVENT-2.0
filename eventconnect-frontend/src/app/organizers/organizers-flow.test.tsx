// @vitest-environment jsdom
import React from 'react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import OrganizersPage from './page'
const mock = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), auth: { isAuthenticated: false, user: null as null | { id: string } } }))
vi.mock('@/stores/authStore', () => ({ useAuthStore: () => mock.auth }))
vi.mock('@/lib/api/client', () => ({ apiClient: { get: mock.get, post: mock.post } }))
vi.mock('next/link', () => ({ default: ({ children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => <a {...props}>{children}</a> }))
const mount = () => render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><OrganizersPage /></QueryClientProvider>)
beforeEach(() => { vi.stubGlobal('React', React); vi.clearAllMocks(); mock.auth = { isAuthenticated: false, user: null }; mock.get.mockResolvedValue({ data: { success: true, events: [{ _id: 'event1', title: 'Mi evento' }] } }); mock.post.mockResolvedValue({ data: { success: true } }) })
afterEach(() => { cleanup(); vi.unstubAllGlobals() })
it('explains manual commercial terms without charging or fetching private data for a guest', () => {
  mount()
  expect(screen.getByRole('link', { name: 'Entrar para elegir mi evento' }).getAttribute('href')).toBe('/login?redirect=%2Forganizers')
  expect(screen.getByText(/Sin cobros automáticos/)).toBeTruthy()
  expect(mock.get).not.toHaveBeenCalled(); expect(mock.post).not.toHaveBeenCalled()
})
it('stores a promotion request after explicit submission without claiming activation or payment', async () => {
  mock.auth = { isAuthenticated: true, user: { id: 'owner' } }; mount()
  const select = await screen.findByLabelText('Tu evento publicado')
  fireEvent.change(select, { target: { value: 'event1' } })
  fireEvent.change(screen.getByLabelText(/¿Qué quieres conseguir/), { target: { value: 'Difusión en Santo Domingo el viernes' } })
  fireEvent.click(screen.getByRole('button', { name: 'Solicitar propuesta de promoción' }))
  await screen.findByText(/Solicitud registrada para revisión/)
  expect(mock.post).toHaveBeenCalledTimes(1)
  expect(mock.post).toHaveBeenCalledWith('/events/event1/promotion-request', { note: 'Difusión en Santo Domingo el viernes' })
  expect(mock.get.mock.calls[0][1].params.createdBy).toBe('owner')
})
it('shows a pending request received from the server instead of resubmitting it', async () => {
  mock.auth = { isAuthenticated: true, user: { id: 'owner' } }
  mock.get.mockResolvedValue({ data: { success: true, events: [{ _id: 'event1', title: 'Mi evento', promotionRequest: { requested: true } }] } })
  mount(); fireEvent.change(await screen.findByLabelText('Tu evento publicado'), { target: { value: 'event1' } })
  expect(screen.queryByRole('button', { name: 'Solicitar propuesta de promoción' })).toBeNull(); expect(mock.post).not.toHaveBeenCalled()
})
it('does not report success when the server rejects the commercial request', async () => {
  mock.auth = { isAuthenticated: true, user: { id: 'owner' } }; mock.post.mockResolvedValue({ data: { success: false, message: 'Evento pendiente de publicación' } })
  mount(); fireEvent.change(await screen.findByLabelText('Tu evento publicado'), { target: { value: 'event1' } })
  fireEvent.click(screen.getByRole('button', { name: 'Solicitar propuesta de promoción' }))
  await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('Evento pendiente de publicación'))
  expect(screen.queryByText(/Solicitud registrada para revisión/)).toBeNull()
})
