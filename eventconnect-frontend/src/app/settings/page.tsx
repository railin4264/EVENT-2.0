'use client'

import { useState } from 'react'
import Link from 'next/link'
import { User, Bell, Shield, Settings as SettingsIcon, Trash2 } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import ProfileSettings from '@/components/settings/ProfileSettings'
import AccountSettings from '@/components/settings/AccountSettings'
import PrivacySettings from '@/components/settings/PrivacySettings'
import NotificationSettings from '@/components/settings/NotificationSettings'
import PreferencesSettings from '@/components/settings/PreferencesSettings'
import DeleteAccountSection from '@/components/settings/DeleteAccountSection'
import OrganizerVerificationSettings from '@/components/settings/OrganizerVerificationSettings'
import SupportSettings from '@/components/settings/SupportSettings'
import { LifeBuoy } from 'lucide-react'
import { ShieldCheck } from 'lucide-react'

type TabType = 'profile' | 'verification' | 'account' | 'notifications' | 'privacy' | 'preferences' | 'support' | 'danger'

export default function SettingsPage() {
  const { user } = useAuthStore()
  const [activeTab, setActiveTab] = useState<TabType>('profile')

  if (!user) return <main className="grid min-h-dvh place-items-center bg-background p-6 text-foreground"><div className="max-w-md space-y-4"><h1 className="text-2xl font-semibold">Tu configuración</h1><p className="text-muted-foreground">Inicia sesión para cargar y guardar las preferencias de tu cuenta.</p><Link href="/login?redirect=%2Fsettings" className="inline-flex min-h-11 items-center rounded-xl bg-primary px-5 font-medium text-primary-foreground">Entrar a mi cuenta</Link></div></main>

  const tabs = [
    {
      id: 'profile' as TabType,
      label: 'Perfil',
      icon: User,
      description: 'Información personal y redes sociales'
    },
    {
      id: 'verification' as TabType,
      label: 'Verificación de Organizador',
      icon: ShieldCheck,
      description: 'Identidad, RNC/Cédula y sello oficial'
    },
    {
      id: 'account' as TabType,
      label: 'Cuenta',
      icon: SettingsIcon,
      description: 'Email, contraseña y seguridad'
    },
    {
      id: 'notifications' as TabType,
      label: 'Notificaciones',
      icon: Bell,
      description: 'Administra tus notificaciones'
    },
    {
      id: 'privacy' as TabType,
      label: 'Privacidad',
      icon: Shield,
      description: 'Controla tu privacidad'
    },
    {
      id: 'preferences' as TabType,
      label: 'Preferencias',
      icon: SettingsIcon,
      description: 'Tema, idioma y configuración'
    },
    {
      id: 'support' as TabType,
      label: 'Ayuda y Soporte',
      icon: LifeBuoy,
      description: 'Tickets de ayuda, WhatsApp y preguntas frecuentes'
    },
    {
      id: 'danger' as TabType,
      label: 'Eliminar Cuenta',
      icon: Trash2,
      description: 'Zona de peligro',
      danger: true
    }
  ]

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="glass border-b border-border/50 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-primary-100 dark:bg-primary-900/30 rounded-2xl">
              <SettingsIcon className="w-8 h-8 text-primary-600 dark:text-primary-400" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground">
                Configuración
              </h1>
              <p className="text-muted-foreground mt-1">
                Administra tu cuenta y personaliza tu experiencia
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-primary/20 bg-primary/5 p-5">
          <div><h2 className="font-semibold text-foreground">Haz espacio para lo que te gusta</h2><p className="mt-1 text-sm text-muted-foreground">Elige tus intereses o vuelve a personalizar tus recomendaciones cuando quieras.</p></div>
          <Link href="/onboarding?redirect=%2Fsettings" className="inline-flex min-h-11 items-center justify-center rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">Personalizar mis intereses</Link>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Sidebar */}
          <div className="lg:col-span-3">
            <div className="glass rounded-2xl p-4 sticky top-24 border border-white/5">
              <nav className="space-y-1">
                {tabs.map((tab) => {
                  const Icon = tab.icon
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`w-full flex items-start gap-3 px-4 py-3 rounded-xl font-medium transition-all ${activeTab === tab.id
                          ? tab.danger
                            ? 'bg-red-500/10 text-red-500 border border-red-500/20'
                            : 'bg-primary/20 text-primary border border-primary/20'
                          : tab.danger
                            ? 'text-red-500 hover:bg-red-500/10'
                            : 'text-muted-foreground hover:bg-white/5 hover:text-foreground'
                        }`}
                    >
                      <Icon className="w-5 h-5 flex-shrink-0 mt-0.5" />
                      <div className="text-left">
                        <div className="font-semibold">{tab.label}</div>
                        <div className="text-xs opacity-75 mt-0.5">
                          {tab.description}
                        </div>
                      </div>
                    </button>
                  )
                })}
              </nav>

              {/* User Info Card */}
              <div className="mt-6 p-4 rounded-xl glass border border-primary/20 bg-primary/5">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-primary-500 flex items-center justify-center text-white font-bold">
                    {user?.firstName?.[0]}
                    {user?.lastName?.[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground truncate">
                      {user?.firstName} {user?.lastName}
                    </p>
                    <p className="text-sm text-muted-foreground truncate">
                      @{user?.username}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="lg:col-span-9">
            <div key={user.id || user._id} className="glass rounded-2xl p-8 border border-white/5">
              {activeTab === 'profile' && <ProfileSettings user={user} />}
              {activeTab === 'verification' && <OrganizerVerificationSettings />}
              {activeTab === 'account' && <AccountSettings user={user} />}
              {activeTab === 'notifications' && <NotificationSettings user={user} />}
              {activeTab === 'privacy' && <PrivacySettings user={user} onRequestSupport={() => setActiveTab('support')} />}
              {activeTab === 'preferences' && <PreferencesSettings user={user} />}
              {activeTab === 'support' && <SupportSettings user={user} />}
              {activeTab === 'danger' && <DeleteAccountSection />}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
