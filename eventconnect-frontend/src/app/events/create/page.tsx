'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import type { EventImage } from '@/types/api.types'
import { motion, AnimatePresence } from 'framer-motion'
import { useMutation } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { Calendar, Clock, MapPin, Users, Star, Image as ImageIcon, Globe, Lock, Plus, X, Check, ChevronLeft, Camera, CheckCircle, AlertCircle, Info, Settings, Share, ChevronDown, FileText, DollarSign, Tag } from 'lucide-react'
const Save = Check
const Upload = Camera
const Ticket = FileText
import { apiClient } from '@/lib/api/client'
import toast from 'react-hot-toast'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

const eventSchema = z.object({
  title: z.string()
    .min(5, 'El título debe tener al menos 5 caracteres')
    .max(100, 'El título no puede exceder 100 caracteres'),
  description: z.string()
    .min(10, 'La descripción debe tener al menos 10 caracteres'),
  category: z.string()
    .min(1, 'Selecciona una categoría'),
  date: z.string()
    .min(1, 'La fecha es requerida')
    .refine((date) => {
      if (!date) return false;
      const [y, m, d] = date.split('-').map(Number);
      const selectedDate = new Date(y, m - 1, d);
      selectedDate.setHours(0, 0, 0, 0)
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      if (isNaN(selectedDate.getTime())) return false

      return selectedDate.getTime() >= today.getTime();
    }, 'La fecha debe ser hoy o en el futuro'),
  time: z.string()
    .min(1, 'La hora es requerida'),
  endTime: z.string()
    .optional(),
  location: z.object({
    address: z.string()
      .min(1, 'La ubicación es requerida'),
    venue: z.string()
      .optional(),
    coordinates: z.tuple([z.number(), z.number()])
      .optional()
  }),
  price: z.object({
    amount: z.number()
      .min(0, 'El precio no puede ser negativo'),
    currency: z.string()
  }),
  maxAttendees: z.number()
    .min(1, 'Debe permitir al menos 1 asistente')
    .max(10000, 'El máximo de asistentes es 10000'),
  isPrivate: z.boolean(),
  tags: z.array(z.string()),
  ageRestriction: z.object({
    minAge: z.number().min(0).default(0),
    maxAge: z.number().optional(),
    isAdultOnly: z.boolean().default(false)
  }).optional(),
  isVirtual: z.boolean().default(false),
  virtualLink: z.string().optional(),
  accessibility: z.array(z.string()).default([])
})

type EventFormData = z.infer<typeof eventSchema>

interface EventForm {
  title: string
  description: string
  category: string
  date: string
  time: string
  endTime: string
  location: {
    address: string
    venue?: string
    coordinates?: [number, number]
  }
  price: {
    amount: number
    currency: string
  }
  maxAttendees: number
  isPrivate: boolean
  tags: string[]
  images: File[]
  ageRestriction?: {
    minAge: number
    maxAge?: number
    isAdultOnly: boolean
  }
  isVirtual: boolean
  virtualLink?: string
  accessibility: string[]
}

const categories = [
  { id: 'technology', name: 'Tecnología', emoji: '💻', color: 'from-blue-500 to-cyan-500' },
  { id: 'music', name: 'Música', emoji: '🎵', color: 'from-orange-500 to-red-500' },
  { id: 'art', name: 'Arte', emoji: '🖼️', color: 'from-pink-500 to-orange-500' },
  { id: 'food', name: 'Gastronomía', emoji: '🍽️', color: 'from-orange-500 to-yellow-500' },
  { id: 'sports', name: 'Deportes', emoji: '⚽', color: 'from-blue-500 to-green-500' },
  { id: 'education', name: 'Educación', emoji: '📚', color: 'from-indigo-500 to-blue-500' },
  { id: 'business', name: 'Negocios', emoji: '🤝', color: 'from-purple-500 to-blue-500' },
  { id: 'other', name: 'Otro', emoji: '📋', color: 'from-gray-500 to-slate-500' }
]

const currencies = [
  { code: 'MXN', symbol: '$', name: 'Peso Mexicano' },
  { code: 'USD', symbol: '$', name: 'Dólar Americano' },
  { code: 'EUR', symbol: '€', name: 'Euro' }
]

