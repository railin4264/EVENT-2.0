'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  MessageCircle,
  Calendar,
  Users,
  Plus,
  Camera,
  Image as ImageIcon,
  Send,
  X,
  Compass,
  Navigation,
  Lock,
  Globe,
  Star,
  TrendingUp,
  ArrowRight
} from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import toast from 'react-hot-toast'
import StoriesBar from '@/components/stories/StoriesBar'
import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/api/client'
import CommentService from '@/services/CommentService'
import PostCard from '@/components/feed/PostCard'
import { EmptyState } from '@/components/ui/EmptyState'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useLiveLocation, useLiveLocationStore } from '@/hooks/useLiveLocation'

const Video = Camera

type FilterType = 'todos' | 'trending' | 'conexiones' | 'tribus' | 'eventos'

const FILTERS = [
  { id: 'todos', label: 'Para ti', icon: Star },
  { id: 'trending', label: 'Tendencias', icon: TrendingUp },
  { id: 'tribus', label: 'Comunidades', icon: Users },
  { id: 'eventos', label: 'Eventos', icon: Calendar },
  { id: 'conexiones', label: 'Amigos', icon: Users }
]

export default function FeedPage() {
  const [selectedFilter, setSelectedFilter] = useState<FilterType>('todos')
  const [newPost, setNewPost] = useState('')
  const [showCreatePost, setShowCreatePost] = useState(false)
  const [includeLocation, setIncludeLocation] = useState(true)

  const { user, isAuthenticated } = useAuthStore()
  const { location: liveLocation, refreshNow, permissionState } = useLiveLocation(true)
  const router = useRouter()

  const {
    data,
    isLoading,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch
  } = useInfiniteQuery({
    queryKey: ['feed-posts', selectedFilter],
    queryFn: async ({ pageParam = 1 }) => {
      const response = await apiClient.get(`/feed?page=${pageParam}&limit=10&type=${selectedFilter}`)
      return response.data
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.pagination?.hasNext ? lastPage.pagination.page + 1 : undefined,
    enabled: true
  })

  // Also fetch featured communities for the Feed top strip
  const { data: featuredTribes } = useQuery({
    queryKey: ['feed-featured-tribes'],
    queryFn: async () => {
      const res = await apiClient.get('/tribes?limit=6')
      return res.data?.tribes || res.data?.data || []
    }
  })

  const posts = data?.pages?.flatMap((page) => page.data || []) || []

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) fetchNextPage()
      },
      { threshold: 0.1 }
    )
    const sentinel = document.getElementById('scroll-sentinel')
    if (sentinel) observer.observe(sentinel)
    return () => observer.disconnect()
  }, [hasNextPage, isFetchingNextPage, fetchNextPage])

  const handleCreatePost = async () => {
    if (!isAuthenticated) {
      router.push('/login?redirect=%2Ffeed')
      return
    }
    if (!newPost.trim()) {
      toast.error('Escribe algo para publicar')
      return
    }
    try {
      await apiClient.post('/feed', {
        content: newPost.trim(),
        type: 'text',
        visibility: 'public',
        ...(includeLocation && liveLocation?.city ? { location: `${liveLocation.city}, ${liveLocation.countryCode}` } : {})
      })
      setNewPost('')
      setShowCreatePost(false)
      toast.success('¡Publicación compartida en el feed!')
      void refetch()
    } catch {
      toast.error('Error al crear la publicación')
    }
  }

  const handleLike = async (postId: string) => {
    if (!isAuthenticated) {
      router.push('/login?redirect=%2Ffeed')
      return
    }
    try {
      await apiClient.post(`/feed/${postId}/like`)
      void refetch()
    } catch {
      toast.error('Error al dar me gusta')
    }
  }

  const handleComment = async (postId: string, text: string) => {
    if (!isAuthenticated) {
      router.push('/login?redirect=%2Ffeed')
      return
    }
    if (!text.trim()) return
    try {
      await CommentService.createComment({ targetType: 'post', targetId: postId, content: text.trim() })
      toast.success('Comentario añadido')
      void refetch()
    } catch {
      toast.error('Error al añadir comentario')
    }
  }

  const handleShare = async (postId: string) => {
    try {
      await apiClient.post(`/feed/${postId}/share`)
      toast.success('Publicación compartida')
      void refetch()
    } catch {
      toast.error('Error al compartir')
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="min-h-screen bg-background text-foreground pb-24"
    >
      {/* Top Navigation & Live Location Header */}
      <div className="sticky top-0 z-30 bg-background/90 backdrop-blur-xl border-b border-border">
        <div className="max-w-5xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          <div><h1 className="text-xl font-semibold tracking-tight">Tu comunidad</h1><p className="mt-1 text-sm text-muted-foreground">Historias, conversaciones y planes para compartir.</p></div>

          <div className="flex items-center gap-2 text-xs bg-primary/10 border border-primary/20 text-primary px-3 py-1.5 rounded-full">
            <Navigation className="w-3.5 h-3.5" />
            <span>{liveLocation.source === 'default' ? 'Elige tu destino' : `${liveLocation.city}, ${liveLocation.countryCode}`}</span>
            {permissionState === 'denied' ? <Link href="/discovery" className="ml-1 underline">Elegir en el mapa</Link> : <button type="button" onClick={async () => { await refreshNow(); const error = useLiveLocationStore.getState().error; if (error) toast.error(error) }} className="ml-1 min-h-11 underline font-semibold">Usar GPS</button>}
          </div>
        </div>

        {/* Filter Chips */}
        <div className="max-w-5xl mx-auto px-4 pb-2.5 flex gap-2 overflow-x-auto scrollbar-none">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              aria-pressed={selectedFilter === f.id}
              onClick={() => setSelectedFilter(f.id as FilterType)}
              className={[
                'flex min-h-11 items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs sm:text-sm font-semibold whitespace-nowrap transition-all',
                selectedFilter === f.id
                  ? 'bg-primary text-primary-foreground shadow-md'
                  : 'bg-card border border-border text-muted-foreground hover:text-foreground'
              ].join(' ')}
            >
              <f.icon className="h-4 w-4" aria-hidden="true" />
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-5 space-y-5">
        {/* Stories */}
        <StoriesBar />

        {/* Active Communities Strip */}
        {Array.isArray(featuredTribes) && featuredTribes.length > 0 && (
          <div className="rounded-2xl bg-card border border-border p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" />
                <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Comunidades para descubrir
                </h2>
              </div>
              <Link href="/tribes" className="text-xs font-bold text-primary flex items-center gap-1 hover:underline">
                Ver todas <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-1">
              {featuredTribes.slice(0, 5).map((tribe: any) => {
                const isPriv = Boolean(
                  tribe.isPrivate || tribe.privacy === 'private' || tribe.settings?.privacy === 'private'
                )
                return (
                  <Link
                    key={tribe._id}
                    href={`/tribes/${tribe._id}`}
                    className="min-w-[180px] max-w-[200px] p-3 rounded-2xl border border-border/80 bg-background/60 hover:border-primary/50 transition-all shrink-0"
                  >
                    <div className="flex items-center justify-between gap-1 mb-1.5">
                      <span className="w-8 h-8 rounded-xl bg-primary/15 text-primary font-bold text-xs flex items-center justify-center">
                        {tribe.name?.[0] || 'T'}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 ${
                          isPriv ? 'bg-amber-500/15 text-amber-500' : 'bg-emerald-500/15 text-emerald-500'
                        }`}
                      >
                        {isPriv ? <Lock className="w-2.5 h-2.5" /> : <Globe className="w-2.5 h-2.5" />}
                        {isPriv ? 'Privada' : 'Pública'}
                      </span>
                    </div>
                    <h3 className="font-bold text-xs text-foreground truncate">{tribe.name}</h3>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {tribe.memberCount ?? tribe.stats?.memberCount ?? 1} miembros
                    </p>
                  </Link>
                )
              })}
            </div>
          </div>
        )}

        {/* Create Post */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl bg-card border border-border shadow-sm p-4"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center font-black text-sm shrink-0">
              {(user?.firstName?.[0] || user?.username?.[0] || 'E').toUpperCase()}
            </div>
            <button
              onClick={() =>
                isAuthenticated ? setShowCreatePost(!showCreatePost) : router.push('/login?redirect=%2Ffeed')
              }
              className="flex-1 text-left px-4 py-2.5 bg-muted/60 hover:bg-muted border border-border rounded-xl text-sm text-muted-foreground transition-colors"
            >
              {isAuthenticated
                ? `¿Qué está pasando hoy en ${liveLocation.city}?`
                : 'Inicia sesión para compartir un plan o publicación...'}
            </button>
            <Link
              href={isAuthenticated ? '/events/create' : '/login?redirect=%2Fevents%2Fcreate'}
              className="w-10 h-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shadow-md shrink-0"
              title="Crear nuevo evento"
            >
              <Plus className="w-5 h-5" />
            </Link>
          </div>

          <AnimatePresence>
            {showCreatePost && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="pt-3 space-y-3">
                  <textarea
                    value={newPost}
                    onChange={(e) => setNewPost(e.target.value)}
                    placeholder="Comparte una recomendación, evento o busca gente para armar un coro..."
                    className="w-full p-3.5 bg-background border border-border rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-primary text-foreground text-sm leading-relaxed"
                    rows={3}
                    autoFocus
                  />
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
                      <input
                        type="checkbox"
                        checked={includeLocation}
                        onChange={(e) => setIncludeLocation(e.target.checked)}
                        className="rounded"
                      />
                      <span>📍 Etiquetar mi ubicación ({liveLocation.city})</span>
                    </label>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setShowCreatePost(false)}
                        className="px-3 py-1.5 text-xs text-muted-foreground rounded-xl hover:bg-muted"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={handleCreatePost}
                        disabled={!newPost.trim()}
                        className="px-4 py-2 bg-primary hover:bg-primary/90 disabled:opacity-40 text-primary-foreground text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5"
                      >
                        <Send className="w-3.5 h-3.5" />
                        Publicar
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Posts List */}
        <div className="space-y-4">
          {isLoading && posts.length === 0 ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="rounded-2xl bg-card border border-border p-5 animate-pulse h-48" />
              ))}
            </div>
          ) : posts.length === 0 ? (
            <EmptyState
              icon={MessageCircle}
              title="Aún no hay publicaciones en este filtro"
              description="Sé el primero en compartir un plan o únete a una comunidad para conversar."
              actionLabel="Explorar Comunidades"
              actionOnClick={() => router.push('/tribes')}
              className="mt-8"
            />
          ) : (
            posts.map((post) => (
              <PostCard
                key={post.id || post._id}
                post={post}
                currentUser={user}
                onLike={handleLike}
                onComment={handleComment}
                onShare={handleShare}
              />
            ))
          )}
        </div>

        {hasNextPage && (
          <div id="scroll-sentinel" className="h-16 flex items-center justify-center">
            <div className="w-6 h-6 rounded-full border-2 border-primary/40 border-t-primary animate-spin" />
          </div>
        )}
      </div>
    </motion.div>
  )
}