'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Share, Facebook, Twitter, Mail, MessageCircle, Copy, Check, X } from 'lucide-react'
import type { Event } from '@/types/api.types'
import { buildWhatsAppEventInvitation, publicEventShareUrl } from '@/lib/event-whatsapp-invite'

interface ShareButtonProps {
  event: Event
  onShare?: (platform: string) => void
  variant?: 'icon' | 'button'
  className?: string
}

export default function ShareButton({ event, onShare, variant = 'icon', className = '' }: ShareButtonProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const panel = useRef<HTMLDivElement>(null)
  const copyTimer = useRef<number | null>(null)
  const id = useId()
  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  const eventUrl = publicEventShareUrl(event, origin)
  const invitation = buildWhatsAppEventInvitation(event, origin, Date.now())
  const title = typeof event?.title === 'string' ? event.title : 'Evento en EventNow'
  const shareText = invitation?.text || `${event?.status === 'cancelled' ? 'Evento cancelado: ' : ''}${title}\n${eventUrl || ''}`

  useEffect(() => () => { if (copyTimer.current !== null) window.clearTimeout(copyTimer.current) }, [])
  useEffect(() => {
    if (isOpen) panel.current?.querySelector<HTMLElement>('button, a[href]')?.focus()
  }, [isOpen])
  useEffect(() => { setIsOpen(false); setError(null); setCopied(false) }, [event?._id, event?.isPrivate])
  const close = () => { setIsOpen(false); trigger.current?.focus() }
  const report = (platform: string) => { onShare?.(platform); close() }
  const copy = async () => {
    if (!eventUrl) return
    setError(null)
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable')
      await navigator.clipboard.writeText(eventUrl)
      setCopied(true)
      if (copyTimer.current !== null) window.clearTimeout(copyTimer.current)
      copyTimer.current = window.setTimeout(() => setCopied(false), 2000)
      onShare?.('copy')
    } catch { setError('No se pudo copiar. Puedes copiar el enlace público que aparece abajo.') }
  }
  const socialLinks = eventUrl ? [
    ...(invitation ? [{ name: 'Armar el coro en WhatsApp', icon: MessageCircle, href: invitation.href, platform: 'whatsapp' }] : []),
    { name: 'Facebook', icon: Facebook, href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(eventUrl)}`, platform: 'facebook' },
    { name: 'X / Twitter', icon: Twitter, href: `https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(eventUrl)}`, platform: 'twitter' },
    { name: 'Email', icon: Mail, href: `mailto:?subject=${encodeURIComponent(`Te comparto: ${title}`)}&body=${encodeURIComponent(shareText)}`, platform: 'email' },
  ] : []
  const optionClass = 'flex min-h-11 w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary'

  return <div className="relative" onClick={event => event.stopPropagation()}>
    <button ref={trigger} type="button" disabled={!eventUrl} onClick={() => { setError(null); setIsOpen(value => !value) }}
      aria-label="Compartir evento" aria-expanded={isOpen} aria-controls={id}
      title={!eventUrl ? 'Compartir solo está disponible para eventos públicos publicados' : 'Compartir evento'}
      className={`${variant === 'icon' ? 'p-2 rounded-full hover:bg-muted' : 'flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90'} transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-40 disabled:cursor-not-allowed ${className}`}>
      <Share className="h-5 w-5" aria-hidden="true" />{variant === 'button' && 'Compartir'}
    </button>
    <AnimatePresence>{isOpen && eventUrl && <>
      <div className="fixed inset-0 z-[90]" onClick={close} aria-hidden="true" />
      <motion.div id={id} ref={panel} role="dialog" aria-label="Compartir evento público"
        onKeyDown={event => { if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); close() } }}
        initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
        className="absolute right-0 z-[100] mt-2 max-h-[65dvh] w-72 max-w-[calc(100vw-2rem)] overflow-y-auto rounded-2xl border border-border bg-card p-2 shadow-xl">
        <div className="flex items-center justify-between gap-2 px-3 py-1"><h3 className="text-xs font-semibold text-muted-foreground">Compartir evento público</h3><button type="button" aria-label="Cerrar opciones de compartir" onClick={close} className="rounded-lg p-2 hover:bg-muted focus-visible:ring-2 focus-visible:ring-primary"><X className="h-4 w-4" /></button></div>
        <button type="button" onClick={() => { void copy() }} className={optionClass}>{copied ? <Check className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4 text-muted-foreground" />}<span aria-live="polite">{copied ? 'Enlace copiado' : 'Copiar enlace'}</span></button>
        {socialLinks.map(option => <a key={option.platform} href={option.href} target="_blank" rel="noopener noreferrer" onClick={() => report(option.platform)} className={optionClass}><option.icon className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" /><span>{option.name}</span></a>)}
        {typeof navigator !== 'undefined' && typeof navigator.share === 'function' && <button type="button" className={optionClass} onClick={async () => {
          setError(null)
          try { await navigator.share({ title, text: shareText, url: eventUrl }); report('native') }
          catch (cause) { if (!(cause && typeof cause === 'object' && 'name' in cause && cause.name === 'AbortError')) setError('No se pudo abrir el menú para compartir. Prueba copiar el enlace.') }
        }}><Share className="h-4 w-4 text-muted-foreground" aria-hidden="true" />Más opciones</button>}
        {invitation && <p className="px-3 py-2 text-xs leading-relaxed text-muted-foreground">Se abre un borrador para que elijas con quién compartirlo. No se envía automáticamente.</p>}
        {error && <div role="alert" className="m-2 rounded-xl border border-destructive/30 p-3 text-xs"><p>{error}</p><p className="mt-2 select-all break-all text-muted-foreground">{eventUrl}</p></div>}
      </motion.div>
    </>}</AnimatePresence>
  </div>
}
