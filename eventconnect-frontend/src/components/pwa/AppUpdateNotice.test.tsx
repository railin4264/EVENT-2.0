// @vitest-environment jsdom
import React from 'react'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
const worker = vi.hoisted(() => ({ updateServiceWorker: vi.fn(), swUpdateAvailable: false }))
vi.mock('@/hooks/usePWA', () => ({ useServiceWorker: () => worker }))
import AppUpdateNotice from './AppUpdateNotice'
beforeEach(() => { vi.stubGlobal('React', React); vi.stubEnv('NEXT_PUBLIC_APP_BUILD_ID', 'current'); worker.updateServiceWorker.mockClear(); worker.swUpdateAvailable = false; vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ buildId: 'next' }) })) })
afterEach(() => { cleanup(); vi.unstubAllEnvs(); vi.unstubAllGlobals() })
it('warns about a newer release but waits for the user before reloading', async () => {
  render(<AppUpdateNotice />)
  await waitFor(() => expect(screen.getByText('Hay una versión nueva de EventNow')).toBeTruthy())
  expect(worker.updateServiceWorker).not.toHaveBeenCalled(); fireEvent.click(screen.getByText('Actualizar ahora')); expect(worker.updateServiceWorker).toHaveBeenCalledOnce()
})
it('does not show an update for the current release', async () => {
  vi.mocked(fetch).mockResolvedValue({ ok: true, json: async () => ({ buildId: 'current' }) } as Response)
  await act(async () => { render(<AppUpdateNotice />) }); expect(screen.queryByText('Actualizar ahora')).toBeNull()
})
it('a temporary API outage does not force reload or discard work', async () => {
  vi.mocked(fetch).mockRejectedValue(new Error('offline')); await act(async () => { render(<AppUpdateNotice />) }); expect(screen.queryByText('Actualizar ahora')).toBeNull(); expect(worker.updateServiceWorker).not.toHaveBeenCalled()
})
