'use client'
import { CldImage } from 'next-cloudinary'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Heart, MessageCircle, Share, Bookmark, MoreHorizontal, Calendar, MapPin, Users, Clock, Send, Trash2, Edit, AlertTriangle, Copy, ExternalLink, TrendingUp, Eye } from 'lucide-react'
import { useFavorites } from '@/hooks/useFavorites'
import ShareButton from '@/components/discovery/ShareButton'
import CountdownTimer from '@/components/discovery/CountdownTimer'
import toast from 'react-hot-toast'

interface PostCardProps {
  post: any
  currentUser: any
  onLike: (postId: string) => void
  onComment: (postId: string, comment: string) => void
  onShare: (postId: string) => void
  onDelete?: (postId: string) => void
  onEdit?: (postId: string) => void
  onReport?: (postId: string) => void
}

export default function PostCard({
  post,
  currentUser,
  onLike,
  onComment,
  onShare,
  onDelete,
  onEdit,
  onReport
}: PostCardProps) {
  const [showComments, setShowComments] = useState(false)
  const [commentText, setCommentText] = useState('')
  const [showMenu, setShowMenu] = useState(false)
  const [isLiking, setIsLiking] = useState(false)
  const { toggleFavorite, isFavorite } = useFavorites()

  const handleLike = async () => {
    if (isLiking) return
    setIsLiking(true)
    // Optimistic update
    post.liked = !post.liked
    if (post.stats) {
      if (post.liked) post.stats.likes++
      else post.stats.likes--
    }
    try {
      await onLike(post.id)
    } catch (e) {
      // Revert on failure
      post.liked = !post.liked
      if (post.stats) {
        if (!post.liked) post.stats.likes--
        else post.stats.likes++
      }
    }
    setTimeout(() => setIsLiking(false), 300)
  }

  const handleComment = async () => {
    if (!commentText.trim()) {
      toast.error('Escribe un comentario')
      return
    }
    await onComment(post.id, commentText)
    setCommentText('')
  }

  const displayTime = (timestamp: string) => {
    if (!timestamp) return ''
    if (typeof timestamp === 'string') {
      // If it's already a relative format (e.g. "12m", "3h", "18 oct") or localized text
      if (timestamp.match(/^[0-9]+[smhd]$/) || timestamp.includes(' ') || isNaN(Date.parse(timestamp))) {
        return timestamp
      }
    }
    const now = new Date()
    const time = new Date(timestamp)
    if (isNaN(time.getTime())) return timestamp

    const diffInMinutes = Math.floor((now.getTime() - time.getTime()) / (1000 * 60))

    if (diffInMinutes < 1) return 'Ahora'
    if (diffInMinutes < 60) return `${diffInMinutes}m`
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h`
    if (diffInMinutes < 10080) return `${Math.floor(diffInMinutes / 1440)}d`
    return new Date(timestamp).toLocaleDateString('es-DO', { day: 'numeric', month: 'short' })
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden hover:shadow-md transition-shadow"
    >
      {/* Post Header */}
      <div className="p-6 pb-0">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3 flex-1">
            {/* User Avatar */}
            <div className="relative">
              <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-full flex items-center justify-center ring-2 ring-white dark:ring-gray-800">
                <span className="text-white font-bold text-lg">
                  {post.user?.name?.[0] || '?'}
                </span>
              </div>
              {post.user?.isOnline && (
                <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 border-2 border-white dark:border-gray-800 rounded-full"></div>
              )}
            </div>

            {/* User Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                  {post.user?.name}
                </h3>
                {post.user?.verified && (
                  <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-xs">✓</span>
                  </div>
                )}
                {post.user?.isPremium && (
                  <span className="px-2 py-0.5 bg-gradient-to-r from-yellow-400 to-orange-500 text-white text-xs rounded-full font-medium flex-shrink-0">
                    PRO
                  </span>
                )}
                {post.isSponsored && (
                  <span className="px-2 py-0.5 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 text-xs rounded-full flex-shrink-0">
                    Patrocinado
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                <span>{displayTime(post.timestamp)}</span>
                {post.user?.title && (
                  <>
                    <span>•</span>
                    <span className="truncate">{post.user.title}</span>
                  </>
                )}
                {post.location && (
                  <>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {post.location}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* More Menu */}
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <MoreHorizontal className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </button>

            <AnimatePresence>
              {showMenu && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setShowMenu(false)}
                  />
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: -10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -10 }}
                    className="absolute right-0 top-12 w-56 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 py-2 z-20"
                  >
                    {post.user?.id === currentUser?.id ? (
                      <>
                        <button
                          onClick={() => {
                            onEdit?.(post.id)
                            setShowMenu(false)
                          }}
                          className="w-full flex items-center gap-3 px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                        >
                          <Edit className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                          <span className="text-sm text-gray-900 dark:text-white">Editar</span>
                        </button>
                        <button
                          onClick={() => {
                            onDelete?.(post.id)
                            setShowMenu(false)
                          }}
                          className="w-full flex items-center gap-3 px-4 py-2 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                        >
                          <Trash2 className="w-4 h-4 text-red-600 dark:text-red-400" />
                          <span className="text-sm text-red-600 dark:text-red-400">Eliminar</span>
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(window.location.origin + '/feed/' + post.id)
                            setShowMenu(false)
                          }}
                          className="w-full flex items-center gap-3 px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                        >
                          <Copy className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                          <span className="text-sm text-gray-900 dark:text-white">Copiar enlace</span>
                        </button>
                        <button
                          onClick={() => {
                            onReport?.(post.id)
                            setShowMenu(false)
                          }}
                          className="w-full flex items-center gap-3 px-4 py-2 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                        >
                          <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400" />
                          <span className="text-sm text-red-600 dark:text-red-400">Reportar</span>
                        </button>
                      </>
                    )}
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Post Content */}
        <div className="mb-4">
          <p className="text-gray-900 dark:text-white whitespace-pre-wrap leading-relaxed">
            {post.content}
          </p>

          {/* Hashtags */}
          {post.hashtags && post.hashtags.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {post.hashtags.map((tag: string, index: number) => (
                <span
                  key={index}
                  className="text-primary-600 dark:text-primary-400 font-medium text-sm hover:underline cursor-pointer"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Event Card */}
        {post.eventData && (
          <div className="bg-gradient-to-br from-primary-50 to-secondary-50 dark:from-primary-900/20 dark:to-secondary-900/20 rounded-xl p-4 mb-4 border border-primary-200 dark:border-primary-800">
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 bg-primary-500 rounded-lg flex items-center justify-center flex-shrink-0">
                <Calendar className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-bold text-gray-900 dark:text-white mb-2">
                  {post.eventData.name}
                </h4>

                {/* Countdown */}
                {post.eventData.date && (
                  <div className="mb-2">
                    <CountdownTimer
                      eventDate={post.eventData.date}
                      compact={true}
                      showIcon={true}
                    />
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    {new Date(post.eventData.date).toLocaleDateString()}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5" />
                    <span className="truncate">{post.eventData.location}</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5" />
                    {post.eventData.attendees} asistentes
                  </span>
                  {post.eventData.price !== undefined && (
                    <span className={`flex items-center gap-1.5 font-medium ${post.eventData.price === 0 ? 'text-green-600 dark:text-green-400' : ''
                      }`}>
                      {post.eventData.price === 0 ? 'Gratis' : `$${post.eventData.price}`}
                    </span>
                  )}
                </div>

                <button className="mt-3 w-full py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg font-medium transition-colors">
                  Ver Evento
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tribe Card */}
        {post.tribeData && (
          <div className="bg-gradient-to-br from-secondary-50 to-purple-50 dark:from-secondary-900/20 dark:to-purple-900/20 rounded-xl p-4 mb-4 border border-secondary-200 dark:border-secondary-800">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-secondary-500 rounded-lg flex items-center justify-center flex-shrink-0">
                <Users className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <h4 className="font-bold text-gray-900 dark:text-white">
                  {post.tribeData.name}
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {post.tribeData.memberCount} miembros • {post.tribeData.category}
                </p>
              </div>
              <button className="px-4 py-2 bg-secondary-500 hover:bg-secondary-600 text-white rounded-lg font-medium transition-colors">
                Unirse
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Post Media or Single Image */}
      {(post.image || (post.media && post.media.length > 0)) && (
        <div className="px-6 mb-4">
          {post.image ? (
            <div className="relative w-full rounded-2xl overflow-hidden max-h-[500px] border border-gray-100 dark:border-gray-700">
              <img
                src={post.image}
                alt="Post media"
                loading="lazy"
                className="w-full h-auto max-h-[500px] object-cover"
              />
            </div>
          ) : post.media.length === 1 ? (
            <div className="relative w-full rounded-xl overflow-hidden min-h-[300px] max-h-[500px] border border-gray-100 dark:border-gray-700">
              <img
                src={post.media[0].url || post.media[0]}
                alt="Post media"
                loading="lazy"
                className="w-full h-auto max-h-[500px] object-cover"
              />
            </div>
          ) : (
            <div className={`grid gap-2 ${post.media.length === 2 ? 'grid-cols-2' :
              post.media.length === 3 ? 'grid-cols-3' :
                'grid-cols-2'
              }`}>
              {post.media.slice(0, 4).map((media: any, index: number) => {
                const mediaUrl = typeof media === 'string' ? media : media?.url
                return (
                  <div key={index} className="relative h-48 rounded-lg overflow-hidden border border-gray-100 dark:border-gray-700">
                    <img
                      src={mediaUrl}
                      alt={`Media ${index + 1}`}
                      loading="lazy"
                      className="w-full h-full object-cover"
                    />
                    {index === 3 && post.media.length > 4 && (
                      <div className="absolute inset-0 bg-black/60 rounded-lg flex items-center justify-center z-10">
                        <span className="text-white text-2xl font-bold">
                          +{post.media.length - 4}
                        </span>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Post Stats Bar */}
      {post.stats && (
        <div className="px-6 pb-3 flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
          <div className="flex items-center gap-4">
            {post.stats.likes > 0 && (
              <span className="flex items-center gap-1">
                <Heart className="w-4 h-4 fill-red-500 text-red-500" />
                {post.stats.likes}
              </span>
            )}
            {post.stats.views > 0 && (
              <span className="flex items-center gap-1">
                <Eye className="w-4 h-4" />
                {post.stats.views}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            {post.stats.comments > 0 && (
              <span>{post.stats.comments} comentarios</span>
            )}
            {post.stats.shares > 0 && (
              <span>{post.stats.shares} compartidos</span>
            )}
          </div>
        </div>
      )}

      {/* Post Actions */}
      <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <motion.button
              onClick={handleLike}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${post.liked
                ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400'
                : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400'
                }`}
            >
              <Heart className={`w-5 h-5 ${post.liked ? 'fill-current' : ''}`} />
              <span className="text-sm font-medium">Me gusta</span>
            </motion.button>

            <motion.button
              onClick={() => setShowComments(!showComments)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 transition-colors"
            >
              <MessageCircle className="w-5 h-5" />
              <span className="text-sm font-medium">Comentar</span>
            </motion.button>

            <ShareButton
              event={post.eventData || { title: post.content?.slice(0, 50), description: post.content }}
              variant="icon"
              onShare={(platform) => onShare(post.id)}
            />
          </div>

          <motion.button
            onClick={() => toggleFavorite(post.id)}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            className={`p-2 rounded-lg transition-all ${isFavorite(post.id)
              ? 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400'
              : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400'
              }`}
          >
            <Bookmark className={`w-5 h-5 ${isFavorite(post.id) ? 'fill-current' : ''}`} />
          </motion.button>
        </div>
      </div>

      {/* Comments Section */}
      <AnimatePresence>
        {showComments && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="border-t border-gray-100 dark:border-gray-700 px-6 py-4 bg-gray-50 dark:bg-gray-900/50"
          >
            {/* Comment Input */}
            <div className="flex items-start gap-3 mb-4">
              <div className="w-9 h-9 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-white font-semibold text-sm">
                  {currentUser?.firstName?.[0] || currentUser?.username?.[0] || '?'}
                </span>
              </div>
              <div className="flex-1 flex gap-2">
                <input
                  type="text"
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Escribe un comentario..."
                  className="flex-1 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      handleComment()
                    }
                  }}
                />
                <motion.button
                  onClick={handleComment}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className={`px-4 py-2 text-white rounded-lg transition-colors ${!commentText.trim() ? 'bg-primary-300 cursor-not-allowed' : 'bg-primary-500 hover:bg-primary-600'
                    }`}
                >
                  <Send className="w-4 h-4" />
                </motion.button>
              </div>
            </div>

            {/* Comments List */}
            {post.comments && (post.comments?.length || 0) > 0 && (
              <div className="space-y-3">
                {post.comments.map((comment: any) => (
                  <div key={comment.id} className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-gray-400 to-gray-600 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-white font-semibold text-xs">
                        {comment.user?.name?.[0] || '?'}
                      </span>
                    </div>
                    <div className="flex-1 bg-white dark:bg-gray-800 rounded-lg px-3 py-2">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-sm text-gray-900 dark:text-white">
                          {comment.user?.name}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {displayTime(comment.timestamp)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700 dark:text-gray-300">
                        {comment.content}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
