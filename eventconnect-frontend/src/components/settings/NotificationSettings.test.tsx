// @vitest-environment jsdom
import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import NotificationSettings from './NotificationSettings'

const api = vi.hoisted(() => ({ get: vi.fn(), put: vi.fn(), success: vi.fn(), error: vi.fn(), requestPermission: vi.fn() }))
vi.mock('@/lib/api/client', () => ({ apiClient: { get: api.get, put: api.put } }))
vi.mock('react-hot-toast', () => ({ default: { success: api.success, error: api.error } }))

const storedSettings = (notifications = {}) => ({
  notifications: { email: false, push: false, eventReminders: false, newMessages: false, weeklyDigest: false, newFollowers: true, ...notifications },
  privacy: { showLocation: false, showProfile: false },
  preferences: { theme: 'dark', timezone: 'Europe/Madrid', language: 'es' },
  otherPreference: 'preserve-me',
})

function deferred() {
  let resolve!: (value: any) => void
  let reject!: (error: any) => void
  const promise = new Promise<any>((yes, no) => { resolve = yes; reject = no })
  return { promise, resolve, reject }
}

function mount(user: { id?: string; _id?: string } = { id: 'account-a' }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  const view = render(<QueryClientProvider client={client}><NotificationSettings user={user} /></QueryClientProvider>)
  return { ...view, client, changeUser: (nextUser: { id?: string; _id?: string }) => view.rerender(
    <QueryClientProvider client={client}><NotificationSettings user={nextUser} /></QueryClientProvider>
  ) }
}

const email = () => screen.getByRole('checkbox', { name: 'Notificaciones por email' }) as HTMLInputElement
const push = () => screen.getByRole('checkbox', { name: 'Notificaciones push' }) as HTMLInputElement
const ready = async () => waitFor(() => expect(email().disabled).toBe(false))

beforeEach(() => {
  vi.stubGlobal('React', React)
  vi.stubGlobal('Notification', { requestPermission: api.requestPermission })
  vi.clearAllMocks()
  api.get.mockResolvedValue({ data: { settings: storedSettings() } })
  api.put.mockImplementation((_url, change) => Promise.resolve({ data: { success: true, notifications: change } }))
})
afterEach(() => { cleanup(); vi.unstubAllGlobals() })

