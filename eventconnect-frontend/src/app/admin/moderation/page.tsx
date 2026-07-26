'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { ChevronLeft, Shield, AlertTriangle, CheckCircle, XCircle, Eye, Trash2, Flag, Filter, Search, Clock, User, Calendar, RefreshCw } from 'lucide-react'
import { apiClient } from '@/lib/api/client'
import toast from 'react-hot-toast'
import { useAuthStore } from '@/stores/authStore'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'

type ReportStatus = 'pending' | 'reviewed' | 'resolved' | 'dismissed'
type ContentType = 'event' | 'post' | 'comment' | 'user' | 'tribe'

interface Report {
  _id: string
  type: ContentType
  contentId: string
  reason: string
  description?: string
  status: ReportStatus
  reportedBy: { _id: string; username: string; firstName: string; lastName: string }
  contentData?: Record<string, any>
  createdAt: string
  reviewedAt?: string
  reviewedBy?: { username: string }
}

const STATUS_COLORS: Record<ReportStatus, string> = {
  pending: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  reviewed: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  resolved: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  dismissed: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
}

const STATUS_LABELS: Record<ReportStatus, string> = {
  pending: 'Pendiente',
  reviewed: 'En revisión',
  resolved: 'Resuelto',
  dismissed: 'Desestimado',
}

const TYPE_LABELS: Record<ContentType, string> = {
  event: 'Evento',
  post: 'Publicación',
  comment: 'Comentario',
  user: 'Usuario',
  tribe: 'Tribu',
}

