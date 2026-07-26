'use client'

import { useState, useRef } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { User, Camera, Image as ImageIcon } from 'lucide-react'
import { apiClient } from '@/lib/api/client'
import toast from 'react-hot-toast'
import { CldImage } from 'next-cloudinary'
import { getImageUrl } from '@/lib/utils'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

const profileSchema = z.object({
  firstName: z.string()
    .min(2, 'El nombre debe tener al menos 2 caracteres'),
  lastName: z.string()
    .min(2, 'El apellido debe tener al menos 2 caracteres'),
  username: z.string()
    .min(3, 'El nombre de usuario debe tener al menos 3 caracteres')
    .regex(/^[a-zA-Z0-9_]+$/, 'Solo se permiten letras, números y guiones bajos'),
  phone: z.string()
    .regex(/^[0-9+\-\s()]*$/, 'Formato de teléfono inválido')
    .optional()
    .or(z.literal('')),
  bio: z.string()
    .max(500, 'La biografía no puede exceder 500 caracteres')
    .optional()
    .or(z.literal('')),
  location: z.object({
    address: z.string()
      .max(200, 'La dirección no puede exceder 200 caracteres')
      .optional()
      .or(z.literal(''))
  }).optional(),
  socialLinks: z.object({
    website: z.string()
      .url('URL inválida')
      .optional()
      .or(z.literal('')),
    instagram: z.string()
      .optional()
      .or(z.literal('')),
    twitter: z.string()
      .optional()
      .or(z.literal('')),
    linkedin: z.string()
      .optional()
      .or(z.literal(''))
  }).optional()
})

type ProfileFormData = z.infer<typeof profileSchema>

interface ProfileSettingsProps {
  user: any
}

