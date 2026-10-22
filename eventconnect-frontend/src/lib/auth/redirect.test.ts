import { expect, it } from 'vitest'
import { authPageHref, publicExploreHref, safeRedirect } from './redirect'

it('keeps local destinations and rejects external redirects', () => {
  expect(safeRedirect('/events/create')).toBe('/events/create')
  for (const target of ['//evil.example', 'https://evil.example', '/\\evil.example']) {
    expect(safeRedirect(target)).not.toBe(target)
  }
})

it('preserves the event and checkout query when switching login and registration', () => {
  const destination = '/events/123?ticket=vip#tickets'
  const registration = new URL(authPageHref('/register', destination), 'https://eventnow.local')
  expect(registration.pathname).toBe('/register')
  expect(registration.searchParams.get('redirect')).toBe(destination)
  const login = new URL(authPageHref('/login', registration.searchParams.get('redirect')), 'https://eventnow.local')
  expect(safeRedirect(login.searchParams.get('redirect'))).toBe(destination)
})

it('rejects login loops and external destinations on both authentication screens', () => {
  for (const destination of ['/login?redirect=/events', '/register/', '//evil.example', '/\\evil.example', 'https://evil.example']) {
    const link = new URL(authPageHref('/register', destination), 'https://eventnow.local')
    expect(link.searchParams.get('redirect')).toBe('/events')
  }
})

it('keeps only public exploration destinations without changing authenticated return URLs', () => {
  for (const destination of ['/onboarding?redirect=%2Fevents', '/checkout/123', '/events/create', '/events/123/edit', '/events/123/check-in', '/settings', '/profile']) {
    expect(publicExploreHref(destination)).toBe('/events')
    expect(safeRedirect(destination)).toBe(destination)
  }
  for (const destination of ['/', '/events?category=music&view=map', '/events/123?ticket=vip#tickets', '/discovery?countryCode=ES']) {
    expect(publicExploreHref(destination)).toBe(destination)
  }
  expect(publicExploreHref('//evil.example')).toBe('/events')
})
