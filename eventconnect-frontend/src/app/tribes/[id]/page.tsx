'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ChevronLeft, Users, Crown, Shield, Star, MapPin, Calendar, MessageCircle, Settings, User, UserMinus, Share, MoreVertical, Globe, Lock, Heart, Send, Image as ImageIcon, Camera, Plus } from 'lucide-react'

// Aliases para iconos no disponibles en lucide-react 0.408.0
const UserPlus = User
const Video = Camera
import { useAuthStore } from '@/stores/authStore'
import { apiClient } from '@/lib/api/client'
import toast from 'react-hot-toast'
import StoriesBar from '@/components/stories/StoriesBar'

interface TribeMember {
  _id: string
  user: {
    _id: string
    firstName: string
    lastName: string
    username: string
    avatar?: string
  }
  role: 'member' | 'moderator' | 'admin'
  joinedAt: string
}

interface TribeEvent {
  _id: string
  title: string
  description: string
  date: string
  location: {
    name: string
    address: string
  }
  attendees: number
  maxAttendees?: number
  images: { url: string }[]
}

interface TribePost {
  _id: string
  content: string
  author: {
    _id: string
    firstName: string
    lastName: string
    avatar?: string
  }
  images?: { url: string }[]
  reactions: { type: string; count: number }[]
  comments: number
  likedByUser?: boolean
  likes?: number
  createdAt: string
}

interface TribeDetail {
  _id: string
  name: string
  description: string
  category: string
  avatar?: string
  cover?: string
  isPrivate: boolean
  members: TribeMember[]
  stats: {
    memberCount: number
    eventCount: number
    activityLevel: 'low' | 'medium' | 'high'
  }
  createdBy: {
    _id: string
    firstName: string
    lastName: string
    avatar?: string
  }
  events: TribeEvent[]
  posts: TribePost[]
  isMember: boolean
  isAdmin: boolean
  location?: {
    name: string
    address: string
  }
  rules?: string[]
  createdAt: string
}

