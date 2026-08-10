'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { Mail, Lock, Eye, EyeOff, User, Loader2, ChevronRight, ChevronLeft, Calendar, ArrowRight, Sparkles, Phone } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import InterestsSelector from '@/components/auth/InterestsSelector'
import toast from 'react-hot-toast'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import OAuthButtons from '@/components/auth/OAuthButtons'
import { Onboarding } from '@/components/redesign/Onboarding'
import { cn } from '@/lib/utils'

// ─── Schema ───────────────────────────────────────────────────────────────────

const registerSchema = z.object({
  firstName: z.string().min(2, 'Mínimo 2 caracteres').max(50),
  lastName: z.string().min(2, 'Mínimo 2 caracteres').max(50),
  username: z.string()
    .min(3, 'Mínimo 3 caracteres').max(30)
    .regex(/^[a-zA-Z0-9_]+$/, 'Solo letras, números y guiones bajos'),
  email: z.string().min(1, 'Requerido').email('Email inválido'),
  birthDate: z.string()
    .min(1, 'Requerido')
    .refine((v) => {
      const t = Date.parse(v)
      return !isNaN(t) && t < Date.now()
    }, 'La fecha debe ser en el pasado'),
  password: z.string()
    .min(8, 'Mínimo 8 caracteres')
    .regex(/(?=.*[a-z])/, 'Debe contener al menos una minúscula')
    .regex(/(?=.*[A-Z])/, 'Debe contener al menos una mayúscula')
    .regex(/(?=.*\d)/, 'Debe contener al menos un número')
    .regex(/(?=.*[@$!%*?&])/, 'Debe contener al menos un carácter especial (@$!%*?&)'),
  confirmPassword: z.string().min(1, 'Confirma tu contraseña'),
  phone: z.string().regex(/^[0-9+\-\s()]*$/, 'Formato inválido').optional().or(z.literal('')),
  acceptTerms: z.boolean().refine((v) => v, 'Debes aceptar los términos'),
  interests: z.array(z.string()).min(1, 'Selecciona al menos 1 interés'),
}).refine((d) => d.password === d.confirmPassword, {
  message: 'Las contraseñas no coinciden',
  path: ['confirmPassword'],
})

type RegisterFormData = z.infer<typeof registerSchema>

// ─── Field wrapper ─────────────────────────────────────────────────────────────

function Field({
  id,
  label,
  error,
  children,
  className,
}: {
  id: string
  label: string
  error?: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <label htmlFor={id} className="block text-sm font-medium text-muted-foreground">
        {label}
      </label>
      {children}
      {error && (
        <p role="alert" className="text-xs text-red-500 font-medium">
          {error}
        </p>
      )}
    </div>
  )
}

