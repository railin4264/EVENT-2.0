'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Mail, Lock, Eye, EyeOff, Loader2, Calendar, ArrowRight } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { authPageHref, safeRedirect, publicExploreHref } from '@/lib/auth/redirect'
import toast from 'react-hot-toast'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import OAuthButtons from '@/components/auth/OAuthButtons'
import { readEventRsvpIntent } from '@/components/events/event-rsvp-intent'

const loginSchema = z.object({
  email: z.string().min(1, 'El correo es requerido').email('Email inválido'),
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
})

type LoginFormData = z.infer<typeof loginSchema>

// ─── Reusable Field ───────────────────────────────────────────────────────────

function Field({
  id,
  label,
  error,
  children,
}: {
  id: string
  label: string
  error?: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-medium text-gray-700 dark:text-gray-300">
        {label}
      </label>
      {children}
      {error && (
        <p id={`${id}-error`} role="alert" className="text-xs text-red-500 font-medium">
          {error}
        </p>
      )}
    </div>
  )
}

// ─── Form ─────────────────────────────────────────────────────────────────────

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const rsvpReturn = readEventRsvpIntent(searchParams.get('redirect'))
  const { login } = useAuthStore()
  const [showPassword, setShowPassword] = useState(false)
  const [tempToken, setTempToken] = useState('')
  const [verificationCode, setVerificationCode] = useState('')

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({ resolver: zodResolver(loginSchema) })

  const onSubmit = async (data: LoginFormData) => {
    try {
      await login({ email: data.email, password: data.password, ...(tempToken ? { tempToken, code: verificationCode } : {}) })
      toast.success('¡Bienvenido de vuelta!')
      const redirect = searchParams.get('redirect')
      router.replace(safeRedirect(redirect))
    } catch (error: any) {
      if (error.requiresTwoFactor) {
        setTempToken(error.tempToken)
        toast('Introduce el código de seis dígitos para continuar.')
        return
      }
      toast.error(error.response?.data?.message || error.message || 'Error al iniciar sesión')
    }
  }

  return (
    <div className="min-h-dvh flex bg-background text-foreground">

      <aside className="hidden flex-1 flex-col justify-between bg-muted/40 p-12 lg:flex">
        <Link href="/" className="flex items-center gap-2 text-xl font-semibold text-foreground"><Calendar className="h-6 w-6 text-primary" />EventNow</Link>
        <div className="max-w-md"><p className="text-sm font-semibold text-primary">Los mejores planes se comparten</p><h1 className="mt-5 text-5xl font-semibold leading-tight tracking-tight text-foreground">Tu gente.<br />Tu próximo plan.</h1><p className="mt-6 text-lg leading-relaxed text-muted-foreground">Guarda lo que te gusta, prepara tu próxima salida y encuentra a tu comunidad.</p><div className="mt-9 rounded-2xl border border-border bg-background p-5 text-sm leading-6 text-muted-foreground">Puedes descubrir eventos sin cuenta. Entra cuando quieras asistir, guardar o participar.</div></div>
        <Link href={publicExploreHref(searchParams.get('redirect'))} className="text-sm font-medium text-primary">← Seguir explorando</Link>
      </aside>

      {/* ── Right panel: form ─────────────────────────────────────────── */}
      <div className="relative flex-1 flex items-center justify-center px-4 sm:px-8 py-12">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className="w-full max-w-sm"
        >
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2 mb-10">
            <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center">
              <Calendar className="w-4 h-4 text-white" aria-hidden="true" />
            </div>
            <span className="text-lg font-bold text-gray-900 dark:text-white">
              Event<span className="text-violet-500">Now</span>
            </span>
          </div>

          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
            Iniciar sesión
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">
            ¿No tienes cuenta?{' '}
            <Link href={authPageHref('/register', searchParams.get('redirect'))} className="font-semibold text-violet-600 dark:text-violet-400 hover:underline underline-offset-2">
              Regístrate gratis
            </Link>
          </p>

          {rsvpReturn && <p role="note" className="mb-5 rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm leading-relaxed text-foreground">
            Al iniciar sesión volverás al evento para confirmar tu asistencia. La confirmación requiere un clic tuyo al regresar.
          </p>}

          <div className="mb-6"><OAuthButtons mode="login" /></div>
          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
            <Field id="email" label="Correo electrónico" error={errors.email?.message}>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" aria-hidden="true" />
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  {...register('email')}
                  aria-invalid={!!errors.email}
                  aria-describedby={errors.email ? 'email-error' : undefined}
                  className="w-full pl-10 pr-4 py-3 text-sm rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-500/60 transition-all"
                  placeholder="tu@email.com"
                />
              </div>
            </Field>

            <Field id="password" label="Contraseña" error={errors.password?.message}>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" aria-hidden="true" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  {...register('password')}
                  aria-invalid={!!errors.password}
                  className="w-full pl-10 pr-11 py-3 text-sm rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-500/60 transition-all"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                >
                  {showPassword
                    ? <EyeOff className="w-4 h-4" aria-hidden="true" />
                    : <Eye className="w-4 h-4" aria-hidden="true" />
                  }
                </button>
              </div>
            </Field>

            <div className="flex justify-end">
              <Link
                href="/forgot-password"
                className="text-xs text-gray-500 dark:text-gray-400 hover:text-violet-600 dark:hover:text-violet-400 transition-colors"
              >
                ¿Olvidaste tu contraseña?
              </Link>
            </div>

            {tempToken && <Field id="verification-code" label="Código de verificación">
              <input id="verification-code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={verificationCode} onChange={event => setVerificationCode(event.target.value.replace(/\D/g, ''))} className="w-full rounded-xl border border-border bg-background px-4 py-3 text-foreground" placeholder="000000" />
              <p className="text-xs text-muted-foreground">Introduce el código de tu aplicación de autenticación.</p>
              <button type="button" className="text-xs text-primary underline" onClick={() => { setTempToken(''); setVerificationCode('') }}>Usar otra cuenta</button>
            </Field>}
            <button
              type="submit"
              disabled={isSubmitting || Boolean(tempToken && verificationCode.length !== 6)}
              className="group w-full flex items-center justify-center gap-2 py-3 px-4 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl font-semibold text-sm transition-all hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-black/10"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                  Iniciando sesión…
                </>
              ) : (
                <>
                  {rsvpReturn ? 'Continuar para confirmar asistencia' : 'Iniciar sesión'}
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                </>
              )}
            </button>
          </form>


          <div className="mt-8 pt-6 border-t border-gray-100 dark:border-white/5 text-center">
            <Link
              href={publicExploreHref(searchParams.get('redirect'))}
              className="text-xs text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
              ← Explorar eventos sin cuenta
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  )
}

// ─── Loading state ─────────────────────────────────────────────────────────────

function LoginLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white dark:bg-gray-950">
      <Loader2 className="w-8 h-8 animate-spin text-violet-500" aria-label="Cargando…" />
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginLoading />}>
      <LoginForm />
    </Suspense>
  )
}
