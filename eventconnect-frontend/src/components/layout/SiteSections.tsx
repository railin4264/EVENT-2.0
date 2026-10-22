'use client'
import React, { useEffect, useRef } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { SITE_SECTIONS } from '@/lib/site-sections'
import { useAuthStore } from '@/stores/authStore'

export function SiteSections({ className = '' }: { className?: string }) {
  const pathname = usePathname() || '/'
  const { isAuthenticated } = useAuthStore()
  const menu = useRef<HTMLDetailsElement>(null)
  useEffect(() => { if (menu.current) menu.current.open = false }, [pathname])
  useEffect(() => {
    const close = (event: PointerEvent) => { if (menu.current && !menu.current.contains(event.target as Node)) menu.current.open = false }
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape' && menu.current?.open) { menu.current.open = false; menu.current.querySelector('summary')?.focus() } }
    document.addEventListener('pointerdown', close); document.addEventListener('keydown', escape)
    return () => { document.removeEventListener('pointerdown', close); document.removeEventListener('keydown', escape) }
  }, [])
  const active = (href: string) => pathname === href || pathname.startsWith(`${href}/`)
  const links = [...SITE_SECTIONS.filter(section => !('primary' in section)), ...(isAuthenticated ? [{ href: '/tickets', label: 'Mis entradas' }, { href: '/feed', label: 'Feed' }, { href: '/messages', label: 'Chat' }] : [])]
  return <nav aria-label="Secciones de EventNow" className={`relative items-center gap-1 text-xs font-medium text-muted-foreground sm:gap-2 sm:text-sm ${className}`}>
    {SITE_SECTIONS.filter(section => 'primary' in section).map(section => <Link key={section.href} href={section.href} aria-current={active(section.href) ? 'page' : undefined} className={`flex min-h-11 items-center whitespace-nowrap rounded-xl px-2 transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${active(section.href) ? 'bg-primary/10 text-primary' : 'hover:text-foreground'}`}>{section.label}</Link>)}
    <details ref={menu} className="relative">
      <summary className={`min-h-11 cursor-pointer whitespace-nowrap rounded-xl px-2 py-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${links.some(section => active(section.href)) ? 'bg-primary/10 text-primary' : 'hover:bg-muted'}`}>Más planes</summary>
      <div className="absolute right-0 top-full z-50 mt-2 grid max-h-[65dvh] w-64 gap-1 overflow-y-auto rounded-2xl border border-border bg-background p-2 text-foreground shadow-lg sm:w-72" aria-label="Todas las herramientas">
        {links.map(section => <Link key={section.href} href={section.href} aria-current={active(section.href) ? 'page' : undefined} onClick={() => { if (menu.current) menu.current.open = false }} className={`flex min-h-12 items-center rounded-xl px-3 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${active(section.href) ? 'bg-primary/10 text-primary' : ''}`}>{section.label}</Link>)}
      </div>
    </details>
  </nav>
}