const inputCls =
  'w-full py-3 text-sm rounded-xl border border-border bg-gray-50 bg-primary/5 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/60 transition-all'

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function RegisterPage() {
  const router = useRouter()
  const { register: registerUser, user } = useAuthStore()

  const [step, setStep] = useState(1)
  const [showPassword, setShowPassword] = useState(false)
  const [showOnboarding, setShowOnboarding] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    trigger,
    watch,
    setValue,
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    mode: 'onChange',
    reValidateMode: 'onChange',
    defaultValues: {
      firstName: '', lastName: '', username: '', email: '',
      birthDate: '', password: '', confirmPassword: '',
      phone: '', acceptTerms: false, interests: [],
    },
  })

  const interests = watch('interests')

  const handleNextStep = async (e: React.FormEvent) => {
    e.preventDefault()
    const ok = await trigger([
      'firstName', 'lastName', 'username', 'email',
      'birthDate', 'password', 'confirmPassword', 'acceptTerms', 'phone',
    ])
    if (ok) setStep(2)
  }

  const onSubmit = async (data: RegisterFormData) => {
    try {
      await registerUser({
        username: data.username,
        email: data.email,
        birthDate: data.birthDate,
        password: data.password,
        firstName: data.firstName,
        lastName: data.lastName,
        acceptTerms: data.acceptTerms,
        interests: data.interests,
        phone: data.phone,
      })
      toast.success('¡Cuenta creada!')
      setShowOnboarding(true)
    } catch (error: any) {
      toast.error(error.message || 'Error al crear la cuenta')
    }
  }

  if (showOnboarding) {
    return <Onboarding user={user} onComplete={() => router.push('/events')} />
  }

  return (
    <div className="min-h-screen flex bg-white dark:bg-background">

      {/* ── Left panel ────────────────────────────────────────────────── */}
      <div className="hidden lg:flex lg:flex-1 flex-col justify-between relative overflow-hidden bg-background p-12">
        <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
          <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-primary/20 rounded-full blur-[120px] translate-x-1/2 -translate-y-1/2" />
          <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-primary/15 rounded-full blur-[100px] -translate-x-1/3 translate-y-1/3" />
        </div>

        <div className="relative z-10 flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg shadow-primary/30">
            <Calendar className="w-5 h-5 text-white" aria-hidden="true" />
          </div>
          <span className="text-xl font-bold text-white tracking-tight">
            Event<span className="text-primary">Now</span>
          </span>
        </div>

        <div className="relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="inline-flex items-center gap-2 px-3 py-1.5 mb-6 rounded-full bg-primary/15 border border-primary/25 text-primary text-sm font-medium">
              <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
              Únete a la comunidad
            </div>
            <h1 className="text-4xl xl:text-5xl font-extrabold text-white leading-tight mb-4 tracking-tight">
              Tu aventura<br />empieza<br />aquí
            </h1>
            <p className="text-muted-foreground text-base leading-relaxed max-w-sm">
              Crea tu cuenta gratuita y descubre miles de eventos exclusivos en tu ciudad.
            </p>
          </motion.div>

          <motion.ul
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-12 space-y-4"
          >
            {[
              '✓  Descubre eventos cercanos personalizados',
              '✓  Conecta con comunidades que te interesan',
              '✓  Tickets seguros con pagos cifrados',
            ].map((item) => (
              <li key={item} className="text-sm text-muted-foreground font-medium">{item}</li>
            ))}
          </motion.ul>
        </div>

        <p className="relative z-10 text-xs text-gray-600">© 2025 EventNow</p>
      </div>

      {/* ── Right panel: form ─────────────────────────────────────────── */}
      <div className="flex-1 flex items-start justify-center px-4 sm:px-8 py-12 overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className="w-full max-w-sm"
        >
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2 mb-10">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <Calendar className="w-4 h-4 text-white" aria-hidden="true" />
            </div>
            <span className="text-lg font-bold text-foreground">
              Event<span className="text-primary">Now</span>
            </span>
          </div>

          {/* Step header */}
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4" aria-label={`Paso ${step} de 2`}>
              {[1, 2].map((s) => (
                <div
                  key={s}
                  className={cn(
                    'h-1 rounded-full transition-all duration-300',
                    s === step ? 'flex-[2] bg-primary' : s < step ? 'bg-primary/60' : 'flex-1 bg-gray-200 bg-primary/10'
                  )}
                />
              ))}
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-1">
              {step === 1 ? 'Crea tu cuenta' : 'Tus intereses'}
            </h2>
            <p className="text-sm text-muted-foreground">
              {step === 1 ? (
                <>
                  ¿Ya tienes cuenta?{' '}
                  <Link href="/login" className="font-semibold text-primary hover:underline underline-offset-2">
                    Inicia sesión
                  </Link>
                </>
              ) : (
                'Selecciona entre 1 y 5 intereses para personalizar tu experiencia'
              )}
            </p>
          </div>

          {/* ── Step 1 ── */}
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.form
                key="step1"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2 }}
                onSubmit={handleNextStep}
                noValidate
                className="space-y-4"
              >
                <OAuthButtons mode="register" />

                <Field id="username" label="Nombre de usuario" error={errors.username?.message}>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" aria-hidden="true" />
                    <input
                      id="username" type="text" autoComplete="username"
                      {...register('username')}
                      className={cn(inputCls, 'pl-10 pr-4')}
                      placeholder="tu_usuario"
                    />
                  </div>
                </Field>

                <div className="grid grid-cols-2 gap-3">
                  <Field id="firstName" label="Nombre" error={errors.firstName?.message}>
                    <input
                      id="firstName" type="text" autoComplete="given-name"
                      {...register('firstName')}
                      className={cn(inputCls, 'px-4')}
                      placeholder="Juan"
                    />
                  </Field>
                  <Field id="lastName" label="Apellido" error={errors.lastName?.message}>
                    <input
                      id="lastName" type="text" autoComplete="family-name"
                      {...register('lastName')}
                      className={cn(inputCls, 'px-4')}
                      placeholder="Pérez"
                    />
                  </Field>
                </div>

                <Field id="email" label="Correo electrónico" error={errors.email?.message}>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" aria-hidden="true" />
                    <input
                      id="email" type="email" autoComplete="email"
                      {...register('email')}
                      className={cn(inputCls, 'pl-10 pr-4')}
                      placeholder="tu@email.com"
                    />
                  </div>
                </Field>

                <Field id="birthDate" label="Fecha de nacimiento" error={errors.birthDate?.message}>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" aria-hidden="true" />
                    <input
                      id="birthDate" type="date"
                      {...register('birthDate')}
                      className={cn(inputCls, 'pl-10 pr-4')}
                    />
                  </div>
                </Field>

                <Field id="password" label="Contraseña" error={errors.password?.message}>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" aria-hidden="true" />
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      {...register('password')}
                      className={cn(inputCls, 'pl-10 pr-11')}
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((s) => !s)}
                      aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showPassword
                        ? <EyeOff className="w-4 h-4" aria-hidden="true" />
                        : <Eye className="w-4 h-4" aria-hidden="true" />
                      }
                    </button>
                  </div>
                </Field>

                <Field id="confirmPassword" label="Confirmar contraseña" error={errors.confirmPassword?.message}>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" aria-hidden="true" />
                    <input
                      id="confirmPassword"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      {...register('confirmPassword')}
                      className={cn(inputCls, 'pl-10 pr-4')}
                      placeholder="••••••••"
                    />
                  </div>
                </Field>

                <Field id="phone" label="Teléfono (opcional)" error={errors.phone?.message}>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" aria-hidden="true" />
                    <input
                      id="phone" type="tel" autoComplete="tel"
                      {...register('phone')}
                      className={cn(inputCls, 'pl-10 pr-4')}
                      placeholder="+52 55 1234 5678"
                    />
                  </div>
                </Field>

                <div className="space-y-1">
                  <div className="flex items-start gap-2.5">
                    <input
                      id="terms"
                      type="checkbox"
                      checked={watch('acceptTerms')}
                      onChange={(e) => { setValue('acceptTerms', e.target.checked); trigger('acceptTerms') }}
                      className="mt-0.5 w-4 h-4 shrink-0 rounded border-gray-300 text-primary focus:ring-emerald-500 accent-primary cursor-pointer"
                    />
                    <span className="text-xs text-muted-foreground leading-relaxed select-none cursor-default">
                      Acepto los términos y condiciones y la política de privacidad
                    </span>
                  </div>
                  <div className="pl-6 flex gap-3">
                    <Link href="/terms" target="_blank" className="text-xs text-primary hover:underline underline-offset-2">
                      Términos
                    </Link>
                    <Link href="/privacy" target="_blank" className="text-xs text-primary hover:underline underline-offset-2">
                      Privacidad
                    </Link>
                  </div>
                  {errors.acceptTerms && (
                    <p role="alert" className="text-xs text-red-500 font-medium">{errors.acceptTerms.message}</p>
                  )}
                </div>

                <button
                  type="submit"
                  className="group w-full flex items-center justify-center gap-2 py-3 px-4 bg-primary text-primary-foreground text-white dark:text-foreground rounded-xl font-semibold text-sm transition-all hover:opacity-90 shadow-lg shadow-black/10 mt-2"
                >
                  Siguiente
                  <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                </button>

                <div className="text-center pt-2">
                  <Link
                    href="/events"
                    className="text-xs text-muted-foreground dark:text-gray-500 hover:text-muted-foreground hover:text-foreground transition-colors"
                  >
                    ← Explorar sin cuenta
                  </Link>
                </div>
              </motion.form>
            )}

            {/* ── Step 2 ── */}
            {step === 2 && (
              <motion.form
                key="step2"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2 }}
                onSubmit={handleSubmit(onSubmit)}
                noValidate
                className="space-y-5"
              >
                <InterestsSelector
                  selectedInterests={interests}
                  onChange={(v) => setValue('interests', v)}
                  min={1}
                  max={5}
                />
                {errors.interests && (
                  <p role="alert" className="text-xs text-red-500 font-medium">
                    {errors.interests.message as string}
                  </p>
                )}

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold rounded-xl border border-border text-muted-foreground hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" aria-hidden="true" />
                    Atrás
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || interests.length < 1}
                    className="flex-[2] flex items-center justify-center gap-2 py-3 text-sm font-semibold rounded-xl bg-primary text-primary-foreground text-white dark:text-foreground disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition-all shadow-lg shadow-black/10"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                        Creando…
                      </>
                    ) : (
                      <>
                        Crear cuenta
                        <ArrowRight className="w-4 h-4" aria-hidden="true" />
                      </>
                    )}
                  </button>
                </div>
              </motion.form>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  )
}
