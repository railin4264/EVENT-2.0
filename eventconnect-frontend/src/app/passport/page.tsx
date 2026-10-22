'use client'

import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import {
  Compass,
  Award,
  Sparkles,
  Lock,
  CheckCircle2,
  Gift,
  ArrowLeft,
  Music,
  Code,
  Users,
  ShieldCheck,
  Coffee,
  Ticket
} from 'lucide-react'
import { apiClient } from '@/lib/api/client'
import { useAuthStore } from '@/stores/authStore'
import { Button } from '@/components/redesign/ui/button'

const ICON_MAP: Record<string, any> = {
  Music,
  Compass,
  Sparkles,
  Lock,
  Code,
  Users
}

export default function PassportPage() {
  const { isAuthenticated, user } = useAuthStore()

  const { data: passport, isLoading, error, refetch } = useQuery({
    queryKey: ['cultural-passport', user?._id || user?.id],
    queryFn: async () => {
      const res = await apiClient.get('/gamification/passport')
      if (!res.data?.data) throw new Error('El pasaporte no está disponible.')
      return res.data.data
    },
    enabled: isAuthenticated
  })

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-4 text-center text-white">
        <div className="w-16 h-16 rounded-3xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mb-4">
          <Award className="w-8 h-8" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-black mb-2">Pasaporte Cultural Dominicano</h1>
        <p className="text-gray-400 text-sm max-w-sm mb-6">
          Inicia sesión para registrar tus sellos de asistencia y desbloquear recompensas en negocios locales de RD.
        </p>
        <Button asChild className="rounded-2xl h-11 px-6 bg-primary font-bold">
          <Link href="/login?redirect=%2Fpassport">Iniciar Sesión</Link>
        </Button>
      </div>
    )
  }

  if (isLoading || error) {
    return <main className="min-h-screen bg-gray-950 p-8 text-white"><div className="mx-auto max-w-xl py-12">
      <Link href="/" className="text-sm text-gray-400 underline">Volver al inicio</Link>
      {isLoading ? <p role="status" className="mt-6">Cargando tu pasaporte…</p> : <div role="alert" className="mt-6 space-y-4">
        <h1 className="text-2xl font-bold">No pudimos cargar tu pasaporte</h1>
        <p className="text-gray-400">Tus sellos siguen guardados. Puedes volver a intentarlo.</p>
        <Button onClick={() => void refetch()}>Reintentar</Button>
      </div>}
    </div></main>
  }

  const stamps = passport?.stamps || []
  const perks = passport?.perks || []

  return (
    <div className="min-h-screen bg-gray-950 text-white pb-20">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-gray-950/90 backdrop-blur border-b border-white/10 py-3.5 px-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white">
            <ArrowLeft className="w-4 h-4" />
            <span>Inicio</span>
          </Link>
          <span className="text-xs font-bold text-amber-400 uppercase tracking-widest flex items-center gap-1.5">
            <span>🇩🇴</span> Pasaporte Oficial
          </span>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 pt-6 space-y-8">
        {/* Passport Booklet Card */}
        <div className="relative rounded-[32px] border-2 border-amber-500/40 bg-gradient-to-br from-[#1c142b] via-[#120d20] to-[#0a0714] p-6 sm:p-10 shadow-2xl overflow-hidden">
          {/* Gold Decorative Corner Seals */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl pointer-events-none" />

          {/* Top Emblem */}
          <div className="flex flex-wrap items-start justify-between gap-4 pb-6 border-b border-amber-500/20">
            <div>
              <p className="text-[10px] tracking-[0.25em] uppercase text-amber-400/80 font-mono font-bold mb-1">
                REPÚBLICA DOMINICANA · EVENTNOW
              </p>
              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                Pasaporte de Experiencias
              </h1>
              <p className="text-xs text-amber-200/60 mt-0.5">
                Registro de actividades auténticas, sellos de explorador y privilegios culturales
              </p>
            </div>

            <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-right">
              <span className="text-[10px] text-amber-400/70 font-mono block">DOCUMENTO NO.</span>
              <span className="text-sm font-mono font-bold text-amber-300">
                {passport?.passportNumber || 'RD-EN-000000'}
              </span>
            </div>
          </div>

          {/* User Details & Tier */}
          <div className="py-6 flex flex-wrap items-center justify-between gap-6 border-b border-amber-500/20">
            <div>
              <span className="text-[11px] text-gray-400 block">TITULAR DEL PASAPORTE</span>
              <span className="text-lg font-bold text-white">
                {passport?.holderName || user?.firstName || 'Explorador Cultural'}
              </span>
            </div>

            <div>
              <span className="text-[11px] text-gray-400 block">RANGO DE CIUDADANÍA</span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-500/20 text-amber-300 text-xs font-black">
                <ShieldCheck className="w-3.5 h-3.5" />
                {passport?.tier || 'Turista Novato'}
              </span>
            </div>

            <div>
              <span className="text-[11px] text-gray-400 block">SELLOS DESBLOQUEADOS</span>
              <span className="text-lg font-black text-amber-400">
                {passport?.unlockedCount || 0} / {passport?.totalStamps || 6}
              </span>
            </div>
          </div>

          {/* Stamp Grid */}
          <div className="pt-6">
            <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-amber-300 mb-4">
              Sellos Coleccionables de la Ciudad:
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
              {stamps.map((stamp: any) => {
                const Icon = ICON_MAP[stamp.icon] || Compass
                const isUnlocked = stamp.unlocked

                return (
                  <div
                    key={stamp.id}
                    className={`relative rounded-2xl p-4 border transition-all ${
                      isUnlocked
                        ? 'bg-amber-500/10 border-amber-500/40 shadow-lg shadow-amber-500/5'
                        : 'bg-white/5 border-white/5 opacity-60'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className={`p-2.5 rounded-xl ${isUnlocked ? 'bg-amber-500/20 text-amber-300' : 'bg-white/5 text-gray-400'}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      {isUnlocked ? (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold">
                          Sellado
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full bg-white/10 text-gray-400 text-[10px] font-bold">
                          Por descubrir
                        </span>
                      )}
                    </div>

                    <h3 className="text-sm font-bold text-white mb-0.5">{stamp.title}</h3>
                    <p className="text-[11px] text-gray-400 leading-snug">{stamp.description}</p>
                    <span className="mt-2 text-[10px] font-mono text-amber-400/80 block">
                      Zona: {stamp.zone}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Sponsor Perks Section */}
        <div className="rounded-3xl border border-white/10 bg-card p-6 sm:p-8 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold mb-1">
                <Gift className="w-3.5 h-3.5" />
                <span>Recompensas en Negocios Locales</span>
              </div>
              <h2 className="text-xl font-bold text-white">Privilegios de tu Pasaporte</h2>
              <p className="text-xs text-gray-400">
                Muestra tu Pasaporte EventNow en estos locales para canjear tus beneficios de cortesía.
              </p>
            </div>
          </div>

          <div className="grid sm:grid-cols-3 gap-3.5 pt-2">
            {perks.map((perk: any) => (
              <div
                key={perk.id}
                className="p-4 rounded-2xl bg-white/5 border border-white/5 space-y-2 flex flex-col justify-between"
              >
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
                    {perk.partner}
                  </span>
                  <h4 className="text-sm font-bold text-white mt-0.5">{perk.offer}</h4>
                  <p className="text-[11px] text-gray-400 mt-1">
                    Requiere {perk.requiredStamps} sellos en tu pasaporte
                  </p>
                </div>

                <div className="pt-2 border-t border-white/5">
                  {perk.isEligible ? (
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-400">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Disponible para canje
                    </span>
                  ) : (
                    <span className="text-[11px] text-gray-500">
                      Faltan sellos para desbloquear
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}
