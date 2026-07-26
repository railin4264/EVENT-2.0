'use client'

import { useState, useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Sun, Moon, Monitor, Globe, Clock } from 'lucide-react'
import { apiClient } from '@/lib/api/client'
import toast from 'react-hot-toast'

interface PreferencesSettingsProps {
  user: any
}

interface PreferencesSettings {
  theme: 'light' | 'dark' | 'system'
  language: string
  timezone: string
}

export default function PreferencesSettings({ user }: PreferencesSettingsProps) {
  const queryClient = useQueryClient()

  const [settings, setSettings] = useState<PreferencesSettings>({
    theme: 'system',
    language: 'es',
    timezone: 'America/Mexico_City'
  })

  // Fetch preferences
  const { data: userSettings } = useQuery({
    queryKey: ['settings', user?.id],
    queryFn: async () => {
      const response = await apiClient.get('/users/me/settings')
      return response.data.settings
    },
    enabled: !!user
  })

  useEffect(() => {
    if (userSettings?.preferences) {
      setSettings(userSettings.preferences)
    }
  }, [userSettings])

  const updatePreferencesMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiClient.put('/users/me/settings', {
        preferences: data
      })
      return response.data
    },
    onSuccess: () => {
      toast.success('Preferencias actualizadas')
      queryClient.invalidateQueries({ queryKey: ['settings'] })
    },
    onError: () => {
      toast.error('Error al actualizar preferencias')
    }
  })

  const handleThemeChange = (theme: 'light' | 'dark' | 'system') => {
    const newSettings = { ...settings, theme }
    setSettings(newSettings)
    updatePreferencesMutation.mutate(newSettings)

    // Apply theme immediately
    if (theme === 'dark') {
      document.documentElement.classList.add('dark')
    } else if (theme === 'light') {
      document.documentElement.classList.remove('dark')
    } else {
      // System preference
      const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      if (systemPrefersDark) {
        document.documentElement.classList.add('dark')
      } else {
        document.documentElement.classList.remove('dark')
      }
    }
  }

  const handleLanguageChange = (language: string) => {
    const newSettings = { ...settings, language }
    setSettings(newSettings)
    updatePreferencesMutation.mutate(newSettings)
  }

  const handleTimezoneChange = (timezone: string) => {
    const newSettings = { ...settings, timezone }
    setSettings(newSettings)
    updatePreferencesMutation.mutate(newSettings)
  }

  const timezones = [
    { value: 'America/Mexico_City', label: 'Ciudad de México (GMT-6)' },
    { value: 'America/Cancun', label: 'Cancún (GMT-5)' },
    { value: 'America/Tijuana', label: 'Tijuana (GMT-8)' },
    { value: 'America/Monterrey', label: 'Monterrey (GMT-6)' },
    { value: 'America/Chihuahua', label: 'Chihuahua (GMT-7)' },
    { value: 'America/Los_Angeles', label: 'Los Ángeles (GMT-8)' },
    { value: 'America/New_York', label: 'Nueva York (GMT-5)' },
    { value: 'America/Chicago', label: 'Chicago (GMT-6)' },
    { value: 'America/Denver', label: 'Denver (GMT-7)' },
    { value: 'Europe/Madrid', label: 'Madrid (GMT+1)' },
    { value: 'Europe/London', label: 'Londres (GMT+0)' },
    { value: 'Asia/Tokyo', label: 'Tokio (GMT+9)' }
  ]

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-2">
          Preferencias
        </h2>
        <p className="text-muted-foreground">
          Personaliza tu experiencia en la plataforma
        </p>
      </div>

      {/* Theme Selection */}
      <div className="glass bg-white/5 border border-white/10 rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-primary/20 bg-primary/20 backdrop-blur-sm rounded-lg">
            <Sun className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground">
              Tema
            </h3>
            <p className="text-sm text-muted-foreground">
              Elige el tema de la interfaz
            </p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          {[
            { value: 'light', label: 'Claro', icon: Sun, gradient: 'from-yellow-100 to-orange-100' },
            { value: 'dark', label: 'Oscuro', icon: Moon, gradient: 'from-gray-800 to-gray-900' },
            { value: 'system', label: 'Sistema', icon: Monitor, gradient: 'from-blue-100 to-purple-100' }
          ].map(({ value, label, icon: Icon, gradient }) => (
            <button
              key={value}
              onClick={() => handleThemeChange(value as any)}
              className={`relative p-6 rounded-xl border-2 transition-all ${
                settings.theme === value
                  ? 'border-primary-500 bg-primary/10 shadow-lg'
                  : 'border-white/10 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              <div className={`absolute inset-0 rounded-xl bg-gradient-to-br ${gradient} opacity-10`} />
              <div className="relative flex flex-col items-center gap-3">
                <div className={`p-3 rounded-full ${
                  settings.theme === value
                    ? 'bg-primary text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-muted-foreground'
                }`}>
                  <Icon className="w-6 h-6" />
                </div>
                <span className={`text-sm font-medium ${
                  settings.theme === value
                    ? 'text-primary'
                    : 'text-foreground/90'
                }`}>
                  {label}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Language Selection */}
      <div className="glass bg-white/5 border border-white/10 rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
            <Globe className="w-5 h-5 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground">
              Idioma
            </h3>
            <p className="text-sm text-muted-foreground">
              Selecciona tu idioma preferido
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {[
            { value: 'es', label: 'Español', flag: '🇪🇸' },
            { value: 'en', label: 'English', flag: '🇺🇸' }
          ].map(({ value, label, flag }) => (
            <button
              key={value}
              onClick={() => handleLanguageChange(value)}
              className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${
                settings.language === value
                  ? 'border-primary-500 bg-primary/10'
                  : 'border-white/10 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              <span className="text-3xl">{flag}</span>
              <span className={`font-medium ${
                settings.language === value
                  ? 'text-primary'
                  : 'text-foreground/90'
              }`}>
                {label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Timezone Selection */}
      <div className="glass bg-white/5 border border-white/10 rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
            <Clock className="w-5 h-5 text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground">
              Zona Horaria
            </h3>
            <p className="text-sm text-muted-foreground">
              Configura tu zona horaria para eventos
            </p>
          </div>
        </div>

        <select
          value={settings.timezone}
          onChange={(e) => handleTimezoneChange(e.target.value)}
          className="w-full p-3 border border-white/10 rounded-xl glass bg-white/5 text-foreground focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        >
          {timezones.map(({ value, label }) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      {/* Display Preferences */}
      <div className="glass bg-white/5 border border-white/10 rounded-2xl p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">
          Preferencias de Visualización
        </h3>

        <div className="space-y-3">
          <div className="flex items-center justify-between p-4 glass bg-white/5 rounded-xl">
            <div>
              <p className="font-medium text-foreground">
                Animaciones
              </p>
              <p className="text-sm text-muted-foreground">
                Habilitar animaciones y transiciones
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                defaultChecked
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary-600"></div>
            </label>
          </div>

          <div className="flex items-center justify-between p-4 glass bg-white/5 rounded-xl">
            <div>
              <p className="font-medium text-foreground">
                Reproducción automática de videos
              </p>
              <p className="text-sm text-muted-foreground">
                Los videos se reproducen automáticamente
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                defaultChecked
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary-600"></div>
            </label>
          </div>

          <div className="flex items-center justify-between p-4 glass bg-white/5 rounded-xl">
            <div>
              <p className="font-medium text-foreground">
                Imágenes de alta calidad
              </p>
              <p className="text-sm text-muted-foreground">
                Cargar imágenes en alta resolución
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                defaultChecked
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary-600"></div>
            </label>
          </div>
        </div>
      </div>

      {/* Accessibility */}
      <div className="glass bg-white/5 border border-white/10 rounded-2xl p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">
          Accesibilidad
        </h3>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground/90 mb-2">
              Tamaño de texto
            </label>
            <input
              type="range"
              min="12"
              max="20"
              defaultValue="16"
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
            />
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>Pequeño</span>
              <span>Mediano</span>
              <span>Grande</span>
            </div>
          </div>

          <div className="flex items-center justify-between p-4 glass bg-white/5 rounded-xl">
            <div>
              <p className="font-medium text-foreground">
                Alto contraste
              </p>
              <p className="text-sm text-muted-foreground">
                Aumentar el contraste para mejor legibilidad
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary-600"></div>
            </label>
          </div>
        </div>
      </div>

      {/* Current Settings Info */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-2xl p-6">
        <h4 className="font-semibold text-blue-900 dark:text-blue-300 mb-3">
          Configuración Actual
        </h4>
        <div className="space-y-2 text-sm text-blue-800 dark:text-blue-400">
          <div className="flex justify-between">
            <span>Tema:</span>
            <span className="font-medium">
              {settings.theme === 'light' ? 'Claro' : settings.theme === 'dark' ? 'Oscuro' : 'Sistema'}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Idioma:</span>
            <span className="font-medium">{settings.language === 'es' ? 'Español' : 'English'}</span>
          </div>
          <div className="flex justify-between">
            <span>Zona horaria:</span>
            <span className="font-medium">
              {timezones.find(tz => tz.value === settings.timezone)?.label}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
