'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Compass, Plus, Ticket, User, Bell } from 'lucide-react'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/api/client'
import { useAuthStore } from '@/stores/authStore'

const navItems = [
  { href: '/feed', label: 'Inicio', icon: Home },
  { href: '/discovery', label: 'Explorar', icon: Compass },
  { href: '/events/create', label: 'Crear', icon: Plus, accent: true },
  { href: '/notifications', label: 'Alertas', icon: Bell },
  { href: '/profile', label: 'Perfil', icon: User },
]

export function MobileNav() {
  const pathname = usePathname()
  const { isAuthenticated } = useAuthStore()

  // Fetch unread notifications count
  const { data: notifData } = useQuery({
    queryKey: ['notifications-count'],
    queryFn: async () => {
      const res = await apiClient.get('/notifications?limit=1')
      return res.data
    },
    enabled: isAuthenticated,
    refetchInterval: 30000,
    staleTime: 20000,
  })

  const unreadCount = notifData?.unreadCount || 0

  return (
    <nav
      aria-label="Navegación principal"
      className="fixed bottom-0 left-0 right-0 z-50 md:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {/* Glass background with subtle top glow */}
      <div className="absolute inset-0 bg-gray-950/80 backdrop-blur-2xl border-t border-white/[0.07]" />
      {/* Top glow line */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-emerald-500/40 to-transparent" />

      <ul className="relative flex items-center justify-around h-[60px] px-2" role="list">
        {navItems.map(({ href, label, icon: Icon, accent }) => {
          const isActive =
            pathname === href ||
            (href !== '/feed' && href !== '/' && pathname?.startsWith(href))
          const isNotif = href === '/notifications'

          if (accent) {
            // Central FAB-style button
            return (
              <li key={href} role="listitem" className="flex-1 flex justify-center">
                <Link href={href} aria-label={label}>
                  <motion.div
                    whileTap={{ scale: 0.88 }}
                    whileHover={{ scale: 1.05 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 28 }}
                    className={cn(
                      'relative -top-3 w-14 h-14 rounded-2xl flex items-center justify-center',
                      'bg-gradient-to-br from-emerald-400 via-teal-500 to-cyan-600',
                      'shadow-[0_8px_32px_rgba(16,185,129,0.45)]',
                      'border border-emerald-400/30'
                    )}
                  >
                    <Icon className="w-6 h-6 text-white" strokeWidth={2.5} aria-hidden="true" />
                    {/* Shine overlay */}
                    <div className="absolute inset-0 rounded-2xl bg-gradient-to-b from-white/20 to-transparent pointer-events-none" />
                  </motion.div>
                </Link>
              </li>
            )
          }

          return (
            <li key={href} role="listitem" className="flex-1">
              <Link
                href={href}
                aria-current={isActive ? 'page' : undefined}
                aria-label={label}
                className="flex flex-col items-center justify-center h-[60px] gap-0.5 relative focus:outline-none"
              >
                {/* Active indicator dot */}
                <AnimatePresence>
                  {isActive && (
                    <motion.div
                      key="active-dot"
                      layoutId="mobile-nav-active"
                      initial={{ opacity: 0, scale: 0 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                      className="absolute top-1.5 w-1 h-1 rounded-full bg-emerald-400"
                    />
                  )}
                </AnimatePresence>

                {/* Icon wrapper */}
                <motion.div
                  whileTap={{ scale: 0.78 }}
                  transition={{ type: 'spring', stiffness: 600, damping: 28 }}
                  className="relative flex items-center justify-center"
                >
                  <Icon
                    className={cn(
                      'w-[22px] h-[22px] transition-all duration-200',
                      isActive
                        ? 'text-emerald-400'
                        : 'text-gray-500 dark:text-gray-500'
                    )}
                    strokeWidth={isActive ? 2.5 : 1.8}
                    aria-hidden="true"
                  />

                  {/* Notification badge */}
                  {isNotif && unreadCount > 0 && (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className={cn(
                        'absolute -top-1 -right-1.5 min-w-[16px] h-4 px-0.5',
                        'flex items-center justify-center',
                        'bg-rose-500 text-white text-[9px] font-black rounded-full',
                        'border border-gray-950 shadow-sm'
                      )}
                    >
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </motion.span>
                  )}
                </motion.div>

                {/* Label */}
                <span
                  className={cn(
                    'text-[10px] font-semibold tracking-wide leading-none transition-colors duration-200',
                    isActive ? 'text-emerald-400' : 'text-gray-600 dark:text-gray-600'
                  )}
                >
                  {label}
                </span>
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
