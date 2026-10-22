'use client'

import { useRef, useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Download, Share2, Sparkles, Check, Calendar, MapPin, Compass } from 'lucide-react'
import { Button } from '@/components/redesign/ui/button'
import toast from 'react-hot-toast'
import type { EventExportData } from '@/components/events/event-detail-utils'
import { eventDateLabel } from '@/components/events/event-detail-utils'

interface StoryExportModalProps {
  isOpen: boolean
  onClose: () => void
  event: EventExportData
}

export function StoryExportModal({ isOpen, onClose, event }: StoryExportModalProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!isOpen || !event) return

    const generateCanvas = async () => {
      setIsGenerating(true)
      const canvas = canvasRef.current
      if (!canvas) { setIsGenerating(false); return }
      const ctx = canvas.getContext('2d')
      if (!ctx) { setIsGenerating(false); toast.error('No se pudo preparar la imagen en este navegador'); return }

      // Set dimensions: 1080 x 1920 (Instagram Story 9:16)
      canvas.width = 1080
      canvas.height = 1920

      // 1. Background gradient (Deep Dark luxury Violet / Obsidian)
      const bgGrad = ctx.createLinearGradient(0, 0, 1080, 1920)
      bgGrad.addColorStop(0, '#0a0a14')
      bgGrad.addColorStop(0.5, '#120d24')
      bgGrad.addColorStop(1, '#08080c')
      ctx.fillStyle = bgGrad
      ctx.fillRect(0, 0, 1080, 1920)

      // 2. Ambient neon orbs
      const orb1 = ctx.createRadialGradient(200, 300, 20, 200, 300, 500)
      orb1.addColorStop(0, 'rgba(124, 58, 237, 0.45)')
      orb1.addColorStop(1, 'rgba(124, 58, 237, 0)')
      ctx.fillStyle = orb1
      ctx.fillRect(0, 0, 1080, 1920)

      const orb2 = ctx.createRadialGradient(880, 1400, 20, 880, 1400, 600)
      orb2.addColorStop(0, 'rgba(245, 158, 11, 0.35)')
      orb2.addColorStop(1, 'rgba(245, 158, 11, 0)')
      ctx.fillStyle = orb2
      ctx.fillRect(0, 0, 1080, 1920)

      // 3. Top Branding Header
      ctx.fillStyle = '#ffffff'
      ctx.font = 'bold 36px sans-serif'
      ctx.fillText('EVENTNOW RD  🇩🇴', 100, 140)

      ctx.fillStyle = 'rgba(255, 255, 255, 0.6)'
      ctx.font = '500 24px sans-serif'
      ctx.fillText('Descubre lo inesperado en tu ciudad', 100, 185)

      // 4. Center Poster Frame
      ctx.fillStyle = 'rgba(255, 255, 255, 0.05)'
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.roundRect(80, 260, 920, 1300, 48)
      ctx.fill()
      ctx.stroke()

      // 5. Category tag pill
      const category = (event.category || 'EVENTO').toUpperCase()
      ctx.fillStyle = '#7c3aed'
      ctx.beginPath()
      ctx.roundRect(140, 330, 260, 60, 30)
      ctx.fill()

      ctx.fillStyle = '#ffffff'
      ctx.font = 'bold 24px sans-serif'
      ctx.fillText(category, 175, 370)

      // 6. Title
      ctx.fillStyle = '#ffffff'
      ctx.font = '900 56px sans-serif'
      const title = event.title || 'Gran Evento'

      // Simple word wrapping
      const words = title.split(' ')
      let line = ''
      let y = 470
      for (let n = 0; n < words.length; n++) {
        const testLine = line + words[n] + ' '
        const metrics = ctx.measureText(testLine)
        if (metrics.width > 800 && n > 0) {
          ctx.fillText(line, 140, y)
          line = words[n] + ' '
          y += 75
        } else {
          line = testLine
        }
      }
      ctx.fillText(line, 140, y)

      // 7. Date & Time
      const dateStr = new Date(event.date).toLocaleDateString('es-DO', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        hour: '2-digit',
        minute: '2-digit'
      })
      y += 80
      ctx.fillStyle = '#f59e0b'
      ctx.font = 'bold 36px sans-serif'
      ctx.fillText('📅 ' + dateStr, 140, y)

      // 8. Location
      y += 65
      const venueStr = event.location?.venue || event.location?.address || 'Santo Domingo, RD'
      ctx.fillStyle = 'rgba(255, 255, 255, 0.85)'
      ctx.font = '500 32px sans-serif'
      ctx.fillText('📍 ' + venueStr, 140, y)

      // 9. Price Tag
      y += 65
      const priceStr = (event.price?.amount || 0) > 0 ? `RD$ ${event.price.amount}` : 'Entrada Libre'
      ctx.fillStyle = '#34d399'
      ctx.font = 'bold 34px sans-serif'
      ctx.fillText('🎟️ ' + priceStr, 140, y)

      if (event.isSoloFriendly) {
        y += 80
        ctx.fillStyle = 'rgba(255, 255, 255, 0.08)'
        ctx.beginPath()
        ctx.roundRect(140, y - 45, 800, 90, 24)
        ctx.fill()
        ctx.fillStyle = '#ffffff'
        ctx.font = 'bold 28px sans-serif'
        ctx.fillText('🤝 Mesa para los que van solos disponible', 180, y + 10)
      }

      // 11. Footer Invitation
      ctx.fillStyle = '#ffffff'
      ctx.font = 'bold 38px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('¿Hacemos coro? Acompáñame en este plan', 540, 1680)

      ctx.fillStyle = 'rgba(255, 255, 255, 0.6)'
      ctx.font = '500 26px sans-serif'
      ctx.fillText('Encuéntralo en EventNow · App de eventos locales de RD', 540, 1730)

      // Reset text align
      ctx.textAlign = 'left'

      try {
        const dataUrl = canvas.toDataURL('image/png')
        setPreviewUrl(dataUrl)
      } catch { toast.error('No se pudo generar la imagen. Inténtalo de nuevo.') }
      setIsGenerating(false)
    }

    void generateCanvas().catch(() => {
      setIsGenerating(false)
      toast.error('No se pudo generar la imagen en este navegador')
    })
  }, [isOpen, event])

  const handleDownload = () => {
    if (!previewUrl) return
    const a = document.createElement('a')
    a.href = previewUrl
    a.download = `eventnow-${event.title?.slice(0, 20).toLowerCase().replace(/\s+/g, '-')}-story.png`
    a.click()
    toast.success('¡Imagen HD descargada! Lista para subir a tu historia.')
  }

  const handleShare = async () => {
    const shareUrl = `${window.location.origin}/events/${event._id}`
    try {
      if (navigator.share) {
        await navigator.share({ title: `¿Vamos a este plan? ${event.title}`, text: `Mira este plan en EventNow: ${event.title}.`, url: shareUrl })
        toast.success('¡Compartido!')
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareUrl)
        toast.success('¡Enlace copiado al portapapeles!')
      } else {
        toast.error('Copia el enlace del evento desde la barra de direcciones')
      }
    } catch (err) {
      if (!(err instanceof DOMException && err.name === 'AbortError')) toast.error('No se pudo compartir el evento')
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative w-full max-w-sm rounded-3xl border border-white/10 bg-gray-950 p-5 sm:p-6 text-white shadow-2xl flex flex-col items-center"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-all z-10"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center mb-4">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/10 text-purple-400 text-xs font-bold mb-1">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Formato 9:16 Vertical</span>
          </div>
          <h3 className="text-lg font-bold text-white">Cartelera para Historias</h3>
          <p className="text-xs text-gray-400">Instagram Stories & Estados de WhatsApp</p>
        </div>

        {/* Hidden Canvas for High-Resolution render */}
        <canvas ref={canvasRef} className="hidden" />

        {/* Scaled Preview Frame */}
        <div className="relative w-[210px] h-[373px] rounded-2xl overflow-hidden border border-white/20 shadow-2xl bg-black">
          {previewUrl ? (
            <img
              src={previewUrl}
              alt="Story Preview"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-xs text-gray-500">
              <Compass className="w-6 h-6 animate-spin mb-2 text-primary" />
              <span>Diseñando cartelera...</span>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="w-full flex items-center gap-2 mt-5">
          <Button
            onClick={handleDownload}
            disabled={!previewUrl || isGenerating}
            className="flex-1 h-11 rounded-2xl bg-primary hover:bg-primary/90 text-xs font-bold shadow-lg shadow-primary/20"
          >
            <Download className="w-4 h-4 mr-1.5" />
            Descargar HD
          </Button>
          <Button
            onClick={handleShare}
            variant="outline"
            className="h-11 px-4 rounded-2xl border-white/10 hover:bg-white/10 text-xs font-bold"
          >
            <Share2 className="w-4 h-4" />
          </Button>
        </div>
      </motion.div>
    </div>
  )
}
