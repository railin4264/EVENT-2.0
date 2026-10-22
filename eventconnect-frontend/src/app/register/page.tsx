import React, { Suspense, useState, useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, ArrowRight, Calendar, Check, Eye, EyeOff, Globe, Loader2, ShieldCheck, Sparkles } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import toast from 'react-hot-toast'
import { useAuthStore } from '@/stores/authStore'
import { useLocaleStore } from '@/stores/localeStore'
import { authPageHref, publicExploreHref, safeRedirect } from '@/lib/auth/redirect'
import { registerSchema, type RegisterFormData } from '@/lib/auth/register'
import OAuthButtons from '@/components/auth/OAuthButtons'

const inputClass = 'w-full rounded-xl border border-border bg-background px-4 py-3 text-base text-foreground outline-none transition-colors hover:border-primary/30 focus:border-primary focus:ring-2 focus:ring-primary/20 aria-[invalid=true]:border-red-500'

const COUNTRIES = [
  { code: 'DO', name: 'República Dominicana', flag: '🇩🇴', label: 'Rep. Dominicana', terms: 'Coros · Boletas · RD$' },
  { code: 'ES', name: 'España', flag: '🇪🇸', label: 'España', terms: 'Quedadas · Entradas · €' },
  { code: 'MX', name: 'México', flag: '🇲🇽', label: 'México', terms: 'Planes · Boletos · MXN$' },
  { code: 'CO', name: 'Colombia', flag: '🇨🇴', label: 'Colombia', terms: 'Parches · Boletas · COP$' },
  { code: 'AR', name: 'Argentina', flag: '🇦🇷', label: 'Argentina', terms: 'Juntadas · Entradas · ARS$' },
  { code: 'US', name: 'Estados Unidos', flag: '🇺🇸', label: 'EE.UU. / Global', terms: 'Hangouts · Tickets · USD$' },
]

function RegisterForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const destination = safeRedirect(searchParams.get('redirect'))
  const exploreHref = publicExploreHref(destination)
  const registerUser = useAuthStore(state => state.register)
  const [showPassword, setShowPassword] = useState(false)

  // Locale and regional psychology store
  const { config, setLocaleByCountry } = useLocaleStore()
  const [selectedCountryCode, setSelectedCountryCode] = useState(config.countryCode || 'DO')

  const { register, handleSubmit, setError, clearErrors, watch, setValue, formState: { errors, isSubmitting, dirtyFields } } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: '',
      username: '',
      email: '',
      birthDate: '',
      password: '',
      acceptTerms: false,
      countryCode: config.countryCode || 'DO',
      country: config.countryName || 'República Dominicana'
    },
  })

  const handleCountrySelect = (code: string, name: string) => {
    setSelectedCountryCode(code as any)
    setValue('countryCode', code)
    setValue('country', name)
    setLocaleByCountry(code)
    toast.success(`Experiencia adaptada para ${name}`, { id: 'country-switch' })
  }

  const onSubmit = async (data: RegisterFormData) => {
    clearErrors('root')
    try {
      const activeCountry = COUNTRIES.find(c => c.code === selectedCountryCode) || COUNTRIES[0]
      await registerUser({
        name: data.name,
        username: data.username,
        email: data.email,
        birthDate: data.birthDate,
        password: data.password,
        acceptTerms: data.acceptTerms,
        country: data.country || activeCountry.name,
        countryCode: data.countryCode || activeCountry.code,
        preferredLocale: config.locale,
        preferredCurrency: config.currency
      })
      toast.success('¡Tu cuenta está lista!')
      router.replace(`/onboarding?redirect=${encodeURIComponent(destination)}`)
    } catch (error: unknown) {
      const failure = (error && typeof error === 'object' ? error : {}) as { response?: { data?: { message?: string; errors?: { path?: string; msg?: string }[] } }; message?: string }
      const fields = ['name', 'username', 'email', 'birthDate', 'password', 'acceptTerms', 'countryCode', 'country']
      const validation = Array.isArray(failure.response?.data?.errors) ? failure.response.data.errors : []
      validation?.forEach(issue => {
        if (issue && typeof issue.path === 'string' && fields.includes(issue.path)) {
          setError(issue.path as keyof RegisterFormData, { message: typeof issue.msg === 'string' ? issue.msg : 'Revisa este campo' })
        }
      })
      const message = failure.response?.data?.message
      const explanation = message === 'User already exists'
        ? 'Ese correo o usuario ya tiene una cuenta. Inicia sesión o utiliza otro.'
        : validation.length ? 'Revisa los campos señalados.' : message || failure.message || 'No pudimos crear tu cuenta. Inténtalo de nuevo.'
      setError('root.server', { message: explanation })
      toast.error(explanation)
    }
  }

  const fieldError = (field: keyof RegisterFormData) => errors[field] && (
    <p id={`${field}-error`} role="alert" className="mt-1.5 text-sm text-red-500">
      {errors[field]?.message}
    </p>
  )

  const password = watch('password')
  const name = watch('name')
  const suffix = useRef('')

  useEffect(() => {
    if (dirtyFields.username || name.trim().length < 2) return
    if (!suffix.current) suffix.current = String(Math.floor(Math.random() * 900000) + 100000)
    const base = name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 20) || 'persona'
    setValue('username', `${base}_${suffix.current}`)
  }, [name, dirtyFields.username, setValue])

  return (
    <div className="min-h-screen bg-background text-foreground lg:grid lg:grid-cols-2">
      <aside className="hidden flex-col justify-between bg-muted/40 px-12 py-10 text-foreground lg:flex xl:px-20">
        <Link href="/" className="flex w-fit items-center gap-2 text-xl font-bold">
          <Calendar className="h-6 w-6 text-primary" />
          EventNow
        </Link>
        <div className="max-w-md py-16">
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
            {config.countryCode === 'DO' ? 'De verlo a vivirlo · RD' :
             config.countryCode === 'ES' ? 'De verlo a vivirlo · España' :
             config.countryCode === 'MX' ? 'De verlo a vivirlo · México' :
             config.countryCode === 'CO' ? 'De verlo a vivirlo · Colombia' :
             config.countryCode === 'AR' ? 'De verlo a vivirlo · Argentina' :
             'From browsing to living it · Global'}
          </span>
          <h1 className="mt-5 text-5xl font-semibold leading-[1.1] tracking-tight">
            Tu próximo {config.terms.hangout.toLowerCase()}<br />empieza aquí.
          </h1>
          <p className="mt-6 text-lg leading-relaxed text-muted-foreground">
            Descubre eventos a tu ritmo con la jerga y cultura de tu país. Conecta con tus {config.terms.friends.toLowerCase()} y haz el {config.terms.splitBill.toLowerCase()} sin fricciones.
          </p>
          <div className="mt-10 flex flex-wrap gap-2">
            {[
              'Música en vivo',
              config.terms.hangoutPlural,
              config.terms.drinksBites,
              'En Línea & Streams'
            ].map(label => (
              <span key={label} className="rounded-full border border-border px-3 py-2 text-sm text-muted-foreground">
                {label}
              </span>
            ))}
          </div>
          <div className="mt-10 flex items-start gap-3 border-t border-border pt-6 text-sm leading-relaxed text-muted-foreground">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
            Explora antes de decidir. Moneda nativa ({config.currencySymbol} {config.currency}), métodos de cobro locales y adaptabilidad a cualquier país del mundo.
          </div>
        </div>
        <Link href={exploreHref} className="flex w-fit items-center gap-2 text-sm text-muted-foreground hover:text-white">
          <ArrowLeft className="h-4 w-4" />
          Seguir explorando sin cuenta
        </Link>
      </aside>

      <section aria-label="Crear tu cuenta" className="flex justify-center px-5 py-8 sm:px-10 sm:py-12">
        <div className="w-full max-w-md">
          <Link href={exploreHref} className="mb-8 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
            Volver a explorar
          </Link>
          <div className="mb-5 flex items-center gap-3 text-xs font-semibold">
            <span className="rounded-full bg-primary/10 px-3 py-1.5 text-primary">01 · Tu cuenta</span>
            <span className="text-muted-foreground">02 · Personalización nativa</span>
          </div>
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Un buen {config.terms.hangout.toLowerCase()} empieza aquí.
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Un solo paso. Tu experiencia se adapta automáticamente a tu país.
          </p>
          <p className="mt-4 text-sm text-muted-foreground">
            ¿Ya tienes cuenta?{' '}
            <Link href={authPageHref('/login', destination)} className="font-semibold text-primary hover:underline">
              Inicia sesión
            </Link>
          </p>

          {/* Social Sign-In (Google Multi-Account First) */}
          <div className="mt-6">
            <OAuthButtons mode="register" />
          </div>

          <form onSubmit={handleSubmit(onSubmit)} noValidate className="mt-7 space-y-4">
            {/* Country Selector Rail */}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <label className="flex items-center gap-1.5 text-sm font-medium">
                  <Globe className="h-4 w-4 text-primary" />
                  Tu país / Región
                </label>
                <span className="text-xs text-muted-foreground">Adapta la jerga y moneda</span>
              </div>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-3">
                {COUNTRIES.map(c => {
                  const isSelected = selectedCountryCode === c.code
                  return (
                    <button
                      key={c.code}
                      type="button"
                      onClick={() => handleCountrySelect(c.code, c.name)}
                      className={`flex flex-col items-center justify-center rounded-xl border p-2.5 text-center transition-all ${
                        isSelected
                          ? 'border-primary bg-primary/10 text-primary shadow-sm font-semibold ring-1 ring-primary'
                          : 'border-border bg-background hover:bg-muted/60 text-muted-foreground'
                      }`}
                    >
                      <span className="text-xl mb-0.5">{c.flag}</span>
                      <span className="text-xs truncate w-full">{c.label}</span>
                    </button>
                  )
                })}
              </div>

              {/* Dynamic native terms banner */}
              <div className="mt-2 flex items-center gap-2 rounded-lg bg-primary/5 px-3 py-1.5 text-xs text-primary border border-primary/20">
                <Sparkles className="h-3.5 w-3.5 shrink-0" />
                <span>
                  <strong>{COUNTRIES.find(c => c.code === selectedCountryCode)?.label}:</strong> {COUNTRIES.find(c => c.code === selectedCountryCode)?.terms}
                </span>
              </div>
            </div>

            <div>
              <label htmlFor="name" className="mb-1.5 block text-sm font-medium">Tu nombre</label>
              <input
                id="name"
                autoComplete="name"
                placeholder="¿Cómo te llamas?"
                maxLength={50}
                {...register('name')}
                className={inputClass}
                aria-invalid={!!errors.name}
                aria-describedby={errors.name ? 'name-error' : undefined}
              />
              {fieldError('name')}
            </div>

            <details open={errors.username ? true : undefined} className="rounded-xl bg-muted/40 p-3">
              <summary className="cursor-pointer text-sm font-medium">
                Personalizar mi nombre de usuario (opcional)
              </summary>
              <div className="mt-3">
                <label htmlFor="username" className="mb-1.5 block text-sm font-medium">Nombre de usuario</label>
                <input
                  id="username"
                  autoComplete="username"
                  autoCapitalize="none"
                  spellCheck={false}
                  placeholder="tu_usuario"
                  maxLength={30}
                  {...register('username')}
                  className={inputClass}
                  aria-invalid={!!errors.username}
                  aria-describedby={errors.username ? 'username-error' : 'username-hint'}
                />
                <p id="username-hint" className="mt-1.5 text-xs text-muted-foreground">Así te encontrarán otros {config.terms.friends.toLowerCase()}.</p>
                {fieldError('username')}
              </div>
            </details>

            <div>
              <label htmlFor="email" className="mb-1.5 block text-sm font-medium">Correo electrónico</label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                autoCapitalize="none"
                placeholder="tu@correo.com"
                {...register('email')}
                className={inputClass}
                aria-invalid={!!errors.email}
                aria-describedby={errors.email ? 'email-error' : undefined}
              />
              {fieldError('email')}
            </div>

            <div>
              <label htmlFor="birthDate" className="mb-1.5 block text-sm font-medium">Fecha de nacimiento</label>
              <input
                id="birthDate"
                type="date"
                autoComplete="bday"
                {...register('birthDate')}
                className={inputClass}
                aria-invalid={!!errors.birthDate}
                aria-describedby={errors.birthDate ? 'birthDate-error birthDate-hint' : 'birthDate-hint'}
              />
              <p id="birthDate-hint" className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                Nos permite comprobar las restricciones de edad de cada evento.
              </p>
              {fieldError('birthDate')}
            </div>

            <div>
              <label htmlFor="password" className="mb-1.5 block text-sm font-medium">Contraseña</label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  maxLength={128}
                  {...register('password')}
                  className={`${inputClass} pr-12`}
                  aria-invalid={!!errors.password}
                  aria-describedby={errors.password ? 'password-error password-hint' : 'password-hint'}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(value => !value)}
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  aria-pressed={showPassword}
                  className="absolute inset-y-0 right-0 flex w-12 items-center justify-center rounded-r-xl text-muted-foreground hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <div id="password-hint" className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                {[
                  { text: '8 caracteres', valid: password.length >= 8 },
                  { text: 'Mayúscula y minúscula', valid: /[a-z]/.test(password) && /[A-Z]/.test(password) },
                  { text: 'Número', valid: /\d/.test(password) },
                  { text: 'Símbolo @$!%*?&', valid: /[@$!%*?&]/.test(password) },
                ].map(rule => (
                  <span key={rule.text} className={`inline-flex items-center gap-1 ${rule.valid ? 'text-emerald-600 dark:text-emerald-400' : ''}`}>
                    <Check className={`h-3 w-3 ${rule.valid ? 'opacity-100' : 'opacity-30'}`} aria-hidden="true" />
                    {rule.text}
                  </span>
                ))}
              </div>
              {fieldError('password')}
            </div>

            <div className="pt-1">
              <div className="flex items-start gap-3">
                <input
                  id="acceptTerms"
                  type="checkbox"
                  {...register('acceptTerms')}
                  aria-invalid={!!errors.acceptTerms}
                  aria-describedby={errors.acceptTerms ? 'acceptTerms-error' : undefined}
                  className="mt-0.5 h-4 w-4 shrink-0 accent-primary"
                />
                <label htmlFor="acceptTerms" className="text-sm leading-relaxed text-muted-foreground">
                  Acepto los <Link href="/terms" target="_blank" rel="noopener noreferrer" className="text-primary underline underline-offset-2">términos</Link> y la <Link href="/privacy" target="_blank" rel="noopener noreferrer" className="text-primary underline underline-offset-2">política de privacidad</Link>.
                </label>
              </div>
              {fieldError('acceptTerms')}
            </div>

            {errors.root?.server && (
              <p role="alert" className="rounded-xl border border-red-500/30 bg-red-500/5 px-4 py-3 text-sm">
                {errors.root.server.message}
              </p>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-wait disabled:opacity-60"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creando tu cuenta…
                </>
              ) : (
                <>
                  Crear cuenta gratis
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          <p className="mt-7 text-center text-sm text-muted-foreground">
            <Link href={exploreHref} className="hover:text-foreground hover:underline">
              Explorar eventos sin registrarme
            </Link>
          </p>
        </div>
      </section>
    </div>
  )
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center"><Loader2 className="h-7 w-7 animate-spin" aria-label="Cargando registro" /></div>}>
      <RegisterForm />
    </Suspense>
  )
}
