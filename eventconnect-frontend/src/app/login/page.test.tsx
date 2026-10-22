// @vitest-environment jsdom
import React from 'react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import LoginPage from './page'

const mocks = vi.hoisted(() => ({ search: '', login: vi.fn(), replace: vi.fn(), push: vi.fn(), success: vi.fn(), error: vi.fn() }))
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace: mocks.replace, push: mocks.push }), useSearchParams: () => new URLSearchParams(mocks.search) }))
vi.mock('@/stores/authStore', () => ({ useAuthStore: () => ({ login: mocks.login }) }))
vi.mock('react-hot-toast', () => ({ default: Object.assign(vi.fn(), { success: mocks.success, error: mocks.error }) }))
vi.mock('@/components/auth/OAuthButtons', () => ({ default: () => null }))
vi.mock('@/components/redesign/ui/particle-field', () => ({ ParticleField: () => null }))
vi.mock('framer-motion', async () => {
  const { createElement, forwardRef } = await import('react')
  return { motion: { div: forwardRef((props: any, ref) => {
    const { initial, animate, exit, transition, ...rest } = props
    return createElement('div', { ...rest, ref })
  }) } }
})
function fillCredentials() {
  fireEvent.change(screen.getByRole('textbox', { name: 'Correo electrónico' }), { target: { value: 'ana@example.test' } })
  fireEvent.change(screen.getByLabelText('Contraseña'), { target: { value: 'Valid123!' } })
}
beforeEach(() => { vi.stubGlobal('React', React); vi.clearAllMocks(); mocks.search = ''; mocks.login.mockResolvedValue(undefined) })
afterEach(() => { cleanup(); vi.unstubAllGlobals() })

it('preserves an explicit RSVP return through login and registration navigation without confirming attendance', async () => {
  mocks.search = new URLSearchParams({ redirect: '/events/event123?intent=rsvp' }).toString()
  render(<LoginPage />)
  expect(screen.getByRole('note').textContent).toContain('La confirmación requiere un clic tuyo al regresar')
  const register = new URL(screen.getByRole('link', { name: 'Regístrate gratis' }).getAttribute('href')!, 'https://eventnow.test')
  expect(register.searchParams.get('redirect')).toBe('/events/event123?intent=rsvp')
  fillCredentials()
  fireEvent.click(screen.getByRole('button', { name: 'Continuar para confirmar asistencia' }))
  await waitFor(() => expect(mocks.replace).toHaveBeenCalledWith('/events/event123?intent=rsvp'))
  expect(mocks.login).toHaveBeenCalledTimes(1)
  expect(mocks.login).toHaveBeenCalledWith({ email: 'ana@example.test', password: 'Valid123!' })
})

it('does not recognize an external RSVP redirect and uses the safe local fallback after login', async () => {
  mocks.search = new URLSearchParams({ redirect: 'https://other.test/events/event123?intent=rsvp' }).toString()
  render(<LoginPage />)
  expect(screen.queryByRole('note')).toBeNull()
  fillCredentials()
  fireEvent.click(screen.getByRole('button', { name: 'Iniciar sesión' }))
  await waitFor(() => expect(mocks.replace).toHaveBeenCalledWith('/events'))
})

it('keeps the RSVP return pending until two-factor authentication succeeds', async () => {
  mocks.search = new URLSearchParams({ redirect: '/events/event123?intent=rsvp' }).toString()
  mocks.login.mockRejectedValueOnce(Object.assign(new Error('2FA required'), { requiresTwoFactor: true, tempToken: 'temporary-token' }))
  render(<LoginPage />)
  fillCredentials()
  fireEvent.click(screen.getByRole('button', { name: 'Continuar para confirmar asistencia' }))
  const code = await screen.findByLabelText('Código de verificación')
  expect(mocks.replace).not.toHaveBeenCalled()
  fireEvent.change(code, { target: { value: '123456' } })
  fireEvent.click(screen.getByRole('button', { name: 'Continuar para confirmar asistencia' }))
  await waitFor(() => expect(mocks.replace).toHaveBeenCalledWith('/events/event123?intent=rsvp'))
  expect(mocks.login).toHaveBeenNthCalledWith(2, { email: 'ana@example.test', password: 'Valid123!', tempToken: 'temporary-token', code: '123456' })
})
