// @vitest-environment jsdom
import React from 'react'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import RegisterPage from './page'

const mocks = vi.hoisted(() => ({ register: vi.fn(), replace: vi.fn() }))
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace: mocks.replace }),
  useSearchParams: () => new URLSearchParams('redirect=%2Fevents%2Fabc%3Fticket%3Dvip') }))
vi.mock('@/stores/authStore', () => ({ useAuthStore: (selector: (state: unknown) => unknown) => selector({ register: mocks.register }) }))
vi.mock('@/components/auth/OAuthButtons', () => ({ default: () => null }))
vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }))

beforeEach(() => { mocks.register.mockResolvedValue(undefined) })
afterEach(() => { cleanup(); vi.clearAllMocks() })

function fillValidRegistration() {
  fireEvent.change(screen.getByLabelText('Tu nombre'), { target: { value: 'Ana' } })
  fireEvent.change(screen.getByLabelText('Nombre de usuario'), { target: { value: 'ana_test' } })
  fireEvent.change(screen.getByLabelText('Correo electrónico'), { target: { value: 'ana@example.test' } })
  fireEvent.change(screen.getByLabelText('Fecha de nacimiento'), { target: { value: '2000-04-15' } })
  fireEvent.change(screen.getByLabelText('Contraseña'), { target: { value: 'Seguro123!' } })
  fireEvent.click(screen.getByRole('checkbox'))
}

it('creates the account once and continues to optional personalization with the event destination', async () => {
  render(<RegisterPage />)
  fillValidRegistration()
  fireEvent.click(screen.getByRole('button', { name: 'Crear cuenta gratis' }))
  await waitFor(() => expect(mocks.replace).toHaveBeenCalledWith('/onboarding?redirect=%2Fevents%2Fabc%3Fticket%3Dvip'))
  expect(mocks.register).toHaveBeenCalledOnce()
  expect(mocks.register).toHaveBeenCalledWith(expect.objectContaining({ name: 'Ana', username: 'ana_test', email: 'ana@example.test',
    birthDate: '2000-04-15', password: 'Seguro123!', acceptTerms: true }))
})

it('suggests a username so registration can proceed without choosing one manually', async () => {
  render(<RegisterPage />)
  fireEvent.change(screen.getByLabelText('Tu nombre'), { target: { value: 'Ana María' } })
  await waitFor(() => expect((screen.getByLabelText('Nombre de usuario') as HTMLInputElement).value).toMatch(/^anamaria_\d{6}$/))
  fireEvent.change(screen.getByLabelText('Nombre de usuario'), { target: { value: 'mi_nombre' } })
  fireEvent.change(screen.getByLabelText('Tu nombre'), { target: { value: 'Ana Pérez' } })
  expect((screen.getByLabelText('Nombre de usuario') as HTMLInputElement).value).toBe('mi_nombre')
})

it('keeps a recoverable inline server error even for an unexpected validation response shape', async () => {
  mocks.register.mockRejectedValueOnce({ response: { data: { message: 'No disponible temporalmente', errors: { email: 'invalid' } } } })
  render(<RegisterPage />)
  fillValidRegistration()
  fireEvent.click(screen.getByRole('button', { name: 'Crear cuenta gratis' }))
  expect((await screen.findByRole('alert')).textContent).toContain('No disponible temporalmente')
  expect(mocks.replace).not.toHaveBeenCalled()
  expect((screen.getByLabelText('Tu nombre') as HTMLInputElement).value).toBe('Ana')
})
