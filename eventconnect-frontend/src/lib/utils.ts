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
 * Get full URL for image uploads
 * Converts relative paths like "uploads/..." to full backend URLs
 */
export function getImageUrl(imageUrl: string | undefined | null): string {
  if (!imageUrl) return '/default-avatar.png'

  // If already a full URL (http:// or https://), return as is
  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
    return imageUrl
  }

  // Remove /api from NEXT_PUBLIC_API_URL if present
  const API_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api').replace('/api', '')

  // If starts with /uploads, it's a backend upload, prepend backend base URL
  if (imageUrl.startsWith('/uploads')) {
    return `${API_URL}${imageUrl}`
  }

  // If starts with / but not /uploads, it's a local public path, return as is
  if (imageUrl.startsWith('/')) {
    return imageUrl
  }

  // Otherwise, it's a backend upload path without leading slash, prepend backend base URL
  return `${API_URL}/${imageUrl}`
}
