'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter, useParams } from 'next/navigation'
import { Calendar, Clock, MapPin, Users, Globe, Lock, Plus, X, Check, ChevronLeft, CheckCircle, AlertCircle, DollarSign, Tag, FileText, Settings, Image as ImageIcon } from 'lucide-react'
import { apiClient } from '@/lib/api/client'
import { useAuthStore } from '@/stores/authStore'
import toast from 'react-hot-toast'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

const Save = Check
const Ticket = FileText

const eventSchema = z.object({
  title: z.string().min(5, 'Mínimo 5 caracteres').max(100, 'Máximo 100 caracteres'),
  description: z.string().min(20, 'Mínimo 20 caracteres'),
  category: z.string().min(1, 'Selecciona una categoría'),
  date: z.string().min(1, 'La fecha es requerida'),
  time: z.string().min(1, 'La hora es requerida'),
  location: z.string().min(3, 'Mínimo 3 caracteres'),
  venue: z.string().optional(),
  maxAttendees: z.number().min(1).max(100000),
  price: z.number().min(0),
  currency: z.string(),
  isPrivate: z.boolean(),
  tags: z.array(z.string()),
})

type EventFormData = z.infer<typeof eventSchema>

const CATEGORIES = ['Música', 'Deportes', 'Arte', 'Tecnología', 'Gastronomía', 'Negocios', 'Educación', 'Social', 'Otro']

