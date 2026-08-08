'use client'

import { motion, useScroll, useTransform } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/stores/authStore'
import { Calendar, Users, Heart, Star, ArrowRight, TrendingUp, Shield, Zap, MapPin, Music, Ticket, MessageCircle, Globe, Sparkles, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'

// ─── Variants ─────────────────────────────────────────────────────────────────

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] }
  })
}

const fadeIn = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.5 } }
}

// ─── Data ──────────────────────────────────────────────────────────────────────

const features = [
  {
    icon: Sparkles,
    title: 'Descubre',
    description: 'Eventos exclusivos curados por IA para tu perfil y ubicación.',
    gradient: 'from-violet-500/20 to-purple-500/10',
    iconBg: 'bg-violet-500/15 text-violet-500',
    size: 'lg',
  },
  {
    icon: Users,
    title: 'Tribus',
    description: 'Comunidades reales de personas que comparten tu vibra.',
    gradient: 'from-sky-500/20 to-blue-500/10',
    iconBg: 'bg-sky-500/15 text-sky-500',
    size: 'sm',
  },
  {
    icon: Ticket,
    title: 'Tickets',
    description: 'Compra, vende y transfiere en segundos.',
    gradient: 'from-emerald-500/20 to-teal-500/10',
    iconBg: 'bg-emerald-500/15 text-emerald-500',
    size: 'sm',
  },
  {
    icon: MessageCircle,
    title: 'Chat en vivo',
    description: 'Conecta con asistentes antes, durante y después del evento.',
    gradient: 'from-pink-500/20 to-rose-500/10',
    iconBg: 'bg-pink-500/15 text-pink-500',
    size: 'md',
  },
  {
    icon: MapPin,
    title: 'Mapa',
    description: 'Explora qué pasa cerca de ti en tiempo real.',
    gradient: 'from-amber-500/20 to-orange-500/10',
    iconBg: 'bg-amber-500/15 text-amber-500',
    size: 'md',
  },
]

const stats = [
  { number: '10K+', label: 'Eventos activos', icon: Calendar },
  { number: '50K+', label: 'Comunidad', icon: Users },
  { number: '100+', label: 'Ciudades', icon: Globe },
  { number: '4.9★', label: 'Calificación', icon: Star },
]

