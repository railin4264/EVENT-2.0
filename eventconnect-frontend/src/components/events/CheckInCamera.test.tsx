// @vitest-environment jsdom
import React from 'react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { CheckInCamera } from './CheckInCamera'

const mocks = vi.hoisted(() => ({ getUserMedia: vi.fn(), decode: vi.fn(), stop: vi.fn() }))
vi.mock('jsqr', () => ({ default: mocks.decode }))
const media = { getTracks: () => [{ stop: mocks.stop }] } as unknown as MediaStream
beforeEach(() => {
  vi.stubGlobal('React', React)
  Object.defineProperty(window, 'isSecureContext', { configurable: true, value: true })
  Object.defineProperty(document, 'hidden', { configurable: true, value: false })
  Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: { getUserMedia: mocks.getUserMedia } })
  mocks.getUserMedia.mockResolvedValue(media)
  vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue()
})
afterEach(() => { cleanup(); vi.clearAllMocks(); vi.restoreAllMocks(); vi.unstubAllGlobals() })

it('never requests camera access on mount', () => {
  render(<CheckInCamera disabled={false} onCode={vi.fn()} onStart={vi.fn()} />)
  expect(mocks.getUserMedia).not.toHaveBeenCalled()
})
it('requires a secure context before asking permission', async () => {
  Object.defineProperty(window, 'isSecureContext', { configurable: true, value: false })
  render(<CheckInCamera disabled={false} onCode={vi.fn()} onStart={vi.fn()} />)
  fireEvent.click(screen.getByRole('button'))
  await screen.findByText(/necesita HTTPS/)
  expect(mocks.getUserMedia).not.toHaveBeenCalled()
})
it('releases a stream arriving after unmount without scanning', async () => {
  let resolve!: (value: MediaStream) => void
  mocks.getUserMedia.mockImplementation(() => new Promise(done => { resolve = done }))
  const onCode = vi.fn()
  const { unmount } = render(<CheckInCamera disabled={false} onCode={onCode} onStart={vi.fn()} />)
  fireEvent.click(screen.getByRole('button'))
  await waitFor(() => expect(mocks.getUserMedia).toHaveBeenCalledOnce())
  unmount(); resolve(media)
  await waitFor(() => expect(mocks.stop).toHaveBeenCalledOnce())
  expect(onCode).not.toHaveBeenCalled()
})
it('releases a stream arriving after the tab becomes hidden', async () => {
  let resolve!: (value: MediaStream) => void
  mocks.getUserMedia.mockImplementation(() => new Promise(done => { resolve = done }))
  render(<CheckInCamera disabled={false} onCode={vi.fn()} onStart={vi.fn()} />)
  fireEvent.click(screen.getByRole('button'))
  await waitFor(() => expect(mocks.getUserMedia).toHaveBeenCalledOnce())
  Object.defineProperty(document, 'hidden', { configurable: true, value: true })
  fireEvent(document, new Event('visibilitychange')); resolve(media)
  await waitFor(() => expect(mocks.stop).toHaveBeenCalledOnce())
  expect(screen.getByRole('button').textContent).toBe('Activar cámara')
})
it('provides a readable fallback when permission is denied', async () => {
  mocks.getUserMedia.mockRejectedValue(new DOMException('denied', 'NotAllowedError'))
  render(<CheckInCamera disabled={false} onCode={vi.fn()} onStart={vi.fn()} />)
  fireEvent.click(screen.getByRole('button'))
  await screen.findByText(/No se permitió usar la cámara/)
  expect(screen.getByRole('button').textContent).toBe('Activar cámara')
})

function cameraFrames() {
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({ drawImage: vi.fn(), getImageData: () => ({ data: new Uint8ClampedArray(4), width: 1, height: 1 }) } as unknown as CanvasRenderingContext2D)
  Object.defineProperty(HTMLVideoElement.prototype, 'readyState', { configurable: true, get: () => 4 })
  Object.defineProperty(HTMLVideoElement.prototype, 'videoWidth', { configurable: true, get: () => 640 })
  Object.defineProperty(HTMLVideoElement.prototype, 'videoHeight', { configurable: true, get: () => 480 })
}

it('decodes a valid QR once and stops every camera track before submitting', async () => {
  cameraFrames()
  const code = `EC:${'a'.repeat(24)}:${'b'.repeat(24)}:${'c'.repeat(64)}`
  mocks.decode.mockReturnValue({ data: code })
  const onCode = vi.fn(() => { expect(mocks.stop).toHaveBeenCalledOnce() })
  render(<CheckInCamera disabled={false} onCode={onCode} onStart={vi.fn()} />)
  fireEvent.click(screen.getByRole('button'))
  await waitFor(() => expect(onCode).toHaveBeenCalledWith(code))
  expect(onCode).toHaveBeenCalledOnce()
  expect(screen.getByRole('button').textContent).toBe('Activar cámara')
})

it('keeps arbitrary QR links out of the admission API and stops on background', async () => {
  cameraFrames()
  mocks.decode.mockReturnValue({ data: 'https://unrelated.test' })
  const onCode = vi.fn()
  render(<CheckInCamera disabled={false} onCode={onCode} onStart={vi.fn()} />)
  fireEvent.click(screen.getByRole('button'))
  await screen.findByText(/Este QR no es una entrada/)
  expect(onCode).not.toHaveBeenCalled()
  Object.defineProperty(document, 'hidden', { configurable: true, value: true })
  fireEvent(document, new Event('visibilitychange'))
  expect(mocks.stop).toHaveBeenCalledOnce()
  expect(screen.getByRole('button').textContent).toBe('Activar cámara')
})
