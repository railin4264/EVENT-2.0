'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ChevronLeft,
  Users,
  Crown,
  Shield,
  Star,
  MapPin,
  Calendar,
  MessageCircle,
  Settings,
  User,
  Share,
  Globe,
  Lock,
  Heart,
  Send,
  Plus,
  CheckCircle,
  X,
  Clock,
  Sparkles,
  Trash2
} from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { apiClient } from '@/lib/api/client'
import toast from 'react-hot-toast'
import { CATEGORY_TRANSLATIONS } from '@/lib/tribe-constants'
import { readTribeAccess, type TribeAccess } from '@/components/tribes/tribe-access'
import { TribeAccessPanel } from '@/components/tribes/TribeAccessPanel'
import { TribeRequestsPanel } from '@/components/tribes/TribeRequestsPanel'
import { useTribeAccessActions } from '@/components/tribes/useTribeAccessActions'

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

interface TribeJoinRequest {
  _id?: string
  user: {
    _id: string
    firstName?: string
    lastName?: string
    username: string
    avatar?: string
    bio?: string
  }
  message?: string
  status: 'pending' | 'approved' | 'rejected'
  requestedAt: string
}

interface TribePostComment {
  _id: string
  content: string
  createdAt: string
  user: {
    _id?: string
    firstName?: string
    lastName?: string
    username?: string
    avatar?: string
  }
}

interface TribePost {
  _id: string
  content: string
  author: {
    _id: string
    firstName: string
    lastName: string
    username?: string
    avatar?: string
  }
  images?: { url: string }[]
  comments: number
  commentsList?: TribePostComment[]
  likedByUser?: boolean
  likes?: number
  createdAt: string
}

interface TribeEvent {
  _id: string
  title: string
  description: string
  date: string
  location: {
    name?: string
    venue?: string
    address?: string
  }
  attendees: number
  maxAttendees?: number
  images?: { url: string }[]
}

interface TribeDetail extends TribeAccess {
  _id: string
  name: string
  description: string
  category: string
  avatar?: string
  cover?: string
  isPrivate: boolean
  privacy: 'public' | 'private' | 'secret'
  membership: 'open' | 'approval_required' | 'invite_only'
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
    username?: string
    avatar?: string
  }
  events: TribeEvent[]
  posts: TribePost[]
  joinRequests: TribeJoinRequest[]
  isMember: boolean
  isAdmin: boolean
  hasPendingRequest: boolean
  pendingRequestsCount: number
  location?: {
    name?: string
    address?: string
    isVirtual?: boolean
  }
  rules?: string[]
  tags?: string[]
  welcomeMessage?: string
  createdAt: string
}

