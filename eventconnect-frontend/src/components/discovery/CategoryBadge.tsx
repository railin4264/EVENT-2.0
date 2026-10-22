import { categoryMeta } from '@/lib/categories'

/** Burbuja con el emoji y color propio de la categoría, para identificar el plan de un vistazo. */
export function CategoryBadge({ category, activityType, size = 'md', showLabel = true }: { category?: string; activityType?: string; size?: 'sm' | 'md' | 'lg'; showLabel?: boolean }) {
  const meta = categoryMeta(category)
  const box = size === 'lg' ? 'h-12 w-12 text-2xl' : size === 'sm' ? 'h-7 w-7 text-sm' : 'h-9 w-9 text-lg'
  return (
    <span className="inline-flex items-center gap-2" title={activityType || meta.label}>
      <span
        aria-hidden="true"
        className={`grid shrink-0 place-items-center rounded-xl ${box}`}
        style={{ background: `linear-gradient(135deg, ${meta.color}33, ${meta.color}1a)`, boxShadow: `inset 0 0 0 1px ${meta.color}55` }}
      >
        {meta.emoji}
      </span>
      {showLabel && <span className="text-xs font-semibold" style={{ color: meta.color }}>{activityType || meta.label}</span>}
    </span>
  )
}
