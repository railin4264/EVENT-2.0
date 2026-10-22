// @vitest-environment jsdom
import React from 'react'
import { afterEach, describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react'
import { EventTravelPanel } from './EventTravelPanel'

afterEach(() => { cleanup(); vi.restoreAllMocks() })
describe('travel panel actions', () => {
  it('updates the external search when a group adjusts a future stay', () => {
    render(<EventTravelPanel event={{ title: 'Festival', date: '2099-01-20T12:00:00Z', location: { city: 'Samaná' } }} />)
    fireEvent.change(screen.getByLabelText('Adultos'), { target: { value: '8' } })
    fireEvent.change(screen.getByLabelText('Llegar antes'), { target: { value: '2' } })
    const url = new URL(screen.getByRole('link', { name: /Airbnb · 8 personas/ }).getAttribute('href')!)
    expect(url.searchParams.get('adults')).toBe('8')
    expect(url.searchParams.get('checkin')).toBe('2099-01-18')
  })
  it('preserves shared expenses and all external provider actions', () => {
    const open = vi.fn()
    render(<EventTravelPanel event={{ title: 'Coro', location: { city: 'Samaná', venue: 'Malecón' } }} onOpenSerrucho={open} />)
    fireEvent.click(screen.getByRole('button', { name: 'Dividir Serrucho' }))
    expect(open).toHaveBeenCalledOnce()
    expect(screen.getAllByRole('link')).toHaveLength(4)
    for (const link of screen.getAllByRole('link')) expect(link.getAttribute('rel')).toContain('noopener')
  })
  it('reports clipboard failure without pretending to copy', async () => {
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: vi.fn().mockRejectedValue(new Error('denied')) } })
    render(<EventTravelPanel event={{ title: 'Coro', location: { venue: 'Parque' } }} />)
    fireEvent.click(screen.getByRole('button', { name: 'Copiar ubicación' }))
    await waitFor(() => expect(screen.getByRole('status').textContent).toContain('No se pudo copiar'))
  })
  it('withholds secret transport and tour departure details', () => {
    render(<EventTravelPanel event={{ title: 'Coro', isSecretLocation: true, isTourOrTrip: true, location: { city: 'Santiago', venue: 'Dirección secreta' }, tourDetails: { departurePoint: 'Salida secreta' } }} />)
    expect(screen.queryByText('Dirección secreta')).toBeNull()
    expect(screen.queryByText(/Salida secreta/)).toBeNull()
    expect(screen.queryByRole('link', { name: /Abrir Uber/ })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Copiar ubicación' })).toBeNull()
  })
})
