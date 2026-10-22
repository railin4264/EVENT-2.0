import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, AreaChart, Area } from 'recharts'
import { TrendingUp, Users, Calendar, Star, Eye, MessageCircle, Share, Award, Target } from 'lucide-react'
import { Card } from './ui/card'

// Icon fallback for compatibility
import { Badge } from './ui/badge'
import { Button } from './ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs'
import { Progress } from './ui/progress'

export function OrganizerStats() {
  const organizerProfile = {
    name: "Raili",
    eventsCreated: 24,
    totalAttendees: 4850,
    averageRating: 4.7,
    totalRevenue: 48500,
    followers: 1240,
    level: "Pro Organizer"
  }

  const monthlyData = [
    { month: 'Ene', eventos: 2, asistentes: 340, ingresos: 3400 },
    { month: 'Feb', eventos: 3, asistentes: 520, ingresos: 5200 },
    { month: 'Mar', eventos: 2, asistentes: 280, ingresos: 2800 },
    { month: 'Abr', eventos: 4, asistentes: 680, ingresos: 6800 },
    { month: 'May', eventos: 3, asistentes: 450, ingresos: 4500 },
    { month: 'Jun', eventos: 5, asistentes: 820, ingresos: 8200 },
    { month: 'Jul', eventos: 2, asistentes: 380, ingresos: 3800 },
    { month: 'Ago', eventos: 3, asistentes: 560, ingresos: 5600 }
  ]

  const categoryData = [
    { name: 'Tecnología', value: 35, color: '#7B2FFF' },
    { name: 'Arte Digital', value: 25, color: '#00E0FF' },
    { name: 'Música', value: 20, color: '#FF00C3' },
    { name: 'Networking', value: 15, color: '#A855F7' },
    { name: 'Otros', value: 5, color: '#06B6D4' }
  ]

  const recentEvents = [
    {
      id: 1,
      title: "Digital Art Workshop",
      date: "20 Nov",
      attendees: 85,
      revenue: 850,
      rating: 4.9,
      views: 1200,
      shares: 45,
      status: "Próximo"
    },
    {
      id: 2,
      title: "UX/UI Design Meetup",
      date: "10 Nov",
      attendees: 120,
      revenue: 1200,
      rating: 4.7,
      views: 2100,
      shares: 78,
      status: "Completado"
    },
    {
      id: 3,
      title: "Creative Coding Session",
      date: "5 Nov",
      attendees: 45,
      revenue: 450,
      rating: 4.8,
      views: 800,
      shares: 23,
      status: "Completado"
    }
  ]

  const performanceMetrics = [
    {
      title: "Tasa de asistencia",
      value: "87%",
      change: "+5%",
      trend: "up",
      icon: Users,
      color: "text-green-400"
    },
    {
      title: "Satisfacción promedio",
      value: "4.7",
      change: "+0.3",
      trend: "up",
      icon: Star,
      color: "text-yellow-400"
    },
    {
      title: "Engagement rate",
      value: "23%",
      change: "-2%",
      trend: "down",
      icon: MessageCircle,
      color: "text-blue-400"
    },
    {
      title: "Alcance promedio",
      value: "2.4K",
      change: "+15%",
      trend: "up",
      icon: Eye,
      color: "text-purple-400"
    }
  ]

  const achievements = [
    {
      title: "Top Organizer",
      description: "Entre los mejores organizadores del mes",
      icon: "🏆",
      earned: true
    },
    {
      title: "Community Builder",
      description: "Más de 1000 seguidores",
      icon: "👥",
      earned: true
    },
    {
      title: "Innovation Leader",
      description: "Eventos únicos y creativos",
      icon: "💡",
      earned: true
    },
    {
      title: "5-Star Master",
      description: "Promedio de 4.5+ estrellas",
      icon: "⭐",
      earned: true
    }
  ]

  const upcomingGoals = [
    {
      title: "Alcanzar 5000 asistentes totales",
      current: 4850,
      target: 5000,
      progress: 97
    },
    {
      title: "Organizar 30 eventos este año",
      current: 24,
      target: 30,
      progress: 80
    },
    {
      title: "Obtener 1500 seguidores",
      current: 1240,
      target: 1500,
      progress: 83
    }
  ]

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Panel de Organizador</h1>
          <p className="text-white/70">Estadísticas y rendimiento de tus eventos</p>
        </div>
        <div className="flex items-center space-x-3">
          <Badge className="bg-violet-500/20 text-violet-300 px-3 py-1">
            {organizerProfile.level}
          </Badge>
          <Button className="bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-700 hover:to-blue-700">
            Crear nuevo evento
          </Button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="glass-card p-6">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-lg bg-violet-500/20 flex items-center justify-center">
              <Calendar className="w-6 h-6 text-violet-400" />
            </div>
            <div>
              <p className="text-white/60 text-sm">Eventos creados</p>
              <p className="text-2xl font-bold text-white">{organizerProfile.eventsCreated}</p>
            </div>
          </div>
        </Card>

        <Card className="glass-card p-6">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-lg bg-blue-500/20 flex items-center justify-center">
              <Users className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <p className="text-white/60 text-sm">Total asistentes</p>
              <p className="text-2xl font-bold text-white">{organizerProfile.totalAttendees.toLocaleString()}</p>
            </div>
          </div>
        </Card>

        <Card className="glass-card p-6">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-lg bg-yellow-500/20 flex items-center justify-center">
              <Star className="w-6 h-6 text-yellow-400" />
            </div>
            <div>
              <p className="text-white/60 text-sm">Rating promedio</p>
              <p className="text-2xl font-bold text-white">{organizerProfile.averageRating}</p>
            </div>
          </div>
        </Card>

        <Card className="glass-card p-6">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-lg bg-green-500/20 flex items-center justify-center">
              
            </div>
            <div>
              <p className="text-white/60 text-sm">Ingresos totales</p>
              <p className="text-2xl font-bold text-white">${organizerProfile.totalRevenue.toLocaleString()}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Performance Metrics */}
      <Card className="glass-card p-6">
        <h3 className="text-xl font-bold text-white mb-6">Métricas de rendimiento</h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          {performanceMetrics.map((metric, index) => {
            const Icon = metric.icon
            return (
              <div key={index} className="text-center">
                <div className={`w-16 h-16 mx-auto rounded-full bg-white/5 flex items-center justify-center mb-3`}>
                  <Icon className={`w-8 h-8 ${metric.color}`} />
                </div>
                <div className="text-2xl font-bold text-white mb-1">{metric.value}</div>
                <div className="text-white/60 text-sm mb-2">{metric.title}</div>
                <Badge className={`${
                  metric.trend === 'up' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                }`}>
                  {metric.change}
                </Badge>
              </div>
            )
          })}
        </div>
      </Card>

      {/* Charts */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 glass-card">
          <TabsTrigger value="overview">Resumen</TabsTrigger>
          <TabsTrigger value="events">Eventos</TabsTrigger>
          <TabsTrigger value="categories">Categorías</TabsTrigger>
          <TabsTrigger value="goals">Objetivos</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Monthly Performance */}
            <Card className="glass-card p-6">
              <h4 className="text-white font-medium mb-4">Rendimiento mensual</h4>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={monthlyData}>
                  <defs>
                    <linearGradient id="colorAsistentes" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#7B2FFF" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#7B2FFF" stopOpacity={0.1}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                  <XAxis dataKey="month" stroke="rgba(255,255,255,0.6)" />
                  <YAxis stroke="rgba(255,255,255,0.6)" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'rgba(255,255,255,0.1)', 
                      border: '1px solid rgba(255,255,255,0.2)',
                      borderRadius: '8px',
                      backdropFilter: 'blur(20px)'
                    }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="asistentes" 
                    stroke="#7B2FFF" 
                    fillOpacity={1} 
                    fill="url(#colorAsistentes)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </Card>

            {/* Revenue Trends */}
            <Card className="glass-card p-6">
              <h4 className="text-white font-medium mb-4">Tendencia de ingresos</h4>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                  <XAxis dataKey="month" stroke="rgba(255,255,255,0.6)" />
                  <YAxis stroke="rgba(255,255,255,0.6)" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'rgba(255,255,255,0.1)', 
                      border: '1px solid rgba(255,255,255,0.2)',
                      borderRadius: '8px',
                      backdropFilter: 'blur(20px)'
                    }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="ingresos" 
                    stroke="#00E0FF" 
                    strokeWidth={3}
                    dot={{ fill: '#00E0FF', strokeWidth: 2, r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="events">
          <Card className="glass-card p-6">
            <h4 className="text-white font-medium mb-6">Eventos recientes</h4>
            <div className="space-y-4">
              {recentEvents.map((event) => (
                <div key={event.id} className="flex items-center justify-between p-4 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
                  <div className="flex-1">
                    <h5 className="text-white font-medium mb-1">{event.title}</h5>
                    <div className="flex items-center space-x-4 text-white/60 text-sm">
                      <span>{event.date}</span>
                      <div className="flex items-center space-x-1">
                        <Users className="w-4 h-4" />
                        <span>{event.attendees}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Eye className="w-4 h-4" />
                        <span>{event.views}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Share className="w-4 h-4" />
                        <span>{event.shares}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="text-center">
                      <div className="text-green-400 font-medium">${event.revenue}</div>
                      <div className="text-white/60 text-xs">Ingresos</div>
                    </div>
                    <div className="text-center">
                      <div className="flex items-center space-x-1">
                        <Star className="w-4 h-4 text-yellow-400 fill-current" />
                        <span className="text-white">{event.rating}</span>
                      </div>
                      <div className="text-white/60 text-xs">Rating</div>
                    </div>
                    <Badge className={`${
                      event.status === 'Próximo' ? 'bg-blue-500/20 text-blue-400' : 'bg-green-500/20 text-green-400'
                    }`}>
                      {event.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="categories">
          <div className="grid lg:grid-cols-2 gap-6">
            <Card className="glass-card p-6">
              <h4 className="text-white font-medium mb-4">Distribución por categoría</h4>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'rgba(255,255,255,0.1)', 
                      border: '1px solid rgba(255,255,255,0.2)',
                      borderRadius: '8px',
                      backdropFilter: 'blur(20px)'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </Card>

            <Card className="glass-card p-6">
              <h4 className="text-white font-medium mb-4">Logros conseguidos</h4>
              <div className="grid grid-cols-2 gap-4">
                {achievements.map((achievement, index) => (
                  <div key={index} className="p-4 rounded-lg bg-white/5 text-center">
                    <div className="text-3xl mb-2">{achievement.icon}</div>
                    <h5 className="text-white font-medium mb-1">{achievement.title}</h5>
                    <p className="text-white/60 text-xs">{achievement.description}</p>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="goals">
          <Card className="glass-card p-6">
            <div className="flex items-center space-x-2 mb-6">
              <Target className="w-5 h-5 text-orange-400" />
              <h4 className="text-white font-medium">Objetivos 2024</h4>
            </div>
            <div className="space-y-6">
              {upcomingGoals.map((goal, index) => (
                <div key={index} className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h5 className="text-white font-medium">{goal.title}</h5>
                    <span className="text-white/60 text-sm">
                      {goal.current} / {goal.target}
                    </span>
                  </div>
                  <div className="space-y-2">
                    <Progress value={goal.progress} className="h-3" />
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-white/60">{goal.progress}% completado</span>
                      {goal.progress >= 90 && (
                        <Badge className="bg-green-500/20 text-green-400">¡Casi lo logras!</Badge>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}