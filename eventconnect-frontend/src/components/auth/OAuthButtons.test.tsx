// @vitest-environment jsdom
import React from 'react'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import OAuthButtons from './OAuthButtons'
import { oauthService } from '@/lib/api/oauth'

vi.mock('@/lib/api/oauth', () => ({ oauthService: { getProviders: vi.fn(), getAuthUrl: vi.fn() } }))
afterEach(() => { cleanup(); vi.clearAllMocks() })

it('does not offer unavailable login providers', async () => {
  vi.mocked(oauthService.getProviders).mockResolvedValue({ success: true, data: { providers: [] } })
  const view = render(<OAuthButtons />)
  await waitFor(() => expect(oauthService.getProviders).toHaveBeenCalledOnce())
  expect(view.container.querySelectorAll('button')).toHaveLength(0)
})

it('offers Facebook when the backend enables it', async () => {
  vi.mocked(oauthService.getProviders).mockResolvedValue({ success: true, data: { providers: [
    { name: 'Facebook', enabled: true },
  ] } })
  render(<OAuthButtons />)
  expect(await screen.findByRole('button', { name: 'Continuar con Facebook' })).toBeTruthy()
  expect(screen.queryByRole('button', { name: 'Continuar con Google' })).toBeNull()
})

it('uses the backend provider shape and reports a failed start without crashing', async () => {
  vi.mocked(oauthService.getProviders).mockResolvedValue({ success: true, data: { providers: [
    { name: 'Google', enabled: true }, { name: 'Apple', enabled: false },
  ] } })
  vi.mocked(oauthService.getAuthUrl).mockRejectedValue(new Error('Conexión no disponible'))
  render(<OAuthButtons />)
  fireEvent.click(await screen.findByRole('button', { name: 'Continuar con Google' }))
  expect(await screen.findByText('Conexión no disponible')).toBeTruthy()
  expect(screen.queryByRole('button', { name: 'Continuar con Apple' })).toBeNull()
  expect(screen.getByRole('button', { name: 'Continuar con Google' }).hasAttribute('disabled')).toBe(false)
})
