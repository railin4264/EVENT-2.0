// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
vi.mock('@/lib/api/client', () => ({ apiClient: { put: vi.fn() } }))
let store: any, status: any, watch: any, read: any, clear: any
beforeEach(async () => {
  vi.resetModules(); status = { state: 'prompt', onchange: null }; watch = vi.fn(() => 42); read = vi.fn(); clear = vi.fn()
  Object.defineProperty(navigator, 'permissions', { configurable: true, value: { query: vi.fn(async () => status) } })
  Object.defineProperty(navigator, 'geolocation', { configurable: true, value: { watchPosition: watch, getCurrentPosition: read, clearWatch: clear } })
  store = (await import('./useLiveLocation')).useLiveLocationStore
});
afterEach(() => { store.getState().stopWatching(); vi.restoreAllMocks() })
const settle = () => new Promise(resolve => setTimeout(resolve, 0))
it.each(['prompt', 'denied'])('does not request geolocation on mount when permission is %s', async state => {
  status.state = state; store.getState().startWatching(); store.getState().startWatching(); await settle()
  expect(watch).not.toHaveBeenCalled(); expect(read).not.toHaveBeenCalled(); expect(store.getState().isTracking).toBe(false)
});
it('explicit refresh does not trigger another blocked browser prompt', async () => {
  status.state = 'denied'; await store.getState().refreshNow()
  expect(read).not.toHaveBeenCalled(); expect(store.getState().error).toContain('bloqueada')
});
it('uses one watcher for an existing grant and stops immediately on revocation', async () => {
  status.state = 'granted'; store.getState().startWatching(); store.getState().startWatching(); await settle()
  expect(watch).toHaveBeenCalledTimes(1); expect(read).not.toHaveBeenCalled()
  status.state = 'denied'; status.onchange(); expect(clear).toHaveBeenCalledWith(42); expect(store.getState().isTracking).toBe(false)
});
it('only an explicit refresh requests a new permission and preserves denial as a usable state', async () => {
  read.mockImplementation((_success: any, error: any) => error({ code: 1, message: 'Denied' }))
  await store.getState().refreshNow(); expect(read).toHaveBeenCalledTimes(1); expect(store.getState().permissionState).toBe('denied')
});
