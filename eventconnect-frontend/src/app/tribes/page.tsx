'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Users, Search, Plus, Filter, Star, MapPin, Calendar, MessageCircle, Crown, Shield, Heart, TrendingUp, Globe, Lock } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { apiClient } from '@/lib/api/client'
import toast from 'react-hot-toast'
import { EmptyState } from '@/components/ui/EmptyState'

interface Tribe {
  _id: string
  name: string
  description: string
  category: string
  avatar?: string
  cover?: string
  isPrivate: boolean
  tags?: string[]
  createdBy: {
    _id?: string
    username: string
    firstName: string
    lastName: string
    avatar?: string
  }
  members: string[]
  stats: {
    memberCount: number
    eventCount: number
    activityLevel: 'low' | 'medium' | 'high'
  }
  location?: {
    address?: string
    isVirtual?: boolean
  }
  createdAt: string
  // Runtime properties added by frontend
  isMember?: boolean
  isAdmin?: boolean
  hasPendingRequest?: boolean
  // Computed properties for convenience
  isPublic?: boolean
  memberCount?: number
}

interface CreateTribeForm {
  name: string
  description: string
  category: string
  isPublic: boolean
  tags: string[]
  location: {
    address: string
  }
}

const CATEGORY_TRANSLATIONS: Record<string, string> = {
  music: 'Música',
  sports: 'Deportes',
  technology: 'Tecnología',
  art: 'Arte',
  food: 'Comida',
  travel: 'Viajes',
  education: 'Educación',
  business: 'Negocios',
  health: 'Salud',
  fitness: 'Fitness',
  gaming: 'Videojuegos',
  reading: 'Lectura',
  photography: 'Fotografía',
  cooking: 'Cocina',
  dancing: 'Danza',
  writing: 'Escritura',
  volunteering: 'Voluntariado',
  outdoors: 'Aire Libre',
  fashion: 'Moda',
  networking: 'Networking',
  professional: 'Profesional',
  hobby: 'Hobbies',
  cultural: 'Cultura',
  spiritual: 'Espiritualidad',
  other: 'Otros'
}

const categories = Object.keys(CATEGORY_TRANSLATIONS)

