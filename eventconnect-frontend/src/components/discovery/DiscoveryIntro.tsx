import Link from 'next/link'
import { ArrowRight, Music2, Footprints, BookOpen, Sparkles, Users } from 'lucide-react'

const startingPoints = [
  { category: 'unofficial', title: 'Espontáneos', icon: Sparkles },
  { category: 'music', title: 'Música', icon: Music2 },
  { category: 'outdoors', title: 'Al aire libre', icon: Footprints },
  { category: 'education', title: 'Aprender algo', icon: BookOpen },
]

export function DiscoveryIntro({ createHref, onCategory, onUnofficial, onToday, todayActive = false, selectedCategory = '', unofficialOnly = false }: {
  createHref: string
  onCategory: (category: string) => void
  onUnofficial?: () => void
  onToday?: () => void
  todayActive?: boolean
  selectedCategory?: string
  unofficialOnly?: boolean
}) {
  const scrollToPlanes = () => {
    document.getElementById('planes')?.scrollIntoView({
      behavior: window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'start',
    })
  }

  return (
    <div className="discovery-intro">
      <div className="discovery-intro-copy">
        <p className="discovery-eyebrow"><span />Hay algo bueno por hacer</p>
        <h1 id="discovery-title">Sal de la rutina.<br /><span>Encuentra tu plan.</span></h1>
        <p className="discovery-intro-description">Un concierto al atardecer, un taller que te inspire o un encuentro inesperado. Descubre qué pasa y con quién compartirlo.</p>
        <div className="discovery-intro-actions">
          {onToday ? <button type="button" className="discovery-main-action" aria-pressed={todayActive} onClick={() => { onToday(); scrollToPlanes() }}>¿Qué hay hoy? <ArrowRight size={17} aria-hidden="true" /></button> : <a className="discovery-main-action" href="#planes">Explorar planes <ArrowRight size={17} aria-hidden="true" /></a>}
          <Link className="discovery-text-action" href={createHref}>Quiero organizar uno <ArrowRight size={15} aria-hidden="true" /></Link>
        </div>
        <p className="discovery-guest-note">{onToday ? 'En curso y próximas 12 horas en el destino que elijas. Explora sin cuenta.' : 'Explora sin cuenta. Regístrate cuando quieras unirte.'}</p>
        <div className="discovery-quick-start" role="group" aria-label="Ideas para empezar">
          {startingPoints.map(({ category, title, icon: Icon }) => (
            <button key={category} type="button"
              aria-pressed={category === 'unofficial' ? unofficialOnly : !unofficialOnly && selectedCategory === category}
              onClick={() => {
                if (category === 'unofficial' && onUnofficial) onUnofficial()
                else onCategory(category)
                scrollToPlanes()
              }}>
              <Icon size={16} strokeWidth={1.7} aria-hidden="true" />{title}
            </button>
          ))}
        </div>
        <Link href="/plans" className="discovery-group-link"><Users size={16} aria-hidden="true" />¿Van en grupo? Elijan el plan juntos <ArrowRight size={14} aria-hidden="true" /></Link>
      </div>
    </div>
  )
}

