'use client'

import { useState } from 'react'
import { HeroSection } from './hero/HeroSection'
import { Navigation } from './redesign/Navigation'
import { Dashboard } from './redesign/Dashboard'
import { EventDetail } from './redesign/EventDetail'
import { Gamification } from './redesign/Gamification'
import { MapView } from './redesign/MapView'
import { Chat } from './redesign/Chat'
import { Profile } from './redesign/Profile'
import { Tribes } from './redesign/Tribes'
import { OrganizerStats } from './redesign/OrganizerStats'
import { Notifications } from './redesign/Notifications'
import { Settings } from './redesign/Settings'
import { UserProvider, useUser } from './redesign/UserContext'

function MainAppContent() {
  const { user, logout } = useUser()
  const [activeView, setActiveView] = useState<string>('home')
  const [showEventDetail, setShowEventDetail] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)

  const renderContent = () => {
    // Show EventDetail modal if active
    if (showEventDetail) {
      return <EventDetail onBack={() => setShowEventDetail(false)} />
    }

    // Render view based on activeView
    switch (activeView) {
      case 'home':
        return (
          <HeroSection
            onEventClick={() => setShowEventDetail(true)}
            onExploreClick={() => setActiveView('dashboard')}
            onCreateClick={() => setActiveView('dashboard')}
          />
        )
      case 'dashboard':
      case 'events':
        return <Dashboard />
      case 'map':
        return <MapView />
      case 'tribes':
        return <Tribes />
      case 'chat':
        return <Chat />
      case 'gamification':
        return <Gamification />
      case 'organizer-stats':
        return <OrganizerStats />
      case 'profile':
        return <Profile />
      case 'settings':
        return <Settings />
      default:
        return (
          <HeroSection
            onEventClick={() => setShowEventDetail(true)}
            onExploreClick={() => setActiveView('dashboard')}
            onCreateClick={() => setActiveView('dashboard')}
          />
        )
    }
  }

  return (
    <div className="min-h-screen bg-[#0C0B10] text-white dark">
      {/* Navigation - Only visible when NOT on home */}
      {activeView !== 'home' && (
        <Navigation
          activeView={activeView}
          setActiveView={setActiveView}
          onNotificationsToggle={() => setShowNotifications(!showNotifications)}
        />
      )}

      {/* Main Content */}
      <div className={activeView !== 'home' ? 'ml-64' : ''}>
        <div className="min-h-screen">
          {renderContent()}
        </div>
      </div>

      {/* Notifications Panel */}
      <Notifications
        isOpen={showNotifications}
        onClose={() => setShowNotifications(false)}
      />

      {/* Floating Buttons for Home */}
      {activeView === 'home' && (
        <div className="fixed top-8 right-8 z-50 flex items-center space-x-4">
          <button
            onClick={() => setActiveView('dashboard')}
            className="glass-card px-6 py-3 rounded-full text-white hover:bg-white/20 transition-all hover:scale-105 border border-white/20"
          >
            Entrar a la plataforma
          </button>
          {user && (
            <button
              onClick={() => setActiveView('profile')}
              className="glass-card px-4 py-3 rounded-full text-white/70 hover:text-white hover:bg-white/10 transition-all hover:scale-105"
            >
              Mi perfil
            </button>
          )}
        </div>
      )}

      {/* Floating Action Button for Dashboard */}
      {(activeView === 'dashboard' || activeView === 'events') && !showEventDetail && (
        <button
          onClick={() => setShowEventDetail(true)}
          className="fixed bottom-8 right-8 w-16 h-16 rounded-full bg-gradient-to-r from-violet-600 to-cyan-600 flex items-center justify-center neon-glow-violet hover:scale-110 transition-transform z-50 shadow-xl"
          aria-label="Ver evento destacado"
        >
          <span className="text-2xl">🎵</span>
        </button>
      )}
    </div>
  )
}

export function MainApp() {
  return (
    <UserProvider>
      <MainAppContent />
    </UserProvider>
  )
}
