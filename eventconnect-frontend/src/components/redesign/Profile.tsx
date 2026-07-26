import { useState, useEffect } from 'react'
import { Settings, Edit, Share, Users, Calendar, Star, MapPin, Camera, Plus, Loader2 , Trophy} from 'lucide-react'
import { Card } from './ui/card'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs'
import { Progress } from './ui/progress'
import { ImageWithFallback } from './figma/ImageWithFallback'
import { usersService, eventsService, authService } from '@/lib/api/services'
import type { User, PublicUser, Event } from '@/types/models'
import toast from 'react-hot-toast'
import { useAuth } from '@/lib/providers/AuthProvider'

export function Profile() {
  const { user: currentUser } = useAuth()
  const [userProfile, setUserProfile] = useState<User | PublicUser | null>(null)
  const [createdEvents, setCreatedEvents] = useState<Event[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadUserProfile()
  }, [currentUser])

  const loadUserProfile = async () => {
    setIsLoading(true)
    try {
      if (currentUser?._id) {
        // Load user profile
        const userData = await usersService.getUserById(currentUser._id)
        setUserProfile(userData)

        // Load user events (created events)
        const userEvents = await usersService.getUserEvents(currentUser._id)
        setCreatedEvents(userEvents)
      } else {
        toast('Inicia sesión para ver tu perfil')
        setUserProfile(null)
      }
    } catch (error) {
      console.error('Error loading profile:', error)
      toast.error('Error al cargar el perfil. Verifica la conexión con el backend.')
      setUserProfile(null)
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
      </div>
    )
  }

  if (!userProfile) {
    return (
      <div className="flex flex-col items-center justify-center h-96">
        <p className="text-white/70 mb-4">Perfil no encontrado</p>
        <Button onClick={loadUserProfile}>Reintentar</Button>
      </div>
    )
  }

  const recentActivity = [
    {
      type: "attended",
      event: "Festival de Música Electrónica",
      time: "hace 2 días",
      xp: 50
    },
    {
      type: "achieved",
      achievement: "Social Butterfly",
      time: "hace 3 días",
      xp: 500
    },
    {
      type: "created",
      event: "Digital Art Workshop",
      time: "hace 1 semana",
      xp: 200
    },
    {
      type: "connection",
      user: "Alex Rivera",
      time: "hace 1 semana",
      xp: 25
    }
  ]

  const achievements = [
    { icon: "🦋", name: "Social Butterfly", rarity: "epic" },
    { icon: "👑", name: "Festival King", rarity: "legendary" },
    { icon: "🎭", name: "Event Creator", rarity: "rare" },
    { icon: "🌟", name: "Rising Star", rarity: "rare" },
    { icon: "🔥", name: "Trendsetter", rarity: "epic" },
    { icon: "💻", name: "Tech Guru", rarity: "rare" }
  ]

  // Calculate XP progress using usersService helper
  const xpProgress = usersService.calculateXPProgress(userProfile.xp)
  const progressPercentage = xpProgress.progress

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Profile Header */}
      <Card className="glass-card overflow-hidden">
        {/* Cover Image */}
        <div className="h-48 gradient-cosmic relative">
          <div className="absolute inset-0 particle-bg"></div>
          <Button 
            size="sm" 
            variant="ghost" 
            className="absolute top-4 right-4 glass-card hover:bg-white/20"
          >
            <Camera className="w-4 h-4 mr-2" />
            Cambiar portada
          </Button>
        </div>

        {/* Profile Info */}
        <div className="p-8 -mt-20 relative">
          <div className="flex flex-col lg:flex-row items-start lg:items-end space-y-4 lg:space-y-0 lg:space-x-6">
            {/* Avatar */}
            <div className="relative">
              <div className="w-32 h-32 rounded-full bg-gradient-to-r from-violet-500 to-pink-500 p-1">
                <div className="w-full h-full rounded-full bg-gray-800 flex items-center justify-center">
                  <span className="text-4xl font-bold text-white">R</span>
                </div>
              </div>
              <Button 
                size="sm" 
                className="absolute bottom-2 right-2 w-8 h-8 rounded-full bg-violet-600 hover:bg-violet-700 p-0"
              >
                <Camera className="w-4 h-4" />
              </Button>
              
              {/* Level Badge */}
              <div className="absolute -top-2 -right-2 w-12 h-12 rounded-full bg-gradient-to-r from-yellow-500 to-orange-500 flex items-center justify-center border-4 border-gray-800">
                <span className="text-white font-bold">{userProfile.level}</span>
              </div>
            </div>

            {/* User Info */}
            <div className="flex-1">
              <div className="flex items-center space-x-3 mb-2">
                <h1 className="text-3xl font-bold text-white">{usersService.getFullName(userProfile)}</h1>
                <Badge className="bg-violet-500/20 text-violet-300">Verificado</Badge>
              </div>
              <p className="text-lg text-white/70 mb-2">{userProfile.username}</p>
              <p className="text-white/80 max-w-2xl mb-4">{userProfile.bio}</p>
              
              <div className="flex items-center space-x-6 text-white/70">
                <div className="flex items-center space-x-1">
                  <MapPin className="w-4 h-4" />
                  <span>{userProfile.location || 'Ubicación no especificada'}</span>
                </div>
                {'createdAt' in userProfile && (
                  <div className="flex items-center space-x-1">
                    <Calendar className="w-4 h-4" />
                    <span>Se unió en {new Date(userProfile.createdAt).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-3">
              <Button variant="outline" className="border-white/20 text-white hover:bg-white/10">
                <Edit className="w-4 h-4 mr-2" />
                Editar perfil
              </Button>
              <Button variant="outline" className="border-white/20 text-white hover:bg-white/10">
                <Share className="w-4 h-4 mr-2" />
                Compartir
              </Button>
              <Button variant="outline" className="border-white/20 text-white hover:bg-white/10">
                <Settings className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-4 gap-8 mt-8 pt-8 border-t border-white/10">
            <div className="text-center">
              <div className="text-2xl font-bold text-white">{userProfile.followers.toLocaleString()}</div>
              <div className="text-white/60">Seguidores</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-white">{userProfile.following.toLocaleString()}</div>
              <div className="text-white/60">Siguiendo</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-white">{userProfile.eventsAttended}</div>
              <div className="text-white/60">Eventos asistidos</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-white">{userProfile.eventsCreated}</div>
              <div className="text-white/60">Eventos creados</div>
            </div>
          </div>

          {/* Level Progress */}
          <div className="mt-6 p-4 rounded-lg bg-white/5">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-white/70">Nivel {userProfile.level}</span>
              <span className="text-white/70">{xpProgress.currentLevelXP}/{xpProgress.nextLevelXP} XP</span>
            </div>
            <Progress value={progressPercentage} className="h-3 mb-2" />
            <p className="text-xs text-white/60">{xpProgress.nextLevelXP - xpProgress.currentLevelXP} XP para el siguiente nivel</p>
          </div>
        </div>
      </Card>

      {/* Content Tabs */}
      <Tabs defaultValue="events" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 glass-card">
          <TabsTrigger value="events">Mis Eventos</TabsTrigger>
          <TabsTrigger value="achievements">Logros</TabsTrigger>
          <TabsTrigger value="activity">Actividad</TabsTrigger>
          <TabsTrigger value="stats">Estadísticas</TabsTrigger>
        </TabsList>

        <TabsContent value="events">
          <div className="grid gap-6">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold text-white">Eventos creados</h3>
              <Button className="bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-700 hover:to-blue-700">
                <Plus className="w-4 h-4 mr-2" />
                Crear evento
              </Button>
            </div>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {createdEvents.map((event) => (
                <Card key={event._id} className="glass-card overflow-hidden hover-lift">
                  <ImageWithFallback
                    src={event.images[0]?.url || '/placeholder-event.jpg'}
                    alt={event.title}
                    className="w-full h-48 object-cover"
                  />
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <Badge className={`${
                        event.status === 'published' ? 'bg-green-500/20 text-green-400' :
                        event.status === 'draft' ? 'bg-blue-500/20 text-blue-400' :
                        event.status === 'cancelled' ? 'bg-red-500/20 text-red-400' :
                        'bg-gray-500/20 text-gray-400'
                      }`}>
                        {event.status === 'published' ? 'Publicado' :
                         event.status === 'draft' ? 'Borrador' :
                         event.status === 'cancelled' ? 'Cancelado' : 'Completado'}
                      </Badge>
                      <div className="flex items-center space-x-1">
                        <Star className="w-4 h-4 text-yellow-400 fill-current" />
                        <span className="text-white/70 text-sm">{event.likesCount || 0}</span>
                      </div>
                    </div>
                    <h4 className="text-white font-medium mb-2">{event.title}</h4>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-white/60">{new Date(event.date).toLocaleDateString('es-ES')}</span>
                      <div className="flex items-center space-x-1 text-white/60">
                        <Users className="w-4 h-4" />
                        <span>{event.attendeesCount}</span>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="achievements">
          <div className="grid gap-6">
            <h3 className="text-xl font-bold text-white">Logros desbloqueados ({achievements.length})</h3>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {achievements.map((achievement, index) => (
                <Card key={index} className="glass-card p-6 text-center hover-lift">
                  <div className="text-4xl mb-4">{achievement.icon}</div>
                  <h4 className="text-white font-medium mb-2">{achievement.name}</h4>
                  <Badge className={`${
                    achievement.rarity === 'legendary' ? 'bg-yellow-500/20 text-yellow-400' :
                    achievement.rarity === 'epic' ? 'bg-purple-500/20 text-purple-400' :
                    'bg-blue-500/20 text-blue-400'
                  }`}>
                    {achievement.rarity}
                  </Badge>
                </Card>
              ))}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="activity">
          <Card className="glass-card p-6">
            <h3 className="text-xl font-bold text-white mb-6">Actividad reciente</h3>
            <div className="space-y-4">
              {recentActivity.map((activity, index) => (
                <div key={index} className="flex items-center space-x-4 p-4 rounded-lg hover:bg-white/5 transition-colors">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    activity.type === 'attended' ? 'bg-blue-500/20' :
                    activity.type === 'achieved' ? 'bg-yellow-500/20' :
                    activity.type === 'created' ? 'bg-violet-500/20' :
                    'bg-green-500/20'
                  }`}>
                    {activity.type === 'attended' && <Calendar className="w-5 h-5 text-blue-400" />}
                    {activity.type === 'achieved' && <Trophy className="w-5 h-5 text-yellow-400" />}
                    {activity.type === 'created' && <Plus className="w-5 h-5 text-violet-400" />}
                    {activity.type === 'connection' && <Users className="w-5 h-5 text-green-400" />}
                  </div>
                  <div className="flex-1">
                    <p className="text-white">
                      {activity.type === 'attended' && `Asististe a ${activity.event}`}
                      {activity.type === 'achieved' && `Desbloqueaste el logro "${activity.achievement}"`}
                      {activity.type === 'created' && `Creaste el evento "${activity.event}"`}
                      {activity.type === 'connection' && `Te conectaste con ${activity.user}`}
                    </p>
                    <p className="text-white/60 text-sm">{activity.time}</p>
                  </div>
                  <Badge className="bg-green-500/20 text-green-400">+{activity.xp} XP</Badge>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="stats">
          <div className="grid md:grid-cols-2 gap-6">
            <Card className="glass-card p-6">
              <h4 className="text-white font-medium mb-4">Intereses</h4>
              <div className="space-y-3">
                {userProfile.interests.length > 0 ? (
                  userProfile.interests.map((interest, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <span className="text-white/80">{interest}</span>
                      <Badge className="bg-violet-500/20 text-violet-300">
                        Interés
                      </Badge>
                    </div>
                  ))
                ) : (
                  <p className="text-white/60">No hay intereses registrados</p>
                )}
              </div>
            </Card>

            <Card className="glass-card p-6">
              <h4 className="text-white font-medium mb-4">Resumen del año</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 rounded-lg bg-white/5">
                  <div className="text-2xl font-bold text-white">{userProfile.eventsAttended}</div>
                  <div className="text-sm text-white/60">Eventos asistidos</div>
                </div>
                <div className="text-center p-3 rounded-lg bg-white/5">
                  <div className="text-2xl font-bold text-white">{userProfile.eventsCreated}</div>
                  <div className="text-sm text-white/60">Eventos creados</div>
                </div>
                <div className="text-center p-3 rounded-lg bg-white/5">
                  <div className="text-2xl font-bold text-white">{userProfile.followers}</div>
                  <div className="text-sm text-white/60">Seguidores</div>
                </div>
                <div className="text-center p-3 rounded-lg bg-white/5">
                  <div className="text-2xl font-bold text-white">{achievements.length}</div>
                  <div className="text-sm text-white/60">Logros conseguidos</div>
                </div>
              </div>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}