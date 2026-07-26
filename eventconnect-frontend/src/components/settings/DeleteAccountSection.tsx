'use client'

import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Trash2, AlertTriangle, Eye, EyeOff } from 'lucide-react'
import { apiClient } from '@/lib/api/client'
import toast from 'react-hot-toast'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/stores/authStore'

export default function DeleteAccountSection() {
  const router = useRouter()
  const { logout } = useAuthStore()
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [password, setPassword] = useState('')
  const [confirmText, setConfirmText] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [acceptConsequences, setAcceptConsequences] = useState(false)

  const deleteAccountMutation = useMutation({
    mutationFn: async () => {
      const response = await apiClient.delete('/users/me', {
        data: {
          password,
          confirmDelete: confirmText
        }
      })
      return response.data
    },
    onSuccess: () => {
      toast.success('Cuenta eliminada exitosamente')
      logout()
      router.push('/')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Error al eliminar cuenta')
    }
  })

  const handleDeleteAccount = () => {
    if (!password) {
      toast.error('Por favor ingresa tu contraseña')
      return
    }

    if (confirmText !== 'DELETE') {
      toast.error('Por favor escribe DELETE para confirmar')
      return
    }

    if (!acceptConsequences) {
      toast.error('Debes aceptar las consecuencias antes de continuar')
      return
    }

    deleteAccountMutation.mutate()
  }

  return (
    <>
      {/* Danger Zone */}
      <div className="bg-red-50 dark:bg-red-900/20 border-2 border-red-500/30 rounded-2xl p-6">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-red-500 rounded-xl">
            <AlertTriangle className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="text-xl font-bold text-red-900 dark:text-red-400 mb-2">
              Zona de Peligro
            </h3>
            <p className="text-red-800 dark:text-red-300 mb-4">
              Una vez que elimines tu cuenta, no hay vuelta atrás. Por favor, ten certeza.
            </p>

            <button
              onClick={() => setShowDeleteModal(true)}
              className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-medium transition-colors flex items-center gap-2"
            >
              <Trash2 className="w-5 h-5" />
              Eliminar mi cuenta
            </button>
          </div>
        </div>
      </div>

      {/* Delete Account Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass bg-white/5 border border-white/5 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-red-500/20 backdrop-blur-sm rounded-xl">
                  <AlertTriangle className="w-6 h-6 text-red-500" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-foreground">
                    Eliminar Cuenta
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Esta acción es permanente y no se puede deshacer
                  </p>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Warning Message */}
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-500/30 rounded-xl p-4">
                <h4 className="font-semibold text-red-900 dark:text-red-400 mb-2">
                  ¿Qué sucederá cuando elimines tu cuenta?
                </h4>
                <ul className="space-y-2 text-sm text-red-800 dark:text-red-300">
                  <li className="flex items-start gap-2">
                    <span className="text-red-500 mt-0.5">•</span>
                    <span>Tu perfil será eliminado permanentemente</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-red-500 mt-0.5">•</span>
                    <span>Perderás acceso a todos los eventos que has creado</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-red-500 mt-0.5">•</span>
                    <span>Tus mensajes y conversaciones serán eliminados</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-red-500 mt-0.5">•</span>
                    <span>Perderás todos tus logros y puntos</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-red-500 mt-0.5">•</span>
                    <span>No podrás recuperar ninguna información</span>
                  </li>
                </ul>
              </div>

              {/* Confirmation Steps */}
              <div className="space-y-4">
                {/* Password */}
                <div>
                  <label className="block text-sm font-medium text-foreground/90 mb-2">
                    Confirma tu contraseña
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full p-3 pr-12 border border-gray-200 dark:border-white/10 rounded-xl glass bg-white/50 dark:bg-white/5 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-transparent"
                      placeholder="Ingresa tu contraseña"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                    >
                      {showPassword ? (
                        <EyeOff className="w-5 h-5" />
                      ) : (
                        <Eye className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Confirmation Text */}
                <div>
                  <label className="block text-sm font-medium text-foreground/90 mb-2">
                    Escribe <span className="font-bold text-red-600">DELETE</span> para confirmar
                  </label>
                  <input
                    type="text"
                    value={confirmText}
                    onChange={(e) => setConfirmText(e.target.value)}
                    className="w-full p-3 border border-gray-200 dark:border-white/10 rounded-xl glass bg-white/50 dark:bg-white/5 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    placeholder="DELETE"
                    required
                  />
                  {confirmText && confirmText !== 'DELETE' && (
                    <p className="text-sm text-red-500 mt-1">
                      Debe ser exactamente "DELETE" (en mayúsculas)
                    </p>
                  )}
                </div>

                {/* Accept Consequences */}
                <div className="flex items-start gap-3 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                  <input
                    type="checkbox"
                    id="accept-consequences"
                    checked={acceptConsequences}
                    onChange={(e) => setAcceptConsequences(e.target.checked)}
                    className="mt-1 w-4 h-4 text-red-600 bg-gray-100 border-gray-300 rounded focus:ring-red-500 dark:focus:ring-red-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                  />
                  <label
                    htmlFor="accept-consequences"
                    className="text-sm text-foreground/90"
                  >
                    Entiendo que esta acción es permanente y que perderé todo acceso a mi cuenta,
                    eventos, mensajes, logros y cualquier otro dato asociado con mi cuenta.
                    Acepto que esta acción no se puede deshacer.
                  </label>
                </div>
              </div>

              {/* Final Warning */}
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-4">
                <p className="text-sm text-yellow-800 dark:text-yellow-400">
                  <strong>Alternativa:</strong> Si solo necesitas un descanso, considera desactivar
                  temporalmente tu cuenta en lugar de eliminarla permanentemente. Puedes reactivarla
                  cuando quieras.
                </p>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="p-6 border-t border-white/10 flex gap-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false)
                  setPassword('')
                  setConfirmText('')
                  setAcceptConsequences(false)
                }}
                className="flex-1 px-6 py-3 border-2 border-white/10 text-foreground/90 rounded-xl hover:bg-white/10 transition-colors font-medium"
              >
                Cancelar
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={
                  deleteAccountMutation.isPending ||
                  !password ||
                  confirmText !== 'DELETE' ||
                  !acceptConsequences
                }
                className="flex-1 px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center justify-center gap-2"
              >
                <Trash2 className="w-5 h-5" />
                {deleteAccountMutation.isPending ? 'Eliminando...' : 'Eliminar Definitivamente'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
