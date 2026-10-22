// @vitest-environment jsdom
import React from 'react'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AREA_STORAGE_KEY, WORLD_AREA, type DiscoveryArea } from '@/lib/discovery-area'
import { useDiscoveryAreaStore } from '@/stores/discoveryAreaStore'
import { LocationPicker } from './LocationPicker'

const api = vi.hoisted(() => ({ get: vi.fn() }))
vi.mock('@/lib/api/client', () => ({ apiClient: api }))
const country: DiscoveryArea = { kind: 'country', label: 'México', country: 'México', countryCode: 'MX', lat: 23, lng: -102 }
const city: DiscoveryArea = { kind: 'city', label: 'Santiago, Chile', city: 'Santiago', country: 'Chile', countryCode: 'CL', lat: -33.448, lng: -70.669 }
let gps: ReturnType<typeof vi.fn>
const search = (query: string) => {
  fireEvent.change(screen.getByRole('searchbox', { name: 'Elige ciudad o país' }), { target: { value: query } })
  fireEvent.click(screen.getByRole('button', { name: 'Buscar' }))
}
const deferred = () => {
  let resolve!: (value: unknown) => void
  const promise = new Promise(resolvePromise => { resolve = resolvePromise })
  return { promise, resolve }
}

describe('LocationPicker intentional location changes', () => {
  beforeEach(() => {
    vi.stubGlobal('React', React)
    vi.clearAllMocks()
    const values = new Map<string, string>()
    vi.stubGlobal('localStorage', { getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => { values.set(key, value) }, clear: () => values.clear() })
    useDiscoveryAreaStore.setState({ area: WORLD_AREA, initialized: false })
    gps = vi.fn()
    Object.defineProperty(navigator, 'geolocation', { configurable: true, value: { getCurrentPosition: gps } })
    api.get.mockResolvedValue({ data: { data: [] } })
  })
  afterEach(() => { cleanup(); localStorage.clear(); vi.unstubAllGlobals() })

  it('starts worldwide and never requests GPS or destinations automatically', () => {
    render(<LocationPicker />)
    expect(screen.getByRole('button', { name: 'Mundial' }).getAttribute('aria-pressed')).toBe('true')
    expect(useDiscoveryAreaStore.getState().area).toEqual(WORLD_AREA)
    expect(gps).not.toHaveBeenCalled()
    expect(api.get).not.toHaveBeenCalled()
  })

  it.each([country, city])('lets a guest choose a manual $kind from real results and persists that selection', async selection => {
    api.get.mockResolvedValueOnce({ data: { data: [{ ...selection, eventsCount: 4 }] } })
    render(<LocationPicker />)
    search(selection.label)
    fireEvent.click(await screen.findByRole('button', { name: new RegExp(`${selection.label}.*4 eventos`) }))
    expect(useDiscoveryAreaStore.getState().area).toMatchObject(selection)
    expect(JSON.parse(localStorage.getItem(AREA_STORAGE_KEY)!)).toMatchObject(selection)
    expect(gps).not.toHaveBeenCalled()
    expect(api.get).toHaveBeenCalledWith('/events/destinations', expect.objectContaining({ params: { q: selection.label } }))
  })

  it('asks for GPS only after a click and leaves no coordinates in persistent storage', () => {
    render(<LocationPicker />)
    fireEvent.click(screen.getByRole('button', { name: 'Usar mi ubicación' }))
    expect(gps).toHaveBeenCalledOnce()
    act(() => gps.mock.calls[0][0]({ coords: { latitude: 0, longitude: 0 } }))
    expect(useDiscoveryAreaStore.getState().area).toEqual({ kind: 'nearby', source: 'gps', label: 'Cerca de ti · 50 km', lat: 0, lng: 0, radius: 50 })
    expect(JSON.parse(localStorage.getItem(AREA_STORAGE_KEY)!)).toEqual(WORLD_AREA)
  })

  it('keeps the previous manual area after permission is denied', () => {
    useDiscoveryAreaStore.getState().setArea(city)
    render(<LocationPicker />)
    fireEvent.click(screen.getByRole('button', { name: 'Usar mi ubicación' }))
    act(() => gps.mock.calls[0][1]({ code: 1, message: 'Permission denied' }))
    expect(screen.getByRole('alert').textContent).toContain('No pudimos acceder')
    expect(useDiscoveryAreaStore.getState().area).toEqual(city)
    expect(JSON.parse(localStorage.getItem(AREA_STORAGE_KEY)!)).toEqual(city)
    expect((screen.getByRole('button', { name: 'Usar mi ubicación' }) as HTMLButtonElement).disabled).toBe(false)
  })

  it('ignores a GPS callback when Mundial was selected while locating', () => {
    render(<LocationPicker />)
    fireEvent.click(screen.getByRole('button', { name: 'Usar mi ubicación' }))
    fireEvent.click(screen.getByRole('button', { name: 'Mundial' }))
    act(() => gps.mock.calls[0][0]({ coords: { latitude: 18.48, longitude: -69.93 } }))
    expect(useDiscoveryAreaStore.getState().area).toEqual(WORLD_AREA)
  })

  it('aborts and ignores a search response after Mundial is selected', async () => {
    const result = deferred()
    api.get.mockReturnValueOnce(result.promise)
    render(<LocationPicker />)
    search('México')
    const signal = api.get.mock.calls[0][1].signal as AbortSignal
    fireEvent.click(screen.getByRole('button', { name: 'Mundial' }))
    expect(signal.aborted).toBe(true)
    await act(async () => result.resolve({ data: { data: [country] } }))
    expect(screen.queryByText('Selecciona un destino')).toBeNull()
    expect(useDiscoveryAreaStore.getState().area).toEqual(WORLD_AREA)
  })

  it('ignores results for a query that the user changed before its request completed', async () => {
    const result = deferred()
    api.get.mockReturnValueOnce(result.promise)
    render(<LocationPicker />)
    search('México')
    const signal = api.get.mock.calls[0][1].signal as AbortSignal
    fireEvent.change(screen.getByRole('searchbox', { name: 'Elige ciudad o país' }), { target: { value: 'Santiago' } })
    await act(async () => result.resolve({ data: { data: [country] } }))
    expect(signal.aborted).toBe(true)
    expect(screen.queryByText('Selecciona un destino')).toBeNull()
    expect(useDiscoveryAreaStore.getState().area).toEqual(WORLD_AREA)
  })

  it('preserves an existing area on a search failure and allows retry', async () => {
    useDiscoveryAreaStore.getState().setArea(country)
    api.get.mockRejectedValueOnce(new Error('Offline'))
    render(<LocationPicker />)
    search('Santiago')
    expect((await screen.findByRole('alert')).textContent).toContain('No pudimos cargar')
    expect(useDiscoveryAreaStore.getState().area).toEqual(country)
    await waitFor(() => expect((screen.getByRole('button', { name: 'Buscar' }) as HTMLButtonElement).disabled).toBe(false))
  })

  it('does not let an older request replace a newer search result', async () => {
    const older = deferred(), newer = deferred()
    api.get.mockReturnValueOnce(older.promise).mockReturnValueOnce(newer.promise)
    render(<LocationPicker />)
    search('México')
    search('Santiago')
    expect(api.get).toHaveBeenCalledTimes(2)
    await act(async () => newer.resolve({ data: { data: [city] } }))
    expect(screen.getByRole('button', { name: /Santiago, Chile.*Ciudad/ })).toBeTruthy()
    await act(async () => older.resolve({ data: { data: [country] } }))
    expect(screen.queryByRole('button', { name: /México.*País/ })).toBeNull()
    expect(screen.getByRole('button', { name: /Santiago, Chile.*Ciudad/ })).toBeTruthy()
  })

  it('aborts pending requests on unmount without applying late results', async () => {
    const pending = deferred()
    api.get.mockReturnValueOnce(pending.promise)
    const { unmount } = render(<LocationPicker />)
    search('México')
    const signal = api.get.mock.calls[0][1].signal as AbortSignal
    unmount()
    expect(signal.aborted).toBe(true)
    await act(async () => pending.resolve({ data: { data: [country] } }))
    expect(useDiscoveryAreaStore.getState().area).toEqual(WORLD_AREA)
  })
})
