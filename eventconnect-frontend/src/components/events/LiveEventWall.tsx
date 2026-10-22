'use client'

import React, { useState, useEffect, useRef } from 'react'
import { MessageSquare, Send, Sparkles, Image as ImageIcon, Flame, Users, Heart } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { useLocaleStore } from '@/stores/localeStore'
import { toast } from 'sonner'

interface WallPost {
  id: string
  authorName: string
  authorAvatar?: string
  content: string
  timestamp: string
  likes: number
  isStaff?: boolean
}

interface LiveEventWallProps {
  eventId: string
  eventTitle: string
  isAttendee?: boolean
}

export default function LiveEventWall({
  eventId,
  eventTitle,
  isAttendee = true
}: LiveEventWallProps) {
  const { user, isAuthenticated } = useAuthStore()
  const { config } = useLocaleStore()
  const [messages, setMessages] = useState<WallPost[]>([
    {
      id: 'm-1',
      authorName: 'Carlos M.',
      content: '¡La tarima se ve increíble desde la zona derecha! El sonido está 10/10.',
      timestamp: 'Hace 5 min',
      likes: 12
    },
    {
      id: 'm-2',
      authorName: 'Producción Oficial',
      content: '🚨 Recordatorio: El área de comida cuenta con opciones vegetarianas y sin gluten.',
      timestamp: 'Hace 18 min',
      likes: 34,
      isStaff: true
    },
    {
      id: 'm-3',
      authorName: 'Stephanie L.',
      content: '¿Quién anda por aquí de la tribu de Diseño? Estamos cerca del bar principal.',
      timestamp: 'Hace 26 min',
      likes: 8
    }
  ])

  const [inputContent, setInputContent] = useState('')
  const [activeUsersCount, setActiveUsersCount] = useState(48)
  const scrollRef = useRef<HTMLDivElement>(null)

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputContent.trim()) return

    if (!isAuthenticated) {
      toast.error('Inicia sesión para participar en el muro en vivo')
      return
    }

    const newMsg: WallPost = {
      id: `m-${Date.now()}`,
      authorName: `${user?.firstName || 'Usuario'} ${user?.lastName?.[0] ? user.lastName[0] + '.' : ''}`,
      content: inputContent.trim(),
      timestamp: 'Ahora mismo',
      likes: 0
    }

    setMessages(prev => [newMsg, ...prev])
    setInputContent('')
    toast.success('Mensaje publicado en el muro')
  }

  const handleLike = (id: string) => {
    setMessages(prev => prev.map(m => m.id === id ? { ...m, likes: m.likes + 1 } : m))
  }

  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl shadow-xl space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 pb-3 border-b border-white/10">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-violet-500/20 text-violet-400 flex items-center justify-center">
            <MessageSquare className="h-4 w-4" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
              <span>Muro en Vivo del Evento</span>
              <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                EN VIVO
              </span>
            </h3>
            <p className="text-xs text-muted-foreground">
              Comentarios efímeros de asistentes en tiempo real
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 text-xs text-muted-foreground bg-white/5 px-2.5 py-1 rounded-full border border-white/10">
          <Users className="h-3.5 w-3.5 text-violet-400" />
          <span className="font-semibold text-foreground">{activeUsersCount}</span>
          <span className="text-[11px] hidden sm:inline">en el {config.terms.hangout.toLowerCase()}</span>
        </div>
      </div>

      {/* Input Field */}
      <form onSubmit={handleSendMessage} className="flex gap-2">
        <input
          type="text"
          value={inputContent}
          onChange={(e) => setInputContent(e.target.value)}
          placeholder={`Comparte algo con el ${config.terms.hangout.toLowerCase()} en vivo...`}
          maxLength={280}
          className="flex-1 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-violet-500 transition"
        />
        <button
          type="submit"
          disabled={!inputContent.trim()}
          className="px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-1.5 transition shadow-md shadow-violet-600/30"
        >
          <Send className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Publicar</span>
        </button>
      </form>

      {/* Messages Feed */}
      <div ref={scrollRef} className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`p-3 rounded-2xl border transition-all ${
              msg.isStaff
                ? 'bg-violet-950/30 border-violet-500/30'
                : 'bg-white/5 border-white/5 hover:border-white/15'
            }`}
          >
            <div className="flex items-center justify-between gap-2 mb-1">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-foreground">
                  {msg.authorName}
                </span>
                {msg.isStaff && (
                  <span className="text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded-md bg-violet-500/20 text-violet-300 border border-violet-500/40">
                    Staff Oficial
                  </span>
                )}
              </div>
              <span className="text-[10px] text-muted-foreground font-mono">
                {msg.timestamp}
              </span>
            </div>

            <p className="text-xs text-gray-200 leading-relaxed">
              {msg.content}
            </p>

            <div className="mt-2 flex items-center justify-end">
              <button
                type="button"
                onClick={() => handleLike(msg.id)}
                className="flex items-center gap-1 text-[11px] text-gray-400 hover:text-rose-400 transition"
              >
                <Heart className={`h-3 w-3 ${msg.likes > 0 ? 'fill-rose-500 text-rose-500' : ''}`} />
                <span>{msg.likes}</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
