'use client'

import { useEffect, useRef, useState } from 'react'
import { Camera } from 'lucide-react'
import { apiClient } from '@/lib/api/client'
import { useAuthStore } from '@/stores/authStore'

export function PrivateMemoryImage({ path, alt, className }: { path: string; alt: string; className?: string }) {
  const { isAuthenticated, user } = useAuthStore()
  const identity = user?.id || user?._id
  const viewport = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)
  const validPath = /^\/events\/[a-f\d]{24}\/memories\/[a-f\d]{24}\/image$/i.test(path)
  const [image, setImage] = useState<{ url: string; identity: string; path: string } | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    if (!viewport.current) return
    if (typeof IntersectionObserver === 'undefined') { setVisible(true); return }
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) { setVisible(true); observer.disconnect() }
    }, { rootMargin: '200px' })
    observer.observe(viewport.current)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!visible || !isAuthenticated || !identity || !validPath) return
    const controller = new AbortController()
    let objectUrl = ''
    let active = true
    setFailed(false)
    apiClient.get<Blob>(path, { responseType: 'blob', signal: controller.signal,
      headers: { 'Cache-Control': 'no-store' } }).then(response => {
      if (!active) return
      objectUrl = URL.createObjectURL(response.data)
      setImage({ url: objectUrl, identity, path })
    }).catch(() => { if (active) setFailed(true) })
    return () => {
      active = false
      controller.abort()
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [path, identity, isAuthenticated, visible, validPath])

  let content
  if (!isAuthenticated || !identity || !validPath || failed) {
    content = <div className="flex h-full min-h-28 w-full flex-col items-center justify-center gap-2 p-4 text-center text-xs text-muted-foreground" role="img" aria-label="Foto no disponible">
      <Camera className="h-6 w-6" />
      <span>{!path ? 'Esta foto necesita volver a subirse al álbum privado.' : 'No se pudo cargar la foto privada.'}</span>
    </div>
  } else if (!image || image.identity !== identity || image.path !== path) {
    content = <div className="h-full min-h-28 w-full animate-pulse bg-white/5" aria-label="Cargando foto privada" />
  } else content = <img src={image.url} alt={alt} className={className} />
  return <div ref={viewport} className="flex h-full w-full items-center justify-center">{content}</div>
}
