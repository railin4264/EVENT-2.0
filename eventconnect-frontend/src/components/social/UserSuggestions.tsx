'use client'

import { useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/redesign/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/redesign/ui/avatar'
import { Button } from '@/components/redesign/ui/button'
import { Badge } from '@/components/redesign/ui/badge'
import { useFollowsStore } from '@/stores/followsStore'
import { FollowButton } from './FollowButton'
import { Users, Star, Sparkles } from 'lucide-react'

// Alias para icono no disponible en lucide-react 0.408.0
import { cn } from '@/lib/utils'
import { getUserDisplayName, getUserHandleName, getMutualFollowsText } from '@/lib/api/follows'

interface UserSuggestionsProps {
  limit?: number
  className?: string
  showMutualFriends?: boolean
}

export function UserSuggestions({ 
  limit = 5, 
  className,
  showMutualFriends = true 
}: UserSuggestionsProps) {
  const {
    suggestedUsers,
    fetchSuggestedUsers,
    isLoading,
    error
  } = useFollowsStore()

  useEffect(() => {
    if (suggestedUsers.length === 0) {
      fetchSuggestedUsers(limit)
    }
  }, [fetchSuggestedUsers, limit, suggestedUsers.length])

  if (error) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">
            <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Error al cargar sugerencias</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            Sugerencias para ti
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-muted animate-pulse" />
                <div className="flex-1 space-y-1">
                  <div className="h-4 bg-muted rounded animate-pulse" />
                  <div className="h-3 bg-muted rounded w-2/3 animate-pulse" />
                </div>
                <div className="h-8 w-20 bg-muted rounded animate-pulse" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (suggestedUsers.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            Sugerencias para ti
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground py-6">
            <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No hay sugerencias disponibles</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Sparkles className="h-5 w-5" />
          Sugerencias para ti
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {suggestedUsers.slice(0, limit).map((user) => (
            <div key={user._id} className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarImage src={user.avatar} alt={getUserDisplayName(user)} />
                <AvatarFallback>
                  {user.firstName.charAt(0)}{user.lastName.charAt(0)}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1">
                  <p className="text-sm font-medium truncate">
                    {getUserDisplayName(user)}
                  </p>
                  {user.verified && (
                    <Badge variant="secondary" className="text-xs px-1">
                      ✓
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground truncate">
                  {getUserHandleName(user)}
                </p>
                
                {showMutualFriends && user.mutualCount > 0 && (
                  <p className="text-xs text-blue-600 mt-1">
                    {getMutualFollowsText(user.mutualCount, user.mutualFriendsDetails)}
                  </p>
                )}
                
                {user.bio && (
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                    {user.bio}
                  </p>
                )}
              </div>
              
              <FollowButton
                userId={user._id}
                user={{
                  firstName: user.firstName,
                  lastName: user.lastName,
                  username: user.username
                }}
                size="sm"
                showIcon={false}
              />
            </div>
          ))}
        </div>
        
        {suggestedUsers.length > limit && (
          <Button 
            variant="ghost" 
            className="w-full mt-4"
            onClick={() => fetchSuggestedUsers(limit + 5)}
          >
            Ver más sugerencias
          </Button>
        )}
      </CardContent>
    </Card>
  )
}