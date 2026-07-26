'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { Bell, X, Check, Settings, Loader2, Eye, Trash2 } from 'lucide-react'
import { useNotificationsStore, useUnreadCount } from '@/stores/notificationsStore'
import { formatNotificationTime, getNotificationIcon, getNotificationColor, getPriorityColor } from '@/lib/api/notifications'
import { Badge } from '@/components/redesign/ui/badge'
import { Button } from '@/components/redesign/ui/button'
import { useSocket } from '@/lib/providers/SocketProvider'
import { useToast } from '@/components/redesign/ui/use-toast'

export default function NotificationCenter() {
  const [isOpen, setIsOpen] = useState(false)
  const buttonRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const { toast } = useToast()
  const { isConnected } = useSocket()
  
  const {
    notifications,
    unreadCount,
    isLoading,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    createTestNotifications,
    clearError
  } = useNotificationsStore()

  const displayUnreadCount = useUnreadCount()

  // Load notifications when dropdown opens
  useEffect(() => {
    if (isOpen && notifications.length === 0) {
      fetchNotifications(1, true)
    }
  }, [isOpen, fetchNotifications, notifications.length])

  const handleNotificationClick = async (notification: any) => {
    // Mark as read if not already read
    if (!notification.read) {
      try {
        await markAsRead(notification._id)
      } catch (error) {
        console.error('Error marking notification as read:', error)
      }
    }

    // Navigate to action URL if available
    if (notification.actionUrl) {
      setIsOpen(false)
      router.push(notification.actionUrl)
    }
  }

  const handleMarkAllAsRead = async () => {
    try {
      await markAllAsRead()
      toast({
        title: 'Notificaciones marcadas',
        description: 'Todas las notificaciones han sido marcadas como leídas',
      })
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudieron marcar las notificaciones como leídas',
        variant: 'destructive'
      })
    }
  }

  const handleDeleteNotification = async (e: React.MouseEvent, notificationId: string) => {
    e.stopPropagation()
    
    try {
      await deleteNotification(notificationId)
      toast({
        title: 'Notificación eliminada',
        description: 'La notificación ha sido eliminada',
      })
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo eliminar la notificación',
        variant: 'destructive'
      })
    }
  }

  const handleCreateTestNotifications = async () => {
    try {
      await createTestNotifications()
      toast({
        title: 'Notificaciones de prueba creadas',
        description: 'Se han creado algunas notificaciones de prueba',
      })
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudieron crear las notificaciones de prueba',
        variant: 'destructive'
      })
    }
  }

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (buttonRef.current && !buttonRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  return (
    <div className="relative" ref={buttonRef}>
      {/* Notification Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
      >
        <Bell className="w-6 h-6 text-gray-700 dark:text-gray-300" />
        
        {/* Connection Status Indicator */}
        <div className={`absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-white dark:border-gray-900 ${
          isConnected ? 'bg-green-500' : 'bg-gray-400'
        }`} />
        
        {/* Notification Count Badge */}
        {displayUnreadCount > 0 && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-semibold"
          >
            {displayUnreadCount > 99 ? '99+' : displayUnreadCount}
          </motion.div>
        )}
      </button>

      {/* Notifications Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            className="absolute right-0 mt-2 w-96 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 z-[9999] max-h-96 flex flex-col"
            style={{ position: 'fixed', top: '60px', right: '20px' }}
          >
            {/* Header */}
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">Notificaciones</h3>
                  <div className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-gray-400'}`} />
                    {displayUnreadCount > 0 && `${displayUnreadCount} sin leer`}
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  {process.env.NODE_ENV === 'development' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleCreateTestNotifications}
                      disabled={isLoading}
                    >
                      Test
                    </Button>
                  )}
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setIsOpen(false)
                      router.push('/notifications')
                    }}
                  >
                    <Settings className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {notifications.length > 0 && displayUnreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleMarkAllAsRead}
                  disabled={isLoading}
                  className="w-full justify-start"
                >
                  <Eye className="h-4 w-4 mr-2" />
                  Marcar todas como leídas
                </Button>
              )}
            </div>

            {/* Notifications List */}
            <div className="flex-1 overflow-y-auto">
              {isLoading && notifications.length === 0 ? (
                <div className="p-8 text-center">
                  <Loader2 className="w-8 h-8 mx-auto mb-3 animate-spin text-gray-400" />
                  <p className="text-gray-500 dark:text-gray-400">Cargando notificaciones...</p>
                </div>
              ) : notifications.length === 0 ? (
                <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                  <Bell className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No tienes notificaciones</p>
                  <p className="text-sm mt-1">Te notificaremos cuando algo suceda</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-200 dark:divide-gray-700">
                  {notifications.slice(0, 5).map((notification) => (
                    <motion.div
                      key={notification._id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      onClick={() => handleNotificationClick(notification)}
                      className={`p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors group cursor-pointer border-l-4 ${getPriorityColor(notification.priority)} ${
                        !notification.read ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`flex-shrink-0 mt-1 p-2 rounded-full ${getNotificationColor(notification.type)}`}>
                          <span className="text-sm">{getNotificationIcon(notification.type)}</span>
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between mb-1">
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className={`text-sm font-medium ${
                                  !notification.read ? 'text-gray-900 dark:text-white font-semibold' : 'text-gray-700 dark:text-gray-300'
                                }`}>
                                  {notification.title}
                                </h4>
                                {!notification.read && (
                                  <div className="w-2 h-2 bg-blue-500 rounded-full" />
                                )}
                              </div>
                              {notification.sender && (
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                  de {notification.sender.firstName} {notification.sender.lastName}
                                </p>
                              )}
                            </div>
                            
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-gray-500 dark:text-gray-400">
                                {formatNotificationTime(notification.createdAt)}
                              </span>
                              <button
                                onClick={(e) => handleDeleteNotification(e, notification._id)}
                                className="opacity-0 group-hover:opacity-100 p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 transition-all"
                              >
                                <Trash2 className="w-3 h-3 text-gray-400" />
                              </button>
                            </div>
                          </div>
                          
                          <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                            {notification.message}
                          </p>

                          {notification.priority === 'high' && (
                            <Badge variant="destructive" className="mt-2 text-xs">
                              Alta prioridad
                            </Badge>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            {notifications.length > 0 && (
              <div className="p-3 border-t border-gray-200 dark:border-gray-700 text-center">
                <button 
                  onClick={() => {
                    setIsOpen(false)
                    router.push('/notifications')
                  }}
                  className="text-sm text-primary-600 dark:text-primary-400 hover:underline"
                >
                  Ver todas las notificaciones
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}