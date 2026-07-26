'use client'

import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Mail, Phone, Lock, AlertTriangle, Eye, EyeOff, Monitor, Smartphone } from 'lucide-react'
import { apiClient } from '@/lib/api/client'
import toast from 'react-hot-toast'

interface AccountSettingsProps {
  user: any
}

export default function AccountSettings({ user }: AccountSettingsProps) {
  const queryClient = useQueryClient()
  const [showPasswordForm, setShowPasswordForm] = useState(false)
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [showEmailForm, setShowEmailForm] = useState(false)
  const [newEmail, setNewEmail] = useState('')

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })

  const changePasswordMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiClient.put('/users/me/password', data)
      return response.data
    },
    onSuccess: () => {
      toast.success('Contraseña actualizada exitosamente')
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      })
      setShowPasswordForm(false)
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Error al cambiar contraseña')
    }
  })

  const changeEmailMutation = useMutation({
    mutationFn: async (email: string) => {
      const response = await apiClient.put('/users/me/profile', { email })
      return response.data
    },
    onSuccess: () => {
      toast.success('Se ha enviado un correo de verificación a tu nueva dirección')
      setNewEmail('')
      setShowEmailForm(false)
      queryClient.invalidateQueries({ queryKey: ['user'] })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Error al actualizar email')
    }
  })

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('Las contraseñas no coinciden')
      return
    }

    if (passwordData.newPassword.length < 6) {
      toast.error('La nueva contraseña debe tener al menos 6 caracteres')
      return
    }

    changePasswordMutation.mutate(passwordData)
  }

  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!newEmail || !newEmail.includes('@')) {
      toast.error('Por favor ingresa un email válido')
      return
    }

    if (newEmail === user?.email) {
      toast.error('Este email ya está registrado en tu cuenta')
      return
    }

    changeEmailMutation.mutate(newEmail)
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-2">
          Configuración de la Cuenta
        </h2>
        <p className="text-muted-foreground">
          Administra tu información de cuenta y seguridad
        </p>
      </div>

      {/* Account Information */}
      <div className="glass bg-white/5 border border-white/10 rounded-2xl p-6 space-y-4">
        <h3 className="text-lg font-semibold text-foreground mb-4">
          Información de la Cuenta
        </h3>

        <div className="space-y-4">
          {/* Email */}
          <div className="p-4 glass bg-white/5 rounded-xl">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/20 bg-primary/20 backdrop-blur-sm rounded-lg">
                  <Mail className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-foreground">Email</p>
                  {!showEmailForm && (
                    <p className="text-sm text-muted-foreground">{user?.email}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full text-sm font-medium">
                  Verificado
                </span>
                {!showEmailForm && (
                  <button
                    onClick={() => setShowEmailForm(true)}
                    className="text-sm text-primary hover:text-primary-700 dark:hover:text-primary-300 font-medium"
                  >
                    Cambiar
                  </button>
                )}
              </div>
            </div>

            {showEmailForm && (
              <form onSubmit={handleEmailSubmit} className="space-y-3 pt-3 border-t border-gray-200 dark:border-gray-600">
                <div>
                  <label className="block text-sm font-medium text-foreground/90 mb-2">
                    Nuevo Email
                  </label>
                  <input
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    className="w-full p-3 border border-gray-200 dark:border-white/10 rounded-xl glass bg-white/50 dark:bg-white/5 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="nuevo-email@ejemplo.com"
                    required
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Enviaremos un correo de verificación a esta dirección
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowEmailForm(false)
                      setNewEmail('')
                    }}
                    className="flex-1 px-4 py-2 border border-white/10 text-foreground/90 rounded-lg hover:bg-white/10 transition-colors text-sm font-medium"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={changeEmailMutation.isPending}
                    className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                  >
                    {changeEmailMutation.isPending ? 'Actualizando...' : 'Actualizar Email'}
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Phone */}
          <div className="flex items-center justify-between p-4 glass bg-white/5 rounded-xl">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/20 bg-primary/20 backdrop-blur-sm rounded-lg">
                <Phone className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="font-medium text-foreground">Teléfono</p>
                <p className="text-sm text-muted-foreground">
                  {user?.phone || 'No configurado'}
                </p>
              </div>
            </div>
          </div>

          {/* Account Created */}
          <div className="flex items-center justify-between p-4 glass bg-white/5 rounded-xl">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/20 bg-primary/20 backdrop-blur-sm rounded-lg">
                <AlertTriangle className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="font-medium text-foreground">Cuenta creada</p>
                <p className="text-sm text-muted-foreground">
                  {new Date(user?.createdAt).toLocaleDateString('es-ES', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Password Section */}
      <div className="glass bg-white/5 border border-white/10 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-foreground">
              Contraseña
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              Actualiza tu contraseña para mantener tu cuenta segura
            </p>
          </div>
          {!showPasswordForm && (
            <button
              onClick={() => setShowPasswordForm(true)}
              className="px-4 py-2 bg-primary text-white rounded-xl hover:bg-primary-600 transition-colors font-medium"
            >
              Cambiar Contraseña
            </button>
          )}
        </div>

        {showPasswordForm && (
          <form onSubmit={handlePasswordSubmit} className="space-y-4 mt-6">
            {/* Current Password */}
            <div>
              <label className="block text-sm font-medium text-foreground/90 mb-2">
                Contraseña Actual
              </label>
              <div className="relative">
                <input
                  type={showCurrentPassword ? 'text' : 'password'}
                  value={passwordData.currentPassword}
                  onChange={(e) => setPasswordData({
                    ...passwordData,
                    currentPassword: e.target.value
                  })}
                  className="w-full p-3 pr-12 border border-gray-200 dark:border-white/10 rounded-xl glass bg-white/50 dark:bg-white/5 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  {showCurrentPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            {/* New Password */}
            <div>
              <label className="block text-sm font-medium text-foreground/90 mb-2">
                Nueva Contraseña
              </label>
              <div className="relative">
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData({
                    ...passwordData,
                    newPassword: e.target.value
                  })}
                  className="w-full p-3 pr-12 border border-white/10 rounded-xl glass bg-white/5 text-foreground focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  {showNewPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Mínimo 6 caracteres
              </p>
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-sm font-medium text-foreground/90 mb-2">
                Confirmar Nueva Contraseña
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData({
                    ...passwordData,
                    confirmPassword: e.target.value
                  })}
                  className="w-full p-3 pr-12 border border-white/10 rounded-xl glass bg-white/5 text-foreground focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  {showConfirmPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            {/* Password Strength Indicator */}
            {passwordData.newPassword && (
              <div className="space-y-2">
                <div className="flex gap-2">
                  <div className={`h-2 flex-1 rounded-full ${passwordData.newPassword.length >= 6 ? 'bg-yellow-400' : 'bg-gray-200 dark:bg-gray-600'
                    }`} />
                  <div className={`h-2 flex-1 rounded-full ${passwordData.newPassword.length >= 8 ? 'bg-yellow-400' : 'bg-gray-200 dark:bg-gray-600'
                    }`} />
                  <div className={`h-2 flex-1 rounded-full ${passwordData.newPassword.length >= 10 && /[A-Z]/.test(passwordData.newPassword) ? 'bg-green-400' : 'bg-gray-200 dark:bg-gray-600'
                    }`} />
                </div>
                <p className="text-xs text-muted-foreground">
                  {passwordData.newPassword.length < 6 && 'Contraseña débil'}
                  {passwordData.newPassword.length >= 6 && passwordData.newPassword.length < 8 && 'Contraseña media'}
                  {passwordData.newPassword.length >= 8 && passwordData.newPassword.length < 10 && 'Contraseña buena'}
                  {passwordData.newPassword.length >= 10 && /[A-Z]/.test(passwordData.newPassword) && 'Contraseña fuerte'}
                </p>
              </div>
            )}

            {/* Buttons */}
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={() => {
                  setShowPasswordForm(false)
                  setPasswordData({
                    currentPassword: '',
                    newPassword: '',
                    confirmPassword: ''
                  })
                }}
                className="flex-1 px-6 py-3 border border-white/10 text-foreground/90 rounded-xl hover:bg-white/10 transition-colors font-medium"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={changePasswordMutation.isPending}
                className="flex-1 px-6 py-3 bg-primary text-white rounded-xl hover:bg-primary-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                {changePasswordMutation.isPending ? 'Actualizando...' : 'Actualizar Contraseña'}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Two-Factor Authentication */}
      <div className="glass bg-white/5 border border-white/10 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-foreground">
              Autenticación de Dos Factores (2FA)
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              Agrega una capa adicional de seguridad a tu cuenta
            </p>
          </div>
          <span className="px-3 py-1 bg-red-500/20 backdrop-blur-sm text-red-500 rounded-full text-sm font-medium">
            Desactivado
          </span>
        </div>

        <div className="space-y-4">
          <div className="p-4 glass bg-white/5 rounded-xl">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg mt-1">
                <Phone className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <div className="flex-1">
                <h4 className="font-medium text-foreground mb-1">
                  Aplicación de Autenticación
                </h4>
                <p className="text-sm text-muted-foreground mb-3">
                  Usa una app como Google Authenticator o Authy para generar códigos de verificación
                </p>
                <button className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-600 transition-colors text-sm font-medium">
                  Configurar 2FA
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Active Sessions */}
      <div className="glass bg-white/5 border border-white/10 rounded-2xl p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">
          Sesiones Activas
        </h3>

        <div className="space-y-3">
          {/* Current Session */}
          <div className="p-4 glass bg-white/5 rounded-xl border-2 border-green-200 dark:border-green-800">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                  <Monitor className="w-5 h-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium text-foreground">
                      Windows • Chrome
                    </h4>
                    <span className="px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded text-xs font-medium">
                      Sesión Actual
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    México • Último acceso: Ahora
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Other Session Example */}
          <div className="p-4 glass bg-white/5 rounded-xl">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                  <Smartphone className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h4 className="font-medium text-foreground">
                    iPhone • Safari
                  </h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    México • Hace 2 horas
                  </p>
                </div>
              </div>
              <button className="text-sm text-red-500 hover:text-red-700 dark:hover:text-red-300 font-medium">
                Cerrar sesión
              </button>
            </div>
          </div>
        </div>

        <button className="w-full mt-4 p-3 border-2 border-red-500/30 text-red-500 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors font-medium">
          Cerrar todas las demás sesiones
        </button>
      </div>

      {/* Security Tips */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-2xl p-6">
        <div className="flex gap-3">
          <Lock className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-semibold text-blue-900 dark:text-blue-300 mb-2">
              Consejos de Seguridad
            </h4>
            <ul className="space-y-1 text-sm text-blue-800 dark:text-blue-400">
              <li>• Usa una contraseña única y compleja</li>
              <li>• Cambia tu contraseña regularmente</li>
              <li>• No compartas tu contraseña con nadie</li>
              <li>• Habilita la autenticación de dos factores para mayor seguridad</li>
              <li>• Revisa regularmente tus sesiones activas</li>
              <li>• Cierra sesión en dispositivos que ya no uses</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