export default function CreateEventPage() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [currentStep, setCurrentStep] = useState(1)
  const [newTag, setNewTag] = useState('')
  const [locationQuery, setLocationQuery] = useState('')
  const [locationSuggestions, setLocationSuggestions] = useState<any[]>([])
  const [showLocationSuggestions, setShowLocationSuggestions] = useState(false)
  const [isSearchingLocation, setIsSearchingLocation] = useState(false)
  const [images, setImages] = useState<File[]>([])
  const [isEnhancing, setIsEnhancing] = useState(false)
  const [enhancedPreview, setEnhancedPreview] = useState<{ title?: string, description?: string } | null>(null)

  const { register, handleSubmit, formState: { errors, isSubmitting }, trigger, watch, setValue } = useForm<EventFormData>({
    resolver: zodResolver(eventSchema),
    mode: 'onChange',
    shouldUnregister: false,
    defaultValues: {
      title: '',
      description: 'Únete a este increíble evento en EventConnect.',
      category: 'technology',
      date: '',
      time: '',
      endTime: '',
      location: {
        address: '',
        venue: ''
      },
      price: {
        amount: 0,
        currency: 'MXN'
      },
      maxAttendees: 50,
      isPrivate: false,
      tags: [],
      ageRestriction: {
        minAge: 0,
        isAdultOnly: false
      },
      isVirtual: false,
      virtualLink: '',
      accessibility: []
    }
  })

  const formData = watch()
  const tags = watch('tags')

  // Function to upload images to backend
  const uploadImages = async (images: File[]): Promise<EventImage[]> => {
    if (images.length === 0) return []

    try {
      // Usamos el servicio centralizado que pasa por nuestro backend seguro
      const { uploadService } = await import('@/lib/api/upload')
      const response = await uploadService.uploadEventImages(images)
      
      if (response && response.data) {
        toast.success(`${response.data.length} imagen(es) subida(s) exitosamente`)
        // Ensure we map the response to the EventImage type correctly
        return response.data.map(img => ({
          url: img.url,
          publicId: (img as any).cloudinary_id || '',
          alt: 'Event Image'
        }))
      }
      return []
    } catch (error) {
      console.error('Image upload failed:', error)
      toast.error('Error al subir imágenes, continuando sin ellas')
      return [] // Return empty array to allow event creation without images
    }
  }

  // Create event mutation
  const createEventMutation = useMutation({
    mutationFn: async (eventData: EventFormData) => {
      // Upload images first if any
      const uploadedImages = await uploadImages(images)

      // Calculate end date/time - if no endTime provided, use same as start time
      const endTimeToUse = eventData.endTime || eventData.time

      // Ensure endDate is at least equal to or after startDate
      const startDate = new Date(`${eventData.date}T${eventData.time}`)
      const endDate = new Date(`${eventData.date}T${endTimeToUse}`)

      if (endDate < startDate) {
        // If endTime is earlier than startTime, assume it's next day
        endDate.setDate(endDate.getDate() + 1)
      }

      // Prepare event data for backend
      const eventForBackend = {
        title: eventData.title,
        description: eventData.description,
        category: eventData.category,
        date: startDate.toISOString(),
        endDate: endDate.toISOString(),
        location: {
          type: 'Point',
          coordinates: eventData.location.coordinates || [0, 0], // Default coordinates if none provided
          address: eventData.location.address || eventData.location.venue || '',
          venue: eventData.location.venue
        },
        images: uploadedImages,
        maxAttendees: eventData.maxAttendees,
        isPrivate: eventData.isPrivate,
        tags: eventData.tags,
        price: {
          amount: eventData.price.amount,
          currency: eventData.price.currency
        },
        ageRestriction: eventData.ageRestriction,
        isVirtual: eventData.isVirtual,
        virtualLink: eventData.virtualLink,
        accessibility: eventData.accessibility,
        createdBy: 'auto' // This will be set by auth middleware in backend
      }

      const response = await apiClient.post('/events', eventForBackend)
      return response.data
    },
    onSuccess: (data) => {
      toast.success('Evento creado exitosamente')
      // Ensure we have a valid ID before navigating
      if (data?._id || data?.event?._id) {
        const eventId = data._id || data.event._id
        router.push(`/events/${eventId}`)
      } else {
        // Fallback to events list if no ID
        router.push('/events')
      }
    },
    onError: (error: any) => {
      console.error('Create event error:', error)
      toast.error(error.response?.data?.message || 'Error al crear el evento')
    }
  })

  const onSubmit = async (data: EventFormData) => {
    console.log('📝 Event form submitted:', data)
    console.log('🖼️ Images to upload:', images)
    console.log('✅ Form validation passed')
    createEventMutation.mutate(data)
  }

  const handleEnhanceWithAI = async () => {
    const currentTitle = watch('title');
    const currentDesc = watch('description');

    if (!currentTitle && !currentDesc) {
      toast.error('Agrega un título o descripción para mejorar con IA');
      return;
    }

    setIsEnhancing(true);
    try {
      const res = await apiClient.post('/ai/enhance-event', { title: currentTitle, description: currentDesc });
      if (res.data?.success) {
        setValue('title', res.data.data.title, { shouldValidate: true });
        setValue('description', res.data.data.description, { shouldValidate: true });
        toast.success('¡Contenido mejorado con IA! ✨');
      }
    } catch (err) {
      toast.error('Error al conectar con la IA');
    } finally {
      setIsEnhancing(false);
    }
  }

  const handleAddTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setValue('tags', [...tags, newTag.trim()], { shouldValidate: true })
      setNewTag('')
    }
  }

  const handleRemoveTag = (index: number) => {
    setValue('tags', tags.filter((_, i) => i !== index), { shouldValidate: true })
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length + images.length > 5) {
      toast.error('Máximo 5 imágenes permitidas')
      return
    }

    setImages([...images, ...files])
  }

  // Search for locations using Google Maps Geocoding API
  const searchLocations = useCallback(async (query: string) => {
    if (query.length < 3) {
      setLocationSuggestions([])
      return
    }

    try {
      setIsSearchingLocation(true)

      const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
      if (!apiKey || apiKey === 'your_google_maps_api_key') {
        throw new Error('Google Maps API key not configured')
      }

      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(query)}&key=${apiKey}`
      )

      if (!response.ok) {
        throw new Error('Failed to search locations')
      }

      const data = await response.json()
      
      if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
        throw new Error(`Google Maps API error: ${data.status}`)
      }

      const suggestions = (data.results || []).map((item: any, index: number) => {
        // Extract relevant information from Google Geocoding response
        let name = item.formatted_address.split(',')[0] // Use first part as name fallback

        // Try to find a better name from address_components
        const route = item.address_components?.find((c: any) => c.types.includes('route'))?.long_name
        const streetNumber = item.address_components?.find((c: any) => c.types.includes('street_number'))?.long_name
        const poi = item.address_components?.find((c: any) => c.types.includes('point_of_interest') || c.types.includes('establishment'))?.long_name

        if (poi) {
          name = poi
        } else if (route && streetNumber) {
          name = `${route} ${streetNumber}` // Standard format
        } else if (route) {
          name = route
        }

        return {
          id: item.place_id || `${index}`,
          name: name || 'Ubicación',
          address: item.formatted_address,
          coordinates: [item.geometry.location.lng, item.geometry.location.lat], // Longitude first
          type: item.types?.[0] || 'location',
          originalData: item
        }
      })

      setLocationSuggestions(suggestions)
    } catch (error) {
      console.error('Error searching locations:', error)

      // Fallback: create a simple suggestion based on user input
      const fallbackSuggestion = [{
        id: 'manual_1',
        name: query,
        address: query,
        coordinates: [0, 0],
        type: 'manual'
      }]

      setLocationSuggestions(fallbackSuggestion)
    } finally {
      setIsSearchingLocation(false)
    }
  }, [])

  const handleLocationSearch = (query: string) => {
    setLocationQuery(query)
    setShowLocationSuggestions(true)

    // Debounce the search to avoid too many API calls
    clearTimeout((window as any).locationSearchTimeout)
      ; (window as any).locationSearchTimeout = setTimeout(() => {
        searchLocations(query)
      }, 500)
  }

  const selectLocation = (suggestion: any) => {
    setValue('location.venue', suggestion.name, { shouldValidate: true })
    setValue('location.address', suggestion.address, { shouldValidate: true })
    setValue('location.coordinates', suggestion.coordinates, { shouldValidate: true })
    setLocationQuery(suggestion.name)
    setShowLocationSuggestions(false)
    setLocationSuggestions([])
  }

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      setShowLocationSuggestions(false)
    }

    if (showLocationSuggestions) {
      document.addEventListener('click', handleClickOutside)
      return () => document.removeEventListener('click', handleClickOutside)
    }
  }, [showLocationSuggestions])

  const steps = [
    { id: 1, title: 'Información Básica', icon: Info },
    { id: 2, title: 'Detalles del Evento', icon: Calendar },
    { id: 3, title: 'Ubicación y Capacidad', icon: MapPin },
    { id: 4, title: 'Precio y Configuración', icon: Settings },
    { id: 5, title: 'Finalizar', icon: Share }
  ]

  const nextStep = () => {
    if (currentStep < steps.length) setCurrentStep(currentStep + 1)
  }

  const prevStep = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1)
  }

  const isStepValid = async () => {
    switch (currentStep) {
      case 1:
        return await trigger(['title', 'description', 'category'])
      case 2:
        return await trigger(['date', 'time'])
      case 3:
        return await trigger(['location.address', 'maxAttendees'])
      case 4:
        return await trigger(['price.amount'])
      case 5:
        return true
      default:
        return true
    }
  }

  const handleNextStep = async () => {
    const valid = await isStepValid()
    if (valid && currentStep < steps.length) {
      setCurrentStep(currentStep + 1)
    }
  }

  return (
    <div className="min-h-screen bg-transparent">
      {/* Header */}
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="sticky top-0 z-50 glass bg-white/5 backdrop-blur-xl border-b border-white/10"
      >
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => router.back()}
              className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </motion.button>

            <div>
              <h1 className="font-bold text-foreground">Crear Evento</h1>
              <p className="text-sm text-muted-foreground">
                Paso {currentStep} de {steps.length}
              </p>
            </div>
          </div>

          <div className="text-sm text-muted-foreground">
            {Math.round((currentStep / steps.length) * 100)}%
          </div>
        </div>

        {/* Progress Bar */}
        <div className="px-4 pb-4">
          <div className="w-full glass bg-white/10 rounded-full h-2">
            <motion.div
              initial={{ width: '0%' }}
              animate={{ width: `${(currentStep / steps.length) * 100}%` }}
              transition={{ duration: 0.5 }}
              className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full"
            />
          </div>
        </div>

        {/* Step Indicators */}
        <div className="px-4 pb-4">
          <div className="flex justify-between">
            {steps.map((step) => {
              const Icon = step.icon
              return (
                <motion.div
                  key={step.id}
                  className={`flex flex-col items-center ${step.id <= currentStep ? 'text-blue-600' : 'text-gray-400 dark:text-gray-500'
                    }`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium transition-colors ${step.id <= currentStep
                    ? 'bg-blue-500 text-white'
                    : 'glass bg-white/10 text-gray-400'
                    }`}>
                    {step.id <= currentStep ? '✓' : step.id}
                  </div>
                  <span className="text-xs mt-1 text-center max-w-16">{step.title}</span>
                </motion.div>
              )
            })}
          </div>
        </div>
      </motion.div>

      {/* Form Content */}
      <div className="max-w-4xl mx-auto px-4 py-6 pb-24">

        <div className="glass border-white/10 rounded-3xl shadow-2xl p-6 lg:p-8 backdrop-blur-xl bg-white/5">
          <form
            id="create-event-form"
            onSubmit={handleSubmit(
              onSubmit,
              (errors) => {
                console.error('❌ Validation errors:', errors)
                toast.error('Por favor completa todos los campos requeridos correctamente')
              }
            )}
          >
            <AnimatePresence mode="wait">
              {/* Step 1: Basic Information */}
              {currentStep === 1 && (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-2">
                      Título del Evento *
                    </label>
                    <input
                      type="text"
                      {...register('title')}
                      placeholder="Ej: Conferencia de Tecnología 2024"
                      className="w-full p-4 glass bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                    {errors.title && (
                      <p className="text-red-500 text-sm mt-1">{errors.title.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-2">
                      Descripción *
                    </label>
                    <textarea
                      {...register('description')}
                      placeholder="Describe tu evento, qué pueden esperar los asistentes..."
                      className="w-full p-4 glass bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                      rows={4}
                    />
                    {errors.description && (
                      <p className="text-red-500 text-sm mt-1">{errors.description.message}</p>
                    )}
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={handleEnhanceWithAI}
                      disabled={isEnhancing}
                      className="flex items-center gap-2 bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-medium transition-all transform hover:scale-105"
                    >
                      {isEnhancing ? (
                        <div className="animate-spin w-4 h-4 border-2 border-white rounded-full border-t-transparent" />
                      ) : (
                        <span>✨</span>
                      )}
                      {isEnhancing ? 'Mejorando...' : 'Mejorar con IA'}
                    </button>
                  </div>

                  {/* Event Image */}
                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-2">
                      Imagen del evento
                    </label>
                    <div className="relative">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleImageUpload}
                        className="hidden"
                      />

                      {images.length > 0 ? (
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                          {images.map((file, index) => (
                            <div key={index} className="relative group">
                              <img
                                src={URL.createObjectURL(file)}
                                alt={`Preview ${index + 1}`}
                                className="w-full h-32 object-cover rounded-xl"
                              />
                              <motion.button
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                type="button"
                                onClick={() => {
                                  const newImages = images.filter((_, i) => i !== index)
                                  setImages(newImages)
                                }}
                                className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <X className="w-3 h-3" />
                              </motion.button>
                            </div>
                          ))}

                          {images.length < 5 && (
                            <motion.button
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                              type="button"
                              onClick={() => fileInputRef.current?.click()}
                              className="h-32 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl flex flex-col items-center justify-center gap-2 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                            >
                              <Plus className="w-6 h-6 text-gray-400" />
                              <span className="text-xs text-gray-500">Agregar más</span>
                            </motion.button>
                          )}
                        </div>
                      ) : (
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="w-full h-48 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-2xl flex flex-col items-center justify-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                        >
                          <div className="w-12 h-12 bg-blue-500/10 rounded-full flex items-center justify-center">
                            <Camera className="w-6 h-6 text-blue-500" />
                          </div>
                          <div className="text-center">
                            <p className="font-medium text-foreground">Subir imagen</p>
                            <p className="text-sm text-muted-foreground">JPG, PNG hasta 10MB (máx. 5)</p>
                          </div>
                        </motion.button>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-2">
                      Categoría *
                    </label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {categories.map((category) => (
                        <motion.button
                          key={category.id}
                          type="button"
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => setValue('category', category.id, { shouldValidate: true })}
                          className={`p-3 rounded-xl border transition-all ${formData.category === category.id
                            ? 'border-blue-500 bg-blue-500/10 text-blue-600'
                            : 'border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                            }`}
                        >
                          <div className="text-2xl mb-1">{category.emoji}</div>
                          <div className="text-sm font-medium">{category.name}</div>
                        </motion.button>
                      ))}
                    </div>
                    {errors.category && (
                      <p className="text-red-500 text-sm mt-1">{errors.category.message}</p>
                    )}
                  </div>
                </motion.div>
              )}

              {/* Step 2: Event Details */}
              {currentStep === 2 && (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  <div>
                    <h2 className="text-xl font-bold text-foreground mb-2">Detalles del Evento</h2>
                    <p className="text-muted-foreground">
                      Configura cuándo será tu evento y otros detalles importantes
                    </p>
                  </div>

                  {/* Date and Time */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-foreground mb-2">
                        Fecha *
                      </label>
                      <input
                        type="date"
                        {...register('date')}
                        min={new Date().toISOString().split('T')[0]}
                        className="w-full p-4 glass bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      {errors.date && (
                        <p className="text-red-500 text-sm mt-1">{errors.date.message}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-foreground mb-2">
                        Hora de inicio *
                      </label>
                      <input
                        type="time"
                        {...register('time')}
                        className="w-full p-4 glass bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      {errors.time && (
                        <p className="text-red-500 text-sm mt-1">{errors.time.message}</p>
                      )}
                    </div>
                  </div>

                  {/* End Time */}
                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-2">
                      Hora de finalización (opcional)
                    </label>
                    <input
                      type="time"
                      {...register('endTime')}
                      className="w-full p-4 glass bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Si no se especifica, se usará la hora de inicio"
                    />
                    <p className="text-xs text-muted-foreground mt-2">
                      Si tu evento dura todo el día o termina a la misma hora, déjalo vacío
                    </p>
                  </div>

                  {/* Tags */}
                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-2">
                      Etiquetas (opcional)
                    </label>
                    <div className="flex gap-2 mb-4">
                      <input
                        type="text"
                        value={newTag}
                        onChange={(e) => setNewTag(e.target.value)}
                        placeholder="Agregar etiqueta"
                        className="flex-1 p-3 glass bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                      />
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        type="button"
                        onClick={handleAddTag}
                        className="p-3 bg-blue-500 text-white rounded-xl"
                      >
                        <Plus className="w-5 h-5" />
                      </motion.button>
                    </div>

                    {tags.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {tags.map((tag, index) => (
                          <motion.div
                            key={index}
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="flex items-center gap-2 px-3 py-1 bg-blue-500/10 text-blue-600 rounded-full text-sm"
                          >
                            #{tag}
                            <motion.button
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                              type="button"
                              onClick={() => handleRemoveTag(index)}
                              className="hover:text-red-500"
                            >
                              <X className="w-3 h-3" />
                            </motion.button>
                          </motion.div>
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              )}

              {/* Step 3: Location and Capacity */}
              {currentStep === 3 && (
                <motion.div
                  key="step3"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  <div>
                    <h2 className="text-xl font-bold text-foreground mb-2">Ubicación y Capacidad</h2>
                    <p className="text-muted-foreground">
                      Define dónde será tu evento y cuántas personas pueden asistir
                    </p>
                  </div>

                  {/* Location Search */}
                  <div className="relative">
                    <label className="block text-sm font-semibold text-foreground mb-2">
                      Buscar Ubicación *
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={locationQuery}
                        onChange={(e) => handleLocationSearch(e.target.value)}
                        onFocus={() => setShowLocationSuggestions(true)}
                        placeholder="Ej: Santo Domingo, RD / Polanco, CDMX / Hotel Barceló / Av. Churchill..."
                        className="w-full p-4 glass bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-10"
                      />
                      {isSearchingLocation ? (
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 border-2 border-blue-500/30 border-t-blue-500 rounded-full"
                        />
                      ) : (
                        <MapPin className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                      )}
                    </div>

                    {/* Location Suggestions */}
                    {showLocationSuggestions && (locationSuggestions.length > 0 || isSearchingLocation || locationQuery.length >= 3) && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl shadow-lg z-50 max-h-60 overflow-y-auto"
                      >
                        {isSearchingLocation ? (
                          <div className="p-4 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <motion.div
                                animate={{ rotate: 360 }}
                                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                className="w-4 h-4 border-2 border-blue-500/30 border-t-blue-500 rounded-full"
                              />
                              <span className="text-sm text-muted-foreground">
                                Buscando ubicaciones...
                              </span>
                            </div>
                          </div>
                        ) : locationSuggestions.length > 0 ? (
                          locationSuggestions.map((suggestion) => (
                            <motion.button
                              key={suggestion.id}
                              type="button"
                              whileHover={{ backgroundColor: 'rgba(59, 130, 246, 0.1)' }}
                              onClick={() => selectLocation(suggestion)}
                              className="w-full p-4 text-left hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors border-b border-gray-100 dark:border-gray-700 last:border-b-0"
                            >
                              <div className="flex items-start gap-3">
                                <MapPin className="w-4 h-4 text-blue-500 mt-1 flex-shrink-0" />
                                <div>
                                  <p className="font-medium text-foreground">
                                    {suggestion.name}
                                  </p>
                                  <p className="text-sm text-muted-foreground">
                                    {suggestion.address}
                                  </p>
                                  {suggestion.type === 'manual' && (
                                    <span className="inline-block mt-1 px-2 py-1 bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400 text-xs rounded">
                                      Ubicación manual
                                    </span>
                                  )}
                                </div>
                              </div>
                            </motion.button>
                          ))
                        ) : locationQuery.length >= 3 ? (
                          <div className="p-4 text-center">
                            <div className="flex items-center justify-center gap-2 mb-2">
                              <AlertCircle className="w-4 h-4 text-yellow-500" />
                              <span className="text-sm text-muted-foreground">
                                No se encontraron ubicaciones
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => selectLocation({
                                id: 'manual_input',
                                name: locationQuery,
                                address: locationQuery,
                                coordinates: [0, 0],
                                type: 'manual'
                              })}
                              className="text-sm text-blue-500 hover:text-blue-600 underline"
                            >
                              Usar "{locationQuery}" como ubicación manual
                            </button>
                          </div>
                        ) : null}
                      </motion.div>
                    )}
                  </div>

                  {/* Selected Location Display */}
                  {formData.location.venue && (
                    <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl">
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                          <MapPin className="w-4 h-4 text-white" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-green-800 dark:text-green-300">
                            Ubicación Seleccionada
                          </h4>
                          <p className="text-sm text-green-700 dark:text-green-400 mt-1">
                            <strong>{formData.location.venue}</strong>
                          </p>
                          <p className="text-sm text-green-600 dark:text-green-500">
                            {formData.location.address}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Additional Notes */}
                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-2">
                      Información adicional (opcional)
                    </label>
                    <textarea
                      value={formData.location.address === formData.location.venue ? '' : formData.location.address}
                      onChange={(e) => {
                        const val = e.target.value || formData.location.venue || ''
                        setValue('location', { ...formData.location, address: val })
                      }}
                      placeholder="Referencias adicionales, instrucciones de acceso, notas especiales..."
                      rows={3}
                      className="w-full p-4 glass bg-white/5 border border-white/10 rounded-xl resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  {/* Virtual Event Toggle */}
                  <div className="pt-4 border-t border-white/10">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="text-foreground font-semibold">Evento Virtual</h3>
                        <p className="text-sm text-muted-foreground">Este evento se realizará por videollamada / stream online</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          {...register('isVirtual')}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                      </label>
                    </div>

                    {watch('isVirtual') && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="mb-6"
                      >
                        <label className="block text-sm font-semibold text-foreground mb-2">
                          Enlace de la Reunión *
                        </label>
                        <div className="relative">
                          <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                          <input
                            type="url"
                            {...register('virtualLink', { required: watch('isVirtual') })}
                            placeholder="Ej: https://zoom.us/j/123456"
                            className="w-full pl-12 pr-4 py-4 glass bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      </motion.div>
                    )}
                  </div>

                  {/* Accessibility Options */}
                  <div className="pt-4 border-t border-white/10">
                    <div className="mb-4">
                      <h3 className="text-foreground font-semibold">Accesibilidad e Inclusión ♿</h3>
                      <p className="text-sm text-muted-foreground">Marca las opciones con las que cuenta tu evento para atraer a más público</p>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {[
                        { id: 'wheelchair', label: 'Silla de Ruedas' },
                        { id: 'petFriendly', label: 'Pet Friendly' },
                        { id: 'signLanguage', label: 'Lenguaje de Señas' },
                        { id: 'quietZone', label: 'Zona Tranquila' },
                        { id: 'visualAids', label: 'Ayudas Visuales' },
                      ].map((option) => {
                        const isSelected = watch('accessibility')?.includes(option.id) || false;

                        return (
                          <button
                            key={option.id}
                            type="button"
                            onClick={() => {
                              const currentAcc = watch('accessibility') || [];
                              if (isSelected) {
                                setValue('accessibility', currentAcc.filter(id => id !== option.id));
                              } else {
                                setValue('accessibility', [...currentAcc, option.id]);
                              }
                            }}
                            className={`p-3 rounded-xl border transition-all text-sm font-medium ${isSelected
                                ? 'border-blue-500 bg-blue-500/10 text-blue-500'
                                : 'border-white/10 glass bg-white/5 text-foreground hover:bg-white/10'
                              }`}
                          >
                            {option.label}
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* Capacity */}
                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-2">

                      Capacidad máxima *
                    </label>
                    <input
                      type="number"
                      onChange={(e) => {
                        const value = e.target.value === '' ? 0 : parseInt(e.target.value);
                        setValue('maxAttendees', value, { shouldValidate: true });
                      }}
                      placeholder="¿Cuántas personas pueden asistir?"
                      min="1"
                      max="10000"
                      className="w-full p-4 glass bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    {errors.maxAttendees && (
                      <p className="text-red-500 text-sm mt-1">{errors.maxAttendees.message}</p>
                    )}
                  </div>

                  {/* Map Preview Placeholder */}
                  <div className="glass bg-white/10 rounded-xl p-6 text-center">
                    <MapPin className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                    <p className="text-sm text-muted-foreground">
                      Vista previa del mapa aparecerá aquí
                    </p>
                  </div>
                </motion.div>
              )}

              {/* Step 4: Pricing and Settings */}
              {currentStep === 4 && (
                <motion.div
                  key="step4"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  <div>
                    <h2 className="text-xl font-bold text-foreground mb-2">Precio y Configuración</h2>
                    {/* Price Configuration */}
                    <div>
                      <h3 className="text-lg font-semibold text-foreground mb-4">
                        Precio de las entradas
                      </h3>
                      <div className="bg-gray-50 dark:bg-gray-700 p-6 rounded-xl space-y-4">
                        <div className="flex items-center gap-4">
                          <div className="flex-1">
                            <label className="block text-sm font-medium text-foreground/90 mb-1">
                              Precio
                            </label>
                            <div className="relative">
                              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">
                                {currencies.find(c => c.code === formData.price.currency)?.symbol}
                              </span>
                              <input
                                type="number"
                                onChange={(e) => {
                                  const value = e.target.value === '' ? 0 : parseFloat(e.target.value);
                                  setValue('price.amount', value, { shouldValidate: true });
                                }}
                                className="w-full pl-8 pr-4 py-3 glass bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                placeholder="0.00"
                              />
                            </div>
                          </div>
                          <div className="w-32">
                            <label className="block text-sm font-medium text-foreground/90 mb-1">
                              Moneda
                            </label>
                            <select
                              {...register('price.currency')}
                              className="w-full p-3 glass bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                              {currencies.map(curr => (
                                <option key={curr.code} value={curr.code}>
                                  {curr.code}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Deja el precio en 0 si el evento es gratuito
                        </p>
                      </div>
                    </div>

                    {/* Age Restrictions */}
                    <div>
                      <h3 className="text-lg font-semibold text-foreground mb-4 mt-8">
                        Restricciones de Edad
                      </h3>
                      <div className="bg-gray-50 dark:bg-gray-700 p-6 rounded-xl space-y-4">

                        <div className="flex items-center gap-2 mb-4">
                          <input
                            type="checkbox"
                            id="isAdultOnly"
                            {...register('ageRestriction.isAdultOnly')}
                            className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <label htmlFor="isAdultOnly" className="text-foreground/90 font-medium">
                            Solo para adultos (18+)
                          </label>
                        </div>

                        {!watch('ageRestriction.isAdultOnly') && (
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-foreground/90 mb-1">
                                Edad Mínima
                              </label>
                              <input
                                type="number"
                                className="w-full p-3 glass bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                min="0"
                                onChange={(e) => {
                                  const value = e.target.value === '' ? 0 : parseInt(e.target.value);
                                  setValue('ageRestriction.minAge', value, { shouldValidate: true });
                                }}
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-foreground/90 mb-1">
                                Edad Máxima (Opcional)
                              </label>
                              <input
                                type="number"
                                placeholder="Sin límite"
                                className="w-full p-3 glass bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                min="0"
                                onChange={(e) => {
                                  const value = e.target.value === '' ? undefined : parseInt(e.target.value);
                                  setValue('ageRestriction.maxAge', value, { shouldValidate: true });
                                }}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    {formData.price.amount === 0 && (
                      <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-xl">
                        <p className="text-sm text-green-600">
                          ✅ Este será un evento gratuito
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Privacy Settings */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-foreground">
                      Configuración de privacidad
                    </h3>

                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      type="button"
                      onClick={() => setValue('isPrivate', !formData.isPrivate)}
                      className={`w-full p-4 rounded-xl border text-left transition-all ${formData.isPrivate
                        ? 'border-blue-500 bg-blue-500/10'
                        : 'border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                        }`}
                    >
                      <div className="flex items-center gap-3">
                        {formData.isPrivate ? <Lock className="w-5 h-5 text-blue-500" /> : <Globe className="w-5 h-5" />}
                        <div>
                          <p className="font-semibold text-foreground">
                            {formData.isPrivate ? 'Evento privado' : 'Evento público'}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {formData.isPrivate
                              ? 'Solo visible por invitación'
                              : 'Visible para todos en EventConnect'
                            }
                          </p>
                        </div>
                      </div>
                    </motion.button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Step 5: Review and Submit */}
            {currentStep === 5 && (
              <motion.div
                key="step5"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div>
                  <h2 className="text-xl font-bold text-foreground mb-2">Revisar y Publicar</h2>
                  <p className="text-muted-foreground">
                    Revisa todos los detalles antes de publicar tu evento
                  </p>
                </div>

                {/* Event Preview */}
                <div className="bg-gray-50 dark:bg-gray-700 rounded-2xl border border-gray-200 dark:border-gray-600 overflow-hidden">
                  <div className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="px-2 py-1 bg-blue-500/10 text-blue-600 rounded-full text-xs">
                        {categories.find(c => c.id === formData.category)?.name}
                      </span>
                      {formData.isPrivate && (
                        <span className="px-2 py-1 bg-yellow-500/10 text-yellow-600 rounded-full text-xs">
                          🔒 Privado
                        </span>
                      )}
                    </div>

                    <h3 className="font-bold text-foreground mb-2">{formData.title}</h3>
                    <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                      {formData.description}
                    </p>

                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-blue-500" />
                        <span>{formData.date} a las {formData.time}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-red-500" />
                        <span>{formData.location.venue || formData.location.address}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-green-500" />
                        <span>Hasta {formData.maxAttendees} personas</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Ticket className="w-4 h-4 text-purple-500" />
                        <span>
                          {formData.price.amount === 0 ? 'Gratis' : `$${formData.price.amount} ${formData.price.currency}`}
                        </span>
                      </div>
                    </div>

                    {formData.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-3">
                        {formData.tags.map((tag, index) => (
                          <span
                            key={index}
                            className="px-2 py-1 glass bg-white/10 rounded-full text-xs"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Important Notes */}
                <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                  <h4 className="font-semibold text-blue-600 mb-2">📋 Antes de publicar</h4>
                  <ul className="text-sm text-blue-600 space-y-1">
                    <li>• Asegúrate de que toda la información sea correcta</li>
                    <li>• Podrás editar algunos detalles después de publicar</li>
                    <li>• Los asistentes recibirán notificaciones de cambios importantes</li>
                    <li>• Tu evento aparecerá en búsquedas inmediatamente</li>
                  </ul>
                </div>
              </motion.div>
            )}
          </form>
        </div>

        {/* Bottom Actions */}
        <div className="fixed bottom-0 left-0 right-0 glass bg-white/5 backdrop-blur-xl border-t border-white/10 p-4">
          <div className="max-w-4xl mx-auto flex gap-3">
            {currentStep > 1 && (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="button"
                onClick={prevStep}
                className="px-6 py-3 bg-gray-100 dark:bg-gray-600 hover:bg-gray-200 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-200 rounded-xl font-medium transition-colors"
              >
                Anterior
              </motion.button>
            )}

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type={currentStep === steps.length ? "submit" : "button"}
              form={currentStep === steps.length ? "create-event-form" : undefined}
              onClick={currentStep === steps.length ? undefined : handleNextStep}
              disabled={isSubmitting || createEventMutation.isPending}
              className="flex-1 py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-xl font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {createEventMutation.isPending ? (
                <>
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
                  />
                  Creando evento...
                </>
              ) : (
                <>
                  {currentStep === steps.length ? 'Publicar evento' : 'Continuar'}
                  {currentStep < steps.length && <ChevronDown className="w-5 h-5 rotate-[-90deg]" />}
                </>
              )}
            </motion.button>
          </div>
        </div>
      </div>
    </div>
  )
}
