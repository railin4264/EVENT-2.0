'use client'

import { useState, useRef, useCallback, useEffect, Suspense } from 'react'
import type { EventImage } from '@/types/api.types'
import { motion, AnimatePresence } from 'framer-motion'
import { useMutation } from '@tanstack/react-query'
import { useRouter, useSearchParams } from 'next/navigation'
import { Calendar, Clock, MapPin, Users, Star, Image as ImageIcon, Globe, Lock, Plus, X, Check, ChevronLeft, Camera, CheckCircle, AlertCircle, Info, Settings, Share, ChevronDown, FileText, DollarSign, Tag, Sparkles, Navigation } from 'lucide-react'
const Save = Check
const Upload = Camera
const Ticket = FileText
import { apiClient } from '@/lib/api/client'
import toast from 'react-hot-toast'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { eventSchema, createEventPayload, deviceTimeZone, type EventFormData } from './create-event-form'
import { COUNTRY_OPTIONS, countryName, locationMetadata } from './country-catalog'
import { useLiveLocation, RD_VENUE_PRESETS, type VenuePreset } from '@/hooks/useLiveLocation'

import { useAuthStore } from '@/stores/authStore'
import { ImportPlanDraft } from '@/components/planning/ImportPlanDraft'
import { CATEGORY_LIST } from '@/lib/categories'
import ConnectAgendaModal from '@/components/events/ConnectAgendaModal'
import AutoFillFlyerModal from '@/components/events/AutoFillFlyerModal'
import FriendPlanDraftCard, { type FriendPlanDraft } from '@/components/events/FriendPlanDraftCard'

const categories = CATEGORY_LIST.map(c => ({
  id: c.slug,
  name: c.label,
  emoji: c.emoji,
  color: c.color
}))

const currencies = [
  { code: 'DOP', symbol: 'RD$', name: 'Peso Dominicano' },
  { code: 'MXN', symbol: '$', name: 'Peso Mexicano' },
  { code: 'USD', symbol: '$', name: 'Dólar Americano' },
  { code: 'EUR', symbol: '€', name: 'Euro' }
]

