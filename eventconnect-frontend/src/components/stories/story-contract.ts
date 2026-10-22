import { API_BASE_URL } from '@/lib/constants'

export interface StoryItem {
  _id: string
  content?: string
  author: { _id: string; firstName: string; lastName?: string; avatar?: string }
  media: { type: 'image' | 'video'; url: string; duration?: number }[]
  style?: { backgroundColor?: string; textColor?: string; fontSize?: string }
  music?: { title: string; artist: string; url?: string }
  event?: { _id: string; title: string; location?: string }
  views: number
  likes: number
  replies: number
  isLiked: boolean
  isViewed: boolean
  createdAt: string
  expiresAt: string
}

export interface StoryReply {
  _id: string
  author: StoryItem['author'] | null
  content: string
  createdAt: string
}

export function storyMediaUrl(url?: string): string | undefined {
  if (!url) return undefined
  if (/^https?:\/\//i.test(url)) return url
  if (!url.startsWith('/uploads/')) return undefined
  return `${API_BASE_URL.replace(/\/api\/?$/, '')}${url}`
}

export function readStories(payload: { stories?: StoryItem[]; data?: StoryItem[] }): StoryItem[] {
  const items = payload.stories ?? payload.data
  if (!Array.isArray(items)) throw new Error('La respuesta de historias no es válida')
  return items.map(story => ({
    ...story,
    author: story.author || { _id: '', firstName: 'Usuario' },
    media: (story.media || []).map(media => ({ ...media, url: storyMediaUrl(media.url) || '' })).filter(media => media.url),
  }))
}

export const STORY_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']

export function validateStoryImage(file: Pick<File, 'size' | 'type'>): string | null {
  if (!STORY_IMAGE_TYPES.includes(file.type)) return 'Usa una imagen JPG, PNG, GIF o WebP.'
  if (file.size > 10 * 1024 * 1024) return 'La imagen debe pesar como máximo 10 MB.'
  return null
}

export function makeStoryPayload(content: string, style: StoryItem['style'], file?: File, event?: string) {
  if (!file) return { content: content.trim(), style, ...(event ? { event } : {}) }
  const data = new FormData()
  data.append('media', file)
  if (content.trim()) data.append('content', content.trim())
  if (style) data.append('style', JSON.stringify(style))
  if (event) data.append('event', event)
  return data
}
