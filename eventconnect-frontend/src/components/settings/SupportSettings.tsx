'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  LifeBuoy, Plus, MessageSquare, Send, CheckCircle2, AlertCircle,
  HelpCircle, ExternalLink, ChevronDown, ChevronUp, ShieldCheck,
  Phone, Clock, Sparkles, X
} from 'lucide-react'
import { apiClient } from '@/lib/api/client'
import toast from 'react-hot-toast'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'

interface SupportTicket {
  _id: string
  ticketNumber: string
  subject: string
  category: string
  priority: string
  status: 'open' | 'in_progress' | 'waiting_user' | 'resolved' | 'closed'
  messages: Array<{
    sender: string
    senderRole: 'user' | 'admin' | 'moderator'
    senderName: string
    message: string
    createdAt: string
  }>
  resolutionNotes?: string
  createdAt: string
  updatedAt: string
}

const CATEGORY_LABELS: Record<string, string> = {
  ticketing: 'Entradas, QR y Taquilla',
  fraud_report: 'Denuncia de Evento Falso / Fraude',
  organizer_verification: 'Verificación Oficial de Organizador',
  technical: 'Error o Problema Técnico',
  idea_zone: 'Sugerir Actividad o Zona en RD',
  billing: 'Pagos y Facturación',
  other: 'Consulta General'
}

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  open: { label: 'Abierto', color: 'bg-amber-500/20 text-amber-300 border-amber-500/30' },
  in_progress: { label: 'En Proceso', color: 'bg-blue-500/20 text-blue-300 border-blue-500/30' },
  waiting_user: { label: 'Esperando tu Respuesta', color: 'bg-purple-500/20 text-purple-300 border-purple-500/30' },
  resolved: { label: 'Resuelto ✓', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' },
  closed: { label: 'Cerrado', color: 'bg-gray-600/20 text-gray-400 border-gray-600/30' }
}

const FAQS = [
  {
    q: '¿Cómo funciona la compra de entradas en taquilla física?',
    a: 'En República Dominicana muchos eventos operan con taquilla en puerta. Al confirmar tu asistencia en EventNow, tu cupo queda registrado y pagas directamente en efectivo o tarjeta al llegar al recinto, sin comisiones bancarias intermedias.'
  },
  {
    q: '¿Cómo reconozco a un Organizador Verificado y seguro?',
    a: 'Los organizadores con la insignia verde 🛡️ Organizador Verificado han completado la validación de identidad oficial con su Cédula de Identidad o RNC de la DGII. Si un evento tiene costo y no tiene insignia, EventNow te alertará para que pagues únicamente en taquilla.'
  },
  {
    q: '¿Puedo sugerir actividades innovadoras en mi parque o zona?',
    a: '¡Sí! Puedes usar la sección de "Radar de Demanda Colectiva" en la pantalla de inicio o crear un ticket de sugerencia. Si suficientes personas apoyan una idea (por ejemplo, tocar violín o clases de pintura en el Mirador Sur o Parque Iberoamérica), conectamos con creadores para que se coordine y organice.'
  },
  {
    q: '¿Qué hago si sospecho de una estafa o evento falso?',
    a: 'Abre de inmediato un ticket seleccionando la categoría "Denuncia de Evento Falso / Fraude" o haz clic en "Reportar Evento" en la página del evento. Nuestro equipo de moderación revisa y bloquea cuentas sospechosas de inmediato.'
  }
]

