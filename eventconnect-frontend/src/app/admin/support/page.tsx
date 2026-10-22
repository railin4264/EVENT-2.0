'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  LifeBuoy, Search, RefreshCw, Send, CheckCircle2,
  Clock, MessageSquare, User, Sparkles, XCircle, RotateCcw
} from 'lucide-react'
import { AdminNav } from '@/components/admin/AdminNav'
import { apiClient } from '@/lib/api/client'
import toast from 'react-hot-toast'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'

interface SupportMessage {
  sender: string
  senderRole: 'user' | 'admin' | 'moderator'
  senderName: string
  message: string
  attachments?: string[]
  createdAt: string
}

type TicketStatus = 'open' | 'in_progress' | 'waiting_user' | 'resolved' | 'closed'

interface SupportTicketItem {
  _id: string
  ticketNumber: string
  user: {
    _id: string
    firstName: string
    lastName: string
    username: string
    email: string
    avatar?: string
  }
  subject: string
  category: string
  priority: 'low' | 'medium' | 'high' | 'urgent'
  status: TicketStatus
  assignedTo?: {
    _id: string
    firstName: string
    lastName: string
    username: string
  }
  messages: SupportMessage[]
  resolutionNotes?: string
  relatedEvent?: {
    _id: string
    title: string
    date: string
  }
  createdAt: string
  updatedAt: string
}

