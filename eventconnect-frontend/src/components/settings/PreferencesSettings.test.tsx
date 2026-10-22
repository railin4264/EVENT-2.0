// @vitest-environment jsdom
import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import PreferencesSettings from './PreferencesSettings'

const api = vi.hoisted(() => ({ get: vi.fn(), put: vi.fn(), success: vi.fn(), error: vi.fn(), setTheme: vi.fn(), theme: 'dark' }))
vi.mock('@/lib/api/client', () => ({ apiClient: { get: api.get, put: api.put } }))
vi.mock('react-hot-toast', () => ({ default: { success: api.success, error: api.error } }))
vi.mock('next-themes', () => ({ useTheme: () => ({ theme: api.theme, setTheme: api.setTheme }) }))
vi.mock('@/components/discovery/ContentFilterModal', () => ({ default: ({ currentUser, onClose }: any) => (
  <div role="dialog" aria-label="Filtros"><span>{JSON.stringify(currentUser.settings.preferences)}</span><button onClick={onClose}>Cerrar filtros</button></div>
) }))

const stored = () => ({
  notifications: { email: false, push: true }, privacy: { showLocation: false },
  preferences: { theme: 'dark', language: 'es', timezone: 'Europe/Madrid', hidePolitical: true, hiddenCategories: ['politics'], customSetting: 'keep' },
})
function deferred() {
  let resolve!: (value: any) => void
  let reject!: (error: any) => void
  const promise = new Promise<any>((yes, no) => { resolve = yes; reject = no })
  return { promise, resolve, reject }
}
function mount(user: { id?: string; _id?: string } = { id: 'a' }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  const view = render(<QueryClientProvider client={client}><PreferencesSettings user={user} /></QueryClientProvider>)
  return { client, changeUser: (next: { id?: string; _id?: string }) => view.rerender(
    <QueryClientProvider client={client}><PreferencesSettings user={next} /></QueryClientProvider>
  ) }
}
const button = (name: string) => screen.getByRole('button', { name }) as HTMLButtonElement
const ready = () => waitFor(() => expect(button('Claro').disabled).toBe(false))
beforeEach(() => {
  vi.stubGlobal('React', React)
  vi.clearAllMocks()
  api.theme = 'dark'
  api.setTheme.mockImplementation(value => { api.theme = value })
  api.get.mockResolvedValue({ data: { settings: stored() } })
  api.put.mockImplementation((_url, body) => Promise.resolve({ data: { success: true, settings: { preferences: body.preferences } } }))
})
afterEach(() => { cleanup(); vi.unstubAllGlobals() })

