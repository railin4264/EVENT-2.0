'use client'

import { useState, useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Bell, Mail, Smartphone, Calendar, MessageSquare, Users, Trophy, Zap } from 'lucide-react'
import { apiClient } from '@/lib/api/client'
import toast from 'react-hot-toast'

interface NotificationSettingsProps {
  user: any
}

interface NotificationPreferences {
  email: boolean
  push: boolean
  eventReminders: boolean
  newMessages: boolean
  weeklyDigest: boolean
}

export default function NotificationSettings({ user }: NotificationSettingsProps) {
  const queryClient = useQueryClient()

  const [settings, setSettings] = useState<NotificationPreferences>({
    email: true,
    push: true,
    eventReminders: true,
    newMessages: true,
    weeklyDigest: false
  })

  // Fetch notification settings
  const { data: userSettings } = useQuery({
    queryKey: ['settings', user?.id],
    queryFn: async () => {
      const response = await apiClient.get('/users/me/settings')
      return response.data.settings
    },
    enabled: !!user
  })

  useEffect(() => {
    if (userSettings?.notifications) {
      setSettings(userSettings.notifications)
    }
  }, [userSettings])

  const updateNotificationsMutation = useMutation({
    mutationFn: async (data: NotificationPreferences) => {
      const response = await apiClient.put('/users/me/notifications', data)
      return response.data
    },
    onSuccess: () => {
      toast.success('Preferencias de notificación actualizadas')
      queryClient.invalidateQueries({ queryKey: ['settings'] })
    },
    onError: () => {
      toast.error('Error al actualizar preferencias de notificación')
    }
  })

  const handleToggle = (key: keyof NotificationPreferences) => {
    const newSettings = {
      ...settings,
      [key]: !settings[key]
    }
    setSettings(newSettings)
    updateNotificationsMutation.mutate(newSettings)
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-2">
          Notificaciones
        </h2>
        <p className="text-muted-foreground">
          Administra cómo y cuándo recibes notificaciones
        </p>
      </div>

      {/* Main Notification Channels */}
      <div className="glass bg-white/5 border border-white/10 rounded-2xl p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">
          Canales de Notificación
        </h3>

        <div className="space-y-4">
          {/* Email Notifications */}
          <div className="flex items-center justify-between p-4 glass bg-white/5 rounded-xl">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <Mail className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="font-medium text-foreground">
                  Notificaciones por Email
                </p>
                <p className="text-sm text-muted-foreground">
                  Recibe actualizaciones importantes por correo electrónico
                </p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.email}
                onChange={() => handleToggle('email')}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary-600"></div>
            </label>
          </div>

          {/* Push Notifications */}
          <div className="flex items-center justify-between p-4 glass bg-white/5 rounded-xl">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                <Smartphone className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="font-medium text-foreground">
                  Notificaciones Push
                </p>
                <p className="text-sm text-muted-foreground">
                  Recibe notificaciones en tiempo real en tu dispositivo
                </p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.push}
                onChange={() => handleToggle('push')}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary-600"></div>
            </label>
          </div>
        </div>
      </div>

      {/* Activity Notifications */}
      <div className="glass bg-white/5 border border-white/10 rounded-2xl p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">
          Notificaciones de Actividad
        </h3>

        <div className="space-y-4">
          {/* Event Reminders */}
          <div className="flex items-center justify-between p-4 glass bg-white/5 rounded-xl">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <Calendar className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="font-medium text-foreground">
                  Recordatorios de Eventos
                </p>
                <p className="text-sm text-muted-foreground">
                  Recibe recordatorios antes de eventos próximos
                </p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.eventReminders}
                onChange={() => handleToggle('eventReminders')}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary-600"></div>
            </label>
          </div>

          {/* New Messages */}
          <div className="flex items-center justify-between p-4 glass bg-white/5 rounded-xl">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
                <MessageSquare className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div>
                <p className="font-medium text-foreground">
                  Nuevos Mensajes
                </p>
                <p className="text-sm text-muted-foreground">
                  Recibe notificaciones de nuevos mensajes
                </p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.newMessages}
                onChange={() => handleToggle('newMessages')}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary-600"></div>
            </label>
          </div>

          {/* Weekly Digest */}
          <div className="flex items-center justify-between p-4 glass bg-white/5 rounded-xl">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                <Zap className="w-5 h-5 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <p className="font-medium text-foreground">
                  Resumen Semanal
                </p>
                <p className="text-sm text-muted-foreground">
                  Recibe un resumen de actividades cada semana
                </p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.weeklyDigest}
                onChange={() => handleToggle('weeklyDigest')}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary-600"></div>
            </label>
          </div>
        </div>
      </div>

      {/* Social Notifications */}
      <div className="glass bg-white/5 border border-white/10 rounded-2xl p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">
          Notificaciones Sociales
        </h3>

        <div className="space-y-3">
          <div className="p-4 glass bg-white/5 rounded-xl">
            <div className="flex items-center gap-3 mb-2">
              <Users className="w-5 h-5 text-primary" />
              <span className="font-medium text-foreground">
                Nuevos seguidores
              </span>
            </div>
            <p className="text-sm text-muted-foreground ml-8">
              Te notificaremos cuando alguien comience a seguirte
            </p>
          </div>

          <div className="p-4 glass bg-white/5 rounded-xl">
            <div className="flex items-center gap-3 mb-2">
              <Trophy className="w-5 h-5 text-primary" />
              <span className="font-medium text-foreground">
                Logros y reconocimientos
              </span>
            </div>
            <p className="text-sm text-muted-foreground ml-8">
              Recibe notificaciones cuando desbloquees nuevos logros
            </p>
          </div>

          <div className="p-4 glass bg-white/5 rounded-xl">
            <div className="flex items-center gap-3 mb-2">
              <Bell className="w-5 h-5 text-primary" />
              <span className="font-medium text-foreground">
                Invitaciones a eventos
              </span>
            </div>
            <p className="text-sm text-muted-foreground ml-8">
              Te avisaremos cuando te inviten a un evento
            </p>
          </div>
        </div>
      </div>

      {/* Notification Preferences Info */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-2xl p-6">
        <div className="flex gap-3">
          <Bell className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-semibold text-blue-900 dark:text-blue-300 mb-2">
              Sobre las Notificaciones
            </h4>
            <div className="space-y-2 text-sm text-blue-800 dark:text-blue-400">
              <p>
                Mantente informado de las actividades importantes mientras controlas la frecuencia de las notificaciones.
              </p>
              <ul className="space-y-1 mt-3">
                <li>• Puedes pausar todas las notificaciones temporalmente</li>
                <li>• Las notificaciones de seguridad siempre estarán activas</li>
                <li>• Puedes silenciar notificaciones durante horarios específicos</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex gap-3">
        <button className="flex-1 p-4 border-2 border-white/10 text-foreground/90 rounded-xl hover:bg-white/10 transition-colors font-medium">
          Silenciar por 1 hora
        </button>
        <button className="flex-1 p-4 border-2 border-white/10 text-foreground/90 rounded-xl hover:bg-white/10 transition-colors font-medium">
          Silenciar hasta mañana
        </button>
      </div>
    </div>
  )
}
