'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import {
  FileText, ShieldCheck, ShieldAlert, Trash2, CheckCircle,
  RefreshCw, Search, User, Eye, Terminal,
  AlertTriangle, X, ArrowRight
} from 'lucide-react'
import { AdminNav } from '@/components/admin/AdminNav'
import { apiClient } from '@/lib/api/client'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'

interface AuditLog {
  _id: string
  action: string
  actor?: {
    _id: string
    username: string
    firstName: string
    lastName: string
    role: string
    avatar?: string
  }
  actorUsername: string
  actorRole: string
  targetType: string
  targetId?: string
  targetLabel?: string
  status: 'success' | 'failure' | 'warning'
  ipAddress?: string
  userAgent?: string
  details?: Record<string, any>
  createdAt: string
}

const ACTION_LABELS: Record<string, { label: string; color: string; icon: any }> = {
  organizer_verification_approved: { label: 'Organizador Aprobado', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30', icon: ShieldCheck },
  organizer_verification_rejected: { label: 'Organizador Rechazado', color: 'bg-red-500/20 text-red-300 border-red-500/30', icon: ShieldAlert },
  organizer_verification_revoked: { label: 'Verificación Revocada', color: 'bg-amber-500/20 text-amber-300 border-amber-500/30', icon: AlertTriangle },
  report_status_updated: { label: 'Reporte Actualizado', color: 'bg-blue-500/20 text-blue-300 border-blue-500/30', icon: CheckCircle },
  content_removed: { label: 'Contenido Eliminado', color: 'bg-rose-500/20 text-rose-300 border-rose-500/30', icon: Trash2 },
  content_restored: { label: 'Contenido Restaurado', color: 'bg-teal-500/20 text-teal-300 border-teal-500/30', icon: CheckCircle },
  user_banned: { label: 'Usuario Suspendido', color: 'bg-red-500/20 text-red-300 border-red-500/30', icon: ShieldAlert },
  user_unbanned: { label: 'Usuario Reactivado', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30', icon: CheckCircle },
  user_role_changed: { label: 'Rol Modificado', color: 'bg-violet-500/20 text-violet-300 border-violet-500/30', icon: User },
  admin_login: { label: 'Inicio de Sesión Admin', color: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30', icon: Terminal },
  support_ticket_status_changed: { label: 'Estado de Ticket Modificado', color: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30', icon: FileText },
  system_config_updated: { label: 'Configuración de Sistema', color: 'bg-purple-500/20 text-purple-300 border-purple-500/30', icon: Terminal },
  other: { label: 'Acción General', color: 'bg-gray-500/20 text-gray-300 border-gray-500/30', icon: FileText }
}

export default function AdminAuditPage() {
  const [page, setPage] = useState(1)
  const [actionFilter, setActionFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [targetTypeFilter, setTargetTypeFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null)

  // Query audit logs
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['admin-audit-logs', page, actionFilter, statusFilter, targetTypeFilter, search],
    queryFn: async () => {
      const params = new URLSearchParams()
      params.set('page', page.toString())
      params.set('limit', '25')
      if (actionFilter !== 'all') params.set('action', actionFilter)
      if (statusFilter !== 'all') params.set('status', statusFilter)
      if (targetTypeFilter !== 'all') params.set('targetType', targetTypeFilter)
      if (search.trim()) params.set('search', search.trim())

      const res = await apiClient.get(`/audit/logs?${params.toString()}`)
      return res.data
    }
  })

  // Query audit stats
  const { data: statsData } = useQuery({
    queryKey: ['admin-audit-stats'],
    queryFn: async () => {
      const res = await apiClient.get('/audit/stats')
      return res.data?.data
    }
  })

  const logs: AuditLog[] = data?.logs || []
  const pagination = data?.pagination || { page: 1, total: 0, pages: 1 }

  return (
    <div className="min-h-screen bg-gray-950 text-foreground">
      <AdminNav />

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Title and refresh */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <FileText className="w-6 h-6 text-primary" />
              Bitácora de Auditoría y Trazabilidad
            </h1>
            <p className="text-gray-400 text-xs mt-1">
              Registro inmutable de todas las acciones administrativas, verificaciones anti-fraude y eventos de seguridad.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/admin"
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white border border-white/10 text-xs font-semibold transition-all"
            >
              <span>Ver Prioridades Pendientes</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
            <button
              onClick={() => refetch()}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white border border-white/10 text-xs font-semibold transition-all"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Actualizar Registro
            </button>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-gray-900 border border-white/5 rounded-2xl p-4">
            <p className="text-gray-400 text-xs">Total de Eventos Registrados</p>
            <p className="text-2xl font-extrabold text-white mt-1">{statsData?.total ?? pagination.total}</p>
          </div>
          <div className="bg-gray-900 border border-white/5 rounded-2xl p-4">
            <p className="text-gray-400 text-xs">Acciones en Últimas 24 Horas</p>
            <p className="text-2xl font-extrabold text-emerald-400 mt-1">{statsData?.last24h ?? 0}</p>
          </div>
          <div className="bg-gray-900 border border-white/5 rounded-2xl p-4">
            <p className="text-gray-400 text-xs">Página Actual</p>
            <p className="text-2xl font-extrabold text-primary mt-1">{pagination.page} de {pagination.pages || 1}</p>
          </div>
          <div className="bg-gray-900 border border-white/5 rounded-2xl p-4">
            <p className="text-gray-400 text-xs">Integridad de Auditoría</p>
            <p className="text-2xl font-extrabold text-emerald-400 mt-1 flex items-center gap-1.5">
              <ShieldCheck className="w-5 h-5 text-emerald-400 inline" />
              100% Activa
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-gray-900/60 border border-white/5 rounded-2xl p-4 mb-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            {/* Search */}
            <div className="relative md:col-span-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1); }}
                placeholder="Buscar por usuario, IP o label..."
                className="w-full bg-gray-950 border border-white/10 text-white rounded-xl pl-9 pr-4 py-2 text-xs focus:outline-none focus:border-primary"
              />
            </div>

            {/* Action Filter */}
            <div>
              <select
                value={actionFilter}
                onChange={e => { setActionFilter(e.target.value); setPage(1); }}
                className="w-full bg-gray-950 border border-white/10 text-white rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-primary"
              >
                <option value="all">Todas las Acciones</option>
                <option value="organizer_verification_approved">Organizador Aprobado 🛡️</option>
                <option value="organizer_verification_rejected">Organizador Rechazado ❌</option>
                <option value="report_status_updated">Reporte Actualizado</option>
                <option value="content_removed">Contenido Eliminado</option>
                <option value="support_ticket_status_changed">Ticket de Soporte Modificado</option>
                <option value="admin_login">Inicio de Sesión Admin</option>
                <option value="user_role_changed">Rol de Usuario Modificado</option>
              </select>
            </div>

            {/* Status Filter */}
            <div>
              <select
                value={statusFilter}
                onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
                className="w-full bg-gray-950 border border-white/10 text-white rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-primary"
              >
                <option value="all">Todos los Estados</option>
                <option value="success">Éxito (Success)</option>
                <option value="warning">Advertencia (Warning)</option>
                <option value="failure">Fallo (Failure)</option>
              </select>
            </div>

            {/* Target Type Filter */}
            <div>
              <select
                value={targetTypeFilter}
                onChange={e => { setTargetTypeFilter(e.target.value); setPage(1); }}
                className="w-full bg-gray-950 border border-white/10 text-white rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-primary"
              >
                <option value="all">Todos los Objetivos</option>
                <option value="user">Usuario</option>
                <option value="event">Evento</option>
                <option value="report">Reporte</option>
                <option value="support_ticket">Ticket de Soporte</option>
                <option value="system">Sistema</option>
              </select>
            </div>
          </div>
        </div>

        {/* Mobile Cards View (< md) */}
        <div className="md:hidden space-y-3 mb-6">
          {isLoading ? (
            [...Array(4)].map((_, i) => (
              <div key={i} className="h-28 bg-gray-900 rounded-2xl animate-pulse" />
            ))
          ) : logs.length === 0 ? (
            <div className="bg-gray-900 border border-white/5 rounded-2xl p-10 text-center text-gray-500">
              <FileText className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="font-semibold text-gray-400">No se encontraron registros</p>
            </div>
          ) : (
            logs.map((log) => {
              const actionMeta = ACTION_LABELS[log.action] || ACTION_LABELS.other
              const Icon = actionMeta.icon
              return (
                <div key={log._id} className="bg-gray-900 border border-white/10 rounded-2xl p-4 space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${actionMeta.color}`}>
                      <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                      {actionMeta.label}
                    </span>
                    <span className="text-[11px] text-gray-500">
                      {formatDistanceToNow(new Date(log.createdAt), { addSuffix: true, locale: es })}
                    </span>
                  </div>
                  <div className="text-xs text-gray-300">
                    <strong>Actor:</strong> @{log.actorUsername} ({log.actorRole})
                  </div>
                  <div className="text-xs text-gray-300 truncate">
                    <strong>Objetivo:</strong> {log.targetLabel || log.targetId || log.targetType}
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-white/5">
                    <span className="text-[11px] font-mono text-gray-500">{log.ipAddress || '127.0.0.1'}</span>
                    <button
                      onClick={() => setSelectedLog(log)}
                      className="px-3 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-gray-200 border border-white/10 text-xs font-semibold inline-flex items-center gap-1"
                    >
                      <Eye className="w-3 h-3" /> Inspeccionar
                    </button>
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* Desktop Logs Table (md+) */}
        <div className="hidden md:block bg-gray-900 border border-white/5 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-950/80 text-gray-400 uppercase tracking-wider text-[10px] border-b border-white/10">
                <tr>
                  <th className="py-3 px-4">Fecha y Hora</th>
                  <th className="py-3 px-4">Acción Realizada</th>
                  <th className="py-3 px-4">Actor (Admin/Usuario)</th>
                  <th className="py-3 px-4">Objetivo Afectado</th>
                  <th className="py-3 px-4">IP / Origen</th>
                  <th className="py-3 px-4 text-right">Detalles</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {isLoading ? (
                  [...Array(6)].map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td colSpan={6} className="py-4 px-4 h-12 bg-gray-900/40" />
                    </tr>
                  ))
                ) : logs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-16 text-center text-gray-500">
                      <FileText className="w-10 h-10 mx-auto mb-2 opacity-30" />
                      <p className="font-semibold text-gray-400">No se encontraron registros de auditoría</p>
                      <p className="text-xs text-gray-600 mt-1">Los eventos del sistema se registrarán aquí automáticamente.</p>
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => {
                    const actionMeta = ACTION_LABELS[log.action] || ACTION_LABELS.other
                    const Icon = actionMeta.icon

                    return (
                      <tr key={log._id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="py-3.5 px-4 whitespace-nowrap text-gray-300">
                          <div className="font-medium">
                            {formatDistanceToNow(new Date(log.createdAt), { addSuffix: true, locale: es })}
                          </div>
                          <div className="text-[11px] text-gray-500 mt-0.5">
                            {new Date(log.createdAt).toLocaleString('es-DO', { dateStyle: 'short', timeStyle: 'short' })}
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${actionMeta.color}`}>
                            <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                            {actionMeta.label}
                          </span>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-primary text-[10px] font-bold">
                              {log.actorUsername?.[0]?.toUpperCase() || 'S'}
                            </div>
                            <div>
                              <p className="font-semibold text-white">@{log.actorUsername}</p>
                              <p className="text-[10px] text-gray-500 capitalize">{log.actorRole}</p>
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <span className="text-gray-300 font-medium">
                            {log.targetLabel || log.targetId || log.targetType}
                          </span>
                          <span className="ml-1 text-[10px] text-gray-500 uppercase">({log.targetType})</span>
                        </td>

                        <td className="py-3.5 px-4 text-gray-400 font-mono text-[11px]">
                          {log.ipAddress || '127.0.0.1'}
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={() => setSelectedLog(log)}
                            className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white border border-white/10 text-xs font-semibold transition-all inline-flex items-center gap-1"
                          >
                            <Eye className="w-3 h-3" />
                            Inspeccionar
                          </button>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="p-4 border-t border-white/10 flex items-center justify-between text-xs text-gray-400">
              <span>Mostrando página {pagination.page} de {pagination.pages}</span>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={pagination.page <= 1}
                  className="px-3 py-1.5 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-white disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Anterior
                </button>
                <button
                  onClick={() => setPage(p => Math.min(pagination.pages, p + 1))}
                  disabled={pagination.page >= pagination.pages}
                  className="px-3 py-1.5 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-white disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Siguiente
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Audit Detail Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-white/10 rounded-2xl max-w-2xl w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h3 className="text-white font-bold text-base flex items-center gap-2">
                <Terminal className="w-4 h-4 text-primary" />
                Detalle del Registro de Auditoría
              </h3>
              <button
                onClick={() => setSelectedLog(null)}
                className="text-gray-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="bg-white/5 p-3 rounded-xl">
                <p className="text-gray-400 font-medium">Acción</p>
                <p className="text-white font-semibold mt-0.5">{selectedLog.action}</p>
              </div>
              <div className="bg-white/5 p-3 rounded-xl">
                <p className="text-gray-400 font-medium">Actor</p>
                <p className="text-white font-semibold mt-0.5">@{selectedLog.actorUsername} ({selectedLog.actorRole})</p>
              </div>
              <div className="bg-white/5 p-3 rounded-xl">
                <p className="text-gray-400 font-medium">Objetivo ({selectedLog.targetType})</p>
                <p className="text-white font-semibold mt-0.5">{selectedLog.targetLabel || selectedLog.targetId}</p>
              </div>
              <div className="bg-white/5 p-3 rounded-xl">
                <p className="text-gray-400 font-medium">Dirección IP</p>
                <p className="text-white font-mono mt-0.5">{selectedLog.ipAddress || 'No registrada'}</p>
              </div>
            </div>

            {selectedLog.userAgent && (
              <div className="bg-white/5 p-3 rounded-xl text-xs">
                <p className="text-gray-400 font-medium">User Agent</p>
                <p className="text-gray-300 font-mono text-[11px] mt-0.5 break-all">{selectedLog.userAgent}</p>
              </div>
            )}

            <div>
              <p className="text-gray-400 text-xs font-semibold mb-1.5">Metadatos / Payload de Cambios (JSON)</p>
              <pre className="bg-gray-950 p-4 rounded-xl border border-white/10 text-emerald-400 font-mono text-xs overflow-x-auto max-h-60">
                {JSON.stringify(selectedLog.details || {}, null, 2)}
              </pre>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:opacity-95 transition-all"
              >
                Cerrar Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