function normalizeTribeDetail(rawInput: any, currentUserId: string): TribeDetail {
  const raw = rawInput?.tribe || rawInput?.data || rawInput || {}
  const access = readTribeAccess(raw, currentUserId)
  const creator = raw.createdBy || raw.creator || {
    _id: '',
    firstName: 'Organizador',
    lastName: 'EventNow',
    username: 'eventnow'
  }

  const isPrivate = access.privacy !== 'public'

  const members: TribeMember[] = ((access.isMember || access.isAdmin) && access.canViewContent && Array.isArray(raw.members) ? raw.members : [])
    .filter((member: any) => member?.status === 'active')
    .map((member: any) => {
      const person = member.user && typeof member.user === 'object' ? member.user : member
      return {
        _id: String(member._id || person?._id || member.user || ''),
        user: {
          _id: String(person?._id || member.user || ''), firstName: person?.firstName || person?.username || 'Miembro',
          lastName: person?.lastName || '', username: person?.username || 'usuario',
          avatar: typeof person?.avatar === 'string' ? person.avatar : person?.avatar?.url,
        },
        role: member.role || 'member', joinedAt: member.joinedAt || raw.createdAt || '',
      }
    })
  const joinRequests: TribeJoinRequest[] = (access.canManageRequests && Array.isArray(raw.joinRequests) ? raw.joinRequests : [])
    .filter((request: any) => request?.status === 'pending')
    .map((request: any) => {
      const person = request.user && typeof request.user === 'object' ? request.user : { _id: String(request.user || ''), username: 'usuario' }
      return {
        _id: request._id,
        user: { _id: String(person._id || ''), firstName: person.firstName || person.username || 'Usuario', lastName: person.lastName || '',
          username: person.username || 'usuario', avatar: typeof person.avatar === 'string' ? person.avatar : person.avatar?.url, bio: person.bio || '' },
        message: request.message || '', status: request.status, requestedAt: request.requestedAt || '',
      }
    })
  const posts: TribePost[] = (access.canViewContent && Array.isArray(raw.posts) ? raw.posts : []).map((p: any) => {
    const a = p.author && typeof p.author === 'object' ? p.author : creator
    const commentsArray = Array.isArray(p.commentsList) ? p.commentsList : Array.isArray(p.comments) ? p.comments : []
    const likesCount = typeof p.likes === 'number' ? p.likes : Array.isArray(p.likes) ? p.likes.length : Number(p.likesCount || 0)
    const likedByUser = typeof p.likedByUser === 'boolean' ? p.likedByUser : Boolean(currentUserId && Array.isArray(p.likes) && p.likes.some((like: any) => String(like?.user?._id || like?.user || like?._id || like) === currentUserId))
    return {
      _id: String(p._id || Math.random()),
      content: p.content || '',
      author: {
        _id: String(a?._id || ''),
        firstName: a?.firstName || a?.username || 'Miembro',
        lastName: a?.lastName || '',
        username: a?.username || 'miembro',
        avatar: typeof a?.avatar === 'string' ? a.avatar : a?.avatar?.url
      },
      images: Array.isArray(p.images) ? p.images : [],
      likes: likesCount,
      likedByUser,
      comments: typeof p.comments === 'number' ? p.comments : commentsArray.length,
      commentsList: commentsArray.map((c: any) => ({
        _id: String(c._id || Math.random()),
        content: c.content || '',
        createdAt: c.createdAt || new Date().toISOString(),
        user: {
          _id: String(c.user?._id || c.user || ''),
          firstName: c.user?.firstName || c.user?.username || 'Miembro',
          lastName: c.user?.lastName || '',
          username: c.user?.username || 'miembro',
          avatar: typeof c.user?.avatar === 'string' ? c.user.avatar : c.user?.avatar?.url
        }
      })),
      createdAt: p.createdAt || new Date().toISOString()
    }
  })

  const events: TribeEvent[] = (access.canViewContent && Array.isArray(raw.events) ? raw.events : []).map((ev: any) => ({
    _id: String(ev._id),
    title: ev.title || 'Evento de la comunidad',
    description: ev.description || '',
    date: ev.date || new Date().toISOString(),
    location: {
      name: ev.location?.venue || ev.location?.name || ev.location?.address || 'Santo Domingo, RD',
      address: ev.location?.address || 'Santo Domingo, RD'
    },
    attendees:
      typeof ev.attendees === 'number'
        ? ev.attendees
        : ev.attendeesCount ?? (Array.isArray(ev.attendees) ? ev.attendees.length : 0),
    maxAttendees: ev.maxAttendees,
    images: Array.isArray(ev.images) ? ev.images : []
  }))

  const memberCount =
    raw.memberCount ??
    raw.membersCount ??
    raw.stats?.memberCount ??
    raw.stats?.totalMembers ??
    Math.max(members.length, 1)

  return {
    _id: String(raw._id || ''),
    name: raw.name || 'Comunidad EventNow',
    description: raw.description || '',
    category: raw.category || 'other',
    avatar: typeof raw.avatar === 'string' ? raw.avatar : raw.avatar?.url || '',
    cover:
      typeof raw.cover === 'string'
        ? raw.cover
        : raw.coverImage?.url || raw.cover?.url || '',
    isPrivate,
    members,
    stats: {
      memberCount,
      eventCount: raw.stats?.eventCount ?? raw.stats?.totalEvents ?? events.length,
      activityLevel:
        raw.stats?.activityLevel ||
        (posts.length >= 3 || memberCount >= 10 ? 'high' : memberCount >= 3 ? 'medium' : 'low')
    },
    createdBy: {
      _id: String(creator?._id || ''),
      firstName: creator?.firstName || creator?.username || 'Organizador',
      lastName: creator?.lastName || '',
      username: creator?.username || 'organizador',
      avatar: typeof creator?.avatar === 'string' ? creator.avatar : creator?.avatar?.url
    },
    events,
    posts,
    joinRequests,
    ...access,
    pendingRequestsCount: raw.pendingRequestsCount ?? joinRequests.length,
    location: raw.location
      ? {
          name: raw.location.address || raw.location.name || 'Santo Domingo, RD',
          address: raw.location.address || raw.location.name || 'Santo Domingo, RD',
          isVirtual: Boolean(raw.location.isVirtual)
        }
      : undefined,
    rules: Array.isArray(raw.rules) && raw.rules.length > 0
      ? raw.rules.map((r: any) => typeof r === 'string' ? r : (r?.description || r?.title || String(r || ''))).filter(Boolean)
      : [
          'Respeto y cordialidad entre todos los integrantes de la comunidad.',
          'Publicar contenido y eventos relacionados con la temática de la tribu.',
          'Prohibido el spam o enlaces engañosos.'
        ],
    tags: Array.isArray(raw.tags) ? raw.tags : [],
    welcomeMessage: raw.welcomeMessage || '',
    createdAt: raw.createdAt || new Date().toISOString()
  }
}

