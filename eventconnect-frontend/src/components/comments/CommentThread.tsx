'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MessageCircle, Heart, MoreVertical, Edit, Trash2, Flag } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import { AnimatedLikeButton } from '@/components/redesign/ui/animated-like-button'
import { Avatar } from '@/components/ui/Avatar'
import { cn } from '@/lib/utils'

interface Comment {
  _id: string
  content: string
  author: {
    _id: string
    firstName: string
    lastName: string
    username: string
    avatar?: string
  }
  likes: string[]
  replies: Comment[]
  createdAt: string
  updatedAt: string
}

interface CommentThreadProps {
  comments?: Comment[]
  currentUserId?: string
  onReply: (commentId: string, content: string) => Promise<void>
  onLike: (commentId: string) => Promise<void>
  onUnlike: (commentId: string) => Promise<void>
  onEdit: (commentId: string, content: string) => Promise<void>
  onDelete: (commentId: string) => Promise<void>
  maxDepth?: number
  currentDepth?: number
}

function CommentItem({
  comment,
  currentUserId,
  onReply,
  onLike,
  onUnlike,
  onEdit,
  onDelete,
  maxDepth = 3,
  currentDepth = 0
}: CommentThreadProps & { comment: Comment }) {
  const [showReplyForm, setShowReplyForm] = useState(false)
  const [showReplies, setShowReplies] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const [replyContent, setReplyContent] = useState('')
  const [editContent, setEditContent] = useState(comment.content)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const isLiked = currentUserId ? comment.likes.includes(currentUserId) : false
  const isAuthor = currentUserId === comment.author._id
  const canReply = currentDepth < maxDepth

  const handleReply = async () => {
    if (!replyContent.trim() || isSubmitting) return

    setIsSubmitting(true)
    try {
      await onReply(comment._id, replyContent)
      setReplyContent('')
      setShowReplyForm(false)
      setShowReplies(true)
    } catch (error) {
      console.error('Error submitting reply:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEdit = async () => {
    if (!editContent.trim() || isSubmitting) return

    setIsSubmitting(true)
    try {
      await onEdit(comment._id, editContent)
      setIsEditing(false)
    } catch (error) {
      console.error('Error editing comment:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('¿Estás seguro de que quieres eliminar este comentario?')) return

    setIsSubmitting(true)
    try {
      await onDelete(comment._id)
    } catch (error) {
      console.error('Error deleting comment:', error)
      setIsSubmitting(false)
    }
  }

  const handleLike = () => {
    if (isLiked) {
      onUnlike(comment._id)
    } else {
      onLike(comment._id)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className={cn(
        'group',
        currentDepth > 0 && 'ml-8 border-l-2 border-gray-200 dark:border-gray-700 pl-4'
      )}
    >
      <div className="flex gap-3">
        {/* Avatar */}
        <Avatar
          src={comment.author.avatar}
          alt={comment.author.username}
          fallback={comment.author.firstName[0] + comment.author.lastName[0]}
          size="md"
        />

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Author and Time */}
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm text-gray-900 dark:text-white">
                {comment.author.firstName} {comment.author.lastName}
              </span>
              <span className="text-xs text-gray-500">
                @{comment.author.username}
              </span>
              <span className="text-xs text-gray-400">
                {formatDistanceToNow(new Date(comment.createdAt), {
                  addSuffix: true,
                  locale: es
                })}
              </span>
              {comment.createdAt !== comment.updatedAt && (
                <span className="text-xs text-gray-400 italic">(editado)</span>
              )}
            </div>

            {/* Menu */}
            {isAuthor && (
              <div className="relative">
                <button
                  onClick={() => setShowMenu(!showMenu)}
                  className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <MoreVertical className="w-4 h-4" />
                </button>

                <AnimatePresence>
                  {showMenu && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95, y: -10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: -10 }}
                      className="absolute right-0 mt-1 w-32 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-10"
                    >
                      <button
                        onClick={() => {
                          setIsEditing(true)
                          setShowMenu(false)
                        }}
                        className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2"
                      >
                        <Edit className="w-3 h-3" />
                        Editar
                      </button>
                      <button
                        onClick={handleDelete}
                        className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 flex items-center gap-2"
                      >
                        <Trash2 className="w-3 h-3" />
                        Eliminar
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </div>

          {/* Comment Content or Edit Form */}
          {isEditing ? (
            <div className="mb-2">
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm resize-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                rows={3}
                autoFocus
              />
              <div className="flex gap-2 mt-2">
                <button
                  onClick={handleEdit}
                  disabled={isSubmitting}
                  className="px-3 py-1 bg-primary-600 text-white text-sm rounded-md hover:bg-primary-700 disabled:opacity-50"
                >
                  Guardar
                </button>
                <button
                  onClick={() => {
                    setIsEditing(false)
                    setEditContent(comment.content)
                  }}
                  disabled={isSubmitting}
                  className="px-3 py-1 bg-gray-200 dark:bg-gray-700 text-sm rounded-md hover:bg-gray-300 dark:hover:bg-gray-600"
                >
                  Cancelar
                </button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-700 dark:text-gray-300 mb-2 whitespace-pre-wrap">
              {comment.content}
            </p>
          )}

          {/* Actions */}
          <div className="flex items-center gap-4">
            <AnimatedLikeButton
              isLiked={isLiked}
              likeCount={(comment.likes?.length || 0)}
              onLike={handleLike}
              onUnlike={handleLike}
              size="sm"
            />

            {canReply && (
              <button
                onClick={() => setShowReplyForm(!showReplyForm)}
                className="flex items-center gap-1 text-xs text-gray-500 hover:text-primary-600 transition-colors"
              >
                <MessageCircle className="w-3 h-3" />
                Responder
              </button>
            )}

            {comment.replies?.length > 0 && (
              <button
                onClick={() => setShowReplies(!showReplies)}
                className="flex items-center gap-1 text-xs text-gray-500 hover:text-primary-600 transition-colors"
              >
                <MessageCircle className="w-3 h-3" />
                {showReplies ? 'Ocultar' : 'Ver'} {comment.replies.length} {comment.replies.length === 1 ? 'respuesta' : 'respuestas'}
              </button>
            )}
          </div>

          {/* Reply Form */}
          <AnimatePresence>
            {showReplyForm && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-3"
              >
                <textarea
                  value={replyContent}
                  onChange={(e) => setReplyContent(e.target.value)}
                  placeholder="Escribe tu respuesta..."
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm resize-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  rows={3}
                  autoFocus
                />
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={handleReply}
                    disabled={isSubmitting || !replyContent.trim()}
                    className="px-3 py-1 bg-primary-600 text-white text-sm rounded-md hover:bg-primary-700 disabled:opacity-50"
                  >
                    {isSubmitting ? 'Enviando...' : 'Responder'}
                  </button>
                  <button
                    onClick={() => {
                      setShowReplyForm(false)
                      setReplyContent('')
                    }}
                    disabled={isSubmitting}
                    className="px-3 py-1 bg-gray-200 dark:bg-gray-700 text-sm rounded-md hover:bg-gray-300 dark:hover:bg-gray-600"
                  >
                    Cancelar
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Nested Replies */}
          <AnimatePresence>
            {showReplies && comment.replies?.length > 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="mt-3 space-y-3"
              >
                {comment.replies.map((reply) => (
                  <CommentItem
                    key={reply._id}
                    comment={reply}
                    currentUserId={currentUserId}
                    onReply={onReply}
                    onLike={onLike}
                    onUnlike={onUnlike}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    maxDepth={maxDepth}
                    currentDepth={currentDepth + 1}
                  />
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  )
}

export function CommentThread(props: CommentThreadProps) {
  return (
    <div className="space-y-4">
      <AnimatePresence mode="popLayout">
        {props.comments?.map((comment) => (
          <CommentItem
            key={comment._id}
            comment={comment}
            {...props}
          />
        ))}
      </AnimatePresence>
    </div>
  )
}
