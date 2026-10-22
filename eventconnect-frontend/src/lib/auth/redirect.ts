/** Only accept same-origin application paths after authentication. */
export function safeRedirect(value: string | null | undefined, fallback = '/events'): string {
  if (!value || !value.startsWith('/') || value.startsWith('//') || /[\\\u0000-\u001f]/.test(value)) return fallback
  try {
    const url = new URL(value, 'https://eventnow.local')
    if (url.origin !== 'https://eventnow.local' || /^\/(login|register)\/?$/.test(url.pathname)) return fallback
    return `${url.pathname}${url.search}${url.hash}`
  } catch {
    return fallback
  }
}

/** Preserve the user's intended event when switching authentication screens. */
export function authPageHref(page: '/login' | '/register', destination?: string | null): string {
  return `${page}?redirect=${encodeURIComponent(safeRedirect(destination))}`
}

/** Guest exploration must never lead back through an authentication wall. */
export function publicExploreHref(value?: string | null): string {
  const destination = safeRedirect(value)
  const url = new URL(destination, 'https://eventnow.local')
  const path = url.pathname.replace(/\/$/, '') || '/'
  const publicPage = ['/', '/events', '/discovery', '/terms', '/privacy'].includes(path)
  const eventDetail = /^\/events\/[a-z0-9_-]+$/i.test(path) && !['create', 'edit', 'check-in'].includes(path.split('/')[2].toLowerCase())
  return publicPage || eventDetail ? destination : '/events'
}