export default function ProfileSettings({ user }: ProfileSettingsProps) {
  const queryClient = useQueryClient()
  const avatarInputRef = useRef<HTMLInputElement>(null)
  const coverInputRef = useRef<HTMLInputElement>(null)
  const [newInterest, setNewInterest] = useState('')

  const { register, handleSubmit, formState: { errors, isSubmitting }, setValue, watch } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: user?.firstName || '',
      lastName: user?.lastName || '',
      username: user?.username || '',
      bio: user?.bio || '',
      phone: user?.phone || '',
      location: {
        address: user?.location?.address || ''
      },
      socialLinks: {
        website: user?.socialLinks?.website || '',
        instagram: user?.socialLinks?.instagram || '',
        twitter: user?.socialLinks?.twitter || '',
        linkedin: user?.socialLinks?.linkedin || ''
      }
    }
  })

  const bio = watch('bio') || ''
  const [interests, setInterests] = useState<string[]>(user?.interests || [])

  const updateProfileMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiClient.put('/users/me/profile', data)
      return response.data
    },
    onSuccess: (data) => {
      toast.success('Perfil actualizado exitosamente')
      queryClient.invalidateQueries({ queryKey: ['user'] })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Error al actualizar perfil')
    }
  })

  const uploadAvatarMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData()
      formData.append('avatar', file)
      const response = await apiClient.post('/users/avatar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      return response.data
    },
    onSuccess: () => {
      toast.success('Avatar actualizado exitosamente')
      queryClient.invalidateQueries({ queryKey: ['user'] })
    },
    onError: () => {
      toast.error('Error al subir avatar')
    }
  })

  const uploadCoverMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData()
      formData.append('cover', file)
      const response = await apiClient.post('/users/cover', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      return response.data
    },
    onSuccess: () => {
      toast.success('Imagen de portada actualizada exitosamente')
      queryClient.invalidateQueries({ queryKey: ['user'] })
    },
    onError: () => {
      toast.error('Error al subir imagen de portada')
    }
  })

  const onSubmit = (data: ProfileFormData) => {
    // Clean up data: remove empty strings from socialLinks to avoid validation errors
    const cleanedData = {
      ...data,
      interests,
      socialLinks: {
        website: data.socialLinks?.website || undefined,
        instagram: data.socialLinks?.instagram || undefined,
        twitter: data.socialLinks?.twitter || undefined,
        linkedin: data.socialLinks?.linkedin || undefined
      }
    }

    updateProfileMutation.mutate(cleanedData)
  }

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error('La imagen debe ser menor a 10MB')
        return
      }
      uploadAvatarMutation.mutate(file)
    }
  }

  const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error('La imagen debe ser menor a 10MB')
        return
      }
      uploadCoverMutation.mutate(file)
    }
  }

  const addInterest = () => {
    if (newInterest.trim() && !interests.includes(newInterest.trim())) {
      setInterests([...interests, newInterest.trim()])
      setNewInterest('')
    }
  }

  const removeInterest = (interest: string) => {
    setInterests(interests.filter(i => i !== interest))
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-2">
          Configuración del Perfil
        </h2>
        <p className="text-muted-foreground">
          Actualiza tu información personal y foto de perfil
        </p>
      </div>

      {/* Avatar and Cover */}
      <div className="space-y-4">
        {/* Cover Image */}
        <div className="relative h-48 bg-gradient-to-r from-primary-400 to-primary-600 rounded-2xl overflow-hidden">
          {user?.coverImage && (
            <CldImage
              src={getImageUrl(user.coverImage)}
              alt="Cover"
              fill
              className="object-cover"
            />
          )}
          <button
            onClick={() => coverInputRef.current?.click()}
            className="absolute bottom-4 right-4 p-3 glass bg-white/5 border border-white/5 rounded-full shadow-lg hover:shadow-xl transition-shadow"
          >
            <Camera className="w-5 h-5 text-foreground/90" />
          </button>
          <input
            ref={coverInputRef}
            type="file"
            accept="image/*"
            onChange={handleCoverChange}
            className="hidden"
          />
        </div>

        {/* Avatar */}
        <div className="flex items-center gap-6 -mt-20 ml-6">
          <div className="relative">
            <div className="w-32 h-32 rounded-full border-4 border-white dark:border-gray-900 overflow-hidden bg-gray-200 dark:bg-gray-700">
              {user?.avatar ? (
                <CldImage
                  src={getImageUrl(user.avatar)}
                  alt={user.firstName}
                  width={128}
                  height={128}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <User className="w-16 h-16 text-gray-400" />
                </div>
              )}
            </div>
            <button
              onClick={() => avatarInputRef.current?.click()}
              className="absolute bottom-0 right-0 p-2 bg-primary rounded-full shadow-lg hover:bg-primary-600 transition-colors"
            >
              <Camera className="w-4 h-4 text-white" />
            </button>
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/*"
              onChange={handleAvatarChange}
              className="hidden"
            />
          </div>

          <div className="mt-16">
            <h3 className="text-xl font-bold text-foreground">
              {user?.firstName} {user?.lastName}
            </h3>
            <p className="text-muted-foreground">@{user?.username}</p>
          </div>
        </div>
      </div>

      {/* Profile Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Basic Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-foreground/90 mb-2">
              Nombre
            </label>
            <input
              type="text"
              {...register('firstName')}
              className="w-full p-3 border border-gray-200 dark:border-white/10 rounded-xl glass bg-white/50 dark:bg-white/5 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
            {errors.firstName && (
              <p className="text-red-500 text-sm mt-1">{errors.firstName.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground/90 mb-2">
              Apellido
            </label>
            <input
              type="text"
              {...register('lastName')}
              className="w-full p-3 border border-gray-200 dark:border-white/10 rounded-xl glass bg-white/50 dark:bg-white/5 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
            {errors.lastName && (
              <p className="text-red-500 text-sm mt-1">{errors.lastName.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground/90 mb-2">
              Nombre de usuario
            </label>
            <input
              type="text"
              {...register('username')}
              className="w-full p-3 border border-gray-200 dark:border-white/10 rounded-xl glass bg-white/50 dark:bg-white/5 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
            {errors.username && (
              <p className="text-red-500 text-sm mt-1">{errors.username.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground/90 mb-2">
              Teléfono
            </label>
            <input
              type="tel"
              {...register('phone')}
              className="w-full p-3 border border-gray-200 dark:border-white/10 rounded-xl glass bg-white/50 dark:bg-white/5 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
            {errors.phone && (
              <p className="text-red-500 text-sm mt-1">{errors.phone.message}</p>
            )}
          </div>
        </div>

        {/* Bio */}
        <div>
          <label className="block text-sm font-medium text-foreground/90 mb-2">
            Biografía
          </label>
          <textarea
            {...register('bio')}
            rows={4}
            maxLength={500}
            className="w-full p-3 border border-gray-200 dark:border-white/10 rounded-xl glass bg-white/50 dark:bg-white/5 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
            placeholder="Cuéntanos sobre ti..."
          />
          {errors.bio && (
            <p className="text-red-500 text-sm mt-1">{errors.bio.message}</p>
          )}
          <p className="text-sm text-muted-foreground mt-1">
            {bio.length}/500 caracteres
          </p>
        </div>

        {/* Location */}
        <div>
          <label className="block text-sm font-medium text-foreground/90 mb-2">
            Ubicación
          </label>
          <input
            type="text"
            {...register('location.address')}
            className="w-full p-3 border border-gray-200 dark:border-white/10 rounded-xl glass bg-white/50 dark:bg-white/5 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            placeholder="Ciudad, País"
          />
          {errors.location?.address && (
            <p className="text-red-500 text-sm mt-1">{errors.location.address.message}</p>
          )}
        </div>

        {/* Interests */}
        <div>
          <label className="block text-sm font-medium text-foreground/90 mb-2">
            Intereses
          </label>
          <div className="flex gap-2 mb-3">
            <input
              type="text"
              value={newInterest}
              onChange={(e) => setNewInterest(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addInterest())}
              className="flex-1 p-3 border border-white/10 rounded-xl glass bg-white/5 text-foreground focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="Agregar interés..."
            />
            <button
              type="button"
              onClick={addInterest}
              className="px-6 py-3 bg-primary text-white rounded-xl hover:bg-primary-600 transition-colors"
            >
              Agregar
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {interests.map((interest, index) => (
              <span
                key={index}
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary/20 bg-primary/20 backdrop-blur-sm text-primary rounded-full"
              >
                {interest}
                <button
                  type="button"
                  onClick={() => removeInterest(interest)}
                  className="text-primary-600 hover:text-primary dark:hover:text-primary-200"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        </div>

        {/* Social Links */}
        <div>
          <h3 className="text-lg font-semibold text-foreground mb-4">
            Redes Sociales
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground/90 mb-2">
                Sitio web
              </label>
              <input
                type="url"
                {...register('socialLinks.website')}
                className="w-full p-3 border border-gray-200 dark:border-white/10 rounded-xl glass bg-white/50 dark:bg-white/5 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="https://..."
              />
              {errors.socialLinks?.website && (
                <p className="text-red-500 text-sm mt-1">{errors.socialLinks.website.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground/90 mb-2">
                Instagram
              </label>
              <input
                type="text"
                {...register('socialLinks.instagram')}
                className="w-full p-3 border border-gray-200 dark:border-white/10 rounded-xl glass bg-white/50 dark:bg-white/5 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="@usuario"
              />
              {errors.socialLinks?.instagram && (
                <p className="text-red-500 text-sm mt-1">{errors.socialLinks.instagram.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground/90 mb-2">
                Twitter
              </label>
              <input
                type="text"
                {...register('socialLinks.twitter')}
                className="w-full p-3 border border-gray-200 dark:border-white/10 rounded-xl glass bg-white/50 dark:bg-white/5 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="@usuario"
              />
              {errors.socialLinks?.twitter && (
                <p className="text-red-500 text-sm mt-1">{errors.socialLinks.twitter.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground/90 mb-2">
                LinkedIn
              </label>
              <input
                type="text"
                {...register('socialLinks.linkedin')}
                className="w-full p-3 border border-gray-200 dark:border-white/10 rounded-xl glass bg-white/50 dark:bg-white/5 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="usuario"
              />
              {errors.socialLinks?.linkedin && (
                <p className="text-red-500 text-sm mt-1">{errors.socialLinks.linkedin.message}</p>
              )}
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isSubmitting || updateProfileMutation.isPending}
            className="px-8 py-3 bg-primary text-white rounded-xl hover:bg-primary-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            {(isSubmitting || updateProfileMutation.isPending) ? 'Guardando...' : 'Guardar Cambios'}
          </button>
        </div>
      </form>
    </div>
  )
}