const benefits = [
  {
    icon: Shield,
    title: 'Seguridad primero',
    text: 'Verificación de identidad y pagos cifrados en cada transacción.',
  },
  {
    icon: Zap,
    title: 'Tiempo real',
    text: 'Notificaciones push, chat en vivo y actualizaciones al instante.',
  },
  {
    icon: TrendingUp,
    title: 'Herramientas virales',
    text: 'Gamificación, referidos y analytics para crecer tu comunidad.',
  },
]

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function HomePage() {
  const router = useRouter()
  const { isAuthenticated, initializeAuth } = useAuthStore()
  const containerRef = useRef<HTMLDivElement>(null)

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end end'],
  })
  const heroOpacity = useTransform(scrollYProgress, [0, 0.2], [1, 0])
  const heroY = useTransform(scrollYProgress, [0, 0.2], ['0%', '-8%'])

  useEffect(() => { initializeAuth() }, [initializeAuth])

  useEffect(() => {
    if (isAuthenticated) router.push('/feed')
  }, [isAuthenticated, router])

  if (isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-[3px] border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Redirigiendo…</p>
        </div>
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className="min-h-screen bg-white dark:bg-gray-950 overflow-x-hidden"
    >

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <section className="relative min-h-[92vh] flex items-center justify-center overflow-hidden">

        {/* Ambient blobs */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
          <div className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full bg-emerald-400/10 dark:bg-emerald-500/8 blur-[120px]" />
          <div className="absolute -bottom-40 -right-20 w-[500px] h-[500px] rounded-full bg-violet-400/10 dark:bg-violet-500/8 blur-[120px]" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-teal-400/5 dark:bg-teal-500/5 blur-[160px]" />
        </div>

        {/* Dot grid */}
        <div
          className="absolute inset-0 opacity-[0.03] dark:opacity-[0.04]"
          style={{
            backgroundImage: 'radial-gradient(circle, currentColor 1px, transparent 1px)',
            backgroundSize: '32px 32px',
          }}
          aria-hidden="true"
        />

        <motion.div
          style={{ opacity: heroOpacity, y: heroY }}
          className="relative z-10 w-full max-w-5xl mx-auto px-4 sm:px-6 text-center"
        >
          {/* Badge */}
          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            custom={0}
            className="inline-flex items-center gap-2 px-4 py-1.5 mb-8 rounded-full bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200/60 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-sm font-medium"
          >
            <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
            La evolución de los eventos sociales
          </motion.div>

          {/* Headline */}
          <motion.h1
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            custom={1}
            className="text-5xl sm:text-7xl md:text-8xl font-extrabold tracking-tight leading-[1.05] mb-6 text-gray-900 dark:text-white"
          >
            Vive el{' '}
            <span className="relative inline-block">
              <span className="relative z-10 text-transparent bg-clip-text bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-500">
                Momento
              </span>
              <motion.span
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ delay: 0.7, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                style={{ originX: 0 }}
                className="absolute -bottom-1 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-full"
                aria-hidden="true"
              />
            </span>
          </motion.h1>

          {/* Sub */}
          <motion.p
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            custom={2}
            className="text-lg sm:text-xl md:text-2xl text-gray-500 dark:text-gray-400 mb-12 max-w-2xl mx-auto leading-relaxed"
          >
            Más que una plataforma de eventos. Una red social diseñada para
            conectar personas a través de experiencias reales.
          </motion.p>

          {/* CTAs */}
          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            custom={3}
            className="flex flex-col sm:flex-row gap-4 justify-center items-center"
          >
            <Link href="/register">
              <motion.span
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                className="group inline-flex items-center gap-2 px-8 py-4 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-2xl font-bold text-base shadow-xl shadow-black/10 hover:shadow-black/20 transition-shadow cursor-pointer"
              >
                Empezar gratis
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
              </motion.span>
            </Link>

            <Link href="/events">
              <motion.span
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl font-semibold text-base border border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors cursor-pointer"
              >
                <Globe className="w-4 h-4" aria-hidden="true" />
                Explorar eventos
              </motion.span>
            </Link>
          </motion.div>

          {/* Social proof row */}
          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            custom={4}
            className="mt-14 flex flex-wrap items-center justify-center gap-6 text-sm text-gray-400 dark:text-gray-500"
          >
            <AvatarGroup />
            <span className="h-4 w-px bg-gray-200 dark:bg-white/10 hidden sm:block" aria-hidden="true" />
            <span className="font-medium text-gray-600 dark:text-gray-400">
              +50,000 personas ya conectadas
            </span>
            <span className="h-4 w-px bg-gray-200 dark:bg-white/10 hidden sm:block" aria-hidden="true" />
            <div className="flex items-center gap-1 text-amber-500">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-3.5 h-3.5 fill-current" aria-hidden="true" />
              ))}
              <span className="text-gray-500 dark:text-gray-400 ml-1 text-xs">4.9 / 5</span>
            </div>
          </motion.div>
        </motion.div>

        {/* Scroll indicator */}
        <motion.div
          style={{ opacity: heroOpacity }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
          aria-hidden="true"
        >
          <div className="w-5 h-8 border-2 border-gray-300 dark:border-white/20 rounded-full flex justify-center pt-1.5">
            <motion.div
              animate={{ y: [0, 10, 0] }}
              transition={{ repeat: Infinity, duration: 1.6, ease: 'easeInOut' }}
              className="w-1 h-1 rounded-full bg-gray-400 dark:bg-gray-500"
            />
          </div>
        </motion.div>
      </section>

      {/* ── Stats ─────────────────────────────────────────────────────────── */}
      <section aria-label="Estadísticas" className="py-16 border-y border-gray-100 dark:border-white/5 bg-gray-50/60 dark:bg-white/[0.02]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <ul className="grid grid-cols-2 md:grid-cols-4 gap-8" role="list">
            {stats.map((stat, i) => (
              <motion.li
                key={i}
                role="listitem"
                variants={fadeUp}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                custom={i}
                className="flex flex-col items-center text-center gap-1"
              >
                <stat.icon className="w-5 h-5 text-emerald-500 mb-1" aria-hidden="true" />
                <span className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">
                  {stat.number}
                </span>
                <span className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                  {stat.label}
                </span>
              </motion.li>
            ))}
          </ul>
        </div>
      </section>

      {/* ── Bento Features ────────────────────────────────────────────────── */}
      <section aria-labelledby="features-heading" className="py-24 md:py-32">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 id="features-heading" className="text-3xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4 tracking-tight">
              Todo lo que necesitas
            </h2>
            <p className="text-lg text-gray-500 dark:text-gray-400 max-w-xl mx-auto">
              Herramientas pensadas para organizadores, asistentes y comunidades.
            </p>
          </motion.div>

          {/* Bento grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 auto-rows-[minmax(160px,auto)]">
            {/* Big card */}
            <motion.article
              variants={fadeUp}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              custom={0}
              className={cn(
                'md:col-span-2 md:row-span-2 p-8 rounded-3xl relative overflow-hidden group cursor-default',
                'bg-gradient-to-br from-violet-50 to-purple-50/50 dark:from-violet-500/10 dark:to-purple-500/5',
                'border border-violet-100/80 dark:border-violet-500/15'
              )}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-violet-400/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" aria-hidden="true" />
              <div className="relative z-10 h-full flex flex-col">
                <div className="w-14 h-14 rounded-2xl bg-violet-500/15 text-violet-500 flex items-center justify-center mb-auto">
                  <Sparkles className="w-7 h-7" aria-hidden="true" />
                </div>
                <div className="mt-8">
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">Descubre eventos</h3>
                  <p className="text-gray-500 dark:text-gray-400 text-base leading-relaxed max-w-sm">
                    IA que aprende de tus gustos para recomendarte lo que realmente te importa — conciertos, arte, deporte y más, a metros de ti.
                  </p>
                  <Link
                    href="/events"
                    className="inline-flex items-center gap-1.5 mt-6 text-sm font-semibold text-violet-600 dark:text-violet-400 hover:gap-2.5 transition-all"
                  >
                    Explorar ahora <ChevronRight className="w-4 h-4" aria-hidden="true" />
                  </Link>
                </div>
              </div>
            </motion.article>

            {/* Small cards */}
            {[
              {
                icon: Users,
                title: 'Tribus',
                desc: 'Comunidades reales que comparten tu vibra.',
                bg: 'from-sky-50 to-blue-50/50 dark:from-sky-500/10 dark:to-blue-500/5',
                border: 'border-sky-100/80 dark:border-sky-500/15',
                iconBg: 'bg-sky-500/15 text-sky-500',
                hover: 'from-sky-400/5',
              },
              {
                icon: Ticket,
                title: 'Tickets',
                desc: 'Compra y transfiere en segundos.',
                bg: 'from-emerald-50 to-teal-50/50 dark:from-emerald-500/10 dark:to-teal-500/5',
                border: 'border-emerald-100/80 dark:border-emerald-500/15',
                iconBg: 'bg-emerald-500/15 text-emerald-500',
                hover: 'from-emerald-400/5',
              },
              {
                icon: MessageCircle,
                title: 'Chat en vivo',
                desc: 'Conecta antes, durante y después del evento.',
                bg: 'from-pink-50 to-rose-50/50 dark:from-pink-500/10 dark:to-rose-500/5',
                border: 'border-pink-100/80 dark:border-pink-500/15',
                iconBg: 'bg-pink-500/15 text-pink-500',
                hover: 'from-pink-400/5',
              },
              {
                icon: MapPin,
                title: 'Mapa',
                desc: 'Explora qué pasa cerca de ti ahora mismo.',
                bg: 'from-amber-50 to-orange-50/50 dark:from-amber-500/10 dark:to-orange-500/5',
                border: 'border-amber-100/80 dark:border-amber-500/15',
                iconBg: 'bg-amber-500/15 text-amber-500',
                hover: 'from-amber-400/5',
              },
            ].map((card, i) => (
              <motion.article
                key={card.title}
                variants={fadeUp}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                custom={i + 1}
                className={cn(
                  'p-6 rounded-3xl relative overflow-hidden group cursor-default',
                  `bg-gradient-to-br ${card.bg}`,
                  `border ${card.border}`
                )}
              >
                <div className={cn('absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity duration-500', `${card.hover} to-transparent`)} aria-hidden="true" />
                <div className="relative z-10">
                  <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center mb-4', card.iconBg)}>
                    <card.icon className="w-5 h-5" aria-hidden="true" />
                  </div>
                  <h3 className="text-base font-bold text-gray-900 dark:text-white mb-1.5">{card.title}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">{card.desc}</p>
                </div>
              </motion.article>
            ))}
          </div>
        </div>
      </section>

      {/* ── Benefits / Trust ──────────────────────────────────────────────── */}
      <section aria-labelledby="benefits-heading" className="py-24 md:py-32 bg-gray-50/60 dark:bg-white/[0.02] border-y border-gray-100 dark:border-white/5">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">

            {/* Left: copy */}
            <motion.div
              variants={fadeUp}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
            >
              <h2 id="benefits-heading" className="text-3xl md:text-5xl font-bold tracking-tight text-gray-900 dark:text-white mb-4 leading-tight">
                La plataforma que<br />
                <span className="text-emerald-500">tu comunidad</span> merece
              </h2>
              <p className="text-gray-500 dark:text-gray-400 mb-10 text-base leading-relaxed">
                Construida con los mejores estándares de seguridad, velocidad y experiencia de usuario.
              </p>

              <ul className="space-y-5" role="list">
                {benefits.map((b, i) => (
                  <motion.li
                    key={i}
                    role="listitem"
                    variants={fadeUp}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true }}
                    custom={i}
                    className="flex items-start gap-4"
                  >
                    <div className="shrink-0 w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                      <b.icon className="w-5 h-5" aria-hidden="true" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white mb-0.5">{b.title}</h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">{b.text}</p>
                    </div>
                  </motion.li>
                ))}
              </ul>
            </motion.div>

            {/* Right: visual mockup */}
            <motion.div
              variants={fadeIn}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              className="relative"
              aria-hidden="true"
            >
              {/* Glow */}
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-400/20 via-teal-400/10 to-violet-400/20 blur-[60px] rounded-3xl" />

              {/* Card shell */}
              <div className="relative bg-white dark:bg-gray-900 border border-gray-200/70 dark:border-white/8 rounded-3xl shadow-2xl shadow-black/5 dark:shadow-black/30 overflow-hidden">
                {/* Fake top bar */}
                <div className="flex items-center gap-2 px-5 py-3 border-b border-gray-100 dark:border-white/5">
                  <div className="flex gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
                    <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                  </div>
                  <div className="flex-1 h-5 bg-gray-100 dark:bg-white/5 rounded-md mx-4" />
                </div>

                {/* Content skeleton */}
                <div className="p-5 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-400/20 shrink-0" />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-3 w-2/3 bg-gray-100 dark:bg-white/8 rounded" />
                      <div className="h-2.5 w-1/3 bg-gray-100 dark:bg-white/5 rounded" />
                    </div>
                  </div>

                  <div className="h-36 bg-gradient-to-br from-emerald-400/15 to-teal-400/10 rounded-2xl relative overflow-hidden">
                    <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between">
                      <div className="space-y-1">
                        <div className="h-2.5 w-28 bg-white/40 dark:bg-white/20 rounded" />
                        <div className="h-2 w-16 bg-white/30 dark:bg-white/15 rounded" />
                      </div>
                      <div className="w-8 h-8 rounded-full bg-emerald-500/80 flex items-center justify-center">
                        <Heart className="w-4 h-4 text-white fill-current" />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    {[...Array(3)].map((_, j) => (
                      <div key={j} className="h-16 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5" />
                    ))}
                  </div>

                  <div className="flex items-center gap-3 p-3 bg-emerald-50 dark:bg-emerald-500/8 rounded-2xl border border-emerald-100 dark:border-emerald-500/15">
                    <div className="w-8 h-8 rounded-full bg-emerald-400/30 shrink-0" />
                    <div className="flex-1 space-y-1">
                      <div className="h-2.5 w-1/2 bg-emerald-200 dark:bg-emerald-500/20 rounded" />
                      <div className="h-2 w-1/3 bg-emerald-100 dark:bg-emerald-500/10 rounded" />
                    </div>
                    <div className="w-6 h-6 rounded-lg bg-emerald-500 shrink-0 flex items-center justify-center">
                      <ArrowRight className="w-3 h-3 text-white" />
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── How it works ──────────────────────────────────────────────────── */}
      <section aria-labelledby="how-heading" className="py-24 md:py-32">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="mb-16"
          >
            <h2 id="how-heading" className="text-3xl md:text-5xl font-bold tracking-tight text-gray-900 dark:text-white mb-4">
              Tan fácil como 1, 2, 3
            </h2>
            <p className="text-gray-500 dark:text-gray-400 text-base">
              Empieza en menos de 2 minutos, sin tarjeta de crédito.
            </p>
          </motion.div>

          <ol className="grid grid-cols-1 md:grid-cols-3 gap-8 text-left" role="list">
            {[
              { step: '01', title: 'Crea tu cuenta', desc: 'Regístrate con email o continúa con Google. Tu perfil listo en segundos.' },
              { step: '02', title: 'Descubre tu escena', desc: 'Dinos qué te gusta y nuestra IA te muestra eventos que valen la pena.' },
              { step: '03', title: 'Vive el momento', desc: 'Conecta, asiste y crea recuerdos con tu comunidad.' },
            ].map((s, i) => (
              <motion.li
                key={i}
                role="listitem"
                variants={fadeUp}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                custom={i}
                className="relative pl-0"
              >
                <span className="text-5xl font-black text-gray-100 dark:text-white/5 select-none leading-none block mb-4">
                  {s.step}
                </span>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">{s.title}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">{s.desc}</p>
              </motion.li>
            ))}
          </ol>
        </div>
      </section>

      {/* ── CTA ───────────────────────────────────────────────────────────── */}
      <section aria-labelledby="cta-heading" className="py-24 md:py-32 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-gradient-to-b from-emerald-400/8 to-transparent rounded-full blur-[80px]" />
        </div>

        <div className="relative max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            <h2 id="cta-heading" className="text-4xl md:text-6xl font-extrabold tracking-tight text-gray-900 dark:text-white mb-6">
              ¿Listo para el<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-500 to-teal-400">
                siguiente nivel?
              </span>
            </h2>
            <p className="text-gray-500 dark:text-gray-400 mb-10 text-base max-w-md mx-auto">
              Únete a miles de personas que ya descubren, crean y viven experiencias increíbles.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/register">
                <motion.span
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  className="group inline-flex items-center gap-2 px-8 py-4 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-2xl font-bold text-base shadow-xl shadow-black/10 transition-shadow hover:shadow-black/20 cursor-pointer"
                >
                  Únete gratis
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
                </motion.span>
              </Link>
              <Link href="/events">
                <motion.span
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl font-semibold text-base border border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors cursor-pointer"
                >
                  Ver eventos
                </motion.span>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Footer ────────────────────────────────────────────────────────── */}
      <footer className="py-8 border-t border-gray-100 dark:border-white/5">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-gray-400 dark:text-gray-500">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
              <Calendar className="w-3 h-3 text-white" aria-hidden="true" />
            </div>
            <span className="font-semibold text-gray-600 dark:text-gray-400">EventNow</span>
          </div>
          <p>© 2025 EventNow. Hecho para la comunidad.</p>
          <nav aria-label="Footer navigation" className="flex gap-5">
            <Link href="/privacy" className="hover:text-gray-700 dark:hover:text-gray-300 transition-colors">Privacidad</Link>
            <Link href="/terms" className="hover:text-gray-700 dark:hover:text-gray-300 transition-colors">Términos</Link>
            <Link href="/contact" className="hover:text-gray-700 dark:hover:text-gray-300 transition-colors">Contacto</Link>
          </nav>
        </div>
      </footer>
    </div>
  )
}

// ─── Avatar Group ─────────────────────────────────────────────────────────────

function AvatarGroup() {
  const colors = [
    'from-emerald-400 to-teal-500',
    'from-violet-400 to-purple-500',
    'from-sky-400 to-blue-500',
    'from-pink-400 to-rose-500',
    'from-amber-400 to-orange-500',
  ]
  const initials = ['A', 'M', 'J', 'R', 'C']

  return (
    <div className="flex -space-x-2" aria-label="Usuarios registrados">
      {colors.map((c, i) => (
        <div
          key={i}
          className={cn(
            'w-7 h-7 rounded-full border-2 border-white dark:border-gray-950 flex items-center justify-center text-white text-[10px] font-bold bg-gradient-to-br',
            c
          )}
          aria-hidden="true"
        >
          {initials[i]}
        </div>
      ))}
    </div>
  )
}
