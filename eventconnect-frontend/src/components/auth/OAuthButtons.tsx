'use client'

import React, { useEffect, useState } from 'react'
import { Apple, Facebook, Loader2 } from 'lucide-react'
import { oauthService, OAuthProvider } from '@/lib/api/oauth'
import { rememberOAuthIntent } from '@/lib/auth/oauth-state'
import { safeRedirect } from '@/lib/auth/redirect'

interface OAuthButtonsProps {
  mode?: 'login' | 'register' | 'link'
}

export default function OAuthButtons({ mode = 'login' }: OAuthButtonsProps) {
  const [loading, setLoading] = useState<OAuthProvider | null>(null)
  const [error, setError] = useState<string | null>(null)
  // Only providers the backend reports as enabled: an unconfigured one would lead to an error.
  const [providers, setProviders] = useState<string[]>([])

  useEffect(() => {
    let active = true
    oauthService.getProviders().then(result => {
      if (active) {
        const remote = (result.data?.providers || [])
          .filter(provider => provider.enabled !== false)
          .map(provider => (provider.provider || provider.name).toLowerCase())
        setProviders(remote)
      }
    }).catch(() => { /* Without the provider list, email sign-in remains available */ })
    return () => { active = false }
  }, [])

  const startOAuth = async (provider: OAuthProvider) => {
    setLoading(provider)
    setError(null)
    try {
      const redirect = safeRedirect(new URLSearchParams(window.location.search).get('redirect'), mode === 'link' ? '/settings' : '/events')
      const res = await oauthService.getAuthUrl(provider, redirect)
      const authUrl = res?.authUrl || res?.data?.authUrl
      if (authUrl) {
        rememberOAuthIntent(provider, { state: res.state || res.data?.state || '', mode, redirect })
        window.location.href = authUrl
      } else {
        setError('No se pudo iniciar el inicio de sesión con ' + provider)
        setLoading(null)
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al conectar con ' + provider)
      setLoading(null)
    }
  }

  const label = mode === 'link' ? 'Conectar con' : 'Continuar con'

  return (
    <div className="space-y-3" aria-label="Acceso con una cuenta existente">
      {providers.includes('google') && (
        <button
          type="button"
          disabled={loading !== null}
          onClick={() => startOAuth('google')}
          className="flex min-h-12 w-full items-center justify-center gap-3 rounded-xl border border-border bg-background px-4 py-3 text-sm font-semibold transition-all hover:bg-muted/70 hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-60 shadow-sm"
        >
          {loading === 'google' ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
              <path fill="#4285F4" d="M21.6 12.23c0-.71-.06-1.39-.18-2.05H12v3.88h5.38a4.6 4.6 0 0 1-2 3.02v2.51h3.24c1.9-1.75 2.98-4.33 2.98-7.36Z"/>
              <path fill="#34A853" d="M12 22c2.7 0 4.96-.9 6.62-2.41l-3.24-2.51c-.9.6-2.05.96-3.38.96-2.6 0-4.8-1.76-5.59-4.12H3.07v2.59A10 10 0 0 0 12 22Z"/>
              <path fill="#FBBC05" d="M6.41 13.92a6 6 0 0 1 0-3.84V7.49H3.07a10 10 0 0 0 0 9.02l3.34-2.59Z"/>
              <path fill="#EA4335" d="M12 5.96c1.47 0 2.79.51 3.82 1.51l2.87-2.87A9.6 9.6 0 0 0 12 2a10 10 0 0 0-8.93 5.49l3.34 2.59A5.99 5.99 0 0 1 12 5.96Z"/>
            </svg>
          )}
          {label} Google
        </button>
      )}

      {providers.includes('facebook') && (
        <button
          type="button"
          disabled={loading !== null}
          onClick={() => startOAuth('facebook')}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-background px-4 py-2.5 text-sm font-medium transition-colors hover:bg-muted disabled:opacity-60"
        >
          {loading === 'facebook' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Facebook className="h-4 w-4" />}
          {label} Facebook
        </button>
      )}

      {providers.includes('apple') && (
        <button
          type="button"
          disabled={loading !== null}
          onClick={() => startOAuth('apple')}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-background px-4 py-2.5 text-sm font-medium transition-colors hover:bg-muted disabled:opacity-60"
        >
          {loading === 'apple' ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Apple className="h-4 w-4" />
          )}
          {label} Apple
        </button>
      )}

      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      {mode !== 'link' && (
        <div className="flex items-center gap-3 pt-2 text-xs text-muted-foreground">
          <span className="h-px flex-1 bg-border" />
          o continúa con tus datos
          <span className="h-px flex-1 bg-border" />
        </div>
      )}
    </div>
  )
}
