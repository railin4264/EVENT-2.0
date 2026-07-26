'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  MessageCircle, Calendar, Users, TrendingUp,
  Plus, Search, Camera, Image as ImageIcon, Send, X
} from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import toast from 'react-hot-toast'
import StoriesBar from '@/components/stories/StoriesBar'
import { useInfiniteQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/api/client'
import CommentService from '@/services/CommentService'
import PostCard from '@/components/feed/PostCard'
import { EmptyState } from '@/components/ui/EmptyState'
import Link from 'next/link'

const Video = Camera // alias

type FilterType = 'todos' | 'trending' | 'conexiones' | 'tribus' | 'eventos'

const FILTERS: { id: FilterType; label: string; emoji: string }[] = [
  { id: 'todos',      label: 'Todos',    emoji: '✨' },
  { id: 'trending',   label: 'Trending', emoji: '🔥' },
  { id: 'conexiones', label: 'Amigos',   emoji: '👥' },
  { id: 'tribus',     label: 'Tribus',   emoji: '🏕️' },
  { id: 'eventos',    label: 'Eventos',  emoji: '🎉' },
]

export default function FeedPage() {
  const [selectedFilter, setSelectedFilter] = useState<FilterType>('todos')
  const [newPost, setNewPost] = useState('')
  const [showCreatePost, setShowCreatePost] = useState(false)

  const { user, isAuthenticated } = useAuthStore()

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
    enabled: isAuthenticated
  })

  const posts = data?.pages?.flatMap(page => page.data) || []

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
    if (!newPost.trim()) { toast.error('Escribe algo para publicar'); return }
    try {
      await apiClient.post('/feed', { content: newPost.trim(), type: 'text', visibility: 'public' })
      setNewPost(''); setShowCreatePost(false)
      toast.success('¡Post creado!'); refetch()
    } catch { toast.error('Error al crear el post') }
  }

  const handleLike = async (postId: string) => {
    try { await apiClient.post(`/feed/${postId}/like`); refetch() }
    catch { toast.error('Error al dar me gusta') }
  }

  const handleComment = async (postId: string, text: string) => {
    if (!text.trim()) return
    try {
      await CommentService.createComment({ targetType: 'post', targetId: postId, content: text.trim() })
      toast.success('Comentario añadido'); refetch()
    } catch { toast.error('Error al añadir comentario') }
  }

  const handleShare = async (postId: string) => {
    try { await apiClient.post(`/feed/${postId}/share`); toast.success('Post compartido'); refetch() }
    catch { toast.error('Error al compartir') }
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-6 px-6">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center text-2xl shadow-xl shadow-emerald-500/30">🌐</div>
        <div className="text-center">
          <h2 className="text-xl font-bold text-white mb-2">Inicia sesión para ver tu feed</h2>
          <p className="text-gray-500 text-sm">Conecta con la comunidad EventConnect</p>
        </div>
        <Link href="/login" className="px-8 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold rounded-2xl shadow-lg shadow-emerald-500/25 active:scale-95 transition-transform">
          Iniciar Sesión
        </Link>
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="min-h-screen"
    >
      {/* ── Filter chips ─────────────────────────────────── */}
      <div className="sticky top-14 z-30 px-4 py-2.5 bg-gray-950/70 backdrop-blur-xl border-b border-white/[0.05]">
        <div className="flex gap-2 overflow-x-auto scrollbar-none pb-0.5">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => setSelectedFilter(f.id)}
              className={[
                'flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[13px] font-semibold whitespace-nowrap',
                'transition-all duration-200 active:scale-95',
                selectedFilter === f.id
                  ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/30'
                  : 'bg-white/[0.07] text-gray-400 hover:bg-white/[0.12]'
              ].join(' ')}
            >
              <span>{f.emoji}</span>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-xl mx-auto px-4 py-4 space-y-4">
        {/* ── Stories ──────────────────────────────────────── */}
        <StoriesBar />

        {/* ── Create Post ──────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="rounded-2xl bg-white/[0.05] border border-white/[0.08] p-4"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center text-white font-black text-sm shadow-md shadow-violet-500/20 shrink-0">
              {(user?.firstName?.[0] || user?.username?.[0] || '?').toUpperCase()}
            </div>
            <button
              onClick={() => setShowCreatePost(!showCreatePost)}
              className="flex-1 text-left px-4 py-2.5 bg-white/[0.06] hover:bg-white/[0.09] border border-white/[0.06] rounded-xl text-sm text-gray-500 transition-colors"
            >
              ¿Qué está pasando hoy?
            </button>
            <Link
              href="/events/create"
              className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center shadow-md shadow-emerald-500/25 shrink-0 active:scale-95 transition-transform"
              aria-label="Crear evento"
            >
              <Plus className="w-4 h-4 text-white" strokeWidth={2.5} />
            </Link>
          </div>

          <AnimatePresence>
            {showCreatePost && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                className="overflow-hidden"
              >
                <div className="pt-3 space-y-3">
                  <textarea
                    value={newPost}
                    onChange={(e) => setNewPost(e.target.value)}
                    placeholder="Comparte un momento, evento o pensamiento..."
                    className="w-full p-3 bg-white/[0.06] border border-white/[0.08] rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-white placeholder:text-gray-600 text-sm leading-relaxed"
                    rows={3}
                    autoFocus
                  />
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      {[ImageIcon, Video, Calendar].map((Icon, i) => (
                        <button key={i} className="p-2 rounded-lg hover:bg-white/[0.08] transition-colors text-gray-500 hover:text-gray-300 active:scale-90">
                          <Icon className="w-4 h-4" />
                        </button>
                      ))}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setShowCreatePost(false)}
                        className="px-3 py-1.5 text-xs text-gray-500 rounded-xl hover:bg-white/[0.08] transition-colors"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={handleCreatePost}
                        disabled={!newPost.trim()}
                        className="px-4 py-1.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5"
                      >
                        <Send className="w-3 h-3" />
                        Publicar
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* ── Error ────────────────────────────────────────── */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="flex items-center justify-between bg-rose-500/10 border border-rose-500/20 rounded-2xl p-4"
            >
              <p className="text-sm text-rose-400">{(error as any)?.message || 'Error al cargar el feed'}</p>
              <button onClick={() => refetch()} className="p-1 rounded-lg hover:bg-rose-500/10 transition-colors">
                <X className="w-4 h-4 text-rose-400" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Posts ────────────────────────────────────────── */}
        <div className="space-y-4">
          {isLoading && posts.length === 0 ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="rounded-2xl bg-white/[0.05] border border-white/[0.06] p-4 animate-pulse">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-white/10 rounded-xl" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3 bg-white/10 rounded-full w-1/3" />
                      <div className="h-2.5 bg-white/10 rounded-full w-1/5" />
                    </div>
                  </div>
                  <div className="space-y-2 mb-4">
                    <div className="h-3 bg-white/10 rounded-full" />
                    <div className="h-3 bg-white/10 rounded-full w-3/4" />
                  </div>
                  <div className="h-36 bg-white/10 rounded-xl mb-4" />
                  <div className="flex items-center gap-4">
                    <div className="h-7 bg-white/10 rounded-full w-16" />
                    <div className="h-7 bg-white/10 rounded-full w-16" />
                    <div className="h-7 bg-white/10 rounded-full w-16" />
                  </div>
                </div>
              ))}
            </div>
          ) : posts.length === 0 ? (
            <EmptyState
              icon={MessageCircle}
              title="Tu feed está vacío"
              description="Sé el primero — comparte algo o sigue a más personas."
              className="mt-12"
            />
          ) : (
            posts.map((post) => (
              <PostCard
                key={post.id}
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
            <div className="w-6 h-6 rounded-full border-2 border-emerald-500/40 border-t-emerald-500 animate-spin" />
          </div>
        )}

        {!hasNextPage && posts.length > 0 && (
          <div className="text-center py-8 text-gray-600 text-sm">¡Has llegado al final! ✨</div>
        )}

        {isFetchingNextPage && (
          <div className="text-center py-4 flex items-center justify-center gap-2 text-gray-600 text-xs">
            <div className="w-4 h-4 rounded-full border-2 border-emerald-500/40 border-t-emerald-500 animate-spin" />
            Cargando más...
          </div>
        )}
      </div>
    </motion.div>
  )
}