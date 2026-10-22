// @vitest-environment jsdom
import React from 'react'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import EventCalendarButtons from './EventCalendarButtons'
import EventWeatherCard from './EventWeatherCard'

beforeEach(() => vi.stubGlobal('React', React))
afterEach(() => { cleanup(); vi.unstubAllGlobals() })

describe('international agenda details', () => {
  it('does not invent an ending or a Dominican location for a calendar entry', () => {
    render(<EventCalendarButtons title="Taller en Madrid" date="2027-03-28T16:00:00Z" />)
    expect(screen.getByText(/no indica la hora final/)).toBeTruthy()
    expect(screen.queryByRole('link', { name: 'Google Calendar' })).toBeNull()
    expect(screen.getByRole('button', { name: /Outlook/ })).toBeTruthy()
    expect(screen.queryByText(/alarmas previas/)).toBeNull()
  })
  it('keeps verified start/end timestamps when creating a calendar link', () => {
    render(<EventCalendarButtons title="Concert" date="2027-03-28T16:00:00Z" endDate="2027-03-28T17:00:00Z" location="Helsinki" />)
    const url = new URL(screen.getByRole('link', { name: 'Google Calendar' }).getAttribute('href')!)
    expect(url.searchParams.get('dates')).toBe('20270328T160000Z/20270328T170000Z')
    expect(url.searchParams.get('location')).toBe('Helsinki')
  })
  it('does not request weather for a fabricated fallback location', () => {
    const fetcher = vi.fn(); vi.stubGlobal('fetch', fetcher)
    const { container } = render(<EventWeatherCard />)
    expect(fetcher).not.toHaveBeenCalled()
    expect(container.textContent).toBe('')
  })
})
