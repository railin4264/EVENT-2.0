'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Share, Link, Facebook, Twitter, Mail, MessageCircle, Copy, Check } from 'lucide-react'
import type { Event } from '@/types/api.types'

interface ShareButtonProps {
  event: Event
  onShare?: (platform: string) => void
  variant?: 'icon' | 'button'
  className?: string
}

export default function ShareButton({ event, onShare, variant = 'icon', className = '' }: ShareButtonProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [copied, setCopied] = useState(false)

  const eventUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/events/${event._id}`
    : ''

  const shareOptions = [
    {
      name: 'Copiar link',
      icon: copied ? Check : Copy,
      color: 'bg-gray-600',
      action: async () => {
        try {
          await navigator.clipboard.writeText(eventUrl)
          setCopied(true)
          setTimeout(() => setCopied(false), 2000)
          onShare?.('copy')
        } catch (error) {
          console.error('Error copying to clipboard:', error)
        }
      }
    },
    {
      name: 'WhatsApp',
      icon: MessageCircle,
      color: 'bg-green-600',
      action: () => {
        const text = `¡Mira este evento! ${event.title} - ${eventUrl}`
        window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank')
        onShare?.('whatsapp')
      }
    },
    {
      name: 'Facebook',
      icon: Facebook,
      color: 'bg-blue-600',
      action: () => {
        window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(eventUrl)}`, '_blank')
        onShare?.('facebook')
      }
    },
    {
      name: 'Twitter',
      icon: Twitter,
      color: 'bg-sky-500',
      action: () => {
        const text = `¡Mira este evento! ${event.title}`
        window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(eventUrl)}`, '_blank')
        onShare?.('twitter')
      }
    },
    {
      name: 'Email',
      icon: Mail,
      color: 'bg-red-600',
      action: () => {
        const subject = `Te invito a: ${event.title}`
        const body = `Hola!\n\nTe invito a este evento:\n\n${event.title}\n${event.description}\n\nMás información: ${eventUrl}`
        window.open(`mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`)
        onShare?.('email')
      }
    }
  ]

  return (
    <div className="relative">
      {variant === 'icon' ? (
        <button
          onClick={(e) => {
            e.stopPropagation()
            setIsOpen(!isOpen)
          }}
          className={`p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${className}`}
          aria-label="Compartir evento"
        >
          <Share className="w-5 h-5" />
        </button>
      ) : (
        <button
          onClick={(e) => {
            e.stopPropagation()
            setIsOpen(!isOpen)
          }}
          className={`flex items-center gap-2 px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-xl font-medium transition-all hover:scale-105 active:scale-95 ${className}`}
        >
          <Share className="w-4 h-4" />
          Compartir
        </button>
      )}

      {/* Share Options Popup */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            />

            {/* Options Menu */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: -10 }}
              className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden z-50"
            >
              <div className="p-2">
                <div className="px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Compartir evento
                </div>

                {shareOptions.map((option, index) => {
                  const Icon = option.icon

                  return (
                    <motion.button
                      key={option.name}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      onClick={(e) => {
                        e.stopPropagation()
                        option.action()
                        if (option.name !== 'Copiar link') {
                          setIsOpen(false)
                        }
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-left group"
                    >
                      <div className={`p-2 ${option.color} rounded-lg group-hover:scale-110 transition-transform`}>
                        <Icon className="w-4 h-4 text-white" />
                      </div>
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        {option.name}
                      </span>
                      {option.name === 'Copiar link' && copied && (
                        <motion.span
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="ml-auto text-xs text-green-600 dark:text-green-400 font-semibold"
                        >
                          ¡Copiado!
                        </motion.span>
                      )}
                    </motion.button>
                  )
                })}
              </div>

              {/* Native Share (if supported) */}
              {typeof navigator !== 'undefined' && navigator.share && (
                <>
                  <div className="border-t border-gray-200 dark:border-gray-700 my-1" />
                  <div className="p-2">
                    <button
                      onClick={async (e) => {
                        e.stopPropagation()
                        try {
                          await navigator.share({
                            title: event.title,
                            text: event.description,
                            url: eventUrl
                          })
                          onShare?.('native')
                          setIsOpen(false)
                        } catch (error) {
                          // User cancelled or share failed
                        }
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-left"
                    >
                      <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg">
                        <Share className="w-4 h-4 text-white" />
                      </div>
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Más opciones
                      </span>
                    </button>
                  </div>
                </>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