export default function TribesPage() {
  const [selectedTab, setSelectedTab] = useState<'discover' | 'my-tribes'>('discover')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newTag, setNewTag] = useState('')
  const [createForm, setCreateForm] = useState<CreateTribeForm>({
    name: '',
    description: '',
    category: '',
    isPublic: true,
    tags: [],
    location: {
      address: ''
    }
  })

  const { user } = useAuthStore()
  const router = useRouter()
  const queryClient = useQueryClient()

  // Helper function to process tribe data
  const processTribeData = (tribeData: any[]): Tribe[] => {
    if (!tribeData) return []

    return tribeData.map((tribe: any) => ({
      ...tribe,
      // Add computed properties for convenience
      isPublic: !tribe.isPrivate,
      memberCount: tribe.stats?.memberCount || 0,
      // Add runtime properties (will be updated by mutations)
      isMember: tribe.isMember || false,
      isAdmin: tribe.isAdmin || false,
      hasPendingRequest: tribe.hasPendingRequest || false
    }))
  }

  // Fetch tribes
  const { data: tribes, isLoading } = useQuery({
    queryKey: ['tribes', selectedTab, searchQuery, selectedCategory],
    queryFn: async () => {
      if (selectedTab === 'my-tribes') {
        const response = await apiClient.get('/tribes/user/me')
        return processTribeData(response.data.tribes)
      } else {
        const params = new URLSearchParams({
          ...(searchQuery && { search: searchQuery }),
          ...(selectedCategory !== 'all' && { category: selectedCategory })
        })

        const response = await apiClient.get(`/tribes?${params}`)
        return processTribeData(response.data.tribes)
      }
    }
  })

  // Join tribe mutation
  const joinTribeMutation = useMutation({
    mutationFn: async (tribeId: string) => {
      const response = await apiClient.post(`/tribes/${tribeId}/join`)
      return { tribeId, ...response.data }
    },
    onMutate: async (tribeId: string) => {
      // Cancel any outgoing refetches so they don't overwrite our optimistic update
      await queryClient.cancelQueries({ queryKey: ['tribes'] })

      // Snapshot the previous value
      const previousTribes = queryClient.getQueryData(['tribes', selectedTab, searchQuery, selectedCategory])

      // Optimistically update to the new value
      queryClient.setQueryData(['tribes', selectedTab, searchQuery, selectedCategory], (old: any) => {
        if (!old) return old
        return old.map((tribe: Tribe) => {
          if (tribe._id === tribeId) {
            // For public tribes: immediately become member
            // For private tribes: just set pending request
            const isPublic = !tribe.isPrivate
            if (isPublic) {
              return {
                ...tribe,
                isMember: true,
                memberCount: (tribe.memberCount || 0) + 1,
                stats: {
                  ...tribe.stats,
                  memberCount: (tribe.stats?.memberCount || 0) + 1
                }
              }
            } else {
              return {
                ...tribe,
                hasPendingRequest: true
              }
            }
          }
          return tribe
        })
      })

      // Return a context object with the snapshotted value
      return { previousTribes }
    },
    onSuccess: (data, tribeId) => {
      // Invalidate to get fresh data from server
      queryClient.invalidateQueries({ queryKey: ['tribes'] })

      // Check if user was already a member
      if (data.alreadyMember) {
        toast('Ya eres miembro de esta tribu', { icon: 'ℹ️' })
        return
      }

      // Get the tribe to check if it's public or private
      const currentTribes = queryClient.getQueryData(['tribes', selectedTab, searchQuery, selectedCategory]) as Tribe[]
      const tribe = currentTribes?.find(t => t._id === tribeId)

      if (!tribe?.isPrivate) {
        toast.success('Te has unido a la tribu exitosamente')
      } else {
        toast.success('Solicitud enviada correctamente')
      }
    },
    onError: (err, tribeId, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousTribes) {
        queryClient.setQueryData(['tribes', selectedTab, searchQuery, selectedCategory], context.previousTribes)
      }
      toast.error('Error al unirse a la tribu')
    },
    onSettled: () => {
      // Always refetch after error or success to ensure we have the correct state
      queryClient.invalidateQueries({ queryKey: ['tribes'] })
    }
  })

  // Leave tribe mutation
  const leaveTribeMutation = useMutation({
    mutationFn: async (tribeId: string) => {
      const response = await apiClient.post(`/tribes/${tribeId}/leave`)
      return { tribeId, ...response.data }
    },
    onMutate: async (tribeId: string) => {
      // Cancel any outgoing refetches so they don't overwrite our optimistic update
      await queryClient.cancelQueries({ queryKey: ['tribes'] })

      // Snapshot the previous value
      const previousTribes = queryClient.getQueryData(['tribes', selectedTab, searchQuery, selectedCategory])

      // Optimistically update to the new value
      queryClient.setQueryData(['tribes', selectedTab, searchQuery, selectedCategory], (old: any) => {
        if (!old) return old
        return old.map((tribe: Tribe) =>
          tribe._id === tribeId
            ? {
              ...tribe,
              isMember: false,
              hasPendingRequest: false,
              memberCount: Math.max(0, (tribe.memberCount || 0) - 1),
              stats: {
                ...tribe.stats,
                memberCount: Math.max(0, (tribe.stats?.memberCount || 0) - 1)
              }
            }
            : tribe
        )
      })

      // Return a context object with the snapshotted value
      return { previousTribes }
    },
    onSuccess: (data) => {
      // Invalidate to get fresh data from server
      queryClient.invalidateQueries({ queryKey: ['tribes'] })
      toast.success('Has salido de la tribu')
    },
    onError: (err, tribeId, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousTribes) {
        queryClient.setQueryData(['tribes', selectedTab, searchQuery, selectedCategory], context.previousTribes)
      }
      toast.error('Error al salir de la tribu')
    },
    onSettled: () => {
      // Always refetch after error or success to ensure we have the correct state
      queryClient.invalidateQueries({ queryKey: ['tribes'] })
    }
  })

  // Create tribe mutation
  const createTribeMutation = useMutation({
    mutationFn: async (data: CreateTribeForm) => {
      const response = await apiClient.post('/tribes', data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tribes'] })
      setShowCreateModal(false)
      setCreateForm({
        name: '',
        description: '',
        category: '',
        isPublic: true,
        tags: [],
        location: { address: '' }
      })
      toast.success('Tribu creada exitosamente')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Error al crear la tribu')
    }
  })

  const handleJoinTribe = (tribeId: string) => {
    joinTribeMutation.mutate(tribeId)
  }

  const handleLeaveTribe = (tribeId: string) => {
    leaveTribeMutation.mutate(tribeId)
  }

  const handleCreateTribe = () => {
    if (!createForm.name || !createForm.description || !createForm.category) {
      toast.error('Por favor completa todos los campos obligatorios')
      return
    }
    createTribeMutation.mutate(createForm)
  }

  const handleAddTag = () => {
    if (newTag.trim() && !createForm.tags.includes(newTag.trim())) {
      setCreateForm({
        ...createForm,
        tags: [...createForm.tags, newTag.trim()]
      })
      setNewTag('')
    }
  }

  const handleRemoveTag = (index: number) => {
    setCreateForm({
      ...createForm,
      tags: createForm.tags.filter((_, i) => i !== index)
    })
  }

  const formatMemberCount = (count: number) => {
    if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}k`
    }
    return count.toString()
  }

  return (
    <div className="min-h-screen bg-transparent py-8 pb-24">
      <div className="container mx-auto px-4 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-4xl font-extrabold text-foreground mb-2">
                Tribus
              </h1>
              <p className="text-lg text-muted-foreground font-medium">
                Conecta con comunidades afines a tus intereses
              </p>
            </div>

            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-6 py-3 bg-foreground text-background hover:scale-105 rounded-2xl font-bold shadow-xl transition-all"
            >
              <Plus className="w-4 h-4" />
              Crear Tribu
            </button>
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-2 glass p-2 rounded-2xl border border-white/10 backdrop-blur-md">
            <button
              onClick={() => setSelectedTab('discover')}
              className={`flex-1 px-4 py-2 rounded-xl font-medium transition-all ${selectedTab === 'discover'
                ? 'bg-primary text-primary-foreground shadow-lg'
                : 'text-muted-foreground hover:bg-white/10 hover:text-foreground'
                }`}
            >
              Descubrir
            </button>
            <button
              onClick={() => setSelectedTab('my-tribes')}
              className={`flex-1 px-4 py-2 rounded-xl font-medium transition-all ${selectedTab === 'my-tribes'
                ? 'bg-primary text-primary-foreground shadow-lg'
                : 'text-muted-foreground hover:bg-white/10 hover:text-foreground'
                }`}
            >
              Mis Tribus
            </button>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="mb-8 space-y-4">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Buscar tribus..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 glass border border-white/10 bg-white/5 rounded-2xl focus:ring-2 focus:ring-primary focus:bg-white/10 text-foreground transition-all backdrop-blur-sm"
              />
            </div>

            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-4 py-3 glass border border-white/10 bg-white/5 rounded-2xl focus:ring-2 focus:ring-primary text-foreground backdrop-blur-sm"
            >
              <option className="bg-background text-foreground" value="all">Todas las categorías</option>
              {categories.map(category => (
                <option className="bg-background text-foreground" key={category} value={category}>
                  {category.charAt(0).toUpperCase() + category.slice(1)}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Tribes Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="glass skeleton rounded-3xl p-6 border-white/5 h-64">
              </div>
            ))}
          </div>
        ) : tribes?.length === 0 ? (
          <EmptyState 
            icon={Users}
            title={selectedTab === 'my-tribes' ? 'No te has unido a ninguna tribu' : 'No hay tribus disponibles'}
            description={selectedTab === 'my-tribes'
              ? 'Explora y únete a comunidades que te interesen'
              : 'Sé el primero en crear una tribu'
            }
            actionLabel={selectedTab === 'my-tribes' ? 'Explorar Tribus' : undefined}
            actionOnClick={selectedTab === 'my-tribes' ? () => setSelectedTab('discover') : undefined}
            className="my-12 py-16"
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tribes?.map((tribe, index) => (
              <motion.div
                key={tribe._id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
                className="glass border-white/10 bg-white/5 rounded-3xl overflow-hidden shadow-xl hover:shadow-2xl hover:shadow-primary/20 hover:-translate-y-2 transition-all group"
              >
                {/* Cover Image */}
                <div className="h-36 bg-gradient-to-br from-primary/30 to-secondary/30 relative">
                  {tribe.cover && (
                    <img
                      src={tribe.cover}
                      alt="Cover"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                      }}
                    />
                  )}
                  <div className="absolute inset-0 bg-black/20"></div>

                  <div className="absolute top-3 left-3 flex items-center gap-2">
                    {tribe.isPrivate ? (
                      <span className="px-3 py-1 bg-black/60 backdrop-blur-sm border border-white/10 text-white font-medium text-xs rounded-full flex items-center gap-1.5 shadow-lg">
                        <Lock className="w-3 h-3" />
                        Privada
                      </span>
                    ) : (
                      <span className="px-3 py-1 bg-black/60 backdrop-blur-sm border border-white/10 text-white font-medium text-xs rounded-full flex items-center gap-1.5 shadow-lg">
                        <Globe className="w-3 h-3" />
                        Pública
                      </span>
                    )}
                  </div>

                  <div className="absolute top-4 right-4">
                    <span className="px-3 py-1 bg-primary/80 backdrop-blur-md border border-primary/50 text-white font-bold text-xs rounded-full shadow-lg shadow-primary/20">
                      {tribe.category}
                    </span>
                  </div>

                  {/* Avatar */}
                  <div className="absolute -bottom-8 left-5">
                    <div className="w-16 h-16 bg-background rounded-full border-4 border-background flex items-center justify-center text-primary font-bold shadow-xl overflow-hidden">
                      {tribe.avatar && typeof tribe.avatar === 'string' ? (
                        <img
                          src={tribe.avatar}
                          alt="Avatar"
                          className="w-full h-full rounded-full object-cover"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                          }}
                        />
                      ) : (
                        tribe.name[0]
                      )}
                    </div>
                  </div>
                </div>

                {/* Content */}
                <div className="p-5 pt-10">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="font-bold text-foreground text-xl mb-1 line-clamp-2 group-hover:text-primary transition-colors">
                        {tribe.name}
                      </h3>
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                        {tribe.description}
                      </p>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-2 mb-5 p-3 glass border-white/5 rounded-2xl text-center">
                    <div className="flex flex-col items-center">
                      <div className="text-lg font-bold text-primary">
                        {formatMemberCount(tribe.memberCount || 0)}
                      </div>
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground/80 font-bold">Miembros</div>
                    </div>
                    <div className="flex flex-col items-center border-x border-white/5">
                      <div className="text-lg font-bold text-foreground">
                        {tribe.stats?.eventCount || 0}
                      </div>
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground/80 font-bold">Eventos</div>
                    </div>
                    <div className="flex flex-col items-center">
                      <div className="text-lg font-bold text-accent">
                        {tribe.stats?.activityLevel === 'high' ? 'Alta' : tribe.stats?.activityLevel === 'medium' ? 'Media' : 'Baja'}
                      </div>
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground/80 font-bold">Actividad</div>
                    </div>
                  </div>

                  {/* Tags */}
                  {tribe.tags && tribe.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-5">
                      {tribe.tags.slice(0, 3).map((tag, tagIndex) => (
                        <span
                          key={`${tribe._id}-tag-${tagIndex}`}
                          className="px-2.5 py-1 bg-white/5 border border-white/5 text-foreground rounded-lg text-xs font-medium"
                        >
                          #{tag}
                        </span>
                      ))}
                      {tribe.tags.length > 3 && (
                        <span className="px-2.5 py-1 bg-white/5 border border-white/5 text-foreground rounded-lg text-xs font-medium">
                          +{tribe.tags.length - 3}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Creator - Safe access */}
                  <div className="flex items-center justify-between mb-4 pt-3 border-t border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 bg-secondary-500 rounded-full flex items-center justify-center text-white text-xs font-semibold">
                        {(tribe.createdBy && tribe.createdBy.firstName) ? tribe.createdBy.firstName[0] : '?'}
                      </div>
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {(tribe.createdBy && tribe.createdBy.firstName) ? tribe.createdBy.firstName : 'Unknown'} {(tribe.createdBy && tribe.createdBy.lastName) ? tribe.createdBy.lastName : ''}
                      </span>
                      <Crown className="w-3 h-3 text-yellow-500" />
                    </div>

                    {tribe.location && (tribe.location.address || tribe.location.isVirtual) && (
                      <div className="flex items-center gap-1.5 px-3 py-1 bg-white/5 border border-white/10 rounded-full">
                        {tribe.location.isVirtual ? (
                          <>
                            <Globe className="w-3.5 h-3.5 text-purple-400" />
                            <span className="text-xs text-muted-foreground font-medium">Virtual</span>
                          </>
                        ) : (
                          <>
                            <MapPin className="w-3.5 h-3.5 text-primary-400" />
                            <span className="text-xs text-muted-foreground font-medium max-w-[120px] truncate">
                              {tribe.location.address}
                            </span>
                          </>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Action Button */}
                  <div className="flex gap-2">
                    {tribe.isMember ? (
                      <>
                        <button
                          onClick={() => router.push(`/tribes/${tribe._id}`)}
                          className="flex-1 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                        >
                          Ver Tribu
                        </button>
                        <button
                          onClick={() => handleLeaveTribe(tribe._id)}
                          disabled={leaveTribeMutation.isPending}
                          className="px-4 py-2 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 rounded-xl font-medium hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50"
                        >
                          Salir
                        </button>
                      </>
                    ) : tribe.hasPendingRequest ? (
                      <button
                        disabled
                        className="w-full px-4 py-2 bg-orange-100 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 border border-orange-200 dark:border-orange-800 rounded-xl font-medium cursor-not-allowed"
                      >
                        Solicitud Enviada
                      </button>
                    ) : (
                      <button
                        onClick={() => handleJoinTribe(tribe._id)}
                        disabled={joinTribeMutation.isPending}
                        className="w-full px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-xl font-medium transition-colors disabled:opacity-50"
                      >
                        {tribe.isPrivate ? 'Solicitar Unirse' : 'Unirse'}
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Create Tribe Modal */}
        <AnimatePresence>
          {showCreateModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
              onClick={() => setShowCreateModal(false)}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                onClick={(e) => e.stopPropagation()}
                className="glass-strong border border-white/20 rounded-3xl p-8 w-full max-w-lg max-h-[90vh] overflow-y-auto custom-scrollbar shadow-2xl"
              >
                <h2 className="text-3xl font-extrabold text-foreground mb-6">
                  Crear Nueva Tribu
                </h2>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-bold text-foreground mb-2">
                      Nombre *
                    </label>
                    <input
                      type="text"
                      value={createForm.name}
                      onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                      placeholder="Nombre de la tribu"
                      className="w-full p-4 border border-white/10 glass bg-black/20 rounded-2xl focus:ring-2 focus:ring-primary focus:border-transparent text-foreground"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-foreground mb-2">
                      Descripción *
                    </label>
                    <textarea
                      value={createForm.description}
                      onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                      placeholder="Describe tu tribu..."
                      className="w-full p-4 border border-white/10 glass bg-black/20 rounded-2xl focus:ring-2 focus:ring-primary focus:border-transparent resize-none text-foreground"
                      rows={3}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-foreground mb-2">
                      Ubicación (Opcional)
                    </label>
                    <div className="relative">
                      <MapPin className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
                      <input
                        type="text"
                        value={createForm.location.address}
                        onChange={(e) => setCreateForm({ ...createForm, location: { address: e.target.value } })}
                        placeholder="Ciudad o país de encuentro..."
                        className="w-full pl-12 pr-4 py-4 border border-white/10 glass bg-black/20 rounded-2xl focus:ring-2 focus:ring-primary focus:border-transparent text-foreground"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-foreground mb-2">
                      Categoría *
                    </label>
                    <select
                      value={createForm.category}
                      onChange={(e) => setCreateForm({ ...createForm, category: e.target.value })}
                      className="w-full p-4 border border-gray-700 bg-gray-800 rounded-2xl focus:ring-2 focus:ring-primary focus:border-transparent text-white"
                    >
                      <option className="bg-gray-800" value="">Selecciona una categoría</option>
                      {categories.map(category => (
                        <option className="bg-gray-800" key={category} value={category}>
                          {CATEGORY_TRANSLATIONS[category] || category}
                        </option>
                      ))}
                    </select>
                  </div>


                  <div className="flex items-center gap-3 p-4 glass bg-black/10 rounded-2xl border border-white/10">
                    <input
                      type="checkbox"
                      id="isPublicCreate"
                      checked={!createForm.isPublic}
                      onChange={(e) => setCreateForm({ ...createForm, isPublic: !e.target.checked })}
                      className="w-5 h-5 text-primary bg-black/20 border-white/20 rounded focus:ring-primary"
                    />
                    <label htmlFor="isPublicCreate" className="flex items-center gap-2 text-foreground font-semibold cursor-pointer">
                      {!createForm.isPublic ? <Lock className="w-4 h-4 text-orange-500" /> : <Globe className="w-4 h-4 text-green-500" />}
                      Tribu Privada
                    </label>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-foreground mb-2">
                      Etiquetas
                    </label>
                    <div className="flex gap-2 mb-3">
                      <input
                        type="text"
                        value={newTag}
                        onChange={(e) => setNewTag(e.target.value)}
                        placeholder="Agregar etiqueta"
                        className="flex-1 p-3 border border-white/10 glass bg-black/20 rounded-xl focus:ring-2 focus:ring-primary text-foreground"
                        onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                      />
                      <button
                        type="button"
                        onClick={handleAddTag}
                        className="px-4 py-3 bg-primary hover:bg-primary/80 text-white rounded-xl transition-colors font-bold"
                      >
                        <Plus className="w-5 h-5" />
                      </button>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {createForm.tags.map((tag, index) => (
                        <span
                          key={index}
                          className="flex items-center gap-1 px-3 py-1.5 bg-primary/20 border border-primary/30 text-primary-foreground rounded-lg text-sm font-medium"
                        >
                          {tag}
                          <button
                            type="button"
                            onClick={() => handleRemoveTag(index)}
                            className="hover:bg-red-500 hover:text-white rounded p-1 transition-colors"
                          >
                            <Plus className="w-3 h-3 rotate-45" />
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex gap-4 mt-8">
                  <button
                    onClick={() => setShowCreateModal(false)}
                    className="flex-1 px-4 py-4 glass hover:bg-white/10 text-foreground font-bold rounded-2xl transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleCreateTribe}
                    disabled={createTribeMutation.isPending}
                    className="flex-1 px-4 py-4 bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-2xl transition-all shadow-lg hover:shadow-primary/30 disabled:opacity-50"
                  >
                    {createTribeMutation.isPending ? 'Creando...' : 'Crear Tribu'}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}