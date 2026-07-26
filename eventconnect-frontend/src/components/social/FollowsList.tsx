'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/redesign/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/redesign/ui/avatar'
import { Button } from '@/components/redesign/ui/button'
import { Badge } from '@/components/redesign/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/redesign/ui/tabs'
import { Input } from '@/components/redesign/ui/input'
import { useFollowsStore } from '@/stores/followsStore'
import { FollowButton } from './FollowButton'
import { Users, User, Search, Loader2 } from 'lucide-react'

// Alias para icono no disponible en lucide-react 0.408.0
const UserCheck = User
import { cn } from '@/lib/utils'
import { getUserDisplayName, getUserHandleName, filterUsersByQuery, type Follower, type Following } from '@/lib/api/follows'

interface FollowsListProps {
  userId: string
  userName?: string
  defaultTab?: 'followers' | 'following'
  className?: string
}

export function FollowsList({ 
  userId, 
  userName,
  defaultTab = 'followers',
  className 
}: FollowsListProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState(defaultTab)
  
  const {
    followers,
    following,
    followStats,
    fetchFollowers,
    fetchFollowing,
    getFollowStats,
    isLoading,
    error
  } = useFollowsStore()

  const userFollowers = followers[userId] || []
  const userFollowing = following[userId] || []
  const userStats = followStats[userId]

  useEffect(() => {
    if (!userStats) {
      getFollowStats(userId)
    }
  }, [getFollowStats, userId, userStats])

  useEffect(() => {
    if (activeTab === 'followers' && userFollowers.length === 0) {
      fetchFollowers(userId, 1)
    } else if (activeTab === 'following' && userFollowing.length === 0) {
      fetchFollowing(userId, 1)
    }
  }, [activeTab, fetchFollowers, fetchFollowing, userId, userFollowers.length, userFollowing.length])

  const filteredFollowers = filterUsersByQuery(
    userFollowers.map(f => f.user), 
    searchQuery
  ).map(user => userFollowers.find(f => f.user._id === user._id)!)

  const filteredFollowing = filterUsersByQuery(
    userFollowing.map(f => f.user), 
    searchQuery
  ).map(user => userFollowing.find(f => f.user._id === user._id)!)

  const loadMore = (type: 'followers' | 'following') => {
    const currentPage = Math.ceil(
      (type === 'followers' ? userFollowers.length : userFollowing.length) / 20
    ) + 1
    
    if (type === 'followers') {
      fetchFollowers(userId, currentPage)
    } else {
      fetchFollowing(userId, currentPage)
    }
  }

  const renderUserList = (users: (Follower | Following)[], type: 'followers' | 'following') => {
    const filteredUsers = type === 'followers' ? filteredFollowers : filteredFollowing
    
    if (filteredUsers.length === 0) {
      if (searchQuery) {
        return (
          <div className="text-center py-8 text-muted-foreground">
            <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No se encontraron usuarios con "{searchQuery}"</p>
          </div>
        )
      }
      
      return (
        <div className="text-center py-8 text-muted-foreground">
          <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">
            {type === 'followers' 
              ? `${userName || 'Este usuario'} no tiene seguidores aún`
              : `${userName || 'Este usuario'} no sigue a nadie aún`
            }
          </p>
        </div>
      )
    }

    return (
      <div className="space-y-4">
        {filteredUsers.map((item) => (
          <div key={item._id} className="flex items-center gap-3">
            <Avatar className="h-12 w-12">
              <AvatarImage src={item.user.avatar} alt={getUserDisplayName(item.user)} />
              <AvatarFallback>
                {item.user.firstName.charAt(0)}{item.user.lastName.charAt(0)}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-medium truncate">
                  {getUserDisplayName(item.user)}
                </p>
                {item.user.verified && (
                  <Badge variant="secondary" className="text-xs px-1">
                    ✓
                  </Badge>
                )}
                {type === 'followers' && 'isFollowingBack' in item && item.isFollowingBack && (
                  <Badge variant="outline" className="text-xs">
                    <UserCheck className="h-3 w-3 mr-1" />
                    Mutuo
                  </Badge>
                )}
                {type === 'following' && 'isAlsoFollowing' in item && item.isAlsoFollowing && (
                  <Badge variant="outline" className="text-xs">
                    <UserCheck className="h-3 w-3 mr-1" />
                    Te sigue
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground truncate">
                {getUserHandleName(item.user)}
              </p>
              {item.user.bio && (
                <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                  {item.user.bio}
                </p>
              )}
            </div>
            
            <FollowButton
              userId={item.user._id}
              user={item.user}
              size="sm"
              showIcon={false}
            />
          </div>
        ))}
        
        {!searchQuery && (
          <Button
            variant="ghost"
            className="w-full"
            onClick={() => loadMore(type)}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Cargando...
              </>
            ) : (
              'Cargar más'
            )}
          </Button>
        )}
      </div>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Conexiones{userName && ` de ${userName}`}
        </CardTitle>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar usuarios..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'followers' | 'following')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="followers" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Seguidores
              {userStats && (
                <Badge variant="secondary" className="text-xs">
                  {userStats.followersCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="following" className="flex items-center gap-2">
              <UserCheck className="h-4 w-4" />
              Siguiendo
              {userStats && (
                <Badge variant="secondary" className="text-xs">
                  {userStats.followingCount}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="followers" className="mt-4">
            {renderUserList(userFollowers, 'followers')}
          </TabsContent>
          
          <TabsContent value="following" className="mt-4">
            {renderUserList(userFollowing, 'following')}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}