'use client'

import { useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/redesign/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/redesign/ui/avatar'
import { Button } from '@/components/redesign/ui/button'
import { Badge } from '@/components/redesign/ui/badge'
import { useFollowsStore } from '@/stores/followsStore'
import { Check, X, Clock, User, Loader2 } from 'lucide-react'

// Alias para icono no disponible en lucide-react 0.408.0
const UserPlus = User
import { cn } from '@/lib/utils'
import { getUserDisplayName, getUserHandleName } from '@/lib/api/follows'
import { useToast } from '@/components/redesign/ui/use-toast'
import { useState } from 'react'

interface FollowRequestsProps {
  className?: string
  limit?: number
}

export function FollowRequests({ className, limit = 10 }: FollowRequestsProps) {
  const { toast } = useToast()
  const [processingRequests, setProcessingRequests] = useState<Set<string>>(new Set())
  
  const {
    followRequests,
    fetchFollowRequests,
    acceptFollowRequest,
    rejectFollowRequest,
    isLoading,
    error
  } = useFollowsStore()

  useEffect(() => {
    if (followRequests.length === 0) {
      fetchFollowRequests(1)
    }
  }, [fetchFollowRequests, followRequests.length])

  const handleAcceptRequest = async (requestId: string, userName: string) => {
    if (processingRequests.has(requestId)) return
    
    setProcessingRequests(prev => {
      const newSet = new Set(prev)
      newSet.add(requestId)
      return newSet
    })
    
    try {
      await acceptFollowRequest(requestId)
      toast({
        title: 'Solicitud aceptada',
        description: `Ahora ${userName} te sigue`,
      })
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Error al aceptar solicitud',
        variant: 'destructive'
      })
    } finally {
      setProcessingRequests(prev => {
        const newSet = new Set(prev)
        newSet.delete(requestId)
        return newSet
      })
    }
  }

  const handleRejectRequest = async (requestId: string, userName: string) => {
    if (processingRequests.has(requestId)) return
    
    setProcessingRequests(prev => {
      const newSet = new Set(prev)
      newSet.add(requestId)
      return newSet
    })
    
    try {
      await rejectFollowRequest(requestId)
      toast({
        title: 'Solicitud rechazada',
        description: `Rechazaste la solicitud de ${userName}`,
      })
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Error al rechazar solicitud',
        variant: 'destructive'
      })
    } finally {
      setProcessingRequests(prev => {
        const newSet = new Set(prev)
        newSet.delete(requestId)
        return newSet
      })
    }
  }

  const loadMore = () => {
    const currentPage = Math.ceil(followRequests.length / 20) + 1
    fetchFollowRequests(currentPage)
  }

  if (error) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">
            <UserPlus className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Error al cargar solicitudes</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (isLoading && followRequests.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Solicitudes de seguimiento
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-muted animate-pulse" />
                <div className="flex-1 space-y-1">
                  <div className="h-4 bg-muted rounded animate-pulse" />
                  <div className="h-3 bg-muted rounded w-2/3 animate-pulse" />
                </div>
                <div className="flex gap-2">
                  <div className="h-8 w-20 bg-muted rounded animate-pulse" />
                  <div className="h-8 w-20 bg-muted rounded animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (followRequests.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Solicitudes de seguimiento
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground py-6">
            <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No tienes solicitudes pendientes</p>
            <p className="text-xs mt-1">Cuando alguien solicite seguirte aparecerán aquí</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <UserPlus className="h-5 w-5" />
          Solicitudes de seguimiento
          <Badge variant="secondary" className="text-xs">
            {followRequests.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {followRequests.slice(0, limit).map((request) => {
            const isProcessing = processingRequests.has(request._id)
            const userName = getUserDisplayName(request.user)
            
            return (
              <div key={request._id} className="flex items-center gap-3">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={request.user.avatar} alt={userName} />
                  <AvatarFallback>
                    {request.user.firstName.charAt(0)}{request.user.lastName.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium truncate">
                      {userName}
                    </p>
                    {request.user.verified && (
                      <Badge variant="secondary" className="text-xs px-1">
                        ✓
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground truncate">
                    {getUserHandleName(request.user)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Solicitado {new Date(request.requestedAt).toLocaleDateString()}
                  </p>
                  {request.user.bio && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                      {request.user.bio}
                    </p>
                  )}
                </div>
                
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => handleAcceptRequest(request._id, userName)}
                    disabled={isProcessing}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {isProcessing ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Check className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleRejectRequest(request._id, userName)}
                    disabled={isProcessing}
                    className="hover:bg-destructive hover:text-destructive-foreground hover:border-destructive"
                  >
                    {isProcessing ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <X className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
        
        {followRequests.length > limit && (
          <Button 
            variant="ghost" 
            className="w-full mt-4"
            onClick={loadMore}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Cargando más...
              </>
            ) : (
              'Ver más solicitudes'
            )}
          </Button>
        )}
      </CardContent>
    </Card>
  )
}