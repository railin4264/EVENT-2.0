'use client'

import { useState } from 'react'
import { Chrome, Apple, Loader2 } from 'lucide-react'
import { oauthService, OAuthProvider } from '@/lib/api/oauth'

interface OAuthButtonsProps {
  mode?: 'login' | 'register' | 'link'
}

export default function OAuthButtons({ mode = 'login' }: OAuthButtonsProps) {
  const [loading, setLoading] = useState<OAuthProvider | null>(null)
  const [error, setError] = useState<string | null>(null)

  const startOAuth = async (provider: OAuthProvider) => {
    setLoading(provider)
    setError(null)
    try {
      const res = await oauthService.getAuthUrl(provider)
      const authUrl = res?.authUrl || res?.data?.authUrl
      if (authUrl) {
        // Redirect the browser to the provider's authorization page.
        // The provider will redirect back to the backend callback, which then
        // issues our app token and redirects to the frontend.
        window.location.href = authUrl
      } else {
        setError('No se pudo iniciar el inicio de sesión con ' + provider)
        setLoading(null)
      }
    } catch (e) {
      setError(e?.message || 'Error al conectar con ' + provider)
      setLoading(null)
    }
  }

  const label = mode === 'link' ? 'Conectar con' : 'Continuar con'

  return (
    <div className="space-y-3">
      <button
        type="button"
        disabled={loading !== null}
        onClick={() => startOAuth('google')}
        className="flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-background px-4 py-2.5 text-sm font-medium transition-colors hover:bg-muted disabled:opacity-60"
      >
        {loading === 'google' ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Chrome className="h-4 w-4" />
        )}
        {label} Google
      </button>

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

      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}
