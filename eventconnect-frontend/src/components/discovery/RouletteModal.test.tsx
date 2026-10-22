// @vitest-environment jsdom
import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { RouletteModal } from './RouletteModal'

const api = vi.hoisted(() => ({ get: vi.fn() }))
vi.mock('@/lib/api/client', () => ({ apiClient: api }))
vi.mock('next/link', () => ({ default: ({ children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => <a {...props}>{children}</a> }))

describe('RouletteModal actions', () => {
  beforeEach(() => { vi.stubGlobal('React', React); vi.clearAllMocks() })
  afterEach(() => { cleanup(); vi.unstubAllGlobals() })

  it('closes with Escape, restores keyboard focus and page scrolling', () => {
    function Harness() {
      const [open, setOpen] = React.useState(false)
      return <><button onClick={() => setOpen(true)}>Abrir ruleta</button><RouletteModal isOpen={open} onClose={() => setOpen(false)} /></>
    }
    render(<Harness />)
    const trigger = screen.getByRole('button', { name: 'Abrir ruleta' })
    trigger.focus()
    fireEvent.click(trigger)
    expect(screen.getByRole('dialog', { name: 'Ruleta: ¿No sabes qué hacer?' })).toBeTruthy()
    expect(document.body.style.overflow).toBe('hidden')
    fireEvent.keyDown(document, { key: 'Tab' })
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Cerrar ruleta' }))
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(document.activeElement).toBe(trigger)
    expect(document.body.style.overflow).toBe('')
  })

  it('sends guest-selected filters and shows a recoverable API error in the dialog', async () => {
    api.get.mockRejectedValueOnce({ response: { data: { message: 'No hay eventos gratuitos en tu zona' } } })
    render(<RouletteModal isOpen onClose={() => {}} userLocation={{ lat: 0, lng: 0 }} />)
    fireEvent.click(screen.getByRole('switch', { name: 'Solo actividades gratuitas' }))
    fireEvent.change(screen.getByRole('slider', { name: 'Tiempo disponible en horas' }), { target: { value: '2' } })
    fireEvent.click(screen.getByRole('button', { name: '¡Girar la Ruleta Ahora!' }))
    await screen.findByRole('alert')
    expect(screen.getByRole('alert').textContent).toBe('No hay eventos gratuitos en tu zona')
    expect(api.get).toHaveBeenCalledWith('/events/roulette', expect.objectContaining({ params: { vibe: 'any', budget: 'free', durationHours: 2, lat: 0, lng: 0 } }))
    expect((screen.getByRole('button', { name: '¡Girar la Ruleta Ahora!' }) as HTMLButtonElement).disabled).toBe(false)
  })

  it('does not crash on an incomplete successful response and aborts a request when closed', async () => {
    api.get.mockResolvedValueOnce({ data: { success: true, data: {} } })
    const { rerender } = render(<RouletteModal isOpen onClose={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: '¡Girar la Ruleta Ahora!' }))
    await screen.findByRole('alert')
    expect(screen.queryByRole('link', { name: 'Ver este evento' })).toBeNull()
    api.get.mockImplementationOnce(() => new Promise(() => {}))
    fireEvent.click(screen.getByRole('button', { name: '¡Girar la Ruleta Ahora!' }))
    await waitFor(() => expect(api.get).toHaveBeenCalledTimes(2))
    const signal = api.get.mock.calls[1][1].signal as AbortSignal
    expect(signal.aborted).toBe(false)
    rerender(<RouletteModal isOpen={false} onClose={() => {}} />)
    expect(signal.aborted).toBe(true)
  })
})
