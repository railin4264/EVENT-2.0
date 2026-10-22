'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Calendar,
  MapPin,
  Ticket,
  ShieldCheck,
  ArrowLeft,
  Loader2,
  Copy,
  CheckCircle2,
  Building2,
  Send,
  AlertCircle,
  MessageCircle,
} from 'lucide-react'
import { apiClient } from '@/lib/api/client'
import { useAuthStore } from '@/stores/authStore'
import type { Event } from '@/types/api.types'

interface TicketOption {
  id: string
  name: string
  description?: string
  price: number
  currency: string
  remaining: number
  minPurchase: number
  maxPurchase: number
}

interface Order {
  _id: string
  status: string
  total: number
  subtotal: number
  currency: string
  fees: { processing: number; service: number; tax: number }
  paymentMethod?: string
}

const DEFAULT_BANKS = [
  { bankName: 'Banco Popular Dominicano', accountNumber: '792817291', accountType: 'Corriente', beneficiaryName: 'EventNow RD SRL', rncOrCedula: '132-98421-2' },
  { bankName: 'Banco BHD', accountNumber: '081294821', accountType: 'Ahorros', beneficiaryName: 'EventNow RD SRL', rncOrCedula: '132-98421-2' },
  { bankName: 'Banreservas', accountNumber: '960182471', accountType: 'Ahorros', beneficiaryName: 'EventNow RD SRL', rncOrCedula: '132-98421-2' },
  { bankName: 'Qik Banco Digital', accountNumber: '829491029', accountType: 'Digital', beneficiaryName: 'EventNow RD', rncOrCedula: '132-98421-2' },
]

const money = (amount: number, currency = 'DOP') =>
  new Intl.NumberFormat('es-DO', { style: 'currency', currency: currency.toUpperCase() }).format(amount)

