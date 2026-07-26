'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Bell, Search, ChevronLeft } from 'lucide-react'
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
  '/stories': 'Stories',
}

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Buenos días'
  if (h < 18) return 'Buenas tardes'
  return 'Buenas noches'
}

export function MobileHeader({ title, showBack, transparent, rightAction }: MobileHeaderProps) {
  const [scrolled, setScrolled] = useState(false)
  const { user } = useAuthStore()
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
          ? 'bg-gray-950/85 backdrop-blur-2xl border-b border-white/[0.06]'
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
            className="flex items-center justify-center w-9 h-9 rounded-xl bg-white/8 hover:bg-white/12 transition-colors active:scale-95"
            aria-label="Volver"
          >
            <ChevronLeft className="w-5 h-5 text-white" strokeWidth={2.5} />
          </button>
        ) : (
          <Link href="/feed" className="flex items-center gap-2 shrink-0" aria-label="Inicio">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/30">
              <span className="text-white font-black text-xs">EN</span>
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
              <p className="text-[11px] text-gray-500 font-medium leading-none mb-0.5">
                {getGreeting()},
              </p>
              <p className="text-[15px] font-bold text-white leading-none truncate">
                {firstName} 👋
              </p>
            </motion.div>
          ) : derivedTitle ? (
            <h1 className="text-[16px] font-bold text-white truncate leading-none">{derivedTitle}</h1>
          ) : null}
        </div>
      </div>

      {/* Right: actions */}
      <div className="flex items-center gap-1 ml-2">
        {isFeed && (
          <Link
            href="/search"
            className="flex items-center justify-center w-9 h-9 rounded-xl bg-white/8 hover:bg-white/12 transition-colors active:scale-95"
            aria-label="Buscar"
          >
            <Search className="w-4.5 h-4.5 text-gray-300" />
          </Link>
        )}

        {rightAction ?? (
          <Link
            href="/notifications"
            className="flex items-center justify-center w-9 h-9 rounded-xl bg-white/8 hover:bg-white/12 transition-colors active:scale-95 relative"
            aria-label="Notificaciones"
          >
            <Bell className="w-4.5 h-4.5 text-gray-300" />
          </Link>
        )}

        <Link
          href="/profile"
          className="ml-1 w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center text-white font-black text-[11px] shadow-lg shadow-violet-500/25 active:scale-95 transition-transform"
          aria-label="Mi perfil"
        >
          {initial}
        </Link>
      </div>
    </header>
  )
}
