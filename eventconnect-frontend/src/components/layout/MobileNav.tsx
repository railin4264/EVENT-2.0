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
  const { isAuthenticated, user } = useAuthStore()
  const items = navItems.map(item => {
    if (!isAuthenticated && item.href === '/feed') return { ...item, href: '/' }
    if (!isAuthenticated && item.href === '/profile') return { ...item, href: '/login', label: 'Entrar' }
    return item
  })

  // Fetch unread notifications count
  const { data: notifData } = useQuery({
    queryKey: ['notifications-count', isAuthenticated ? user?.id || user?._id : 'guest'],
    queryFn: async () => {
      const res = await apiClient.get('/notifications?limit=1')
      return res.data
    },
    enabled: isAuthenticated,
    refetchInterval: 30000,
    staleTime: 20000,
  })

  const unreadCount = isAuthenticated ? notifData?.unreadCount || 0 : 0

  return (
    <nav
      aria-label="Navegación principal"
      className="fixed bottom-0 left-0 right-0 z-50 md:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {/* Glass background with subtle top glow */}
      <div className="absolute inset-0 bg-background/95 backdrop-blur-xl border-t border-border" />
      {/* Top glow line */}
      <div className="absolute top-0 left-0 right-0 h-px bg-primary/20" />

      <ul className="relative flex items-center justify-around h-[60px] px-2" role="list">
        {items.map(({ href, label, icon: Icon, accent }) => {
          const isActive =
            pathname === href ||
            (href !== '/feed' && href !== '/' && pathname?.startsWith(href))
          const isNotif = href === '/notifications'

          if (accent) {
            // Central FAB-style button
            return (
              <li key={href} role="listitem" className="flex-1 flex justify-center">
                <Link href={href} aria-label={label} className="rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-4 focus-visible:ring-offset-background">
                  <motion.div
                    whileTap={{ scale: 0.88 }}
                    whileHover={{ scale: 1.05 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 28 }}
                    className={cn(
                      'relative -top-3 w-14 h-14 rounded-2xl flex items-center justify-center',
                      'bg-primary',
                      'shadow-md',
                      'border border-primary/20'
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
                className="flex flex-col items-center justify-center h-[60px] gap-0.5 relative rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
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
                      className="absolute top-1.5 w-1 h-1 rounded-full bg-primary"
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
                        ? 'text-primary'
                        : 'text-muted-foreground'
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
                        'bg-destructive text-destructive-foreground text-[10px] font-semibold rounded-full',
                        'border border-background shadow-sm'
                      )}
                    >
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </motion.span>
                  )}
                </motion.div>

                {/* Label */}
                <span
                  className={cn(
                    'text-xs font-semibold tracking-wide leading-none transition-colors duration-200',
                    isActive ? 'text-primary' : 'text-gray-600 dark:text-gray-600'
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
