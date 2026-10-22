import React from 'react'
import Link from 'next/link'
import { ArrowUpRight, Compass, Users, CalendarDays } from 'lucide-react'

const groups = [
  { title: 'Encuentra tu ambiente', icon: Compass, description: 'Una salida espontánea o una comunidad que comparta lo tuyo.', links: [
    ['/events', 'Todos los eventos', 'Busca por destino, fecha e intereses.'],
    ['/discovery', 'Explorar en el mapa', 'Mira qué sucede en cada zona.'],
    ['/tribes', 'Comunidades', 'Encuentra gente con intereses en común.'],
    ['/stories', 'Historias', 'Descubre lo que comparte la comunidad.'],
    ['/passport', 'Pasaporte RD', 'Lleva contigo tus experiencias.']
  ] },
  { title: 'Decídanlo entre todos', icon: Users, description: 'Menos «¿qué hacemos?». Más planes que sí se realizan.', links: [
    ['/plans', 'Resolvamos el coro', 'Comparte hasta tres opciones y voten.'],
    ['/ideas', 'Yo voy si…', 'Propón una idea y encuentra su público.'],
    ['/planning-tools', 'Preparar mi itinerario', 'Prepara horarios, itinerarios y calendario.']
  ] },
  { title: 'Haz que pase', icon: CalendarDays, description: 'Herramientas para anfitriones, espacios y marcas.', links: [
    ['/events/create', 'Crear un evento', 'Convierte tu propuesta en un encuentro.'],
    ['/organizers', 'Para organizadores', 'Prepara tu evento y conoce a tu público.'],
    ['/partners', 'Explorar colaboraciones', 'Encuentra convocatorias y prepara tu propuesta.']
  ] }
]

export function HomeToolsHub() {
  return <section id="herramientas" aria-labelledby="home-tools-title" className="mx-auto max-w-[1440px] scroll-mt-24 px-5 py-12 sm:px-8">
    <div className="mb-7 max-w-2xl"><p className="text-sm font-semibold text-primary">EL SIGUIENTE PASO LO ELIGES TÚ</p><h2 id="home-tools-title" className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Un lugar para cada plan.</h2><p className="mt-3 text-sm leading-relaxed text-muted-foreground">Explora sin cuenta. Cuando quieras participar, guardar o crear, te ayudamos a dar el siguiente paso.</p></div>
    <div className="grid gap-5 lg:grid-cols-3">{groups.map(({ title, icon: Icon, description, links }) => <div key={title} className="rounded-2xl border border-border bg-card p-5 sm:p-6">
      <Icon aria-hidden="true" className="mb-5 h-6 w-6 text-primary" /><h3 className="text-xl font-semibold">{title}</h3><p className="mb-5 mt-2 text-sm leading-relaxed text-muted-foreground">{description}</p>
      <ul className="divide-y divide-border">{links.map(([href, label, detail]) => <li key={href}><Link href={href} aria-label={label} className="group flex min-h-16 items-center justify-between gap-4 rounded-lg py-3 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"><span><span className="block text-sm font-semibold group-hover:text-primary">{label}</span><span className="mt-1 block text-xs leading-relaxed text-muted-foreground">{detail}</span></span><ArrowUpRight aria-hidden="true" className="h-4 w-4 shrink-0 text-muted-foreground group-hover:text-primary" /></Link></li>)}</ul>
    </div>)}</div>
  </section>
}
