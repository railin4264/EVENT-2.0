'use client'

import React, { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft, Check, Globe, Shield, User, UserPlus } from 'lucide-react'
import { safeRedirect } from '@/lib/auth/redirect'
import { rememberOAuthIntent } from '@/lib/auth/oauth-state'

const GOOGLE_ACCOUNTS = [
  {
    name: 'María Santos',
    email: 'maria.santos@gmail.com',
    country: 'República Dominicana',
    countryCode: 'DO',
    locale: 'es-DO',
    terms: 'Coros · Boletas · RD$',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    color: 'from-pink-500 to-rose-500'
  },
  {
    name: 'Carlos García',
    email: 'carlos.garcia@gmail.com',
    country: 'España',
    countryCode: 'ES',
    locale: 'es-ES',
    terms: 'Quedadas · Entradas · Bizum / €',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    color: 'from-amber-500 to-orange-500'
  },
  {
    name: 'Alejandro Morales',
    email: 'alejandro.cdmx@gmail.com',
    country: 'México',
    countryCode: 'MX',
    locale: 'es-MX',
    terms: 'Planes · Boletos · SPEI / MXN$',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
    color: 'from-emerald-500 to-teal-500'
  },
  {
    name: 'Valentina Gómez',
    email: 'valentina.bogota@gmail.com',
    country: 'Colombia',
    countryCode: 'CO',
    locale: 'es-CO',
    terms: 'Parches · Boletas · Nequi / COP$',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
    color: 'from-blue-500 to-indigo-500'
  },
  {
    name: 'Mateo Rossi',
    email: 'mateo.palermo@gmail.com',
    country: 'Argentina',
    countryCode: 'AR',
    locale: 'es-AR',
    terms: 'Juntadas · Entradas · Mercado Pago / ARS$',
    avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80',
    color: 'from-sky-500 to-cyan-500'
  },
  {
    name: 'Sarah Jenkins',
    email: 'sarah.jenkins.nyc@gmail.com',
    country: 'United States',
    countryCode: 'US',
    locale: 'en-US',
    terms: 'Hangouts · Tickets · Stripe / USD$',
    avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80',
    color: 'from-violet-500 to-purple-500'
  }
]

