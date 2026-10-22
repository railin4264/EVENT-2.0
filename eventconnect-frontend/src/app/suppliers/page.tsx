'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { Users, Star, CheckCircle2, MapPin, MessageCircle, Search, Music, Camera, Wine, Building, Lightbulb, Shield, ArrowRight } from 'lucide-react'
import { apiClient } from '@/lib/api/client'
import { directorySupplier } from '@/lib/suppliers'

const categories = [
  { id: 'all', label: 'Todos', icon: Users }, { id: 'dj_sound', label: 'DJs y sonido', icon: Music },
  { id: 'photography_video', label: 'Foto y video', icon: Camera }, { id: 'bartender_catering', label: 'Comida y bebidas', icon: Wine },
  { id: 'venue_rooftop', label: 'Espacios', icon: Building }, { id: 'decor_lighting', label: 'Decoración y luces', icon: Lightbulb },
  { id: 'security_staff', label: 'Seguridad y personal', icon: Shield }, { id: 'mc_animation', label: 'Animación', icon: Users }, { id: 'other', label: 'Otros', icon: Users }
]
const button = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-border px-4 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50'
export default function SuppliersPage() {
  const [category, setCategory] = useState('all'), [search, setSearch] = useState('')
  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['suppliers-directory', category],
    queryFn: async () => {
      const response = await apiClient.get('/suppliers', { params: category === 'all' ? {} : { category } })
      if (response.data?.success !== true || !Array.isArray(response.data.data)) throw Error('Directorio no disponible')
      return response.data.data.map(directorySupplier).filter((item: ReturnType<typeof directorySupplier>): item is NonNullable<ReturnType<typeof directorySupplier>> => item !== null)
    }, retry: 1
  })
  const query = search.trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
  const suppliers = (data || []).filter(s => [s.name, s.description, s.city, ...s.services].join(' ').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().includes(query))
  return <div className="min-h-screen bg-background text-foreground"><div className="mx-auto max-w-6xl space-y-7 px-4 py-8 pb-28 sm:px-6 sm:py-12">
    <header className="max-w-3xl"><p className="mb-3 text-sm font-medium text-primary">Para quienes hacen posible el plan</p><h1 className="text-3xl font-semibold tracking-tight sm:text-5xl">El equipo para tu próximo evento.</h1><p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">Encuentra servicios, compara la información disponible y consulta disponibilidad y tarifas directamente con cada suplidor.</p></header>
    <label className="block max-w-xl text-sm font-medium">Buscar suplidores<div className="relative mt-2"><Search className="absolute left-4 top-3.5 h-5 w-5 text-muted-foreground" aria-hidden="true" /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Nombre, servicio o ciudad" className="min-h-12 w-full rounded-xl border border-input bg-card py-3 pl-12 pr-4 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" /></div></label>
    <nav aria-label="Categorías de suplidores" className="flex flex-wrap gap-2">{categories.map(c => <button key={c.id} type="button" aria-pressed={category === c.id} onClick={() => setCategory(c.id)} className={`${button} ${category === c.id ? 'border-primary bg-primary text-primary-foreground' : 'bg-card hover:bg-muted'}`}><c.icon className="h-4 w-4" />{c.label}</button>)}</nav>
    {isLoading ? <div role="status" className="py-12 text-muted-foreground">Cargando el directorio…</div> : isError ? <div role="alert" className="rounded-2xl border border-border bg-card p-8"><h2 className="text-lg font-semibold">No pudimos cargar los suplidores</h2><p className="mt-2 text-muted-foreground">Vuelve a intentarlo. Un problema de conexión no significa que el directorio esté vacío.</p><button type="button" disabled={isFetching} onClick={() => void refetch()} className={`${button} mt-5`}>Reintentar</button></div> : !suppliers.length ? <div className="rounded-2xl border border-dashed border-border p-8"><h2 className="text-lg font-semibold">No hay suplidores con estos filtros</h2><p className="mt-2 text-muted-foreground">Prueba otro servicio o ciudad.</p><button type="button" onClick={() => { setCategory('all'); setSearch('') }} className={`${button} mt-4`}>Limpiar filtros</button></div> : <section aria-label="Suplidores disponibles" className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">{suppliers.map(s => <article key={s.id} className="flex min-w-0 flex-col rounded-2xl border border-border bg-card p-6"><p className="text-xs font-medium text-primary">{categories.find(c => c.id === s.category)?.label || 'Servicios para eventos'}</p><h2 className="mt-3 flex items-start gap-2 text-xl font-semibold leading-7"><span className="break-words">{s.name}</span>{s.verified && <CheckCircle2 aria-label="Verificado" className="mt-1 h-4 w-4 shrink-0 text-primary" />}</h2><p className="mt-2 flex items-start gap-2 text-sm text-muted-foreground"><MapPin className="h-4 w-4 shrink-0" />{s.city}</p><p className="mt-4 text-sm leading-6 text-muted-foreground">{s.description || 'Consulta los detalles del servicio con el suplidor.'}</p><p className="mt-4 flex items-center gap-2 text-sm">{s.reviews > 0 && s.rating !== null ? <><Star className="h-4 w-4 text-primary" />{s.rating.toFixed(1)} <span className="text-muted-foreground">({s.reviews} reseñas)</span></> : <span className="text-muted-foreground">Sin reseñas disponibles</span>}</p>{!!s.services.length && <ul className="mt-4 space-y-1 text-sm text-muted-foreground">{s.services.slice(0,3).map((service,i) => <li key={i}>· {service}</li>)}</ul>}<div className="mt-auto pt-6"><p className="text-xs text-muted-foreground">Precio indicado por el suplidor</p><p className="mt-1 text-sm font-semibold">{s.price}</p>{s.contactUrl ? <a href={s.contactUrl} target="_blank" rel="noopener noreferrer" className={`${button} mt-4 w-full bg-primary text-primary-foreground hover:bg-primary/90`}><MessageCircle className="h-4 w-4" />Solicitar cotización</a> : <p className="mt-4 rounded-xl bg-muted px-4 py-3 text-sm text-muted-foreground">Contacto por confirmar</p>}</div></article>)}</section>}
    <aside className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-muted p-6"><div><h2 className="font-semibold">¿Trabajas en eventos?</h2><p className="mt-1 text-sm text-muted-foreground">Conoce las herramientas para anfitriones y colaboradores.</p></div><Link href="/partners" className={button}>Explorar oportunidades<ArrowRight className="h-4 w-4" /></Link></aside>
  </div></div>
}
