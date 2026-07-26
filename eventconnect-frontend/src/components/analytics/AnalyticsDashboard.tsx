'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Area,
  AreaChart
} from 'recharts'
import { TrendingUp, Users, Calendar, Eye, Clock, Star, Download, MousePointer, Smartphone, Monitor, Globe } from 'lucide-react'


interface AnalyticsData {
  overview: {
    totalUsers: number
    activeUsers: number
    totalEvents: number
    totalPageViews: number
    averageSessionDuration: number
    bounceRate: number
  }
  userGrowth: Array<{
    date: string
    users: number
    newUsers: number
  }>
  eventMetrics: Array<{
    name: string
    views: number
    joins: number
    shares: number
  }>
  deviceStats: Array<{
    device: string
    users: number
    percentage: number
  }>
  pageViews: Array<{
    page: string
    views: number
    avgTime: number
  }>
  realTimeMetrics: {
    activeUsers: number
    currentPageViews: number
    topPages: string[]
    recentEvents: string[]
  }
}

interface AnalyticsDashboardProps {
  data?: AnalyticsData
  isLoading?: boolean
  timeRange?: '24h' | '7d' | '30d' | '90d'
  onTimeRangeChange?: (range: string) => void
}

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4']

export function AnalyticsDashboard({
  data, 
  isLoading = false, 
  timeRange = '7d',
  onTimeRangeChange 
}: AnalyticsDashboardProps) {
  const [selectedMetric, setSelectedMetric] = useState<string>('users')

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`
    }
    if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`
    }
    return num.toString()
  }

  const StatCard = ({ 
    title, 
    value, 
    change, 
    icon: Icon, 
    color = 'blue' 
  }: { 
    title: string
    value: string | number
    change?: string
    icon: React.ComponentType<any>
    color?: string 
  }) => (
    <div className="glass bg-white/5 border border-white/10 rounded-3xl hover:shadow-2xl hover:shadow-primary/20 transition-all p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-2">{title}</p>
          <p className="text-4xl font-extrabold text-foreground">{value}</p>
          {change && (
            <div className="flex items-center mt-3 text-sm text-green-400 font-medium">
              <TrendingUp className="h-4 w-4 mr-1" />
              {change}
            </div>
          )}
        </div>
        <div className={`p-4 rounded-full bg-${color}-500/20 backdrop-blur-md`}>
          <Icon className={`h-8 w-8 text-${color}-400`} />
        </div>
      </div>
    </div>
  )

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="animate-pulse glass bg-white/5 border border-white/10 rounded-3xl p-6">
              <div className="h-16 bg-white/10 rounded-xl mb-2" />
              <div className="h-8 bg-white/10 rounded-xl w-1/2" />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[1, 2].map((i) => (
            <div key={i} className="animate-pulse glass bg-white/5 border border-white/10 rounded-3xl p-6">
              <div className="h-64 bg-white/10 rounded-2xl" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="glass bg-white/5 border border-white/10 rounded-3xl p-12 text-center text-muted-foreground font-medium">
          No hay datos de analíticas disponibles en este momento.
        </div>
      </div>
    )
  }

  const timeRangeLabels: Record<string, string> = {
    '24h': 'Últimas 24h',
    '7d': '7 Días',
    '30d': '30 Días',
    '90d': '90 Días'
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-extrabold text-foreground tracking-tight">Panel de Analíticas</h1>
          <p className="text-lg text-muted-foreground mt-2">
            Métricas y rendimiento de tu plataforma en vivo.
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <div className="glass bg-white/10 rounded-full p-1 flex">
            {['24h', '7d', '30d', '90d'].map((range) => (
              <button
                key={range}
                className={`px-4 py-2 rounded-full font-bold text-sm transition-all ${
                  timeRange === range
                    ? 'btn-gradient text-white shadow-lg'
                    : 'text-muted-foreground hover:text-white hover:bg-white/5'
                }`}
                onClick={() => onTimeRangeChange?.(range)}
              >
                {timeRangeLabels[range] || range}
              </button>
            ))}
          </div>
          
          <button className="flex items-center gap-2 px-5 py-2 glass bg-white/10 text-white rounded-full font-bold hover:bg-white/20 transition-colors border border-white/10">
            <Download className="h-4 w-4" />
            Exportar
          </button>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Usuarios Totales"
          value={formatNumber(data.overview.totalUsers)}
          change="+12.5%"
          icon={Users}
          color="blue"
        />
        <StatCard
          title="Usuarios Activos"
          value={formatNumber(data.overview.activeUsers)}
          change="+8.2%"
          icon={Eye}
          color="green"
        />
        <StatCard
          title="Eventos Totales"
          value={formatNumber(data.overview.totalEvents)}
          change="+15.3%"
          icon={Calendar}
          color="purple"
        />
        <StatCard
          title="Páginas Vistas"
          value={formatNumber(data.overview.totalPageViews)}
          change="+5.7%"
          icon={MousePointer}
          color="orange"
        />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* User Growth Chart */}
        <div className="glass bg-white/5 border border-white/10 rounded-3xl p-6">
          <h3 className="text-xl font-bold mb-6 text-foreground">Crecimiento de Usuarios</h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={data.userGrowth}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff20" />
              <XAxis dataKey="date" stroke="#ffffff50" />
              <YAxis stroke="#ffffff50" />
              <Tooltip 
                contentStyle={{ backgroundColor: '#000000cc', borderColor: '#ffffff20', borderRadius: '1rem', color: '#fff' }}
                itemStyle={{ color: '#fff' }}
              />
              <Area 
                type="monotone" 
                dataKey="users" 
                name="Usuarios"
                stroke="#3B82F6" 
                fill="#3B82F6" 
                fillOpacity={0.2}
              />
              <Area 
                type="monotone" 
                dataKey="newUsers"
                name="Nuevos Usuarios" 
                stroke="#10B981" 
                fill="#10B981" 
                fillOpacity={0.2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Device Stats */}
        <div className="glass bg-white/5 border border-white/10 rounded-3xl p-6">
          <h3 className="text-xl font-bold mb-6 text-foreground">Distribución de Dispositivos</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={data.deviceStats}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percentage }) => `${name} ${percentage}%`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="users"
              >
                {data.deviceStats.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ backgroundColor: '#000000cc', borderColor: '#ffffff20', borderRadius: '1rem', color: '#fff' }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Event Metrics */}
        <div className="glass bg-white/5 border border-white/10 rounded-3xl p-6">
          <h3 className="text-xl font-bold mb-6 text-foreground">Rendimiento de Eventos Top</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.eventMetrics}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff20" />
              <XAxis dataKey="name" stroke="#ffffff50" />
              <YAxis stroke="#ffffff50" />
              <Tooltip 
                contentStyle={{ backgroundColor: '#000000cc', borderColor: '#ffffff20', borderRadius: '1rem', color: '#fff' }}
              />
              <Bar dataKey="views" name="Visualizaciones" fill="#3B82F6" radius={[4, 4, 0, 0]} />
              <Bar dataKey="joins" name="Asistencias" fill="#10B981" radius={[4, 4, 0, 0]} />
              <Bar dataKey="shares" name="Compartidos" fill="#F59E0B" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Real-time Metrics */}
        <div className="glass bg-white/5 border border-white/10 rounded-3xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <h3 className="text-xl font-bold text-foreground">Actividad en Tiempo Real</h3>
            <span className="px-3 py-1 bg-green-500/20 text-green-400 text-xs font-bold uppercase rounded-full border border-green-500/30 flex items-center gap-2">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              En Vivo
            </span>
          </div>
          
          <div className="space-y-6">
            <div className="flex items-center justify-between p-4 glass bg-black/20 rounded-2xl border border-white/5">
              <span className="font-semibold text-muted-foreground">Usuarios Activos</span>
              <span className="text-2xl font-extrabold text-white">{data.realTimeMetrics.activeUsers}</span>
            </div>
            
            <div className="flex items-center justify-between p-4 glass bg-black/20 rounded-2xl border border-white/5">
              <span className="font-semibold text-muted-foreground">Vistas por minuto</span>
              <span className="text-2xl font-extrabold text-white">{data.realTimeMetrics.currentPageViews}</span>
            </div>
            
            <div>
              <span className="text-sm font-bold text-muted-foreground uppercase tracking-wider block mb-3">Páginas más visitadas</span>
              <div className="space-y-2">
                {data.realTimeMetrics.topPages.map((page, index) => (
                  <div key={page} className="flex items-center gap-3 p-3 glass bg-white/5 rounded-xl border border-white/5">
                    <span className="w-6 h-6 flex items-center justify-center bg-white/10 rounded-full text-xs font-bold text-white">
                      {index + 1}
                    </span>
                    <span className="font-medium text-foreground">{page}</span>
                  </div>
                ))}
              </div>
            </div>
            
            <div>
              <span className="text-sm font-bold text-muted-foreground uppercase tracking-wider block mb-3">Eventos Recientes</span>
              <div className="space-y-2">
                {data.realTimeMetrics.recentEvents.map((event, index) => (
                  <div key={index} className="flex items-center gap-3 p-3 glass bg-white/5 rounded-xl border border-white/5">
                    <div className="w-2 h-2 bg-primary-400 rounded-full shadow-[0_0_8px_rgba(var(--primary-400),0.8)]" />
                    <span className="text-sm font-medium text-muted-foreground capitalize">{event.replace('_', ' ')}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Page Performance Table */}
      <div className="glass bg-white/5 border border-white/10 rounded-3xl p-6 overflow-hidden">
        <h3 className="text-xl font-bold mb-6 text-foreground">Rendimiento por Página</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/10">
                <th className="py-4 px-4 font-bold text-muted-foreground uppercase text-xs tracking-wider">Página</th>
                <th className="py-4 px-4 font-bold text-muted-foreground uppercase text-xs tracking-wider text-right">Vistas</th>
                <th className="py-4 px-4 font-bold text-muted-foreground uppercase text-xs tracking-wider text-right">Tiempo Prom.</th>
                <th className="py-4 px-4 font-bold text-muted-foreground uppercase text-xs tracking-wider text-right">Rendimiento</th>
              </tr>
            </thead>
            <tbody>
              {data.pageViews.map((page, index) => (
                <tr key={page.page} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                  <td className="py-4 px-4 font-bold text-white">{page.page}</td>
                  <td className="py-4 px-4 text-right text-muted-foreground">{formatNumber(page.views)}</td>
                  <td className="py-4 px-4 text-right text-muted-foreground">{formatDuration(page.avgTime)}</td>
                  <td className="py-4 px-4 text-right">
                    <div className="flex items-center justify-end gap-3">
                      <div className="w-24 h-2 bg-black/40 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-primary-500 to-secondary-500 rounded-full shadow-[0_0_10px_rgba(var(--primary-500),0.8)]"
                          style={{ width: `${Math.min(100, (page.avgTime / 300) * 100)}%` }}
                        />
                      </div>
                      <span className="text-sm font-bold text-white">
                        {Math.round((page.avgTime / 300) * 100)}%
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default AnalyticsDashboard