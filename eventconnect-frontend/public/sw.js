const CACHE_NAME = 'eventconnect-v6'
const urlsToCache = [
  '/offline.html',
  '/icons/icon.svg',
  '/manifest.json'
]

// Domains/patterns the Service Worker must NEVER intercept
// Keep this list broad — anything external must be here
const PASSTHROUGH_PATTERNS = [
  'localhost:5000',           // Backend API — no caching
  '_next/static/',            // Next.js static chunks
  '_next/webpack-hmr',        // Hot reload
  '_next/data/',              // RSC payloads
  'fonts.googleapis.com',     // Google Fonts CSS
  'fonts.gstatic.com',        // Google Fonts files
  'unpkg.com',                // CDN (Leaflet, etc.)
  'cdnjs.cloudflare.com',     // CDN
  'tile.openstreetmap.org',   // Map tiles — must use network directly
  'openstreetmap.org',        // OpenStreetMap
  'api.mapbox.com',           // Mapbox
  'maps.googleapis.com',      // Google Maps
  'analytics/',               // Analytics endpoints
  '/health',                  // Health checks
  '.hot-update.',             // Webpack HMR
]

// Install service worker and cache resources
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        return Promise.allSettled(
          urlsToCache.map(url =>
            cache.add(url).catch(err => console.warn(`Failed to cache ${url}:`, err))
          )
        )
      })
      .then(() => {
        console.log('Service worker v6 installed')
        return self.skipWaiting()
      })
  )
})

// Activate: clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(
        cacheNames
          .filter(name => name.startsWith('eventconnect-') && name !== CACHE_NAME)
          .map(name => caches.delete(name))
      )
    ).then(() => self.clients.claim())
  )
})

// Fetch: network-first with smart passthrough
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)

  // Always pass through non-GET and cross-origin external resources
  const isPassthrough = PASSTHROUGH_PATTERNS.some(pattern => url.href.includes(pattern))
  
  // Also skip cross-origin requests that aren't explicitly handled
  const isSameOrigin = url.origin === self.location.origin
  const isExternalNonAPI = !isSameOrigin && !url.href.includes('localhost:5000')

  if (isPassthrough || isExternalNonAPI) {
    // Let these go through the browser without any SW interception
    return
  }

  // Never cache personalized HTML or serve the home as a different page.
  if (event.request.destination === 'document') {
    event.respondWith(
      fetch(event.request)
        .catch(async () => (await caches.match('/offline.html')) ||
          new Response('Sin conexión. Vuelve a intentarlo cuando tengas internet.', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } }))
    )
    return
  }

  // API responses and RSC streams can contain private data: network only.
  if (event.request.method !== 'GET' || url.pathname.startsWith('/api/') || event.request.headers.get('RSC') === '1' || url.searchParams.has('_rsc')) return

  // Cache only the explicit offline shell. Route/prefetch requests use the
  // browser network directly; a fetch failure must not become a synthetic 408.
  if (!urlsToCache.includes(url.pathname)) return

  // For the offline shell assets: cache first
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached
      return fetch(event.request).catch(() => {
        // Silently fail for non-critical assets
        return Response.error()
      })
    })
  )
})

// Background sync
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    event.waitUntil(doBackgroundSync())
  }
})

// Push notifications
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {}
  const options = {
    body: data.body || 'Nueva notificación de EventConnect',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    vibrate: [200, 100, 200],
    data: { url: data.url || '/' },
    actions: [
      { action: 'open', title: 'Ver', icon: '/icons/icon-72x72.png' },
      { action: 'close', title: 'Cerrar', icon: '/icons/icon-72x72.png' }
    ]
  }
  event.waitUntil(self.registration.showNotification(data.title || 'EventConnect', options))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = event.notification.data?.url || '/'
  if (event.action !== 'close') {
    event.waitUntil(clients.openWindow(url))
  }
})

async function doBackgroundSync() {
  try {
    console.log('Background sync completed')
  } catch (error) {
    console.error('Background sync failed:', error)
  }
}
