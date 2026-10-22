// @vitest-environment jsdom
import React from 'react'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { Onboarding } from './Onboarding'
import { apiClient } from '@/lib/api/client'
import { CATEGORY_LIST } from '@/lib/categories'
import { AxiosHeaders, type AxiosResponse } from 'axios'
import { useAuthStore } from '@/stores/authStore'

vi.mock('@/lib/api/client', () => ({ apiClient: { get: vi.fn(), put: vi.fn() } }))
vi.mock('@/stores/authStore', () => ({ useAuthStore: { setState: vi.fn(), getState: vi.fn() } }))

const settings = { notifications: { email: false, push: false, eventReminders: true },
  privacy: { showLocation: false, showAttendedEvents: true }, preferences: { language: 'es' } }
const user = { id: 'user-1', firstName: 'Ana', interests: [] }
const response = <T,>(data: T): AxiosResponse<T> => ({ data, status: 200, statusText: 'OK', headers: {}, config: { headers: new AxiosHeaders() } })
beforeEach(() => {
  vi.mocked(useAuthStore.getState).mockReturnValue({ user, isAuthenticated: true } as ReturnType<typeof useAuthStore.getState>)
  vi.mocked(apiClient.get).mockResolvedValue(response({ success: true, settings }))
  vi.mocked(apiClient.put).mockImplementation(async (url) => response(String(url).includes('settings') ?
    { success: true, settings } : { success: true, user: { ...user, interests: ['technology'] } }))
})

it('does not update another account or send settings after the profile request completes for an old session', async () => {
  let resolveProfile: (value: AxiosResponse) => void
  vi.mocked(apiClient.put).mockImplementationOnce(() => new Promise(resolve => { resolveProfile = resolve }))
  const complete = vi.fn()
  render(<Onboarding user={user} onComplete={complete} />)
  fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }))
  fireEvent.click(screen.getByText('Privacidad y avisos (opcional)'))
  fireEvent.click(await screen.findByRole('checkbox', { name: /Recibir avisos por correo/ }))
  fireEvent.click(screen.getByRole('button', { name: 'Guardar y continuar' }))
  await waitFor(() => expect(apiClient.put).toHaveBeenCalledOnce())
  vi.mocked(useAuthStore.getState).mockReturnValue({ user: { id: 'other-user' }, isAuthenticated: true } as ReturnType<typeof useAuthStore.getState>)
  await act(async () => { resolveProfile(response({ success: true, user })) })
  expect(apiClient.put).toHaveBeenCalledOnce()
  expect(useAuthStore.setState).not.toHaveBeenCalled()
  expect(complete).not.toHaveBeenCalled()
})

it('ignores completion after unmount without cancelling the authorized request', async () => {
  let resolveProfile: (value: AxiosResponse) => void
  vi.mocked(apiClient.put).mockImplementationOnce(() => new Promise(resolve => { resolveProfile = resolve }))
  const complete = vi.fn()
  const view = render(<Onboarding user={user} onComplete={complete} />)
  fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }))
  fireEvent.click(screen.getByRole('button', { name: 'Guardar y continuar' }))
  await waitFor(() => expect(apiClient.put).toHaveBeenCalledOnce())
  view.unmount()
  await act(async () => { resolveProfile(response({ success: true, user })) })
  expect(useAuthStore.setState).not.toHaveBeenCalled()
  expect(complete).not.toHaveBeenCalled()
})

it('does not apply a pending settings response or navigate after switching accounts', async () => {
  let resolveSettings: (value: AxiosResponse) => void
  vi.mocked(apiClient.put).mockResolvedValueOnce(response({ success: true, user }))
    .mockImplementationOnce(() => new Promise(resolve => { resolveSettings = resolve }))
  const complete = vi.fn()
  render(<Onboarding user={user} onComplete={complete} />)
  fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }))
  fireEvent.click(screen.getByText('Privacidad y avisos (opcional)'))
  fireEvent.click(await screen.findByRole('checkbox', { name: /Recibir avisos por correo/ }))
  fireEvent.click(screen.getByRole('button', { name: 'Guardar y continuar' }))
  await waitFor(() => expect(apiClient.put).toHaveBeenCalledTimes(2))
  const otherSession = { user: { id: 'other-user' }, isAuthenticated: true } as ReturnType<typeof useAuthStore.getState>
  vi.mocked(useAuthStore.getState).mockReturnValue(otherSession)
  const updater = vi.mocked(useAuthStore.setState).mock.calls[0][0]
  expect(typeof updater).toBe('function')
  if (typeof updater === 'function') expect(updater(otherSession)).toEqual({})
  await act(async () => { resolveSettings(response({ success: true, settings })) })
  expect(useAuthStore.setState).toHaveBeenCalledOnce()
  expect(complete).not.toHaveBeenCalled()
})
afterEach(() => { cleanup(); vi.clearAllMocks() })

