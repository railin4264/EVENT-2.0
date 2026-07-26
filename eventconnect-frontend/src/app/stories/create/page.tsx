'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { useMutation } from '@tanstack/react-query'
import { ChevronLeft, Camera, Image as ImageIcon, Type, Star, FileText, MapPin, Send, X, Plus, Smile, Palette, Sparkles } from 'lucide-react'

// Aliases para iconos no disponibles en lucide-react 0.408.0
const Video = Camera
const Music = FileText
const Tag = FileText
import { useAuthStore } from '@/stores/authStore'
import { apiClient } from '@/lib/api/client'
import toast from 'react-hot-toast'

interface StoryCreationData {
  type: 'image' | 'video' | 'text'
  content?: string
  mediaFile?: File
  backgroundColor?: string
  textColor?: string
  fontSize?: 'small' | 'medium' | 'large'
  music?: {
    title: string
    artist: string
    url: string
  }
  location?: {
    name: string
    coordinates: [number, number]
  }
  tags?: string[]
  eventId?: string
  tribeId?: string
  duration?: number
}

export default function CreateStoryPage() {
  const router = useRouter()
  const { user, isAuthenticated } = useAuthStore()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const videoInputRef = useRef<HTMLInputElement>(null)

  const [storyData, setStoryData] = useState<StoryCreationData>({
    type: 'text',
    backgroundColor: '#6366f1',
    textColor: '#ffffff',
    fontSize: 'medium',
    tags: [],
    duration: 15
  })

  const [textContent, setTextContent] = useState('')
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [showColorPicker, setShowColorPicker] = useState(false)
  const [currentTag, setCurrentTag] = useState('')

  const colors = [
    '#6366f1', '#8b5cf6', '#ec4899', '#ef4444', '#f59e0b',
    '#10b981', '#06b6d4', '#3b82f6', '#6366f1', '#8b5cf6',
    '#000000', '#374151', '#ffffff', '#f3f4f6'
  ]

  const createStoryMutation = useMutation({
    mutationFn: async (data: StoryCreationData) => {
      const formData = new FormData()

      formData.append('type', data.type)
      if (data.content) formData.append('content', data.content)
      if (data.mediaFile) formData.append('media', data.mediaFile)
      if (data.backgroundColor || data.textColor || data.fontSize) {
        formData.append('style', JSON.stringify({
          backgroundColor: data.backgroundColor,
          textColor: data.textColor,
          fontSize: data.fontSize
        }))
      }
      if (data.duration) formData.append('duration', data.duration.toString())
      if (data.tags?.length) formData.append('tags', JSON.stringify(data.tags))
      if (data.location) formData.append('location', JSON.stringify(data.location))
      if (data.music) formData.append('music', JSON.stringify(data.music))
      if (data.eventId) formData.append('eventId', data.eventId)
      if (data.tribeId) formData.append('tribeId', data.tribeId)

      const response = await apiClient.post('/stories', formData)
      return response.data
    },
    onSuccess: () => {
      toast.success('¡Historia creada exitosamente!')
      router.push('/stories')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Error al crear la historia')
    }
  })

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'video') => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file size (max 50MB)
    if (file.size > 50 * 1024 * 1024) {
      toast.error('El archivo es demasiado grande. Máximo 50MB.')
      return
    }

    // Validate file type
    const validImageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
    const validVideoTypes = ['video/mp4', 'video/webm', 'video/mov', 'video/avi']

    if (type === 'image' && !validImageTypes.includes(file.type)) {
      toast.error('Formato de imagen no válido. Usa JPG, PNG, GIF o WebP.')
      return
    }

    if (type === 'video' && !validVideoTypes.includes(file.type)) {
      toast.error('Formato de video no válido. Usa MP4, WebM, MOV o AVI.')
      return
    }

    setStoryData(prev => ({ ...prev, type, mediaFile: file }))

    // Create preview URL
    const url = URL.createObjectURL(file)
    setPreviewUrl(url)
  }

  const handleAddTag = () => {
    if (currentTag.trim() && !storyData.tags?.includes(currentTag.trim())) {
      setStoryData(prev => ({
        ...prev,
        tags: [...(prev.tags || []), currentTag.trim()]
      }))
      setCurrentTag('')
    }
  }

  const removeTag = (tagToRemove: string) => {
    setStoryData(prev => ({
      ...prev,
      tags: prev.tags?.filter(tag => tag !== tagToRemove)
    }))
  }

  const handleCreateStory = () => {
    if (storyData.type === 'text' && !textContent.trim()) {
      toast.error('Escribe algo para tu historia')
      return
    }

    if ((storyData.type === 'image' || storyData.type === 'video') && !storyData.mediaFile) {
      toast.error('Selecciona un archivo para tu historia')
      return
    }

    const finalData = {
      ...storyData,
      content: storyData.type === 'text' ? textContent : undefined
    }

    createStoryMutation.mutate(finalData)
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-transparent flex items-center justify-center">
        <div className="text-center text-foreground glass bg-white/5 border border-white/10 p-12 rounded-3xl backdrop-blur-xl">
          <h1 className="text-2xl font-extrabold mb-6">Inicia sesión para crear historias</h1>
          <button
            onClick={() => router.push('/login')}
            className="px-8 py-3 bg-primary hover:bg-primary/90 font-bold rounded-xl transition-all shadow-xl hover:shadow-primary/30"
          >
            Iniciar Sesión
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-transparent pb-10">
      {/* Header */}
      <div className="glass bg-white/5 border-b border-white/10 sticky top-0 z-10 backdrop-blur-xl">
        <div className="flex items-center justify-between p-4 max-w-7xl mx-auto">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-white/10 rounded-full transition-colors"
          >
            <ChevronLeft className="w-6 h-6 text-foreground" />
          </button>
          <h1 className="text-xl font-extrabold text-foreground tracking-tight">Crear Historia</h1>
          <button
            onClick={handleCreateStory}
            disabled={createStoryMutation.isPending}
            className="px-6 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl font-bold transition-all shadow-lg hover:shadow-primary/30 disabled:opacity-50 flex items-center gap-2"
          >
            {createStoryMutation.isPending ? (
              <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            Compartir
          </button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row h-[calc(100vh-73px)] max-w-7xl mx-auto container-padding gap-6 mt-6">
        {/* Preview Area */}
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="relative w-full max-w-sm aspect-[9/16] glass bg-black/40 border border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl">
            {/* Preview Content */}
            {storyData.type === 'text' && (
              <div
                className="w-full h-full flex items-center justify-center p-6"
                style={{ backgroundColor: storyData.backgroundColor }}
              >
                <textarea
                  value={textContent}
                  onChange={(e) => setTextContent(e.target.value)}
                  placeholder="Escribe tu historia..."
                  className="w-full h-full bg-transparent border-none outline-none resize-none text-center flex items-center justify-center placeholder:text-white/50"
                  style={{
                    color: storyData.textColor,
                    fontSize: storyData.fontSize === 'small' ? '1rem' : storyData.fontSize === 'large' ? '1.5rem' : '1.25rem'
                  }}
                />
              </div>
            )}

            {storyData.type === 'image' && previewUrl && (
              <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
            )}

            {storyData.type === 'video' && previewUrl && (
              <video src={previewUrl} className="w-full h-full object-cover" controls muted loop />
            )}

            {/* User info overlay */}
            <div className="absolute top-6 left-6 flex items-center gap-3">
              <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center border-2 border-white/50 shadow-lg">
                <span className="text-primary-foreground font-extrabold text-sm">
                  {user?.firstName?.[0] || '?'}
                </span>
              </div>
              <span className="text-white drop-shadow-md font-bold text-sm tracking-wide">
                {user?.firstName} {user?.lastName}
              </span>
            </div>

            {/* Duration indicator */}
            <div className="absolute top-6 right-6">
              <span className="text-white text-xs font-bold bg-black/40 backdrop-blur-md border border-white/20 px-3 py-1.5 rounded-full shadow-lg">
                {storyData.duration}s
              </span>
            </div>
          </div>
        </div>

        {/* Controls Panel */}
        <div className="w-full lg:w-96 glass bg-white/5 border border-white/10 p-6 rounded-3xl space-y-8 overflow-y-auto hidden-scrollbar backdrop-blur-xl">
          {/* Media Type Selection */}
          <div>
            <h3 className="text-sm font-extrabold text-foreground mb-4 uppercase tracking-wider">Contenido</h3>
            <div className="grid grid-cols-3 gap-3">
              <button
                onClick={() => setStoryData(prev => ({ ...prev, type: 'text' }))}
                className={`p-4 rounded-2xl flex flex-col items-center gap-2 transition-all font-bold ${storyData.type === 'text' ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20 scale-105' : 'glass bg-white/5 hover:bg-white/10 text-muted-foreground'
                  }`}
              >
                <Type className="w-6 h-6" />
                <span className="text-xs">Texto</span>
              </button>

              <button
                onClick={() => fileInputRef.current?.click()}
                className={`p-4 rounded-2xl flex flex-col items-center gap-2 transition-all font-bold ${storyData.type === 'image' ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20 scale-105' : 'glass bg-white/5 hover:bg-white/10 text-muted-foreground'
                  }`}
              >
                <ImageIcon className="w-6 h-6" />
                <span className="text-xs">Imagen</span>
              </button>

              <button
                onClick={() => videoInputRef.current?.click()}
                className={`p-4 rounded-2xl flex flex-col items-center gap-2 transition-all font-bold ${storyData.type === 'video' ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20 scale-105' : 'glass bg-white/5 hover:bg-white/10 text-muted-foreground'
                  }`}
              >
                <Video className="w-6 h-6" />
                <span className="text-xs">Video</span>
              </button>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={(e) => handleFileSelect(e, 'image')}
              className="hidden"
            />
            <input
              ref={videoInputRef}
              type="file"
              accept="video/*"
              onChange={(e) => handleFileSelect(e, 'video')}
              className="hidden"
            />
          </div>

          {/* Text Customization */}
          {storyData.type === 'text' && (
            <>
              <div className="pt-4 border-t border-white/5">
                <h3 className="text-sm font-extrabold text-foreground mb-4 uppercase tracking-wider">Fondo</h3>
                <div className="grid grid-cols-7 gap-3">
                  {colors.map((color) => (
                    <button
                      key={color}
                      onClick={() => setStoryData(prev => ({ ...prev, backgroundColor: color }))}
                      className={`w-10 h-10 rounded-full border-2 transition-transform hover:scale-110 shadow-md ${storyData.backgroundColor === color ? 'border-primary ring-2 ring-primary ring-offset-2 ring-offset-background scale-110' : 'border-transparent'
                        }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-white/5">
                <h3 className="text-sm font-extrabold text-foreground mb-4 uppercase tracking-wider">Texto</h3>
                <div className="grid grid-cols-7 gap-3">
                  {colors.map((color) => (
                    <button
                      key={color}
                      onClick={() => setStoryData(prev => ({ ...prev, textColor: color }))}
                      className={`w-10 h-10 rounded-full border-2 transition-transform hover:scale-110 shadow-md ${storyData.textColor === color ? 'border-white ring-2 ring-white ring-offset-2 ring-offset-background scale-110' : 'border-transparent'
                        }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-white/5">
                <h3 className="text-sm font-extrabold text-foreground mb-4 uppercase tracking-wider">Tamaño de Texto</h3>
                <div className="grid grid-cols-3 gap-3">
                  {['small', 'medium', 'large'].map((size) => (
                    <button
                      key={size}
                      onClick={() => setStoryData(prev => ({ ...prev, fontSize: size as any }))}
                      className={`p-3 rounded-xl text-sm capitalize transition-all font-bold ${storyData.fontSize === size ? 'bg-primary text-primary-foreground shadow-lg' : 'glass bg-white/5 hover:bg-white/10 text-muted-foreground'
                        }`}
                    >
                      {size === 'small' ? 'Pequeño' : size === 'medium' ? 'Medio' : 'Grande'}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Duration */}
          <div className="pt-4 border-t border-white/5">
            <h3 className="text-sm font-extrabold text-foreground mb-4 uppercase tracking-wider">Duración</h3>
            <div className="grid grid-cols-3 gap-3">
              {[5, 10, 15].map((duration) => (
                <button
                  key={duration}
                  onClick={() => setStoryData(prev => ({ ...prev, duration }))}
                  className={`p-3 rounded-xl text-sm transition-all font-bold ${storyData.duration === duration ? 'bg-primary text-primary-foreground shadow-lg' : 'glass bg-white/5 hover:bg-white/10 text-muted-foreground'
                    }`}
                >
                  {duration}s
                </button>
              ))}
            </div>
          </div>

          {/* Tags */}
          <div className="pt-4 border-t border-white/5">
            <h3 className="text-sm font-extrabold text-foreground mb-4 uppercase tracking-wider">Etiquetas</h3>
            <div className="flex gap-2 mb-4">
              <input
                type="text"
                value={currentTag}
                onChange={(e) => setCurrentTag(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
                placeholder="Añadir..."
                className="flex-1 p-3 glass bg-white/5 border border-white/10 rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <button
                onClick={handleAddTag}
                className="p-3 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl transition-all shadow-lg"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {storyData.tags?.map((tag) => (
                <span
                  key={tag}
                  className="px-3 py-1.5 glass bg-white/10 border border-white/10 rounded-lg text-xs font-bold flex items-center gap-2 text-foreground"
                >
                  #{tag}
                  <button
                    onClick={() => removeTag(tag)}
                    className="hover:text-red-400 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}