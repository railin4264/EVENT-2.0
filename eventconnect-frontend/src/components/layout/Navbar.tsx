'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Menu, X, Home, Calendar, Users, MessageCircle, User,
  Settings, LogOut, Search, PlusCircle, MapPin, ChevronDown,
  LayoutDashboard, Compass
} from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import NotificationCenter from '@/components/redesign/ui/notification-center'
import { CompactThemeToggle } from '@/components/redesign/ui/theme-toggle'
import { cn } from '@/lib/utils'

const navigation = [
  { name: 'Descubrir', href: '/discovery', icon: Compass },
  { name: 'Eventos', href: '/events', icon: Calendar },
  { name: 'Feed', href: '/feed', icon: Home, protected: true },
  { name: 'Tribus', href: '/tribes', icon: Users },
  { name: 'Chat', href: '/messages', icon: MessageCircle, protected: true },
]

export default function Navbar() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)
  const [isHydrated, setIsHydrated] = useState(false)
  const [searchValue, setSearchValue] = useState('')

  const profileRef = useRef<HTMLDivElement>(null)
  const { user, isAuthenticated, logout, initializeAuth } = useAuthStore()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    initializeAuth()
    setIsHydrated(true)
  }, [initializeAuth])

  // Scroll detection for background change
  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 12)
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Click outside closes profile dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setIsProfileOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Escape key closes all menus
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsProfileOpen(false)
        setIsMobileMenuOpen(false)
      }
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [])

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false)
    setIsProfileOpen(false)
  }, [pathname])

  const handleLogout = useCallback(() => {
    logout()
    router.push('/')
    setIsProfileOpen(false)
  }, [logout, router])

  const isActivePath = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href)

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchValue.trim()) {
      router.push(`/discovery?q=${encodeURIComponent(searchValue.trim())}`)
      setSearchValue('')
    }
  }

  return (
    <header
      role="banner"
      className={cn(
        'hidden md:block sticky top-0 z-50 transition-all duration-300',
        isScrolled
          ? 'bg-white/80 dark:bg-gray-950/80 backdrop-blur-2xl shadow-sm border-b border-black/5 dark:border-white/5'
          : 'bg-transparent'
      )}
    >
      <nav aria-label="Main navigation" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">

          {/* Logo */}
          <div className="flex items-center gap-8">
            <Link
              href="/"
              aria-label="EventConnect home"
              className="flex items-center gap-2.5 group"
            >
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20 group-hover:shadow-emerald-500/40 transition-shadow">
                <Calendar className="w-4 h-4 text-white" />
              </div>
              <span className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">
                Event<span className="text-emerald-500">Now</span>
              </span>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden lg:flex items-center gap-1" role="list">
              {navigation.map((item) => {
                if (item.protected && !isAuthenticated) return null
                const active = isActivePath(item.href)
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    role="listitem"
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'relative px-3 py-2 rounded-xl text-sm font-medium transition-colors duration-200 flex items-center gap-1.5',
                      active
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100/80 dark:hover:bg-white/5'
                    )}
                  >
                    <item.icon className="w-4 h-4 shrink-0" aria-hidden="true" />
                    {item.name}
                    {active && (
                      <motion.div
                        layoutId="navActiveIndicator"
                        className="absolute inset-0 bg-emerald-500/10 dark:bg-emerald-500/15 rounded-xl -z-10"
                        transition={{ type: 'spring', duration: 0.4 }}
                      />
                    )}
                  </Link>
                )
              })}
            </div>
          </div>

          {/* Right Side */}
          <div className="flex items-center gap-2">

            {/* Search — Desktop */}
            <form onSubmit={handleSearch} className="hidden lg:block" role="search">
              <div className="relative">
                <Search
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none"
                  aria-hidden="true"
                />
                <input
                  type="search"
                  value={searchValue}
                  onChange={(e) => setSearchValue(e.target.value)}
                  placeholder="Buscar eventos…"
                  aria-label="Buscar eventos"
                  className="w-56 pl-9 pr-4 py-2 text-sm bg-gray-100/80 dark:bg-white/5 border border-transparent focus:border-emerald-500/50 focus:bg-white dark:focus:bg-white/10 rounded-xl outline-none transition-all placeholder:text-gray-400"
                />
              </div>
            </form>

            {/* Search — Mobile icon */}
            <Link
              href="/discovery"
              aria-label="Buscar"
              className="lg:hidden p-2 rounded-xl text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
            >
              <Search className="w-5 h-5" />
            </Link>

            {!isHydrated ? (
              <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse" aria-hidden="true" />
            ) : isAuthenticated ? (
              <>
                {/* Create Event */}
                <Link
                  href="/events/create"
                  className="hidden lg:flex items-center gap-1.5 px-3 py-2 text-sm font-medium bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl transition-colors shadow-sm shadow-emerald-500/20"
                >
                  <PlusCircle className="w-4 h-4" aria-hidden="true" />
                  Crear
                </Link>

                <CompactThemeToggle />
                <NotificationCenter />

                {/* Profile Dropdown */}
                <div ref={profileRef} className="relative">
                  <button
                    onClick={() => setIsProfileOpen((p) => !p)}
                    aria-expanded={isProfileOpen}
                    aria-haspopup="true"
                    aria-label={`Menú de ${user?.firstName || 'usuario'}`}
                    className="flex items-center gap-1.5 pl-1 pr-2 py-1 rounded-xl hover:bg-gray-100 dark:hover:bg-white/5 transition-colors group"
                  >
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                      {user?.firstName?.[0]?.toUpperCase() || 'U'}
                    </div>
                    <span className="hidden lg:block text-sm font-medium text-gray-700 dark:text-gray-300 max-w-[80px] truncate">
                      {user?.firstName}
                    </span>
                    <ChevronDown
                      className={cn(
                        'hidden lg:block w-3.5 h-3.5 text-gray-400 transition-transform duration-200',
                        isProfileOpen && 'rotate-180'
                      )}
                      aria-hidden="true"
                    />
                  </button>

                  <AnimatePresence>
                    {isProfileOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: -8, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -8, scale: 0.96 }}
                        transition={{ duration: 0.15, ease: 'easeOut' }}
                        role="menu"
                        aria-label="Profile menu"
                        className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-900 rounded-2xl shadow-xl shadow-black/10 dark:shadow-black/40 border border-gray-200/60 dark:border-white/8 overflow-hidden"
                      >
                        {/* User info */}
                        <div className="px-4 py-3 border-b border-gray-100 dark:border-white/5">
                          <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                            {user?.firstName} {user?.lastName}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
                            {user?.email}
                          </p>
                        </div>

                        <div className="py-1.5">
                          {[
                            { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
                            { href: '/profile', icon: User, label: 'Mi Perfil' },
                            { href: '/settings', icon: Settings, label: 'Configuración' },
                          ].map(({ href, icon: Icon, label }) => (
                            <Link
                              key={href}
                              href={href}
                              role="menuitem"
                              className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                            >
                              <Icon className="w-4 h-4 shrink-0 text-gray-400" aria-hidden="true" />
                              {label}
                            </Link>
                          ))}
                        </div>

                        <div className="border-t border-gray-100 dark:border-white/5 py-1.5">
                          <button
                            onClick={handleLogout}
                            role="menuitem"
                            className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                          >
                            <LogOut className="w-4 h-4 shrink-0" aria-hidden="true" />
                            Cerrar Sesión
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <CompactThemeToggle />
                <Link
                  href="/login"
                  className="px-3 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                >
                  Iniciar Sesión
                </Link>
                <Link
                  href="/register"
                  className="px-3 py-2 text-sm font-medium bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl transition-colors shadow-sm shadow-emerald-500/20"
                >
                  Registrarse
                </Link>
              </div>
            )}

            {/* Mobile hamburger */}
            <button
              onClick={() => setIsMobileMenuOpen((p) => !p)}
              aria-expanded={isMobileMenuOpen}
              aria-label={isMobileMenuOpen ? 'Cerrar menú' : 'Abrir menú'}
              className="lg:hidden p-2 rounded-xl text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
            >
              <AnimatePresence mode="wait" initial={false}>
                <motion.span
                  key={isMobileMenuOpen ? 'close' : 'open'}
                  initial={{ rotate: -90, opacity: 0 }}
                  animate={{ rotate: 0, opacity: 1 }}
                  exit={{ rotate: 90, opacity: 0 }}
                  transition={{ duration: 0.15 }}
                >
                  {isMobileMenuOpen
                    ? <X className="w-5 h-5" aria-hidden="true" />
                    : <Menu className="w-5 h-5" aria-hidden="true" />
                  }
                </motion.span>
              </AnimatePresence>
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2, ease: 'easeInOut' }}
              className="lg:hidden overflow-hidden border-t border-gray-100 dark:border-white/5"
            >
              <div className="py-3 space-y-0.5">
                {navigation.map((item) => {
                  if (item.protected && !isAuthenticated) return null
                  const active = isActivePath(item.href)
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      aria-current={active ? 'page' : undefined}
                      className={cn(
                        'flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors',
                        active
                          ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10'
                          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5'
                      )}
                    >
                      <item.icon className="w-4 h-4 shrink-0" aria-hidden="true" />
                      {item.name}
                    </Link>
                  )
                })}

                {isAuthenticated && (
                  <>
                    <Link
                      href="/events/create"
                      className="flex items-center gap-3 px-4 py-3 mt-1 text-sm font-medium text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 rounded-xl transition-colors"
                    >
                      <PlusCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
                      Crear Evento
                    </Link>

                    <div className="border-t border-gray-100 dark:border-white/5 pt-2 mt-1">
                      <Link
                        href="/profile"
                        className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                      >
                        <User className="w-4 h-4 shrink-0" aria-hidden="true" />
                        Mi Perfil
                      </Link>
                      <button
                        onClick={handleLogout}
                        className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                      >
                        <LogOut className="w-4 h-4 shrink-0" aria-hidden="true" />
                        Cerrar Sesión
                      </button>
                    </div>
                  </>
                )}

                {!isAuthenticated && (
                  <div className="border-t border-gray-100 dark:border-white/5 pt-2 mt-1 flex flex-col gap-1">
                    <Link
                      href="/login"
                      className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                    >
                      Iniciar Sesión
                    </Link>
                    <Link
                      href="/register"
                      className="flex items-center justify-center gap-2 mx-4 py-3 rounded-xl text-sm font-medium bg-emerald-500 hover:bg-emerald-600 text-white transition-colors"
                    >
                      Registrarse gratis
                    </Link>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>
    </header>
  )
}