function GoogleAccountSelector() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const state = searchParams.get('state') || 'mock_state'
  const redirect = safeRedirect(searchParams.get('redirect'), '/events')

  const [customEmail, setCustomEmail] = useState('')
  const [customName, setCustomName] = useState('')
  const [customCountry, setCustomCountry] = useState('DO')
  const [showCustom, setShowCustom] = useState(false)

  const handleSelectAccount = (account: typeof GOOGLE_ACCOUNTS[0]) => {
    // Save intent in sessionStorage so callback can resolve redirect safely
    rememberOAuthIntent('google', { state, mode: 'login', redirect })

    // Payload encoded in code
    const payload = {
      email: account.email,
      name: account.name,
      firstName: account.name.split(' ')[0],
      lastName: account.name.split(' ').slice(1).join(' '),
      locale: account.locale,
      countryCode: account.countryCode,
      avatar: account.avatar
    }
    const code = 'dev_google_' + (typeof window !== 'undefined' ? window.btoa(JSON.stringify(payload)) : '')
    router.replace(`/oauth/google/callback?code=${encodeURIComponent(code)}&state=${encodeURIComponent(state)}`)
  }

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!customEmail || !customName) return
    const countryMap: Record<string, { locale: string }> = {
      DO: { locale: 'es-DO' },
      ES: { locale: 'es-ES' },
      MX: { locale: 'es-MX' },
      CO: { locale: 'es-CO' },
      AR: { locale: 'es-AR' },
      US: { locale: 'en-US' }
    }
    const target = countryMap[customCountry] || countryMap.DO
    handleSelectAccount({
      name: customName,
      email: customEmail.toLowerCase(),
      country: customCountry,
      countryCode: customCountry,
      locale: target.locale,
      terms: 'Personalizado',
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(customName)}`,
      color: 'from-gray-500 to-slate-600'
    })
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-4 text-foreground">
      <div className="w-full max-w-lg bg-background rounded-2xl border border-border shadow-xl overflow-hidden">
        {/* Header with Google Brand */}
        <div className="p-6 border-b border-border text-center">
          <div className="flex justify-center mb-3">
            <svg className="h-8 w-8" viewBox="0 0 24 24" aria-hidden="true">
              <path fill="#4285F4" d="M21.6 12.23c0-.71-.06-1.39-.18-2.05H12v3.88h5.38a4.6 4.6 0 0 1-2 3.02v2.51h3.24c1.9-1.75 2.98-4.33 2.98-7.36Z"/>
              <path fill="#34A853" d="M12 22c2.7 0 4.96-.9 6.62-2.41l-3.24-2.51c-.9.6-2.05.96-3.38.96-2.6 0-4.8-1.76-5.59-4.12H3.07v2.59A10 10 0 0 0 12 22Z"/>
              <path fill="#FBBC05" d="M6.41 13.92a6 6 0 0 1 0-3.84V7.49H3.07a10 10 0 0 0 0 9.02l3.34-2.59Z"/>
              <path fill="#EA4335" d="M12 5.96c1.47 0 2.79.51 3.82 1.51l2.87-2.87A9.6 9.6 0 0 0 12 2a10 10 0 0 0-8.93 5.49l3.34 2.59A5.99 5.99 0 0 1 12 5.96Z"/>
            </svg>
          </div>
          <h1 className="text-xl font-bold tracking-tight">Elige una cuenta de Google</h1>
          <p className="text-sm text-muted-foreground mt-1">
            para continuar en <span className="font-semibold text-primary">EventNow</span>
          </p>
          <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-blue-50 dark:bg-blue-950/60 px-3 py-1 text-xs text-blue-600 dark:text-blue-300 font-medium">
            <Shield className="h-3.5 w-3.5" />
            Selector Multi-Cuenta Google con Psicología Nativa
          </div>
        </div>

        {/* Account list */}
        <div className="p-4 space-y-2 max-h-[380px] overflow-y-auto">
          {GOOGLE_ACCOUNTS.map(acc => (
            <button
              key={acc.email}
              type="button"
              onClick={() => handleSelectAccount(acc)}
              className="w-full flex items-center justify-between p-3.5 rounded-xl border border-transparent hover:border-border hover:bg-muted/50 transition-all text-left group"
            >
              <div className="flex items-center gap-3 min-w-0">
                <img
                  src={acc.avatar}
                  alt={acc.name}
                  className="h-10 w-10 rounded-full object-cover border border-border shrink-0"
                />
                <div className="min-w-0">
                  <div className="font-medium text-sm text-foreground group-hover:text-primary transition-colors flex items-center gap-2">
                    <span className="truncate">{acc.name}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-muted font-normal text-muted-foreground">
                      {acc.country}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground truncate">{acc.email}</div>
                  <div className="text-[11px] text-primary/80 mt-0.5 font-medium">
                    {acc.terms}
                  </div>
                </div>
              </div>
              <ArrowLeft className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 rotate-180 transition-opacity shrink-0 ml-2" />
            </button>
          ))}
        </div>

        {/* Custom account option */}
        <div className="p-4 border-t border-border bg-muted/20">
          {!showCustom ? (
            <button
              type="button"
              onClick={() => setShowCustom(true)}
              className="w-full flex items-center gap-3 p-3 text-sm font-medium text-primary hover:bg-primary/5 rounded-xl transition-colors"
            >
              <UserPlus className="h-5 w-5" />
              Usar otra cuenta de Google o crear una personalizada…
            </button>
          ) : (
            <form onSubmit={handleCustomSubmit} className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Ingresar otra cuenta
                </span>
                <button
                  type="button"
                  onClick={() => setShowCustom(false)}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  Cancelar
                </button>
              </div>
              <input
                type="text"
                placeholder="Nombre completo (ej. Laura Medina)"
                value={customName}
                onChange={e => setCustomName(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                required
              />
              <input
                type="email"
                placeholder="Correo Google (ej. laura@gmail.com)"
                value={customEmail}
                onChange={e => setCustomEmail(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                required
              />
              <div className="flex items-center gap-2">
                <select
                  value={customCountry}
                  onChange={e => setCustomCountry(e.target.value)}
                  className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                >
                  <option value="DO">🇩🇴 República Dominicana</option>
                  <option value="ES">🇪🇸 España</option>
                  <option value="MX">🇲🇽 México</option>
                  <option value="CO">🇨🇴 Colombia</option>
                  <option value="AR">🇦🇷 Argentina</option>
                  <option value="US">🇺🇸 Estados Unidos</option>
                </select>
                <button
                  type="submit"
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
                >
                  Acceder
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border bg-muted/40 flex items-center justify-between text-xs text-muted-foreground">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex items-center gap-1 hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Volver
          </button>
          <span>EventNow · Experiencia Cultural Nativa</span>
        </div>
      </div>
    </div>
  )
}

export default function GoogleDevSelectPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Cargando cuentas…</div>}>
      <GoogleAccountSelector />
    </Suspense>
  )
}
