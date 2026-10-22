import { useState, useEffect } from 'react'
import { Settings as SettingsIcon, User, Bell, Shield, LogOut, Moon, Globe, Eye, Lock, Mail, Loader2, Star, Palette, HelpCircle } from 'lucide-react'
import { Card } from './ui/card'
import { Button } from './ui/button'
import { Label } from './ui/label'
import { Switch } from './ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs'
import { Badge } from './ui/badge'
import { settingsService, type UserSettings } from '@/lib/api/services/settings.service'
import { usersService } from '@/lib/api/services'
import { useAuth } from '@/lib/providers/AuthProvider'
import toast from 'react-hot-toast'

export function Settings() {
  const { user } = useAuth()
  const [settings, setSettings] = useState<UserSettings>({
    notifications: {
      eventReminders: true,
      newFollowers: true,
      eventInvites: true,
      achievements: true,
      weeklyDigest: false,
      pushNotifications: true,
      emailNotifications: true
    },
    privacy: {
      profilePublic: true,
      showLocation: true,
      allowDirectMessages: true,
      showOnlineStatus: true,
      showActivityStatus: false,
      dataCollection: true
    },
    appearance: {
      darkMode: true,
      language: 'es',
      animations: true,
      autoPlay: true
    },
    account: {
      twoFactorAuth: false,
      loginAlerts: true,
      sessionTimeout: 30
    }
  })
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (user) {
      loadSettings()
    }
  }, [user])

  const loadSettings = async () => {
    if (!user) return

    setIsLoading(true)
    try {
      const response = await settingsService.getUserSettings(user._id)
      if (response.success && response.data) {
        setSettings(response.data)
      }
    } catch (error) {
      console.error('Error loading settings:', error)
      toast.error('Error al cargar configuración. Usando valores por defecto.')
    } finally {
      setIsLoading(false)
    }
  }

  const updateSetting = async (category: string, key: string, value: boolean) => {
    if (!user) return

    // Update local state immediately for better UX
    setSettings(prev => ({
      ...prev,
      [category]: {
        ...prev[category as keyof typeof prev],
        [key]: value
      }
    }))

    // Save to backend
    setIsSaving(true)
    try {
      const updateData = {
        [category]: {
          ...settings[category as keyof typeof settings],
          [key]: value
        }
      }

      await settingsService.updateSettings(user._id, updateData)
      toast.success('Configuración actualizada')
    } catch (error) {
      console.error('Error updating settings:', error)
      toast.error('Error al guardar configuración')
      // Revert local change on error
      loadSettings()
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-violet-400" />
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center space-x-3">
          <SettingsIcon className="w-6 h-6 text-violet-400" />
          <h1 className="text-3xl font-bold text-white">Configuración</h1>
        </div>
        {isSaving && (
          <div className="flex items-center space-x-2 text-violet-400">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm">Guardando...</span>
          </div>
        )}
      </div>

      <Tabs defaultValue="account" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5 glass-card">
          <TabsTrigger value="account">Cuenta</TabsTrigger>
          <TabsTrigger value="notifications">Notificaciones</TabsTrigger>
          <TabsTrigger value="privacy">Privacidad</TabsTrigger>
          <TabsTrigger value="appearance">Apariencia</TabsTrigger>
          <TabsTrigger value="help">Ayuda</TabsTrigger>
        </TabsList>

        <TabsContent value="account">
          <div className="space-y-6">
            <Card className="glass-card p-6">
              <h3 className="text-xl font-bold text-white mb-6 flex items-center">
                <User className="w-5 h-5 mr-2 text-violet-400" />
                Información de la cuenta
              </h3>

              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <Label className="text-white/80">Nombre completo</Label>
                    <p className="text-white mt-1">{user ? [user.firstName, user.lastName].filter(Boolean).join(' ') || user.username : 'N/A'}</p>
                  </div>
                  <div>
                    <Label className="text-white/80">Nombre de usuario</Label>
                    <p className="text-white mt-1">@{user?.username || 'N/A'}</p>
                  </div>
                  <div>
                    <Label className="text-white/80">Email</Label>
                    <p className="text-white mt-1">{user?.email || 'N/A'}</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label className="text-white/80">Ubicación</Label>
                    <p className="text-white mt-1">{(user as any)?.location || 'No especificada'}</p>
                  </div>
                  <div>
                    <Label className="text-white/80">Miembro desde</Label>
                    <p className="text-white mt-1">{user?.createdAt ? new Date(user.createdAt).toLocaleDateString('es-ES', { year: 'numeric', month: 'long' }) : 'N/A'}</p>
                  </div>
                  <div>
                    <Label className="text-white/80">Estado</Label>
                    <Badge className="bg-green-500/20 text-green-400 mt-1">Verificado</Badge>
                  </div>
                </div>
              </div>

              <div className="flex space-x-3 mt-6">
                <Button className="bg-gradient-to-r from-violet-600 to-cyan-600">
                  Editar perfil
                </Button>
                <Button variant="outline" className="border-white/20 text-white hover:bg-white/10">
                  Cambiar contraseña
                </Button>
              </div>
            </Card>

            <Card className="glass-card p-6">
              <h3 className="text-xl font-bold text-white mb-6 flex items-center">
                <Shield className="w-5 h-5 mr-2 text-violet-400" />
                Seguridad
              </h3>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-white">Autenticación de dos factores</Label>
                    <p className="text-white/60 text-sm">Agrega una capa extra de seguridad</p>
                  </div>
                  <Switch
                    checked={settings.account.twoFactorAuth}
                    onCheckedChange={(checked) => updateSetting('account', 'twoFactorAuth', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-white">Alertas de inicio de sesión</Label>
                    <p className="text-white/60 text-sm">Recibe notificaciones de nuevos accesos</p>
                  </div>
                  <Switch
                    checked={settings.account.loginAlerts}
                    onCheckedChange={(checked) => updateSetting('account', 'loginAlerts', checked)}
                  />
                </div>
              </div>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="notifications">
          <Card className="glass-card p-6">
            <h3 className="text-xl font-bold text-white mb-6 flex items-center">
              <Bell className="w-5 h-5 mr-2 text-violet-400" />
              Preferencias de notificaciones
            </h3>

            <div className="space-y-6">
              <div>
                <h4 className="text-white font-medium mb-4">Eventos</h4>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-white">Recordatorios de eventos</Label>
                      <p className="text-white/60 text-sm">Te avisamos antes de que comience un evento</p>
                    </div>
                    <Switch
                      checked={settings.notifications.eventReminders}
                      onCheckedChange={(checked) => updateSetting('notifications', 'eventReminders', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-white">Invitaciones a eventos</Label>
                      <p className="text-white/60 text-sm">Cuando alguien te invite a un evento</p>
                    </div>
                    <Switch
                      checked={settings.notifications.eventInvites}
                      onCheckedChange={(checked) => updateSetting('notifications', 'eventInvites', checked)}
                    />
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-white font-medium mb-4">Social</h4>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-white">Nuevos seguidores</Label>
                      <p className="text-white/60 text-sm">Cuando alguien te siga</p>
                    </div>
                    <Switch
                      checked={settings.notifications.newFollowers}
                      onCheckedChange={(checked) => updateSetting('notifications', 'newFollowers', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-white">Logros y XP</Label>
                      <p className="text-white/60 text-sm">Nuevos logros desbloqueados</p>
                    </div>
                    <Switch
                      checked={settings.notifications.achievements}
                      onCheckedChange={(checked) => updateSetting('notifications', 'achievements', checked)}
                    />
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-white font-medium mb-4">Canales</h4>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-white">Notificaciones push</Label>
                      <p className="text-white/60 text-sm">Recibe notificaciones en tu dispositivo</p>
                    </div>
                    <Switch
                      checked={settings.notifications.pushNotifications}
                      onCheckedChange={(checked) => updateSetting('notifications', 'pushNotifications', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-white">Notificaciones por email</Label>
                      <p className="text-white/60 text-sm">Recibe un resumen por email</p>
                    </div>
                    <Switch
                      checked={settings.notifications.emailNotifications}
                      onCheckedChange={(checked) => updateSetting('notifications', 'emailNotifications', checked)}
                    />
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="privacy">
          <Card className="glass-card p-6">
            <h3 className="text-xl font-bold text-white mb-6 flex items-center">
              <Lock className="w-5 h-5 mr-2 text-violet-400" />
              Privacidad y seguridad
            </h3>

            <div className="space-y-6">
              <div>
                <h4 className="text-white font-medium mb-4">Visibilidad del perfil</h4>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-white">Perfil público</Label>
                      <p className="text-white/60 text-sm">Otros usuarios pueden ver tu perfil</p>
                    </div>
                    <Switch
                      checked={settings.privacy.profilePublic}
                      onCheckedChange={(checked) => updateSetting('privacy', 'profilePublic', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-white">Mostrar ubicación</Label>
                      <p className="text-white/60 text-sm">Tu ubicación será visible en eventos</p>
                    </div>
                    <Switch
                      checked={settings.privacy.showLocation}
                      onCheckedChange={(checked) => updateSetting('privacy', 'showLocation', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-white">Estado en línea</Label>
                      <p className="text-white/60 text-sm">Mostrar cuando estás activo</p>
                    </div>
                    <Switch
                      checked={settings.privacy.showOnlineStatus}
                      onCheckedChange={(checked) => updateSetting('privacy', 'showOnlineStatus', checked)}
                    />
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-white font-medium mb-4">Comunicación</h4>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-white">Mensajes directos</Label>
                      <p className="text-white/60 text-sm">Permitir mensajes de otros usuarios</p>
                    </div>
                    <Switch
                      checked={settings.privacy.allowDirectMessages}
                      onCheckedChange={(checked) => updateSetting('privacy', 'allowDirectMessages', checked)}
                    />
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-white font-medium mb-4">Datos</h4>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-white">Recopilación de datos</Label>
                      <p className="text-white/60 text-sm">Ayudanos a mejorar con datos anónimos</p>
                    </div>
                    <Switch
                      checked={settings.privacy.dataCollection}
                      onCheckedChange={(checked) => updateSetting('privacy', 'dataCollection', checked)}
                    />
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="appearance">
          <Card className="glass-card p-6">
            <h3 className="text-xl font-bold text-white mb-6 flex items-center">
              <Palette className="w-5 h-5 mr-2 text-violet-400" />
              Apariencia y comportamiento
            </h3>

            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-white">Modo oscuro</Label>
                  <p className="text-white/60 text-sm">Interfaz con tema oscuro</p>
                </div>
                <Switch
                  checked={settings.appearance.darkMode}
                  onCheckedChange={(checked) => updateSetting('appearance', 'darkMode', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-white">Animaciones</Label>
                  <p className="text-white/60 text-sm">Efectos visuales y transiciones</p>
                </div>
                <Switch
                  checked={settings.appearance.animations}
                  onCheckedChange={(checked) => updateSetting('appearance', 'animations', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-white">Reproducción automática</Label>
                  <p className="text-white/60 text-sm">Videos e imágenes se reproducen automáticamente</p>
                </div>
                <Switch
                  checked={settings.appearance.autoPlay}
                  onCheckedChange={(checked) => updateSetting('appearance', 'autoPlay', checked)}
                />
              </div>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="help">
          <div className="space-y-6">
            <Card className="glass-card p-6">
              <h3 className="text-xl font-bold text-white mb-6 flex items-center">
                <HelpCircle className="w-5 h-5 mr-2 text-violet-400" />
                Ayuda y soporte
              </h3>

              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <Button variant="outline" className="w-full border-white/20 text-white hover:bg-white/10 justify-start">
                    <HelpCircle className="w-4 h-4 mr-2" />
                    Centro de ayuda
                  </Button>
                  <Button variant="outline" className="w-full border-white/20 text-white hover:bg-white/10 justify-start">
                    <Mail className="w-4 h-4 mr-2" />
                    Contactar soporte
                  </Button>
                  <Button variant="outline" className="w-full border-white/20 text-white hover:bg-white/10 justify-start">
                    <Globe className="w-4 h-4 mr-2" />
                    Términos y condiciones
                  </Button>
                </div>

                <div className="space-y-4">
                  <Button variant="outline" className="w-full border-white/20 text-white hover:bg-white/10 justify-start">
                    <Eye className="w-4 h-4 mr-2" />
                    Política de privacidad
                  </Button>
                  <Button variant="outline" className="w-full border-white/20 text-white hover:bg-white/10 justify-start">
                    <SettingsIcon className="w-4 h-4 mr-2" />
                    Gestionar datos
                  </Button>
                  <Button variant="outline" className="w-full border-white/20 text-white hover:bg-white/10 justify-start text-red-400 border-red-400/20 hover:bg-red-500/10">
                    <LogOut className="w-4 h-4 mr-2" />
                    Eliminar cuenta
                  </Button>
                </div>
              </div>
            </Card>

            <Card className="glass-card p-6">
              <h4 className="text-white font-medium mb-4">Información de la aplicación</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <Label className="text-white/60">Versión</Label>
                  <p className="text-white">2.0.1</p>
                </div>
                <div>
                  <Label className="text-white/60">Última actualización</Label>
                  <p className="text-white">10 Nov 2024</p>
                </div>
              </div>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