describe('preference loading and safe persistence', () => {
  it('never fetches without an account and keeps controls locked through load failure and retry using _id', async () => {
    const { client, changeUser } = mount({})
    expect(api.get).not.toHaveBeenCalled()
    expect(button('Claro').disabled).toBe(true)
    const loading = deferred()
    api.get.mockReturnValueOnce(loading.promise)
    changeUser({ _id: 'a' })
    expect(button('Claro').disabled).toBe(true)
    fireEvent.click(button('Claro'))
    expect(api.put).not.toHaveBeenCalled()
    await act(async () => loading.reject(new Error('No hay conexión')))
    await screen.findByText('No hay conexión')
    expect(button('Claro').disabled).toBe(true)
    fireEvent.click(button('Reintentar carga'))
    await ready()
    expect(client.getQueryData(['settings', 'a'])).toEqual(stored())
    expect(client.getQueryData(['settings', undefined])).toBeUndefined()
  })

  it('rolls a failed theme preview back through the shared provider and retries the same delta', async () => {
    // Navbar may have changed the active theme since the preference was saved.
    api.theme = 'light'
    const saving = deferred()
    api.put.mockReturnValueOnce(saving.promise)
    const { client } = mount()
    await ready()
    fireEvent.click(button('Oscuro'))
    expect(api.setTheme).toHaveBeenLastCalledWith('dark')
    expect(button('Oscuro').getAttribute('aria-pressed')).toBe('true')
    await waitFor(() => expect(api.put).toHaveBeenCalledWith('/users/me/settings', { preferences: { theme: 'dark' } }))
    await act(async () => saving.reject(new Error('No se guardó')))
    await screen.findByText('No se guardó')
    expect(api.setTheme).toHaveBeenLastCalledWith('light')
    expect(button('Claro').getAttribute('aria-pressed')).toBe('true')
    expect(client.getQueryData(['settings', 'a'])).toEqual(stored())
    await ready()
    fireEvent.click(button('Reintentar guardado'))
    await waitFor(() => expect(api.success).toHaveBeenCalledTimes(1))
    expect(api.put).toHaveBeenNthCalledWith(2, '/users/me/settings', { preferences: { theme: 'dark' } })
    expect(button('Oscuro').getAttribute('aria-pressed')).toBe('true')
  })

  it('serializes changes and preserves content filters and other settings even if the response contains stale fields', async () => {
    const saving = deferred()
    api.put.mockReturnValueOnce(saving.promise)
    const { client } = mount()
    await ready()
    fireEvent.click(button('Claro'))
    fireEvent.click(button('English'))
    await waitFor(() => expect(api.put).toHaveBeenCalledTimes(1))
    expect(button('Personalizar Filtros').disabled).toBe(true)
    await act(async () => saving.resolve({ data: { settings: { preferences: { theme: 'light', hidePolitical: false, hiddenCategories: [] }, notifications: { push: false } } } }))
    await ready()
    const original = stored()
    expect(client.getQueryData(['settings', 'a'])).toEqual({ ...original, preferences: { ...original.preferences, theme: 'light' } })
    expect(api.put.mock.calls[0][1]).toEqual({ preferences: { theme: 'light' } })
  })

  it('does not let an old account failure roll back the new account theme, cache or UI', async () => {
    const saving = deferred()
    api.put.mockReturnValueOnce(saving.promise)
    const { client, changeUser } = mount()
    await ready()
    fireEvent.click(button('Claro'))
    await waitFor(() => expect(api.put).toHaveBeenCalledTimes(1))
    const accountB = { ...stored(), preferences: { ...stored().preferences, theme: 'system', timezone: 'Asia/Tokyo' } }
    api.get.mockResolvedValue({ data: { settings: accountB } })
    api.theme = 'system'
    changeUser({ id: 'b' })
    await waitFor(() => expect(client.getQueryData(['settings', 'b'])).toEqual(accountB))
    await act(async () => saving.reject(new Error('Account A failed')))
    await ready()
    expect(button('Sistema').getAttribute('aria-pressed')).toBe('true')
    expect(api.setTheme).toHaveBeenCalledTimes(1)
    expect(api.error).not.toHaveBeenCalled()
    expect(screen.queryByText('Account A failed')).toBeNull()
    expect(client.getQueryData(['settings', 'b'])).toEqual(accountB)
  })

  it('uses provider system mode without directly relying on matchMedia and rejects an unconfirmed save', async () => {
    vi.stubGlobal('matchMedia', undefined)
    api.put.mockResolvedValue({ data: { success: true, settings: { preferences: {} } } })
    mount()
    await ready()
    fireEvent.click(button('Sistema'))
    expect(api.setTheme).toHaveBeenCalledWith('system')
    await screen.findByText('El servidor no confirmó el cambio. Vuelve a intentarlo.')
    expect(api.setTheme).toHaveBeenLastCalledWith('dark')
    expect(api.success).not.toHaveBeenCalled()
  })

  it('labels language honestly, preserves uncommon timezones and passes fetched content filters to the modal', async () => {
    const settings = { ...stored(), preferences: { ...stored().preferences, timezone: 'Pacific/Auckland' } }
    api.get.mockResolvedValue({ data: { settings } })
    mount()
    await ready()
    expect(screen.getByText(/La interfaz sigue disponible en español/)).toBeTruthy()
    const zone = screen.getByRole('combobox', { name: 'Zona horaria' }) as HTMLSelectElement
    expect(zone.value).toBe('Pacific/Auckland')
    expect(zone.textContent).not.toMatch(/GMT[+-]/)
    fireEvent.click(button('English'))
    await waitFor(() => expect(api.put).toHaveBeenCalledWith('/users/me/settings', { preferences: { language: 'en' } }))
    await ready()
    fireEvent.click(button('Personalizar Filtros'))
    const dialog = screen.getByRole('dialog', { name: 'Filtros' })
    expect(dialog.textContent).toContain('"hidePolitical":true')
    expect(dialog.textContent).toContain('"language":"en"')
    expect(button('Claro').disabled).toBe(true)
    fireEvent.click(button('Cerrar filtros'))
    await ready()
  })
})
