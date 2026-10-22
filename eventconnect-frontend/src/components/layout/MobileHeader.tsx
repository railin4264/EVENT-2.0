'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Bell, Search, ChevronLeft, LogIn, Compass } from 'lucide-react'
import { motion, useScroll, useTransform } from 'framer-motion'
import { useAuthStore } from '@/stores/authStore'
import { usePathname, useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'

interface MobileHeaderProps {
  title?: string
  showBack?: boolean
  transparent?: boolean
  rightAction?: React.ReactNode
}

const PAGE_TITLES: Record<string, string> = {
  '/feed': '',             // Shows greeting instead
  '/discovery': 'Explorar',
  '/events': 'Eventos',
  '/events/create': 'Nuevo Evento',
  '/tribes': 'Tribus',
  '/messages': 'Mensajes',
  '/notifications': 'Notificaciones',
  '/profile': 'Mi Perfil',
  '/settings': 'Configuración',
  '/tickets': 'Mis Tickets',
  '/search': 'Buscar',
  '/stories': 'Historias',
  '/planning-tools': 'Prepara tu plan',
  '/partners': 'Colaboraciones',
  '/suppliers': 'Suplidores',
  '/organizers': 'Para organizadores',
  '/ideas': 'Ideas de la comunidad',
}

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Buenos días'
  if (h < 18) return 'Buenas tardes'
  return 'Buenas noches'
}

export function MobileHeader({ title, showBack, transparent, rightAction }: MobileHeaderProps) {
  const [scrolled, setScrolled] = useState(false)
  const { user, isAuthenticated } = useAuthStore()
  const pathname = usePathname()
  const router = useRouter()

  const isFeed = pathname === '/feed'
  const derivedTitle = title ?? PAGE_TITLES[pathname] ?? ''

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const firstName = user?.firstName || 'Explorador'
  const initial = (user?.firstName?.[0] || user?.username?.[0] || '?').toUpperCase()

  return (
    <header
      className={cn(
        'sticky top-0 z-40 flex items-center justify-between px-4 h-14',
        'transition-all duration-300 md:hidden',
        scrolled || !transparent
          ? 'bg-background/95 backdrop-blur-xl border-b border-border'
          : 'bg-transparent',
        'pt-[env(safe-area-inset-top)]'
      )}
      style={{ minHeight: `calc(56px + env(safe-area-inset-top))` }}
    >
      {/* Left: back button or logo/greeting */}
      <div className="flex items-center gap-3 min-w-0 flex-1">
        {showBack ? (
          <button
            onClick={() => router.back()}
            className="flex items-center justify-center w-11 h-11 rounded-xl bg-muted/60 hover:bg-muted transition-colors active:scale-95"
            aria-label="Volver"
          >
            <ChevronLeft className="w-5 h-5 text-foreground" strokeWidth={2.5} />
          </button>
        ) : (
          <Link href={isAuthenticated ? '/feed' : '/'} className="flex items-center gap-2 shrink-0" aria-label="Inicio">
            <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center">
              <Compass className="h-5 w-5 text-primary-foreground" aria-hidden="true" />
            </div>
          </Link>
        )}

        <div className="min-w-0 flex-1">
          {isFeed && !showBack ? (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <p className="text-[11px] text-muted-foreground font-medium leading-none mb-0.5">
                {getGreeting()},
              </p>
              <p className="text-[15px] font-semibold text-foreground leading-none truncate">
                {firstName} 👋
              </p>
            </motion.div>
          ) : derivedTitle ? (
            <p className="text-[16px] font-semibold text-foreground truncate leading-none">{derivedTitle}</p>
          ) : null}
        </div>
      </div>

      {/* Right: actions */}
      <div className="flex items-center gap-1 ml-2">
        {isFeed && (
          <Link
            href="/search"
            className="flex items-center justify-center w-11 h-11 rounded-xl bg-muted/60 hover:bg-muted transition-colors active:scale-95"
            aria-label="Buscar"
          >
            <Search className="w-5 h-5 text-foreground" />
          </Link>
        )}

        {rightAction ?? (isAuthenticated ? (
          <Link
            href="/notifications"
            className="flex items-center justify-center w-11 h-11 rounded-xl bg-muted/60 hover:bg-muted transition-colors active:scale-95 relative"
            aria-label="Notificaciones"
          >
            <Bell className="w-5 h-5 text-foreground" />
          </Link>
        ) : null)}

        <Link
          href={isAuthenticated ? '/profile' : '/login'}
          className="ml-1 w-11 h-11 rounded-xl bg-primary flex items-center justify-center text-primary-foreground font-semibold text-sm active:scale-95 transition-transform"
          aria-label={isAuthenticated ? 'Mi perfil' : 'Iniciar sesión'}
        >
          {isAuthenticated ? initial : <LogIn className="h-4 w-4" aria-hidden="true" />}
        </Link>
      </div>
    </header>
  )
}
