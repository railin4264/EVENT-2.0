import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { safeRedirect } from '@/lib/auth/redirect'

// Routes that require authentication
const protectedRoutes = [
  '/onboarding',
  '/dashboard',
  '/profile',
  '/events/create',
  '/messages',
  '/settings',
  '/tribes/create',
  '/admin',
  '/notifications',
  '/checkout',
  '/tickets',
]

// Routes that redirect authenticated users (login, register)
const authRoutes = [
  '/login',
  '/register',
]

// Rate limiting map (simple in-memory store - in production use Redis)
const rateLimitMap = new Map()

// Rate limiting function
function rateLimit(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for') ||
           request.headers.get('x-real-ip') ||
           'anonymous'

  // Never rate-limit localhost (dev/test)
  if (ip === 'anonymous' || ip.startsWith('127.') || ip === '::1') return false

  const now = Date.now()
  const windowMs = 15 * 60 * 1000 // 15 minutes
  const maxRequests = 2000 // generous limit

  if (!rateLimitMap.has(ip)) {
    rateLimitMap.set(ip, { requests: 1, resetTime: now + windowMs })
    return false
  }

  const userRate = rateLimitMap.get(ip)
  
  if (now > userRate.resetTime) {
    rateLimitMap.set(ip, { requests: 1, resetTime: now + windowMs })
    return false
  }

  if (userRate.requests >= maxRequests) {
    return true // Rate limited
  }

  userRate.requests++
  return false
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // DISABLED: Redirect was causing infinite reload loop
  // The app uses a SPA approach on the root page

  // Apply rate limiting
  if (rateLimit(request)) {
    return new NextResponse('Too Many Requests', {
      status: 429,
      headers: {
        'Retry-After': '900' // 15 minutes
      }
    })
  }

  const token = request.cookies.get('auth-token')?.value ||
                request.headers.get('authorization')?.replace('Bearer ', '')

  // Token must exist AND have meaningful content (not empty, not just whitespace)
  const isAuthenticated = !!token && token.trim().length > 0

  // Create response with security headers
  const response = NextResponse.next()
  
  // Security headers
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-XSS-Protection', '1; mode=block')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  // QR check-in requests the camera only after an explicit user action.
  response.headers.set('Permissions-Policy', 'camera=(self), microphone=(), geolocation=(self)')
  
  // CSP header for enhanced security - more permissive in development
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'
  const isDev = process.env.NODE_ENV === 'development'

  const cspHeader = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdnjs.cloudflare.com https://unpkg.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://unpkg.com",
    "img-src 'self' data: https: http://localhost:5000 http://localhost:3000 blob:",
    "font-src 'self' https://fonts.gstatic.com https://fonts.googleapis.com",
    isDev
      ? `connect-src 'self' https: http: ws: wss: data: blob:` // More permissive in dev
      : `connect-src 'self' https://api.open-meteo.com https://api.mapbox.com https://maps.googleapis.com https://fonts.googleapis.com https://fonts.gstatic.com https://unpkg.com https://nominatim.openstreetmap.org https://*.tile.openstreetmap.org https://tile.openstreetmap.org ws://localhost:* wss://localhost:* http://localhost:* ${apiUrl}`,
    "media-src 'self' https: http://localhost:5000 http://localhost:3000",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    // Note: upgrade-insecure-requests removed — breaks http://localhost navigation
  ].filter(Boolean).join('; ')
  
  response.headers.set('Content-Security-Policy', cspHeader)

  // Redirect authenticated users away from auth pages
  if (authRoutes.includes(pathname) && isAuthenticated) {
    // Check if there's a redirect parameter in the URL
    const redirectParam = request.nextUrl.searchParams.get('redirect')

    // If there's a valid redirect parameter, use it; otherwise go to /events
    const redirectUrl = safeRedirect(redirectParam)

    return NextResponse.redirect(new URL(redirectUrl, request.url))
  }

  // Redirect unauthenticated users to login for protected routes
  if ((protectedRoutes.some(route => pathname === route || pathname.startsWith(`${route}/`)) || /^\/events\/[^/]+\/(edit|check-in)$/.test(pathname)) && !isAuthenticated) {
    const url = new URL('/login', request.url)
    url.searchParams.set('redirect', pathname + request.nextUrl.search)
    return NextResponse.redirect(url)
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!api|_next/static|_next/image|favicon.ico|public/).*)',
  ],
}