export default function CheckoutPage() {
  const { eventId } = useParams<{ eventId: string }>()
  const router = useRouter()
  const user = useAuthStore(state => state.user)
  const [event, setEvent] = useState<Event | null>(null)
  const [options, setOptions] = useState<TicketOption[]>([])
  const [selectedId, setSelectedId] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const inFlight = useRef(false)
  const [error, setError] = useState('')

  // Bank Transfer states
  const [selectedBankIndex, setSelectedBankIndex] = useState(0)
  const [referenceNumber, setReferenceNumber] = useState('')
  const [copiedField, setCopiedField] = useState<string | null>(null)
  const [transferSubmitted, setTransferSubmitted] = useState(false)

  const selected = options.find(option => option.id === selectedId)
  const maximum = selected ? Math.min(selected.remaining, selected.maxPurchase || 10, 10) : 1
  const minimum = selected?.minPurchase || 1

  const bankAccounts = (event as any)?.localPaymentConfig?.bankAccounts?.length
    ? (event as any).localPaymentConfig.bankAccounts
    : DEFAULT_BANKS

  const currentBank = bankAccounts[selectedBankIndex] || bankAccounts[0]

  useEffect(() => {
    let active = true
    setLoading(true)
    setError('')
    Promise.all([apiClient.get(`/events/${eventId}`), apiClient.get(`/payments/events/${eventId}/tickets`)])
      .then(([eventResponse, ticketResponse]) => {
        if (!active) return
        setEvent(eventResponse.data.event ?? eventResponse.data.data)
        const tickets: TicketOption[] = ticketResponse.data.data?.tickets ?? []
        setOptions(tickets)
        const available = tickets.find(ticket => ticket.remaining >= (ticket.minPurchase || 1))
        setSelectedId(available?.id || '')
        setQuantity(available?.minPurchase || 1)
      })
      .catch(failure => {
        if (active) setError(failure.response?.data?.message || 'No pudimos cargar las entradas. Vuelve a intentarlo.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [eventId])

  const copyToClipboard = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text)
    setCopiedField(fieldName)
    setTimeout(() => setCopiedField(null), 2000)
  }

  const reserve = async () => {
    if (!selected || inFlight.current || quantity < minimum || quantity > maximum) return
    if (!user) {
      router.push(`/login?redirect=${encodeURIComponent(`/checkout/${eventId}`)}`)
      return
    }
    inFlight.current = true
    setBusy(true)
    setError('')
    try {
      const response = await apiClient.post('/payments/orders', { eventId, items: [{ ticketId: selected.id, quantity }] })
      const created: Order = response.data.data
      if (!created?._id) throw new Error('No se pudo crear la reserva')
      setOrder(created)
      if (created.status === 'confirmed' || selected.price === 0) {
        router.replace('/tickets')
      }
    } catch (failure: any) {
      setError(failure.response?.data?.message || failure.message || 'No se pudo reservar. Inténtalo de nuevo.')
    } finally {
      inFlight.current = false
      setBusy(false)
    }
  }

  const submitBankTransfer = async () => {
    if (!order || inFlight.current) return
    if (!referenceNumber.trim()) {
      setError('Por favor ingresa el número de referencia o confirmación de la transferencia.')
      return
    }

    inFlight.current = true
    setBusy(true)
    setError('')
    try {
      await apiClient.post(`/payments/orders/${order._id}/bank-transfer`, {
        bankName: currentBank.bankName,
        referenceNumber: referenceNumber.trim(),
      })
      setTransferSubmitted(true)
    } catch (failure: any) {
      setError(failure.response?.data?.message || failure.message || 'No se pudo registrar la transferencia. Inténtalo de nuevo.')
    } finally {
      inFlight.current = false
      setBusy(false)
    }
  }

  const changeSelection = async () => {
    if (!order || inFlight.current) return
    inFlight.current = true
    setBusy(true)
    try {
      await apiClient.delete(`/payments/orders/${order._id}`)
      setOrder(null)
      setTransferSubmitted(false)
      setReferenceNumber('')
      setError('')
    } catch (failure: any) {
      setError(failure.response?.data?.message || 'No se pudo cancelar la reserva anterior.')
    } finally {
      inFlight.current = false
      setBusy(false)
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen grid place-items-center">
        <Loader2 className="animate-spin text-primary h-8 w-8" aria-label="Cargando entradas" />
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-white px-4 py-10 pb-28">
      <div className="max-w-5xl mx-auto">
        <Link href={`/events/${eventId}`} className="inline-flex gap-2 items-center text-sm text-gray-500 mb-8 hover:text-foreground transition-colors">
          <ArrowLeft size={16} /> Volver al evento
        </Link>
        <p className="text-xs uppercase tracking-widest text-primary font-semibold mb-2">Pase y Admisión</p>
        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-8">Reserva tus entradas</h1>

        {error && (
          <div role="alert" className="mb-6 flex items-start gap-3 border border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300 p-4 rounded-2xl">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <div>{error}</div>
          </div>
        )}

        {!event ? (
          <Link href="/events" className="text-primary underline">
            Explorar eventos
          </Link>
        ) : (
          <div className="grid lg:grid-cols-[1fr_380px] gap-8">
            <section className="space-y-6">
              {/* Event card */}
              <div className="rounded-3xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-white/10 p-6 md:p-8 shadow-sm">
                <h2 className="text-2xl font-bold mb-4">{event.title}</h2>
                <p className="flex items-center gap-3 text-gray-500 dark:text-gray-400 mb-3 text-sm">
                  <Calendar size={18} className="text-primary" />
                  {new Date(event.date).toLocaleString('es-DO', { dateStyle: 'long', timeStyle: 'short' })}
                </p>
                <p className="flex items-center gap-3 text-gray-500 dark:text-gray-400 text-sm">
                  <MapPin size={18} className="text-pink-500" />
                  {event.location?.address || 'Ubicación por confirmar'}
                </p>
              </div>

              {/* Ticket selection */}
              {!order ? (
                <div className="rounded-3xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-white/10 p-6 md:p-8 shadow-sm">
                  <h2 className="text-lg font-bold flex items-center gap-2 mb-5">
                    <Ticket size={20} className="text-primary" /> Elige tu entrada
                  </h2>

                  {(event as any)?.ticketUrl && (
                    <div className="mb-6 p-5 rounded-2xl bg-gradient-to-r from-violet-600/10 to-fuchsia-600/10 border border-violet-500/30">
                      <p className="font-semibold text-sm mb-1">🎟️ Entradas disponibles en boletería externa</p>
                      <p className="text-xs text-muted-foreground mb-4">Este organizador gestiona sus entradas a través de una taquilla autorizada.</p>
                      <a
                        href={(event as any).ticketUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white font-bold text-sm px-5 py-3 rounded-xl hover:opacity-95 shadow-md"
                      >
                        Comprar en boletería oficial del evento
                      </a>
                    </div>
                  )}

                  {options.length === 0 && <p className="text-gray-500">Este evento aún no tiene entradas a la venta.</p>}

                  <div className="space-y-3">
                    {options.map(option => {
                      const soldOut = option.remaining < (option.minPurchase || 1)
                      return (
                        <button
                          key={option.id}
                          disabled={soldOut || !!order || busy}
                          aria-pressed={selectedId === option.id}
                          onClick={() => {
                            setSelectedId(option.id)
                            setQuantity(option.minPurchase || 1)
                          }}
                          className={`w-full text-left border rounded-2xl p-5 flex items-center justify-between gap-4 disabled:opacity-50 transition-all ${
                            selectedId === option.id
                              ? 'border-primary bg-primary/10 shadow-sm'
                              : 'border-gray-200 dark:border-white/10 hover:border-gray-300 dark:hover:border-white/20'
                          }`}
                        >
                          <span>
                            <span className="font-semibold block text-base">{option.name}</span>
                            <span className="text-sm text-gray-500 dark:text-gray-400">
                              {soldOut ? 'Agotado' : `${option.remaining} disponibles`}
                            </span>
                            {option.description && <span className="block text-xs text-gray-400 mt-1">{option.description}</span>}
                          </span>
                          <span className="font-bold whitespace-nowrap text-lg text-primary">
                            {option.price === 0 ? 'Entrada Libre' : money(option.price, option.currency)}
                          </span>
                        </button>
                      )
                    })}
                  </div>

                  {selected && (
                    <div className="mt-6 flex items-center justify-between pt-4 border-t border-gray-100 dark:border-white/10">
                      <label htmlFor="quantity" className="font-medium text-sm">
                        Cantidad de entradas
                      </label>
                      <input
                        id="quantity"
                        type="number"
                        min={minimum}
                        max={maximum}
                        value={quantity}
                        disabled={!!order || busy}
                        onChange={e => setQuantity(Math.max(minimum, Math.min(maximum, Number(e.target.value) || minimum)))}
                        className="w-24 border border-gray-300 dark:border-white/20 rounded-xl p-3 bg-transparent text-center font-bold"
                      />
                    </div>
                  )}
                </div>
              ) : (
                /* Bank Transfer Direct instructions */
                <div className="rounded-3xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-white/10 p-6 md:p-8 shadow-sm">
                  {transferSubmitted ? (
                    <div className="text-center py-6">
                      <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto mb-4">
                        <CheckCircle2 size={36} />
                      </div>
                      <h2 className="text-2xl font-bold mb-2">¡Comprobante Enviado!</h2>
                      <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
                        Tu transferencia ha sido registrada. El organizador verificará los fondos y tu pase QR se activará en tu perfil.
                      </p>
                      <div className="flex flex-col sm:flex-row gap-3 justify-center">
                        <Link
                          href="/tickets"
                          className="px-6 py-3.5 bg-primary hover:bg-primary/90 text-white font-bold rounded-xl text-center shadow-lg shadow-primary/20"
                        >
                          Ver Mis Entradas
                        </Link>
                        <a
                          href={`https://wa.me/?text=${encodeURIComponent(
                            `Hola, he realizado la transferencia para el evento "${event.title}". Mi orden es #${order._id.slice(-6).toUpperCase()} y la referencia es ${referenceNumber}.`
                          )}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-6 py-3.5 bg-[#25D366] hover:bg-[#20ba5a] text-white font-bold rounded-xl flex items-center justify-center gap-2"
                        >
                          <MessageCircle size={18} /> Avisar al Organizador por WhatsApp
                        </a>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="flex items-center gap-2 mb-4">
                        <Building2 className="text-primary w-5 h-5" />
                        <h2 className="text-lg font-bold">Datos para Transferencia Bancaria (RD)</h2>
                      </div>
                      <p className="text-xs text-muted-foreground mb-6">
                        Transfiere el monto exacto de tu reserva y copia el número de referencia bancaria para validar tu entrada.
                      </p>

                      {/* Bank Select Tabs */}
                      <div className="flex flex-wrap gap-2 mb-6">
                        {bankAccounts.map((b: any, idx: number) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => setSelectedBankIndex(idx)}
                            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all border ${
                              selectedBankIndex === idx
                                ? 'bg-primary text-white border-primary shadow-sm'
                                : 'bg-gray-100 dark:bg-white/5 border-gray-200 dark:border-white/10 text-muted-foreground hover:text-foreground'
                            }`}
                          >
                            {b.bankName}
                          </button>
                        ))}
                      </div>

                      {/* Bank Details Card */}
                      <div className="rounded-2xl border border-primary/30 bg-primary/5 p-5 mb-6 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground font-semibold">Banco:</span>
                          <span className="text-sm font-bold">{currentBank.bankName}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground font-semibold">Número de Cuenta:</span>
                          <div className="flex items-center gap-2">
                            <span className="text-base font-extrabold text-primary font-mono">{currentBank.accountNumber}</span>
                            <button
                              type="button"
                              onClick={() => copyToClipboard(currentBank.accountNumber, 'acc')}
                              className="p-1 text-gray-400 hover:text-primary transition-colors"
                              title="Copiar número de cuenta"
                            >
                              {copiedField === 'acc' ? <CheckCircle2 size={16} className="text-emerald-400" /> : <Copy size={16} />}
                            </button>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground font-semibold">Tipo de Cuenta:</span>
                          <span className="text-sm capitalize">{currentBank.accountType || 'Ahorros'}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground font-semibold">Titular / Beneficiario:</span>
                          <span className="text-sm font-medium">{currentBank.beneficiaryName}</span>
                        </div>
                        {currentBank.rncOrCedula && (
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-muted-foreground font-semibold">RNC / Cédula:</span>
                            <span className="text-sm font-mono">{currentBank.rncOrCedula}</span>
                          </div>
                        )}
                      </div>

                      {/* Input Reference Number */}
                      <div className="space-y-2 mb-6">
                        <label htmlFor="refNum" className="block text-sm font-bold">
                          Número de Referencia o Comprobante de Pago
                        </label>
                        <input
                          id="refNum"
                          type="text"
                          value={referenceNumber}
                          onChange={e => setReferenceNumber(e.target.value)}
                          placeholder="Ej. 10928472 o 482910"
                          className="w-full border border-gray-300 dark:border-white/20 rounded-xl p-3.5 bg-transparent font-mono text-base focus:outline-none focus:border-primary"
                        />
                        <p className="text-xs text-muted-foreground">
                          Ingresa el código o número de confirmación que aparece al completar la transferencia en tu banco.
                        </p>
                      </div>

                      <div className="flex flex-col sm:flex-row gap-3">
                        <button
                          disabled={busy || !referenceNumber.trim()}
                          onClick={submitBankTransfer}
                          className="flex-1 bg-primary hover:bg-primary/90 text-white font-bold py-3.5 px-6 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-primary/20 disabled:opacity-50 transition-all"
                        >
                          {busy ? <Loader2 className="animate-spin h-5 w-5" /> : <Send size={18} />}
                          <span>Confirmar Transferencia</span>
                        </button>
                        <button
                          disabled={busy}
                          onClick={changeSelection}
                          className="py-3.5 px-5 rounded-xl border border-gray-300 dark:border-white/15 text-sm text-muted-foreground hover:text-foreground transition-all"
                        >
                          Cambiar Selección
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </section>

            {/* Sidebar Summary */}
            <aside className="rounded-3xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-white/10 p-6 md:p-8 h-fit lg:sticky lg:top-24 shadow-sm">
              <h2 className="text-xl font-bold mb-6">Resumen de Reserva</h2>

              {selected ? (
                <>
                  <p className="mb-4 flex justify-between gap-4 text-sm">
                    <span className="font-medium text-foreground">
                      {quantity} × {selected.name}
                    </span>
                    <span className="font-bold">{money(order?.subtotal ?? selected.price * quantity, selected.currency)}</span>
                  </p>

                  {order ? (
                    <>
                      <p className="flex justify-between text-xs text-muted-foreground mb-4">
                        <span>Gestión y servicio</span>
                        <span>{money(order.total - order.subtotal, order.currency)}</span>
                      </p>
                      <div className="flex justify-between items-baseline text-2xl font-black border-t border-gray-200 dark:border-white/10 pt-4 mb-6">
                        <span>Total:</span>
                        <span className="text-primary">{money(order.total, order.currency)}</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <p className="text-xs text-muted-foreground mb-6">
                        {selected.price === 0
                          ? 'Tu entrada es 100% gratuita. Solo pulsa el botón para asegurar tu cupo.'
                          : 'Cero cargos sorpresa. Verás las cuentas bancarias para transferir una vez confirmes la reserva.'}
                      </p>
                      <button
                        disabled={busy}
                        onClick={reserve}
                        className="w-full bg-primary hover:bg-primary/90 text-white font-bold rounded-2xl py-4 shadow-lg shadow-primary/20 disabled:opacity-50 transition-all"
                      >
                        {busy ? 'Generando reserva…' : selected.price === 0 ? 'Asegurar cupo gratis' : 'Continuar al Pago Directo'}
                      </button>
                    </>
                  )}
                </>
              ) : (
                <p className="text-sm text-muted-foreground">Selecciona una entrada disponible para continuar.</p>
              )}

              <div className="mt-6 pt-5 border-t border-gray-200 dark:border-white/10 text-xs text-muted-foreground flex gap-2 leading-relaxed">
                <ShieldCheck className="shrink-0 h-4 w-4 text-emerald-400" />
                <span>Validación directa sin intermediarios. Tu entrada se asocia a tu usuario y se emite con código QR seguro.</span>
              </div>
            </aside>
          </div>
        )}
      </div>
    </main>
  )
}
