'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Calendar, Download, MapPin, Ticket as TicketIcon, Users } from 'lucide-react'
import { ticketService } from '@/services/TicketService'
import type { Ticket } from '@/services/TicketService'
import QRCode from 'react-qr-code'

export default function TicketDetailPage() {
  const { id: ticketId } = useParams<{ id: string }>()
  const [ticket, setTicket] = useState<Ticket | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    ticketService.getTicketById(ticketId)
      .then(result => { if (active) setTicket(result) })
      .catch(failure => { if (active) setError(failure.message || 'No pudimos cargar esta entrada.') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [ticketId])

  const download = () => {
    const svg = document.querySelector('#ticket-qr svg')
    if (!svg) return
    const data = new XMLSerializer().serializeToString(svg)
    const url = URL.createObjectURL(new Blob([data], { type: 'image/svg+xml;charset=utf-8' }))
    const link = document.createElement('a')
    link.download = `entrada-${ticketId.replace(/:/g, '-')}.svg`
    link.href = url
    link.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  const event = ticket && typeof ticket.event === 'object' ? ticket.event : null
  const active = ticket?.status === 'active' && new Date(ticket.validUntil) >= new Date()
  const status = active ? 'Entrada activa' : ticket?.status === 'used' ? 'Entrada utilizada' : ticket?.status === 'expired' || (ticket && new Date(ticket.validUntil) < new Date()) ? 'Entrada caducada' : 'Entrada no disponible'

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-950 px-4 py-10 pb-28 text-gray-900 dark:text-white">
      <div className="max-w-2xl mx-auto">
        <Link href="/tickets" className="inline-flex gap-2 items-center text-gray-500 text-sm mb-8"><ArrowLeft size={16} /> Mis entradas</Link>
        {loading ? <p role="status">Cargando entrada…</p> : error || !ticket ? <div role="alert" className="rounded-2xl border border-red-300 p-6 text-red-500">{error || 'Entrada no encontrada'}</div> : <>
          <section className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-white/10 rounded-3xl p-6 md:p-8 mb-6">
            <p className="text-xs uppercase tracking-widest text-violet-500 font-semibold mb-2">{ticket.ticketType.name}</p>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight mb-6">{event?.title || 'Tu entrada'}</h1>
            <div className="space-y-3 text-gray-500">
              <p className="flex gap-3 items-center"><Calendar size={18} />{new Date(event?.date || ticket.validFrom).toLocaleString('es-DO', { dateStyle: 'long', timeStyle: 'short' })}</p>
              <p className="flex gap-3 items-center"><MapPin size={18} />{event?.location?.address || 'Ubicación por confirmar'}</p>
              <p className="flex gap-3 items-center"><Users size={18} />{ticket.quantity || 1} {(ticket.quantity || 1) === 1 ? 'persona' : 'personas · entrada grupal'}</p>
            </div>
            <div className="mt-7 border-t border-dashed border-gray-300 dark:border-white/20 pt-7 text-center">
              <span className={`inline-block text-sm font-semibold rounded-full px-4 py-2 mb-6 ${active ? 'bg-violet-100 text-violet-700 dark:bg-violet-500/10 dark:text-violet-300' : 'bg-gray-100 text-gray-500 dark:bg-white/5'}`}>{status}</span>
              {active && ticket.qrCode ? <>
                <div id="ticket-qr" className="mx-auto w-fit rounded-2xl p-5 bg-white"><QRCode value={ticket.qrCode} size={224} title="Código de acceso al evento" /></div>
                <p className="text-sm text-gray-500 mt-5">Presenta este código en la entrada. Guárdalo para tenerlo disponible sin conexión.</p>
                <button onClick={download} className="inline-flex items-center gap-2 mt-5 py-3 px-5 rounded-xl bg-violet-600 text-white font-semibold text-sm"><Download size={17} /> Descargar código QR</button>
              </> : <TicketIcon className="h-12 w-12 text-gray-400 mx-auto" />}
            </div>
          </section>
          <section className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-white/10 rounded-3xl p-6 md:p-8">
            <h2 className="font-bold text-lg mb-5">Datos de la reserva</h2>
            <dl className="space-y-4 text-sm">
              <div className="flex justify-between gap-4"><dt className="text-gray-500">Importe de las entradas</dt><dd className="font-medium">{new Intl.NumberFormat('es-DO', { style: 'currency', currency: ticket.currency.toUpperCase() }).format(ticket.price)}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-gray-500">Fecha de reserva</dt><dd>{new Date(ticket.purchaseDate).toLocaleDateString('es-DO')}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-gray-500">Válida hasta</dt><dd>{new Date(ticket.validUntil).toLocaleString('es-DO')}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-gray-500">Referencia</dt><dd className="font-mono break-all text-right">{ticket._id.slice(-12).toUpperCase()}</dd></div>
            </dl>
            {event?._id && <Link href={`/events/${event._id}`} className="block mt-6 text-violet-500 font-semibold text-sm">Ver detalles del evento →</Link>}
          </section>
        </>}
      </div>
    </main>
  )
}
