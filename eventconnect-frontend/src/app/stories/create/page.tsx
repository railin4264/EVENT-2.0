'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ChevronLeft, Camera, Image as ImageIcon, Type, Star, FileText, MapPin, Send, X, Plus, Smile, Palette, Sparkles } from 'lucide-react'

// Aliases para iconos no disponibles en lucide-react 0.408.0
const Video = Camera
const Music = FileText
const Tag = FileText
import { useAuthStore } from '@/stores/authStore'
import { apiClient } from '@/lib/api/client'
import toast from 'react-hot-toast'
import { makeStoryPayload, validateStoryImage } from '@/components/stories/story-contract'

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
  const queryClient = useQueryClient()
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
    '#10b981', '#06b6d4', '#3b82f6',
    '#000000', '#374151', '#ffffff', '#f3f4f6'
  ]

  const createStoryMutation = useMutation({
    mutationFn: async (data: StoryCreationData) => {
      const payload = makeStoryPayload(data.content || '', {
        backgroundColor: data.backgroundColor, textColor: data.textColor, fontSize: data.fontSize
      }, data.type === 'text' ? undefined : data.mediaFile, data.eventId)
      const response = await apiClient.post('/stories', payload, payload instanceof FormData ? { headers: { 'Content-Type': undefined } } : undefined)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stories'] })
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

    const validationError = validateStoryImage(file)
    if (validationError) { toast.error(validationError); return }
    setStoryData(prev => ({ ...prev, type, mediaFile: file }))

    // Create preview URL
    const url = URL.createObjectURL(file)
    setPreviewUrl(url)
  }

  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl) }, [previewUrl])

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
      content: textContent.trim()
    }

    createStoryMutation.mutate(finalData)
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-transparent flex items-center justify-center">
        <div className="text-center text-foreground glass bg-white/5 border border-white/10 p-12 rounded-3xl backdrop-blur-xl">
          <h1 className="text-2xl font-extrabold mb-6">Inicia sesión para crear historias</h1>
          <button
            onClick={() => router.push('/login?redirect=%2Fstories%2Fcreate')}
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
            aria-label="Volver a historias" onClick={() => router.push('/stories')}
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

      <div className="flex flex-col lg:flex-row min-h-[calc(100vh-73px)] max-w-7xl mx-auto container-padding gap-6 mt-6">
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
                  aria-label="Texto de tu historia"
                  maxLength={2000}
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


          </div>
        </div>

        {/* Controls Panel */}
        <div className="w-full lg:w-96 glass bg-white/5 border border-white/10 p-6 rounded-3xl space-y-8 overflow-y-auto hidden-scrollbar backdrop-blur-xl">
          {/* Media Type Selection */}
          <div>
            <h3 className="text-sm font-extrabold text-foreground mb-4 uppercase tracking-wider">Contenido</h3>
            <div className="grid grid-cols-2 gap-3">
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
                <div className="grid grid-cols-6 gap-2">
                  {colors.map((color) => (
                    <button
                      key={color}
                      aria-label={`Elegir color ${color}`}
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
                <div className="grid grid-cols-6 gap-2">
                  {colors.map((color) => (
                    <button
                      key={color}
                      aria-label={`Elegir color ${color}`}
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

          <p className="text-sm text-muted-foreground">Tus historias estarán disponibles durante 24 horas. Imágenes JPG, PNG, GIF o WebP de hasta 10 MB.</p>
        </div>
      </div>
    </div>
  )
}
