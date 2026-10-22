import { Home, Calendar, MapPin, MessageCircle, User, Search, Bell, Settings, Users, TrendingUp } from 'lucide-react'
import { NotificationBell } from './Notifications'

// Icon fallback for compatibility
const Map = MapPin // Use MapPin as fallback for Map icon
const Trophy = TrendingUp // Use TrendingUp as fallback for Trophy icon

interface NavigationProps {
  activeView: string
  setActiveView: (view: string) => void
  onNotificationsToggle: () => void
}

export function Navigation({ activeView, setActiveView, onNotificationsToggle }: NavigationProps) {
  const navItems = [
    { id: 'home', label: 'Inicio', icon: Home },
    { id: 'events', label: 'Eventos', icon: Calendar },
    { id: 'map', label: 'Mapa', icon: Map },
    { id: 'tribes', label: 'Tribes', icon: Users },
    { id: 'chat', label: 'Chat', icon: MessageCircle },
    { id: 'gamification', label: 'Logros', icon: Trophy },
    { id: 'organizer-stats', label: 'Estadísticas', icon: TrendingUp },
    { id: 'profile', label: 'Perfil', icon: User },
  ]

  return (
    <div className="fixed left-0 top-0 h-full w-64 glass-card border-r border-white/10 z-50">
      {/* Logo */}
      <div className="p-6 border-b border-white/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-lg gradient-cosmic flex items-center justify-center">
              <span className="text-white font-bold">EC</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Event Connect</h1>
              <p className="text-sm text-white/60">Tu mundo social</p>
            </div>
          </div>
          <NotificationBell onClick={onNotificationsToggle} />
        </div>
      </div>

      {/* Navigation Items */}
      <nav className="p-4 space-y-2">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = activeView === item.id
          
          return (
            <button
              key={item.id}
              onClick={() => setActiveView(item.id)}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-300 ${
                isActive 
                  ? 'bg-gradient-to-r from-violet-500/20 to-blue-500/20 neon-glow-violet border border-violet-500/30' 
                  : 'hover:bg-white/5 hover:border hover:border-white/10'
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? 'text-violet-400' : 'text-white/70'}`} />
              <span className={`${isActive ? 'text-white' : 'text-white/70'}`}>
                {item.label}
              </span>
            </button>
          )
        })}
      </nav>

      {/* User Section */}
      <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-white/10">
        <div className="flex items-center space-x-3 p-3 rounded-lg hover:bg-white/5 transition-colors cursor-pointer" onClick={() => setActiveView('profile')}>
          <div className="w-10 h-10 rounded-full bg-gradient-to-r from-violet-500 to-cyan-500 flex items-center justify-center">
            <span className="text-white font-bold">R</span>
          </div>
          <div className="flex-1">
            <p className="text-white font-medium">Raili</p>
            <p className="text-sm text-white/60">Nivel 12 • 2,450 XP</p>
          </div>
          <button 
            onClick={(e) => {
              e.stopPropagation()
              setActiveView('settings')
            }}
            className="p-1 rounded hover:bg-white/10 transition-colors"
          >
            <Settings className="w-5 h-5 text-white/50 hover:text-white" />
          </button>
        </div>
      </div>
    </div>
  )
}