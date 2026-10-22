import type { PlanEvent } from '@/lib/api/plans'

const escape = (text: string) => text.replace(/\\/g, '\\\\').replace(/\r?\n|\r/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;')
const stamp = (date: string) => new Date(date).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z')

export function planCalendar(event: PlanEvent, origin: string) {
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//EventNow//Planes en grupo//ES', 'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT', `UID:${event.id}@eventnow`, `DTSTAMP:${stamp(new Date().toISOString())}`, `DTSTART:${stamp(event.date)}`]
  if (event.endDate && new Date(event.endDate) > new Date(event.date)) lines.push(`DTEND:${stamp(event.endDate)}`)
  lines.push(`SUMMARY:${escape(event.title)}`, `LOCATION:${escape(event.location)}`,
    `URL:${new URL(`/events/${encodeURIComponent(event.id)}`, origin).href}`, 'END:VEVENT', 'END:VCALENDAR')
  return lines.join('\r\n') + '\r\n'
}
