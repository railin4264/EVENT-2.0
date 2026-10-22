// @vitest-environment jsdom
import React from 'react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import ShareButton from './ShareButton'

const event = (override: any = {}) => ({ _id: 'public-event', title: 'Coro de música', isPrivate: false, status: 'published', date: '2099-10-22T22:00:00Z', timeZone: 'America/Santo_Domingo', price: { amount: 25.5, currency: 'USD' }, ...override }) as any
beforeEach(() => { vi.stubGlobal('React', React) })
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals() })

it('prepares a safe WhatsApp draft link without opening a window or sending anything', async () => {
  const open = vi.spyOn(window, 'open').mockImplementation(() => null)
  render(<ShareButton event={event({ isSecretLocation: true, location: { venue: 'Casa secreta 997', address: 'Dirección privada', coordinates: [18.765, -69.123] } })} />)
  fireEvent.click(screen.getByRole('button', { name: 'Compartir evento' }))
  const link = await screen.findByRole('link', { name: 'Armar el coro en WhatsApp' })
  const url = new URL(link.getAttribute('href')!)
  expect(url.origin).toBe('https://wa.me')
  expect(url.searchParams.get('text')).toContain('Ubicación reservada')
  expect(url.searchParams.get('text')).not.toMatch(/Casa secreta|Dirección privada|18\.765|69\.123/)
  expect(link.getAttribute('rel')).toContain('noopener')
  expect(open).not.toHaveBeenCalled()
})

it('does not offer public sharing for a private event or a missing event identity', () => {
  const view = render(<ShareButton event={event({ isPrivate: true })} />)
  expect((screen.getByRole('button', { name: 'Compartir evento' }) as HTMLButtonElement).disabled).toBe(true)
  expect(screen.queryByRole('link')).toBeNull()
  view.rerender(<ShareButton event={event({ _id: undefined })} />)
  expect((screen.getByRole('button', { name: 'Compartir evento' }) as HTMLButtonElement).disabled).toBe(true)
})

it('keeps cancelled events out of invitation actions', () => {
  render(<ShareButton event={event({ status: 'cancelled' })} />)
  expect((screen.getByRole('button', { name: 'Compartir evento' }) as HTMLButtonElement).disabled).toBe(true)
  expect(screen.queryByRole('link', { name: 'Armar el coro en WhatsApp' })).toBeNull()
  expect(screen.queryByRole('link', { name: 'Email' })).toBeNull()
})

it('shows clipboard failure with a usable public URL and closes with Escape returning focus', async () => {
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: vi.fn().mockRejectedValue(new Error('Denied')) } })
  render(<ShareButton event={event()} />)
  const trigger = screen.getByRole('button', { name: 'Compartir evento' })
  fireEvent.click(trigger)
  fireEvent.click(screen.getByRole('button', { name: 'Copiar enlace' }))
  expect((await screen.findByRole('alert')).textContent).toContain('/events/public-event')
  fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })
  await waitFor(() => expect(trigger.getAttribute('aria-expanded')).toBe('false'))
  expect(document.activeElement).toBe(trigger)
})
