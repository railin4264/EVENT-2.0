'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import { MapPin, Calendar, Mail, Globe, Instagram, Twitter, Linkedin, Star, Users, Heart, Share, Eye, ChevronLeft, Award } from 'lucide-react'

// Aliases para iconos no disponibles en lucide-react 0.408.0
import { useAuthStore } from '@/stores/authStore'
import { apiClient } from '@/lib/api/client'
import { FollowButton } from '@/components/social'
import { Badge } from '@/components/redesign/ui/user-badges'
import { UserBadges, AVAILABLE_BADGES, type Badge as BadgeType } from '@/components/ui/UserBadges'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import type { Event } from '@/types/api.types'
import { getImageUrl } from '@/lib/utils'

interface UserProfile {
  _id: string
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
    eventsCreated: number
    eventsAttended: number
    followers: number
    following: number
  }
}

export default function UserProfilePage() {
  const params = useParams();
  const id = params.id as string;
  const [activeTab, setActiveTab] = useState<'events' | 'attended' | 'badges'>('events')
  const router = useRouter()
  const { user: currentUser, isAuthenticated } = useAuthStore()

  const generateUserBadges = (profile: UserProfile): BadgeType[] => {
    if (!profile || !profile.stats) return [];
    const stats = profile.stats;
    const created = stats.eventsCreated || 0;
    const attended = stats.eventsAttended || 0;

    return AVAILABLE_BADGES.map((badge) => {
      let earned = false;
      let progress = 0;

      switch (badge.id) {
        case 'first_event':
          earned = created >= 1;
          progress = Math.min(created, 1);
          break;
        case 'social_butterfly':
          earned = attended >= 5;
          progress = Math.min(attended, 5);
          break;
        case 'event_master':
          earned = created >= 10;
          progress = Math.min(created, 10);
          break;
        case 'early_bird': // Reusing attended for now
          earned = attended >= 10;
          progress = Math.min(attended, 10);
          break;
        case 'network_builder': // Reusing followers for now
          const followers = stats.followers || 0;
          earned = followers >= 50;
          progress = Math.min(followers, 50);
          break;
        default:
          progress = 0;
      }

      return {
        ...badge,
        earned,
        progress: badge.maxProgress ? progress : undefined,
        earnedAt: earned ? new Date() : undefined,
      };
    });
  };

  const BadgesSection = () => {
    return (
      <div className="py-6">
        <UserBadges badges={generateUserBadges(userProfile as UserProfile)} showProgress={true} />
      </div>
    )
  }


  // Fetch user profile
  const { data: userProfile, isLoading: profileLoading } = useQuery<UserProfile>({
    queryKey: ['user-profile', id],
    queryFn: async () => {
      const response = await apiClient.get(`/users/${id}`)
      if (!response.data || !response.data.user) throw new Error('User not found'); return response.data.user
    }
  })

  // Fetch user's created events
  const { data: createdEvents, isLoading: eventsLoading } = useQuery<Event[]>({
    queryKey: ['user-events', id],
    queryFn: async () => {
      const response = await apiClient.get(`/events?createdBy=${id}`)
      return (response.data && response.data.events) || []
    }
  })

  // Fetch user's attended events
  const { data: attendedEvents, isLoading: attendedLoading } = useQuery<Event[]>({
    queryKey: ['user-attended', id],
    queryFn: async () => {
      try {
        const response = await apiClient.get(`/users/${id}/attended-events`)
        return response.data.events
      } catch (error) {
        console.warn('Attended events endpoint not available:', error)
        return []
      }
    }
  })

  if (profileLoading) {
    return (
      <div className="min-h-screen bg-transparent">
        <div className="container-padding py-12">
          <div className="max-w-4xl mx-auto">
            {/* Loading skeleton */}
            <div className="animate-pulse glass bg-white/5 border border-white/10 p-8 rounded-3xl">
              <div className="h-64 bg-white/10 rounded-2xl mb-8"></div>
              <div className="flex items-center gap-6 mb-8">
                <div className="w-32 h-32 bg-white/10 rounded-full"></div>
                <div className="flex-1">
                  <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded-lg mb-2 w-1/3"></div>
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded-lg mb-4 w-1/2"></div>
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded-lg w-full"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!userProfile) {
    return (
      <div className="min-h-screen bg-transparent flex items-center justify-center">
        <div className="text-center glass bg-white/10 backdrop-blur-md border border-white/20 p-12 rounded-3xl">
          <h1 className="text-2xl font-bold text-foreground mb-4">Usuario no encontrado</h1>
          <button
            onClick={() => router.back()}
            className="btn-gradient px-6 py-3 rounded-xl font-semibold"
          >
            Volver
          </button>
        </div>
      </div>
    )
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const isOwnProfile = currentUser?.id === id

  return (
    <div className="min-h-screen bg-transparent pb-16">
      {/* Header */}
      <div className="container-padding pt-6">
        <div className="max-w-4xl mx-auto">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 px-4 py-2 glass bg-white/10 hover:bg-white/20 text-white rounded-full font-bold transition-all backdrop-blur-md border hover:border-white w-fit mb-6"
          >
            <ChevronLeft className="w-5 h-5" />
            Volver
          </button>
        </div>
      </div>

      {/* Cover Image */}
      <div className="relative">
        <div className="h-64 md:h-80 bg-gradient-to-r from-primary-500/30 to-secondary-500/30 relative overflow-hidden rounded-b-[3rem] mx-2 shadow-2xl">
          {userProfile.coverImage && (
            <img
              src={getImageUrl(userProfile.coverImage)}
              alt="Cover"
              className="w-full h-full object-cover"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
        </div>
      </div>

      {/* Profile Content */}
      <div className="container-padding">
        <div className="max-w-4xl mx-auto">
          {/* Profile Header */}
          <div className="relative -mt-16 mb-8">
            <div className="flex flex-col md:flex-row items-start md:items-end gap-6">
              {/* Avatar */}
              <div className="relative">
                <div className="w-32 h-32 bg-primary-500 rounded-full border-4 border-white dark:border-gray-800 flex items-center justify-center text-white text-4xl font-bold shadow-xl">
                  {userProfile.avatar ? (
                    <img
                      src={getImageUrl(userProfile.avatar)}
                      alt={`${userProfile.firstName} ${userProfile.lastName}`}
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    userProfile.firstName[0]
                  )}
                </div>
              </div>

              {/* Profile Info */}
              <div className="flex-1 w-full">
                <div className="glass bg-white/5 border border-white/10 backdrop-blur-xl rounded-3xl p-6 shadow-2xl relative">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <h1 className="text-3xl font-extrabold text-foreground">
                        {userProfile.firstName} {userProfile.lastName}
                      </h1>
                      <p className="text-lg font-medium text-primary mb-2">
                        @{userProfile.username}
                      </p>
                      {userProfile.bio && (
                        <p className="text-muted-foreground mb-4">
                          {userProfile.bio}
                        </p>
                      )}

                      {/* Location */}
                      {userProfile.location && (
                        <div className="flex items-center gap-2 text-muted-foreground mb-4 font-medium">
                          <MapPin className="w-5 h-5 text-primary" />
                          <span>{userProfile.location.address}</span>
                        </div>
                      )}

                      {/* Stats */}
                      <div className="flex gap-4 md:gap-6 text-sm">
                        <div className="text-center bg-black/20 p-3 rounded-2xl flex-1 md:flex-none">
                          <div className="font-extrabold text-xl text-foreground">
                            {userProfile.stats?.eventsCreated || 0}
                          </div>
                          <div className="text-muted-foreground font-medium text-xs uppercase tracking-wider">Eventos</div>
                        </div>
                        <div className="text-center bg-black/20 p-3 rounded-2xl flex-1 md:flex-none">
                          <div className="font-extrabold text-xl text-foreground">
                            {userProfile.stats?.followers || 0}
                          </div>
                          <div className="text-muted-foreground font-medium text-xs uppercase tracking-wider">Seguidores</div>
                        </div>
                        <div className="text-center bg-black/20 p-3 rounded-2xl flex-1 md:flex-none">
                          <div className="font-extrabold text-xl text-foreground">
                            {userProfile.stats?.following || 0}
                          </div>
                          <div className="text-muted-foreground font-medium text-xs uppercase tracking-wider">Siguiendo</div>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-col gap-3">
                      {!isOwnProfile && isAuthenticated && (
                        <FollowButton userId={id} />
                      )}

                      {isOwnProfile && (
                        <Link
                          href="/settings"
                          className="px-6 py-3 glass bg-white/10 text-foreground rounded-xl hover:bg-white/20 transition-all text-center font-bold border border-white/20 shadow-lg"
                        >
                          Editar Perfil
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="mb-8 mt-6">
            <div className="glass bg-white/5 border border-white/10 p-2 rounded-2xl max-w-fit mx-auto md:mx-0">
              <nav className="flex space-x-2">
                <button
                  onClick={() => setActiveTab('events')}
                  className={`py-3 px-6 rounded-xl font-bold text-sm transition-all ${activeTab === 'events'
                    ? 'bg-primary text-primary-foreground shadow-lg'
                    : 'text-muted-foreground hover:bg-white/10'
                    }`}
                >
                  Eventos Creados ({createdEvents?.length || 0})
                </button>
                <button
                  onClick={() => setActiveTab('attended')}
                  className={`py-3 px-6 rounded-xl font-bold text-sm transition-all ${activeTab === 'attended'
                    ? 'bg-primary text-primary-foreground shadow-lg'
                    : 'text-muted-foreground hover:bg-white/10'
                    }`}
                >
                  Asistidos ({attendedEvents?.length || 0})
                </button>
                <button
                  onClick={() => setActiveTab('badges')}
                  className={`py-3 px-6 rounded-xl font-bold text-sm transition-all flex items-center gap-2 ${activeTab === 'badges'
                    ? 'bg-primary text-primary-foreground shadow-lg'
                    : 'text-muted-foreground hover:bg-white/10'
                    }`}
                >
                  <Award className="w-4 h-4" />
                  Logros
                </button>
              </nav>
            </div>
          </div>

          {/* Tab Content */}
          {activeTab === 'badges' ? (
            <BadgesSection />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {activeTab === 'events' ? (
                eventsLoading ? (
                  // Loading skeleton
                  [...Array(6)].map((_, i) => (
                    <div key={i} className="animate-pulse glass bg-white/5 border border-white/10 rounded-3xl p-4">
                      <div className="bg-white/10 h-48 rounded-2xl mb-4"></div>
                      <div className="bg-white/10 h-6 rounded-lg mb-2"></div>
                      <div className="bg-white/10 h-4 rounded-lg w-3/4"></div>
                    </div>
                  ))
                ) : createdEvents?.length === 0 ? (
                  <div className="col-span-full text-center py-12">
                    <p className="text-gray-600 dark:text-gray-400">
                      {isOwnProfile ? 'No has creado eventos aún.' : 'Este usuario no ha creado eventos aún.'}
                    </p>
                  </div>
                ) : (
                  createdEvents?.map((event) => (
                    <motion.div
                      key={event._id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="group glass bg-white/5 border border-white/10 rounded-3xl overflow-hidden hover:shadow-2xl hover:shadow-primary/20 transition-all"
                    >
                      {/* Event Image */}
                      <div className="h-48 bg-black/20 relative overflow-hidden">
                        {event.images && event.images.length > 0 ? (
                          <img
                            src={event.images[0].url}
                            alt={event.title}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                          />
                        ) : (
                          <div className="absolute inset-0 bg-gradient-to-br from-primary/30 to-secondary/30"></div>
                        )}
                        <div className="absolute top-4 left-4">
                          <span className="px-3 py-1 bg-black/50 border border-white/20 backdrop-blur-md rounded-full text-xs font-bold text-white uppercase">
                            {event.category}
                          </span>
                        </div>
                      </div>

                      {/* Event Content */}
                      <div className="p-5">
                        <h3 className="text-xl font-extrabold text-foreground mb-3 group-hover:text-primary transition-colors line-clamp-2">
                          {event.title}
                        </h3>

                        <div className="space-y-3 mb-5">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground font-medium">
                            <Calendar className="w-4 h-4 text-primary" />
                            <span>{formatDate(event.date)}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground font-medium">
                            <MapPin className="w-4 h-4 text-accent" />
                            <span className="line-clamp-1">{event.location?.address}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground font-medium">
                            <Users className="w-4 h-4 text-secondary" />
                            <span>{event.attendees?.length || 0} asistentes</span>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="pt-4 border-t border-white/10">
                          <Link
                            href={`/events/${event._id}`}
                            className="w-full btn-gradient py-3 rounded-xl text-sm font-bold text-center block"
                          >
                            Ver Detalles
                          </Link>
                        </div>
                      </div>
                    </motion.div>
                  ))
                )
              ) : (
                // Attended Events Tab
                attendedLoading ? (
                  [...Array(6)].map((_, i) => (
                    <div key={i} className="animate-pulse glass bg-white/5 border border-white/10 rounded-3xl p-4">
                      <div className="bg-white/10 h-48 rounded-2xl mb-4"></div>
                      <div className="bg-white/10 h-6 rounded-lg mb-2"></div>
                      <div className="bg-white/10 h-4 rounded-lg w-3/4"></div>
                    </div>
                  ))
                ) : attendedEvents?.length === 0 ? (
                  <div className="col-span-full text-center py-12">
                    <p className="text-gray-600 dark:text-gray-400">
                      {isOwnProfile ? 'No has asistido a eventos aún.' : 'Este usuario no ha asistido a eventos aún.'}
                    </p>
                  </div>
                ) : (
                  attendedEvents?.map((event) => (
                    <motion.div
                      key={event._id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="group glass bg-white/5 border border-white/10 rounded-3xl overflow-hidden hover:shadow-2xl hover:shadow-primary/20 transition-all"
                    >
                      {/* Similar event card structure */}
                      <div className="h-48 bg-black/20 relative overflow-hidden">
                        {event.images && event.images.length > 0 ? (
                          <img
                            src={event.images[0].url}
                            alt={event.title}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                          />
                        ) : (
                          <div className="absolute inset-0 bg-gradient-to-br from-primary/30 to-secondary/30"></div>
                        )}
                        <div className="absolute top-4 left-4">
                          <span className="px-3 py-1 bg-black/50 border border-white/20 backdrop-blur-md rounded-full text-xs font-bold text-white uppercase">
                            {event.category}
                          </span>
                        </div>
                      </div>

                      <div className="p-5">
                        <h3 className="text-xl font-extrabold text-foreground mb-3 group-hover:text-primary transition-colors line-clamp-2">
                          {event.title}
                        </h3>

                        <div className="space-y-3 mb-5">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground font-medium">
                            <Calendar className="w-4 h-4 text-primary" />
                            <span>{formatDate(event.date)}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground font-medium">
                            <MapPin className="w-4 h-4 text-accent" />
                            <span className="line-clamp-1">{event.location?.address}</span>
                          </div>
                        </div>

                        <div className="pt-4 border-t border-white/10">
                          <Link
                            href={`/events/${event._id}`}
                            className="w-full btn-gradient py-3 rounded-xl text-sm font-bold text-center block"
                          >
                            Ver Detalles
                          </Link>
                        </div>
                      </div>
                    </motion.div>
                  ))
                )
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}