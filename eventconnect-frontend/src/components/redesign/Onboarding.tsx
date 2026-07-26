import { useState } from 'react'
import { ArrowRight, ChevronLeft, Star, Calendar, Users, MapPin, Check, Bell, Shield, Mail, Smartphone, Activity, Eye, MessageCircle, Globe , Trophy, Sparkles} from 'lucide-react'
import { Card } from './ui/card'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import { Progress } from './ui/progress'
import { settingsService } from '@/lib/api/services/settings.service'
import toast from 'react-hot-toast'

interface OnboardingProps {
  user: any
  onComplete: () => void
}

export function Onboarding({ user, onComplete }: OnboardingProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [preferences, setPreferences] = useState({
    eventTypes: [] as string[],
    notifications: {
      eventReminders: true,
      newFollowers: true,
      eventInvites: true,
      achievements: true,
      weeklyDigest: true,
      pushNotifications: true,
      emailNotifications: true
    },
    privacy: {
      profilePublic: true,
      showLocation: true,
      allowDirectMessages: true,
      showOnlineStatus: true,
      showActivityStatus: true,
      dataCollection: false
    }
  })

  const steps = [
    { title: '¡Bienvenido a Event Connect 2.0!', description: 'Explora. Conecta. Vibra. Gana.', content: 'welcome' },
    { title: 'Personaliza tu experiencia', description: 'Selecciona los tipos de eventos que más te interesan', content: 'preferences' },
    { title: 'Configura tus notificaciones', description: 'Decide cómo quieres que te mantengamos informado', content: 'notifications' },
    { title: 'Privacidad y configuración', description: 'Controla quién puede ver tu información', content: 'privacy' },
    { title: '¡Todo listo!', description: 'Estás preparado para comenzar tu aventura', content: 'complete' }
  ]

  const eventTypes = [
    { id: 'music', name: 'Música', icon: '🎵', color: 'from-pink-500 to-rose-500' },
    { id: 'tech', name: 'Tecnología', icon: '💻', color: 'from-blue-500 to-cyan-500' },
    { id: 'art', name: 'Arte', icon: '🎨', color: 'from-purple-500 to-violet-500' },
    { id: 'food', name: 'Gastronomía', icon: '🍽️', color: 'from-orange-500 to-amber-500' },
    { id: 'sports', name: 'Deportes', icon: '⚽', color: 'from-green-500 to-emerald-500' },
    { id: 'gaming', name: 'Gaming', icon: '🎮', color: 'from-indigo-500 to-purple-500' },
    { id: 'business', name: 'Negocios', icon: '💼', color: 'from-gray-500 to-slate-500' },
    { id: 'wellness', name: 'Bienestar', icon: '🧘', color: 'from-teal-500 to-cyan-500' }
  ]

  // All notification settings with full labels
  const notificationLabels: Record<string, { label: string; desc: string; icon: React.ReactNode }> = {
    eventReminders:     { label: 'Recordatorios de eventos',  desc: 'Te recordaremos tus eventos próximos',      icon: <Bell className="w-4 h-4 text-violet-400" /> },
    newFollowers:       { label: 'Nuevos seguidores',         desc: 'Cuando alguien te siga',                    icon: <Users className="w-4 h-4 text-blue-400" /> },
    eventInvites:       { label: 'Invitaciones a eventos',    desc: 'Cuando te inviten a eventos',               icon: <Calendar className="w-4 h-4 text-green-400" /> },
    achievements:       { label: 'Logros y XP',               desc: 'Nuevos logros desbloqueados',               icon: <Trophy className="w-4 h-4 text-yellow-400" /> },
    weeklyDigest:       { label: 'Resumen semanal',           desc: 'Resumen de actividad semanal',              icon: <Activity className="w-4 h-4 text-pink-400" /> },
    pushNotifications:  { label: 'Notificaciones push',       desc: 'Alertas en tiempo real en tu dispositivo', icon: <Smartphone className="w-4 h-4 text-cyan-400" /> },
    emailNotifications: { label: 'Notificaciones por email',  desc: 'Recibe actualizaciones en tu correo',       icon: <Mail className="w-4 h-4 text-orange-400" /> },
  }

  // All privacy settings with full labels
  const privacyLabels: Record<string, { label: string; desc: string; icon: React.ReactNode }> = {
    profilePublic:        { label: 'Perfil público',         desc: 'Otros usuarios pueden ver tu perfil',            icon: <Globe className="w-4 h-4 text-blue-400" /> },
    showLocation:         { label: 'Mostrar ubicación',      desc: 'Tu ubicación será visible en eventos',           icon: <MapPin className="w-4 h-4 text-green-400" /> },
    allowDirectMessages:  { label: 'Mensajes directos',      desc: 'Permitir mensajes de otros usuarios',            icon: <MessageCircle className="w-4 h-4 text-violet-400" /> },
    showOnlineStatus:     { label: 'Estado en línea',        desc: 'Mostrar cuando estás activo en la plataforma',   icon: <Activity className="w-4 h-4 text-cyan-400" /> },
    showActivityStatus:   { label: 'Actividad reciente',     desc: 'Mostrar tus eventos y actividades recientes',    icon: <Eye className="w-4 h-4 text-pink-400" /> },
    dataCollection:       { label: 'Mejora de experiencia',  desc: 'Compartir datos anónimos para mejorar la app',   icon: <Shield className="w-4 h-4 text-orange-400" /> },
  }

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1)
    } else {
      handleComplete()
    }
  }

  const handleComplete = async () => {
    const userId = user?._id || user?.id
    if (!userId) {
      // No ID yet (guest), just proceed
      onComplete()
      return
    }
    try {
      await settingsService.updateSettings(userId, {
        notifications: preferences.notifications,
        privacy: preferences.privacy
      })
      toast.success('Preferencias guardadas')
    } catch (error) {
      console.warn('Could not save preferences:', error)
      // Don't block — proceed even if API fails
    }
    onComplete()
  }

  const prevStep = () => {
    if (currentStep > 0) setCurrentStep(currentStep - 1)
  }

  const toggleEventType = (typeId: string) => {
    setPreferences(prev => ({
      ...prev,
      eventTypes: prev.eventTypes.includes(typeId)
        ? prev.eventTypes.filter(id => id !== typeId)
        : [...prev.eventTypes, typeId]
    }))
  }

  const toggleNotification = (key: string) => {
    setPreferences(prev => ({
      ...prev,
      notifications: {
        ...prev.notifications,
        [key]: !prev.notifications[key as keyof typeof prev.notifications]
      }
    }))
  }

  const togglePrivacy = (key: string) => {
    setPreferences(prev => ({
      ...prev,
      privacy: {
        ...prev.privacy,
        [key]: !prev.privacy[key as keyof typeof prev.privacy]
      }
    }))
  }

  const progress = ((currentStep + 1) / steps.length) * 100
  const userName = user?.name || user?.username || 'Usuario'

  return (
    <div className="min-h-screen bg-[#0C0B10] relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 particle-bg">
        <div className="absolute inset-0 animated-bg opacity-20"></div>
      </div>
      <div className="absolute top-20 left-10 w-20 h-20 rounded-full bg-gradient-to-r from-violet-500/30 to-blue-500/30 blur-xl"></div>
      <div className="absolute bottom-20 right-10 w-32 h-32 rounded-full bg-gradient-to-r from-pink-500/30 to-violet-500/30 blur-xl"></div>

      <div className="relative z-10 min-h-screen flex items-center justify-center p-6">
        <div className="w-full max-w-2xl">
          {/* Progress */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-2">
              <span className="text-white/70 text-sm">Paso {currentStep + 1} de {steps.length}</span>
              <span className="text-white/70 text-sm">{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          {/* Main Card */}
          <Card className="glass-card p-8 text-center">

            {/* Welcome Step */}
            {steps[currentStep].content === 'welcome' && (
              <div className="space-y-6">
                <div className="inline-block p-6 rounded-full bg-gradient-to-r from-violet-500 to-blue-500 mb-4">
                  <Sparkles className="w-12 h-12 text-white" />
                </div>
                <h1 className="text-3xl font-bold text-white mb-4">¡Hola {userName}! 👋</h1>
                <p className="text-xl text-white/80 mb-6">{steps[currentStep].description}</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="p-4 rounded-lg bg-white/5">
                    <Calendar className="w-8 h-8 text-blue-400 mx-auto mb-2" />
                    <p className="text-white/70 text-sm">Descubre eventos únicos</p>
                  </div>
                  <div className="p-4 rounded-lg bg-white/5">
                    <Users className="w-8 h-8 text-green-400 mx-auto mb-2" />
                    <p className="text-white/70 text-sm">Conecta con personas</p>
                  </div>
                  <div className="p-4 rounded-lg bg-white/5">
                    <MapPin className="w-8 h-8 text-violet-400 mx-auto mb-2" />
                    <p className="text-white/70 text-sm">Explora tu ciudad</p>
                  </div>
                  <div className="p-4 rounded-lg bg-white/5">
                    <Trophy className="w-8 h-8 text-yellow-400 mx-auto mb-2" />
                    <p className="text-white/70 text-sm">Gana logros y XP</p>
                  </div>
                </div>
              </div>
            )}

            {/* Preferences Step */}
            {steps[currentStep].content === 'preferences' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold text-white mb-2">{steps[currentStep].title}</h2>
                  <p className="text-white/70 mb-6">{steps[currentStep].description}</p>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {eventTypes.map((type) => (
                    <div
                      key={type.id}
                      onClick={() => toggleEventType(type.id)}
                      className={`p-4 rounded-lg cursor-pointer transition-all hover:scale-105 ${
                        preferences.eventTypes.includes(type.id)
                          ? `bg-gradient-to-r ${type.color} bg-opacity-20 border-2 border-white/30`
                          : 'bg-white/5 border-2 border-transparent hover:border-white/20'
                      }`}
                    >
                      <div className="text-3xl mb-2">{type.icon}</div>
                      <p className="text-white text-sm font-medium">{type.name}</p>
                      {preferences.eventTypes.includes(type.id) && (
                        <Check className="w-4 h-4 text-white mx-auto mt-2" />
                      )}
                    </div>
                  ))}
                </div>
                <p className="text-white/60 text-sm">{preferences.eventTypes.length} tipos seleccionados</p>
              </div>
            )}

            {/* Notifications Step */}
            {steps[currentStep].content === 'notifications' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold text-white mb-2">{steps[currentStep].title}</h2>
                  <p className="text-white/70 mb-6">{steps[currentStep].description}</p>
                </div>
                <div className="space-y-3 text-left">
                  {Object.entries(preferences.notifications).map(([key, value]) => {
                    const info = notificationLabels[key]
                    if (!info) return null
                    return (
                      <div key={key} className="flex items-center justify-between p-4 rounded-lg bg-white/5 hover:bg-white/8 transition-colors">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="shrink-0">{info.icon}</div>
                          <div className="min-w-0">
                            <p className="text-white font-medium text-sm">{info.label}</p>
                            <p className="text-white/50 text-xs truncate">{info.desc}</p>
                          </div>
                        </div>
                        <button
                          onClick={() => toggleNotification(key)}
                          className={`relative ml-4 w-12 h-6 rounded-full transition-colors shrink-0 ${value ? 'bg-violet-500' : 'bg-white/20'}`}
                        >
                          <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${value ? 'translate-x-6' : 'translate-x-0.5'}`} />
                        </button>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Privacy Step */}
            {steps[currentStep].content === 'privacy' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold text-white mb-2">{steps[currentStep].title}</h2>
                  <p className="text-white/70 mb-6">{steps[currentStep].description}</p>
                </div>
                <div className="space-y-3 text-left">
                  {Object.entries(preferences.privacy).map(([key, value]) => {
                    const info = privacyLabels[key]
                    if (!info) return null
                    return (
                      <div key={key} className="flex items-center justify-between p-4 rounded-lg bg-white/5 hover:bg-white/8 transition-colors">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="shrink-0">{info.icon}</div>
                          <div className="min-w-0">
                            <p className="text-white font-medium text-sm">{info.label}</p>
                            <p className="text-white/50 text-xs truncate">{info.desc}</p>
                          </div>
                        </div>
                        <button
                          onClick={() => togglePrivacy(key)}
                          className={`relative ml-4 w-12 h-6 rounded-full transition-colors shrink-0 ${value ? 'bg-violet-500' : 'bg-white/20'}`}
                        >
                          <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${value ? 'translate-x-6' : 'translate-x-0.5'}`} />
                        </button>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Complete Step */}
            {steps[currentStep].content === 'complete' && (
              <div className="space-y-6">
                <div className="inline-block p-6 rounded-full bg-gradient-to-r from-green-500 to-emerald-500 mb-4">
                  <Check className="w-12 h-12 text-white" />
                </div>
                <h2 className="text-3xl font-bold text-white mb-4">¡Configuración completa!</h2>
                <p className="text-xl text-white/80 mb-6">Tu perfil está listo. ¡Es hora de comenzar a explorar!</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div className="p-4 rounded-lg bg-white/5">
                    <Badge className="bg-violet-500/20 text-violet-300 mb-2">+100 XP</Badge>
                    <p className="text-white/70 text-sm">Bono de bienvenida</p>
                  </div>
                  <div className="p-4 rounded-lg bg-white/5">
                    <Badge className="bg-blue-500/20 text-blue-300 mb-2">Logro: Nuevo Explorador</Badge>
                    <p className="text-white/70 text-sm">Primer logro desbloqueado</p>
                  </div>
                  <div className="p-4 rounded-lg bg-white/5">
                    <Badge className="bg-green-500/20 text-green-300 mb-2">Eventos recomendados</Badge>
                    <p className="text-white/70 text-sm">Basados en tus intereses</p>
                  </div>
                </div>
              </div>
            )}
          </Card>

          {/* Navigation */}
          <div className="flex items-center justify-between mt-8">
            {currentStep > 0 ? (
            <button
              onClick={prevStep}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-white/20 text-white/80 hover:text-white hover:bg-white/10 transition-all text-sm font-medium"
            >
              <ChevronLeft className="w-4 h-4" />
              Anterior
            </button>
            ) : (
              <div /> /* spacer to keep layout */
            )}

            <div className="flex space-x-2">
              {steps.map((_, index) => (
                <div
                  key={index}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    index <= currentStep ? 'bg-violet-400' : 'bg-white/20'
                  }`}
                />
              ))}
            </div>

            <Button
              onClick={nextStep}
              className="bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-700 hover:to-blue-700"
            >
              {currentStep === steps.length - 1 ? 'Comenzar' : 'Siguiente'}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}