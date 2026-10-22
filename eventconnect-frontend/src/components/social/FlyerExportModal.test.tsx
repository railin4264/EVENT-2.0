// @vitest-environment jsdom
import React from 'react'
import QRCode from 'qrcode'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import FlyerExportModal from './FlyerExportModal'

const feedback = vi.hoisted(() => ({ error: vi.fn(), success: vi.fn() }))
vi.mock('react-hot-toast', () => ({ default: feedback }))

const event = { _id: 'event123', title: 'Concierto de prueba', category: 'Música', date: '2026-10-23T23:00:00Z',
  location: { venue: 'Teatro Nacional' }, price: { amount: 25, currency: 'USD' } }

let fills: { style: unknown; paths: string[] }[]
let rectangles: { style: unknown; values: number[] }[]
let texts: string[]

function contextRecorder() {
  let paths: string[] = []
  const gradient = { addColorStop: vi.fn() }
  const ctx: Record<string, any> = {
    fillStyle: '', strokeStyle: '', font: '', textAlign: '', lineWidth: 0,
    createLinearGradient: () => gradient, createRadialGradient: () => gradient,
    beginPath: () => { paths = [] }, arc: () => paths.push('arc'), roundRect: () => paths.push('roundRect'),
    fill: () => fills.push({ style: ctx.fillStyle, paths: [...paths] }), stroke: vi.fn(), save: vi.fn(), restore: vi.fn(),
    fillRect: (...values: number[]) => rectangles.push({ style: ctx.fillStyle, values }),
    fillText: (value: string) => texts.push(value), measureText: (value: string) => ({ width: value.length * 25 }),
  }
  return ctx
}

beforeEach(() => {
  vi.stubGlobal('React', React)
  vi.clearAllMocks()
  fills = []; rectangles = []; texts = []
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => contextRecorder() as any)
  vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue('data:image/png;base64,test')
})
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals() })

describe('flyer export rendering and actions', () => {
  it('isolates every rounded shape so the white QR background cannot repaint the flyer', () => {
    render(<FlyerExportModal isOpen onClose={vi.fn()} event={event} />)
    expect(fills.filter(fill => fill.paths.includes('roundRect'))).toHaveLength(4)
    expect(fills.filter(fill => fill.paths.includes('roundRect')).every(fill => fill.paths.length === 1)).toBe(true)
    expect(fills.filter(fill => fill.style === '#ffffff')).toEqual([{ style: '#ffffff', paths: ['roundRect'] }])
  })

  it('draws the complete real QR matrix for the exact event URL and prints that origin', () => {
    const eventUrl = `${window.location.origin}/events/event123`
    const matrix = QRCode.create(eventUrl, { errorCorrectionLevel: 'M' }).modules
    const create = vi.spyOn(QRCode, 'create')
    render(<FlyerExportModal isOpen onClose={vi.fn()} event={event} />)
    expect(create).toHaveBeenCalledWith(eventUrl, { errorCorrectionLevel: 'M' })
    const moduleCount = Array.from(matrix.data).filter(Boolean).length
    const drawnModules = rectangles.filter(rect => rect.style === '#0f172a')
    expect(drawnModules).toHaveLength(moduleCount)
    expect(drawnModules.every(rect => rect.values[2] > 0 && rect.values[2] === rect.values[3])).toBe(true)
    expect(texts).toContain(eventUrl)
    expect(texts).toContain('🎟️ ' + new Intl.NumberFormat('es-DO', { style: 'currency', currency: 'USD' }).format(25))
  })

  it('requests download with an attached anchor, removes it and gives an honest browser notice', () => {
    const attached: boolean[] = []
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) { attached.push(this.isConnected) })
    render(<FlyerExportModal isOpen onClose={vi.fn()} event={event} />)
    fireEvent.click(screen.getByRole('button', { name: 'Descargar Imagen HD' }))
    expect(attached).toEqual([true])
    expect(document.querySelector('a[download]')).toBeNull()
    expect(feedback.success).toHaveBeenCalledWith('Descarga solicitada. Revisa las descargas de tu navegador.')
  })

  it('reports export failure without claiming a successful download', () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockImplementation(() => { throw new Error('Canvas blocked') })
    render(<FlyerExportModal isOpen onClose={vi.fn()} event={event} />)
    fireEvent.click(screen.getByRole('button', { name: 'Descargar Imagen HD' }))
    expect(feedback.error).toHaveBeenCalledWith('No se pudo descargar el flyer')
    expect(feedback.success).not.toHaveBeenCalled()
  })

  it('names the dialog and close control and supports Escape', () => {
    const close = vi.fn()
    render(<FlyerExportModal isOpen onClose={close} event={event} />)
    expect(screen.getByRole('dialog', { name: 'Generador de Flyer para Stories' })).toBeTruthy()
    fireEvent.keyDown(document, { key: 'Escape' })
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar generador de flyer' }))
    expect(close).toHaveBeenCalledTimes(2)
  })

  it('does not render canvas or QR while closed', () => {
    const create = vi.spyOn(QRCode, 'create')
    render(<FlyerExportModal isOpen={false} onClose={vi.fn()} event={event} />)
    expect(create).not.toHaveBeenCalled()
    expect(screen.queryByRole('dialog')).toBeNull()
  })
})