export default function ModerationPage() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const { user } = useAuthStore()

  const [statusFilter, setStatusFilter] = useState<ReportStatus | 'all'>('pending')
  const [typeFilter, setTypeFilter] = useState<ContentType | 'all'>('all')
  const [search, setSearch] = useState('')
  const [selectedReport, setSelectedReport] = useState<Report | null>(null)

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['admin-reports', statusFilter, typeFilter],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (statusFilter !== 'all') params.set('status', statusFilter)
      if (typeFilter !== 'all') params.set('type', typeFilter)
      const res = await apiClient.get(`/reports/admin?${params}`)
      return res.data.data || res.data
    },
  })

  const updateMutation = useMutation({
    mutationFn: async ({ id, status, action }: { id: string; status: ReportStatus; action?: string }) => {
      const res = await apiClient.put(`/reports/${id}/status`, { status, action })
      return res.data
    },
    onSuccess: (_, vars) => {
      toast.success(`Reporte ${STATUS_LABELS[vars.status].toLowerCase()}`)
      queryClient.invalidateQueries({ queryKey: ['admin-reports'] })
      setSelectedReport(null)
    },
    onError: () => toast.error('Error al actualizar el reporte'),
  })

  const deleteContentMutation = useMutation({
    mutationFn: async ({ contentType, contentId, reportId }: { contentType: ContentType; contentId: string; reportId: string }) => {
      await apiClient.delete(`/${contentType}s/${contentId}`)
      await apiClient.put(`/reports/${reportId}/status`, { status: 'resolved', action: 'content_removed' })
    },
    onSuccess: () => {
      toast.success('Contenido eliminado y reporte resuelto')
      queryClient.invalidateQueries({ queryKey: ['admin-reports'] })
      setSelectedReport(null)
    },
    onError: () => toast.error('Error al eliminar el contenido'),
  })

  const reports: Report[] = data?.reports || data || []
  const filteredReports = reports.filter(r => {
    if (!search) return true
    const q = search.toLowerCase()
    return r.reason.toLowerCase().includes(q) ||
      r.reportedBy?.username?.toLowerCase().includes(q) ||
      r.type.toLowerCase().includes(q)
  })

  const counts = {
    all: reports.length,
    pending: reports.filter(r => r.status === 'pending').length,
    reviewed: reports.filter(r => r.status === 'reviewed').length,
    resolved: reports.filter(r => r.status === 'resolved').length,
    dismissed: reports.filter(r => r.status === 'dismissed').length,
  }

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-gray-950/95 backdrop-blur border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => router.back()} className="text-gray-400 hover:text-white transition-colors">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <Shield className="w-6 h-6 text-red-400" />
            <h1 className="text-white font-bold text-xl">Moderación</h1>
          </div>
          <button onClick={() => refetch()} className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
            <RefreshCw className="w-4 h-4" />
            <span className="text-sm">Actualizar</span>
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Stats bar */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
          {(['all', 'pending', 'reviewed', 'resolved', 'dismissed'] as const).map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`rounded-xl p-3 border text-center transition-all ${statusFilter === s
                ? 'bg-white/10 border-white/20'
                : 'bg-gray-900 border-white/5 hover:border-white/10'}`}>
              <div className="text-2xl font-bold text-white">{counts[s]}</div>
              <div className="text-xs text-gray-400 mt-1">
                {s === 'all' ? 'Total' : STATUS_LABELS[s]}
              </div>
            </button>
          ))}
        </div>

        <div className="flex flex-col md:flex-row gap-4 mb-6">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Buscar reportes..."
              className="w-full bg-gray-900 border border-white/10 text-white rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:border-white/20" />
          </div>
          {/* Type filter */}
          <select value={typeFilter} onChange={e => setTypeFilter(e.target.value as any)}
            className="bg-gray-900 border border-white/10 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-white/20">
            <option value="all">Todos los tipos</option>
            {(Object.keys(TYPE_LABELS) as ContentType[]).map(t => (
              <option key={t} value={t}>{TYPE_LABELS[t]}</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Reports list */}
          <div className="lg:col-span-2 space-y-3">
            {isLoading ? (
              [...Array(5)].map((_, i) => (
                <div key={i} className="h-24 bg-gray-800 rounded-xl animate-pulse" />
              ))
            ) : filteredReports.length === 0 ? (
              <div className="text-center py-16 text-gray-500">
                <Flag className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>No hay reportes</p>
              </div>
            ) : filteredReports.map(report => (
              <button key={report._id} onClick={() => setSelectedReport(report)}
                className={`w-full text-left bg-gray-900 border rounded-xl p-4 transition-all hover:border-white/20 ${selectedReport?._id === report._id ? 'border-emerald-500/50' : 'border-white/5'}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-medium bg-white/10 text-gray-300 px-2 py-0.5 rounded-full">
                        {TYPE_LABELS[report.type]}
                      </span>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${STATUS_COLORS[report.status]}`}>
                        {STATUS_LABELS[report.status]}
                      </span>
                    </div>
                    <p className="text-white font-medium text-sm truncate">{report.reason}</p>
                    {report.description && (
                      <p className="text-gray-400 text-xs mt-1 line-clamp-1">{report.description}</p>
                    )}
                    <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        @{report.reportedBy?.username}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDistanceToNow(new Date(report.createdAt), { addSuffix: true, locale: es })}
                      </span>
                    </div>
                  </div>
                  <AlertTriangle className={`w-5 h-5 flex-shrink-0 ${report.status === 'pending' ? 'text-amber-400' : 'text-gray-600'}`} />
                </div>
              </button>
            ))}
          </div>

          {/* Detail panel */}
          <div className="lg:col-span-1">
            {selectedReport ? (
              <div className="bg-gray-900 border border-white/10 rounded-2xl p-5 sticky top-24 space-y-4">
                <h3 className="text-white font-semibold flex items-center gap-2">
                  <Eye className="w-4 h-4 text-blue-400" /> Detalle del reporte
                </h3>

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Tipo</span>
                    <span className="text-white">{TYPE_LABELS[selectedReport.type]}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Estado</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs border ${STATUS_COLORS[selectedReport.status]}`}>
                      {STATUS_LABELS[selectedReport.status]}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Reportado por</span>
                    <span className="text-white">@{selectedReport.reportedBy?.username}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Fecha</span>
                    <span className="text-white">{new Date(selectedReport.createdAt).toLocaleDateString('es')}</span>
                  </div>
                </div>

                <div className="bg-gray-800 rounded-xl p-3">
                  <p className="text-gray-400 text-xs mb-1">Motivo</p>
                  <p className="text-white text-sm">{selectedReport.reason}</p>
                  {selectedReport.description && (
                    <p className="text-gray-300 text-xs mt-2">{selectedReport.description}</p>
                  )}
                </div>

                {/* Actions */}
                <div className="space-y-2 pt-2">
                  {selectedReport.status === 'pending' && (
                    <button
                      onClick={() => updateMutation.mutate({ id: selectedReport._id, status: 'reviewed' })}
                      disabled={updateMutation.isPending}
                      className="w-full flex items-center justify-center gap-2 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm transition-colors disabled:opacity-50">
                      <Eye className="w-4 h-4" /> Marcar en revisión
                    </button>
                  )}
                  <button
                    onClick={() => updateMutation.mutate({ id: selectedReport._id, status: 'resolved' })}
                    disabled={updateMutation.isPending}
                    className="w-full flex items-center justify-center gap-2 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm transition-colors disabled:opacity-50">
                    <CheckCircle className="w-4 h-4" /> Resolver
                  </button>
                  <button
                    onClick={() => updateMutation.mutate({ id: selectedReport._id, status: 'dismissed' })}
                    disabled={updateMutation.isPending}
                    className="w-full flex items-center justify-center gap-2 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-xl text-sm transition-colors disabled:opacity-50">
                    <XCircle className="w-4 h-4" /> Desestimar
                  </button>
                  <button
                    onClick={() => {
                      if (confirm('¿Eliminar este contenido permanentemente?')) {
                        deleteContentMutation.mutate({
                          contentType: selectedReport.type,
                          contentId: selectedReport.contentId,
                          reportId: selectedReport._id,
                        })
                      }
                    }}
                    disabled={deleteContentMutation.isPending}
                    className="w-full flex items-center justify-center gap-2 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-500/30 rounded-xl text-sm transition-colors disabled:opacity-50">
                    <Trash2 className="w-4 h-4" /> Eliminar contenido
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-gray-900 border border-white/5 rounded-2xl p-8 text-center">
                <Shield className="w-12 h-12 text-gray-700 mx-auto mb-3" />
                <p className="text-gray-500 text-sm">Selecciona un reporte para ver detalles y tomar acciones</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
