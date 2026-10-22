'use client'

import { Calendar, Download, Check } from 'lucide-react'
import { useState } from 'react'

interface EventCalendarButtonsProps {
  title: string
  description?: string
  date: string | Date
  endDate?: string | Date
  location?: string
}

function formatGoogleDate(d: Date): string {
  return d.toISOString().replace(/-|:|\.\d\d\d/g, '')
}

export default function EventCalendarButtons({
  title,
  description = '',
  date,
  endDate,
  location = ''
}: EventCalendarButtonsProps) {
  const [downloaded, setDownloaded] = useState(false)

  const startDate = new Date(date)
  const stopDate = endDate ? new Date(endDate) : null
  if (!Number.isFinite(startDate.getTime()) || (stopDate && (!Number.isFinite(stopDate.getTime()) || stopDate < startDate))) return null

  // Google Calendar URL Template
  const googleDates = stopDate ? `${formatGoogleDate(startDate)}/${formatGoogleDate(stopDate)}` : ''
  const googleUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(
    title
  )}&dates=${googleDates}&details=${encodeURIComponent(
    description + '\n\nEncuentra más detalles en EventNow'
  )}&location=${encodeURIComponent(location)}`

  // Generate downloadable .ics file (RFC 5545)
  const handleDownloadIcs = () => {
    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//EventNow//EventNow RD//ES',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'BEGIN:VEVENT',
      `UID:${Date.now()}@eventnow.do`,
      `DTSTAMP:${formatGoogleDate(new Date())}`,
      `DTSTART:${formatGoogleDate(startDate)}`,
      ...(stopDate ? [`DTEND:${formatGoogleDate(stopDate)}`] : []),
      `SUMMARY:${title}`,
      `DESCRIPTION:${(description || '').replace(/\n/g, '\\n')}`,
      `LOCATION:${location}`,
      'STATUS:CONFIRMED',
      'END:VEVENT',
      'END:VCALENDAR'
    ].join('\r\n')

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' })
    const link = document.createElement('a')
    link.href = window.URL.createObjectURL(blob)
    link.setAttribute('download', `${title.slice(0, 30).replace(/[^a-zA-Z0-9]/g, '_')}_eventnow.ics`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    setDownloaded(true)
    setTimeout(() => setDownloaded(false), 3000)
  }

  return (
    <div className="rounded-2xl border border-violet-500/20 bg-gradient-to-r from-violet-950/30 to-purple-950/20 p-4 backdrop-blur-md">
      <div className="flex items-center gap-2 mb-2">
        <Calendar className="h-4 w-4 text-violet-400" />
        <h4 className="text-xs font-bold uppercase tracking-wider text-violet-400">
          Agendar en 1 Clic (Recordatorio Automático)
        </h4>
      </div>

      <p className="text-xs text-gray-300 mb-3">
        {stopDate ? 'Añade el evento a tu agenda y configura tus recordatorios al guardarlo.' : 'La fuente no indica la hora final. Descarga el inicio en formato iCalendar y revisa la duración al guardarlo.'}
      </p>

      <div className="flex flex-wrap items-center gap-2">
        {stopDate && <a
          href={googleUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 min-w-[140px] flex items-center justify-center gap-2 rounded-xl bg-white px-3 py-2 text-xs font-bold text-gray-900 shadow transition hover:bg-gray-100 active:scale-95"
        >
          <Calendar className="h-4 w-4 text-blue-600" />
          <span>Google Calendar</span>
        </a>}

        <button
          type="button"
          onClick={handleDownloadIcs}
          className="flex-1 min-w-[140px] flex items-center justify-center gap-2 rounded-xl border border-violet-500/40 bg-violet-600/30 px-3 py-2 text-xs font-bold text-violet-200 transition hover:bg-violet-600/40 active:scale-95"
        >
          {downloaded ? <Check className="h-4 w-4 text-emerald-400" /> : <Download className="h-4 w-4" />}
          <span>{downloaded ? '¡Descargado!' : 'Apple / Outlook (.ics)'}</span>
        </button>
      </div>
    </div>
  )
}
