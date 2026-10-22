'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, BarChart3, Shield, LifeBuoy, FileText, ArrowLeft, Zap, Loader2, Globe } from 'lucide-react'
import { apiClient } from '@/lib/api/client'
import toast from 'react-hot-toast'

export function AdminNav() {
  const pathname = usePathname()
  const [isSeeding, setIsSeeding] = useState(false)

  const handleSeedRD = async () => {
    if (isSeeding) return
    setIsSeeding(true)
    const toastId = toast.loading('Cargando datos de ejemplo de RD...')
    try {
      const res = await apiClient.post('/events/admin/seed-now')
      const msg = res.data?.message || 'Datos de ejemplo cargados; no constituyen una agenda real sincronizada.'
      toast.success(msg, { id: toastId })
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'No se pudieron cargar los datos de ejemplo', { id: toastId })
    } finally {
      setIsSeeding(false)
    }
  }

  const links = [
    {
      href: '/admin',
      label: 'Resumen y Prioridades',
      icon: LayoutDashboard,
      active: pathname === '/admin'
    },
    {
      href: '/admin/moderation',
      label: 'Moderación y Anti-Fraude',
      icon: Shield,
      active: pathname.startsWith('/admin/moderation')
    },
    {
      href: '/admin/support',
      label: 'Mesa de Ayuda y Soporte',
      icon: LifeBuoy,
      active: pathname.startsWith('/admin/support')
    },
    {
      href: '/admin/analytics',
      label: 'Métricas y Rendimiento',
      icon: BarChart3,
      active: pathname.startsWith('/admin/analytics')
    },
    {
      href: '/admin/audit',
      label: 'Bitácora de Auditoría',
      icon: FileText,
      active: pathname.startsWith('/admin/audit')
    },
    {
      href: '/admin/sources',
      label: 'Fuentes & Ingestión Global',
      icon: Globe,
      active: pathname.startsWith('/admin/sources')
    }
  ]

  return (
    <header className="sticky top-0 z-50 bg-gray-950/95 backdrop-blur border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-3">
        {/* Left branding & return to app */}
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white text-xs font-semibold transition-all border border-white/5"
            title="Volver a la aplicación principal"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Volver a EventNow</span>
          </Link>
          <div className="h-4 w-px bg-white/10 hidden sm:block" />
          <Link href="/admin" className="font-bold text-white text-sm tracking-wide hidden sm:inline hover:text-primary transition-colors">
            Panel de Administración
          </Link>
        </div>

        {/* Right Action & Navigation tabs */}
        <div className="flex items-center gap-2 w-full lg:w-auto justify-between lg:justify-end">
          <nav className="flex items-center gap-1 overflow-x-auto py-1 no-scrollbar" aria-label="Navegación de administración">
            {links.map((link) => {
              const Icon = link.icon
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                    link.active
                      ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20'
                      : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  <span>{link.label}</span>
                </Link>
              )
            })}
          </nav>

          <button
            onClick={handleSeedRD}
            disabled={isSeeding || process.env.NODE_ENV === 'production'}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs font-bold transition-all shadow-sm active:scale-95 disabled:opacity-50 flex-shrink-0"
            title="Carga datos de ejemplo; solo disponible en desarrollo con demostraciones habilitadas"
          >
            {isSeeding ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Zap className="w-3.5 h-3.5 fill-amber-400" />
            )}
            <span className="hidden sm:inline">Ejemplos RD (desarrollo)</span>
          </button>
        </div>
      </div>
    </header>
  )
}
