'use client'

import React, { useState } from 'react'
import {
  Video,
  Play,
  ExternalLink,
  Copy,
  Check,
  Calendar,
  Sparkles,
  Radio,
  Clock,
  Layers,
  BookOpen,
  Info,
  Maximize2
} from 'lucide-react'

export interface VirtualDetails {
  meetingId?: string
  passcode?: string
  streamEmbedUrl?: string
  recordingUrl?: string
  isStream?: boolean
  isWorkshop?: boolean
  isWebinar?: boolean
  prerequisites?: string[]
  calendarExportUrl?: string
}

interface VirtualStagePlayerProps {
  eventId: string
  eventTitle: string
  eventDate: string | Date
  eventEndDate?: string | Date
  virtualPlatform?: string
  virtualLink?: string
  virtualDetails?: VirtualDetails
  isAttendee?: boolean
  onAttendRequest?: () => void
}

export function VirtualStagePlayer({
  eventId,
  eventTitle,
  eventDate,
  eventEndDate,
  virtualPlatform = 'custom',
  virtualLink,
  virtualDetails = {},
  isAttendee = false,
  onAttendRequest
}: VirtualStagePlayerProps) {
  const [copiedId, setCopiedId] = useState(false)
  const [copiedPass, setCopiedPass] = useState(false)
  const [showEmbed, setShowEmbed] = useState(false)

  const startDate = new Date(eventDate)
  const endDate = eventEndDate ? new Date(eventEndDate) : new Date(startDate.getTime() + 2 * 3600 * 1000)
  const now = new Date()

  const isLive = now >= startDate && now <= endDate
  const isEnded = now > endDate
  const isUpcoming = now < startDate

  // Platform metadata
  const platformMeta: Record<string, { name: string; color: string; bg: string; icon: string }> = {
    youtube_live: { name: 'YouTube Live', color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/30', icon: '🔴' },
    twitch: { name: 'Twitch Interactive', color: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-500/30', icon: '🟣' },
    kick: { name: 'Kick Live', color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/30', icon: '🟢' },
    google_meet: { name: 'Google Meet', color: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/30', icon: '🟡' },
    zoom: { name: 'Zoom Video Stage', color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/30', icon: '🔵' },
    teams: { name: 'Microsoft Teams', color: 'text-indigo-400', bg: 'bg-indigo-500/10 border-indigo-500/30', icon: '🔷' },
    discord: { name: 'Discord Stage', color: 'text-indigo-400', bg: 'bg-indigo-500/10 border-indigo-500/30', icon: '🎧' },
    webinar: { name: 'Sala Virtual / Webinar', color: 'text-violet-400', bg: 'bg-violet-500/10 border-violet-500/30', icon: '🌐' },
    custom: { name: 'Transmisión Online Global', color: 'text-cyan-400', bg: 'bg-cyan-500/10 border-cyan-500/30', icon: '⚡' }
  }

  const currentPlatform = platformMeta[virtualPlatform] || platformMeta.custom

  const copyToClipboard = (text: string, type: 'id' | 'pass') => {
    navigator.clipboard.writeText(text)
    if (type === 'id') {
      setCopiedId(true)
      setTimeout(() => setCopiedId(false), 2000)
    } else {
      setCopiedPass(true)
      setTimeout(() => setCopiedPass(false), 2000)
    }
  }

  const handleExternalJoin = (e: React.MouseEvent) => {
    if (!virtualLink) return
    const confirmed = window.confirm(
      `Estás saliendo de EventNow hacia el escenario virtual:\n\n${virtualLink}\n\nAcceso seguro verificado. ¿Deseas unirte ahora?`
    )
    if (!confirmed) e.preventDefault()
  }

  // Google Calendar Link Generator
  const googleCalendarUrl = () => {
    const formatTime = (d: Date) => d.toISOString().replace(/-|:|\.\d\d\d/g, '')
    const dates = `${formatTime(startDate)}/${formatTime(endDate)}`
    const details = encodeURIComponent(`${eventTitle}\n\nEnlace virtual: ${virtualLink || 'Ver en EventNow'}`)
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(eventTitle)}&dates=${dates}&details=${details}&location=${encodeURIComponent(virtualLink || 'Online')}`
  }

  return (
    <div className="overflow-hidden rounded-3xl border border-violet-500/30 bg-gradient-to-br from-slate-900/90 via-slate-900/80 to-violet-950/40 p-6 backdrop-blur-xl shadow-2xl">
      {/* Header bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-violet-600/20 text-xl text-violet-300 border border-violet-500/30">
            {currentPlatform.icon}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className={`text-xs font-bold uppercase tracking-wider ${currentPlatform.color}`}>
                {currentPlatform.name}
              </span>
              {virtualDetails.isWorkshop && (
                <span className="rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-300">
                  🎓 Taller Interactivo
                </span>
              )}
              {virtualDetails.isWebinar && (
                <span className="rounded-md border border-blue-500/30 bg-blue-500/10 px-2 py-0.5 text-[10px] font-semibold text-blue-300">
                  🏛️ Webinar Oficial
                </span>
              )}
              {virtualDetails.isStream && (
                <span className="rounded-md border border-red-500/30 bg-red-500/10 px-2 py-0.5 text-[10px] font-semibold text-red-300">
                  ⚡ Live Stream
                </span>
              )}
            </div>
            <h3 className="text-base font-bold text-white">Escenario Virtual & Transmisión Global</h3>
          </div>
        </div>

        {/* Live status badge */}
        <div>
          {isLive ? (
            <span className="inline-flex items-center gap-2 rounded-full border border-red-500/40 bg-red-500/20 px-3 py-1 text-xs font-bold text-red-300 animate-pulse">
              <Radio className="h-3.5 w-3.5 text-red-400" />
              EN VIVO AHORA
            </span>
          ) : isEnded ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-700 bg-slate-800/80 px-3 py-1 text-xs font-medium text-slate-400">
              <Clock className="h-3.5 w-3.5" />
              Finalizado
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-violet-500/30 bg-violet-500/10 px-3 py-1 text-xs font-medium text-violet-300">
              <Sparkles className="h-3.5 w-3.5" />
              Próxima transmisión
            </span>
          )}
        </div>
      </div>

      {/* Embedded Video Stream Player (if YouTube/Twitch embed is available) */}
      {virtualDetails.streamEmbedUrl && (
        <div className="mt-4">
          {showEmbed ? (
            <div className="relative aspect-video w-full overflow-hidden rounded-2xl border border-slate-700 bg-black shadow-lg">
              <iframe
                src={virtualDetails.streamEmbedUrl}
                title={eventTitle}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                className="h-full w-full border-0"
              />
            </div>
          ) : (
            <div className="relative flex aspect-video w-full flex-col items-center justify-center overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/80 p-6 text-center">
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />
              <div className="relative z-10 flex flex-col items-center max-w-md">
                <div className="mb-3 grid h-14 w-14 place-items-center rounded-full bg-violet-600/30 text-violet-200 border border-violet-500/50 shadow-lg shadow-violet-500/30">
                  <Play className="h-6 w-6 ml-0.5 fill-violet-300" />
                </div>
                <h4 className="text-lg font-bold text-white">Reproductor Integrado EventNow</h4>
                <p className="mt-1 text-xs text-slate-400 leading-relaxed">
                  Puedes sintonizar la transmisión en directo con baja latencia sin salir de la plataforma.
                </p>
                <button
                  type="button"
                  onClick={() => setShowEmbed(true)}
                  className="mt-4 inline-flex items-center gap-2 rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-violet-600/30 hover:bg-violet-500 transition-all"
                >
                  <Play className="h-4 w-4 fill-white" />
                  Abrir Reproductor en Vivo
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Meeting Credentials (Zoom / Google Meet / Teams) */}
      {(virtualDetails.meetingId || virtualDetails.passcode) && (
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {virtualDetails.meetingId && (
            <div className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/60 p-3">
              <div>
                <span className="text-[10px] uppercase font-semibold text-slate-400">ID de la Reunión / Sala</span>
                <p className="font-mono text-sm font-bold text-white">{virtualDetails.meetingId}</p>
              </div>
              <button
                type="button"
                onClick={() => copyToClipboard(virtualDetails.meetingId!, 'id')}
                className="grid h-8 w-8 place-items-center rounded-lg border border-slate-700 bg-slate-800 text-slate-300 hover:text-white transition-colors"
                title="Copiar ID"
              >
                {copiedId ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
              </button>
            </div>
          )}

          {virtualDetails.passcode && (
            <div className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/60 p-3">
              <div>
                <span className="text-[10px] uppercase font-semibold text-slate-400">Código de Acceso / Passcode</span>
                <p className="font-mono text-sm font-bold text-amber-300">{virtualDetails.passcode}</p>
              </div>
              <button
                type="button"
                onClick={() => copyToClipboard(virtualDetails.passcode!, 'pass')}
                className="grid h-8 w-8 place-items-center rounded-lg border border-slate-700 bg-slate-800 text-slate-300 hover:text-white transition-colors"
                title="Copiar contraseña"
              >
                {copiedPass ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Prerequisites / Requirements for Workshops */}
      {virtualDetails.prerequisites && virtualDetails.prerequisites.length > 0 && (
        <div className="mt-4 rounded-xl border border-slate-800/80 bg-slate-950/40 p-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-amber-300">
            <BookOpen className="h-4 w-4" />
            <span>Requisitos para el Taller / Materiales:</span>
          </div>
          <ul className="mt-2 space-y-1.5">
            {virtualDetails.prerequisites.map((req, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-slate-300">
                <span className="text-amber-400 mt-0.5">•</span>
                <span>{req}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Action Buttons */}
      <div className="mt-5 flex flex-wrap items-center gap-3">
        {virtualLink ? (
          <a
            href={virtualLink}
            target="_blank"
            rel="noopener noreferrer nofollow"
            onClick={handleExternalJoin}
            className="flex-1 min-w-[200px] inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-violet-600/30 hover:from-violet-500 hover:to-indigo-500 transition-all"
          >
            <Video className="h-4 w-4" />
            <span>Unirse a la Sala / Transmisión</span>
            <ExternalLink className="h-3.5 w-3.5 opacity-70" />
          </a>
        ) : (
          <button
            type="button"
            disabled
            className="flex-1 min-w-[200px] inline-flex items-center justify-center gap-2 rounded-xl bg-slate-800 px-5 py-3 text-sm font-semibold text-slate-400 cursor-not-allowed"
          >
            <span>Enlace disponible antes de iniciar</span>
          </button>
        )}

        {/* Replay recording if ended and available */}
        {isEnded && virtualDetails.recordingUrl && (
          <a
            href={virtualDetails.recordingUrl}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="inline-flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm font-semibold text-emerald-300 hover:bg-emerald-500/20 transition-colors"
          >
            <Play className="h-4 w-4 fill-emerald-300" />
            <span>Ver Grabación / Replay</span>
          </a>
        )}

        {/* Add to Google Calendar */}
        <a
          href={googleCalendarUrl()}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800/80 px-4 py-3 text-sm font-medium text-slate-200 hover:bg-slate-700 transition-colors"
        >
          <Calendar className="h-4 w-4 text-violet-300" />
          <span>Añadir a Calendario</span>
        </a>
      </div>

      {/* Info note */}
      <p className="mt-3 flex items-center gap-1.5 text-[11px] text-slate-400">
        <Info className="h-3.5 w-3.5 shrink-0 text-violet-400" />
        Evento 100% digital y sin fronteras. Acceso disponible desde cualquier país y huso horario.
      </p>
    </div>
  )
}