export default function TribeDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { user, isAuthenticated } = useAuthStore()
  const queryClient = useQueryClient()

  const [activeTab, setActiveTab] = useState<'feed' | 'events' | 'members' | 'about'>('feed')
  const [newPost, setNewPost] = useState('')
  const [showMemberActions, setShowMemberActions] = useState<string | null>(null)

  // Fetch tribe details
  const { data: tribe, isLoading, error } = useQuery({
    queryKey: ['tribe', params.id],
    queryFn: async () => {
      const response = await apiClient.get(`/tribes/${params.id}`)
      return response.data as TribeDetail
    },
    enabled: !!params.id
  })

  // Join tribe mutation
  const joinTribeMutation = useMutation({
    mutationFn: async () => {
      await apiClient.post(`/tribes/${params.id}/join`)
    },
    onSuccess: () => {
      toast.success('Te has unido a la tribu exitosamente')
      queryClient.invalidateQueries({ queryKey: ['tribe', params.id] })
    },
    onError: () => {
      toast.error('Error al unirse a la tribu')
    }
  })

  // Leave tribe mutation
  const leaveTribeMutation = useMutation({
    mutationFn: async () => {
      await apiClient.post(`/tribes/${params.id}/leave`)
    },
    onSuccess: () => {
      toast.success('Has salido de la tribu')
      queryClient.invalidateQueries({ queryKey: ['tribe', params.id] })
    },
    onError: () => {
      toast.error('Error al salir de la tribu')
    }
  })

  // Create post mutation
  const createPostMutation = useMutation({
    mutationFn: async (data: { content: string; images?: { url: string; alt?: string }[] }) => {
      await apiClient.post(`/tribes/${params.id}/posts`, data)
    },
    onSuccess: () => {
      toast.success('Post publicado')
      setNewPost('')
      queryClient.invalidateQueries({ queryKey: ['tribe', params.id] })
      queryClient.invalidateQueries({ queryKey: ['tribePosts', params.id] })
    },
    onError: () => {
      toast.error('Error al publicar post')
    }
  })

  // Like post mutation
  const likePostMutation = useMutation({
    mutationFn: async (postId: string) => {
      await apiClient.post(`/tribes/${params.id}/posts/${postId}/like`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tribePosts', params.id] })
    },
    onError: () => {
      toast.error('Error al dar like')
    }
  })

  // Delete post mutation
  const deletePostMutation = useMutation({
    mutationFn: async (postId: string) => {
      await apiClient.delete(`/tribes/${params.id}/posts/${postId}`)
    },
    onSuccess: () => {
      toast.success('Post eliminado')
      queryClient.invalidateQueries({ queryKey: ['tribePosts', params.id] })
    },
    onError: () => {
      toast.error('Error al eliminar post')
    }
  })

  const handleJoinTribe = () => {
    if (!isAuthenticated) {
      router.push('/login')
      return
    }
    joinTribeMutation.mutate()
  }

  const handleLeaveTribe = () => {
    leaveTribeMutation.mutate()
  }

  const handleCreatePost = () => {
    if (!newPost.trim()) return
    createPostMutation.mutate({ content: newPost })
  }

  const handleLikePost = (postId: string) => {
    likePostMutation.mutate(postId)
  }

  const handleDeletePost = (postId: string) => {
    if (confirm('¿Estás seguro de que quieres eliminar este post?')) {
      deletePostMutation.mutate(postId)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen pt-20 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    )
  }

  if (error || !tribe) {
    return (
      <div className="min-h-screen pt-20 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Tribu no encontrada
          </h1>
          <button
            onClick={() => router.push('/tribes')}
            className="text-primary-600 hover:text-primary-700"
          >
            Volver a tribus
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen pt-16 bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="relative">
        {/* Cover Image */}
        <div className="h-64 bg-gradient-to-br from-primary-500 to-secondary-500 relative overflow-hidden">
          {tribe.cover ? (
            <img
              src={tribe.cover}
              alt={tribe.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-primary-500 to-secondary-500"></div>
          )}
          <div className="absolute inset-0 bg-black/20"></div>
        </div>

        {/* Back Button */}
        <button
          onClick={() => router.back()}
          className="absolute top-4 left-4 p-2 bg-black/50 backdrop-blur-sm rounded-full text-white hover:bg-black/70 transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        {/* Tribe Info */}
        <div className="container-padding relative -mt-20">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6">
            <div className="flex items-start gap-6">
              {/* Avatar */}
              <div className="w-24 h-24 rounded-2xl bg-primary-500 flex items-center justify-center text-white text-2xl font-bold flex-shrink-0">
                {tribe.avatar ? (
                  <img
                    src={tribe.avatar}
                    alt={tribe.name}
                    className="w-full h-full object-cover rounded-2xl"
                  />
                ) : (
                  <Users className="w-12 h-12" />
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                      {tribe.name}
                    </h1>
                    <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                      <div className="flex items-center gap-1">
                        <Users className="w-4 h-4" />
                        {tribe.stats?.memberCount || 0} miembros
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {tribe.stats?.eventCount || 0} eventos
                      </div>
                      <div className="flex items-center gap-1">
                        {tribe.isPrivate ? <Lock className="w-4 h-4" /> : <Globe className="w-4 h-4" />}
                        {tribe.isPrivate ? 'Privada' : 'Pública'}
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-3">
                    {tribe.isMember ? (
                      <>
                        {tribe.isAdmin && (
                          <button className="p-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100">
                            <Settings className="w-5 h-5" />
                          </button>
                        )}
                        <button
                          onClick={handleLeaveTribe}
                          disabled={leaveTribeMutation.isPending}
                          className="px-4 py-2 border border-red-200 text-red-600 rounded-xl hover:bg-red-50 transition-colors disabled:opacity-50"
                        >
                          Salir
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={handleJoinTribe}
                        disabled={joinTribeMutation.isPending}
                        className="px-6 py-2 bg-primary-500 text-white rounded-xl hover:bg-primary-600 transition-colors disabled:opacity-50 flex items-center gap-2"
                      >
                        <UserPlus className="w-4 h-4" />
                        {tribe.isPrivate ? 'Solicitar' : 'Unirse'}
                      </button>
                    )}
                  </div>
                </div>

                <p className="text-gray-700 dark:text-gray-300 mb-4">
                  {tribe.description}
                </p>

                {tribe.location && (
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <MapPin className="w-4 h-4" />
                    {tribe.location.name}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stories Bar */}
      <div className="container-padding mt-6">
        <StoriesBar tribeId={tribe._id} />
      </div>

      {/* Navigation Tabs */}
      <div className="container-padding mt-6">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-1">
          <div className="flex space-x-1">
            {[
              { id: 'feed', label: 'Feed', icon: MessageCircle },
              { id: 'events', label: 'Eventos', icon: Calendar },
              { id: 'members', label: 'Miembros', icon: Users },
              { id: 'about', label: 'Acerca', icon: Star }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-medium transition-all ${activeTab === tab.id
                  ? 'bg-primary-500 text-white shadow-lg'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
                  }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container-padding mt-6 pb-20">
        {/* Feed Tab */}
        {activeTab === 'feed' && (
          <div className="space-y-6">
            {/* Create Post */}
            {tribe.isMember && (
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-primary-500 rounded-full flex items-center justify-center text-white font-semibold">
                    {user?.firstName?.[0] || '?'}
                  </div>
                  <div className="flex-1">
                    <textarea
                      value={newPost}
                      onChange={(e) => setNewPost(e.target.value)}
                      placeholder="¿Qué está pasando en la tribu?"
                      className="w-full p-3 border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 rounded-xl resize-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      rows={3}
                    />
                    <div className="flex items-center justify-between mt-3">
                      <div className="flex items-center gap-2">
                        <button className="p-2 text-gray-600 hover:text-primary-500 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
                          <ImageIcon className="w-5 h-5" />
                        </button>
                        <button className="p-2 text-gray-600 hover:text-primary-500 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
                          <Video className="w-5 h-5" />
                        </button>
                      </div>
                      <button
                        onClick={handleCreatePost}
                        disabled={!newPost.trim() || createPostMutation.isPending}
                        className="px-6 py-2 bg-primary-500 text-white rounded-xl hover:bg-primary-600 transition-colors disabled:opacity-50 flex items-center gap-2"
                      >
                        <Send className="w-4 h-4" />
                        Publicar
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Posts */}
            {(tribe.posts || []).map((post) => (
              <div key={post._id} className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-secondary-500 rounded-full flex items-center justify-center text-white font-semibold">
                    {post.author.avatar ? (
                      <img src={post.author.avatar} alt="" className="w-full h-full object-cover rounded-full" />
                    ) : (
                      post.author.firstName[0]
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <h4 className="font-semibold text-gray-900 dark:text-white">
                          {post.author.firstName} {post.author.lastName}
                        </h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {new Date(post.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <button className="text-gray-400 hover:text-gray-600">
                        <MoreVertical className="w-5 h-5" />
                      </button>
                    </div>

                    <p className="text-gray-700 dark:text-gray-300 mb-4">
                      {post.content}
                    </p>

                    {post.images && post.images.length > 0 && (
                      <div className="grid grid-cols-2 gap-2 mb-4">
                        {post.images.map((image, index) => (
                          <img
                            key={index}
                            src={image.url}
                            alt=""
                            className="w-full h-40 object-cover rounded-xl"
                          />
                        ))}
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-3 border-t border-gray-200 dark:border-gray-700">
                      <div className="flex items-center gap-6">
                        <button
                          onClick={() => handleLikePost(post._id)}
                          className={`flex items-center gap-2 transition-colors ${post.likedByUser
                            ? 'text-red-500'
                            : 'text-gray-600 hover:text-red-500'
                            }`}
                        >
                          <Heart className={`w-5 h-5 ${post.likedByUser ? 'fill-current' : ''}`} />
                          <span>{post.likes || 0} Me gusta</span>
                        </button>
                        <button className="flex items-center gap-2 text-gray-600 hover:text-primary-500 transition-colors">
                          <MessageCircle className="w-5 h-5" />
                          <span>{post.comments} comentarios</span>
                        </button>
                        <button className="flex items-center gap-2 text-gray-600 hover:text-primary-500 transition-colors">
                          <Share className="w-5 h-5" />
                          <span>Compartir</span>
                        </button>
                      </div>

                      {(post.author._id === user?.id || tribe.isAdmin) && (
                        <button
                          onClick={() => handleDeletePost(post._id)}
                          className="text-red-600 hover:text-red-700 transition-colors text-sm"
                        >
                          Eliminar
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Events Tab */}
        {activeTab === 'events' && (
          <div className="grid gap-6">
            {tribe.events.map((event) => (
              <div key={event._id} className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm">
                <div className="flex gap-4">
                  {event.images[0] && (
                    <img
                      src={event.images[0].url}
                      alt={event.title}
                      className="w-20 h-20 object-cover rounded-xl"
                    />
                  )}
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                      {event.title}
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 mb-3">
                      {event.description}
                    </p>
                    <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {new Date(event.date).toLocaleDateString()}
                      </div>
                      <div className="flex items-center gap-1">
                        <MapPin className="w-4 h-4" />
                        {event.location.name}
                      </div>
                      <div className="flex items-center gap-1">
                        <Users className="w-4 h-4" />
                        {event.attendees}{event.maxAttendees && `/${event.maxAttendees}`}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Members Tab */}
        {activeTab === 'members' && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm">
            <div className="space-y-4">
              {tribe.members.map((member) => (
                <div key={member._id} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary-500 rounded-full flex items-center justify-center text-white font-semibold">
                      {member.user.avatar ? (
                        <img src={member.user.avatar} alt="" className="w-full h-full object-cover rounded-full" />
                      ) : (
                        member.user.firstName[0]
                      )}
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900 dark:text-white">
                        {member.user.firstName} {member.user.lastName}
                      </h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        @{member.user.username}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {member.role === 'admin' && <Crown className="w-4 h-4 text-yellow-500" />}
                    {member.role === 'moderator' && <Shield className="w-4 h-4 text-blue-500" />}
                    <span className="text-sm text-gray-600 dark:text-gray-400 capitalize">
                      {member.role}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* About Tab */}
        {activeTab === 'about' && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
                Información
              </h3>
              <div className="space-y-3">
                <div>
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Categoría:</span>
                  <p className="text-gray-900 dark:text-white capitalize">{tribe.category}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Creada por:</span>
                  <p className="text-gray-900 dark:text-white">
                    {tribe.createdBy.firstName} {tribe.createdBy.lastName}
                  </p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Fecha de creación:</span>
                  <p className="text-gray-900 dark:text-white">
                    {new Date(tribe.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>

            {tribe.rules && tribe.rules.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
                  Reglas de la Tribu
                </h3>
                <ul className="space-y-2">
                  {tribe.rules.map((rule, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <span className="text-primary-500 font-bold">{index + 1}.</span>
                      <span className="text-gray-700 dark:text-gray-300">{rule}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}