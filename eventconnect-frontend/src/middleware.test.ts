import { expect, it } from 'vitest'
import { NextRequest } from 'next/server'
import { middleware } from './middleware'

it('permits same-origin QR camera requests while excluding third-party frames and microphone', () => {
  const request = new NextRequest('http://localhost:3001/events/aaaaaaaaaaaaaaaaaaaaaaaa/check-in', {
    headers: { authorization: 'Bearer example-session' },
  })
  const response = middleware(request)
  expect(response.headers.get('Permissions-Policy')).toBe('camera=(self), microphone=(), geolocation=(self)')
  expect(response.headers.get('X-Frame-Options')).toBe('DENY')
})

it('keeps browsing public and check-in protected for guests', () => {
  const publicResponse = middleware(new NextRequest('http://localhost:3001/planning-tools'))
  expect(publicResponse.headers.get('location')).toBeNull()
  const privateResponse = middleware(new NextRequest('http://localhost:3001/events/aaaaaaaaaaaaaaaaaaaaaaaa/check-in'))
  const destination = new URL(privateResponse.headers.get('location')!)
  expect(destination.pathname).toBe('/login')
  expect(destination.searchParams.get('redirect')).toBe('/events/aaaaaaaaaaaaaaaaaaaaaaaa/check-in')
})

it('production CSP allows no third-party script hosts, eval or localhost', () => {
  const env = process.env as Record<string, string | undefined>
  const previous = { node: env.NODE_ENV, api: env.NEXT_PUBLIC_API_URL }
  env.NODE_ENV = 'production'; env.NEXT_PUBLIC_API_URL = 'https://api.eventnow.example/api'
  try {
    const csp = middleware(new NextRequest('https://eventnow.example/discovery')).headers.get('Content-Security-Policy') || ''
    const script = csp.split('; ').find(part => part.startsWith('script-src')) || ''
    expect(script).toBe("script-src 'self' 'unsafe-inline'")
    expect(csp).not.toMatch(/unpkg|cdnjs|localhost/)
    expect(csp).toContain('https://api.eventnow.example wss://api.eventnow.example')
  } finally { env.NODE_ENV = previous.node; env.NEXT_PUBLIC_API_URL = previous.api }
})
