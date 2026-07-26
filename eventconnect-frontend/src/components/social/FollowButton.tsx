'use client'

import { useState } from 'react'
import { Button } from '@/components/redesign/ui/button'
import { useFollowsStore } from '@/stores/followsStore'
import { useAuthStore } from '@/stores/authStore'
import { User, UserMinus, Clock } from 'lucide-react'

// Alias para icono no disponible en lucide-react 0.408.0
const UserPlus = User
import { cn } from '@/lib/utils'
import { getFollowButtonText, getFollowButtonVariant, FollowStatus } from '@/lib/api/follows'
import { useToast } from '@/components/redesign/ui/use-toast'

interface FollowButtonProps {
  userId: string
  user?: {
    firstName: string
    lastName: string
    username: string
  }
  status?: FollowStatus
  className?: string
  size?: 'sm' | 'md' | 'lg'
  showIcon?: boolean
  onFollowChange?: (isFollowing: boolean) => void
}

export function FollowButton({
  userId,
  user,
  status,
  className,
  size = 'md',
  showIcon = true,
  onFollowChange
}: FollowButtonProps) {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const { user: currentUser } = useAuthStore()

  const {
    followUser,
    unfollowUser,
    getFollowStatus,
    followStatuses,
    isFollowing: globalIsFollowing,
    isUnfollowing: globalIsUnfollowing
  } = useFollowsStore()

  // Don't show follow button for current user
  if (currentUser && currentUser._id === userId) {
    return null
  }

  const followStatus = status || followStatuses[userId]
  const isFollowing = followStatus?.isFollowing || false
  const followsMe = followStatus?.followsMe || false
  const isMutual = followStatus?.isMutual || false

  const buttonText = followStatus ? getFollowButtonText(followStatus) : 'Seguir'
  const buttonVariant = followStatus ? getFollowButtonVariant(followStatus) : 'primary'
  
  const handleClick = async () => {
    if (isLoading || globalIsFollowing || globalIsUnfollowing) return
    
    setIsLoading(true)
    
    try {
      if (isFollowing) {
        await unfollowUser(userId)
        onFollowChange?.(false)
        toast({
          title: 'Dejaste de seguir',
          description: user ? `Ya no sigues a ${user.firstName} ${user.lastName}` : 'Usuario no seguido',
        })
      } else {
        await followUser(userId)
        onFollowChange?.(true)
        toast({
          title: 'Usuario seguido',
          description: user ? `Ahora sigues a ${user.firstName} ${user.lastName}` : 'Usuario seguido con éxito',
        })
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Error al procesar solicitud',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const getIcon = () => {
    if (!showIcon) return null
    
    if (isLoading || globalIsFollowing || globalIsUnfollowing) {
      return <Clock className="h-4 w-4 animate-spin" />
    }
    
    if (isFollowing) {
      return <UserMinus className="h-4 w-4" />
    }
    
    if (followsMe && !isFollowing) {
      return <User className="h-4 w-4" />
    }
    
    return <UserPlus className="h-4 w-4" />
  }

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'h-8 px-3 text-sm'
      case 'lg':
        return 'h-12 px-6 text-base'
      default:
        return 'h-10 px-4 text-sm'
    }
  }

  if (!followStatus) {
    return (
      <Button
        onClick={() => getFollowStatus(userId)}
        variant="outline"
        className={cn(getSizeClasses(), className)}
        disabled={isLoading}
      >
        {showIcon && <Clock className="h-4 w-4 animate-spin mr-2" />}
        Cargar
      </Button>
    )
  }

  return (
    <Button
      onClick={handleClick}
      variant={buttonVariant as "default" | "secondary" | "outline" | "destructive" | "ghost" | "link"}
      className={cn(
        getSizeClasses(),
        isFollowing && 'hover:bg-destructive hover:text-destructive-foreground hover:border-destructive',
        className
      )}
      disabled={isLoading || globalIsFollowing || globalIsUnfollowing}
    >
      {showIcon && (
        <span className="mr-2">
          {getIcon()}
        </span>
      )}
      <span className={cn(
        isFollowing && 'group-hover:hidden'
      )}>
        {buttonText}
      </span>
      {isFollowing && (
        <span className="hidden group-hover:inline">
          Dejar de seguir
        </span>
      )}
    </Button>
  )
}