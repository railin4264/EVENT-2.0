'use client'

import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Camera, Type, Image, Plus, Check, Star, Send, Palette } from 'lucide-react'

// Aliases para iconos no disponibles en lucide-react 0.408.0
const Video = Camera
import { useStoriesStore } from '@/stores/storiesStore'
import * as storiesAPI from '@/lib/api/stories'

interface CreateStoryProps {
  isOpen: boolean
  onClose: () => void
  onStoryCreated?: (story: storiesAPI.Story) => void
  eventId?: string
}

type CreationStep = 'choose' | 'media' | 'text' | 'preview'

export default function CreateStory({ isOpen, onClose, onStoryCreated, eventId }: CreateStoryProps) {
  const [step, setStep] = useState<CreationStep>('choose')
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [textContent, setTextContent] = useState('')
  const [textStyle, setTextStyle] = useState<{
    backgroundColor: string;
    textColor: string;
    fontSize: 'small' | 'medium' | 'large';
    fontFamily: 'sans' | 'serif' | 'mono';
  }>({
    backgroundColor: '#6366F1',
    textColor: '#FFFFFF',
    fontSize: 'medium',
    fontFamily: 'sans'
  })
  const [privacy, setPrivacy] = useState<'public' | 'friends' | 'tribe' | 'private'>('friends')
  const [isProcessing, setIsProcessing] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const { createStory, createTextStory, isCreating, error, clearError } = useStoriesStore()

  const backgroundColors = [
    '#6366F1', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6',
    '#06B6D4', '#EC4899', '#84CC16', '#F97316', '#6B7280'
  ]

  const reset = () => {
    setStep('choose')
    setSelectedFiles([])
    setTextContent('')
    setTextStyle({
      backgroundColor: '#6366F1',
      textColor: '#FFFFFF',
      fontSize: 'medium',
      fontFamily: 'sans'
    })
    setPrivacy('friends')
    setIsProcessing(false)
    clearError()
  }

  const handleClose = () => {
    reset()
    onClose()
  }

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])

    const validation = storiesAPI.validateStoryMedia(files)
    if (!validation.valid) {
      alert(validation.error)
      return
    }

    setSelectedFiles(files)
    setStep('preview')
  }

  const handleCreateMediaStory = async () => {
    if (selectedFiles.length === 0) return

    try {
      setIsProcessing(true)

      const storyData: storiesAPI.CreateStoryData = {
        media: selectedFiles,
        privacy,
        ...(eventId && { event: eventId })
      }

      const story = await createStory(storyData)

      onStoryCreated?.(story)
      handleClose()
    } catch (error) {
      console.error('Error creating story:', error)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleCreateTextStory = async () => {
    if (!textContent.trim()) return

    try {
      setIsProcessing(true)

      const storyData: storiesAPI.CreateTextStoryData = {
        content: textContent.trim(),
        backgroundColor: textStyle.backgroundColor,
        textColor: textStyle.textColor,
        fontSize: textStyle.fontSize,
        fontFamily: textStyle.fontFamily,
        privacy,
        ...(eventId && { event: eventId })
      }

      const story = await createTextStory(storyData)

      onStoryCreated?.(story)
      handleClose()
    } catch (error) {
      console.error('Error creating text story:', error)
    } finally {
      setIsProcessing(false)
    }
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
        onClick={handleClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-md overflow-hidden"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
              {step === 'choose' && 'Crear Historia'}
              {step === 'media' && 'Agregar Media'}
              {step === 'text' && 'Historia de Texto'}
              {step === 'preview' && 'Vista Previa'}
            </h2>
            <button
              onClick={handleClose}
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
            </button>
          </div>

          <div className="p-4">
            {step === 'choose' && (
              <div className="space-y-3">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full p-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl flex items-center gap-3 hover:from-purple-600 hover:to-pink-600 transition-all"
                >
                  <div className="w-10 h-10 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                    <Camera className="w-5 h-5" />
                  </div>
                  <div className="text-left">
                    <div className="font-semibold">Foto o Video</div>
                    <div className="text-sm opacity-90">Comparte un momento visual</div>
                  </div>
                </button>

                <button
                  onClick={() => setStep('text')}
                  className="w-full p-4 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-xl flex items-center gap-3 hover:from-blue-600 hover:to-indigo-600 transition-all"
                >
                  <div className="w-10 h-10 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                    <Type className="w-5 h-5" />
                  </div>
                  <div className="text-left">
                    <div className="font-semibold">Texto</div>
                    <div className="text-sm opacity-90">Comparte un pensamiento</div>
                  </div>
                </button>
              </div>
            )}

            {step === 'text' && (
              <div className="space-y-4">
                {/* Text Preview */}
                <div
                  className="aspect-[9/16] rounded-xl flex items-center justify-center p-6 text-center relative overflow-hidden"
                  style={{
                    backgroundColor: textStyle.backgroundColor,
                    color: textStyle.textColor
                  }}
                >
                  <textarea
                    value={textContent}
                    onChange={(e) => setTextContent(e.target.value)}
                    placeholder="Escribe tu historia..."
                    className="bg-transparent border-none outline-none resize-none w-full text-center placeholder-white placeholder-opacity-70"
                    style={{
                      fontSize: textStyle.fontSize === 'small' ? '16px' : textStyle.fontSize === 'large' ? '24px' : '20px',
                      fontFamily: textStyle.fontFamily === 'serif' ? 'serif' : textStyle.fontFamily === 'mono' ? 'monospace' : 'sans-serif',
                      color: textStyle.textColor
                    }}
                    maxLength={500}
                    rows={8}
                  />

                  <div className="absolute bottom-2 right-2 text-xs opacity-60">
                    {textContent.length}/500
                  </div>
                </div>

                {/* Style Controls */}
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                      Color de fondo
                    </label>
                    <div className="flex gap-2 overflow-x-auto pb-2">
                      {backgroundColors.map((color) => (
                        <button
                          key={color}
                          onClick={() => setTextStyle(prev => ({ ...prev, backgroundColor: color }))}
                          className="w-8 h-8 rounded-full flex-shrink-0 border-2 border-white dark:border-gray-800 shadow-md relative"
                          style={{ backgroundColor: color }}
                        >
                          {textStyle.backgroundColor === color && (
                            <Check className="w-4 h-4 text-white absolute inset-0 m-auto" />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">
                        Tamaño
                      </label>
                      <select
                        value={textStyle.fontSize}
                        onChange={(e) => setTextStyle(prev => ({
                          ...prev,
                          fontSize: e.target.value as 'small' | 'medium' | 'large'
                        }))}
                        className="w-full p-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                      >
                        <option value="small">Pequeño</option>
                        <option value="medium">Mediano</option>
                        <option value="large">Grande</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">
                        Fuente
                      </label>
                      <select
                        value={textStyle.fontFamily}
                        onChange={(e) => setTextStyle(prev => ({
                          ...prev,
                          fontFamily: e.target.value as 'sans' | 'serif' | 'mono'
                        }))}
                        className="w-full p-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                      >
                        <option value="sans">Sans Serif</option>
                        <option value="serif">Serif</option>
                        <option value="mono">Mono</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setStep('choose')}
                    className="flex-1 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                  >
                    Atrás
                  </button>
                  <button
                    onClick={handleCreateTextStory}
                    disabled={!textContent.trim() || isProcessing || isCreating}
                    className="flex-1 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                  >
                    {(isProcessing || isCreating) && (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    )}
                    <Send className="w-4 h-4" />
                    Publicar
                  </button>
                </div>
              </div>
            )}

            {step === 'preview' && selectedFiles.length > 0 && (
              <div className="space-y-4">
                {/* Media Preview */}
                <div className="space-y-3">
                  {selectedFiles.map((file, index) => (
                    <div key={index} className="relative">
                      {file.type.startsWith('image/') ? (
                        <img
                          src={URL.createObjectURL(file)}
                          alt={`Preview ${index + 1}`}
                          className="w-full aspect-[9/16] object-cover rounded-xl"
                        />
                      ) : (
                        <video
                          src={URL.createObjectURL(file)}
                          className="w-full aspect-[9/16] object-cover rounded-xl"
                          controls
                        />
                      )}
                    </div>
                  ))}
                </div>

                {/* Privacy Settings */}
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                    Quién puede ver
                  </label>
                  <select
                    value={privacy}
                    onChange={(e) => setPrivacy(e.target.value as typeof privacy)}
                    className="w-full p-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="public">Público</option>
                    <option value="friends">Amigos</option>
                    <option value="tribe">Tribu</option>
                    <option value="private">Solo yo</option>
                  </select>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setStep('choose')}
                    className="flex-1 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
                  >
                    Atrás
                  </button>
                  <button
                    onClick={handleCreateMediaStory}
                    disabled={selectedFiles.length === 0 || isProcessing || isCreating}
                    className="flex-1 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                  >
                    {(isProcessing || isCreating) && (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    )}
                    <Send className="w-4 h-4" />
                    Publicar
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 border-t border-red-200 dark:border-red-800">
              <div className="text-red-600 dark:text-red-400 text-sm">{error}</div>
            </div>
          )}

          {/* Hidden File Input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*"
            multiple
            onChange={handleFileSelect}
            className="hidden"
          />
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}