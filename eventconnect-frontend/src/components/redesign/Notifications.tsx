import { useState, useEffect } from 'react'
import { Bell, X, Check, Calendar, Users, MessageCircle, Heart, Star, MapPin, Clock, Filter, MoreVertical, Trophy, Gift } from 'lucide-react'
import { Card } from './ui/card'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs'
import { ScrollArea } from './ui/scroll-area'
import { Avatar } from './ui/avatar'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from './ui/dropdown-menu'
import { notificationsService } from '@/lib/api/services'
import type { Notification } from '@/types/models'
import toast from 'react-hot-toast'

interface NotificationsProps {
  isOpen: boolean
  onClose: () => void
}

export function Notifications({ isOpen, onClose }: NotificationsProps) {
  const [filter, setFilter] = useState('all')
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadNotifications()
  }, [])

  const loadNotifications = async () => {
    setIsLoading(true)
    try {
      const data = await notificationsService.getNotifications()
      setNotifications(data)
    } catch (error) {
      console.error('Error loading notifications:', error)
      toast.error('Error al cargar notificaciones')
    } finally {
      setIsLoading(false)
    }
  }

  const unreadCount = notifications.filter(n => !n.read).length

  const markAsRead = async (id: string) => {
    try {
      await notificationsService.markAsRead(id)
      setNotifications(prev => prev.map(n => n._id === id ? {...n, read: true} : n))
    } catch (error) {
      console.error('Error marking notification as read:', error)
    }
  }

  const markAllAsRead = async () => {
    try {
      await notificationsService.markAllAsRead()
      setNotifications(prev => prev.map(n => ({...n, read: true})))
    } catch (error) {
      console.error('Error marking all as read:', error)
    }
  }

  const deleteNotification = async (id: string) => {
    try {
      await notificationsService.deleteNotification(id)
      setNotifications(prev => prev.filter(n => n._id !== id))
    } catch (error) {
      console.error('Error deleting notification:', error)
    }
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'event_invite':
      case 'event_reminder':
      case 'event_update':
        return <Calendar className="w-5 h-5" />
      case 'new_follower':
        return <Users className="w-5 h-5" />
      case 'tribe_invite':
        return <Users className="w-5 h-5" />
      case 'achievement':
        return <Trophy className="w-5 h-5" />
      case 'like':
        return <Heart className="w-5 h-5" />
      case 'comment':
        return <MessageCircle className="w-5 h-5" />
      default:
        return <Bell className="w-5 h-5" />
    }
  }

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'event_invite':
      case 'event_reminder':
      case 'event_update':
        return 'text-blue-400 bg-blue-500/20'
      case 'new_follower':
      case 'tribe_invite':
        return 'text-green-400 bg-green-500/20'
      case 'achievement':
        return 'text-yellow-400 bg-yellow-500/20'
      case 'like':
        return 'text-pink-400 bg-pink-500/20'
      case 'comment':
        return 'text-violet-400 bg-violet-500/20'
      default:
        return 'text-white/60 bg-white/10'
    }
  }

  const filteredNotifications = notifications.filter(notification => {
    if (filter === 'all') return true
    if (filter === 'unread') return !notification.read
    return notification.type === filter
  })

  if (!isOpen) return null

  return (
    <>
      {/* Overlay */}
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
        onClick={onClose}
      />
      
      {/* Notification Panel */}
      <div className="fixed right-0 top-0 h-full w-96 glass-card border-l border-white/10 z-50 transform transition-transform">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-6 border-b border-white/10">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <Bell className="w-6 h-6 text-violet-400" />
                <h2 className="text-xl font-bold text-white">Notificaciones</h2>
                {unreadCount > 0 && (
                  <Badge className="bg-red-500 text-white px-2 py-1">
                    {unreadCount}
                  </Badge>
                )}
              </div>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={onClose}
                className="text-white/60 hover:text-white hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between">
              <Button
                variant="ghost"
                size="sm"
                onClick={markAllAsRead}
                disabled={unreadCount === 0}
                className="text-violet-400 hover:text-violet-300 hover:bg-violet-500/10"
              >
                <Check className="w-4 h-4 mr-2" />
                Marcar todo como leído
              </Button>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="text-white/60 hover:text-white">
                    <Filter className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="glass-card border-white/20">
                  <DropdownMenuItem onClick={() => setFilter('all')}>
                    Todas
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setFilter('unread')}>
                    No leídas
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setFilter('event_invite')}>
                    Invitaciones
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setFilter('achievement')}>
                    Logros
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setFilter('new_follower')}>
                    Seguidores
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Notifications List */}
          <ScrollArea className="flex-1">
            <div className="p-4 space-y-3">
              {filteredNotifications.length === 0 ? (
                <div className="text-center py-8">
                  <Bell className="w-12 h-12 text-white/30 mx-auto mb-4" />
                  <p className="text-white/60">No hay notificaciones</p>
                </div>
              ) : (
                filteredNotifications.map((notification) => (
                  <Card
                    key={notification._id}
                    className={`p-4 transition-all cursor-pointer hover:bg-white/5 ${
                      !notification.read ? 'bg-violet-500/5 border-violet-500/20' : 'glass-card'
                    }`}
                    onClick={() => !notification.read && markAsRead(notification._id)}
                  >
                    <div className="flex space-x-3">
                      {/* Icon */}
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${getNotificationColor(notification.type)}`}>
                        {getNotificationIcon(notification.type)}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <h4 className="text-white font-medium text-sm">{notification.title}</h4>
                          <div className="flex items-center space-x-1">
                            {!notification.read && (
                              <div className="w-2 h-2 rounded-full bg-violet-400"></div>
                            )}
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="w-6 h-6 p-0 text-white/60 hover:text-white">
                                  <MoreVertical className="w-3 h-3" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent className="glass-card border-white/20">
                                {!notification.read && (
                                  <DropdownMenuItem onClick={() => markAsRead(notification._id)}>
                                    Marcar como leído
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem
                                  onClick={() => deleteNotification(notification._id)}
                                  className="text-red-400"
                                >
                                  Eliminar
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>

                        <p className="text-white/70 text-sm mb-2">{notification.message}</p>

                        {/* Additional Content */}
                        {notification.data?.comment && (
                          <div className="bg-white/5 rounded-lg p-3 mb-2">
                            <p className="text-white/80 text-sm italic">"{notification.data.comment}"</p>
                          </div>
                        )}

                        {notification.data?.achievement && (
                          <div className="flex items-center space-x-2 mb-2">
                            <Badge className="bg-yellow-500/20 text-yellow-400">
                              {notification.data.achievement}
                            </Badge>
                            {notification.data?.xp && (
                              <Badge className="bg-green-500/20 text-green-400">
                                +{notification.data.xp} XP
                              </Badge>
                            )}
                          </div>
                        )}

                        {notification.data?.location && (
                          <div className="flex items-center space-x-1 text-white/60 text-xs mb-2">
                            <MapPin className="w-3 h-3" />
                            <span>{notification.data.location}</span>
                          </div>
                        )}

                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-1 text-white/50 text-xs">
                            <Clock className="w-3 h-3" />
                            <span>{notificationsService.formatTimeAgo(new Date(notification.createdAt))}</span>
                          </div>

                          {notification.data?.actionRequired && (
                            <div className="flex space-x-2">
                              {notification.type === 'event_invite' && (
                                <>
                                  <Button size="sm" variant="outline" className="h-7 px-3 text-xs border-white/20 text-white hover:bg-white/10">
                                    Declinar
                                  </Button>
                                  <Button size="sm" className="h-7 px-3 text-xs bg-gradient-to-r from-violet-600 to-cyan-600">
                                    Aceptar
                                  </Button>
                                </>
                              )}
                              {notification.type === 'tribe_invite' && (
                                <>
                                  <Button size="sm" variant="outline" className="h-7 px-3 text-xs border-white/20 text-white hover:bg-white/10">
                                    Ignorar
                                  </Button>
                                  <Button size="sm" className="h-7 px-3 text-xs bg-gradient-to-r from-violet-600 to-cyan-600">
                                    Unirse
                                  </Button>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </div>
          </ScrollArea>
        </div>
      </div>
    </>
  )
}

export function NotificationBell({ onClick }: { onClick: () => void }) {
  const [unreadCount] = useState(4) // Este valor vendría del estado global
  
  return (
    <button
      onClick={onClick}
      className="relative p-2 rounded-lg glass-card hover:bg-white/10 transition-colors"
    >
      <Bell className="w-5 h-5 text-white" />
      {unreadCount > 0 && (
        <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 flex items-center justify-center">
          <span className="text-white text-xs font-bold">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        </div>
      )}
    </button>
  )
}