// @vitest-environment jsdom
import { beforeEach, afterEach, expect, it, vi } from 'vitest'
import { geolocationNotifications } from './geolocation-notifications'
vi.mock('./api/services/events.service', () => ({ eventsService: { getNearbyEvents: vi.fn() } }))
vi.mock('./api/services/notifications.service', () => ({ notificationsService: {} }))
beforeEach(() => { Object.defineProperty(navigator, 'geolocation', { configurable: true, value: { watchPosition: vi.fn(), clearWatch: vi.fn() } }) })
afterEach(() => { geolocationNotifications.stopWatching(); vi.unstubAllGlobals(); vi.restoreAllMocks() })
it.each(['default', 'denied'])('never requests notification permission in background: %s', async permission => {
  const request = vi.fn(); vi.stubGlobal('Notification', { permission, requestPermission: request })
  expect(await geolocationNotifications.initialize({ enabled: true })).toBe(false); expect(request).not.toHaveBeenCalled()
});
it('does not start GPS while the browser permission is blocked', async () => {
  vi.stubGlobal('Notification', { permission: 'granted' }); const watch = vi.fn()
  Object.defineProperty(navigator, 'geolocation', { configurable: true, value: { watchPosition: watch } })
  Object.defineProperty(navigator, 'permissions', { configurable: true, value: { query: vi.fn(async () => ({ state: 'denied' })) } })
  expect(await geolocationNotifications.initialize({ enabled: true })).toBe(false); expect(watch).not.toHaveBeenCalled()
});
