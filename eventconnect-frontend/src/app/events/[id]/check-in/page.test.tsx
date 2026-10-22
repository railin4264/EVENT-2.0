// @vitest-environment jsdom
import React from 'react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import CheckInPage from './page'

const mocks = vi.hoisted(() => ({ auth: { isAuthenticated: true, user: { id: 'owner', role: 'user' } }, get: vi.fn(), post: vi.fn(), vibrate: vi.fn() }))
vi.mock('next/navigation', () => ({ useParams: () => ({ id: 'event' }) }))
vi.mock('@/stores/authStore', () => ({ useAuthStore: Object.assign(() => mocks.auth, { getState: () => mocks.auth }) }))
vi.mock('@/lib/api/client', () => ({ default: { get: mocks.get, post: mocks.post } }))
vi.mock('next/link', () => ({ default: ({ children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => <a {...props}>{children}</a> }))
vi.mock('@/components/events/CheckInCamera', () => ({ CheckInCamera: () => <div>Camera available</div> }))
const code = `EC:${'a'.repeat(24)}:${'b'.repeat(24)}:${'c'.repeat(64)}`

beforeEach(() => {
  vi.stubGlobal('React', React)
  mocks.auth = { isAuthenticated: true, user: { id: 'owner', role: 'user' } }
  mocks.get.mockResolvedValue({ data: { event: { title: 'Fiesta', createdBy: { _id: 'owner' } } } })
  Object.defineProperty(navigator, 'onLine', { configurable: true, value: true })
  Object.defineProperty(navigator, 'vibrate', { configurable: true, value: mocks.vibrate })
})
afterEach(() => { cleanup(); vi.clearAllMocks(); vi.unstubAllGlobals() })

async function submit() {
  fireEvent.change(await screen.findByLabelText('O pega el código de la entrada'), { target: { value: code } })
  fireEvent.click(screen.getByRole('button', { name: 'Validar y registrar entrada' }))
}
it('does not load organizer controls or event data for guests', () => {
  mocks.auth.isAuthenticated = false
  render(<CheckInPage />)
  expect(screen.queryByText('Camera available')).toBeNull()
  expect(mocks.get).not.toHaveBeenCalled()
  expect(screen.getByRole('link', { name: 'Iniciar sesión' }).getAttribute('href')).toContain('check-in')
})
it('does not expose camera to another attendee', async () => {
  mocks.auth.user.id = 'visitor'
  render(<CheckInPage />)
  await screen.findByRole('alert')
  expect(screen.queryByText('Camera available')).toBeNull()
})
it('allows an authenticated administrator after checking event access', async () => {
  mocks.auth.user = { id: 'admin', role: 'admin' }
  render(<CheckInPage />)
  await screen.findByText('Camera available')
})
it('locks simultaneous requests and confirms only a successful valid result', async () => {
  let resolve!: (value: unknown) => void
  mocks.post.mockImplementation(() => new Promise(done => { resolve = done }))
  render(<CheckInPage />)
  await submit()
  fireEvent.submit(screen.getByLabelText('O pega el código de la entrada').closest('form')!)
  expect(mocks.post).toHaveBeenCalledTimes(1)
  resolve({ data: { success: true, data: { valid: true, quantity: 2, orderNumber: 'ORDER' } } })
  await screen.findByText('Entrada registrada · 2 personas')
  expect(mocks.vibrate).toHaveBeenCalledOnce()
})
it('never paints green or vibrates for an HTTP-200 invalid envelope', async () => {
  mocks.post.mockResolvedValue({ data: { success: true, data: { valid: false, quantity: 1, orderNumber: 'ORDER' } } })
  render(<CheckInPage />); await submit()
  await screen.findByRole('alert')
  expect(screen.queryByText(/Entrada registrada ·/)).toBeNull()
  expect(mocks.vibrate).not.toHaveBeenCalled()
})
it('shows duplicate conflict separately and never vibrates', async () => {
  mocks.post.mockRejectedValue({ response: { status: 409 } })
  render(<CheckInPage />); await submit()
  await screen.findByText(/Entrada ya utilizada/)
  expect(mocks.vibrate).not.toHaveBeenCalled()
})
it('does not send an offline validation request', async () => {
  Object.defineProperty(navigator, 'onLine', { configurable: true, value: false })
  render(<CheckInPage />); await submit()
  await screen.findByText(/Sin conexión/)
  expect(mocks.post).not.toHaveBeenCalled()
})
it('discards a pending confirmation when the account changes', async () => {
  let resolve!: (value: unknown) => void
  mocks.post.mockImplementation(() => new Promise(done => { resolve = done }))
  const { rerender } = render(<CheckInPage />); await submit()
  mocks.auth.user.id = 'visitor'; rerender(<CheckInPage />)
  resolve({ data: { success: true, data: { valid: true, quantity: 2, orderNumber: 'ORDER' } } })
  await waitFor(() => expect(screen.queryByText('Camera available')).toBeNull())
  expect(screen.queryByText(/Entrada registrada ·/)).toBeNull()
  expect(mocks.vibrate).not.toHaveBeenCalled()
})
