'use client'

import { useState, useRef, useEffect, useId } from 'react'
import QRCode from 'qrcode'
import { X, Download, Share2, Sparkles, Check, Flame, MapPin, Calendar, QrCode } from 'lucide-react'
import toast from 'react-hot-toast'
import type { EventExportData } from '@/components/events/event-detail-utils'

interface FlyerExportModalProps {
  isOpen: boolean
  onClose: () => void
  event: EventExportData | null
}

export default function FlyerExportModal({ isOpen, onClose, event }: FlyerExportModalProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [format, setFormat] = useState<'story' | 'square'>('story') // story = 9:16, square = 1:1
  const [downloading, setDownloading] = useState(false)
  const [isReady, setIsReady] = useState(false)
  const [renderError, setRenderError] = useState(false)
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const titleId = useId()

  const eventTitle = event?.title || 'Gran Evento en RD'
  const eventCategory = event?.category || 'General'
  const eventDate = new Date(event?.date || '')
  const dateLabel = Number.isNaN(eventDate.getTime()) ? 'Fecha por confirmar' : eventDate.toLocaleDateString('es-DO', { weekday: 'long', day: 'numeric', month: 'long' })
  const timeLabel = Number.isNaN(eventDate.getTime()) ? '' : eventDate.toLocaleTimeString('es-DO', { hour: '2-digit', minute: '2-digit' })
  const eventUrl = event && typeof window !== 'undefined' ? `${window.location.origin}/events/${encodeURIComponent(event._id)}` : ''
  const venue = event?.location?.venue || event?.location?.address || 'Santo Domingo, República Dominicana'
  const amount = Number(event?.price?.amount) || 0
  const currency = event?.price?.currency || 'DOP'
  let priceText = 'Entrada gratis'
  if (amount > 0) {
    try { priceText = new Intl.NumberFormat('es-DO', { style: 'currency', currency }).format(amount) }
    catch { priceText = `${amount.toLocaleString('es-DO')} ${currency}` }
  }

  useEffect(() => {
    if (!isOpen) return
    const previousFocus = document.activeElement as HTMLElement | null
    closeButtonRef.current?.focus()
    const onKeyDown = (keyboardEvent: KeyboardEvent) => {
      if (keyboardEvent.key === 'Escape') { keyboardEvent.preventDefault(); onClose() }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => { document.removeEventListener('keydown', onKeyDown); previousFocus?.focus() }
  }, [isOpen, onClose])

  // Render high-res flyer on canvas
  useEffect(() => {
    if (!isOpen || !event) return
    const canvas = canvasRef.current
    if (!canvas) return
    setIsReady(false)
    setRenderError(false)
    try {
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas unavailable')

    const width = format === 'story' ? 1080 : 1080
    const height = format === 'story' ? 1920 : 1080
    canvas.width = width
    canvas.height = height

    // Background Gradient (EventNow Deep Neon Vibe)
    const bgGrad = ctx.createLinearGradient(0, 0, width, height)
    bgGrad.addColorStop(0, '#0a0a14')
    bgGrad.addColorStop(0.5, '#130d24')
    bgGrad.addColorStop(1, '#1b0c26')
    ctx.fillStyle = bgGrad
    ctx.fillRect(0, 0, width, height)

    // Vibrant Glow circles in background
    const drawGlow = (x: number, y: number, r: number, color: string) => {
      const g = ctx.createRadialGradient(x, y, 0, x, y, r)
      g.addColorStop(0, color)
      g.addColorStop(1, 'transparent')
      ctx.fillStyle = g
      ctx.beginPath()
      ctx.arc(x, y, r, 0, Math.PI * 2)
      ctx.fill()
    }

    drawGlow(200, 300, 500, 'rgba(168, 85, 247, 0.25)') // purple
    drawGlow(900, 800, 600, 'rgba(236, 72, 153, 0.2)') // pink
    drawGlow(300, 1600, 500, 'rgba(245, 158, 11, 0.15)') // amber

    // Card Glass Background
    const margin = format === 'story' ? 70 : 50
    const cardTop = format === 'story' ? 180 : 80
    const cardWidth = width - margin * 2
    const cardHeight = height - cardTop - (format === 'story' ? 160 : 70)

    ctx.save()
    ctx.fillStyle = 'rgba(255, 255, 255, 0.04)'
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)'
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.roundRect(margin, cardTop, cardWidth, cardHeight, 40)
    ctx.fill()
    ctx.stroke()
    ctx.restore()

    // Brand Header: EVENT NOW
    ctx.fillStyle = '#ffffff'
    ctx.font = '900 42px Outfit, sans-serif'
    ctx.textAlign = 'left'
    ctx.fillText('EVENT NOW 🇩🇴', margin + 60, cardTop + 100)

    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)'
    ctx.font = '500 24px Inter, sans-serif'
    ctx.fillText('Tu próximo gran plan en RD', margin + 60, cardTop + 140)

    // Category Badge
    ctx.save()
    ctx.fillStyle = '#8b5cf6'
    ctx.beginPath()
    ctx.roundRect(margin + 60, cardTop + 190, 240, 56, 28)
    ctx.fill()
    ctx.fillStyle = '#ffffff'
    ctx.font = 'bold 24px Inter, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(eventCategory.toUpperCase(), margin + 180, cardTop + 227, 210)
    ctx.restore()

    // Event Title (Word-wrapped)
    ctx.fillStyle = '#ffffff'
    ctx.font = '900 68px Outfit, sans-serif'
    ctx.textAlign = 'left'
    const words = eventTitle.split(' ')
    let line = ''
    let curY = cardTop + 330
    const maxWidth = cardWidth - 120

    for (let n = 0; n < words.length; n++) {
      const testLine = line + words[n] + ' '
      const metrics = ctx.measureText(testLine)
      if (metrics.width > maxWidth && n > 0) {
        ctx.fillText(line.trim(), margin + 60, curY)
        line = words[n] + ' '
        curY += 80
      } else {
        line = testLine
      }
    }
    ctx.fillText(line.trim(), margin + 60, curY)

    // Date & Time Block
    const infoY = curY + 90
    ctx.save()
    ctx.fillStyle = 'rgba(255, 255, 255, 0.07)'
    ctx.beginPath()
    ctx.roundRect(margin + 60, infoY, cardWidth - 120, 160, 24)
    ctx.fill()

    ctx.fillStyle = '#fbbf24'
    ctx.font = 'bold 36px Inter, sans-serif'
    ctx.fillText(`📅 ${dateLabel.toUpperCase()}${timeLabel ? ` · ${timeLabel}` : ''}`, margin + 100, infoY + 70)

    ctx.fillStyle = '#e2e8f0'
    ctx.font = '500 30px Inter, sans-serif'
    ctx.fillText(`📍 ${venue}`, margin + 100, infoY + 125)
    ctx.restore()

    // Price Pill
    const priceY = infoY + 220
    ctx.fillStyle = '#10b981'
    ctx.font = '900 48px Outfit, sans-serif'
    ctx.fillText(`🎟️ ${priceText}`, margin + 60, priceY + 40)

    // QR Code Container Box
    const qrSize = format === 'story' ? 240 : 180
    const qrX = width - margin - 60 - qrSize
    const qrY = format === 'story' ? cardTop + cardHeight - qrSize - 80 : cardTop + cardHeight - qrSize - 60

    ctx.save()
    ctx.fillStyle = '#ffffff'
    ctx.beginPath()
    ctx.roundRect(qrX, qrY, qrSize, qrSize, 20)
    ctx.fill()

    // A real QR matrix with a four-module quiet zone links to this exact event.
    const qr = QRCode.create(eventUrl, { errorCorrectionLevel: 'M' })
    const quietZone = 4
    const moduleCount = qr.modules.size
    const cellSize = Math.floor((qrSize - 24) / (moduleCount + quietZone * 2))
    const matrixSize = (moduleCount + quietZone * 2) * cellSize
    const startX = qrX + Math.floor((qrSize - matrixSize) / 2) + quietZone * cellSize
    const startY = qrY + Math.floor((qrSize - matrixSize) / 2) + quietZone * cellSize
    ctx.fillStyle = '#0f172a'
    for (let row = 0; row < moduleCount; row++) {
      for (let column = 0; column < moduleCount; column++) {
        if (qr.modules.get(row, column)) {
          ctx.fillRect(startX + column * cellSize, startY + row * cellSize, cellSize, cellSize)
        }
      }
    }
    ctx.restore()

    // QR Helper Text
    ctx.fillStyle = '#94a3b8'
    ctx.font = 'bold 22px Inter, sans-serif'
    ctx.textAlign = 'right'
    ctx.fillText('Escanea para ver o unirte', qrX - 30, qrY + qrSize / 2 + 8)

    // Bottom Footer in Card
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)'
    ctx.font = '400 20px Inter, sans-serif'
    ctx.textAlign = 'left'
    ctx.fillText(eventUrl, margin + 60, cardTop + cardHeight - 40, cardWidth - 120)
    setIsReady(true)
    } catch {
      setRenderError(true)
      toast.error('No se pudo generar el flyer en este navegador')
    }

  }, [isOpen, event, format, eventTitle, eventCategory, dateLabel, timeLabel, venue, priceText, eventUrl])

  if (!isOpen || !event) return null

  const handleDownload = () => {
    const canvas = canvasRef.current
    if (!canvas || !isReady || downloading) return
    setDownloading(true)
    try {
      const dataUrl = canvas.toDataURL('image/png')
      const a = document.createElement('a')
      a.href = dataUrl
      a.download = `Flyer-${eventTitle.slice(0, 30).replace(/[^a-zA-Z0-9]/g, '_')}.png`
      document.body.appendChild(a)
      try { a.click() } finally { a.remove() }
      toast.success('Descarga solicitada. Revisa las descargas de tu navegador.')
    } catch {
      toast.error('No se pudo descargar el flyer')
    } finally {
      setDownloading(false)
    }
  }

  const handleWhatsAppShare = () => {
    const text = encodeURIComponent(`🔥 ¡Miren este plan en EventNow!\n\n*${event.title}*\n📅 ${dateLabel} · ${venue}\n🎟️ ${priceText}\n\n👉 Únete o mira los detalles aquí: ${eventUrl}`)
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank')
  }

  const handleNativeShare = async () => {
    const canvas = canvasRef.current
    if (!canvas || !isReady) return

    if (navigator.share && canvas.toBlob) {
      try {
        const blob = await new Promise<Blob>((resolve, reject) => {
          canvas.toBlob(value => value ? resolve(value) : reject(new Error('No se pudo crear la imagen')), 'image/png')
        })
        const file = new File([blob], 'eventnow-flyer.png', { type: 'image/png' })
        const shareData: ShareData = { title: event.title, text: `¡Nos vemos en ${event.title}!`, url: eventUrl }
        if (navigator.canShare?.({ files: [file] })) shareData.files = [file]
        await navigator.share(shareData)
        toast.success(shareData.files ? 'Flyer compartido' : 'Enlace del evento compartido')
      } catch (err) {
        if (!(err instanceof DOMException && err.name === 'AbortError')) {
          toast.error('No se pudo compartir el flyer. Puedes descargarlo o enviarlo por WhatsApp.')
        }
      }
    } else {
      handleWhatsAppShare()
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 backdrop-blur-md animate-in fade-in">
      <div role="dialog" aria-modal="true" aria-labelledby={titleId} className="relative flex min-h-0 max-h-[95dvh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-white/10 bg-card p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-border pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/20 text-primary">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h2 id={titleId} className="text-xl font-bold text-foreground">Generador de Flyer para Stories</h2>
              <p className="text-xs text-muted-foreground">Listo para tus Estados de WhatsApp e Instagram</p>
            </div>
          </div>
          <button
            ref={closeButtonRef}
            aria-label="Cerrar generador de flyer"
            onClick={onClose}
            className="rounded-full p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Format Selector */}
        <div className="my-4 flex flex-wrap items-center justify-between gap-2">
          <div className="flex gap-2">
            <button
              onClick={() => setFormat('story')}
              className={`rounded-xl px-4 py-1.5 text-xs font-semibold transition-all ${
                format === 'story'
                  ? 'bg-primary text-white shadow-md'
                  : 'bg-muted text-muted-foreground hover:text-foreground'
              }`}
            >
              📱 9:16 (Story / WhatsApp)
            </button>
            <button
              onClick={() => setFormat('square')}
              className={`rounded-xl px-4 py-1.5 text-xs font-semibold transition-all ${
                format === 'square'
                  ? 'bg-primary text-white shadow-md'
                  : 'bg-muted text-muted-foreground hover:text-foreground'
              }`}
            >
              🟦 1:1 (Cuadrado / Feed)
            </button>
          </div>
          <span className="text-[11px] text-muted-foreground">Resolución: 1080p HD</span>
        </div>

        {renderError && <p role="alert" className="mb-3 text-sm text-red-400">No pudimos generar la imagen. Cierra y vuelve a abrir el generador para intentarlo de nuevo.</p>}

        {/* Canvas Preview Area */}
        <div className="flex min-h-0 flex-1 items-center justify-center overflow-auto rounded-2xl bg-black/40 p-4">
          <canvas
            ref={canvasRef}
            aria-label={`Vista previa del flyer de ${eventTitle}`}
            className={`max-h-[50vh] w-auto rounded-xl shadow-2xl border border-white/10 object-contain`}
          />
        </div>

        {/* Action Buttons */}
        <div className="mt-5 grid shrink-0 grid-cols-1 gap-3 sm:grid-cols-2">
          <button
            onClick={handleDownload}
            disabled={downloading || !isReady}
            className="flex items-center justify-center gap-2 rounded-xl bg-muted px-5 py-3 text-sm font-bold text-foreground hover:bg-muted/80 active:scale-98 transition-all"
          >
            <Download className="h-4 w-4" />
            <span>Descargar Imagen HD</span>
          </button>

          <button
            onClick={handleNativeShare}
            disabled={!isReady}
            className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 px-5 py-3 text-sm font-bold text-white shadow-lg hover:brightness-110 active:scale-98 transition-all"
          >
            <Share2 className="h-4 w-4" />
            <span>Compartir en WhatsApp / Story</span>
          </button>
        </div>
      </div>
    </div>
  )
}
