'use client'

import { useState, useRef } from 'react'
import { Sparkles, Download, Share2, X } from 'lucide-react'

interface EventStoryGeneratorModalProps {
  isOpen: boolean
  onClose: () => void
  event: {
    title: string
    date: string | Date
    location?: any
    imageUrl?: string
  }
}

export default function EventStoryGeneratorModal({ isOpen, onClose, event }: EventStoryGeneratorModalProps) {
  const [generating, setGenerating] = useState(false)
  const [generatedImg, setGeneratedImg] = useState<string | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  if (!isOpen) return null

  const handleGenerate = () => {
    setGenerating(true)
    const canvas = document.createElement('canvas')
    canvas.width = 1080
    canvas.height = 1920
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      setGenerating(false)
      return
    }

    const drawBackgroundAndText = (img?: HTMLImageElement) => {
      // Background gradient
      const bgGrad = ctx.createLinearGradient(0, 0, 0, 1920)
      bgGrad.addColorStop(0, '#0f172a')
      bgGrad.addColorStop(0.5, '#1e1b4b')
      bgGrad.addColorStop(1, '#090d16')
      ctx.fillStyle = bgGrad
      ctx.fillRect(0, 0, 1080, 1920)

      // Draw event image if loaded
      if (img && img.naturalWidth) {
        ctx.save()
        ctx.globalAlpha = 0.4
        // Cover aspect ratio
        const scale = Math.max(1080 / img.naturalWidth, 1920 / img.naturalHeight)
        const x = (1080 - img.naturalWidth * scale) / 2
        const y = (1920 - img.naturalHeight * scale) / 2
        ctx.drawImage(img, x, y, img.naturalWidth * scale, img.naturalHeight * scale)
        ctx.restore()
      }

      // Dark overlay gradient over image
      const overlayGrad = ctx.createLinearGradient(0, 500, 0, 1920)
      overlayGrad.addColorStop(0, 'rgba(15, 23, 42, 0.4)')
      overlayGrad.addColorStop(0.4, 'rgba(15, 23, 42, 0.85)')
      overlayGrad.addColorStop(1, 'rgba(10, 10, 15, 0.98)')
      ctx.fillStyle = overlayGrad
      ctx.fillRect(0, 0, 1080, 1920)

      // Top badge
      ctx.fillStyle = '#ec4899'
      ctx.beginPath()
      ctx.roundRect(140, 180, 800, 90, 45)
      ctx.fill()

      ctx.fillStyle = '#ffffff'
      ctx.font = 'bold 38px system-ui, -apple-system, sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('🇩🇴 ¡VOY PA’ ALLÁ CON MI CORO!', 540, 238)

      // Event Title
      ctx.fillStyle = '#ffffff'
      ctx.font = '800 68px system-ui, -apple-system, sans-serif'
      ctx.textAlign = 'left'

      // Wrap text helper
      const wrapText = (text: string, x: number, y: number, maxWidth: number, lineHeight: number) => {
        const words = text.split(' ')
        let line = ''
        let currentY = y
        for (let n = 0; n < words.length; n++) {
          const testLine = line + words[n] + ' '
          const metrics = ctx.measureText(testLine)
          if (metrics.width > maxWidth && n > 0) {
            ctx.fillText(line, x, currentY)
            line = words[n] + ' '
            currentY += lineHeight
          } else {
            line = testLine
          }
        }
        ctx.fillText(line, x, currentY)
        return currentY
      }

      const lastTitleY = wrapText(event.title, 100, 1050, 880, 80)

      // Date & Venue Card
      const cardY = Math.max(lastTitleY + 60, 1320)
      ctx.fillStyle = 'rgba(255, 255, 255, 0.08)'
      ctx.beginPath()
      ctx.roundRect(100, cardY, 880, 260, 32)
      ctx.fill()
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)'
      ctx.lineWidth = 3
      ctx.stroke()

      const d = new Date(event.date)
      const dateText = Number.isFinite(d.getTime())
        ? d.toLocaleDateString('es-DO', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })
        : 'Fecha por confirmar'
      const locText = typeof event.location === 'string'
        ? event.location
        : event.location?.address || event.location?.name || 'Santo Domingo, República Dominicana'

      ctx.fillStyle = '#38bdf8'
      ctx.font = 'bold 36px system-ui, -apple-system, sans-serif'
      ctx.fillText('📅 ' + dateText.toUpperCase(), 140, cardY + 90)

      ctx.fillStyle = '#e2e8f0'
      ctx.font = '500 34px system-ui, -apple-system, sans-serif'
      wrapText('📍 ' + locText, 140, cardY + 170, 800, 45)

      // EventNow Footer Watermark & Viral QR text
      ctx.fillStyle = '#ffffff'
      ctx.font = 'bold 44px system-ui, -apple-system, sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('EventNow 2.0 · Descubre el próximo coro en RD', 540, 1750)

      ctx.fillStyle = '#94a3b8'
      ctx.font = '32px system-ui, -apple-system, sans-serif'
      ctx.fillText('Búscalo en www.eventnow.do o descárgalo en tu móvil', 540, 1810)

      const url = canvas.toDataURL('image/png')
      setGeneratedImg(url)
      setGenerating(false)
    }

    if (event.imageUrl) {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.onload = () => drawBackgroundAndText(img)
      img.onerror = () => drawBackgroundAndText()
      img.src = event.imageUrl
    } else {
      drawBackgroundAndText()
    }
  }

  const handleDownload = () => {
    if (!generatedImg) return
    const a = document.createElement('a')
    a.href = generatedImg
    a.download = `Story_EventNow_${event.title.slice(0, 20).replace(/\s+/g, '_')}.png`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-md rounded-3xl border border-white/10 bg-slate-900 p-6 shadow-2xl text-white">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full p-2 text-gray-400 hover:bg-white/10 hover:text-white"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="h-5 w-5 text-fuchsia-400" />
          <h3 className="text-base font-bold text-white">
            Generador de Story (Instagram & WhatsApp)
          </h3>
        </div>

        <p className="text-xs text-gray-300 mb-4">
          Crea un arte vertical 1080x1920 con tu asistencia para subirlo a tus estados y armar el coro con tus amigos.
        </p>

        {generatedImg ? (
          <div className="flex flex-col items-center">
            <div className="relative max-h-[360px] w-auto overflow-hidden rounded-2xl border border-white/20 shadow-lg mb-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={generatedImg} alt="Story preview" className="h-[360px] w-auto object-contain" />
            </div>

            <div className="flex w-full gap-2">
              <button
                type="button"
                onClick={handleDownload}
                className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-pink-500 to-rose-600 px-4 py-3 text-xs font-bold text-white shadow-lg shadow-pink-500/25 hover:brightness-110 active:scale-95"
              >
                <Download className="h-4 w-4" />
                <span>Descargar Imagen</span>
              </button>
              <button
                type="button"
                onClick={() => setGeneratedImg(null)}
                className="rounded-xl border border-white/10 px-4 py-3 text-xs font-semibold hover:bg-white/5 text-gray-300"
              >
                Rehacer
              </button>
            </div>
          </div>
        ) : (
          <div className="text-center py-6">
            <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-tr from-fuchsia-600 to-pink-500 text-white shadow-xl shadow-fuchsia-500/20">
              <Share2 className="h-10 w-10" />
            </div>
            <p className="text-sm font-semibold text-gray-200 mb-6">
              ¿Listo para presumir que vas pa’ {event.title}?
            </p>
            <button
              type="button"
              disabled={generating}
              onClick={handleGenerate}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-pink-500 to-fuchsia-600 px-5 py-3.5 text-sm font-bold text-white shadow-lg shadow-pink-500/30 hover:brightness-110 active:scale-95 disabled:opacity-50"
            >
              <Sparkles className="h-4 w-4" />
              <span>{generating ? 'Generando arte en alta resolución...' : 'Crear mi Story ahora'}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