function CreateEventForm() {
  const owner = useAuthStore(state => state.user?._id || state.user?.id || '')
  const formAlive = useRef(true)
  useEffect(() => { formAlive.current = true; return () => { formAlive.current = false } }, [])
  const accountIsCurrent = () => {
    const user = useAuthStore.getState().user
    return formAlive.current && Boolean(owner) && owner === (user?._id || user?.id || '')
  }
  const router = useRouter()
  const searchParams = useSearchParams()
  const ideaIdParam = searchParams.get('idea')
  const titleParam = searchParams.get('title')
  const categoryParam = searchParams.get('category')
  const activityTypeParam = searchParams.get('activityType')
  const zoneParam = searchParams.get('zone')

  const fileInputRef = useRef<HTMLInputElement>(null)
  const [currentStep, setCurrentStep] = useState(1)
  const [newTag, setNewTag] = useState('')
  const [locationQuery, setLocationQuery] = useState('')
  const [locationSuggestions, setLocationSuggestions] = useState<any[]>([])
  const [showLocationSuggestions, setShowLocationSuggestions] = useState(false)
  const [isSearchingLocation, setIsSearchingLocation] = useState(false)
  const [images, setImages] = useState<File[]>([])
  const [isConnectAgendaOpen, setIsConnectAgendaOpen] = useState(false)
  const [isAutoFillFlyerOpen, setIsAutoFillFlyerOpen] = useState(false)
  const [friendDraftApplied, setFriendDraftApplied] = useState(false)
  const [friendDraftReviewed, setFriendDraftReviewed] = useState(false)

  const handleApplyFriendDraft = (draft: FriendPlanDraft) => {
    if (!accountIsCurrent()) return
    setFriendDraftApplied(true); setFriendDraftReviewed(false)
    if (draft.title) setValue('title', draft.title, { shouldValidate: true })
    if (draft.description) setValue('description', draft.description, { shouldValidate: true })
    if (draft.category) setValue('category', draft.category as any, { shouldValidate: true })
    if (draft.localDate) setValue('date', draft.localDate, { shouldValidate: true })
    if (draft.localTime) setValue('time', draft.localTime, { shouldValidate: true })
    if (draft.localDate || draft.localTime || draft.venue) setValue('timeZone', draft.timeZone || '', { shouldValidate: true })
    if (draft.venue) {
      selectedGeocode.current = false
      setValue('location.venue', draft.venue, { shouldValidate: true })
      setValue('location.address', draft.venue, { shouldValidate: true })
      setValue('location.coordinates', undefined, { shouldValidate: true })
      setValue('location.city', ''); setValue('location.country', ''); setValue('location.countryCode', '')
      setCoordinateDraft({ latitude: '', longitude: '' })
      setLocationQuery(draft.venue)
    }
    if (draft.isPrivate !== undefined) {
      setValue('isPrivate', draft.isPrivate, { shouldValidate: true })
    }
  }
  const handleApplyFlyerData = (extracted: any) => {
    if (!accountIsCurrent() || !extracted) return
    if (extracted.title) setValue('title', extracted.title, { shouldValidate: true })
    if (extracted.description) setValue('description', extracted.description, { shouldValidate: true })
    if (extracted.category) setValue('category', extracted.category as any, { shouldValidate: true })
    if (extracted.date) {
      const d = new Date(extracted.date)
      if (!isNaN(d.getTime())) {
        setValue('date', d.toISOString().slice(0, 10), { shouldValidate: true })
      }
    }
    if (extracted.time) setValue('time', extracted.time, { shouldValidate: true })
    if (extracted.venue) {
      setValue('location.venue', extracted.venue, { shouldValidate: true })
      setValue('location.address', extracted.address || extracted.venue, { shouldValidate: true })
      setLocationQuery(extracted.address || extracted.venue)
    }
    if (extracted.city) setValue('location.city', extracted.city, { shouldValidate: true })
    if (extracted.country) setValue('location.country', extracted.country, { shouldValidate: true })
    if (Array.isArray(extracted.coordinates) && extracted.coordinates.length === 2) {
      setValue('location.coordinates', extracted.coordinates as [number, number], { shouldValidate: true })
      setCoordinateDraft({ latitude: String(extracted.coordinates[1]), longitude: String(extracted.coordinates[0]) })
    }
    if (extracted.price?.amount != null) {
      setValue('price.amount', extracted.price.amount, { shouldValidate: true })
      if (extracted.price.currency) setValue('price.currency', extracted.price.currency as any, { shouldValidate: true })
    }
    if (Array.isArray(extracted.tags) && extracted.tags.length > 0) {
      setValue('tags', extracted.tags, { shouldValidate: true })
    }
    if (extracted.coverUrl) {
      setImagePreviews(prev => [extracted.coverUrl, ...prev.filter(u => u !== extracted.coverUrl)])
    }
  }

  const [isEnhancing, setIsEnhancing] = useState(false)
  const [coordinateDraft, setCoordinateDraft] = useState({ latitude: '', longitude: '' })
  const [imagePreviews, setImagePreviews] = useState<string[]>([])
  const locationTimer = useRef<ReturnType<typeof setTimeout>>()
  const locationRequest = useRef<AbortController | null>(null)
  const locationVersion = useRef(0)
  const selectedGeocode = useRef(false)
  const { location: liveLocation, refreshNow, presets } = useLiveLocation(true)

  const { register, handleSubmit, formState: { errors, isSubmitting }, trigger, watch, setValue } = useForm<EventFormData>({
    resolver: zodResolver(eventSchema),
    mode: 'onChange',
    shouldUnregister: false,
    defaultValues: {
      title: '',
      description: '',
      category: 'technology',
      date: '',
      time: '',
      endTime: '',
      timeZone: '',
      location: {
        address: '',
        venue: '',
        city: '', country: '', countryCode: '',
      },
      price: {
        amount: 0,
        currency: 'DOP'
      },
      maxAttendees: 50,
      isPrivate: false,
      isUnofficial: false,
      isSecretLocation: false,
      ticketUrl: '',
      activityType: '',
      sourceIdeaId: '',
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

  useEffect(() => {
    setValue('timeZone', deviceTimeZone())
  }, [setValue])

  useEffect(() => {
    if (ideaIdParam) setValue('sourceIdeaId', ideaIdParam)
    if (titleParam) setValue('title', titleParam, { shouldValidate: true })
    if (categoryParam) setValue('category', categoryParam as any, { shouldValidate: true })
    if (activityTypeParam) setValue('activityType', activityTypeParam)
    if (zoneParam) {
      setValue('location.venue', zoneParam)
      setValue('location.address', zoneParam)
      setLocationQuery(zoneParam)
    }
  }, [ideaIdParam, titleParam, categoryParam, activityTypeParam, zoneParam, setValue])

  const applyPresetLocation = useCallback((preset: VenuePreset) => {
    selectedGeocode.current = true
    setValue('location.venue', preset.venue || preset.name, { shouldValidate: true })
    setValue('location.address', preset.address, { shouldValidate: true })
    setValue('location.coordinates', [preset.lng, preset.lat], { shouldValidate: true })
    setValue('location.city', preset.city, { shouldValidate: true })
    setValue('location.country', preset.country, { shouldValidate: true })
    setValue('location.countryCode', preset.countryCode || 'DO', { shouldValidate: true })
    setCoordinateDraft({ latitude: String(preset.lat), longitude: String(preset.lng) })
    setLocationQuery(preset.address)
    setShowLocationSuggestions(false)
    setLocationSuggestions([])
    toast.success(`Ubicación seleccionada: ${preset.name}`)
  }, [setValue])

  const applyLiveLocationNow = useCallback(async () => {
    const loc = await refreshNow()
    selectedGeocode.current = true
    setValue('location.venue', loc.venue || loc.city, { shouldValidate: true })
    setValue('location.address', loc.address, { shouldValidate: true })
    setValue('location.coordinates', [loc.lng, loc.lat], { shouldValidate: true })
    setValue('location.city', loc.city, { shouldValidate: true })
    setValue('location.country', loc.country, { shouldValidate: true })
    setValue('location.countryCode', loc.countryCode || 'DO', { shouldValidate: true })
    setCoordinateDraft({ latitude: String(loc.lat), longitude: String(loc.lng) })
    setLocationQuery(loc.address)
    setShowLocationSuggestions(false)
    toast.success(`📍 Ubicación GPS activa: ${loc.city}`)
  }, [refreshNow, setValue])

  useEffect(() => {
    if (!zoneParam && !locationQuery && liveLocation?.lat && liveLocation?.lng) {
      setValue('location.venue', liveLocation.venue || liveLocation.city)
      setValue('location.address', liveLocation.address)
      setValue('location.coordinates', [liveLocation.lng, liveLocation.lat])
      setValue('location.city', liveLocation.city)
      setValue('location.country', liveLocation.country)
      setValue('location.countryCode', liveLocation.countryCode || 'DO')
      setCoordinateDraft({ latitude: String(liveLocation.lat), longitude: String(liveLocation.lng) })
      setLocationQuery(liveLocation.address)
    }
  }, [liveLocation, zoneParam, locationQuery, setValue])

  const formData = watch()
  const friendReviewFields = JSON.stringify([formData.date, formData.time, formData.timeZone, formData.location, formData.price, formData.isPrivate])
  useEffect(() => { setFriendDraftReviewed(false) }, [friendReviewFields])
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
      throw new Error('No se pudieron subir las imágenes. Inténtalo de nuevo o retíralas antes de publicar.')
    }
  }

  // Create event mutation
  const createEventMutation = useMutation({
    mutationFn: async (eventData: EventFormData) => {
      if (!accountIsCurrent()) throw new Error('Inicia sesión con la cuenta que está creando el evento.')
      // Validate schedule before uploading files so invalid dates do not create orphan assets.
      const eventForBackend = createEventPayload(eventSchema.parse(eventData))
      eventForBackend.images = await uploadImages(images)

      if (!accountIsCurrent()) throw new Error('La cuenta cambió. Vuelve a revisar el evento antes de enviarlo.')
      const response = await apiClient.post('/events', eventForBackend)
      if (response.data.success !== true) throw new Error(response.data.message || 'No se pudo guardar el evento.')
      return response.data
    },
    onSuccess: async (data, variables) => {
      if (!accountIsCurrent()) return
      if (variables.sourceIdeaId) {
        const eventId = data?._id || data?.event?._id || data?.data?._id
        if (eventId) {
          try {
            await apiClient.post(`/ideas/${variables.sourceIdeaId}/launch`, { eventId })
            toast.success('¡Idea comunitaria activada! Se notificó a los interesados.')
          } catch (err) {
            console.error('Error al activar idea comunitaria:', err)
          }
        }
      }
      if (data?.isPendingReview) {
        toast.success(data?.message || '🛡️ ¡Evento recibido! Tu evento está en proceso de revisión por los moderadores antes de ser publicado en el mapa.', { duration: 6500 })
      } else {
        toast.success('¡Evento creado y publicado exitosamente!')
      }
      // Ensure we have a valid ID before navigating
      if (data?._id || data?.event?._id || data?.data?._id) {
        const eventId = data._id || data.event?._id || data.data?._id
        router.push(`/events/${eventId}`)
      } else {
        // Fallback to events list if no ID
        router.push('/events')
      }
    },
    onError: (error: any) => {
      if (!accountIsCurrent()) return
      console.error('Create event error:', error)
      toast.error(error.response?.data?.errors?.join('. ') || error.response?.data?.message || error.message || 'Error al crear el evento')
    }
  })

  const onSubmit = async (data: EventFormData) => {
    if (friendDraftApplied && !friendDraftReviewed) { setCurrentStep(5); toast.error('Revisa y confirma los datos importados antes de publicar.'); return }
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
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'La mejora con IA no está disponible. Tu texto se conserva.');
    } finally {
      setIsEnhancing(false);
    }
  }

  const handleAddTag = () => {
    if (tags.length >= 10 || !/^[a-zA-Z0-9\u00C0-\u017F_-]{1,30}$/.test(newTag.trim())) {
      toast.error('Máximo 10 etiquetas de 30 caracteres: letras, números, guiones o guiones bajos')
      return
    }
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

    if (files.some(file => !['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type) || file.size > 5 * 1024 * 1024)) {
      toast.error('Usa imágenes JPG, PNG, WebP o GIF de hasta 5 MB')
      e.target.value = ''
      return
    }
    setImages([...images, ...files])
    e.target.value = ''
  }

  // Search for locations using RD presets, Google Maps (if key configured), and Nominatim fallback
  const searchLocations = useCallback(async (query: string) => {
    if (query.length < 2) {
      setLocationSuggestions([])
      return
    }

    const version = ++locationVersion.current
    locationRequest.current?.abort()
    const controller = new AbortController()
    locationRequest.current = controller

    // Instant local matching on Dominican Republic presets
    const qLower = query.toLowerCase().trim()
    const presetMatches = RD_VENUE_PRESETS.filter(p =>
      p.name.toLowerCase().includes(qLower) ||
      p.venue.toLowerCase().includes(qLower) ||
      p.address.toLowerCase().includes(qLower) ||
      p.city.toLowerCase().includes(qLower)
    ).map(p => ({
      id: `preset_${p.id}`,
      name: p.name,
      address: p.address,
      city: p.city,
      country: p.country,
      countryCode: p.countryCode,
      coordinates: [p.lng, p.lat],
      type: 'preset',
      originalData: p
    }))

    try {
      setIsSearchingLocation(true)

      const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY

      // If Google Maps API is configured and valid
      if (apiKey && apiKey !== 'your_google_maps_api_key') {
        const response = await fetch(
          `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(query)}&key=${apiKey}`,
          { signal: controller.signal }
        )

        if (response.ok) {
          const data = await response.json()
          if (data.status === 'OK') {
            const googleSuggestions = (data.results || []).map((item: any, index: number) => {
              let name = item.formatted_address.split(',')[0]
              const route = item.address_components?.find((c: any) => c.types.includes('route'))?.long_name
              const streetNumber = item.address_components?.find((c: any) => c.types.includes('street_number'))?.long_name
              const poi = item.address_components?.find((c: any) => c.types.includes('point_of_interest') || c.types.includes('establishment'))?.long_name

              if (poi) name = poi
              else if (route && streetNumber) name = `${route} ${streetNumber}`
              else if (route) name = route

              return {
                id: item.place_id || `g_${index}`,
                name: name || 'Ubicación',
                address: item.formatted_address,
                ...locationMetadata(item.address_components),
                coordinates: [item.geometry.location.lng, item.geometry.location.lat],
                type: item.types?.[0] || 'location',
                originalData: item
              }
            })

            const merged = [...presetMatches, ...googleSuggestions]
            if (version === locationVersion.current) setLocationSuggestions(merged)
            return
          }
        }
      }

      // Fallback: OpenStreetMap Nominatim Geocoding (works without any API key)
      const nomRes = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=5&countrycodes=do&q=${encodeURIComponent(query)}`,
        { signal: controller.signal }
      )

      if (nomRes.ok) {
        const nomData = await nomRes.json()
        const nomSuggestions = (nomData || []).map((item: any) => ({
          id: `nom_${item.place_id}`,
          name: item.display_name.split(',')[0],
          address: item.display_name,
          city: item.address?.city || item.address?.town || item.address?.state || 'Santo Domingo',
          country: item.address?.country || 'República Dominicana',
          countryCode: (item.address?.country_code || 'do').toUpperCase(),
          coordinates: [parseFloat(item.lon), parseFloat(item.lat)],
          type: 'location',
          originalData: item
        }))

        const combined = [...presetMatches, ...nomSuggestions]
        if (version === locationVersion.current) setLocationSuggestions(combined)
        return
      }

      if (version === locationVersion.current) setLocationSuggestions(presetMatches)
    } catch (error) {
      if (version === locationVersion.current) setLocationSuggestions(presetMatches)
    } finally {
      if (version === locationVersion.current) setIsSearchingLocation(false)
    }
  }, [])

  const handleLocationSearch = (query: string) => {
    selectedGeocode.current = false
    setLocationQuery(query)
    setValue('location.address', query, { shouldValidate: true })
    setValue('location.venue', '')
    setValue('location.coordinates', undefined)
    setValue('location.city', '')
    setValue('location.country', '')
    setValue('location.countryCode', '')
    setCoordinateDraft({ latitude: '', longitude: '' })
    setLocationSuggestions([])
    setShowLocationSuggestions(true)
    locationVersion.current += 1
    locationRequest.current?.abort()
    setIsSearchingLocation(false)
    clearTimeout(locationTimer.current)
    locationTimer.current = setTimeout(() => searchLocations(query), 500)
  }

  const selectLocation = (suggestion: any) => {
    selectedGeocode.current = Boolean(suggestion.originalData)
    setValue('location.venue', suggestion.name, { shouldValidate: true })
    setValue('location.address', suggestion.address, { shouldValidate: true })
    setValue('location.coordinates', suggestion.coordinates, { shouldValidate: true })
    setValue('location.city', suggestion.city || '', { shouldValidate: true })
    setValue('location.country', suggestion.country || '', { shouldValidate: true })
    setValue('location.countryCode', suggestion.countryCode || '', { shouldValidate: true })
    setCoordinateDraft({ latitude: String(suggestion.coordinates?.[1] ?? ''), longitude: String(suggestion.coordinates?.[0] ?? '') })
    setLocationQuery(suggestion.address)
    setShowLocationSuggestions(false)
    setLocationSuggestions([])
  }

  useEffect(() => {
    const urls = images.map(file => URL.createObjectURL(file))
    setImagePreviews(urls)
    return () => urls.forEach(url => URL.revokeObjectURL(url))
  }, [images])

  useEffect(() => () => {
    clearTimeout(locationTimer.current)
    locationRequest.current?.abort()
  }, [])

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
        return await trigger(['date', 'time', 'endTime', 'timeZone', 'tags'])
      case 3:
        return await trigger(['location', 'maxAttendees', 'virtualLink'])
      case 4:
        return await trigger(['price', 'ageRestriction'])
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
      {searchParams.get('draft') && <ImportPlanDraft id={searchParams.get('draft')!} onApply={fields => {
        if (fields.title) setValue('title', fields.title, { shouldDirty: true })
        if (fields.description) setValue('description', fields.description, { shouldDirty: true })
        if (fields.address) { setValue('location.address', fields.address, { shouldDirty: true }); setLocationQuery(fields.address) }
        if (fields.city) setValue('location.city', fields.city, { shouldDirty: true })
        if (fields.amount !== undefined) setValue('price.amount', fields.amount, { shouldDirty: true })
        if (fields.currency) setValue('price.currency', fields.currency, { shouldDirty: true })
        if (fields.timeZone) {
          setValue('timeZone', fields.timeZone, { shouldDirty: true })
          if (fields.date) setValue('date', fields.date, { shouldDirty: true })
          if (fields.time) setValue('time', fields.time, { shouldDirty: true })
        } else { setValue('date', ''); setValue('time', ''); toast('Confirma la zona horaria, fecha y hora del borrador antes de enviar.'); }
      }} />}
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
              className="bg-gradient-to-r from-violet-500 to-cyan-500 h-2 rounded-full"
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
      <div className="max-w-4xl mx-auto px-4 py-6 pb-48 md:pb-28">

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
                  {formData.sourceIdeaId && (
                    <div className="p-4 rounded-2xl bg-gradient-to-r from-violet-600/15 to-fuchsia-600/15 border border-violet-500/30 flex items-start gap-3">
                      <Sparkles className="h-5 w-5 text-violet-400 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold text-sm text-foreground">Creando evento desde una idea comunitaria</p>
                        <p className="text-xs text-muted-foreground mt-0.5">Al publicar este plan, todos los ciudadanos que expresaron interés recibirán una notificación automática para sumarse.</p>
                      </div>
                    </div>
                  )}

                  {/* Operational Source Ingestion - Tier 4 Friend Coro Drafter */}
                  <FriendPlanDraftCard onApplyDraft={handleApplyFriendDraft} />

                  {/* Tier 2 Organizer Agenda Connector Banner */}
                  <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border bg-card p-5">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <Calendar className="h-5 w-5" aria-hidden="true" />
                      </div>
                      <div>
                        <p className="font-semibold text-sm text-foreground">¿Eres organizador con web o calendario?</p>
                        <p className="text-xs text-muted-foreground">Consulta una agenda iCalendar, JSON o WordPress que ya esté registrada y aprobada. Las fichas nuevas pasan por moderación.</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsConnectAgendaOpen(true)}
                      className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
                    >
                      <span>Consultar mis agendas</span>
                    </button>
                  </div>

                  <ConnectAgendaModal
                    isOpen={isConnectAgendaOpen}
                    onClose={() => setIsConnectAgendaOpen(false)}
                    onSuccess={() => {
                      toast.success('Consulta terminada. Revisa en el resultado qué fichas se guardaron y cuáles siguen pendientes.')
                    }}
                  />

                  <div>
                    {/* AI Flyer Scanner Card */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-rose-500/30 bg-gradient-to-r from-rose-500/10 via-amber-500/10 to-primary/10 p-5 shadow-lg mb-6">
                    <div className="flex items-center gap-3.5">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-amber-500 to-rose-500 text-white shadow-md shadow-rose-500/20">
                        <Sparkles className="h-6 w-6" aria-hidden="true" />
                      </div>
                      <div>
                        <p className="font-bold text-sm text-foreground flex items-center gap-2">
                          <span>¿Tienes un Afiche o Flyer de tu Evento?</span>
                          <span className="rounded-full bg-rose-500/20 px-2 py-0.5 text-[10px] font-semibold text-rose-400">Autocompletar</span>
                        </p>
                        <p className="text-xs text-muted-foreground">Sube el afiche o pega el texto de Instagram o WhatsApp. Completamos lo que diga el anuncio y te marcamos lo que falta antes de publicar.</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsAutoFillFlyerOpen(true)}
                      className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-rose-500 px-5 text-sm font-bold text-white shadow-lg shadow-rose-500/25 hover:opacity-95 transition-all"
                    >
                      <Sparkles className="h-4 w-4" />
                      <span>Escanear Afiche</span>
                    </button>
                  </div>

                  <AutoFillFlyerModal
                    isOpen={isAutoFillFlyerOpen}
                    onClose={() => setIsAutoFillFlyerOpen(false)}
                    onApply={handleApplyFlyerData}
                  />

                  <label className="block text-sm font-semibold text-foreground mb-2" htmlFor="create-event-title">
                      Título del Evento *
                    </label>
                    <input
                      type="text"
                      id="create-event-title"
                      {...register('title')}
                      placeholder="Ej: Conferencia de Tecnología 2024"
                      className="w-full p-4 glass bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                    {errors.title && (
                      <p className="text-red-500 text-sm mt-1">{errors.title.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-2" htmlFor="create-event-description">
                      Descripción *
                    </label>
                    <textarea
                      id="create-event-description"
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
                      className="flex items-center gap-2 bg-gradient-to-r from-violet-500 to-cyan-500 hover:from-purple-600 hover:to-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-medium transition-all transform hover:scale-105"
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
                                src={imagePreviews[index]}
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
                          onClick={() => setValue('category', category.id as any, { shouldValidate: true })}
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

                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-1">
                      Actividad específica de nicho (opcional)
                    </label>
                    <p className="text-xs text-muted-foreground mb-2">
                      Ej: Violín en el parque, Pintar al aire libre, Jam session, Torneo de ajedrez, Club de lectura. Conecta con quienes buscan exactamente este plan.
                    </p>
                    <input
                      type="text"
                      {...register('activityType')}
                      placeholder="Ej: Violín en el parque, Pintura libre, Jam de piano..."
                      className="w-full p-4 glass bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-primary-500 text-sm"
                    />
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
                  <div className="rounded-xl border border-blue-500/25 bg-blue-500/10 p-4 text-sm">
                    <label htmlFor="event-time-zone" className="font-semibold">Zona horaria del evento</label>
                    <input id="event-time-zone" list="event-time-zones" value={formData.timeZone || ''} onChange={event => setValue('timeZone', event.target.value, { shouldDirty: true })} placeholder="America/Santo_Domingo" className="mt-2" />
                    <datalist id="event-time-zones">{['America/Santo_Domingo', 'America/New_York', 'America/Mexico_City', 'America/Bogota', 'America/Argentina/Buenos_Aires', 'America/Los_Angeles', 'Europe/Madrid', 'Europe/London', 'Africa/Johannesburg', 'Asia/Tokyo', 'Asia/Kolkata', 'Australia/Sydney', 'Pacific/Auckland', 'UTC'].map(zone => <option key={zone} value={zone} />)}</datalist>
                    <p className="mt-1 text-muted-foreground">Introduce la hora local del lugar del evento. Puedes elegir cualquier zona IANA; cambiar el país no altera el horario. Las horas ambiguas por cambio de horario requieren otra hora.</p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-foreground mb-2" htmlFor="create-event-date">
                        Fecha *
                      </label>
                      <input
                        type="date"
                        id="create-event-date"
                      {...register('date')}
                        className="w-full p-4 glass bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      {errors.date && (
                        <p className="text-red-500 text-sm mt-1">{errors.date.message}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-foreground mb-2" htmlFor="create-event-time">
                        Hora de inicio *
                      </label>
                      <input
                        type="time"
                        id="create-event-time"
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
                    <label className="block text-sm font-semibold text-foreground mb-2" htmlFor="create-event-endTime">
                      Hora de finalización (opcional)
                    </label>
                    <input
                      type="time"
                      id="create-event-endTime"
                      {...register('endTime')}
                      className="w-full p-4 glass bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Si no se especifica, durará dos horas"
                    />
                    <p className="text-xs text-muted-foreground mt-2">
                      Sin hora final se reservarán dos horas. Una hora final igual o anterior al inicio corresponde al día siguiente.
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

                  {/* Live GPS Location & Quick Fill */}
                  {!formData.isVirtual && (
                    <div className="space-y-3">
                      <div className="p-4 rounded-2xl border border-blue-500/30 bg-blue-500/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold">
                            <Navigation className="w-5 h-5 animate-pulse" />
                          </div>
                          <div>
                            <p className="text-xs font-bold uppercase tracking-wider text-blue-400">GPS en Tiempo Real</p>
                            <p className="text-sm font-semibold text-foreground">
                              {liveLocation.address || `${liveLocation.city}, ${liveLocation.country}`}
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={applyLiveLocationNow}
                          className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-500 transition-colors flex items-center gap-1.5 self-start sm:self-auto shrink-0 shadow-md"
                        >
                          <MapPin className="w-3.5 h-3.5" /> Usar mi ubicación actual
                        </button>
                      </div>

                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                          Destinos y Lugares Populares en RD (1 Clic)
                        </label>
                        <div className="flex flex-wrap gap-1.5">
                          {presets.slice(0, 6).map((preset) => (
                            <button
                              key={preset.id}
                              type="button"
                              onClick={() => applyPresetLocation(preset)}
                              className="px-3 py-1.5 rounded-xl border border-border bg-card hover:border-blue-500/50 hover:bg-blue-500/10 text-xs font-medium text-foreground transition-all flex items-center gap-1.5"
                            >
                              <span>📍</span>
                              <span>{preset.name}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Location Search */}
                  {!formData.isVirtual && <div className="relative">
                    <label className="block text-sm font-semibold text-foreground mb-2">
                      Dirección del evento presencial *
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
                                coordinates: undefined,
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

                  }
                  {!formData.isVirtual && <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label htmlFor="event-country" className="mb-2 block text-sm font-semibold">País del evento *</label>
                      <select id="event-country" value={formData.location.countryCode || ''} onChange={event => {
                        const code = event.target.value
                        if (code === formData.location.countryCode) return
                        if (formData.location.countryCode && formData.location.countryCode !== code) {
                          setValue('location.coordinates', undefined)
                          setCoordinateDraft({ latitude: '', longitude: '' })
                        }
                        selectedGeocode.current = false
                        setValue('location.countryCode', code, { shouldValidate: true })
                        setValue('location.country', countryName(code))
                        setValue('location.city', '', { shouldValidate: true })
                      }} aria-invalid={!!errors.location?.countryCode} className="w-full rounded-xl border border-border bg-background p-3 text-foreground">
                        <option value="">Selecciona un país</option>
                        {COUNTRY_OPTIONS.map(country => <option key={country.code} value={country.code}>{country.name}</option>)}
                      </select>
                      {errors.location?.countryCode && <p role="alert" className="mt-1 text-sm text-red-500">{errors.location.countryCode.message}</p>}
                    </div>
                    <div>
                      <label htmlFor="event-city" className="mb-2 block text-sm font-semibold">Ciudad del evento *</label>
                      <input id="event-city" value={formData.location.city || ''} onChange={event => {
                        if (selectedGeocode.current) {
                          selectedGeocode.current = false
                          setValue('location.coordinates', undefined)
                          setCoordinateDraft({ latitude: '', longitude: '' })
                        }
                        setValue('location.city', event.target.value, { shouldValidate: true })
                      }} maxLength={100} autoComplete="address-level2" placeholder="Escribe la ciudad" aria-invalid={!!errors.location?.city} className="w-full rounded-xl border border-border bg-background p-3 text-foreground" />
                      {errors.location?.city && <p role="alert" className="mt-1 text-sm text-red-500">{errors.location.city.message}</p>}
                    </div>
                    <p className="text-xs text-muted-foreground sm:col-span-2">Estos datos permiten encontrar tu evento por destino. Confirma que coinciden con la dirección y las coordenadas.</p>
                  </div>}
                  {/* Selected Location Display */}
                  {!formData.isVirtual && formData.location.venue && (
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

                  {!formData.isVirtual && <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">Selecciona una dirección encontrada o agrega las coordenadas reales del lugar. Puedes copiarlas de tu aplicación de mapas.</p>
                    <div className="grid grid-cols-2 gap-4">
                      {(['latitude', 'longitude'] as const).map(axis => (
                        <label key={axis} className="block text-sm font-semibold">
                          {axis === 'latitude' ? 'Latitud' : 'Longitud'}
                          <input type="number" step="any" min={axis === 'latitude' ? -90 : -180} max={axis === 'latitude' ? 90 : 180}
                            value={coordinateDraft[axis]} onChange={e => {
                              selectedGeocode.current = false
                              const draft = { ...coordinateDraft, [axis]: e.target.value }
                              setCoordinateDraft(draft)
                              setValue('location.coordinates', draft.latitude !== '' && draft.longitude !== '' ? [Number(draft.longitude), Number(draft.latitude)] : undefined, { shouldValidate: true })
                            }} className="mt-2 w-full p-3 bg-background border border-border rounded-xl" />
                        </label>
                      ))}
                    </div>
                    {errors.location && <p role="alert" className="text-red-500 text-sm">{errors.location.address?.message || errors.location.coordinates?.message || 'La latitud debe estar entre -90 y 90, y la longitud entre -180 y 180.'}</p>}
                  </div>}

                  {!formData.isVirtual && (
                    <motion.button
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                      type="button"
                      onClick={() => setValue('isSecretLocation', !formData.isSecretLocation)}
                      className={`w-full p-4 rounded-xl border text-left transition-all ${formData.isSecretLocation
                        ? 'border-violet-500 bg-violet-500/10'
                        : 'border-white/10 glass bg-white/5 hover:bg-white/10'
                        }`}
                    >
                      <div className="flex items-center gap-3">
                        <Lock className="w-5 h-5 text-violet-400" />
                        <div className="flex-1">
                          <p className="font-semibold text-foreground">
                            {formData.isSecretLocation ? '🔒 Ubicación secreta activada' : '📍 Ubicación pública'}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {formData.isSecretLocation
                              ? 'La dirección exacta solo se revelará a quienes confirmen asistencia o adquieran entrada (ideal para eventos clandestinos, sorpresas o privados).'
                              : 'Cualquiera podrá ver la dirección en el mapa.'}
                          </p>
                        </div>
                      </div>
                    </motion.button>
                  )}

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
                          aria-label="Evento virtual"
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                      </label>
                    </div>

                    {errors.virtualLink && <p role="alert" className="text-red-500 text-sm">{errors.virtualLink.message}</p>}
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
                            {...register('virtualLink')}
                            aria-label="Enlace de la reunión"
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
                      value={formData.maxAttendees}
                      onChange={(e) => {
                        const value = e.target.value === '' ? 0 : Number(e.target.value);
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
                                min="0" max="1000000" step="0.01"
                                value={formData.price.amount}
                                onChange={(e) => {
                                  const value = e.target.value === '' ? 0 : Number(e.target.value);
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
                          Deja el precio en 0 si el evento es gratuito. Se creará una entrada general con esta capacidad y precio.
                        </p>

                        {formData.price.amount > 0 && (
                          <div className="pt-3 border-t border-gray-200 dark:border-gray-600">
                            <label className="block text-sm font-medium text-foreground/90 mb-1">
                              Enlace externo de compra de entradas (opcional)
                            </label>
                            <input
                              type="url"
                              {...register('ticketUrl')}
                              placeholder="Ej: https://tix.do/evento, https://tuboleta.com.do o WhatsApp de reservas"
                              className="w-full p-3 glass bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-blue-500 text-sm"
                            />
                            <p className="text-xs text-muted-foreground mt-1">
                              Los asistentes podrán comprar sus boletas en este enlace o pagar en taquilla física según indiques.
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    {errors.price?.amount && <p role="alert" className="text-sm text-red-500">{errors.price.amount.message}</p>}
                    {errors.ageRestriction && <p role="alert" className="text-sm text-red-500">{errors.ageRestriction.maxAge?.message || errors.ageRestriction.minAge?.message}</p>}
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
                                min="0" max="120"
                                value={formData.ageRestriction?.minAge ?? 0}
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
                                min="0" max="120"
                                value={formData.ageRestriction?.maxAge ?? ''}
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

                    {/* Unofficial / Underground Event Toggle */}
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      type="button"
                      onClick={() => setValue('isUnofficial', !formData.isUnofficial)}
                      className={`w-full p-4 rounded-xl border text-left transition-all ${formData.isUnofficial
                        ? 'border-violet-500 bg-gradient-to-r from-violet-600/15 to-fuchsia-600/15 shadow-[0_0_20px_rgba(139,92,246,0.2)]'
                        : 'border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                        }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="text-2xl flex-shrink-0">🤫</div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-foreground">
                              {formData.isUnofficial ? 'Actividad Extra-oficial' : 'Evento Estándar'}
                            </p>
                            {formData.isUnofficial && (
                              <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-violet-500/20 text-violet-400 border border-violet-500/30">
                                Underground
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mt-0.5">
                            {formData.isUnofficial
                              ? 'Actividad comunitaria local e independiente, visible en la sección de recomendación clandestina.'
                              : 'Evento formal o convencional.'
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

                {friendDraftApplied && <label className="flex items-start gap-3 rounded-2xl border border-primary/30 bg-primary/5 p-4 text-sm leading-6"><input type="checkbox" className="mt-1" checked={friendDraftReviewed} onChange={event => setFriendDraftReviewed(event.target.checked)} />Confirmé fecha, hora, zona horaria, ubicación y precio del texto importado. Si el precio es cero, confirmé que la entrada es gratuita.</label>}
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
                        <span>{formData.date} a las {formData.time} ({formData.timeZone || 'zona por confirmar'})</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-red-500" />
                        <span>{formData.isVirtual ? `En línea: ${formData.virtualLink}` : formData.location.venue || formData.location.address}</span>
                      </div>
                      {!formData.isVirtual && <p className="pl-6 text-muted-foreground">{formData.location.city}, {formData.location.country}</p>}
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
                <div className="p-4 bg-purple-500/10 border border-purple-500/25 rounded-xl">
                  <h4 className="font-semibold text-purple-400 mb-2">🛡️ Curaduría y Moderación de Eventos RD</h4>
                  <ul className="text-sm text-gray-300 space-y-1.5">
                    <li>• Para mantener la comunidad protegida contra eventos ficticios o engañosos, tu evento pasará por el equipo de moderación.</li>
                    <li>• Si eres Organizador Verificado o Administrador, tu evento se publicará de inmediato.</li>
                    <li>• Recibirás una notificación en cuanto el evento sea aprobado y se active en el mapa y la búsqueda.</li>
                  </ul>
                </div>
              </motion.div>
            )}
          </form>
        </div>

        {/* Bottom Actions */}
        <div className="fixed bottom-[60px] md:bottom-0 left-0 right-0 z-40 glass bg-white/90 dark:bg-gray-950/90 backdrop-blur-xl border-t border-gray-200 dark:border-white/10 p-4">
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
              className="flex-1 py-3 bg-gradient-to-r from-violet-500 to-cyan-500 text-white rounded-xl font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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

export default function CreateEventPage() {
  const owner = useAuthStore(state => state.user?._id || state.user?.id || '')
  return (
    <Suspense fallback={<div className="min-h-screen bg-background p-8 flex items-center justify-center"><div className="h-64 w-full max-w-2xl animate-pulse rounded-3xl bg-muted" /></div>}>
      <CreateEventForm key={owner} />
    </Suspense>
  )
}
