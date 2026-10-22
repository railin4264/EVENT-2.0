// @vitest-environment jsdom
import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { FeaturedBanner } from './FeaturedBanner'

const query = vi.hoisted(() => ({ data: [] as Array<Record<string, unknown>>, isLoading: false }))
vi.mock('@tanstack/react-query', () => ({ useQuery: () => query }))
vi.mock('@/hooks/usePublicConfig', () => ({ usePublicConfig: () => ({ paymentsEnabled: false }) }))
vi.mock('@/lib/api/discovery', () => ({ discoveryApi: {} }))
vi.mock('next/link', () => ({ default: ({ children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => <a {...props}>{children}</a> }))

const event = (id: string) => ({ _id: id, title: `Plan ${id}`, category: 'music', date: '2026-12-10T20:00:00Z', images: [], price: { amount: 0 }, location: { address: 'Santo Domingo' } })

describe('FeaturedBanner navigation', () => {
  beforeEach(() => {
    vi.stubGlobal('React', React)
    Object.defineProperty(window, 'matchMedia', { configurable: true, value: () => ({ matches: true }) })
    query.data = [event('one'), event('two'), event('three')]
    query.isLoading = false
  })
  afterEach(() => { cleanup(); vi.unstubAllGlobals() })

  it('keeps rendering a valid event when a refetch removes the selected slide', () => {
    const { rerender } = render(<FeaturedBanner />)
    fireEvent.click(screen.getByRole('tab', { name: 'Plan 3: Plan three' }))
    expect(screen.getByRole('link', { name: /Descubrir plan/ }).getAttribute('href')).toBe('/events/three')
    query.data = [event('replacement')]
    expect(() => rerender(<FeaturedBanner />)).not.toThrow()
    expect(screen.getByRole('link', { name: /Descubrir plan/ }).getAttribute('href')).toBe('/events/replacement')
  })

  it('handles an empty result after navigation without leaving a broken link', () => {
    const { rerender, container } = render(<FeaturedBanner />)
    fireEvent.click(screen.getByRole('button', { name: 'Siguiente plan' }))
    query.data = []
    rerender(<FeaturedBanner />)
    expect(container.textContent).toBe('')
  })
})
