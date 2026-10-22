'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import toast from 'react-hot-toast'
import Link from 'next/link'
import { Mail, ChevronLeft, Send, CheckCircle } from 'lucide-react'

import { apiClient } from '@/lib/api/client'

const forgotPasswordSchema = z.object({
  email: z.string().email('Por favor ingresa un correo válido'),
})

type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>

export default function ForgotPasswordPage() {
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
  })

  const email = watch('email')

  const onSubmit = async (data: ForgotPasswordFormData) => {
    try {
      setIsLoading(true)
      
      await apiClient.post('/auth/forgot-password', data)
      
      setIsSubmitted(true)
      toast.success('¡Correo de recuperación enviado con éxito!')
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error al enviar el correo de recuperación')
    } finally {
      setIsLoading(false)
    }
  }

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-transparent flex items-center justify-center p-4">
        {/* Glow Effects */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-[600px] h-[500px] bg-violet-500/20 dark:bg-violet-500/10 blur-[120px] rounded-full pointer-events-none" />

        <div className="w-full max-w-md relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="glass bg-white/60 dark:bg-gray-900/60 backdrop-blur-2xl border border-white/20 dark:border-white/10 shadow-2xl rounded-3xl p-8">
              <div className="text-center mb-6">
                <div className="mx-auto mb-6 w-20 h-20 bg-violet-100 dark:bg-violet-500/20 rounded-full flex items-center justify-center">
                  <CheckCircle className="h-10 w-10 text-violet-600 dark:text-violet-400" />
                </div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                  ¡Correo Enviado!
                </h1>
                <p className="text-gray-500 dark:text-gray-400">
                  Hemos enviado un enlace de recuperación a: <br/> <strong className="text-gray-700 dark:text-gray-300">{email}</strong>
                </p>
              </div>
              
              <div className="space-y-6">
                <div className="text-center text-sm text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-white/5 p-4 rounded-2xl">
                  <p>Revisa tu bandeja de entrada y sigue el enlace para restablecer tu contraseña.</p>
                  <p className="mt-2 text-xs">¿No lo recibiste? Revisa tu carpeta de spam.</p>
                </div>
                
                <button
                  onClick={() => setIsSubmitted(false)}
                  className="w-full py-3 px-4 rounded-xl font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 transition-all"
                >
                  Intentar con otro correo
                </button>
                
                <div className="text-center">
                  <Link 
                    href="/login" 
                    className="inline-flex items-center text-sm text-violet-600 dark:text-violet-400 hover:text-violet-700 dark:hover:text-violet-300 font-medium transition-colors"
                  >
                    <ChevronLeft className="mr-1 h-4 w-4" />
                    Volver al inicio de sesión
                  </Link>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-transparent flex items-center justify-center p-4">
      {/* Glow Effects */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-[600px] h-[500px] bg-blue-500/20 dark:bg-blue-500/10 blur-[120px] rounded-full pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="glass bg-white/60 dark:bg-gray-900/60 backdrop-blur-2xl border border-white/20 dark:border-white/10 shadow-2xl rounded-3xl p-8">
            <div className="text-center mb-8">
              <div className="mx-auto mb-6 w-20 h-20 bg-blue-100 dark:bg-blue-500/20 rounded-full flex items-center justify-center">
                <Mail className="h-10 w-10 text-blue-600 dark:text-blue-400" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                ¿Olvidaste tu contraseña?
              </h1>
              <p className="text-gray-500 dark:text-gray-400 text-sm">
                Ingresa tu correo electrónico y te enviaremos un enlace para restablecerla.
              </p>
            </div>
            
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Correo Electrónico
                </label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                  <input
                    {...register('email')}
                    type="email"
                    placeholder="nombre@ejemplo.com"
                    className="w-full pl-12 pr-4 py-3 bg-white/50 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none text-gray-900 dark:text-white placeholder-gray-400"
                    autoFocus
                  />
                </div>
                {errors.email && (
                  <p className="text-red-500 text-sm mt-1">{errors.email.message}</p>
                )}
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex items-center justify-center py-3 px-4 bg-gradient-to-r from-violet-500 to-cyan-500 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-medium transition-all transform hover:scale-[1.02] disabled:opacity-50 disabled:scale-100"
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-white/20 border-t-white mr-2" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Enviar Enlace de Recuperación
                  </>
                )}
              </button>
            </form>

            <div className="mt-8 text-center pt-6 border-t border-gray-200 dark:border-white/10">
              <Link 
                href="/login" 
                className="inline-flex items-center text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white font-medium transition-colors"
              >
                <ChevronLeft className="mr-1 h-4 w-4" />
                Volver al inicio de sesión
              </Link>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}