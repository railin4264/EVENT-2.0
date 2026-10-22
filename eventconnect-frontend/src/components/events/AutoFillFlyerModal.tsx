'use strict'

import React, { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, Upload, X, FileText, CheckCircle2, Loader2, Image as ImageIcon } from 'lucide-react'
import { apiClient } from '@/lib/api/client'
import toast from 'react-hot-toast'

interface AutoFillFlyerModalProps {
  isOpen: boolean
  onClose: () => void
  onApply: (extractedData: any) => void
}

export default function AutoFillFlyerModal({ isOpen, onClose, onApply }: AutoFillFlyerModalProps) {
  const [flyerText, setFlyerText] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      setSelectedFile(file)
      setPreviewUrl(URL.createObjectURL(file))
    }
  }

  const handleClear = () => {
    setSelectedFile(null)
    setPreviewUrl(null)
    setFlyerText('')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleExtract = async () => {
    if (!selectedFile && !flyerText.trim()) {
      toast.error('Sube un afiche o pega el texto del evento')
      return
    }

    try {
      setIsAnalyzing(true)
      const formData = new FormData()
      if (selectedFile) {
        formData.append('eventImage', selectedFile)
      }
      if (flyerText.trim()) {
        formData.append('text', flyerText.trim())
      }

      const response = await apiClient.post('/api/events/ai-extract-flyer', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })

      const data = response.data?.data
      if (data) {
        toast.success(`✨ ¡Evento detectado: "${data.title}"!`)
        onApply(data)
        onClose()
      } else {
        toast.error('No se pudieron extraer datos del afiche.')
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Error analizando afiche')
    } finally {
      setIsAnalyzing(false)
    }
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="relative w-full max-w-xl rounded-2xl border border-white/10 bg-background/95 p-6 shadow-2xl backdrop-blur-xl"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-border/50">
            <div className="flex items-center gap-2.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-amber-500 to-rose-500 text-white shadow-lg shadow-rose-500/20">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-foreground">Auto-Rellenar con Afiche / Flyer (IA)</h3>
                <p className="text-xs text-muted-foreground">Sube la foto del afiche o pega el copy de Instagram / WhatsApp</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Body */}
          <div className="mt-5 space-y-4">
            {/* Upload Box */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className="group relative flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-border/80 bg-muted/20 p-5 transition-all hover:border-primary/60 hover:bg-muted/40"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
              {previewUrl ? (
                <div className="relative flex flex-col items-center">
                  <img
                    src={previewUrl}
                    alt="Flyer Preview"
                    className="max-h-40 rounded-lg object-contain shadow-md"
                  />
                  <span className="mt-2 text-xs font-medium text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Afiche seleccionado ({selectedFile?.name})
                  </span>
                </div>
              ) : (
                <div className="flex flex-col items-center text-center">
                  <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary group-hover:scale-110 transition-transform">
                    <Upload className="h-5 w-5" />
                  </div>
                  <p className="text-sm font-semibold text-foreground">Sube la foto del afiche o flyer</p>
                  <p className="text-xs text-muted-foreground">PNG, JPG o WEBP (hasta 10MB)</p>
                </div>
              )}
            </div>

            {/* Text Copy Area */}
            <div>
              <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                <FileText className="h-3.5 w-3.5" /> O pega el texto del anuncio / pie de foto:
              </label>
              <textarea
                value={flyerText}
                onChange={(e) => setFlyerText(e.target.value)}
                placeholder="Ej: GRAN CONCIERTO DE JAZZ EN CASA DE TEATRO. Viernes 25 de Octubre, 8:00 PM. Calle Arzobispo Meriño, Zona Colonial. Entrada RD$ 600. Boletas en taquilla..."
                rows={4}
                className="w-full rounded-xl border border-border bg-background/60 p-3 text-xs text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>

          {/* Footer actions */}
          <div className="mt-6 flex items-center justify-between pt-4 border-t border-border/50">
            <button
              type="button"
              onClick={handleClear}
              className="text-xs font-medium text-muted-foreground hover:text-foreground"
            >
              Limpiar
            </button>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-border px-4 py-2.5 text-xs font-semibold text-foreground hover:bg-muted"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleExtract}
                disabled={isAnalyzing || (!selectedFile && !flyerText.trim())}
                className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-rose-500 px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-rose-500/25 transition-all hover:opacity-95 disabled:opacity-50"
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Analizando con IA...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    <span>Extraer y Autocompletar</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
