'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { Bell, Eye, Trash2, Filter, CheckCircle, Star, Loader2, RefreshCw, Check, CheckCheck, Circle } from 'lucide-react'

// Alias para icono no disponible en lucide-react 0.408.0
import { useNotificationsStore, useUnreadCount } from '@/stores/notificationsStore'
import { 
  formatNotificationTime, 
  getNotificationIcon, 
  getNotificationColor, 
  getPriorityColor,
  groupNotificationsByDate,
  NotificationData
} from '@/lib/api/notifications'
import { useAuthStore } from '@/stores/authStore'
import { Badge } from '@/components/redesign/ui/badge'
import { Button } from '@/components/redesign/ui/button'
import { Input } from '@/components/redesign/ui/input'
import { useToast } from '@/components/redesign/ui/use-toast'
import { Checkbox } from '@/components/redesign/ui/checkbox'

export default function NotificationsPage() {
  const { user } = useAuthStore()
  const { toast } = useToast()
  const router = useRouter()
  const [filter, setFilter] = useState<string>('all')
  const [selectedNotifications, setSelectedNotifications] = useState<string[]>([])

  const {
    notifications,
    unreadCount,
    isLoading,
    error,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    markBatchAsRead,
    deleteNotification,
    deleteBatchNotifications,
    setSelectedTypes,
    setShowUnreadOnly,
    clearError
  } = useNotificationsStore()

  // Load notifications on mount
  useEffect(() => {
    if (user && notifications.length === 0) {
      fetchNotifications(1, true)
    }
  }, [user, fetchNotifications, notifications.length])

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await markAsRead(notificationId)
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo marcar la notificación como leída',
        variant: 'destructive'
      })
    }
  }

  const handleDelete = async (notificationId: string) => {
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

  const handleBatchMarkAsRead = async () => {
    if (selectedNotifications.length === 0) return
    
    try {
      await markBatchAsRead(selectedNotifications)
      setSelectedNotifications([])
      toast({
        title: 'Notificaciones marcadas',
        description: `${selectedNotifications.length} notificaciones marcadas como leídas`,
      })
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudieron marcar las notificaciones seleccionadas',
        variant: 'destructive'
      })
    }
  }

  const handleBatchDelete = async () => {
    if (selectedNotifications.length === 0) return
    
    try {
      await deleteBatchNotifications(selectedNotifications)
      setSelectedNotifications([])
      toast({
        title: 'Notificaciones eliminadas',
        description: `${selectedNotifications.length} notificaciones eliminadas`,
      })
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudieron eliminar las notificaciones seleccionadas',
        variant: 'destructive'
      })
    }
  }

  const handleNotificationClick = async (notification: NotificationData) => {
    // Mark as read if not already read
    if (!notification.read) {
      await handleMarkAsRead(notification._id)
    }

    // Navigate to action URL if available
    if (notification.actionUrl) {
      router.push(notification.actionUrl)
    }
  }

  const filteredNotifications = notifications.filter(notification => {
    if (filter === 'all') return true
    if (filter === 'unread') return !notification.read
    if (filter === 'read') return notification.read
    return notification.type === filter
  })

  const toggleSelectAll = () => {
    if (selectedNotifications.length === filteredNotifications.length) {
      setSelectedNotifications([])
    } else {
      setSelectedNotifications(filteredNotifications.map(n => n._id))
    }
  }

  const toggleSelectNotification = (notificationId: string) => {
    setSelectedNotifications(prev => 
      prev.includes(notificationId)
        ? prev.filter(id => id !== notificationId)
        : [...prev, notificationId]
    )
  }


  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Acceso denegado
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Debes iniciar sesión para ver tus notificaciones
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Notificaciones
            </h1>
            {unreadCount > 0 && (
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Tienes {unreadCount} notificación{unreadCount !== 1 ? 'es' : ''} sin leer
              </p>
            )}
          </div>
          
          <div className="flex items-center gap-3">
            {selectedNotifications.length > 0 && (
              <>
                <Button
                  onClick={handleBatchMarkAsRead}
                  variant="outline"
                  size="sm"
                  disabled={isLoading}
                  className="flex items-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  Marcar como leídas ({selectedNotifications.length})
                </Button>
                <Button
                  onClick={handleBatchDelete}
                  variant="destructive"
                  size="sm"
                  disabled={isLoading}
                  className="flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Eliminar ({selectedNotifications.length})
                </Button>
              </>
            )}
            
            {unreadCount > 0 && (
              <Button
                onClick={handleMarkAllAsRead}
                disabled={isLoading}
                className="flex items-center gap-2"
              >
                <CheckCheck className="w-4 h-4" />
                Marcar todas como leídas
              </Button>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              <h3 className="font-semibold text-gray-900 dark:text-white">Filtros</h3>
            </div>
            
            {notifications.length > 0 && (
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={selectedNotifications.length === filteredNotifications.length && filteredNotifications.length > 0}
                  onCheckedChange={toggleSelectAll}
                  disabled={filteredNotifications.length === 0}
                />
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Seleccionar todas ({filteredNotifications.length})
                </span>
              </div>
            )}
          </div>
          
          <div className="flex flex-wrap gap-2">
            {[
              { key: 'all', label: 'Todas' },
              { key: 'unread', label: 'No leídas' },
              { key: 'read', label: 'Leídas' },
              { key: 'follow', label: 'Seguidores' },
              { key: 'event_invite', label: 'Invitaciones' },
              { key: 'comment', label: 'Comentarios' },
              { key: 'like', label: 'Me gusta' },
              { key: 'system', label: 'Sistema' },
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setFilter(key)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  filter === key
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Notifications */}
        <div className="space-y-4">
          {isLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
              <p className="text-gray-600 dark:text-gray-400 mt-4">Cargando notificaciones...</p>
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-2xl shadow-lg">
              <Bell className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                {filter === 'all' ? 'No hay notificaciones' : 'No hay notificaciones para este filtro'}
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                {filter === 'all' 
                  ? 'Cuando recibas notificaciones, aparecerán aquí'
                  : 'Intenta cambiar el filtro para ver más notificaciones'
                }
              </p>
            </div>
          ) : (
            <AnimatePresence>
              {filteredNotifications.map((notification) => {
                const isSelected = selectedNotifications.includes(notification._id)
                
                return (
                  <motion.div
                    key={notification._id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -100 }}
                    className={`bg-white dark:bg-gray-800 rounded-2xl shadow-lg border-l-4 ${
                      getPriorityColor(notification.priority)
                    } ${
                      !notification.read ? 'bg-blue-50/30 dark:bg-blue-900/10' : ''
                    } ${
                      isSelected ? 'ring-2 ring-primary-500' : ''
                    } transition-all cursor-pointer hover:shadow-md`}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div className="p-6">
                      <div className="flex items-start gap-4">
                        <div className="flex items-center gap-3">
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => toggleSelectNotification(notification._id)}
                            onClick={(e) => e.stopPropagation()}
                          />
                          
                          <div className={`p-2 rounded-full ${getNotificationColor(notification.type)}`}>
                            <span className="text-lg">{getNotificationIcon(notification.type)}</span>
                          </div>
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className={`font-semibold ${
                                  !notification.read ? 'text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-300'
                                }`}>
                                  {notification.title}
                                </h4>
                                {!notification.read && (
                                  <div className="w-2 h-2 bg-blue-500 rounded-full" />
                                )}
                              </div>
                              
                              {notification.sender && (
                                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                                  de {notification.sender.firstName} {notification.sender.lastName}
                                </p>
                              )}
                              
                              <p className="text-gray-600 dark:text-gray-400 mb-2">
                                {notification.message}
                              </p>
                              
                              <div className="flex items-center gap-2">
                                <p className="text-sm text-gray-500 dark:text-gray-500">
                                  {formatNotificationTime(notification.createdAt)}
                                </p>
                                
                                {notification.priority === 'high' && (
                                  <Badge variant="destructive" className="text-xs">
                                    Alta prioridad
                                  </Badge>
                                )}
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-2 shrink-0">
                              {!notification.read && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleMarkAsRead(notification._id)
                                  }}
                                  disabled={isLoading}
                                  className="p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-colors disabled:opacity-50"
                                  title="Marcar como leída"
                                >
                                  <Check className="w-4 h-4" />
                                </button>
                              )}
                              
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleDelete(notification._id)
                                }}
                                disabled={isLoading}
                                className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50"
                                title="Eliminar notificación"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )
              })}
            </AnimatePresence>
          )}
        </div>
      </div>
    </div>
  )
}