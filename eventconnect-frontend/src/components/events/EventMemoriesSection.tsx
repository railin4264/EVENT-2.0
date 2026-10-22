'use client'

import { useState, useRef, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Camera, Heart, Trash2, Plus, Lock, X, UploadCloud, Loader2, Sparkles, AlertCircle } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import { apiClient } from '@/lib/api/client'
import { useAuthStore } from '@/stores/authStore'
import { getImageUrl, formatDate } from '@/lib/utils'
import { PrivateMemoryImage } from './PrivateMemoryImage'

export interface EventMemory {
  _id: string
  user: {
    _id: string
    firstName?: string
    lastName?: string
    username?: string
    avatar?: string
  }
  imageUrl: string
  caption?: string
  likesCount: number
  hasLiked: boolean
  isOwner: boolean
  createdAt: string
}

interface EventMemoriesSectionProps {
  eventId: string
  isAttendee: boolean
  isOrganizer?: boolean
}

export function EventMemoriesSection({ eventId, isAttendee, isOrganizer }: EventMemoriesSectionProps) {
  const queryClient = useQueryClient()
  const { user, isAuthenticated } = useAuthStore()
  const memoryQueryKey = ['event-memories', eventId, user?.id || user?._id]

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string>('')
  const [caption, setCaption] = useState<string>('')
  const [lightboxMemory, setLightboxMemory] = useState<EventMemory | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => () => { if (previewUrl.startsWith('blob:')) URL.revokeObjectURL(previewUrl) }, [previewUrl])

  // Query shared memories
  const { data: memories = [], isLoading, error } = useQuery<EventMemory[]>({
    queryKey: memoryQueryKey,
    queryFn: async () => {
      const res = await apiClient.get(`/events/${eventId}/memories`)
      return res.data?.data || []
    },
    enabled: isAuthenticated && (isAttendee || isOrganizer),
    staleTime: 10_000
  })

  // Mutation: Add memory
  const addMemoryMutation = useMutation({
    mutationFn: async ({ file, caption }: { file: File; caption?: string }) => {
      const formData = new FormData()
      formData.append('memoryImage', file)
      if (caption) formData.append('caption', caption)
      const res = await apiClient.post(`/events/${eventId}/memories`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      return res.data
    },
    onSuccess: () => {
      toast.success('📸 ¡Recuerdo compartido con éxito en el álbum!')
      setIsModalOpen(false)
      setSelectedImageFile(null)
      setPreviewUrl('')
      setCaption('')
      queryClient.invalidateQueries({ queryKey: ['event-memories', eventId] })
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Error al subir recuerdo')
    }
  })

  // Mutation: Like memory
  const toggleLikeMutation = useMutation({
    mutationFn: async (memoryId: string) => {
      const res = await apiClient.post(`/events/${eventId}/memories/${memoryId}/like`)
      return { memoryId, ...res.data }
    },
    onMutate: async (memoryId) => {
      await queryClient.cancelQueries({ queryKey: ['event-memories', eventId] })
      const previousMemories = queryClient.getQueryData<EventMemory[]>(memoryQueryKey)
      if (previousMemories) {
        queryClient.setQueryData<EventMemory[]>(
          memoryQueryKey,
          previousMemories.map(m => {
            if (m._id === memoryId) {
              const hasLiked = !m.hasLiked
              return {
                ...m,
                hasLiked,
                likesCount: hasLiked ? m.likesCount + 1 : Math.max(0, m.likesCount - 1)
              }
            }
            return m
          })
        )
      }
      return { previousMemories }
    },
    onError: (_err, _memoryId, context) => {
      if (context?.previousMemories) {
        queryClient.setQueryData(memoryQueryKey, context.previousMemories)
      }
      toast.error('No se pudo registrar la reacción')
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['event-memories', eventId] })
    }
  })

  // Mutation: Delete memory
  const deleteMemoryMutation = useMutation({
    mutationFn: async (memoryId: string) => {
      const res = await apiClient.delete(`/events/${eventId}/memories/${memoryId}`)
      return res.data
    },
    onSuccess: () => {
      toast.success('Recuerdo eliminado')
      if (lightboxMemory) setLightboxMemory(null)
      queryClient.invalidateQueries({ queryKey: ['event-memories', eventId] })
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Error al eliminar recuerdo')
    }
  })

  // Handle file select
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
        toast.error('Selecciona una foto JPEG, PNG o WebP')
        return
      }
      if (file.size > 10 * 1024 * 1024) {
        toast.error('La imagen no debe superar los 10 MB')
        return
      }
      setSelectedImageFile(file)
      setPreviewUrl(URL.createObjectURL(file))
    }
  }

  // Handle submit memory
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedImageFile) {
      toast.error('Selecciona una foto para compartir')
      return
    }
    addMemoryMutation.mutate({ file: selectedImageFile, caption: caption.trim() || undefined })
  }

  // If user is neither attendee nor organizer: display locked teaser card
  if (!isAuthenticated || (!isAttendee && !isOrganizer)) {
    return (
      <div className="glass border-white/10 rounded-3xl p-6 sm:p-8 backdrop-blur-xl bg-white/5 shadow-xl relative overflow-hidden">
        <div className="absolute -right-12 -top-12 w-48 h-48 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center shrink-0 text-purple-400">
            <Lock className="w-6 h-6" />
          </div>
          <div className="text-center sm:text-left flex-1">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/15 border border-purple-500/30 text-purple-300 text-xs font-bold mb-2">
              <Camera className="w-3.5 h-3.5" />
              <span>Recuerdos Compartidos · Álbum Privado</span>
            </div>
            <h3 className="text-lg font-bold text-foreground">Álbum exclusivo para asistentes confirmados</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              El álbum está disponible para asistentes confirmados y organizadores. Únete al evento o adquiere tu entrada para compartir tus fotos.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <section className="glass border-white/10 rounded-3xl p-6 sm:p-8 backdrop-blur-xl bg-white/5 shadow-xl relative overflow-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-pink-500/15 border border-pink-500/30 text-pink-300 text-xs font-bold mb-2">
            <Camera className="w-3.5 h-3.5" />
            <span>Recuerdos Compartidos</span>
            <span className="w-1 h-1 rounded-full bg-pink-400" />
            <span>Álbum Privado ({memories.length})</span>
          </div>
          <h3 className="text-xl font-extrabold text-foreground tracking-tight">
            Fotos y momentos del coro
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Solo visible para quienes asisten o colaboran en este evento.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white font-bold text-sm shadow-lg shadow-pink-500/20 transition-all hover:scale-105 active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>Subir recuerdo</span>
        </button>
      </div>

      {/* Grid of memories */}
      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="aspect-square rounded-2xl bg-white/5 border border-white/10 animate-pulse" />
          ))}
        </div>
      ) : error ? (
        <p role="alert" className="rounded-2xl border border-red-400/20 p-5 text-sm text-red-300">No pudimos cargar el álbum. Comprueba tu acceso e inténtalo de nuevo.</p>
      ) : memories.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/15 p-8 text-center bg-white/[0.02]">
          <Camera className="w-10 h-10 mx-auto text-muted-foreground/50 mb-3" />
          <p className="text-base font-bold text-foreground">Aún no hay fotos en este álbum</p>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
            ¿Fuiste o estás en el evento? Sé la primera persona en subir un momento memorable para el grupo.
          </p>
          <button
            onClick={() => setIsModalOpen(true)}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-bold text-foreground transition"
          >
            <Plus className="w-3.5 h-3.5" />
            Subir la primera foto
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {memories.map((memory) => {
            const authorName = memory.user?.firstName || memory.user?.username || 'Asistente'
            const authorAvatar = memory.user?.avatar ? getImageUrl(memory.user.avatar) : '/default-avatar.png'
            const isMine = memory.isOwner || (user?.id && memory.user?._id === user.id)

            return (
              <motion.div
                key={memory._id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="group relative aspect-square rounded-2xl overflow-hidden bg-black/40 border border-white/10 cursor-pointer shadow-md hover:shadow-xl transition-all"
                onClick={() => setLightboxMemory(memory)}
              >
                <PrivateMemoryImage
                  path={memory.imageUrl}
                  alt={memory.caption || 'Recuerdo del evento'}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />

                {/* Overlay gradient */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20 opacity-90 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity flex flex-col justify-between p-3" />

                {/* Top author info on hover */}
                <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between opacity-0 sm:group-hover:opacity-100 transition-opacity">
                  <div className="flex items-center gap-1.5 bg-black/60 backdrop-blur-md px-2 py-1 rounded-full border border-white/10">
                    <img src={authorAvatar} alt="" className="w-4 h-4 rounded-full object-cover" />
                    <span className="text-[11px] font-semibold text-white truncate max-w-[80px]">{authorName}</span>
                  </div>

                  {(isMine || isOrganizer) && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        if (confirm('¿Eliminar este recuerdo?')) {
                          deleteMemoryMutation.mutate(memory._id)
                        }
                      }}
                      className="p-1.5 rounded-full bg-red-500/80 hover:bg-red-600 text-white transition backdrop-blur-sm"
                      title="Eliminar recuerdo"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Bottom caption and like */}
                <div className="absolute bottom-2.5 left-2.5 right-2.5 flex items-end justify-between gap-2">
                  <p className="text-[11px] text-white/90 line-clamp-2 drop-shadow-sm font-medium">
                    {memory.caption}
                  </p>

                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      toggleLikeMutation.mutate(memory._id)
                    }}
                    className={`flex items-center gap-1 px-2 py-1 rounded-full backdrop-blur-md border text-xs font-bold transition shrink-0 ${
                      memory.hasLiked
                        ? 'bg-red-500/30 border-red-500/60 text-red-400'
                        : 'bg-black/60 border-white/10 text-white hover:bg-black/80'
                    }`}
                  >
                    <Heart className={`w-3.5 h-3.5 ${memory.hasLiked ? 'fill-current' : ''}`} />
                    <span>{memory.likesCount}</span>
                  </button>
                </div>
              </motion.div>
            )
          })}
        </div>
      )}

      {/* Upload Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg rounded-3xl glass border-white/20 bg-slate-900/95 p-6 shadow-2xl relative"
            >
              <div className="flex items-center justify-between pb-4 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <Camera className="w-5 h-5 text-pink-400" />
                  <h4 className="text-lg font-bold text-foreground">Compartir recuerdo</h4>
                </div>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="p-1 rounded-full text-muted-foreground hover:text-foreground transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="mt-4 space-y-4">
                {/* File picker / dropzone */}
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
                    Foto del momento
                  </label>

                  {previewUrl ? (
                    <div className="relative aspect-video rounded-2xl overflow-hidden border border-white/20 group">
                      <img src={previewUrl} alt="Vista previa" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedImageFile(null)
                          setPreviewUrl('')
                          if (fileInputRef.current) fileInputRef.current.value = ''
                        }}
                        className="absolute top-2 right-2 p-1.5 rounded-full bg-black/70 text-white hover:bg-black transition"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="border-2 border-dashed border-white/20 hover:border-pink-500/50 rounded-2xl p-6 text-center cursor-pointer transition bg-white/[0.02] hover:bg-white/[0.04]"
                    >
                      <UploadCloud className="w-8 h-8 mx-auto text-pink-400 mb-2" />
                      <p className="text-sm font-semibold text-foreground">Haz clic para elegir una foto</p>
                      <p className="text-xs text-muted-foreground mt-0.5">JPG, PNG o WEBP (máx. 10 MB)</p>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        className="hidden"
                        onChange={handleFileChange}
                      />
                    </div>
                  )}
                </div>

                <p className="text-xs text-muted-foreground">JPEG, PNG o WebP, hasta 10 MB. El álbum requiere acceso al evento; las personas con acceso pueden guardar sus fotos.</p>

                {/* Caption */}
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">
                    Pie de foto / Comentario (opcional)
                  </label>
                  <textarea
                    rows={2}
                    maxLength={200}
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    placeholder="Ej. ¡Qué coro tan aperísimo anoche! 🥂🔥"
                    className="w-full p-3.5 rounded-xl bg-white/5 border border-white/10 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-pink-500"
                  />
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2.5 rounded-xl border border-white/10 text-xs font-bold text-muted-foreground hover:text-foreground transition"
                  >
                    Cancelar
                  </button>

                  <button
                    type="submit"
                    disabled={addMemoryMutation.isPending || !selectedImageFile}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white text-xs font-bold shadow-lg shadow-pink-500/20 disabled:opacity-50 transition"
                  >
                    {addMemoryMutation.isPending ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Publicando...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Compartir en el álbum</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Lightbox Modal */}
      <AnimatePresence>
        {lightboxMemory && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md"
            onClick={() => setLightboxMemory(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              onClick={(e) => e.stopPropagation()}
              className="max-w-3xl w-full rounded-3xl overflow-hidden glass border-white/20 bg-slate-900/90 shadow-2xl flex flex-col max-h-[90vh]"
            >
              {/* Image viewport */}
              <div className="relative flex-1 bg-black flex items-center justify-center overflow-hidden min-h-[300px]">
                <PrivateMemoryImage
                  path={lightboxMemory.imageUrl}
                  alt={lightboxMemory.caption || 'Foto del coro'}
                  className="max-h-[60vh] w-auto max-w-full object-contain"
                />
                <button
                  onClick={() => setLightboxMemory(null)}
                  className="absolute top-4 right-4 p-2 rounded-full bg-black/60 text-white hover:bg-black transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Lightbox details */}
              <div className="p-5 flex items-center justify-between gap-4 border-t border-white/10">
                <div className="flex items-center gap-3">
                  <img
                    src={lightboxMemory.user?.avatar ? getImageUrl(lightboxMemory.user.avatar) : '/default-avatar.png'}
                    alt=""
                    className="w-10 h-10 rounded-full object-cover border border-white/20"
                  />
                  <div>
                    <p className="text-sm font-bold text-foreground">
                      {lightboxMemory.user?.firstName || lightboxMemory.user?.username || 'Asistente al evento'}
                    </p>
                    <p className="text-xs text-muted-foreground">{lightboxMemory.caption || 'Recuerdo del coro'}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleLikeMutation.mutate(lightboxMemory._id)}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-xl border text-xs font-bold transition ${
                      lightboxMemory.hasLiked
                        ? 'bg-red-500/20 border-red-500/40 text-red-400'
                        : 'bg-white/5 border-white/10 text-foreground hover:bg-white/10'
                    }`}
                  >
                    <Heart className={`w-4 h-4 ${lightboxMemory.hasLiked ? 'fill-current' : ''}`} />
                    <span>{lightboxMemory.likesCount}</span>
                  </button>

                  {(lightboxMemory.isOwner || isOrganizer) && (
                    <button
                      onClick={() => {
                        if (confirm('¿Eliminar esta foto definitivamente?')) {
                          deleteMemoryMutation.mutate(lightboxMemory._id)
                        }
                      }}
                      className="p-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 transition"
                      title="Eliminar recuerdo"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </section>
  )
}
