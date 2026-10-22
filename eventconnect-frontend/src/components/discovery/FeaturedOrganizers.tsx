'use client'

import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { ShieldCheck, Calendar, Users, ArrowRight, Sparkles } from 'lucide-react'
import { apiClient } from '@/lib/api/client'
import { FollowButton } from '@/components/social/FollowButton'
import { getImageUrl } from '@/lib/utils'

interface FeaturedOrganizer {
  _id: string
  firstName: string
  lastName: string
  username: string
  avatar?: string
  bio?: string
  organizationName?: string
  isOrganizerVerified?: boolean
  verified?: boolean
  activeEventsCount?: number
  followersCount?: number
  interests?: string[]
}

export function FeaturedOrganizers() {
  const { data: organizers = [], isLoading } = useQuery<FeaturedOrganizer[]>({
    queryKey: ['featured-organizers'],
    queryFn: async () => {
      const res = await apiClient.get('/users/featured-organizers')
      return res.data?.data || []
    },
    staleTime: 5 * 60 * 1000,
    retry: false
  })

  if (!isLoading && organizers.length === 0) return null

  return (
    <section
      aria-label="Organizadores destacados de la comunidad"
      className="mx-auto max-w-[1440px] px-5 pb-10 sm:px-8"
    >
      <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-bold mb-1">
            <Sparkles className="w-3.5 h-3.5" />
            Comunidad y Creadores
          </div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            Organizadores y Anfitriones Destacados
          </h2>
          <p className="mt-0.5 text-xs sm:text-sm text-muted-foreground">
            Colectivos artísticos, músicos y anfitriones verificados que están impulsando nuevos planes en RD
          </p>
        </div>
      </div>

      <div className="-mx-1 flex snap-x gap-4 overflow-x-auto px-1 pb-3">
        {isLoading ? (
          [...Array(4)].map((_, i) => (
            <div
              key={i}
              className="w-[280px] shrink-0 rounded-3xl border border-border bg-card p-5 animate-pulse space-y-4"
            >
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-full bg-muted" />
                <div className="space-y-2 flex-1">
                  <div className="h-4 w-3/4 bg-muted rounded" />
                  <div className="h-3 w-1/2 bg-muted rounded" />
                </div>
              </div>
              <div className="h-8 bg-muted rounded-xl" />
            </div>
          ))
        ) : (
          organizers.map((org) => {
            const displayName = org.organizationName || `${org.firstName} ${org.lastName}`.trim() || org.username
            const isVerified = org.isOrganizerVerified || org.verified

            return (
              <div
                key={org._id}
                className="group relative flex w-[280px] sm:w-[300px] shrink-0 snap-start flex-col justify-between rounded-3xl border border-border bg-card p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:border-primary/40"
              >
                <div>
                  {/* Top: Avatar & Verification */}
                  <div className="flex items-start gap-3.5 mb-3.5">
                    <Link href={`/users/${org._id}`} className="relative shrink-0">
                      <div className="w-14 h-14 rounded-2xl overflow-hidden bg-primary/10 border-2 border-primary/20 flex items-center justify-center font-bold text-lg text-primary shadow-sm group-hover:border-primary transition-all">
                        {org.avatar ? (
                          <img
                            src={getImageUrl(org.avatar)}
                            alt={displayName}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          org.firstName?.[0] || org.username?.[0] || 'O'
                        )}
                      </div>
                      {isVerified && (
                        <span
                          className="absolute -bottom-1 -right-1 grid h-5 w-5 place-items-center rounded-full bg-emerald-600 text-white shadow-md border-2 border-card"
                          title="Organizador Verificado por EventNow"
                        >
                          <ShieldCheck className="h-3.5 w-3.5" />
                        </span>
                      )}
                    </Link>

                    <div className="min-w-0 flex-1">
                      <Link href={`/users/${org._id}`}>
                        <h3 className="font-bold text-sm leading-snug text-foreground hover:text-primary transition-colors line-clamp-1">
                          {displayName}
                        </h3>
                      </Link>
                      <p className="text-xs text-primary font-medium truncate mt-0.5">
                        @{org.username}
                      </p>
                      {isVerified && (
                        <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          <ShieldCheck className="w-3 h-3" />
                          Verificado
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Bio */}
                  {org.bio && (
                    <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed mb-4">
                      {org.bio}
                    </p>
                  )}
                </div>

                {/* Footer Metrics & Follow */}
                <div className="pt-3 border-t border-border flex items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-3 text-muted-foreground">
                    <span className="flex items-center gap-1 font-medium" title="Eventos activos">
                      <Calendar className="w-3.5 h-3.5 text-primary" />
                      {org.activeEventsCount || 0}
                    </span>
                    <span className="flex items-center gap-1 font-medium" title="Seguidores">
                      <Users className="w-3.5 h-3.5 text-primary" />
                      {org.followersCount || 0}
                    </span>
                  </div>

                  <FollowButton
                    userId={org._id}
                    user={{
                      firstName: org.firstName,
                      lastName: org.lastName,
                      username: org.username
                    }}
                    size="sm"
                  />
                </div>
              </div>
            )
          })
        )}
      </div>
    </section>
  )
}
