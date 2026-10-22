'use client'

import { useId, useState, type ReactNode } from 'react'
import { ChevronDown } from 'lucide-react'

export function EventSectionDisclosure({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)
  const contentId = useId()
  return (
    <section className="mb-6 overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03]">
      <button type="button" aria-expanded={isOpen} aria-controls={contentId} onClick={() => setIsOpen(open => !open)}
        className="flex w-full items-center justify-between gap-4 p-5 text-left transition hover:bg-white/5 sm:p-6">
        <span>
          <span className="block text-base font-bold text-foreground">{title}</span>
          {description && <span className="mt-1 block text-sm text-muted-foreground">{description}</span>}
        </span>
        <ChevronDown className={`h-5 w-5 shrink-0 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      {isOpen && <div id={contentId} className="space-y-5 border-t border-white/10 p-3 sm:p-5">{children}</div>}
    </section>
  )
}
