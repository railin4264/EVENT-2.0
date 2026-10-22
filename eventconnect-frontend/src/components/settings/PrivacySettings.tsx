'use client'

import { useState, useEffect, useRef } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Shield, Eye, EyeOff, MapPin, Users, Calendar, Globe } from 'lucide-react'
import { apiClient } from '@/lib/api/client'
import toast from 'react-hot-toast'
import { useAuthStore } from '@/stores/authStore'

interface PrivacySettingsProps {
  user: any
  onRequestSupport?: () => void
}

interface PrivacySettings {
  showProfile: boolean
  showAttendedEvents: boolean
  showLocation: boolean
}

export default function PrivacySettings({ user, onRequestSupport }: PrivacySettingsProps) {
  const queryClient = useQueryClient()
  const writeLock = useRef(false)
  const owner = user?.id || user?._id

  const [settings, setSettings] = useState<PrivacySettings>({
    showProfile: false,
    showAttendedEvents: false,
    showLocation: false
  })

  const [isPrivate, setIsPrivate] = useState(user?.isPrivate || false)

  // Fetch privacy settings
  const { data: userSettings, isError, isFetching, refetch } = useQuery({
    queryKey: ['settings', owner],
    queryFn: async () => {
      const response = await apiClient.get('/users/me/settings')
      if (!response.data?.success || !response.data?.settings?.privacy) throw new Error('No se pudo cargar la privacidad')
      return response.data.settings
    },
    enabled: Boolean(owner),
    retry: false
  })

  useEffect(() => {
    if (userSettings?.privacy) {
      setSettings(userSettings.privacy)
    }
  }, [userSettings])

  const updatePrivacyMutation = useMutation({
    mutationFn: async (data: { key: keyof PrivacySettings; value: boolean; previous: boolean }) => {
      const response = await apiClient.put('/users/me/settings', {
        privacy: { [data.key]: data.value }
      })
      if (!response.data?.success || typeof response.data?.settings?.privacy?.[data.key] !== 'boolean') throw new Error('El servidor no confirmó el cambio')
      return response.data
    },
    onSuccess: (response) => {
      setSettings(response.settings.privacy)
      toast.success('Configuración de privacidad actualizada')
      queryClient.setQueryData(['settings', owner], response.settings)
    },
    onError: (_error, change) => {
      setSettings(previous => ({ ...previous, [change.key]: change.previous }))
      toast.error('Error al actualizar configuración de privacidad')
    },
    onSettled: () => { writeLock.current = false }
  })

  const updateProfilePrivacyMutation = useMutation({
    mutationFn: async (isPrivate: boolean) => {
      const response = await apiClient.put('/users/me/profile', { isPrivate })
      if (!response.data?.success || typeof response.data?.user?.isPrivate !== 'boolean') throw new Error('El servidor no confirmó el cambio')
      return response.data
    },
    onSuccess: (response) => {
      setIsPrivate(response.user.isPrivate)
      const state = useAuthStore.getState()
      if (String(state.user?.id || state.user?._id) === String(owner)) state.updateUser({ isPrivate: response.user.isPrivate })
      toast.success('Privacidad del perfil actualizada')
      queryClient.invalidateQueries({ queryKey: ['user'] })
    },
    onError: (_error, change) => {
      setIsPrivate(!change)
      toast.error('Error al actualizar privacidad del perfil')
    },
    onSettled: () => { writeLock.current = false }
  })

  const handleToggle = (key: keyof PrivacySettings) => {
    if (!userSettings || isFetching || writeLock.current) return
    writeLock.current = true
    const newSettings = {
      ...settings,
      [key]: !settings[key]
    }
    setSettings(newSettings)
    updatePrivacyMutation.mutate({ key, value: newSettings[key], previous: settings[key] })
  }

  const handlePrivateProfileToggle = () => {
    if (!userSettings || isFetching || writeLock.current) return
    writeLock.current = true
    const newValue = !isPrivate
    setIsPrivate(newValue)
    updateProfilePrivacyMutation.mutate(newValue)
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-2">
          Configuración de Privacidad
        </h2>
        <p className="text-muted-foreground">
          Controla quién puede ver tu información y actividad
        </p>
      </div>

      {isError && <p role="alert" className="text-sm text-destructive">No pudimos cargar la privacidad. <button onClick={() => void refetch()} className="font-semibold underline">Reintentar carga</button></p>}

      {/* Private Profile */}
      <div className="bg-gradient-to-r from-primary-50 to-purple-50 dark:from-primary-900/20 dark:to-purple-900/20 border border-primary-200 dark:border-primary-800 rounded-2xl p-6">
        <div className="flex items-start justify-between">
          <div className="flex gap-4">
            <div className="p-3 bg-primary rounded-xl">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Perfil Privado
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                Cuando tu perfil es privado, solo las personas que sigues y tus conexiones pueden ver tu información completa y actividad.
              </p>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={isPrivate}
                  aria-label="Perfil privado"
                  disabled={!userSettings || isFetching || updatePrivacyMutation.isPending || updateProfilePrivacyMutation.isPending}
                  onChange={handlePrivateProfileToggle}
                  className="sr-only peer"
                />
                <div className="w-14 h-7 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all dark:border-gray-600 peer-checked:bg-primary-600"></div>
                <span className="ml-3 text-sm font-medium text-foreground">
                  {isPrivate ? 'Activado' : 'Desactivado'}
                </span>
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Privacy Options */}
      <div className="glass bg-white/5 border border-white/10 rounded-2xl p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">
          Visibilidad de Información
        </h3>

        <div className="space-y-4">
          {/* Show Profile */}
          <div className="flex items-center justify-between p-4 glass bg-white/5 rounded-xl">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <Eye className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="font-medium text-foreground">
                  Perfil Público
                </p>
                <p className="text-sm text-muted-foreground">
                  Permite que otros usuarios vean tu perfil completo
                </p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.showProfile}
                aria-label="Mostrar mi perfil"
                disabled={!userSettings || isFetching || updatePrivacyMutation.isPending || updateProfilePrivacyMutation.isPending}
                onChange={() => handleToggle('showProfile')}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary-600"></div>
            </label>
          </div>

          {/* Show Attended Events */}
          <div className="flex items-center justify-between p-4 glass bg-white/5 rounded-xl">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                <Calendar className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="font-medium text-foreground">
                  Eventos Asistidos
                </p>
                <p className="text-sm text-muted-foreground">
                  Muestra los eventos a los que has asistido
                </p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.showAttendedEvents}
                aria-label="Mostrar eventos a los que asisto"
                disabled={!userSettings || isFetching || updatePrivacyMutation.isPending || updateProfilePrivacyMutation.isPending}
                onChange={() => handleToggle('showAttendedEvents')}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary-600"></div>
            </label>
          </div>

          {/* Show Location */}
          <div className="flex items-center justify-between p-4 glass bg-white/5 rounded-xl">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <MapPin className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="font-medium text-foreground">
                  Ubicación
                </p>
                <p className="text-sm text-muted-foreground">
                  Comparte tu ubicación con otros usuarios
                </p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.showLocation}
                aria-label="Mostrar ubicación en mi perfil"
                disabled={!userSettings || isFetching || updatePrivacyMutation.isPending || updateProfilePrivacyMutation.isPending}
                onChange={() => handleToggle('showLocation')}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary-600"></div>
            </label>
          </div>
        </div>
      </div>

      {/* Privacy Information */}
      <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-2xl p-6">
        <div className="flex gap-3">
          <Globe className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-semibold text-yellow-900 dark:text-yellow-300 mb-2">
              Información sobre Privacidad
            </h4>
            <div className="space-y-2 text-sm text-yellow-800 dark:text-yellow-400">
              <p>
                Tu privacidad es importante para nosotros. Aquí puedes controlar qué información es visible para otros usuarios.
              </p>
              <ul className="space-y-1 mt-3">
                <li>• Ocultar tu perfil limita su apertura y su aparición en los listados de usuarios.</li>
                <li>• Cambiar la visibilidad no elimina información que ya hayas compartido.</li>
                <li>• Puedes cambiar estas configuraciones en cualquier momento</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Data & Privacy */}
      <div className="glass bg-white/5 border border-white/10 rounded-2xl p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">
          Datos y Privacidad
        </h3>

        <div className="space-y-3">
          <button onClick={onRequestSupport} disabled={!onRequestSupport} className="w-full text-left p-4 glass bg-white/5 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-foreground">
                  Solicitar copia de mis datos
                </p>
                <p className="text-sm text-muted-foreground">
                  Abre una solicitud al equipo de soporte
                </p>
              </div>
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </button>

          <button onClick={onRequestSupport} disabled={!onRequestSupport} className="w-full text-left p-4 glass bg-white/5 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-foreground">
                  Ayuda con bloqueos y privacidad
                </p>
                <p className="text-sm text-muted-foreground">
                  Consulta una incidencia con el equipo
                </p>
              </div>
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </button>
        </div>
      </div>
    </div>
  )
}