const CATEGORY_MAP: Record<string, { label: string; color: string }> = {
  ticketing: { label: 'Entradas y Taquilla', color: 'bg-violet-500/20 text-violet-300 border-violet-500/30' },
  fraud_report: { label: 'Reporte de Fraude RD', color: 'bg-red-500/20 text-red-300 border-red-500/30' },
  organizer_verification: { label: 'Verificación Organizador', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' },
  technical: { label: 'Falla Técnica / Bug', color: 'bg-blue-500/20 text-blue-300 border-blue-500/30' },
  idea_zone: { label: 'Nueva Actividad / Zona', color: 'bg-fuchsia-500/20 text-fuchsia-300 border-fuchsia-500/30' },
  billing: { label: 'Pagos y Facturación', color: 'bg-amber-500/20 text-amber-300 border-amber-500/30' },
  other: { label: 'Consulta General', color: 'bg-gray-500/20 text-gray-300 border-gray-500/30' }
}

const STATUS_MAP: Record<TicketStatus, { label: string; color: string }> = {
  open: { label: 'Abierto', color: 'bg-amber-500/20 text-amber-300 border-amber-500/30' },
  in_progress: { label: 'En Proceso', color: 'bg-blue-500/20 text-blue-300 border-blue-500/30' },
  waiting_user: { label: 'Esperando Usuario', color: 'bg-purple-500/20 text-purple-300 border-purple-500/30' },
  resolved: { label: 'Resuelto', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' },
  closed: { label: 'Cerrado', color: 'bg-gray-600/20 text-gray-400 border-gray-600/30' }
}

const PRIORITY_MAP: Record<string, { label: string; color: string }> = {
  low: { label: 'Baja', color: 'text-gray-400' },
  medium: { label: 'Media', color: 'text-blue-400' },
  high: { label: 'Alta', color: 'text-amber-400 font-bold' },
  urgent: { label: 'Urgente 🔥', color: 'text-red-400 font-bold' }
}

// Honest, helpful quick-reply templates that never claim unverified actions were already taken
const CANNED_RESPONSES = [
  {
    title: 'Pasos de Verificación Organizador (RD)',
    text: 'Hola. Para solicitar tu verificación como organizador en EventNow y obtener la insignia 🛡️, ingresa a Configuración > Verificación de Organizador y completa los datos de tu documento (Cédula, RNC o Pasaporte) junto con un número de contacto. Nuestro equipo revisará tu solicitud en el Centro de Moderación.'
  },
  {
    title: 'Consulta sobre Entradas y Pago',
    text: 'Hola. Hemos recibido tu consulta sobre las entradas. Estamos revisando los detalles publicados por el organizador del evento para darte una respuesta precisa. Por favor indícanos si necesitas verificar algún dato adicional de tu registro.'
  },
  {
    title: 'Acuse de Reporte para Revisión',
    text: 'Hola. Gracias por enviarnos este reporte. Hemos registrado tu mensaje y nuestro equipo de moderación revisará la información del evento y del organizador para tomar las medidas correspondientes. Si cuentas con capturas o datos adicionales, puedes adjuntarlos en este hilo.'
  },
  {
    title: 'Solicitud Atendida / Cierre',
    text: 'Hola. Hemos atendido tu solicitud en este ticket de soporte. Si tienes alguna consulta adicional o necesitas más asistencia, puedes responder a este mensaje en cualquier momento.'
  }
]

export default function AdminSupportPage() {
  const queryClient = useQueryClient()
  const [statusFilter, setStatusFilter] = useState<'all' | TicketStatus>('all')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [priorityFilter, setPriorityFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null)
  const [replyText, setReplyText] = useState('')
  const [resolutionNotes, setResolutionNotes] = useState('')

  // Query tickets
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['admin-support-tickets', statusFilter, categoryFilter, priorityFilter, search],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (statusFilter !== 'all') params.set('status', statusFilter)
      if (categoryFilter !== 'all') params.set('category', categoryFilter)
      if (priorityFilter !== 'all') params.set('priority', priorityFilter)
      if (search.trim()) params.set('search', search.trim())

      const res = await apiClient.get(`/support/admin/tickets?${params.toString()}`)
      return res.data
    }
  })

  const tickets: SupportTicketItem[] = data?.data || []
  const counts = data?.counts || { all: 0, open: 0, in_progress: 0, waiting_user: 0, resolved: 0, closed: 0 }

  // Query selected ticket detail
  const { data: detailData } = useQuery({
    queryKey: ['admin-ticket-detail', selectedTicketId],
    queryFn: async () => {
      if (!selectedTicketId) return null
      const res = await apiClient.get(`/support/tickets/${selectedTicketId}`)
      return res.data?.data
    },
    enabled: !!selectedTicketId
  })

  const activeTicket: SupportTicketItem | null = detailData || tickets.find(t => t._id === selectedTicketId) || null

  // Reply mutation
  const replyMutation = useMutation({
    mutationFn: async ({ ticketId, message }: { ticketId: string; message: string }) => {
      const res = await apiClient.post(`/support/tickets/${ticketId}/reply`, { message })
      return res.data
    },
    onSuccess: () => {
      toast.success('Respuesta enviada al usuario')
      setReplyText('')
      queryClient.invalidateQueries({ queryKey: ['admin-ticket-detail', selectedTicketId] })
      queryClient.invalidateQueries({ queryKey: ['admin-support-tickets'] })
      queryClient.invalidateQueries({ queryKey: ['admin-overview-priorities'] })
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Error al enviar la respuesta')
  })

  // Status mutation (`open`, `in_progress`, `waiting_user`, `resolved`, `closed`)
  const statusMutation = useMutation({
    mutationFn: async ({ ticketId, status, resolutionNotes }: { ticketId: string; status: TicketStatus; resolutionNotes?: string }) => {
      const res = await apiClient.put(`/support/admin/tickets/${ticketId}/status`, { status, resolutionNotes })
      return res.data
    },
    onSuccess: (_, vars) => {
      toast.success(`Estado del ticket actualizado a "${STATUS_MAP[vars.status]?.label || vars.status}"`)
      queryClient.invalidateQueries({ queryKey: ['admin-ticket-detail', selectedTicketId] })
      queryClient.invalidateQueries({ queryKey: ['admin-support-tickets'] })
      queryClient.invalidateQueries({ queryKey: ['admin-overview-priorities'] })
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Error al actualizar el estado del ticket')
  })

  const handleSendReply = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedTicketId || !replyText.trim()) return
    replyMutation.mutate({ ticketId: selectedTicketId, message: replyText.trim() })
  }

  return (
    <div className="min-h-screen bg-gray-950 text-foreground">
      <AdminNav />

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <LifeBuoy className="w-6 h-6 text-primary" />
              Mesa de Ayuda y Soporte al Cliente
            </h1>
            <p className="text-gray-400 text-xs mt-1">
              Atención directa a usuarios y organizadores, consultas de entradas y seguimiento de reportes en RD.
            </p>
          </div>
          <button
            onClick={() => refetch()}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white border border-white/10 text-xs font-semibold transition-all"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Actualizar Tickets
          </button>
        </div>

        {/* Stats Chips */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 mb-6">
          {(['all', 'open', 'in_progress', 'waiting_user', 'resolved', 'closed'] as const).map(s => {
            const labels: Record<string, string> = {
              all: 'Todos',
              open: 'Abiertos',
              in_progress: 'En Proceso',
              waiting_user: 'Esperando Usuario',
              resolved: 'Resueltos',
              closed: 'Cerrados'
            }
            const countMap: Record<string, number> = {
              all: counts.all ?? tickets.length,
              open: counts.open ?? 0,
              in_progress: counts.in_progress ?? 0,
              waiting_user: counts.waiting_user ?? 0,
              resolved: counts.resolved ?? 0,
              closed: counts.closed ?? tickets.filter(t => t.status === 'closed').length
            }

            return (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`rounded-2xl p-3 border text-center transition-all ${
                  statusFilter === s
                    ? 'bg-primary/20 border-primary/40 text-white'
                    : 'bg-gray-900 border-white/5 hover:border-white/10 text-gray-400'
                }`}
              >
                <div className="text-2xl font-extrabold text-white">{countMap[s]}</div>
                <div className="text-xs mt-1 font-medium">{labels[s]}</div>
              </button>
            )
          })}
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por número (TK-XXXX) o asunto..."
              className="w-full bg-gray-900 border border-white/10 text-white rounded-xl pl-9 pr-4 py-2.5 text-xs focus:outline-none focus:border-primary"
            />
          </div>

          <div>
            <select
              value={categoryFilter}
              onChange={e => setCategoryFilter(e.target.value)}
              className="w-full bg-gray-900 border border-white/10 text-white rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:border-primary"
            >
              <option value="all">Todas las Categorías</option>
              <option value="ticketing">Entradas y Taquilla</option>
              <option value="fraud_report">Reporte de Fraude RD 🚨</option>
              <option value="organizer_verification">Verificación Organizador 🛡️</option>
              <option value="technical">Falla Técnica / Bug</option>
              <option value="idea_zone">Nueva Actividad / Zona</option>
              <option value="billing">Pagos y Facturación</option>
              <option value="other">Consulta General</option>
            </select>
          </div>

          <div>
            <select
              value={priorityFilter}
              onChange={e => setPriorityFilter(e.target.value)}
              className="w-full bg-gray-900 border border-white/10 text-white rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:border-primary"
            >
              <option value="all">Todas las Prioridades</option>
              <option value="urgent">Urgente 🔥</option>
              <option value="high">Alta</option>
              <option value="medium">Media</option>
              <option value="low">Baja</option>
            </select>
          </div>
        </div>

        {/* Split View: Tickets Queue + Conversation Workspace */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: Tickets List */}
          <div className="lg:col-span-5 space-y-3">
            {isLoading ? (
              [...Array(4)].map((_, i) => (
                <div key={i} className="h-28 bg-gray-900 rounded-2xl animate-pulse" />
              ))
            ) : tickets.length === 0 ? (
              <div className="text-center py-16 text-gray-500 bg-gray-900/50 rounded-2xl border border-white/5">
                <LifeBuoy className="w-12 h-12 mx-auto mb-2 opacity-30 text-primary" />
                <p className="font-semibold text-gray-300">No hay tickets que coincidan</p>
                <p className="text-xs text-gray-500 mt-1">Los reclamos y consultas de los usuarios aparecerán aquí.</p>
              </div>
            ) : (
              tickets.map((t) => {
                const isSelected = selectedTicketId === t._id
                const cat = CATEGORY_MAP[t.category] || CATEGORY_MAP.other
                const st = STATUS_MAP[t.status] || STATUS_MAP.open
                const pri = PRIORITY_MAP[t.priority] || PRIORITY_MAP.medium

                return (
                  <button
                    key={t._id}
                    onClick={() => {
                      setSelectedTicketId(t._id)
                      setResolutionNotes(t.resolutionNotes || '')
                    }}
                    className={`w-full text-left bg-gray-900 border rounded-2xl p-4 transition-all hover:border-primary/40 ${
                      isSelected ? 'border-primary bg-primary/10 shadow-lg shadow-primary/10' : 'border-white/5'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <span className="font-mono text-xs font-bold text-primary">
                        {t.ticketNumber}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${st.color}`}>
                        {st.label}
                      </span>
                    </div>

                    <h2 className="text-sm font-bold text-white line-clamp-1 mb-1">
                      {t.subject}
                    </h2>

                    <div className="flex items-center gap-2 flex-wrap text-xs text-gray-400 mb-2">
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-medium border ${cat.color}`}>
                        {cat.label}
                      </span>
                      <span className={`text-[10px] ${pri.color}`}>
                        Prioridad: {pri.label}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-gray-500 pt-2 border-t border-white/5">
                      <span>@{t.user?.username || 'usuario'}</span>
                      <span>{formatDistanceToNow(new Date(t.updatedAt || t.createdAt), { addSuffix: true, locale: es })}</span>
                    </div>
                  </button>
                )
              })
            )}
          </div>

          {/* Right: Active Ticket Thread Workspace */}
          <div className="lg:col-span-7">
            {activeTicket ? (
              <div className="bg-gray-900 border border-white/10 rounded-2xl p-5 sm:p-6 space-y-6 sticky top-20 shadow-2xl">
                {/* Header */}
                <div className="pb-4 border-b border-white/10 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-mono font-bold text-primary bg-primary/20 px-2 py-0.5 rounded-md">
                          {activeTicket.ticketNumber}
                        </span>
                        <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold border ${STATUS_MAP[activeTicket.status]?.color}`}>
                          {STATUS_MAP[activeTicket.status]?.label}
                        </span>
                        <span className={`text-xs ${PRIORITY_MAP[activeTicket.priority]?.color}`}>
                          {PRIORITY_MAP[activeTicket.priority]?.label}
                        </span>
                      </div>
                      <h2 className="text-lg font-bold text-white mt-1.5">{activeTicket.subject}</h2>
                    </div>

                    {/* Clean Status Controls: open, in_progress, resolved, closed */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {activeTicket.status !== 'open' && (
                        <button
                          type="button"
                          onClick={() => statusMutation.mutate({ ticketId: activeTicket._id, status: 'open', resolutionNotes })}
                          disabled={statusMutation.isPending}
                          className="px-2.5 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 text-xs font-semibold transition-all flex items-center gap-1"
                        >
                          <RotateCcw className="w-3.5 h-3.5" /> Reabrir
                        </button>
                      )}
                      {activeTicket.status !== 'in_progress' && (
                        <button
                          type="button"
                          onClick={() => statusMutation.mutate({ ticketId: activeTicket._id, status: 'in_progress', resolutionNotes })}
                          disabled={statusMutation.isPending}
                          className="px-2.5 py-1.5 rounded-xl bg-blue-600/80 hover:bg-blue-600 text-white text-xs font-semibold transition-all flex items-center gap-1"
                        >
                          <Clock className="w-3.5 h-3.5" /> En Proceso
                        </button>
                      )}
                      {activeTicket.status !== 'resolved' && (
                        <button
                          type="button"
                          onClick={() => statusMutation.mutate({ ticketId: activeTicket._id, status: 'resolved', resolutionNotes })}
                          disabled={statusMutation.isPending}
                          className="px-2.5 py-1.5 rounded-xl bg-emerald-600/80 hover:bg-emerald-600 text-white text-xs font-bold transition-all flex items-center gap-1"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" /> Resolver
                        </button>
                      )}
                      {activeTicket.status !== 'closed' && (
                        <button
                          type="button"
                          onClick={() => statusMutation.mutate({ ticketId: activeTicket._id, status: 'closed', resolutionNotes })}
                          disabled={statusMutation.isPending}
                          className="px-2.5 py-1.5 rounded-xl bg-gray-700 hover:bg-gray-600 text-gray-200 text-xs font-semibold transition-all flex items-center gap-1"
                        >
                          <XCircle className="w-3.5 h-3.5" /> Cerrar
                        </button>
                      )}
                    </div>
                  </div>

                  {/* User info & event context */}
                  <div className="flex flex-wrap items-center gap-4 text-xs text-gray-400 bg-white/5 p-3 rounded-xl">
                    <div className="flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-gray-500" />
                      <span className="text-white font-medium">{activeTicket.user?.firstName} {activeTicket.user?.lastName}</span>
                      <span className="text-primary font-mono">(@{activeTicket.user?.username})</span>
                    </div>
                    {activeTicket.user?.email && (
                      <span className="text-gray-400">{activeTicket.user?.email}</span>
                    )}
                    {activeTicket.relatedEvent && (
                      <span className="text-violet-400 font-semibold">
                        Evento: {activeTicket.relatedEvent.title}
                      </span>
                    )}
                  </div>
                </div>

                {/* Conversation Thread */}
                <div className="space-y-4 max-h-[360px] overflow-y-auto pr-1">
                  {activeTicket.messages?.map((msg, idx) => {
                    const isAdmin = msg.senderRole === 'admin' || msg.senderRole === 'moderator'
                    return (
                      <div
                        key={idx}
                        className={`flex flex-col ${isAdmin ? 'items-end' : 'items-start'}`}
                      >
                        <div className="flex items-center gap-1.5 text-[11px] text-gray-500 mb-1">
                          <span className={isAdmin ? 'text-primary font-bold' : 'text-gray-300 font-medium'}>
                            {msg.senderName} {isAdmin && '(Soporte EventNow)'}
                          </span>
                          <span>·</span>
                          <span>{formatDistanceToNow(new Date(msg.createdAt), { addSuffix: true, locale: es })}</span>
                        </div>
                        <div
                          className={`rounded-2xl p-4 text-xs leading-relaxed max-w-[85%] whitespace-pre-wrap ${
                            isAdmin
                              ? 'bg-primary text-primary-foreground font-medium rounded-tr-none'
                              : 'bg-white/10 text-gray-100 rounded-tl-none border border-white/10'
                          }`}
                        >
                          {msg.message}
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Honest Canned Responses selector */}
                <div className="pt-2 border-t border-white/10">
                  <p className="text-[11px] font-semibold text-gray-400 mb-2 flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-amber-400" />
                    Plantillas de Respuesta Rápida (se insertan en el editor para tu revisión antes de enviar):
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {CANNED_RESPONSES.map((cr, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setReplyText(cr.text)}
                        className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-[11px] text-gray-300 hover:text-white transition-all"
                      >
                        {cr.title}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Response Composer */}
                <form onSubmit={handleSendReply} className="space-y-3">
                  <textarea
                    rows={3}
                    value={replyText}
                    onChange={e => setReplyText(e.target.value)}
                    placeholder="Escribe o edita tu respuesta oficial antes de enviarla al usuario..."
                    className="w-full bg-gray-950 border border-white/15 rounded-xl p-3 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-primary resize-none"
                  />
                  <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                    <span className="text-[11px] text-gray-500">
                      Revisa el texto antes de enviar; el usuario recibirá tu mensaje en este hilo.
                    </span>
                    <button
                      type="submit"
                      disabled={replyMutation.isPending || !replyText.trim()}
                      className="px-4 py-2 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
                    >
                      <Send className="w-3.5 h-3.5" />
                      Enviar Respuesta
                    </button>
                  </div>
                </form>
              </div>
            ) : (
              <div className="bg-gray-900 border border-white/5 rounded-2xl p-16 text-center text-gray-500">
                <MessageSquare className="w-12 h-12 text-gray-700 mx-auto mb-3" />
                <p className="text-gray-300 font-semibold">Selecciona un ticket para ver la conversación</p>
                <p className="text-xs text-gray-600 mt-1">Podrás responder al usuario y actualizar el estado del ticket.</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
