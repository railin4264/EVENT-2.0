'use client'

import { useState, useRef, Suspense } from 'react'
import { motion } from 'framer-motion'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Edit3, Camera, MapPin, Calendar, Mail, Phone, Globe, Instagram, Twitter, Linkedin, Check, X, Plus, Trash2, Star, Users, Award } from 'lucide-react'

// Aliases para iconos no disponibles en lucide-react 0.408.0
const Save = Check
import { useAuthStore } from '@/stores/authStore'
import { apiClient } from '@/lib/api/client'
import toast from 'react-hot-toast'
import { FollowButton } from '@/components/social'
import { useSearchParams } from 'next/navigation'
import { getImageUrl } from '@/lib/utils'

interface UserProfile {
  id: string
  username: string
  email: string
  firstName: string
  lastName: string
  bio?: string
  location?: {
    address: string
    coordinates: [number, number]
  }
  avatar?: string
  coverImage?: string
  interests: string[]
  socialLinks: {
    website?: string
    instagram?: string
    twitter?: string
    linkedin?: string
  }
  stats: {
    eventsAttended: number
    eventsCreated: number
    tribesJoined: number
    connections: number
  }
  phone?: string
  birthDate?: string
  isPrivate: boolean
}

function ProfileContent() {
  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState<Partial<UserProfile>>({})
  const [newInterest, setNewInterest] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const coverInputRef = useRef<HTMLInputElement>(null)
  const { user, updateUser } = useAuthStore()
  const queryClient = useQueryClient()
  const searchParams = useSearchParams()
  const viewingUserId = searchParams.get('id')
  const isOwnProfile = !viewingUserId || viewingUserId === user?.id

  // Fetch user profile
  const { data: profile, isLoading } = useQuery({
    queryKey: ['profile', viewingUserId || user?.id],
    queryFn: async () => {
      const endpoint = viewingUserId ? `/users/profile/${viewingUserId}` : '/users/profile'
      const response = await apiClient.get<{ success: boolean; user: UserProfile }>(endpoint)
      return response.data.user
    },
    enabled: !!user
  })

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (data: Partial<UserProfile>) => {
      const response = await apiClient.put('/users/profile', data)
      return response.data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['profile', user?.id] })
      updateUser(data.user)
      setIsEditing(false)
      toast.success('Perfil actualizado correctamente')
    },
    onError: () => {
      toast.error('Error al actualizar el perfil')
    }
  })

  // Upload avatar mutation
  const uploadAvatarMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData()
      formData.append('avatar', file)
      const response = await apiClient.post('/users/avatar', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      })
      return response.data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['profile', user?.id] })
      updateUser({ avatar: data.avatarUrl })
      toast.success('Avatar actualizado')
    },
    onError: () => {
      toast.error('Error al subir la imagen')
    }
  })

  // Upload cover mutation
  const uploadCoverMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await apiClient.post('/users/cover', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      })
      return response.data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['profile', user?.id] })
      toast.success('Portada actualizada')
    },
    onError: () => {
      toast.error('Error al subir la portada')
    }
  })

  const handleEdit = () => {
    setFormData(profile || {})
    setIsEditing(true)
  }

  const handleSave = () => {
    updateProfileMutation.mutate(formData)
  }

  const handleCancel = () => {
    setFormData({})
    setIsEditing(false)
  }

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      uploadAvatarMutation.mutate(file)
    }
  }

  const handleCoverUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Create FormData for cover image upload
      const formData = new FormData()
      formData.append('cover', file)
      uploadCoverMutation.mutate(formData)
    }
  }

  const handleAddInterest = () => {
    if (newInterest.trim() && formData.interests) {
      setFormData({
        ...formData,
        interests: [...formData.interests, newInterest.trim()]
      })
      setNewInterest('')
    }
  }

  const handleRemoveInterest = (index: number) => {
    if (formData.interests) {
      setFormData({
        ...formData,
        interests: formData.interests.filter((_, i) => i !== index)
      })
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-transparent flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-primary shadow-xl shadow-primary/20"></div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-transparent flex items-center justify-center">
        <p className="text-muted-foreground glass px-8 py-4 rounded-3xl border-white/10 font-medium">Error al cargar el perfil</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-transparent pb-24 relative overflow-hidden">
      {/* Background Orbs */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-primary-500/10 rounded-full mix-blend-multiply filter blur-[128px] opacity-70 animate-blob dark:opacity-50" />
        <div className="absolute bottom-1/4 left-1/4 w-[400px] h-[400px] bg-secondary-500/10 rounded-full mix-blend-multiply filter blur-[128px] opacity-70 animate-blob animation-delay-2000 dark:opacity-50" />
      </div>

      <div className="relative z-10 w-full">
      {/* Cover Image */}
      <div className="relative h-72 lg:h-80 bg-gradient-to-br from-primary/30 to-secondary/30">
        {profile.coverImage && (
          <img
            src={getImageUrl(profile.coverImage)}
            alt="Cover"
            className="w-full h-full object-cover"
          />
        )}
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm pointer-events-none"></div>

        <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent pointer-events-none z-10"></div>

        {isEditing && isOwnProfile && (
          <button
            onClick={() => coverInputRef.current?.click()}
            className="absolute top-4 right-4 p-2 bg-black/50 rounded-full text-white hover:bg-black/70 transition-colors"
          >
            <Camera className="w-5 h-5" />
          </button>
        )}

        <input
          ref={coverInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleCoverUpload}
        />
      </div>

      <div className="max-w-4xl mx-auto px-4 -mt-24 relative z-10">
        {/* Profile Header */}
        <div className="glass border-white/10 rounded-3xl shadow-2xl p-6 lg:p-8 mb-8 backdrop-blur-xl bg-white/5">
          <div className="flex flex-col md:flex-row items-center md:items-start gap-6 lg:gap-8 text-center md:text-left">
            {/* Avatar */}
            <div className="relative group mx-auto md:mx-0">
              <div className="w-32 h-32 md:w-40 md:h-40 bg-primary/20 rounded-full border-4 border-background flex items-center justify-center text-primary-foreground text-4xl font-extrabold shadow-2xl overflow-hidden backdrop-blur-sm">
                {profile.avatar ? (
                  <img
                    src={getImageUrl(profile.avatar)}
                    alt="Avatar"
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  profile.firstName[0]
                )}
              </div>

              {isEditing && isOwnProfile && (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute bottom-2 right-2 p-3 bg-primary rounded-full text-white hover:bg-primary/90 transition-all shadow-xl hover:scale-110"
                >
                  <Camera className="w-5 h-5" />
                </button>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarUpload}
              />
            </div>

            {/* Basic Info */}
            <div className="flex-1 w-full mt-4 md:mt-0">
              <div className="flex flex-col md:flex-row md:items-start justify-between mb-4 gap-4">
                <div>
                  <h1 className="text-3xl lg:text-4xl font-extrabold text-foreground mb-1">
                    {profile.firstName} {profile.lastName}
                  </h1>
                  <p className="text-lg text-primary font-medium tracking-wide">@{profile.username}</p>
                </div>

                {isOwnProfile ? (
                  !isEditing ? (
                    <button
                      onClick={handleEdit}
                      className="flex items-center justify-center gap-2 px-6 py-3 bg-foreground hover:bg-white/90 text-background rounded-2xl transition-all shadow-lg font-bold"
                    >
                      <Edit3 className="w-5 h-5" />
                      Editar Perfil
                    </button>
                  ) : (
                    <div className="flex items-center gap-3">
                      <button
                        onClick={handleSave}
                        disabled={updateProfileMutation.isPending}
                        className="flex items-center justify-center gap-2 px-6 py-3 bg-green-500 hover:bg-green-600 text-white rounded-2xl transition-all disabled:opacity-50 font-bold shadow-lg shadow-green-500/20"
                      >
                        <Save className="w-5 h-5" />
                        Guardar
                      </button>
                      <button
                        onClick={handleCancel}
                        className="flex items-center justify-center gap-2 px-6 py-3 bg-white/10 hover:bg-white/20 border border-white/10 text-foreground rounded-2xl transition-all font-bold"
                      >
                        <X className="w-5 h-5" />
                        Cancelar
                      </button>
                    </div>
                  )
                ) : (
                  <FollowButton
                    userId={profile.id}
                    user={{
                      firstName: profile.firstName,
                      lastName: profile.lastName,
                      username: profile.username
                    }}
                    size="md"
                  />
                )}
              </div>

              <p className="text-gray-600 dark:text-gray-400 mb-2">@{profile.username}</p>

              <div className="flex flex-col md:flex-row items-center md:items-start gap-4 text-sm text-muted-foreground mt-4 glass p-4 rounded-2xl border-white/5">
                <span className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-primary" />
                  <span className="font-medium">{profile.email}</span>
                </span>
                {profile.location && (
                  <span className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-primary" />
                    <span className="font-medium">{profile.location.address}</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8 pt-8 border-t border-white/10">
            <div className="text-center glass p-4 rounded-2xl border-white/5 hover:bg-white/10 transition-colors">
              <div className="text-3xl font-extrabold text-primary mb-1">{profile.stats?.eventsAttended || 0}</div>
              <div className="text-xs uppercase tracking-wider font-bold text-muted-foreground">Eventos</div>
            </div>
            <div className="text-center glass p-4 rounded-2xl border-white/5 hover:bg-white/10 transition-colors">
              <div className="text-3xl font-extrabold text-secondary mb-1">{profile.stats?.eventsCreated || 0}</div>
              <div className="text-xs uppercase tracking-wider font-bold text-muted-foreground">Creados</div>
            </div>
            <div className="text-center glass p-4 rounded-2xl border-white/5 hover:bg-white/10 transition-colors">
              <div className="text-3xl font-extrabold text-accent mb-1">{profile.stats?.tribesJoined || 0}</div>
              <div className="text-xs uppercase tracking-wider font-bold text-muted-foreground">Tribus</div>
            </div>
            <div className="text-center glass p-4 rounded-2xl border-white/5 hover:bg-white/10 transition-colors">
              <div className="text-3xl font-extrabold text-orange-500 mb-1">{profile.stats?.connections || 0}</div>
              <div className="text-xs uppercase tracking-wider font-bold text-muted-foreground">Conexiones</div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-8">
            {/* Bio */}
            <div className="glass border-white/10 rounded-3xl shadow-xl p-8 bg-white/5 backdrop-blur-md">
              <h2 className="text-2xl font-extrabold text-foreground mb-6 flex items-center gap-3">
                <Users className="w-6 h-6 text-primary" />
                Acerca de mí
              </h2>

              {isEditing && isOwnProfile ? (
                <textarea
                  value={formData.bio || ''}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                  placeholder="Cuéntanos sobre ti..."
                  className="w-full p-4 border border-white/10 bg-white/5 rounded-2xl focus:ring-2 focus:ring-primary focus:border-transparent resize-none text-foreground placeholder-white/50 transition-all font-medium backdrop-blur-md"
                  rows={4}
                />
              ) : (
                <p className="text-muted-foreground leading-relaxed text-lg">
                  {profile.bio || 'Esta persona es muy misteriosa y no ha escrito una biografía todavía.'}
                </p>
              )}
            </div>

            {/* Interests */}
            <div className="glass border-white/10 rounded-3xl shadow-xl p-8 bg-white/5 backdrop-blur-md">
              <h2 className="text-2xl font-extrabold text-foreground mb-6 flex items-center gap-3">
                <Star className="w-6 h-6 text-secondary" />
                Intereses
              </h2>

              <div className="flex flex-wrap gap-2 mb-6">
                {(isEditing && isOwnProfile ? formData.interests : profile.interests)?.map((interest, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex items-center gap-2 px-4 py-2 glass bg-primary/10 border-primary/20 text-foreground rounded-xl text-sm font-bold shadow-sm"
                  >
                    <span>{interest}</span>
                    {isEditing && isOwnProfile && (
                      <button
                        onClick={() => handleRemoveInterest(index)}
                        className="hover:bg-red-500 hover:text-white rounded p-1 transition-colors text-muted-foreground"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </motion.div>
                ))}
              </div>

              {isEditing && isOwnProfile && (
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={newInterest}
                    onChange={(e) => setNewInterest(e.target.value)}
                    placeholder="Agregar interés"
                    className="flex-1 px-4 py-3 border border-white/10 bg-white/5 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent text-foreground placeholder-white/50 transition-all font-medium backdrop-blur-md"
                    onKeyPress={(e) => e.key === 'Enter' && handleAddInterest()}
                  />
                  <button
                    onClick={handleAddInterest}
                    className="px-6 py-3 bg-primary hover:bg-primary/90 text-white rounded-xl font-bold transition-all shadow-lg hover:shadow-primary/30"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-8">
            {/* Contact Info */}
            <div className="glass border-white/10 rounded-3xl shadow-xl p-8 bg-white/5 backdrop-blur-md">
              <h2 className="text-xl font-extrabold text-foreground mb-6">Información</h2>

              <div className="space-y-6">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
                    <Mail className="w-5 h-5 text-primary" />
                  </div>
                  {isEditing && isOwnProfile ? (
                    <input
                      type="email"
                      value={formData.email || ''}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="flex-1 px-4 py-3 border border-white/10 bg-white/5 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent text-foreground placeholder-white/50 transition-all font-medium backdrop-blur-md"
                    />
                  ) : (
                    <span className="text-muted-foreground font-medium text-sm md:text-base break-all">{profile.email}</span>
                  )}
                </div>

                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
                    <Phone className="w-5 h-5 text-secondary" />
                  </div>
                  {isEditing && isOwnProfile ? (
                    <input
                      type="tel"
                      value={formData.phone || ''}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="Teléfono"
                      className="flex-1 px-4 py-3 border border-white/10 bg-white/5 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent text-foreground placeholder-white/50 transition-all font-medium backdrop-blur-md"
                    />
                  ) : (
                    <span className="text-muted-foreground font-medium text-sm md:text-base">{profile.phone || 'No especificado'}</span>
                  )}
                </div>

                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
                    <MapPin className="w-5 h-5 text-accent" />
                  </div>
                  {isEditing && isOwnProfile ? (
                    <input
                      type="text"
                      value={formData.location?.address || ''}
                      onChange={(e) => setFormData({
                        ...formData,
                        location: { ...formData.location, address: e.target.value } as any
                      })}
                      placeholder="Ubicación"
                      className="flex-1 px-4 py-3 border border-white/10 bg-white/5 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent text-foreground placeholder-white/50 transition-all font-medium backdrop-blur-md"
                    />
                  ) : (
                    <span className="text-muted-foreground font-medium text-sm md:text-base">
                      {profile.location?.address || 'No especificado'}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Social Links */}
            <div className="glass border-white/10 rounded-3xl shadow-xl p-8 bg-white/5 backdrop-blur-md">
              <h2 className="text-xl font-extrabold text-foreground mb-6">Redes Sociales</h2>

              <div className="space-y-6">
                {[
                  { key: 'website', icon: Globe, label: 'Sitio Web', color: 'text-blue-400' },
                  { key: 'instagram', icon: Instagram, label: 'Instagram', color: 'text-pink-500' },
                  { key: 'twitter', icon: Twitter, label: 'Twitter', color: 'text-sky-400' },
                  { key: 'linkedin', icon: Linkedin, label: 'LinkedIn', color: 'text-blue-600' }
                ].map(({ key, icon: Icon, label, color }) => (
                  <div key={key} className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center border border-white/5">
                      <Icon className={`w-5 h-5 ${color}`} />
                    </div>
                    {isEditing && isOwnProfile ? (
                      <input
                        type="url"
                        value={(formData.socialLinks as any)?.[key] || ''}
                        onChange={(e) => setFormData({
                          ...formData,
                          socialLinks: {
                            ...formData.socialLinks,
                            [key]: e.target.value
                          }
                        })}
                        placeholder={`${label} URL`}
                        className="flex-1 w-full px-4 py-3 border border-white/10 bg-white/5 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent text-foreground placeholder-white/50 transition-all font-medium backdrop-blur-md"
                      />
                    ) : (
                      <span className="text-muted-foreground font-medium text-sm md:text-base truncate">
                        {(profile.socialLinks as any)?.[key] || 'No vinculado'}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Privacy Settings */}
            <div className="glass border-white/10 rounded-3xl shadow-xl p-8 bg-white/5 backdrop-blur-md">
              <h2 className="text-xl font-extrabold text-foreground mb-6">Privacidad</h2>

              {isEditing && isOwnProfile ? (
                <label className="flex items-center gap-4 cursor-pointer p-4 rounded-xl border border-gray-200 dark:border-white/5 bg-white/50 dark:bg-black/10 transition-all">
                  <input
                    type="checkbox"
                    checked={formData.isPrivate || false}
                    onChange={(e) => setFormData({ ...formData, isPrivate: e.target.checked })}
                    className="w-5 h-5 rounded focus:ring-primary text-primary"
                  />
                  <span className="text-gray-900 dark:text-foreground font-bold">Cuenta Privada</span>
                </label>
              ) : (
                <p className="text-muted-foreground font-medium flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-primary/80"></span>
                  {profile.isPrivate ? 'Esta cuenta es Privada' : 'Esta cuenta es Pública'}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
      </div>
    </div>
  )
}
export default function ProfilePage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen bg-transparent"><div className="animate-spin rounded-full h-12 w-12 border-b-4 border-primary"></div></div>}>
      <ProfileContent />
    </Suspense>
  )
}
