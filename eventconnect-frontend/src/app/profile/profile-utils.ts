export interface UserProfile {
  id: string
  username: string
  email?: string
  firstName: string
  lastName: string
  bio?: string
  location?: { type?: 'Point'; address: string; coordinates?: [number, number] }
  avatar?: string
  coverImage?: string
  interests: string[]
  socialLinks: { website?: string; instagram?: string; twitter?: string; linkedin?: string }
  stats: { eventsAttended: number; eventsCreated: number; tribesJoined: number; connections: number }
  phone?: string
  isPrivate: boolean
}

export function normalizeProfile(value: unknown): UserProfile {
  if (!value || typeof value !== 'object') throw new Error('La respuesta del perfil no es válida.')
  const user = value as Partial<UserProfile> & { _id?: string }
  const id = user.id || user._id
  if (!id) throw new Error('La respuesta del perfil no es válida.')
  return {
    ...user, id, firstName: user.firstName || '', lastName: user.lastName || '',
    username: user.username || '', interests: Array.isArray(user.interests) ? user.interests : [],
    socialLinks: user.socialLinks || {}, isPrivate: !!user.isPrivate,
    stats: { eventsAttended: 0, eventsCreated: 0, tribesJoined: 0, connections: 0, ...user.stats },
  }
}

// Send only changed, editable fields. Sending the complete server object also sends
// private metadata and empty optional values rejected by the API's validators.
export function buildProfileUpdate(original: UserProfile, draft: Partial<UserProfile>) {
  const update: Record<string, unknown> = {}
  const keys = ['firstName', 'lastName', 'bio', 'phone', 'interests', 'location', 'socialLinks', 'isPrivate'] as const
  for (const key of keys) {
    let value = draft[key]
    if (value === undefined) continue
    if (typeof value === 'string') value = value.trim()
    if (JSON.stringify(value) !== JSON.stringify(original[key])) update[key] = value
  }
  if ('firstName' in update && !update.firstName) throw new Error('Escribe tu nombre.')
  if ('lastName' in update && !update.lastName) throw new Error('Escribe tu apellido.')
  if (typeof update.bio === 'string' && update.bio.length > 500) throw new Error('La biografía admite hasta 500 caracteres.')
  return update
}

export function validateProfileImage(file: Pick<File, 'type' | 'size'>): string | null {
  if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type)) return 'Elige una imagen JPG, PNG, WebP o GIF.'
  if (file.size > 10 * 1024 * 1024) return 'La imagen debe pesar como máximo 10 MB.'
  return null
}

export function safeSocialUrl(value?: string): string | null {
  if (!value) return null
  try {
    const url = new URL(/^[a-z][a-z\d+.-]*:/i.test(value) ? value : `https://${value}`)
    return ['http:', 'https:'].includes(url.protocol) ? url.href : null
  } catch { return null }
}
