export interface VisibleEventAttendee {
  id: string
  firstName: string
  username: string
  avatar?: string
}

export interface EventAttendanceSummary {
  confirmedCount: number
  visibleAttendees: VisibleEventAttendee[]
  hiddenCount: number
}

// Only consume the server's privacy projection. Raw attendees are never a profile source.
export function readEventAttendanceSummary(value: unknown): EventAttendanceSummary | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const input = value as Record<string, unknown>
  if (!Number.isSafeInteger(input.confirmedCount) || (input.confirmedCount as number) < 0 || !Array.isArray(input.visibleAttendees)) return null
  const confirmedCount = input.confirmedCount as number
  const seen = new Set<string>()
  const visibleAttendees: VisibleEventAttendee[] = []
  for (const item of input.visibleAttendees) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) continue
    const attendee = item as Record<string, unknown>
    if (typeof attendee.id !== 'string' || !/^[a-f\d]{24}$/i.test(attendee.id) || seen.has(attendee.id.toLowerCase())) continue
    if (visibleAttendees.length >= Math.min(12, confirmedCount)) break
    seen.add(attendee.id.toLowerCase())
    const firstName = typeof attendee.firstName === 'string' ? attendee.firstName.trim().slice(0, 80) : ''
    const username = typeof attendee.username === 'string' ? attendee.username.trim().slice(0, 80) : ''
    let avatar: string | undefined
    if (typeof attendee.avatar === 'string') {
      try {
        const url = new URL(attendee.avatar)
        if (url.protocol === 'https:' && !url.username && !url.password) avatar = url.href
      } catch { /* Missing or unsupported images use initials. */ }
    }
    visibleAttendees.push({ id: attendee.id, firstName, username, avatar })
  }
  return { confirmedCount, visibleAttendees, hiddenCount: Math.max(0, confirmedCount - visibleAttendees.length) }
}
