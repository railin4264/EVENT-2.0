'use client';

import React, { useEffect, useState } from 'react';
import { ticketService } from '@/services';
import type { Ticket } from '@/services/TicketService';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Ticket as TicketIcon, Calendar, MapPin, Clock, CheckCircle, XCircle, AlertCircle, QrCode, ChevronRight,  } from 'lucide-react';

export default function TicketsPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'active' | 'used' | 'expired'>('all');

  useEffect(() => {
    loadTickets();
  }, []);

  const loadTickets = async () => {
    try {
      const result = await ticketService.getMyTickets();
      setTickets(result.data);
    } catch (error) {
      console.error('Error loading tickets:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterTickets = () => {
    const now = new Date();
    switch (filter) {
      case 'active':
        return tickets.filter(t => t.status === 'active' && new Date(t.validUntil) >= now);
      case 'used':
        return tickets.filter(t => t.status === 'used');
      case 'expired':
        return tickets.filter(t => t.status === 'active' && new Date(t.validUntil) < now);
      default:
        return tickets;
    }
  };

  const getStatusInfo = (ticket: Ticket) => {
    if (ticket.status === 'used')
      return { label: 'Usado', icon: CheckCircle, bg: 'bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-gray-400' };
    if (new Date(ticket.validUntil) < new Date())
      return { label: 'Expirado', icon: XCircle, bg: 'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400' };
    if (ticket.status === 'active')
      return { label: 'Activo', icon: CheckCircle, bg: 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' };
    return { label: ticket.status, icon: AlertCircle, bg: 'bg-yellow-50 dark:bg-yellow-500/10 text-yellow-600 dark:text-yellow-400' };
  };

  const activeCount = tickets.filter(t => t.status === 'active' && new Date(t.validUntil) >= new Date()).length;
  const usedCount = tickets.filter(t => t.status === 'used').length;
  const expiredCount = tickets.filter(t => t.status === 'active' && new Date(t.validUntil) < new Date()).length;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
        <div className="space-y-4 text-center">
          <div className="w-16 h-16 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin mx-auto" />
          <p className="text-gray-500 dark:text-gray-400 font-medium">Cargando tickets...</p>
        </div>
      </div>
    );
  }

  const filteredTickets = filterTickets();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Header */}
      <div className="bg-white dark:bg-gray-950 border-b border-gray-100 dark:border-white/5">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
            <p className="text-sm text-gray-400 font-medium mb-1">Mis Entradas</p>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-gray-900 dark:text-white">
              Tickets 🎫
            </h1>
          </motion.div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-8">

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total', value: tickets.length, numColor: 'text-violet-600 dark:text-violet-400' },
            { label: 'Activos', value: activeCount, numColor: 'text-emerald-600 dark:text-emerald-400' },
            { label: 'Usados', value: usedCount, numColor: 'text-gray-700 dark:text-gray-300' },
            { label: 'Expirados', value: expiredCount, numColor: 'text-red-600 dark:text-red-400' },
          ].map(({ label, value, numColor }, i) => (
            <motion.div
              key={label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-white/5 rounded-2xl p-5 shadow-sm"
            >
              <p className={`text-2xl font-bold ${numColor}`}>{value}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 font-medium">{label}</p>
            </motion.div>
          ))}
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-1 overflow-x-auto scrollbar-none" role="tablist">
          {[
            { key: 'all', label: 'Todos' },
            { key: 'active', label: 'Activos' },
            { key: 'used', label: 'Usados' },
            { key: 'expired', label: 'Expirados' },
          ].map(({ key, label }) => (
            <button
              key={key}
              role="tab"
              aria-selected={filter === key}
              onClick={() => setFilter(key as typeof filter)}
              className={`shrink-0 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                filter === key
                  ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-sm border border-gray-200 dark:border-white/10'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-white/60 dark:hover:bg-white/5'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Tickets list */}
        {filteredTickets.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-white/5 flex items-center justify-center mb-4">
              <TicketIcon className="w-8 h-8 text-gray-400 dark:text-gray-500" />
            </div>
            <p className="text-base font-semibold text-gray-900 dark:text-white mb-1">Sin tickets</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 max-w-xs">
              {filter === 'all'
                ? '¡Aún no tienes entradas. Explora eventos y consigue la tuya!'
                : `No tienes tickets ${filter === 'active' ? 'activos' : filter === 'used' ? 'usados' : 'expirados'}.`}
            </p>
            {filter === 'all' && (
              <Link
                href="/events"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-semibold text-sm transition-colors"
              >
                Explorar eventos
                <ChevronRight className="w-4 h-4" />
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredTickets.map((ticket, i) => {
              const event = typeof ticket.event === 'object' ? ticket.event : null;
              const { label, icon: StatusIcon, bg } = getStatusInfo(ticket);
              const isActive = ticket.status === 'active' && new Date(ticket.validUntil) >= new Date();

              return (
                <motion.div
                  key={ticket._id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                >
                  <Link
                    href={`/tickets/${ticket._id}`}
                    className="block bg-white dark:bg-gray-900 border border-gray-100 dark:border-white/5 rounded-2xl shadow-sm hover:shadow-md transition-shadow overflow-hidden"
                  >
                    {/* accent stripe */}
                    <div
                      className={`h-1 w-full ${
                        isActive
                          ? 'bg-gradient-to-r from-emerald-400 to-teal-400'
                          : ticket.status === 'used'
                          ? 'bg-gray-200 dark:bg-white/10'
                          : 'bg-red-300 dark:bg-red-500/30'
                      }`}
                    />

                    <div className="p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center gap-4">
                      {/* Left */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold ${bg}`}>
                            <StatusIcon className="w-3.5 h-3.5" />
                            {label}
                          </span>
                          <span className="text-xs text-gray-400 dark:text-gray-600 font-mono">
                            #{ticket._id.slice(-6).toUpperCase()}
                          </span>
                        </div>

                        <h3 className="text-base font-bold text-gray-900 dark:text-white truncate">
                          {event?.title || 'Evento'}
                        </h3>

                        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-sm text-gray-500 dark:text-gray-400">
                          {(event?.date || ticket.validFrom) && (
                            <span className="flex items-center gap-1.5">
                              <Calendar className="w-3.5 h-3.5 shrink-0" />
                              {new Date(event?.date || ticket.validFrom).toLocaleDateString('es-ES', {
                                weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
                              })}
                            </span>
                          )}
                          {(event?.date || ticket.validFrom) && (
                            <span className="flex items-center gap-1.5">
                              <Clock className="w-3.5 h-3.5 shrink-0" />
                              {new Date(event?.date || ticket.validFrom).toLocaleTimeString('es-ES', {
                                hour: '2-digit', minute: '2-digit',
                              })}
                            </span>
                          )}
                          {event?.location?.address && (
                            <span className="flex items-center gap-1.5">
                              <MapPin className="w-3.5 h-3.5 shrink-0" />
                              <span className="truncate max-w-[160px]">{event.location.address}</span>
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-4 mt-3 pt-3 border-t border-gray-100 dark:border-white/5 text-sm">
                          <span className="text-gray-500 dark:text-gray-400">{ticket.ticketType.name}</span>
                          <span className="font-bold text-gray-900 dark:text-white">
                            {ticket.currency} {ticket.price.toFixed(2)}
                          </span>
                        </div>

                        {ticket.usedAt && (
                          <p className="text-xs text-gray-400 mt-2 flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" />
                            Usado el {new Date(ticket.usedAt).toLocaleString('es-ES')}
                          </p>
                        )}
                      </div>

                      {/* Right: QR */}
                      {isActive && (
                        <div className="shrink-0 flex flex-col items-center gap-1.5 p-3 rounded-2xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5">
                          <QrCode className="w-8 h-8 text-gray-700 dark:text-gray-300" />
                          <span className="text-xs text-gray-500 dark:text-gray-400">Ver QR</span>
                        </div>
                      )}

                      <ChevronRight className="shrink-0 w-5 h-5 text-gray-300 dark:text-gray-600 hidden sm:block" />
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}