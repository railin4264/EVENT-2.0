import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: string | Date, options?: Intl.DateTimeFormatOptions) {
  const defaultOptions: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "long",
    day: "numeric",
  }

  return new Intl.DateTimeFormat("en-US", { ...defaultOptions, ...options }).format(
    new Date(date)
  )
}

/**
 * Curated high-resolution fallback photography for events without an image
 */
export function getEventFallbackImage(category?: string, title?: string): string {
  const text = `${title || ''} ${category || ''}`.toLowerCase()
  if (text.includes('monster') || text.includes('camion') || text.includes('auto') || text.includes('racing') || text.includes('concesionario')) {
    return 'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?w=1200&q=80'
  }
  if (text.includes('jetski') || text.includes('jet ski') || text.includes('agua') || text.includes('surf') || text.includes('mar')) {
    return 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=1200&q=80'
  }
  if (text.includes('running') || text.includes('correr') || text.includes('5k') || text.includes('10k') || text.includes('carrera') || text.includes('maraton')) {
    return 'https://images.unsplash.com/photo-1452626038306-9aae5e071dd3?w=1200&q=80'
  }
  if (text.includes('bici') || text.includes('bicicleta') || text.includes('ciclismo')) {
    return 'https://images.unsplash.com/photo-1485965120184-e220f721d03e?w=1200&q=80'
  }
  if (text.includes('taller') || text.includes('workshop') || text.includes('carpinteria') || text.includes('ceramica')) {
    return 'https://images.unsplash.com/photo-1452860606245-08befc0ff44b?w=1200&q=80'
  }
  if (text.includes('tech') || text.includes('ia') || text.includes('hackathon') || text.includes('robot')) {
    return 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=1200&q=80'
  }
  if (text.includes('universidad') || text.includes('educacion') || text.includes('simposio')) {
    return 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=1200&q=80'
  }
  if (text.includes('solar') || text.includes('energialimpia') || text.includes('clima') || text.includes('verde')) {
    return 'https://images.unsplash.com/photo-1509391365360-2e959784a276?w=1200&q=80'
  }
  if (text.includes('scifi') || text.includes('cyberpunk')) {
    return 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1200&q=80'
  }
  if (text.includes('fantasma') || text.includes('misterio') || text.includes('leyenda')) {
    return 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=1200&q=80'
  }
  if (text.includes('ufo') || text.includes('ovni') || text.includes('astronomia')) {
    return 'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?w=1200&q=80'
  }
  if (text.includes('music') || text.includes('concierto')) {
    return 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=1200&q=80'
  }
  if (text.includes('food') || text.includes('comida') || text.includes('gastronomia')) {
    return 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=1200&q=80'
  }
  return 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=1200&q=80'
}

/**
 * Get full URL for image uploads
 * Converts relative paths like "uploads/..." to full backend URLs
 * or provides a genre-appropriate high-resolution fallback.
 */
export function getImageUrl(
  imageUrl: string | { url?: string } | undefined | null,
  category?: string,
  title?: string
): string {
  let url: string | undefined
  if (!imageUrl) url = undefined
  else if (typeof imageUrl === 'string') url = imageUrl
  else if (imageUrl && typeof imageUrl === 'object' && 'url' in imageUrl) url = (imageUrl as { url?: string }).url
  if (!url) return getEventFallbackImage(category, title)

  // If already a full URL (http:// or https://), return as is (replacing any retired Unsplash ID)
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url.replace('photo-1520523839898-5071216a7d33', 'photo-1511671782779-c97d3d27a1d4')
  }

  // Remove /api from NEXT_PUBLIC_API_URL if present
  const API_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api').replace('/api', '')

  // If starts with /uploads, it's a backend upload, prepend backend base URL
  if (url.startsWith('/uploads')) {
    return API_URL + url
  }

  // If starts with / but not /uploads, it's a local public path, return as is
  if (url.startsWith('/')) {
    return url
  }

  // Otherwise, it's a backend upload path without leading slash, prepend backend base URL
  return API_URL + "/" + url
}