it('shows all canonical interests and preserves selection with Next and Back', async () => {
  render(<Onboarding user={user} onComplete={vi.fn()} />)
  for (const category of CATEGORY_LIST) expect(screen.getByRole('button', { name: category.label })).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: 'Tecnología' }))
  fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }))
  expect(await screen.findByRole('heading', { name: 'Tu selección, a tu manera.' })).toBeTruthy()
  expect(screen.getByText('1 intereses elegidos')).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: 'Atrás' }))
  expect(screen.getByRole('button', { name: 'Tecnología' }).getAttribute('aria-pressed')).toBe('true')
  expect(apiClient.put).not.toHaveBeenCalled()
})

it('caps new selections at 20 with an explicit error instead of truncating', () => {
  render(<Onboarding user={user} onComplete={vi.fn()} />)
  CATEGORY_LIST.slice(0, 21).forEach(category => fireEvent.click(screen.getByRole('button', { name: category.label })))
  expect(screen.getByText('20 de 20 intereses seleccionados')).toBeTruthy()
  expect(screen.getByRole('alert').textContent).toContain('hasta 20')
  expect(screen.getByRole('button', { name: CATEGORY_LIST[20].label }).getAttribute('aria-pressed')).toBe('false')
})

it('searches category names and activity examples without losing selected interests', () => {
  render(<Onboarding user={user} onComplete={vi.fn()} />)
  fireEvent.click(screen.getByRole('button', { name: 'Tecnología' }))
  const search = screen.getByRole('searchbox', { name: 'Buscar intereses' })
  fireEvent.change(search, { target: { value: 'senderismo' } })
  expect(screen.getByRole('button', { name: 'Aire libre' })).toBeTruthy()
  expect(screen.queryByRole('button', { name: 'Tecnología' })).toBeNull()
  fireEvent.change(search, { target: { value: '' } })
  expect(screen.getByRole('button', { name: 'Tecnología' }).getAttribute('aria-pressed')).toBe('true')
  expect(screen.getByRole('group', { name: 'Categorías de intereses' }).getAttribute('tabindex')).toBe('0')
})

it('persists canonical interests through the real service without overwriting untouched settings', async () => {
  const complete = vi.fn()
  render(<Onboarding user={user} onComplete={complete} />)
  fireEvent.click(screen.getByRole('button', { name: 'Tecnología' }))
  fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }))
  fireEvent.click(screen.getByRole('button', { name: 'Guardar y continuar' }))
  await waitFor(() => expect(complete).toHaveBeenCalledOnce())
  expect(apiClient.put).toHaveBeenCalledOnce()
  expect(apiClient.put).toHaveBeenCalledWith('/users/profile', { interests: ['technology'] })
})

it('does not finish after a failed save and retries without losing selections', async () => {
  const complete = vi.fn()
  vi.mocked(apiClient.put).mockRejectedValueOnce(new Error('Network unavailable'))
  render(<Onboarding user={user} onComplete={complete} />)
  fireEvent.click(screen.getByRole('button', { name: 'Tecnología' }))
  fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }))
  fireEvent.click(screen.getByRole('button', { name: 'Guardar y continuar' }))
  expect((await screen.findByRole('alert')).textContent).toContain('No pudimos guardar tus intereses')
  expect(complete).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button', { name: 'Atrás' }))
  expect(screen.getByRole('button', { name: 'Tecnología' }).getAttribute('aria-pressed')).toBe('true')
  fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }))
  fireEvent.click(screen.getByRole('button', { name: 'Guardar y continuar' }))
  await waitFor(() => expect(complete).toHaveBeenCalledOnce())
})

it('can skip without saving or activating permissions even if settings cannot load', async () => {
  vi.mocked(apiClient.get).mockRejectedValueOnce(new Error('Offline'))
  const skip = vi.fn()
  const complete = vi.fn()
  render(<Onboarding user={user} onSkip={skip} onComplete={complete} />)
  await screen.findByRole('alert')
  fireEvent.click(screen.getByRole('button', { name: 'Omitir sin guardar' }))
  expect(skip).toHaveBeenCalledOnce()
  expect(complete).not.toHaveBeenCalled()
  expect(apiClient.put).not.toHaveBeenCalled()
})

it('only sends explicitly changed settings and preserves recovery after a partial save', async () => {
  const complete = vi.fn()
  vi.mocked(apiClient.put).mockImplementation(async (url) => {
    if (String(url).includes('settings')) throw new Error('Offline')
    return response({ success: true, user })
  })
  render(<Onboarding user={user} onComplete={complete} />)
  fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }))
  fireEvent.click(screen.getByText('Privacidad y avisos (opcional)'))
  const email = await screen.findByRole('checkbox', { name: /Recibir avisos por correo/ })
  await waitFor(() => expect(email.hasAttribute('disabled')).toBe(false))
  fireEvent.click(email)
  fireEvent.click(screen.getByRole('button', { name: 'Guardar y continuar' }))
  expect((await screen.findByRole('alert')).textContent).toContain('Tus intereses se guardaron')
  expect(apiClient.put).toHaveBeenCalledWith('/users/me/settings', { notifications: { email: true } })
  expect(complete).not.toHaveBeenCalled()
})
