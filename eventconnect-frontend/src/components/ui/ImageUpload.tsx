'use client'

import { useState, useRef, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Camera, X, Image as ImageIcon, AlertCircle } from 'lucide-react'
import { uploadService } from '@/lib/api/upload'
import { Button } from './Button'
import { cn } from '@/lib/utils'
import { SUPPORTED_IMAGE_TYPES, MAX_IMAGE_SIZE } from '@/lib/constants'

// Alias para icono no disponible en lucide-react 0.408.0
const Upload = Camera

interface ImageUploadProps {
  value?: string | string[]
  onChange: (value: string | string[] | null) => void
  multiple?: boolean
  maxFiles?: number
  className?: string
  accept?: string
  maxSize?: number
  disabled?: boolean
  placeholder?: string
  uploadContext?: 'avatar' | 'event' | 'post'
}

export function ImageUpload({
  value,
  onChange,
  multiple = false,
  maxFiles = 5,
  className,
  accept = SUPPORTED_IMAGE_TYPES.join(','),
  maxSize = MAX_IMAGE_SIZE,
  disabled = false,
  placeholder = 'Click to upload or drag and drop',
  uploadContext = 'event'
}: ImageUploadProps) {
  const [isDragOver, setIsDragOver] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const currentImages = Array.isArray(value) ? value : value ? [value] : []

  const validateFile = (file: File): string | null => {
    if (!SUPPORTED_IMAGE_TYPES.includes(file.type)) {
      return 'File type not supported. Please use JPG, PNG, WebP, or GIF.'
    }
    if (file.size > maxSize) {
      return `File size too large. Max size is ${Math.round(maxSize / 1024 / 1024)}MB.`
    }
    return null
  }

  const uploadToServer = async (file: File): Promise<string> => {
    try {
      if (uploadContext === 'avatar') {
        const response = await uploadService.uploadAvatar(file)
        if (response?.data?.url) return response.data.url
      } else if (uploadContext === 'post') {
        const response = await uploadService.uploadPostImages([file])
        if (response?.data?.[0]?.url) return response.data[0].url
      } else {
        const response = await uploadService.uploadEventImages([file])
        if (response?.data?.[0]?.url) return response.data[0].url
      }
      throw new Error('No URL returned from server')
    } catch (err) {
      console.error('Failed to upload image to server:', err)
      throw new Error('Failed to upload image')
    }
  }

  const handleFiles = useCallback(async (files: FileList) => {
    if (disabled) return

    setError(null)
    const fileArray = Array.from(files)

    // Validate files
    for (const file of fileArray) {
      const validationError = validateFile(file)
      if (validationError) {
        setError(validationError)
        return
      }
    }

    // Check max files limit
    if (multiple && currentImages.length + fileArray.length > maxFiles) {
      setError(`Maximum ${maxFiles} files allowed`)
      return
    }

    try {
      setIsUploading(true)

      if (multiple) {
        // Upload multiple files
        const uploadPromises = fileArray.map(file => uploadToCloudinary(file))
        const uploadedUrls = await Promise.all(uploadPromises)
        const newImages = [...currentImages, ...uploadedUrls]
        onChange(newImages.slice(0, maxFiles))
      } else {
        // Upload single file
        const uploadedUrl = await uploadToCloudinary(fileArray[0])
        onChange(uploadedUrl)
      }
    } catch (err) {
      console.error('Upload error:', err)
      setError('Failed to upload image. Please try again.')
    } finally {
      setIsUploading(false)
    }
  }, [currentImages, disabled, multiple, maxFiles, onChange])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)

    if (e.dataTransfer.files) {
      handleFiles(e.dataTransfer.files)
    }
  }, [handleFiles])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }, [])

  const handleClick = () => {
    if (!disabled) {
      fileInputRef.current?.click()
    }
  }

  const removeImage = (index: number) => {
    if (disabled) return

    if (multiple) {
      const newImages = currentImages.filter((_, i) => i !== index)
      onChange(newImages.length > 0 ? newImages : null)
    } else {
      onChange(null)
    }
  }

  return (
    <div className={cn('w-full', className)}>
      {/* Upload Area */}
      {(!multiple || currentImages.length < maxFiles) && (
        <motion.div
          className={cn(
            'relative border-2 border-dashed rounded-lg p-6 transition-colors cursor-pointer',
            isDragOver ? 'border-primary bg-primary/5' : 'border-gray-300 hover:border-primary/50',
            disabled && 'opacity-50 cursor-not-allowed',
            error && 'border-red-300 bg-red-50'
          )}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={handleClick}
          whileHover={disabled ? {} : { scale: 1.02 }}
          whileTap={disabled ? {} : { scale: 0.98 }}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept={accept}
            multiple={multiple}
            onChange={(e) => e.target.files && handleFiles(e.target.files)}
            className="hidden"
            disabled={disabled}
          />

          <div className="text-center">
            {isUploading ? (
              <div className="flex flex-col items-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                <p className="mt-2 text-sm text-gray-600">Uploading...</p>
              </div>
            ) : (
              <>
                <Upload className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                <p className="text-sm text-gray-600 mb-1">{placeholder}</p>
                <p className="text-xs text-gray-400">
                  {multiple ? `Up to ${maxFiles} files` : 'Single file'} • Max {Math.round(maxSize / 1024 / 1024)}MB
                </p>
              </>
            )}
          </div>
        </motion.div>
      )}

      {/* Error Message */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-2 flex items-center text-sm text-red-600"
        >
          <AlertCircle className="h-4 w-4 mr-1" />
          {error}
        </motion.div>
      )}

      {/* Image Preview */}
      {currentImages.length > 0 && (
        <div className={cn(
          'mt-4',
          multiple ? 'grid grid-cols-2 md:grid-cols-3 gap-4' : 'flex justify-center'
        )}>
          {currentImages.map((imageUrl, index) => (
            <motion.div
              key={imageUrl}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="relative group"
            >
              <div className="relative aspect-square rounded-lg overflow-hidden bg-gray-100">
                {/* Use standard img to support both Cloudinary URLs and local /uploads paths gracefully */}
                <img
                  src={imageUrl}
                  alt={`Upload ${index + 1}`}
                  className="object-cover w-full h-full"
                />
                {!disabled && (
                  <Button
                    size="sm"
                    variant="destructive"
                    className="absolute top-2 right-2 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => {
                      e.stopPropagation()
                      removeImage(index)
                    }}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}