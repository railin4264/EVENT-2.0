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
