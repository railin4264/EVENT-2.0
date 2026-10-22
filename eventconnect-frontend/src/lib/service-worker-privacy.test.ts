import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import { describe, expect, it, vi } from 'vitest'

function worker() {
  const handlers = new Map<string, (event: any) => void>()
  const cache = { put: vi.fn(), match: vi.fn(), add: vi.fn() }
  const caches = { open: vi.fn().mockResolvedValue(cache), match: vi.fn().mockResolvedValue(new Response('Offline page', { status: 503 })) }
  const fetch = vi.fn().mockResolvedValue(new Response('Private page'))
  const self = { location: { origin: 'https://eventnow.test' }, addEventListener: (name: string, handler: (event: any) => void) => handlers.set(name, handler) }
  vm.runInNewContext(readFileSync(new URL('../../public/sw.js', import.meta.url), 'utf8'), { self, caches, fetch, URL, Response, console })
  return { handle: handlers.get('fetch')!, caches, cache, fetch }
}

describe('service worker privacy and offline recovery', () => {
  it('never stores personalized navigation HTML', async () => {
    const sw = worker()
    const respondWith = vi.fn()
    sw.handle({ request: { url: 'https://eventnow.test/profile', destination: 'document' }, respondWith })
    expect((await respondWith.mock.calls[0][0]).status).toBe(200)
    expect(sw.caches.open).not.toHaveBeenCalled()
    expect(sw.cache.put).not.toHaveBeenCalled()
  })

  it('shows an explicit offline page instead of substituting the home for another route', async () => {
    const sw = worker()
    sw.fetch.mockRejectedValue(new Error('Offline'))
    const respondWith = vi.fn()
    sw.handle({ request: { url: 'https://eventnow.test/events/123', destination: 'document' }, respondWith })
    await respondWith.mock.calls[0][0]
    expect(sw.caches.match).toHaveBeenCalledTimes(1)
    expect(sw.caches.match).toHaveBeenCalledWith('/offline.html')
  })

  it('lets API responses and React server component streams bypass caches', () => {
    const sw = worker()
    for (const [path, rsc] of [['/api/private-data', false], ['/profile', true]] as const) {
      const respondWith = vi.fn()
      sw.handle({ request: { url: `https://eventnow.test${path}`, method: 'GET', headers: new Headers(rsc ? { RSC: '1' } : {}) }, respondWith })
      expect(respondWith).not.toHaveBeenCalled()
    }
    expect(sw.caches.open).not.toHaveBeenCalled()
  })
  it('does not intercept route prefetches or synthesize a 408 response', () => {
    const sw = worker()
    for (const path of ['/users/aaaaaaaaaaaaaaaaaaaaaaaa?_rsc=test', '/users/aaaaaaaaaaaaaaaaaaaaaaaa', '/suppliers']) {
      const respondWith = vi.fn()
      sw.handle({ request: { url: `https://eventnow.test${path}`, method: 'GET', destination: '', headers: new Headers() }, respondWith })
      expect(respondWith).not.toHaveBeenCalled()
    }
    expect(sw.fetch).not.toHaveBeenCalled()
  })

})
