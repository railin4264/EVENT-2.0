'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Users,
  CheckCircle2,
  Clock,
  Share2,
  ArrowLeft,
  Calendar,
  MapPin,
  Building2,
  Copy,
  Check,
  Send,
  Loader2,
  Sparkles
} from 'lucide-react'
import { apiClient } from '@/lib/api/client'
import { useAuthStore } from '@/stores/authStore'
import { Button } from '@/components/redesign/ui/button'
import { Input } from '@/components/redesign/ui/input'
import toast from 'react-hot-toast'

export default function SerruchoPage() {
  const params = useParams()
  const router = useRouter()
  const queryClient = useQueryClient()
  const { user, isAuthenticated } = useAuthStore()
  const shareCode = params?.code as string

  const identity = isAuthenticated ? user?.id || user?._id || 'signed-in' : 'guest'
  const identityRef = useRef(identity)
  identityRef.current = identity
  const actionLock = useRef(false)
  const [confirming, setConfirming] = useState<{ id: string; name: string; amount: number; identity: string } | null>(null)
  const [copied, setCopied] = useState(false)
  const [isJoining, setIsJoining] = useState(false)
  const [voucherRef, setVoucherRef] = useState('')
  useEffect(() => { setVoucherRef('') }, [identity])

  const { data: serrucho, isLoading, error, refetch } = useQuery({
    queryKey: ['serrucho', shareCode, identity],
    queryFn: async () => {
      const res = await apiClient.get(`/serrucho/${shareCode}`)
      if (!res.data?.success || !res.data?.data) throw new Error('Respuesta del serrucho no válida')
      return res.data.data
    },
    enabled: Boolean(shareCode)
  })

  const confirmMutation = useMutation({
    mutationFn: async ({ participantId }: { participantId: string; identity: string }) => {
      const res = await apiClient.put(`/serrucho/${shareCode}/confirm/${participantId}`)
      if (!res.data?.success) throw new Error(res.data?.message || 'No se guardó la confirmación')
      return res.data
    },
    onSuccess: (_data, change) => {
      if (identityRef.current !== change.identity) return
      setConfirming(null)
      toast.success('Recepción registrada por el organizador')
      queryClient.invalidateQueries({ queryKey: ['serrucho', shareCode] })
    },
    onError: (err: any, change) => {
      if (identityRef.current !== change.identity) return
      toast.error(err?.response?.data?.message || 'Error al confirmar pago')
    }
  })

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isAuthenticated) { router.push(`/login?redirect=${encodeURIComponent(`/serrucho/${shareCode}`)}`); return }
    if (actionLock.current || !(serrucho?.canJoin || serrucho?.canSubmitEvidence && voucherRef.trim())) return
    const account = identity
    actionLock.current = true
    setIsJoining(true)
    try {
      const res = await apiClient.post(`/serrucho/${shareCode}/join`, {
        ...(voucherRef.trim() ? { voucherRef: voucherRef.trim() } : { amount: serrucho.perPersonAmount })
      })
      if (res.data?.success) {
        if (identityRef.current !== account) return
        toast.success(voucherRef.trim() ? 'Referencia enviada para revisión; el pago sigue sin confirmar.' : 'Te has sumado. Tu aporte sigue pendiente de recepción.')
        setVoucherRef('')
        queryClient.invalidateQueries({ queryKey: ['serrucho', shareCode] })
      } else throw new Error('No se pudo registrar tu adhesión')
    } catch (err: any) {
      if (identityRef.current === account) toast.error(err?.response?.data?.message || err?.message || 'Error al sumarse')
    } finally {
      setIsJoining(false)
      actionLock.current = false
    }
  }

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(new URL(`/serrucho/${encodeURIComponent(shareCode)}`, window.location.origin).href)
      setCopied(true)
      toast.success('¡Enlace del serrucho copiado!')
    } catch { toast.error('No pudimos copiar. Puedes copiar la dirección del navegador.') }
  }

  const handleWhatsAppShare = () => {
    if (!serrucho) return
    const msg = `¡Mi gente! Organicemos los aportes para "${serrucho.event?.title || 'este plan'}". Cada parte: ${formatAmount(serrucho.perPersonAmount)}. Registro manual de aportes; no compra entradas ni reserva cupos. ${new URL(`/serrucho/${encodeURIComponent(shareCode)}`, window.location.origin).href}`
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`, '_blank')
  }

  const handlePingParticipant = (p: any) => {
    if (!serrucho) return
    const url = new URL(`/serrucho/${encodeURIComponent(shareCode)}`, window.location.origin).href
    const firstName = (p.name || 'pana').split(' ')[0]
    const msg = `¡Dímelo ${firstName}! 👋 Te recuerdo tu aporte de ${formatAmount(p.amount || serrucho.perPersonAmount)} para el serrucho de "${serrucho.title}". Coordina el pago y confirma los detalles aquí: ${url}`
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`, '_blank')
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center text-white">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  if (error || !serrucho) {
    return (
      <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-4 text-center text-white">
        <h2 className="text-2xl font-bold mb-2">Serrucho no encontrado</h2>
        <p className="text-gray-400 text-sm mb-5">El enlace puede haber expirado o no existe.</p>
        <Button onClick={() => void refetch()} className="mb-4">Reintentar carga</Button>
        <Button asChild className="rounded-xl"><Link href="/events">Explorar otros eventos</Link></Button>
      </div>
    )
  }

  const collected = Number(serrucho.totalCollected) || 0
  const formatAmount = (value: number) => {
    try { return new Intl.NumberFormat('es-DO', { style: 'currency', currency: serrucho.currency, currencyDisplay: 'code' }).format(value) }
    catch { return `${Number(value || 0).toLocaleString('es-DO')} ${serrucho.currency || 'moneda por confirmar'}` }
  }

  const progressPercent = Math.min(100, Math.round((collected / (serrucho.targetAmount || 1)) * 100))
  const isCreator = serrucho.canManage === true
  const isCompleted = serrucho.status === 'completed'
  const isClosed = isCompleted || serrucho.status === 'cancelled' || serrucho.isExpired

  return (
    <div className="min-h-screen bg-gray-950 text-white pb-16">
      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-gray-950/90 backdrop-blur border-b border-white/10 py-3.5 px-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link
            href={`/events/${serrucho.event?._id}`}
            className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Volver al evento</span>
          </Link>
          <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">
            Serrucho Digital RD 🇩🇴
          </span>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 pt-6 space-y-6">
        {/* Hero Card */}
        <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-amber-500/10 via-card to-primary/10 p-6 sm:p-8 space-y-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 text-xs font-bold mb-2">
                <Users className="w-3.5 h-3.5" />
                <span>{serrucho.targetParticipants} personas en la meta</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                {serrucho.title}
              </h1>
              <p className="text-xs sm:text-sm text-gray-400 mt-1">
                Para asistir a: <span className="text-white font-semibold">{serrucho.event?.title}</span>
              </p>
            </div>

            {/* Status Badge */}
            <div className={`px-4 py-2 rounded-2xl text-xs font-black uppercase tracking-wider ${
              isCompleted
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
            }`}>
              {serrucho.status === 'cancelled' ? 'Cancelado' : isCompleted ? 'Meta registrada' : serrucho.isExpired ? 'Plazo vencido' : 'Coordinando aportes'}
            </div>
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex items-baseline justify-between">
              <div>
                <span className="text-2xl sm:text-3xl font-black text-white">
                  {formatAmount(collected)}
                </span>
                <span className="text-xs text-gray-400 ml-2">
                  de {formatAmount(serrucho.targetAmount)}
                </span>
              </div>
              <span className="text-sm font-bold text-amber-400">
                {progressPercent}%
              </span>
            </div>
            <div className="w-full h-3.5 rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-amber-500 to-emerald-500 transition-all duration-700 rounded-full"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          <p className="rounded-2xl border border-amber-500/25 bg-amber-500/5 p-4 text-sm leading-relaxed text-amber-100">Registro manual de aportes. EventNow no cobra, retiene ni garantiza este dinero. Unirse no compra una entrada ni reserva cupos del evento. Los importes cuentan como recibidos sólo cuando el organizador registra su confirmación.</p>

          {/* Share Actions */}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Button
              onClick={handleWhatsAppShare}
              className="flex-1 sm:flex-none h-11 px-5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-lg shadow-emerald-900/30"
            >
              <Send className="w-4 h-4 mr-1.5" />
              Compartir en WhatsApp
            </Button>
            <Button
              onClick={handleCopyLink}
              variant="outline"
              className="h-11 px-4 rounded-2xl border-white/10 hover:bg-white/10 text-xs font-bold text-white"
            >
              {copied ? <Check className="w-4 h-4 mr-1.5 text-emerald-400" /> : <Copy className="w-4 h-4 mr-1.5" />}
              {copied ? '¡Copiado!' : 'Copiar Enlace'}
            </Button>
          </div>
        </div>

        {/* Two Column Layout: Participants & Payment Info */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Participants List */}
          <div className="rounded-3xl border border-white/10 bg-card p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" />
                <span>Integrantes y aportes</span>
              </h2>
              <span className="text-xs text-gray-400">
                {formatAmount(serrucho.perPersonAmount)} / persona
              </span>
            </div>

            <div className="space-y-2.5">
              {(serrucho.participants || []).map((p: any, idx: number) => (
                <div
                  key={p._id || idx}
                  className="flex items-center justify-between p-3.5 rounded-2xl bg-white/5 border border-white/5"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/20 text-primary font-bold text-xs flex items-center justify-center">
                      {p.name?.[0] || 'A'}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-white">{p.name}</p>
                      <p className="text-[11px] text-gray-400">Aporte: {formatAmount(p.amount)}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {p.paymentStatus === 'confirmed' ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-emerald-500/20 text-emerald-400 text-[11px] font-bold">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Recepción confirmada
                      </span>
                    ) : (
                      <>
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-amber-500/20 text-amber-400 text-[11px] font-bold">
                          <Clock className="w-3.5 h-3.5" />
                          {p.paymentStatus === 'submitted' ? 'Por revisar' : 'Pendiente'}
                        </span>
                        {serrucho.status !== 'cancelled' && (
                          <button
                            type="button"
                            onClick={() => handlePingParticipant(p)}
                            title={`Recordar aporte a ${p.name} por WhatsApp`}
                            aria-label={`Recordar aporte a ${p.name} por WhatsApp`}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-[11px] font-semibold transition-colors border border-emerald-500/20"
                          >
                            <Send className="w-3 h-3" />
                            <span className="hidden sm:inline">Recordar</span>
                          </button>
                        )}
                      </>
                    )}

                    {isCreator && p._id && p.paymentStatus !== 'confirmed' && serrucho.status !== 'cancelled' && (
                      <Button
                        size="sm"
                        onClick={() => setConfirming({ id: p._id, name: p.name, amount: p.amount, identity })}
                        disabled={confirmMutation.isPending}
                        className="h-7 text-[11px] rounded-lg bg-white/10 hover:bg-white/20"
                      >
                        Registrar recepción
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Join Form if still open */}
            {!isClosed && (serrucho.canJoin || !isAuthenticated) && (
              <form onSubmit={handleJoin} className="pt-3 border-t border-white/10 space-y-3">
                <p className="text-xs font-bold text-gray-300">Sumarme al serrucho:</p>
                <div className="flex gap-2">
                  <Button
                    type="submit"
                    disabled={isJoining}
                    className="h-10 px-4 rounded-xl text-xs font-bold bg-primary hover:bg-primary/90"
                  >
                    {isJoining ? 'Sumando...' : isAuthenticated ? 'Me anoto · aporte pendiente' : 'Entrar para sumarme'}
                  </Button>
                </div>
              </form>
            )}
            {serrucho.isParticipant && <p className="text-sm text-amber-300">Ya formas parte del coro. Los comprobantes requieren revisión del organizador.</p>}
            {isAuthenticated && serrucho.canSubmitEvidence && <form onSubmit={handleJoin} className="space-y-3 border-t border-white/10 pt-4"><label htmlFor="voucher-reference" className="block text-sm font-medium">Referencia del comprobante</label><Input id="voucher-reference" value={voucherRef} onChange={e => setVoucherRef(e.target.value)} maxLength={120} disabled={isJoining} className="bg-white/5 text-white" /><p className="text-xs leading-relaxed text-gray-400">No incluyas contraseñas ni números de tarjeta. Una referencia no acredita el pago; el organizador debe revisar la recepción.</p><Button type="submit" variant="outline" disabled={isJoining || !voucherRef.trim()}>{isJoining ? 'Enviando…' : 'Enviar para revisión'}</Button></form>}
            {isClosed && <p className="text-sm text-gray-400">Este serrucho no admite nuevas adhesiones.</p>}
          </div>

          {/* Bank Instructions */}
          <div className="rounded-3xl border border-white/10 bg-card p-6 space-y-4">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Building2 className="w-4 h-4 text-amber-400" />
              <span>Coordinar el aporte fuera de EventNow</span>
            </h2>

            {serrucho.paymentInstructions ? <div className="space-y-3 text-xs">
              <div className="p-3.5 rounded-2xl bg-white/5 border border-white/5 space-y-1">
                <span className="text-gray-400 block text-[11px]">Banco:</span>
                <span className="font-bold text-white text-sm">
                  {serrucho.paymentInstructions?.bankName || 'Por confirmar con el organizador'}
                </span>
              </div>

              <div className="p-3.5 rounded-2xl bg-white/5 border border-white/5 space-y-1">
                <span className="text-gray-400 block text-[11px]">Número de cuenta:</span>
                <span className="font-mono font-bold text-amber-300 text-sm">
                  {serrucho.paymentInstructions?.accountNumber || 'Por confirmar con el organizador'}
                </span>
              </div>

              <div className="p-3.5 rounded-2xl bg-white/5 border border-white/5 space-y-1">
                <span className="text-gray-400 block text-[11px]">Nota:</span>
                <p className="text-gray-300">
                  {serrucho.paymentInstructions?.notes || 'Coordina tu aporte con el organizador. Su registro manual no equivale a una entrada al evento.'}
                </p>
              </div>
            </div> : <p className="text-sm text-gray-400">Las instrucciones están reservadas a los integrantes autenticados. No se muestran datos bancarios en la vista pública.</p>}
          </div>
        </div>
      </main>
      {confirming?.identity === identity && <div role="dialog" aria-modal="true" aria-labelledby="confirm-receipt-title" className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-5"><div className="max-w-md space-y-5 rounded-3xl border border-white/10 bg-gray-950 p-6"><h2 id="confirm-receipt-title" className="text-xl font-semibold">¿Recibiste este aporte?</h2><p>Registra {formatAmount(confirming.amount)} de {confirming.name} sólo si comprobaste la recepción fuera de EventNow. Esta acción no verifica una transferencia ni realiza un cobro.</p><div className="flex flex-wrap gap-3"><Button disabled={confirmMutation.isPending} onClick={() => confirmMutation.mutate({ participantId: confirming.id, identity })}>Sí, recibí el aporte</Button><Button variant="outline" disabled={confirmMutation.isPending} onClick={() => setConfirming(null)}>Cancelar</Button></div></div></div>}
    </div>
  )
}
