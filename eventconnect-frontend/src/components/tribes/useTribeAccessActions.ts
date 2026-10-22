'use client'

import { useEffect, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { tribesService } from '@/lib/api/services/tribes.service'
import { useAuthStore } from '@/stores/authStore'
import toast from 'react-hot-toast'

export type AccessAction = { tribeId: string; kind: 'join' | 'cancel' | 'approve' | 'reject' | 'leave'; message?: string; targetUserId?: string }
function errorMessage(error: unknown) {
  const candidate = error as { response?: { data?: { message?: unknown } }; message?: unknown }
  const message = candidate?.response?.data?.message || candidate?.message
  return typeof message === 'string' && message.trim() ? message : 'No pudimos completar la acción. Puedes volver a intentarlo.'
}

export function useTribeAccessActions(userId: string) {
  const queryClient = useQueryClient()
  const identity = useRef(userId)
  identity.current = userId
  const mounted = useRef(true)
  const lock = useRef(false)
  const [pending, setPending] = useState<AccessAction | null>(null)
  const [failure, setFailure] = useState<{ action: AccessAction; message: string } | null>(null)
  useEffect(() => { mounted.current = true; return () => { mounted.current = false } }, [])
  useEffect(() => { setFailure(null); setPending(null) }, [userId])

  const run = async (action: AccessAction): Promise<boolean> => {
    if (lock.current || !userId) return false
    const owner = userId
    const stillCurrent = () => {
      const user = useAuthStore.getState().user
      return mounted.current && identity.current === owner && String(user?._id || user?.id || '') === owner
    }
    if (!stillCurrent()) return false
    lock.current = true
    setPending(action)
    setFailure(null)
    try {
      let result: any
      if (action.kind === 'join') result = await tribesService.joinTribe(action.tribeId, action.message)
      else if (action.kind === 'cancel') result = await tribesService.cancelJoinRequest(action.tribeId)
      else if (action.kind === 'approve') result = await tribesService.approveJoinRequest(action.tribeId, action.targetUserId!)
      else if (action.kind === 'reject') result = await tribesService.rejectJoinRequest(action.tribeId, action.targetUserId!)
      else result = await tribesService.leaveTribe(action.tribeId)
      if (result?.success === false) throw new Error(result.message || 'El servidor no confirmó la acción.')
      if (!stillCurrent()) return false
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['tribe', action.tribeId, owner], exact: true }),
        queryClient.invalidateQueries({ queryKey: ['tribes'] }),
      ])
      if (!stillCurrent()) return false
      const message = action.kind === 'join'
        ? result?.status === 'pending' || result?.hasPendingRequest ? 'Solicitud enviada. Espera la revisión de la comunidad.' : 'Ya formas parte de la comunidad.'
        : { cancel: 'Solicitud cancelada.', approve: 'Solicitud aprobada.', reject: 'Solicitud rechazada.', leave: 'Has salido de la comunidad.' }[action.kind]
      toast.success(message)
      return true
    } catch (error) {
      if (stillCurrent()) {
        const message = errorMessage(error)
        setFailure({ action, message })
        toast.error(message)
      }
      return false
    } finally {
      lock.current = false
      if (mounted.current && identity.current === owner) setPending(null)
    }
  }
  return { run, pending, failure, clearFailure: () => setFailure(null), retry: () => failure ? run(failure.action) : Promise.resolve(false) }
}
