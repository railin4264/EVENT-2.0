'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Star, ThumbsUp, ThumbsDown, Flag, MoreHorizontal, Send, X, Check, Image as ImageIcon, Smile } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api/client'
import { useAuthStore } from '@/stores/authStore'
import toast from 'react-hot-toast'

interface Review {
  _id: string
  event: string
  user: {
    _id: string
    firstName: string
    lastName: string
    avatar?: string
  }
  rating: number
  comment: string
  photos?: string[]
  helpful: {
    likes: number
    dislikes: number
    userVote?: 'like' | 'dislike' | null
  }
  verified: boolean
  createdAt: string
  updatedAt: string
}

interface RatingBreakdown {
  average: number
  total: number
  breakdown: {
    5: number
    4: number
    3: number
    2: number
    1: number
  }
}

interface EventReviewsProps {
  eventId: string
}

export default function EventReviews({ eventId }: EventReviewsProps) {
  const [showWriteReview, setShowWriteReview] = useState(false)
  const [rating, setRating] = useState(0)
  const [hoverRating, setHoverRating] = useState(0)
  const [comment, setComment] = useState('')
  const [sortBy, setSortBy] = useState<'recent' | 'helpful' | 'rating'>('recent')
  const { user } = useAuthStore()
  const queryClient = useQueryClient()

  // Fetch rating breakdown
  const { data: ratingBreakdown } = useQuery({
    queryKey: ['rating-breakdown', eventId],
    queryFn: async () => {
      const response = await apiClient.get(`/events/${eventId}/ratings/breakdown`)
      return response.data as RatingBreakdown
    }
  })

  // Fetch reviews
  const { data: reviews, isLoading } = useQuery({
    queryKey: ['reviews', eventId, sortBy],
    queryFn: async () => {
      const response = await apiClient.get(`/events/${eventId}/reviews?sort=${sortBy}`)
      return response.data.reviews as Review[]
    }
  })

  // Submit review mutation
  const submitReviewMutation = useMutation({
    mutationFn: async (data: { rating: number; comment: string }) => {
      const response = await apiClient.post(`/events/${eventId}/reviews`, data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reviews', eventId] })
      queryClient.invalidateQueries({ queryKey: ['rating-breakdown', eventId] })
      setShowWriteReview(false)
      setRating(0)
      setComment('')
      toast.success('Reseña publicada exitosamente')
    },
    onError: () => {
      toast.error('Error al publicar reseña')
    }
  })

  // Vote helpful mutation
  const voteHelpfulMutation = useMutation({
    mutationFn: async (data: { reviewId: string; vote: 'like' | 'dislike' }) => {
      const response = await apiClient.post(`/reviews/${data.reviewId}/vote`, { vote: data.vote })
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reviews', eventId] })
    }
  })

  // Report review mutation
  const reportReviewMutation = useMutation({
    mutationFn: async (reviewId: string) => {
      await apiClient.post(`/reviews/${reviewId}/report`)
    },
    onSuccess: () => {
      toast.success('Reseña reportada')
    }
  })

  const handleSubmitReview = () => {
    if (rating === 0) {
      toast.error('Por favor selecciona una calificación')
      return
    }

    if (!comment.trim()) {
      toast.error('Por favor escribe un comentario')
      return
    }

    submitReviewMutation.mutate({ rating, comment: comment.trim() })
  }

  const getRatingPercentage = (stars: number) => {
    if (!ratingBreakdown) return 0
    return (ratingBreakdown.breakdown[stars as 5 | 4 | 3 | 2 | 1] / ratingBreakdown.total) * 100
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    })
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          Reseñas y Calificaciones
        </h2>

        <button
          onClick={() => setShowWriteReview(true)}
          className="px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg font-medium transition-colors"
        >
          Escribir Reseña
        </button>
      </div>

      {/* Rating Summary */}
      {ratingBreakdown && (
        <div className="grid md:grid-cols-2 gap-6 mb-8 p-6 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
          {/* Overall Rating */}
          <div className="flex flex-col items-center justify-center text-center">
            <div className="text-6xl font-bold text-gray-900 dark:text-white mb-2">
              {ratingBreakdown.average.toFixed(1)}
            </div>

            <div className="flex items-center gap-1 mb-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={`w-6 h-6 ${
                    star <= ratingBreakdown.average
                      ? 'fill-yellow-400 text-yellow-400'
                      : 'text-gray-300 dark:text-gray-600'
                  }`}
                />
              ))}
            </div>

            <p className="text-sm text-gray-600 dark:text-gray-400">
              {ratingBreakdown.total} {ratingBreakdown.total === 1 ? 'reseña' : 'reseñas'}
            </p>
          </div>

          {/* Rating Breakdown */}
          <div className="space-y-2">
            {[5, 4, 3, 2, 1].map((stars) => (
              <div key={stars} className="flex items-center gap-3">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300 w-12">
                  {stars} <Star className="w-3 h-3 inline fill-yellow-400 text-yellow-400" />
                </span>

                <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-yellow-400 transition-all duration-500"
                    style={{ width: `${getRatingPercentage(stars)}%` }}
                  />
                </div>

                <span className="text-sm text-gray-600 dark:text-gray-400 w-12 text-right">
                  {ratingBreakdown.breakdown[stars as 5 | 4 | 3 | 2 | 1]}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sort Options */}
      <div className="flex items-center gap-2 mb-6">
        <span className="text-sm text-gray-600 dark:text-gray-400">Ordenar por:</span>

        <div className="flex gap-2">
          {[
            { value: 'recent', label: 'Más recientes' },
            { value: 'helpful', label: 'Más útiles' },
            { value: 'rating', label: 'Calificación' }
          ].map((option) => (
            <button
              key={option.value}
              onClick={() => setSortBy(option.value as any)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                sortBy === option.value
                  ? 'bg-primary-500 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* Reviews List */}
      {isLoading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="animate-pulse p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-gray-200 dark:bg-gray-600 rounded-full"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-1/4"></div>
                  <div className="h-3 bg-gray-200 dark:bg-gray-600 rounded w-3/4"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : !reviews || reviews.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
            <Star className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            No hay reseñas aún
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            Sé el primero en compartir tu experiencia
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {reviews.map((review) => (
            <motion.div
              key={review._id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl"
            >
              {/* Review Header */}
              <div className="flex items-start gap-4 mb-3">
                {/* User Avatar */}
                <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0">
                  {review.user.avatar ? (
                    <img
                      src={review.user.avatar}
                      alt={review.user.firstName}
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    review.user.firstName[0]
                  )}
                </div>

                {/* User Info & Rating */}
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold text-gray-900 dark:text-white">
                        {review.user.firstName} {review.user.lastName}
                      </h4>
                      {review.verified && (
                        <span className="px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs rounded-full flex items-center gap-1">
                          <Check className="w-3 h-3" />
                          Verificado
                        </span>
                      )}
                    </div>

                    <button
                      onClick={() => reportReviewMutation.mutate(review._id)}
                      className="p-1 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                    >
                      <MoreHorizontal className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                    </button>
                  </div>

                  <div className="flex items-center gap-2 mb-2">
                    <div className="flex items-center gap-0.5">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`w-4 h-4 ${
                            star <= review.rating
                              ? 'fill-yellow-400 text-yellow-400'
                              : 'text-gray-300 dark:text-gray-600'
                          }`}
                        />
                      ))}
                    </div>

                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {formatDate(review.createdAt)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Review Content */}
              <p className="text-gray-700 dark:text-gray-300 mb-3 leading-relaxed">
                {review.comment}
              </p>

              {/* Review Photos */}
              {review.photos && review.photos.length > 0 && (
                <div className="flex gap-2 mb-3 overflow-x-auto">
                  {review.photos.map((photo, index) => (
                    <img
                      key={index}
                      src={photo}
                      alt={`Review photo ${index + 1}`}
                      className="w-24 h-24 object-cover rounded-lg"
                    />
                  ))}
                </div>
              )}

              {/* Helpful Actions */}
              <div className="flex items-center gap-4">
                <button
                  onClick={() => voteHelpfulMutation.mutate({ reviewId: review._id, vote: 'like' })}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors ${
                    review.helpful.userVote === 'like'
                      ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  <ThumbsUp className="w-4 h-4" />
                  <span className="text-sm font-medium">{review.helpful.likes}</span>
                </button>

                <button
                  onClick={() => voteHelpfulMutation.mutate({ reviewId: review._id, vote: 'dislike' })}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors ${
                    review.helpful.userVote === 'dislike'
                      ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  <ThumbsDown className="w-4 h-4" />
                  <span className="text-sm font-medium">{review.helpful.dislikes}</span>
                </button>

                <button
                  onClick={() => reportReviewMutation.mutate(review._id)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  <Flag className="w-4 h-4" />
                  <span className="text-sm font-medium">Reportar</span>
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Write Review Modal */}
      <AnimatePresence>
        {showWriteReview && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowWriteReview(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-md"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                  Escribir Reseña
                </h3>

                <button
                  onClick={() => setShowWriteReview(false)}
                  className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Rating Stars */}
              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-3">
                  Calificación
                </label>

                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(0)}
                      onClick={() => setRating(star)}
                      className="transition-transform hover:scale-110"
                    >
                      <Star
                        className={`w-10 h-10 ${
                          star <= (hoverRating || rating)
                            ? 'fill-yellow-400 text-yellow-400'
                            : 'text-gray-300 dark:text-gray-600'
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>

              {/* Comment */}
              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-2">
                  Comentario
                </label>

                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Comparte tu experiencia con otros..."
                  className="w-full px-4 py-3 bg-gray-100 dark:bg-gray-700 border-none rounded-lg focus:ring-2 focus:ring-primary-500 resize-none"
                  rows={4}
                />
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={() => setShowWriteReview(false)}
                  className="flex-1 px-4 py-3 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white font-medium transition-colors"
                >
                  Cancelar
                </button>

                <button
                  onClick={handleSubmitReview}
                  disabled={submitReviewMutation.isPending}
                  className="flex-1 px-4 py-3 bg-primary-500 hover:bg-primary-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                >
                  {submitReviewMutation.isPending ? 'Publicando...' : 'Publicar'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
