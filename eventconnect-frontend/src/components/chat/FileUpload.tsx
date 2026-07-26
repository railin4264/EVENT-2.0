'use client'

import { useState, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import * as chatAPI from '@/lib/api/chat'

interface FileUploadProps {
  chatId: string
  onFilesSent: (message: chatAPI.Message) => void
  onError: (error: string) => void
  className?: string
}

interface FilePreview {
  file: File
  preview?: string
  type: 'image' | 'video' | 'audio' | 'document'
}

export default function FileUpload({ chatId, onFilesSent, onError, className = '' }: FileUploadProps) {
  const [files, setFiles] = useState<FilePreview[]>([])
  const [content, setContent] = useState('')
  const [isUploading, setIsUploading] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const getFileType = (file: File): FilePreview['type'] => {
    if (file.type.startsWith('image/')) return 'image'
    if (file.type.startsWith('video/')) return 'video'
    if (file.type.startsWith('audio/')) return 'audio'
    return 'document'
  }

  const createFilePreview = async (file: File): Promise<FilePreview> => {
    const type = getFileType(file)
    let preview: string | undefined

    if (type === 'image' || type === 'video') {
      preview = URL.createObjectURL(file)
    }

    return { file, preview, type }
  }

  const handleFiles = useCallback(async (selectedFiles: FileList) => {
    const maxFiles = 5
    const maxSize = 10 * 1024 * 1024 // 10MB

    const fileArray = Array.from(selectedFiles).slice(0, maxFiles)
    
    // Validate file sizes
    const oversizedFiles = fileArray.filter(file => file.size > maxSize)
    if (oversizedFiles.length > 0) {
      onError(`Algunos archivos exceden el límite de 10MB: ${oversizedFiles.map(f => f.name).join(', ')}`)
      return
    }

    try {
      const previews = await Promise.all(fileArray.map(createFilePreview))
      setFiles(prev => [...prev, ...previews].slice(0, maxFiles))
    } catch (error) {
      onError('Error al procesar los archivos')
    }
  }, [onError])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files
    if (selectedFiles) {
      handleFiles(selectedFiles)
    }
  }, [handleFiles])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragActive(false)
    
    if (e.dataTransfer.files) {
      handleFiles(e.dataTransfer.files)
    }
  }, [handleFiles])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragActive(true)
  }, [])

  const handleDragLeave = useCallback(() => {
    setDragActive(false)
  }, [])

  const removeFile = useCallback((index: number) => {
    setFiles(prev => {
      const newFiles = [...prev]
      const removed = newFiles.splice(index, 1)[0]
      
      // Cleanup preview URL
      if (removed.preview) {
        URL.revokeObjectURL(removed.preview)
      }
      
      return newFiles
    })
  }, [])

  const handleSend = async () => {
    if (files.length === 0) return

    setIsUploading(true)
    
    try {
      const fileArray = files.map(f => f.file)
      const message = await chatAPI.uploadFiles(chatId, fileArray, content.trim() || undefined)
      
      // Cleanup preview URLs
      files.forEach(f => {
        if (f.preview) {
          URL.revokeObjectURL(f.preview)
        }
      })
      
      setFiles([])
      setContent('')
      onFilesSent(message.data)
    } catch (error: any) {
      onError(error.response?.data?.message || 'Error al enviar archivos')
    } finally {
      setIsUploading(false)
    }
  }

  const handleCancel = () => {
    // Cleanup preview URLs
    files.forEach(f => {
      if (f.preview) {
        URL.revokeObjectURL(f.preview)
      }
    })
    
    setFiles([])
    setContent('')
  }

  if (files.length === 0) {
    return (
      <div className={className}>
        <div 
          className={`border-2 border-dashed rounded-xl p-8 transition-colors ${
            dragActive 
              ? 'border-primary-400 bg-primary-50' 
              : 'border-gray-300 hover:border-gray-400'
          }`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
          <div className="text-center">
            <div className="text-4xl mb-4">📎</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Arrastra archivos aquí
            </h3>
            <p className="text-gray-500 mb-4">
              O haz clic para seleccionar archivos
            </p>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
            >
              Seleccionar archivos
            </button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt"
              onChange={handleFileSelect}
              className="hidden"
            />
            <div className="text-xs text-gray-400 mt-3">
              Máximo 5 archivos, 10MB cada uno
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={className}>
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        {/* File Previews */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
          <AnimatePresence>
            {files.map((file, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="relative group"
              >
                <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
                  {file.type === 'image' && file.preview ? (
                    <img
                      src={file.preview}
                      alt={file.file.name}
                      className="w-full h-full object-cover"
                    />
                  ) : file.type === 'video' && file.preview ? (
                    <video
                      src={file.preview}
                      className="w-full h-full object-cover"
                      muted
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <div className="text-center">
                        <div className="text-2xl mb-2">
                          {chatAPI.getFileIcon(file.file.type)}
                        </div>
                        <div className="text-xs font-medium text-gray-600 truncate px-2">
                          {file.file.name}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                
                {/* File info overlay */}
                <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-xs p-2">
                  <div className="truncate font-medium">{file.file.name}</div>
                  <div className="text-gray-300">
                    {chatAPI.formatFileSize(file.file.size)}
                  </div>
                </div>
                
                {/* Remove button */}
                <button
                  onClick={() => removeFile(index)}
                  className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-sm opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  ×
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Caption Input */}
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Añade un mensaje (opcional)..."
          rows={2}
          className="w-full p-3 border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary-500"
        />

        {/* Actions */}
        <div className="flex items-center justify-between mt-4">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="text-primary-500 hover:text-primary-600 transition-colors"
          >
            + Añadir más archivos
          </button>
          
          <div className="flex gap-2">
            <button
              onClick={handleCancel}
              disabled={isUploading}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleSend}
              disabled={isUploading}
              className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              {isUploading && (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              )}
              {isUploading ? 'Enviando...' : 'Enviar'}
            </button>
          </div>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt"
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>
    </div>
  )
}