export default function SupportSettings({ user }: { user: any }) {
  const queryClient = useQueryClient()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [expandedTicketId, setExpandedTicketId] = useState<string | null>(null)
  const [replyText, setReplyText] = useState('')
  const [faqOpen, setFaqOpen] = useState<number | null>(null)

  // Form state
  const [subject, setSubject] = useState('')
  const [category, setCategory] = useState('ticketing')
  const [priority, setPriority] = useState('medium')
  const [message, setMessage] = useState('')

  // Query user tickets
  const { data, isLoading } = useQuery({
    queryKey: ['my-support-tickets'],
    queryFn: async () => {
      const res = await apiClient.get('/support/my-tickets')
      return res.data?.data || []
    }
  })

  const tickets: SupportTicket[] = data || []

  // Create ticket mutation
  const createMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await apiClient.post('/support/tickets', payload)
      return res.data
    },
    onSuccess: () => {
      toast.success('¡Ticket de soporte creado! Te responderemos a la brevedad.')
      setIsModalOpen(false)
      setSubject('')
      setMessage('')
      queryClient.invalidateQueries({ queryKey: ['my-support-tickets'] })
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Error al crear el ticket')
    }
  })

  // Reply mutation
  const replyMutation = useMutation({
    mutationFn: async ({ ticketId, text }: { ticketId: string; text: string }) => {
      const res = await apiClient.post(`/support/tickets/${ticketId}/reply`, { message: text })
      return res.data
    },
    onSuccess: () => {
      toast.success('Respuesta enviada')
      setReplyText('')
      queryClient.invalidateQueries({ queryKey: ['my-support-tickets'] })
    },
    onError: () => toast.error('Error al enviar la respuesta')
  })

  const handleCreateTicket = (e: React.FormEvent) => {
    e.preventDefault()
    if (!subject.trim() || !message.trim()) {
      toast.error('Completa el asunto y el mensaje')
      return
    }
    createMutation.mutate({ subject, category, priority, message })
  }

  const handleSendReply = (ticketId: string) => {
    if (!replyText.trim()) return
    replyMutation.mutate({ ticketId, text: replyText.trim() })
  }

  return (
    <div className="space-y-8">
      {/* Direct Contact Banner */}
      <div className="rounded-2xl p-6 glass border border-primary/20 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent relative overflow-hidden">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
              <LifeBuoy className="w-5 h-5 text-primary" />
              Centro de Ayuda y Soporte EventNow (RD)
            </h2>
            <p className="text-muted-foreground text-xs leading-relaxed max-w-xl">
              ¿Tienes dudas con tus entradas, necesitas ayuda con la verificación o deseas reportar un problema? Nuestro equipo local en República Dominicana está para asistirte.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <a
              href="https://wa.me/18095550199?text=Hola%20EventNow,%20necesito%20asistencia%20con%20un%20evento"
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-lg shadow-emerald-900/20"
            >
              <Phone className="w-3.5 h-3.5" />
              WhatsApp Directo
            </a>
            <button
              onClick={() => setIsModalOpen(true)}
              className="px-4 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold transition-all flex items-center gap-1.5 shadow-lg shadow-primary/20"
            >
              <Plus className="w-3.5 h-3.5" />
              Abrir Ticket
            </button>
          </div>
        </div>
      </div>

      {/* User Tickets List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-primary" />
            Mis Tickets de Soporte ({tickets.length})
          </h3>
        </div>

        {isLoading ? (
          <div className="h-32 rounded-2xl glass border border-white/5 animate-pulse" />
        ) : tickets.length === 0 ? (
          <div className="text-center py-12 glass border border-white/5 rounded-2xl p-6">
            <LifeBuoy className="w-10 h-10 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-sm font-semibold text-foreground">No tienes tickets de soporte activos</p>
            <p className="text-xs text-muted-foreground mt-1">Si necesitas ayuda con alguna entrada o reporte, abre un ticket arriba.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {tickets.map((t) => {
              const isExpanded = expandedTicketId === t._id
              const st = STATUS_MAP[t.status] || STATUS_MAP.open

              return (
                <div key={t._id} className="rounded-2xl glass border border-white/10 overflow-hidden transition-all">
                  <button
                    onClick={() => setExpandedTicketId(isExpanded ? null : t._id)}
                    className="w-full text-left p-4 flex items-center justify-between gap-4 hover:bg-white/5 transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="font-mono text-xs font-bold text-primary">{t.ticketNumber}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${st.color}`}>
                          {st.label}
                        </span>
                        <span className="text-xs text-muted-foreground">· {CATEGORY_LABELS[t.category] || t.category}</span>
                      </div>
                      <h4 className="text-sm font-bold text-foreground truncate">{t.subject}</h4>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Actualizado {formatDistanceToNow(new Date(t.updatedAt || t.createdAt), { addSuffix: true, locale: es })}
                      </p>
                    </div>

                    <div className="p-2 rounded-xl bg-white/5 text-muted-foreground">
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </div>
                  </button>

                  {/* Expanded Thread */}
                  {isExpanded && (
                    <div className="p-4 pt-0 border-t border-white/5 bg-black/20 space-y-4">
                      <div className="space-y-3 pt-3">
                        {t.messages?.map((msg, idx) => {
                          const isAdmin = msg.senderRole === 'admin' || msg.senderRole === 'moderator'
                          return (
                            <div key={idx} className={`flex flex-col ${isAdmin ? 'items-end' : 'items-start'}`}>
                              <span className="text-[10px] text-muted-foreground mb-1">
                                {isAdmin ? '🛡️ Soporte EventNow' : 'Tú'} · {formatDistanceToNow(new Date(msg.createdAt), { addSuffix: true, locale: es })}
                              </span>
                              <div className={`p-3 rounded-2xl text-xs leading-relaxed max-w-[85%] whitespace-pre-wrap ${
                                isAdmin
                                  ? 'bg-primary text-primary-foreground font-medium rounded-tr-none'
                                  : 'glass border border-white/10 text-foreground rounded-tl-none'
                              }`}>
                                {msg.message}
                              </div>
                            </div>
                          )
                        })}
                      </div>

                      {/* Reply composer if not closed */}
                      {t.status !== 'closed' && (
                        <div className="pt-2 flex gap-2">
                          <input
                            value={replyText}
                            onChange={e => setReplyText(e.target.value)}
                            placeholder="Escribe una respuesta o aclaración..."
                            className="flex-1 bg-background/60 border border-white/15 rounded-xl px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
                          />
                          <button
                            onClick={() => handleSendReply(t._id)}
                            disabled={replyMutation.isPending || !replyText.trim()}
                            className="px-3.5 py-2 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold transition-all disabled:opacity-50 flex items-center gap-1"
                          >
                            <Send className="w-3.5 h-3.5" /> Responder
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Dominican Republic FAQs */}
      <div className="space-y-4 pt-4 border-t border-border">
        <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
          <HelpCircle className="w-4 h-4 text-primary" />
          Preguntas Frecuentes y Guía de Confianza
        </h3>

        <div className="space-y-2">
          {FAQS.map((faq, i) => {
            const isOpen = faqOpen === i
            return (
              <div key={i} className="rounded-2xl glass border border-white/5 overflow-hidden">
                <button
                  type="button"
                  onClick={() => setFaqOpen(isOpen ? null : i)}
                  className="w-full text-left p-4 flex items-center justify-between gap-4 hover:bg-white/5 transition-colors"
                >
                  <span className="font-semibold text-xs sm:text-sm text-foreground">{faq.q}</span>
                  <div className="text-muted-foreground">
                    {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </div>
                </button>
                {isOpen && (
                  <div className="p-4 pt-0 text-xs text-muted-foreground leading-relaxed border-t border-white/5 bg-white/[0.02]">
                    {faq.a}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* New Ticket Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass border border-white/10 bg-background rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h3 className="text-foreground font-bold text-base flex items-center gap-2">
                <LifeBuoy className="w-4 h-4 text-primary" />
                Abrir Nuevo Ticket de Soporte
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-muted-foreground hover:text-foreground p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTicket} className="space-y-4 text-xs">
              <div>
                <label className="block text-foreground font-semibold mb-1">
                  Categoría de la Consulta
                </label>
                <select
                  value={category}
                  onChange={e => setCategory(e.target.value)}
                  className="w-full bg-background border border-border rounded-xl px-3 py-2 text-foreground focus:outline-none focus:border-primary text-xs"
                >
                  {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-foreground font-semibold mb-1">
                  Asunto Breve
                </label>
                <input
                  value={subject}
                  onChange={e => setSubject(e.target.value)}
                  placeholder="Ej: Duda sobre pago en taquilla o validación de entrada"
                  className="w-full bg-background border border-border rounded-xl px-3 py-2 text-foreground focus:outline-none focus:border-primary text-xs"
                />
              </div>

              <div>
                <label className="block text-foreground font-semibold mb-1">
                  Prioridad
                </label>
                <select
                  value={priority}
                  onChange={e => setPriority(e.target.value)}
                  className="w-full bg-background border border-border rounded-xl px-3 py-2 text-foreground focus:outline-none focus:border-primary text-xs"
                >
                  <option value="low">Baja (Pregunta general)</option>
                  <option value="medium">Media (Atención estándar)</option>
                  <option value="high">Alta (Evento empieza pronto)</option>
                  <option value="urgent">Urgente (Fraude o emergencia en puerta)</option>
                </select>
              </div>

              <div>
                <label className="block text-foreground font-semibold mb-1">
                  Detalla tu Problema o Solicitud
                </label>
                <textarea
                  rows={4}
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  placeholder="Explica con el mayor detalle posible lo que necesitas o el enlace del evento en cuestión..."
                  className="w-full bg-background border border-border rounded-xl p-3 text-foreground focus:outline-none focus:border-primary text-xs resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-border text-foreground hover:bg-muted text-xs font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="px-4 py-2 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold transition-all disabled:opacity-50"
                >
                  Enviar Ticket a Soporte
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
