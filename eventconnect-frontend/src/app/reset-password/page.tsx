'use client'

import { Suspense, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { CheckCircle, KeyRound, Loader2 } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { apiClient } from '@/lib/api/client'

const schema = z.object({
  password: z.string().min(8, 'Usa al menos 8 caracteres').regex(/[a-z]/, 'Incluye una minúscula').regex(/[A-Z]/, 'Incluye una mayúscula').regex(/\d/, 'Incluye un número').regex(/[@$!%*?&]/, 'Incluye un símbolo (@$!%*?&)'),
  confirmation: z.string(),
}).refine(data => data.password === data.confirmation, { path: ['confirmation'], message: 'Las contraseñas no coinciden' })

function ResetPasswordForm() {
  const params = useSearchParams()
  const token = params.get('token')
  const [complete, setComplete] = useState(false)
  const [error, setError] = useState('')
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema) })
  const submit = async ({ password }: z.infer<typeof schema>) => {
    setError('')
    try {
      await apiClient.post('/auth/reset-password', { token, password })
      setComplete(true)
    } catch (failure: any) {
      setError(failure.response?.data?.message || 'No se pudo restablecer la contraseña. Solicita un nuevo enlace o vuelve a intentarlo.')
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 p-6">
      <section className="w-full max-w-md rounded-3xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-white/10 p-8 shadow-sm">
        {complete ? <CheckCircle className="h-10 w-10 text-violet-500 mb-5" /> : <KeyRound className="h-10 w-10 text-violet-500 mb-5" />}
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{complete ? 'Contraseña actualizada' : 'Crea tu nueva contraseña'}</h1>
        {complete ? <p className="mt-4 text-gray-500">Ya puedes iniciar sesión con tu nueva contraseña.</p> : !token ? (
          <p role="alert" className="mt-4 text-red-500">Este enlace no contiene un código de recuperación. Solicita uno nuevo.</p>
        ) : (
          <form onSubmit={handleSubmit(submit)} className="mt-6 space-y-5" noValidate>
            {(['password', 'confirmation'] as const).map(name => (
              <div key={name}>
                <label htmlFor={name} className="block text-sm font-medium mb-2">{name === 'password' ? 'Nueva contraseña' : 'Repite la contraseña'}</label>
                <input id={name} type="password" autoComplete="new-password" {...register(name)} aria-invalid={!!errors[name]} aria-describedby={errors[name] ? `${name}-error` : undefined} className="w-full rounded-xl border border-gray-300 dark:border-white/20 bg-transparent p-3" />
                {errors[name] && <p id={`${name}-error`} role="alert" className="text-sm text-red-500 mt-2">{errors[name]?.message}</p>}
              </div>
            ))}
            <p className="text-xs text-gray-500">Mínimo 8 caracteres, una mayúscula, una minúscula, un número y un símbolo (@$!%*?&).</p>
            {error && <p role="alert" className="text-sm text-red-500">{error}</p>}
            <button disabled={isSubmitting} className="w-full rounded-xl bg-violet-600 text-white py-3 font-semibold disabled:opacity-50">{isSubmitting ? 'Guardando…' : 'Guardar contraseña'}</button>
          </form>
        )}
        <Link href={complete ? '/login' : '/forgot-password'} className="block mt-6 text-sm font-semibold text-violet-500">{complete ? 'Iniciar sesión' : 'Solicitar un nuevo enlace'}</Link>
      </section>
    </main>
  )
}

export default function ResetPasswordPage() {
  return <Suspense fallback={<div className="min-h-screen grid place-items-center"><Loader2 className="animate-spin" aria-label="Cargando" /></div>}><ResetPasswordForm /></Suspense>
}
