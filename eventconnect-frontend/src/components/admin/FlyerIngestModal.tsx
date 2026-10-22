'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Sparkles,
  Upload,
  Calendar,
  MapPin,
  DollarSign,
  Tag,
  CheckCircle2,
  X,
  FileText,
  Loader2,
  ArrowRight,
  ExternalLink
} from 'lucide-react'
import { apiClient } from '@/lib/api/client'
import { Button } from '@/components/redesign/ui/button'
import toast from 'react-hot-toast'
import Link from 'next/link'

interface FlyerIngestModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: (event: any) => void
}

export function FlyerIngestModal({ isOpen, onClose, onSuccess }: FlyerIngestModalProps) {
  const [flyerText, setFlyerText] = useState('')
  const [sourceUrl, setSourceUrl] = useState('')
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [extractedResult, setExtractedResult] = useState<any>(null)

  const handleIngest = async () => {
    if (!flyerText.trim()) {
      toast.error('Pega el texto del flyer, post de Instagram o mensaje de WhatsApp.')
      return
    }

    try {
      setIsAnalyzing(true)
      const res = await apiClient.post('/events/ingest/flyer', {
        flyerText: flyerText,
        rawText: flyerText,
        sourceUrl: sourceUrl.trim() || undefined
      })

      if (res.data?.success) {
        setExtractedResult(res.data)
        toast.success('¡Flyer analizado exitosamente con IA! 🇩🇴')
        if (onSuccess) onSuccess(res.data.event)
      } else {
        toast.error(res.data?.message || 'Error al procesar el flyer.')
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'No se pudo analizar el flyer con IA.')
    } finally {
      setIsAnalyzing(false)
    }
  }

  const handleReset = () => {
    setExtractedResult(null)
    setFlyerText('')
    setSourceUrl('')
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-2xl bg-gray-950 border border-white/10 rounded-[32px] p-6 sm:p-8 text-white shadow-2xl relative my-8"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="mb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/20 border border-primary/30 text-primary text-xs font-bold mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Ingestión Automática con IA Dominicana</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white">
            Transformar Flyer de Instagram / Redes a Evento
          </h2>
          <p className="text-xs sm:text-sm text-gray-400 mt-1">
            Pega el copy o texto del flyer. Nuestro bot detecta recintos de RD (Teatro Nacional, Quisqueya, Ruinas, Rooftops), coordenadas GPS, fechas, precios y categoría automáticamente.
          </p>
        </div>

        {!extractedResult ? (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-2">
                Texto del Flyer / Caption de Redes Sociales:
              </label>
              <textarea
                value={flyerText}
                onChange={(e) => setFlyerText(e.target.value)}
                placeholder="Ejemplo: &#10;🔥 GRAN CONCIERTO BAJO LAS ESTRELLAS EN LAS RUINAS DE SAN FRANCISCO! &#10;🗓️ Sábado 26 de Octubre a las 7:30 PM. &#10;📍 Ruinas de San Francisco, Zona Colonial, Santo Domingo. &#10;🎟️ Boletas a RD$ 1,200 p/p en puerta. Música en vivo, jazz caribeño y gastronomía. #ZonaColonial #ConciertoRD"
                rows={7}
                className="w-full rounded-2xl bg-white/5 border border-white/10 p-4 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-primary transition resize-none font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-2">
                Enlace de Referencia (Instagram / Web - Opcional):
              </label>
              <input
                type="url"
                value={sourceUrl}
                onChange={(e) => setSourceUrl(e.target.value)}
                placeholder="https://instagram.com/p/..."
                className="w-full h-11 rounded-2xl bg-white/5 border border-white/10 px-4 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-primary transition"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
              <Button
                variant="outline"
                onClick={onClose}
                className="rounded-2xl border-white/10 text-gray-400 hover:text-white"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleIngest}
                disabled={isAnalyzing || !flyerText.trim()}
                className="rounded-2xl bg-primary hover:bg-primary/90 text-white font-bold gap-2 px-6"
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Extrayendo con IA...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Analizar y Generar Evento</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        ) : (
          /* Extraction Results Preview */
          <div className="space-y-5">
            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center gap-3">
              <CheckCircle2 className="w-6 h-6 shrink-0" />
              <div>
                <h4 className="text-sm font-bold text-emerald-300">¡Datos extraídos y normalizados con éxito!</h4>
                <p className="text-xs text-emerald-400/80">
                  El evento ha sido registrado en la cola de moderación oficial con geolocalización precisa.
                </p>
              </div>
            </div>

            {/* Extracted Details Box */}
            <div className="p-5 rounded-2xl bg-white/5 border border-white/10 space-y-3">
              <div>
                <span className="text-[10px] text-gray-400 uppercase tracking-widest block font-bold">Título Detectado</span>
                <h3 className="text-base font-bold text-white mt-0.5">
                  {extractedResult.event?.title || extractedResult.parsedData?.title}
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div className="flex items-start gap-2.5">
                  <Calendar className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  <div>
                    <span className="text-[10px] text-gray-400 block font-bold">Fecha & Hora</span>
                    <span className="text-xs text-white font-medium">
                      {new Date(extractedResult.event?.date || extractedResult.parsedData?.date).toLocaleString('es-DO', {
                        dateStyle: 'full',
                        timeStyle: 'short'
                      })}
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <MapPin className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-[10px] text-gray-400 block font-bold">Recinto & Coordenadas</span>
                    <span className="text-xs text-white font-medium block">
                      {extractedResult.event?.location?.venue || extractedResult.parsedData?.venue || 'Ubicación Detectada'}
                    </span>
                    <span className="text-[10px] font-mono text-gray-400">
                      GPS: {extractedResult.event?.location?.coordinates?.join(', ') || 'Santo Domingo'}
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <DollarSign className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-[10px] text-gray-400 block font-bold">Precio Detectado</span>
                    <span className="text-xs text-emerald-400 font-bold">
                      {extractedResult.event?.price?.amount === 0
                        ? 'GRATIS / Entrada Libre'
                        : `RD$ ${extractedResult.event?.price?.amount?.toLocaleString('es-DO')}`}
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <Tag className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-[10px] text-gray-400 block font-bold">Categoría Asignada</span>
                    <span className="text-xs text-amber-300 font-bold capitalize">
                      {extractedResult.event?.category || extractedResult.parsedData?.category}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-between gap-3 pt-4 border-t border-white/10">
              <Button
                variant="outline"
                onClick={handleReset}
                className="rounded-2xl border-white/10 text-gray-300 hover:text-white"
              >
                Analizar Otro Flyer
              </Button>

              <div className="flex items-center gap-2">
                <Button asChild className="rounded-2xl bg-primary text-white font-bold gap-2">
                  <Link href={`/events/${extractedResult.event?._id}`}>
                    <span>Ver Evento Generado</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  )
}