export default function EditEventPage() {
  const router = useRouter()
  const params = useParams()
  const queryClient = useQueryClient()
  const { user } = useAuthStore()
  const eventId = params?.id as string

  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')

  const { data: eventData, isLoading } = useQuery({
    queryKey: ['event', eventId],
    queryFn: async () => {
      const res = await apiClient.get(`/events/${eventId}`)
      return res.data.data || res.data
    },
    enabled: !!eventId,
  })

  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<EventFormData>({
    resolver: zodResolver(eventSchema),
    defaultValues: {
      currency: 'USD',
      maxAttendees: 100,
      price: 0,
      isPrivate: false,
      tags: [],
    },
  })

  useEffect(() => {
    if (eventData) {
      const event = eventData
      const dateObj = new Date(event.date)
      reset({
        title: event.title || '',
        description: event.description || '',
        category: event.category || '',
        date: dateObj.toISOString().split('T')[0],
        time: dateObj.toTimeString().slice(0, 5),
        location: event.location?.address || '',
        venue: event.location?.venue || '',
        maxAttendees: event.maxAttendees || 100,
        price: event.price?.amount ?? event.price ?? 0,
        currency: event.price?.currency || 'USD',
        isPrivate: event.isPrivate || false,
        tags: event.tags || [],
      })
      setTags(event.tags || [])
    }
  }, [eventData, reset])

  const updateMutation = useMutation({
    mutationFn: async (data: EventFormData) => {
      const dateTime = new Date(`${data.date}T${data.time}`)
      const payload = {
        title: data.title,
        description: data.description,
        category: data.category,
        date: dateTime.toISOString(),
        location: { address: data.location, venue: data.venue },
        maxAttendees: data.maxAttendees,
        price: { amount: data.price, currency: data.currency },
        isPrivate: data.isPrivate,
        tags,
      }
      const res = await apiClient.put(`/events/${eventId}`, payload)
      return res.data
    },
    onSuccess: () => {
      toast.success('Evento actualizado correctamente')
      queryClient.invalidateQueries({ queryKey: ['event', eventId] })
      router.push(`/events/${eventId}`)
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Error al actualizar el evento')
    },
  })

  const addTag = () => {
    const t = tagInput.trim().toLowerCase()
    if (t && !tags.includes(t) && tags.length < 10) {
      const updated = [...tags, t]
      setTags(updated)
      setValue('tags', updated)
      setTagInput('')
    }
  }

  const removeTag = (tag: string) => {
    const updated = tags.filter(t => t !== tag)
    setTags(updated)
    setValue('tags', updated)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!eventData) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <p className="text-white text-xl mb-4">Evento no encontrado</p>
          <button onClick={() => router.back()} className="text-emerald-400 hover:text-emerald-300">
            Volver
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-gray-950/95 backdrop-blur border-b border-white/10">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <button onClick={() => router.back()} className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
            <ChevronLeft className="w-5 h-5" />
            <span>Volver</span>
          </button>
          <h1 className="text-white font-semibold text-lg">Editar Evento</h1>
          <button
            onClick={handleSubmit(d => updateMutation.mutate(d))}
            disabled={updateMutation.isPending}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors disabled:opacity-50"
          >
            {updateMutation.isPending ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            Guardar
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit(d => updateMutation.mutate(d))} className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        {/* Basic Info */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="bg-gray-900 border border-white/10 rounded-2xl p-6 space-y-4">
          <h2 className="text-white font-semibold flex items-center gap-2">
            <Settings className="w-5 h-5 text-emerald-400" /> Información básica
          </h2>

          <div>
            <label className="text-gray-400 text-sm mb-1 block">Título *</label>
            <input {...register('title')}
              className="w-full bg-gray-800 border border-white/10 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-emerald-500 transition-colors"
              placeholder="Nombre del evento" />
            {errors.title && <p className="text-red-400 text-xs mt-1">{errors.title.message}</p>}
          </div>

          <div>
            <label className="text-gray-400 text-sm mb-1 block">Descripción *</label>
            <textarea {...register('description')} rows={4}
              className="w-full bg-gray-800 border border-white/10 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-emerald-500 transition-colors resize-none"
              placeholder="Describe tu evento..." />
            {errors.description && <p className="text-red-400 text-xs mt-1">{errors.description.message}</p>}
          </div>

          <div>
            <label className="text-gray-400 text-sm mb-1 block">Categoría *</label>
            <select {...register('category')}
              className="w-full bg-gray-800 border border-white/10 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-emerald-500 transition-colors">
              <option value="">Selecciona una categoría</option>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            {errors.category && <p className="text-red-400 text-xs mt-1">{errors.category.message}</p>}
          </div>
        </motion.div>

        {/* Date & Time */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="bg-gray-900 border border-white/10 rounded-2xl p-6 space-y-4">
          <h2 className="text-white font-semibold flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-400" /> Fecha y hora
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-gray-400 text-sm mb-1 block">Fecha *</label>
              <input type="date" {...register('date')}
                className="w-full bg-gray-800 border border-white/10 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-emerald-500 transition-colors" />
              {errors.date && <p className="text-red-400 text-xs mt-1">{errors.date.message}</p>}
            </div>
            <div>
              <label className="text-gray-400 text-sm mb-1 block">Hora *</label>
              <input type="time" {...register('time')}
                className="w-full bg-gray-800 border border-white/10 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-emerald-500 transition-colors" />
              {errors.time && <p className="text-red-400 text-xs mt-1">{errors.time.message}</p>}
            </div>
          </div>
        </motion.div>

        {/* Location */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="bg-gray-900 border border-white/10 rounded-2xl p-6 space-y-4">
          <h2 className="text-white font-semibold flex items-center gap-2">
            <MapPin className="w-5 h-5 text-rose-400" /> Ubicación
          </h2>
          <div>
            <label className="text-gray-400 text-sm mb-1 block">Dirección *</label>
            <input {...register('location')}
              className="w-full bg-gray-800 border border-white/10 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-emerald-500 transition-colors"
              placeholder="Dirección del evento" />
            {errors.location && <p className="text-red-400 text-xs mt-1">{errors.location.message}</p>}
          </div>
          <div>
            <label className="text-gray-400 text-sm mb-1 block">Nombre del lugar (opcional)</label>
            <input {...register('venue')}
              className="w-full bg-gray-800 border border-white/10 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-emerald-500 transition-colors"
              placeholder="Ej: Teatro Municipal" />
          </div>
        </motion.div>

        {/* Tickets & Capacity */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          className="bg-gray-900 border border-white/10 rounded-2xl p-6 space-y-4">
          <h2 className="text-white font-semibold flex items-center gap-2">
            <Ticket className="w-5 h-5 text-violet-400" /> Entradas y capacidad
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-gray-400 text-sm mb-1 block">Capacidad máxima</label>
              <input type="number" min={1} {...register('maxAttendees', { valueAsNumber: true })}
                className="w-full bg-gray-800 border border-white/10 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-emerald-500 transition-colors" />
            </div>
            <div>
              <label className="text-gray-400 text-sm mb-1 block">Precio</label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input type="number" min={0} step={0.01} {...register('price', { valueAsNumber: true })}
                  className="w-full bg-gray-800 border border-white/10 text-white rounded-xl pl-9 pr-4 py-3 focus:outline-none focus:border-emerald-500 transition-colors" />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <input type="checkbox" id="isPrivate" {...register('isPrivate')}
              className="w-4 h-4 rounded border-white/20 bg-gray-800 text-emerald-500 focus:ring-emerald-500" />
            <label htmlFor="isPrivate" className="text-gray-300 flex items-center gap-2">
              <Lock className="w-4 h-4" /> Evento privado
            </label>
          </div>
        </motion.div>

        {/* Tags */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
          className="bg-gray-900 border border-white/10 rounded-2xl p-6 space-y-4">
          <h2 className="text-white font-semibold flex items-center gap-2">
            <Tag className="w-5 h-5 text-amber-400" /> Etiquetas
          </h2>
          <div className="flex gap-2">
            <input
              value={tagInput}
              onChange={e => setTagInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addTag())}
              className="flex-1 bg-gray-800 border border-white/10 text-white rounded-xl px-4 py-2 focus:outline-none focus:border-emerald-500 transition-colors text-sm"
              placeholder="Añadir etiqueta..." />
            <button type="button" onClick={addTag}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition-colors">
              <Plus className="w-4 h-4" />
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {tags.map(tag => (
              <span key={tag} className="flex items-center gap-1 bg-emerald-500/20 text-emerald-300 px-3 py-1 rounded-full text-sm">
                #{tag}
                <button type="button" onClick={() => removeTag(tag)} className="hover:text-white transition-colors">
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        </motion.div>

        <div className="pb-8">
          <button type="submit" disabled={updateMutation.isPending}
            className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-2xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
            {updateMutation.isPending ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <CheckCircle className="w-5 h-5" />
            )}
            Guardar cambios
          </button>
        </div>
      </form>
    </div>
  )
}