export default function TribeDetailPage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, isAuthenticated } = useAuthStore()
  const queryClient = useQueryClient()

  const initialTab = (searchParams.get('tab') as any) || 'feed'
  const [activeTab, setActiveTab] = useState<'feed' | 'events' | 'members' | 'requests' | 'about'>(
    ['feed', 'events', 'members', 'requests', 'about'].includes(initialTab) ? initialTab : 'feed'
  )
  const [newPost, setNewPost] = useState('')
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({})
  const [expandedComments, setExpandedComments] = useState<Record<string, boolean>>({})
  const [showSettingsModal, setShowSettingsModal] = useState(false)
  const [editForm, setEditForm] = useState({
    name: '',
    description: '',
    isPrivate: false,
    welcomeMessage: ''
  })

  const currentUserId = String(user?._id || user?.id || '')
  const accessActions = useTribeAccessActions(currentUserId)

  useEffect(() => {
    setNewPost(''); setCommentInputs({}); setExpandedComments({}); setShowSettingsModal(false)
    setActiveTab(['feed', 'events', 'members', 'requests', 'about'].includes(initialTab) ? initialTab : 'feed')
  }, [currentUserId, params.id, initialTab])

  const { data: tribe, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['tribe', params.id, currentUserId],
    queryFn: async ({ signal }) => {
      const response = await apiClient.get(`/tribes/${params.id}`, { signal })
      return normalizeTribeDetail(response.data, currentUserId)
    },
    enabled: !!params.id
  })

  useEffect(() => {
    if (tribe) {
      setEditForm({
        name: tribe.name,
        description: tribe.description,
        isPrivate: tribe.isPrivate,
        welcomeMessage: tribe.welcomeMessage || ''
      })
    }
  }, [tribe])

  // Create post mutation
  const createPostMutation = useMutation({
    mutationFn: async (data: { content: string }) => {
      await apiClient.post(`/tribes/${params.id}/posts`, data)
    },
    onSuccess: () => {
      toast.success('Publicación compartida en la comunidad')
      setNewPost('')
      queryClient.invalidateQueries({ queryKey: ['tribe', params.id] })
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Error al publicar en la comunidad')
    }
  })

  // Like post mutation
  const likePostMutation = useMutation({
    mutationFn: async (postId: string) => {
      await apiClient.post(`/tribes/${params.id}/posts/${postId}/like`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tribe', params.id] })
    }
  })

  // Comment post mutation
  const commentPostMutation = useMutation({
    mutationFn: async ({ postId, content }: { postId: string; content: string }) => {
      await apiClient.post(`/tribes/${params.id}/posts/${postId}/comments`, { content })
    },
    onSuccess: (_, variables) => {
      setCommentInputs((prev) => ({ ...prev, [variables.postId]: '' }))
      setExpandedComments((prev) => ({ ...prev, [variables.postId]: true }))
      queryClient.invalidateQueries({ queryKey: ['tribe', params.id] })
      toast.success('Comentario agregado')
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'No se pudo enviar el comentario')
    }
  })

  // Delete post mutation
  const deletePostMutation = useMutation({
    mutationFn: async (postId: string) => {
      await apiClient.delete(`/tribes/${params.id}/posts/${postId}`)
    },
    onSuccess: () => {
      toast.success('Publicación eliminada')
      queryClient.invalidateQueries({ queryKey: ['tribe', params.id] })
    }
  })

  // Update tribe settings mutation
  const updateTribeMutation = useMutation({
    mutationFn: async () => {
      const res = await apiClient.put(`/tribes/${params.id}`, {
        name: editForm.name,
        description: editForm.description,
        isPrivate: editForm.isPrivate,
        privacy: editForm.isPrivate ? 'private' : 'public',
        welcomeMessage: editForm.welcomeMessage
      })
      return res.data
    },
    onSuccess: () => {
      toast.success('Configuración de la comunidad actualizada')
      setShowSettingsModal(false)
      queryClient.invalidateQueries({ queryKey: ['tribe', params.id] })
      queryClient.invalidateQueries({ queryKey: ['tribes'] })
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Error al actualizar la comunidad')
    }
  })

  const handleJoinTribe = (message?: string) => {
    if (!isAuthenticated) {
      router.push(`/login?redirect=${encodeURIComponent(`/tribes/${params.id}`)}`)
      return
    }
    if (!tribe || (!tribe.canJoin && !tribe.canRequestJoin) || isFetching) return
    void accessActions.run({ tribeId: tribe._id, kind: 'join', message })
  }

  const handleCreatePost = () => {
    if (!newPost.trim()) return
    createPostMutation.mutate({ content: newPost.trim() })
  }

  const handleSendComment = (postId: string) => {
    if (!isAuthenticated) {
      router.push(`/login?redirect=${encodeURIComponent(`/tribes/${params.id}`)}`)
      return
    }
    const text = (commentInputs[postId] || '').trim()
    if (!text) return
    commentPostMutation.mutate({ postId, content: text })
  }

  const handleShareTribe = async () => {
    const url = typeof window !== 'undefined' ? window.location.href : ''
    try {
      await navigator.clipboard.writeText(url)
      toast.success('Enlace de la comunidad copiado al portapapeles')
    } catch {
      toast.success('Comparte este enlace: ' + url)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen pt-20 flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    )
  }

  if (error || !tribe || !tribe._id) {
    const notFound = (error as { response?: { status?: number } } | null)?.response?.status === 404 || (!error && !tribe?._id)
    return (
      <div className="min-h-screen pt-20 flex items-center justify-center bg-background text-foreground">
        <div role="alert" className="text-center max-w-md p-8 rounded-3xl border border-border bg-card">
          <Users className="w-12 h-12 text-primary mx-auto mb-3" />
          <h1 className="text-2xl font-bold mb-2">{notFound ? 'Comunidad no encontrada' : 'No pudimos cargar la comunidad'}</h1>
          <p className="text-sm text-muted-foreground mb-5">
            {notFound ? 'Es posible que esta comunidad haya cambiado de dirección o sea secreta.' : 'Revisa tu conexión y vuelve a intentarlo.'}
          </p>
          <button type="button" disabled={isFetching} onClick={() => { void refetch() }} className="mb-3 min-h-11 rounded-xl border border-border px-5 text-sm font-semibold disabled:opacity-50">{isFetching ? 'Cargando…' : 'Reintentar carga'}</button>
          <button
            onClick={() => router.push('/tribes')}
            className="px-5 py-2.5 bg-primary text-primary-foreground rounded-xl font-semibold"
          >
            Volver a Comunidades
          </button>
        </div>
      </div>
    )
  }

  const isLockedForVisitor = !tribe.canViewContent
  const accessFailure = accessActions.failure?.action.tribeId === tribe._id ? accessActions.failure : null

  return (
    <div className="min-h-screen bg-background text-foreground pb-24">
      {/* Cover Banner */}
      <div className="relative">
        <div className="h-56 sm:h-72 bg-gradient-to-br from-violet-600 via-primary to-cyan-600 relative overflow-hidden">
          {tribe.cover && (
            <img
              src={tribe.cover}
              alt={tribe.name}
              className="w-full h-full object-cover"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/30 to-black/20" />
        </div>

        {/* Back & Share Buttons */}
        <div className="absolute top-4 left-4 right-4 flex items-center justify-between max-w-6xl mx-auto">
          <button type="button" onClick={() => { void refetch() }} className="mb-3 min-h-11 rounded-xl border border-border px-5 text-sm font-semibold">Reintentar carga</button>
          <button
            onClick={() => router.push('/tribes')}
            className="px-3.5 py-2 bg-black/55 backdrop-blur-md rounded-xl text-white text-sm font-semibold hover:bg-black/75 transition-colors flex items-center gap-1.5"
          >
            <ChevronLeft className="w-4 h-4" />
            Comunidades
          </button>

          <button
            onClick={handleShareTribe}
            className="px-3.5 py-2 bg-black/55 backdrop-blur-md rounded-xl text-white text-sm font-semibold hover:bg-black/75 transition-colors flex items-center gap-1.5"
          >
            <Share className="w-4 h-4" />
            Compartir
          </button>
        </div>

        {/* Header Card */}
        <div className="max-w-5xl mx-auto px-4 relative -mt-20">
          <div className="bg-card border border-border rounded-3xl shadow-xl p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row items-start gap-6">
              {/* Avatar */}
              <div className="w-24 h-24 rounded-3xl bg-primary/15 border-4 border-card shadow-lg flex items-center justify-center text-primary text-3xl font-extrabold shrink-0 overflow-hidden">
                {tribe.avatar ? (
                  <img
                    src={tribe.avatar}
                    alt={tribe.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  tribe.name?.[0]?.toUpperCase() || <Users className="w-10 h-10" />
                )}
              </div>

              {/* Main Info */}
              <div className="flex-1 min-w-0 w-full">
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span className="px-3 py-0.5 rounded-full bg-primary/15 text-primary text-xs font-bold">
                        {CATEGORY_TRANSLATIONS[tribe.category] || tribe.category}
                      </span>
                      {tribe.isPrivate ? (
                        <span className="px-3 py-0.5 rounded-full bg-amber-500/15 text-amber-500 text-xs font-bold flex items-center gap-1">
                          <Lock className="w-3 h-3" /> Privada · Con aprobación
                        </span>
                      ) : (
                        <span className="px-3 py-0.5 rounded-full bg-emerald-500/15 text-emerald-500 text-xs font-bold flex items-center gap-1">
                          <Globe className="w-3 h-3" /> Pública
                        </span>
                      )}
                      {tribe.isAdmin && (
                        <span className="px-3 py-0.5 rounded-full bg-violet-500/15 text-violet-400 text-xs font-bold flex items-center gap-1">
                          <Crown className="w-3 h-3" /> Administrador
                        </span>
                      )}
                    </div>

                    <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground">
                      {tribe.name}
                    </h1>

                    <div className="flex flex-wrap items-center gap-4 text-xs sm:text-sm text-muted-foreground mt-2">
                      <span className="flex items-center gap-1.5 font-medium">
                        <Users className="w-4 h-4 text-primary" />
                        {tribe.stats.memberCount} miembros
                      </span>
                      <span className="flex items-center gap-1.5 font-medium">
                        <Calendar className="w-4 h-4 text-primary" />
                        {tribe.stats.eventCount} eventos
                      </span>
                      {tribe.location && (
                        <span className="flex items-center gap-1.5 font-medium">
                          <MapPin className="w-4 h-4 text-primary" />
                          {tribe.location.address}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-wrap items-center gap-2.5">
                    {tribe.isMember ? (
                      <>
                        <Link
                          href="/events/create"
                          className="px-4 py-2.5 bg-primary text-primary-foreground rounded-xl font-semibold text-sm hover:bg-primary/90 transition-colors flex items-center gap-1.5"
                        >
                          <Plus className="w-4 h-4" />
                          Crear Evento
                        </Link>
                        {tribe.isAdmin && (
                          <button
                            onClick={() => setShowSettingsModal(true)}
                            className="p-2.5 border border-border rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                            title="Configurar comunidad"
                          >
                            <Settings className="w-5 h-5" />
                          </button>
                        )}
                        {!tribe.isAdmin && (
                          <button
                            onClick={() => { void accessActions.run({ tribeId: tribe._id, kind: 'leave' }) }}
                            disabled={Boolean(accessActions.pending) || isFetching}
                            className="px-4 py-2.5 border border-red-500/30 text-red-500 rounded-xl text-sm font-semibold hover:bg-red-500/10 transition-colors disabled:opacity-50"
                          >
                            Salir
                          </button>
                        )}
                      </>
                    ) : <TribeAccessPanel key={currentUserId} compact access={tribe} name={tribe.name} tribeId={tribe._id}
                      authenticated={isAuthenticated} busy={Boolean(accessActions.pending) || isFetching}
                      onJoin={handleJoinTribe} onCancel={() => { void accessActions.run({ tribeId: tribe._id, kind: 'cancel' }) }}
                      error={!isLockedForVisitor ? accessFailure?.message : undefined} onRetry={() => { void accessActions.retry() }} />}

                  </div>
                </div>

                <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                  {tribe.description}
                </p>

                {tribe.welcomeMessage && tribe.isMember && (
                  <div className="mt-4 p-3.5 rounded-2xl bg-primary/10 border border-primary/20 text-xs sm:text-sm text-foreground flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-primary shrink-0" />
                    <span>{tribe.welcomeMessage}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="max-w-5xl mx-auto px-4 mt-6">
        <div role="tablist" aria-label="Secciones de la comunidad" className="bg-card border border-border rounded-2xl p-1.5 flex overflow-x-auto gap-1">
          {[
            { id: 'feed', label: 'Muro y Conversación', icon: MessageCircle },
            { id: 'events', label: `Eventos (${tribe.events.length})`, icon: Calendar },
            { id: 'members', label: `Miembros (${tribe.stats.memberCount})`, icon: Users },
            ...(tribe.canManageRequests
              ? [
                  {
                    id: 'requests',
                    label: `Solicitudes (${tribe.joinRequests.length})`,
                    icon: Lock,
                    badge: tribe.joinRequests.length
                  }
                ]
              : []),
            { id: 'about', label: 'Reglas e Info', icon: Star }
          ].map((tab: any) => (
            <button
              key={tab.id}
              role="tab" aria-selected={activeTab === tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 min-w-[130px] flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-xs sm:text-sm transition-all ${
                activeTab === tab.id
                  ? 'bg-primary text-primary-foreground shadow-md'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              <span>{tab.label}</span>
              {tab.badge > 0 && (
                <span className="px-2 py-0.5 text-[11px] rounded-full bg-amber-500 text-white font-extrabold">
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="max-w-5xl mx-auto px-4 mt-6">
        {isLockedForVisitor && <TribeAccessPanel key={`access-${currentUserId}`} access={tribe} name={tribe.name} tribeId={tribe._id}
          authenticated={isAuthenticated} busy={Boolean(accessActions.pending) || isFetching}
          onJoin={handleJoinTribe} onCancel={() => { void accessActions.run({ tribeId: tribe._id, kind: 'cancel' }) }}
          error={accessFailure?.message} onRetry={() => { void accessActions.retry() }} />}

        {/* FEED TAB */}
        {activeTab === 'feed' && !isLockedForVisitor && (
          <div className="space-y-6">
            {/* Create Post Box */}
            {tribe.isMember ? (
              <div className="bg-card border border-border rounded-3xl p-5 sm:p-6 shadow-sm">
                <div className="flex items-start gap-4">
                  <div className="w-11 h-11 bg-primary text-primary-foreground rounded-2xl flex items-center justify-center font-bold shrink-0">
                    {user?.firstName?.[0] || user?.username?.[0] || 'U'}
                  </div>
                  <div className="flex-1">
                    <textarea
                      value={newPost}
                      onChange={(e) => setNewPost(e.target.value)}
                      placeholder={`Comparte una idea, ruta o aviso con ${tribe.name}...`}
                      className="w-full p-3.5 border border-border bg-background rounded-2xl resize-none text-sm focus:ring-2 focus:ring-primary"
                      rows={3}
                    />
                    <div className="flex items-center justify-between mt-3">
                      <span className="text-xs text-muted-foreground">
                        Visible para los miembros de {tribe.name}
                      </span>
                      <button
                        onClick={handleCreatePost}
                        disabled={!newPost.trim() || createPostMutation.isPending}
                        className="px-5 py-2.5 bg-primary text-primary-foreground rounded-xl font-bold text-sm hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2"
                      >
                        <Send className="w-4 h-4" />
                        {createPostMutation.isPending ? 'Publicando...' : 'Publicar'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-card border border-border rounded-2xl p-4 flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  Únete a <strong>{tribe.name}</strong> para publicar y comentar en el muro.
                </span>
                <button
                  onClick={() => handleJoinTribe()}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-xl text-xs font-bold"
                >
                  Unirse Ahora
                </button>
              </div>
            )}

            {/* Posts List */}
            {(!tribe.posts || tribe.posts.length === 0) ? (
              <div className="bg-card border border-dashed border-border rounded-3xl p-10 text-center">
                <MessageCircle className="w-10 h-10 text-primary mx-auto mb-3 opacity-80" />
                <h3 className="text-lg font-bold mb-1">Aún no hay publicaciones en esta comunidad</h3>
                <p className="text-sm text-muted-foreground">
                  ¡Sé el primero en saludar o proponer el próximo encuentro!
                </p>
              </div>
            ) : (
              (tribe.posts || []).map((post) => (
                <div key={post._id} className="bg-card border border-border rounded-3xl p-6 shadow-sm">
                  <div className="flex items-start gap-4">
                    <div className="w-11 h-11 bg-primary/15 text-primary rounded-2xl flex items-center justify-center font-bold shrink-0 overflow-hidden">
                      {post.author.avatar ? (
                        <img src={post.author.avatar} alt="" className="w-full h-full object-cover" />
                      ) : (
                        post.author.firstName?.[0] || 'M'
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <h4 className="font-bold text-foreground">
                            {post.author.firstName} {post.author.lastName}
                          </h4>
                          <p className="text-xs text-muted-foreground">
                            {new Date(post.createdAt).toLocaleString('es-DO', {
                              dateStyle: 'medium',
                              timeStyle: 'short'
                            })}
                          </p>
                        </div>

                        {(post.author._id === currentUserId || tribe.isAdmin) && (
                          <button
                            onClick={() => deletePostMutation.mutate(post._id)}
                            className="p-2 text-muted-foreground hover:text-red-500 rounded-lg transition-colors"
                            title="Eliminar publicación"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>

                      <p className="text-sm sm:text-base text-foreground whitespace-pre-line mb-4">
                        {post.content}
                      </p>

                      <div className="flex items-center gap-6 pt-3 border-t border-border/60 text-sm">
                        <button
                          onClick={() =>
                            isAuthenticated
                              ? likePostMutation.mutate(post._id)
                              : router.push(`/login?redirect=${encodeURIComponent(`/tribes/${params.id}`)}`)
                          }
                          className={`flex items-center gap-1.5 font-semibold transition-colors ${
                            post.likedByUser ? 'text-red-500' : 'text-muted-foreground hover:text-red-500'
                          }`}
                        >
                          <Heart className={`w-4 h-4 ${post.likedByUser ? 'fill-current' : ''}`} />
                          <span>{post.likes || 0} Me gusta</span>
                        </button>

                        <button
                          onClick={() =>
                            setExpandedComments((prev) => ({
                              ...prev,
                              [post._id]: !prev[post._id]
                            }))
                          }
                          className="flex items-center gap-1.5 font-semibold text-muted-foreground hover:text-primary transition-colors"
                        >
                          <MessageCircle className="w-4 h-4" />
                          <span>{post.commentsList?.length ?? post.comments ?? 0} Comentarios</span>
                        </button>
                      </div>

                      {/* Comments Section */}
                      {(expandedComments[post._id] || (post.commentsList && post.commentsList.length > 0)) && (
                        <div className="mt-4 pt-3 border-t border-border/40 space-y-3">
                          {(post.commentsList || []).map((c) => (
                            <div key={c._id} className="bg-muted/50 rounded-2xl p-3 text-xs sm:text-sm">
                              <div className="flex items-center justify-between mb-1">
                                <span className="font-bold text-foreground">
                                  {c.user?.firstName || c.user?.username || 'Miembro'} {c.user?.lastName || ''}
                                </span>
                                <span className="text-[11px] text-muted-foreground">
                                  {new Date(c.createdAt).toLocaleDateString('es-DO')}
                                </span>
                              </div>
                              <p className="text-muted-foreground">{c.content}</p>
                            </div>
                          ))}

                          {tribe.isMember && (
                            <div className="flex gap-2 pt-1">
                              <input
                                type="text"
                                value={commentInputs[post._id] || ''}
                                onChange={(e) =>
                                  setCommentInputs((prev) => ({ ...prev, [post._id]: e.target.value }))
                                }
                                placeholder="Escribe un comentario..."
                                className="flex-1 px-3.5 py-2 rounded-xl border border-border bg-background text-sm"
                                onKeyDown={(e) => e.key === 'Enter' && handleSendComment(post._id)}
                              />
                              <button
                                onClick={() => handleSendComment(post._id)}
                                disabled={commentPostMutation.isPending}
                                className="px-4 py-2 bg-primary text-primary-foreground rounded-xl text-xs font-bold"
                              >
                                Enviar
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* EVENTS TAB */}
        {activeTab === 'events' && !isLockedForVisitor && (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-bold">Eventos de la Comunidad</h3>
              <Link
                href="/events/create"
                className="px-4 py-2 bg-primary text-primary-foreground rounded-xl text-xs font-bold flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" /> Crear Evento
              </Link>
            </div>

            {(!tribe.events || tribe.events.length === 0) ? (
              <div className="bg-card border border-dashed border-border rounded-3xl p-10 text-center">
                <Calendar className="w-10 h-10 text-primary mx-auto mb-3 opacity-80" />
                <h4 className="font-bold text-lg mb-1">No hay eventos programados todavía</h4>
                <p className="text-sm text-muted-foreground mb-4">
                  Organiza el próximo encuentro para los miembros de {tribe.name}.
                </p>
                <Link
                  href="/events/create"
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-bold"
                >
                  <Plus className="w-4 h-4" /> Organizar Evento
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(tribe.events || []).map((event) => (
                  <Link
                    key={event._id}
                    href={`/events/${event._id}`}
                    className="bg-card border border-border hover:border-primary/50 rounded-2xl p-5 flex gap-4 transition-all hover:shadow-md"
                  >
                    {event.images?.[0]?.url && (
                      <img
                        src={event.images[0].url}
                        alt={event.title}
                        className="w-24 h-24 object-cover rounded-xl shrink-0"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-foreground text-base mb-1 truncate">
                        {event.title}
                      </h4>
                      <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
                        {event.description}
                      </p>
                      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-primary" />
                          {new Date(event.date).toLocaleDateString('es-DO')}
                        </span>
                        <span className="flex items-center gap-1 truncate">
                          <MapPin className="w-3.5 h-3.5 text-primary" />
                          {event.location?.name || event.location?.address || "Santo Domingo, RD"}
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}

        {/* MEMBERS TAB */}
        {activeTab === 'members' && !isLockedForVisitor && (
          <div className="bg-card border border-border rounded-3xl p-6 shadow-sm">
            <h3 className="text-lg font-bold mb-4">
              Miembros de la Comunidad ({(tribe.members || []).length})
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {(tribe.members || []).map((member) => (
                <div
                  key={member._id}
                  className="flex items-center justify-between p-3.5 rounded-2xl border border-border/60 bg-background/50"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-11 h-11 bg-primary/15 text-primary rounded-2xl flex items-center justify-center font-bold shrink-0 overflow-hidden">
                      {member.user.avatar ? (
                        <img src={member.user.avatar} alt="" className="w-full h-full object-cover" />
                      ) : (
                        member.user.firstName?.[0] || 'M'
                      )}
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-bold text-sm text-foreground truncate">
                        {member.user.firstName} {member.user.lastName}
                      </h4>
                      <p className="text-xs text-muted-foreground truncate">
                        @{member.user.username}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {member.role === 'admin' && (
                      <span className="px-2.5 py-1 rounded-full bg-amber-500/15 text-amber-500 text-xs font-bold flex items-center gap-1">
                        <Crown className="w-3 h-3" /> Fundador
                      </span>
                    )}
                    {member.role === 'moderator' && (
                      <span className="px-2.5 py-1 rounded-full bg-blue-500/15 text-blue-400 text-xs font-bold flex items-center gap-1">
                        <Shield className="w-3 h-3" /> Mod
                      </span>
                    )}
                    {member.role === 'member' && (
                      <span className="px-2.5 py-1 rounded-full bg-muted text-muted-foreground text-xs font-medium">
                        Miembro
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'requests' && <TribeRequestsPanel key={`requests-${currentUserId}`} canManage={tribe.canManageRequests}
          requests={tribe.joinRequests} busy={Boolean(accessActions.pending)} busyUserId={accessActions.pending?.targetUserId}
          refreshing={isFetching} onRefresh={() => { void refetch() }}
          onReview={(targetUserId, kind) => { if (tribe.canManageRequests) void accessActions.run({ tribeId: tribe._id, kind, targetUserId }) }}
          error={accessFailure?.message} onRetry={() => { void accessActions.retry() }} />}

        {/* ABOUT & RULES TAB */}
        {activeTab === 'about' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-card border border-border rounded-3xl p-6 shadow-sm">
              <h3 className="text-lg font-bold mb-4">Información de la Comunidad</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between py-2 border-b border-border/60">
                  <span className="text-muted-foreground">Categoría:</span>
                  <span className="font-semibold">
                    {CATEGORY_TRANSLATIONS[tribe.category] || tribe.category}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-border/60">
                  <span className="text-muted-foreground">Privacidad:</span>
                  <span className="font-semibold">
                    {tribe.privacy === 'secret' ? 'Secreta' : tribe.isPrivate ? 'Privada' : 'Pública'} · {tribe.membership === 'invite_only' ? 'Solo por invitación' : tribe.membership === 'approval_required' ? 'Ingreso con solicitud' : 'Ingreso abierto'}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-border/60">
                  <span className="text-muted-foreground">Fundada por:</span>
                  <span className="font-semibold">
                    {tribe.createdBy.firstName} {tribe.createdBy.lastName}
                  </span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-muted-foreground">Fecha de creación:</span>
                  <span className="font-semibold">
                    {new Date(tribe.createdAt).toLocaleDateString('es-DO')}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-card border border-border rounded-3xl p-6 shadow-sm">
              <h3 className="text-lg font-bold mb-4">Reglas de Convivencia</h3>
              <ul className="space-y-2.5 text-sm">
                {(tribe.rules || []).map((rule, index) => (
                  <li key={index} className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-primary/15 text-primary text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                      {index + 1}
                    </span>
                    <span className="text-muted-foreground">{rule}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>

      {/* Admin Settings Modal */}
      {showSettingsModal && tribe.isAdmin && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setShowSettingsModal(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-card border border-border rounded-3xl p-6 sm:p-8 w-full max-w-md shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-extrabold">Configurar Comunidad</h3>
              <button onClick={() => setShowSettingsModal(false)} className="p-1.5 rounded-lg hover:bg-muted">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-muted-foreground mb-1">
                Nombre
              </label>
              <input
                type="text"
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                className="w-full p-3 rounded-xl border border-border bg-background text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-muted-foreground mb-1">
                Descripción
              </label>
              <textarea
                rows={3}
                value={editForm.description}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                className="w-full p-3 rounded-xl border border-border bg-background text-sm resize-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-muted-foreground mb-1">
                Mensaje de Bienvenida
              </label>
              <input
                type="text"
                value={editForm.welcomeMessage}
                onChange={(e) => setEditForm({ ...editForm, welcomeMessage: e.target.value })}
                className="w-full p-3 rounded-xl border border-border bg-background text-sm"
              />
            </div>

            <div className="flex items-center justify-between p-3.5 rounded-2xl border border-border bg-muted/40">
              <div>
                <div className="text-sm font-bold">Comunidad Privada</div>
                <div className="text-xs text-muted-foreground">
                  Requiere aprobar solicitudes para ingresar
                </div>
              </div>
              <input
                type="checkbox"
                checked={editForm.isPrivate}
                onChange={(e) => setEditForm({ ...editForm, isPrivate: e.target.checked })}
                className="w-5 h-5"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setShowSettingsModal(false)}
                className="flex-1 py-3 rounded-xl border border-border text-sm font-semibold"
              >
                Cancelar
              </button>
              <button
                onClick={() => updateTribeMutation.mutate()}
                disabled={updateTribeMutation.isPending}
                className="flex-1 py-3 rounded-xl bg-primary text-primary-foreground text-sm font-bold"
              >
                {updateTribeMutation.isPending ? 'Guardando...' : 'Guardar Cambios'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