describe('notification preference consent and persistence', () => {
  it('keeps sharing attendance separate from receiving friends plans and from push consent', async () => {
    mount()
    await ready()
    const share = screen.getByRole('checkbox', { name: 'Compartir mi asistencia con amigos' }) as HTMLInputElement
    const receive = screen.getByRole('checkbox', { name: 'Planes de mis amigos' }) as HTMLInputElement
    expect(share.checked).toBe(false)
    expect(receive.checked).toBe(false)
    fireEvent.click(share)
    await waitFor(() => expect(api.put).toHaveBeenCalledWith('/users/me/notifications', { shareAttendance: true }))
    expect(receive.checked).toBe(false)
    expect(push().checked).toBe(false)
    expect(api.requestPermission).not.toHaveBeenCalled()
  })
  it('keeps every switch off and locked until the settings GET completes', async () => {
    const loading = deferred()
    api.get.mockReturnValue(loading.promise)
    mount()
    for (const input of screen.getAllByRole('checkbox') as HTMLInputElement[]) {
      expect(input.checked).toBe(false)
      expect(input.disabled).toBe(true)
    }
    fireEvent.click(email().closest('label')!)
    expect(api.put).not.toHaveBeenCalled()
    await act(async () => loading.resolve({ data: { settings: storedSettings() } }))
    await ready()
    expect(api.get.mock.calls[0][0]).toBe('/users/me/settings')
    expect(email().checked).toBe(false)
    expect(push().checked).toBe(false)
  })

  it('does not fetch or write under an undefined account key', () => {
    mount({})
    expect(api.get).not.toHaveBeenCalled()
    expect(email().checked).toBe(false)
    expect(email().disabled).toBe(true)
    expect(screen.getByRole('alert').textContent).toContain('Inicia sesión')
  })

  it('shows a loading error, blocks changes and allows an explicit retry', async () => {
    api.get.mockRejectedValueOnce({ response: { data: { message: 'No se pudo cargar la configuración' } } })
    mount()
    await screen.findByText('No se pudo cargar la configuración')
    expect(email().checked).toBe(false)
    expect(email().disabled).toBe(true)
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar carga' }))
    await ready()
    expect(api.get).toHaveBeenCalledTimes(2)
    expect(api.put).not.toHaveBeenCalled()
  })

  it('rolls back a failed toggle and retries the same intent without changing other preferences', async () => {
    const original = storedSettings({ push: true })
    const saving = deferred()
    api.get.mockResolvedValue({ data: { settings: original } })
    api.put.mockReturnValueOnce(saving.promise)
    const { client } = mount({ _id: 'account-a' })
    await ready()
    expect(push().checked).toBe(true)
    // Activate the visible switch label, rather than only invoking an invisible input.
    fireEvent.click(email().closest('label')!)
    expect(email().checked).toBe(true)
    await waitFor(() => expect(api.put).toHaveBeenCalledWith('/users/me/notifications', { email: true }))
    expect(email().disabled).toBe(true)
    expect(push().disabled).toBe(true)
    await act(async () => saving.reject({ response: { data: { message: 'No se pudo guardar' } } }))
    await screen.findByText('No se pudo guardar')
    await ready()
    expect(email().checked).toBe(false)
    expect(push().checked).toBe(true)
    expect(client.getQueryData(['settings', 'account-a'])).toEqual(original)
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar guardado' }))
    await waitFor(() => expect(api.success).toHaveBeenCalledTimes(1))
    expect(api.put).toHaveBeenNthCalledWith(2, '/users/me/notifications', { email: true })
    expect(email().checked).toBe(true)
    expect(push().checked).toBe(true)
    expect(client.getQueryData(['settings', 'account-a'])).toEqual({ ...original, notifications: { ...original.notifications, email: true } })
    expect(client.getQueryData(['settings', undefined])).toBeUndefined()
  })

  it('serializes rapid changes and merges only the confirmed field into the cached settings', async () => {
    const original = storedSettings({ push: true })
    const saving = deferred()
    api.get.mockResolvedValue({ data: { settings: original } })
    api.put.mockReturnValueOnce(saving.promise)
    const { client } = mount()
    await ready()
    fireEvent.click(email())
    fireEvent.click(push())
    await waitFor(() => expect(api.put).toHaveBeenCalledTimes(1))
    await act(async () => saving.resolve({ data: { notifications: { email: true, push: false } } }))
    await ready()
    expect(email().checked).toBe(true)
    expect(push().checked).toBe(true)
    expect(client.getQueryData(['settings', 'account-a'])).toEqual({ ...original, notifications: { ...original.notifications, email: true } })
  })

  it('does not claim success or keep an opt-in when the server did not confirm it', async () => {
    api.put.mockResolvedValue({ data: { success: true } })
    mount()
    await ready()
    fireEvent.click(email())
    await screen.findByText('El servidor no confirmó el cambio. Vuelve a intentarlo.')
    expect(email().checked).toBe(false)
    expect(api.success).not.toHaveBeenCalled()
  })

  it('ignores an old account save after the displayed account changes', async () => {
    const saving = deferred()
    api.put.mockReturnValueOnce(saving.promise)
    const { client, changeUser } = mount()
    await ready()
    fireEvent.click(email())
    await waitFor(() => expect(api.put).toHaveBeenCalledTimes(1))
    changeUser({ _id: 'account-b' })
    expect(email().checked).toBe(false)
    await waitFor(() => expect(api.get).toHaveBeenCalledTimes(2))
    await act(async () => saving.resolve({ data: { notifications: { email: true } } }))
    await ready()
    expect(email().checked).toBe(false)
    expect(client.getQueryData<any>(['settings', 'account-b']).notifications.email).toBe(false)
    expect(api.success).not.toHaveBeenCalled()
    expect(api.error).not.toHaveBeenCalled()
  })

  it('does not render nonfunctional pause controls or trigger notification permission requests', async () => {
    mount()
    await ready()
    expect(screen.queryByRole('button', { name: /Silenciar/ })).toBeNull()
    expect(api.put).not.toHaveBeenCalled()
    fireEvent.click(push())
    await waitFor(() => expect(api.success).toHaveBeenCalledTimes(1))
    expect(api.put).toHaveBeenCalledWith('/users/me/notifications', { push: true })
    expect(api.requestPermission).not.toHaveBeenCalled()
  })
})
