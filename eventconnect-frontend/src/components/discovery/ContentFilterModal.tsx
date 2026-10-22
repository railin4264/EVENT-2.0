'use client'

import { useState, useEffect } from 'react'
import { X, SlidersHorizontal, ShieldCheck, Check, Sparkles, AlertCircle, Ban } from 'lucide-react'
import { CATEGORY_LIST, type CategoryMeta } from '@/lib/categories'
import { apiClient } from '@/lib/api/client'
import toast from 'react-hot-toast'

export interface ContentFilterPreferences {
  contentFilterMode: 'all' | 'whitelist' | 'blacklist'
  preferredCategories: string[]
  hiddenCategories: string[]
  hidePolitical: boolean
  hideReligious: boolean
  hideAdultOnly: boolean
}

export const DEFAULT_CONTENT_PREFERENCES: ContentFilterPreferences = {
  contentFilterMode: 'all',
  preferredCategories: [],
  hiddenCategories: [],
  hidePolitical: false,
  hideReligious: false,
  hideAdultOnly: true
}

const STORAGE_KEY = 'eventnow_content_filter_preferences'

export function loadStoredPreferences(): ContentFilterPreferences {
  if (typeof window === 'undefined') return DEFAULT_CONTENT_PREFERENCES
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_CONTENT_PREFERENCES
    return { ...DEFAULT_CONTENT_PREFERENCES, ...JSON.parse(raw) }
  } catch {
    return DEFAULT_CONTENT_PREFERENCES
  }
}

export function saveStoredPreferences(prefs: ContentFilterPreferences) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs))
  } catch (e) {
    console.error('Failed to save content filter preferences to localStorage', e)
  }
}

interface ContentFilterModalProps {
  isOpen: boolean
  onClose: () => void
  onApply?: (prefs: ContentFilterPreferences) => void
  currentUser?: any
}

export default function ContentFilterModal({
  isOpen,
  onClose,
  onApply,
  currentUser
}: ContentFilterModalProps) {
  const [prefs, setPrefs] = useState<ContentFilterPreferences>(DEFAULT_CONTENT_PREFERENCES)
  const [isSaving, setIsSaving] = useState(false)

  // Initialize preferences from localStorage or currentUser
  useEffect(() => {
    if (!isOpen) return

    if (currentUser?.settings?.preferences) {
      const p = currentUser.settings.preferences
      setPrefs({
        contentFilterMode: p.contentFilterMode || 'all',
        preferredCategories: Array.isArray(p.preferredCategories) ? p.preferredCategories : [],
        hiddenCategories: Array.isArray(p.hiddenCategories) ? p.hiddenCategories : [],
        hidePolitical: Boolean(p.hidePolitical),
        hideReligious: Boolean(p.hideReligious),
        hideAdultOnly: p.hideAdultOnly !== false
      })
    } else {
      setPrefs(loadStoredPreferences())
    }
  }, [isOpen, currentUser])

  if (!isOpen) return null

  const handleTogglePolitical = () => {
    setPrefs(prev => ({ ...prev, hidePolitical: !prev.hidePolitical }))
  }

  const handleToggleReligious = () => {
    setPrefs(prev => ({ ...prev, hideReligious: !prev.hideReligious }))
  }

  const handleToggleAdultOnly = () => {
    setPrefs(prev => ({ ...prev, hideAdultOnly: !prev.hideAdultOnly }))
  }

  const handleModeChange = (mode: 'all' | 'whitelist' | 'blacklist') => {
    setPrefs(prev => ({ ...prev, contentFilterMode: mode }))
  }

  const handleToggleCategory = (slug: string) => {
    if (prefs.contentFilterMode === 'whitelist') {
      const exists = prefs.preferredCategories.includes(slug)
      const next = exists
        ? prefs.preferredCategories.filter(s => s !== slug)
        : [...prefs.preferredCategories, slug]
      setPrefs(prev => ({ ...prev, preferredCategories: next }))
    } else if (prefs.contentFilterMode === 'blacklist') {
      const exists = prefs.hiddenCategories.includes(slug)
      const next = exists
        ? prefs.hiddenCategories.filter(s => s !== slug)
        : [...prefs.hiddenCategories, slug]
      setPrefs(prev => ({ ...prev, hiddenCategories: next }))
    }
  }

  const handleSelectAllInMode = () => {
    const allSlugs = CATEGORY_LIST.map(c => c.slug)
    if (prefs.contentFilterMode === 'whitelist') {
      setPrefs(prev => ({ ...prev, preferredCategories: allSlugs }))
    } else if (prefs.contentFilterMode === 'blacklist') {
      setPrefs(prev => ({ ...prev, hiddenCategories: allSlugs }))
    }
  }

  const handleClearInMode = () => {
    if (prefs.contentFilterMode === 'whitelist') {
      setPrefs(prev => ({ ...prev, preferredCategories: [] }))
    } else if (prefs.contentFilterMode === 'blacklist') {
      setPrefs(prev => ({ ...prev, hiddenCategories: [] }))
    }
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      // 1. Save to local storage for guests & fast client reloads
      saveStoredPreferences(prefs)

      // 2. If logged in, sync with backend settings
      if (currentUser) {
        await apiClient.put('/users/me/settings', {
          preferences: {
            contentFilterMode: prefs.contentFilterMode,
            preferredCategories: prefs.preferredCategories,
            hiddenCategories: prefs.hiddenCategories,
            hidePolitical: prefs.hidePolitical,
            hideReligious: prefs.hideReligious,
            hideAdultOnly: prefs.hideAdultOnly
          }
        })
      }

      toast.success('Filtros de contenido guardados')
      if (onApply) onApply(prefs)
      onClose()
    } catch (error) {
      console.error('Error saving content filter preferences:', error)
      toast.error('Se guardó localmente, pero hubo un error sincronizando con el servidor')
      if (onApply) onApply(prefs)
      onClose()
    } finally {
      setIsSaving(false)
    }
  }

  const handleReset = () => {
    setPrefs(DEFAULT_CONTENT_PREFERENCES)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div
        className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-slate-900 border border-white/10 rounded-3xl shadow-2xl p-6 sm:p-8 text-foreground"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-primary-500/20 to-purple-500/20 rounded-2xl border border-primary-500/30">
              <SlidersHorizontal className="w-6 h-6 text-primary-400" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
                Filtro de Contenido
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-primary-500/20 text-primary-300 border border-primary-500/30 font-medium">
                  Personalizado
                </span>
              </h2>
              <p className="text-sm text-slate-400 mt-0.5">
                Controla qué tipo de eventos deseas ver en el feed, la ruleta y el mapa.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
            aria-label="Cerrar modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Fast Sensitivity Toggles */}
        <div className="mt-6 space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Filtros Rápidos de Sensibilidad
          </h3>

          {/* Political Content Toggle */}
          <div
            onClick={handleTogglePolitical}
            className={`cursor-pointer flex items-center justify-between p-4 rounded-2xl border transition-all ${
              prefs.hidePolitical
                ? 'bg-rose-500/10 border-rose-500/40 text-rose-200 shadow-sm shadow-rose-950/50'
                : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
            }`}
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">🏛️</span>
              <div>
                <p className="font-semibold text-sm sm:text-base flex items-center gap-2">
                  Ocultar eventos políticos y foros de campaña
                  {prefs.hidePolitical && (
                    <span className="text-xs bg-rose-500/20 text-rose-300 px-2 py-0.5 rounded-full border border-rose-500/30">
                      Oculto
                    </span>
                  )}
                </p>
                <p className="text-xs text-slate-400 mt-0.5">
                  Filtra debates políticos, mítines, foros partidistas y asambleas cívicas.
                </p>
              </div>
            </div>
            <div
              className={`w-12 h-6 flex items-center rounded-full p-1 duration-300 cursor-pointer ${
                prefs.hidePolitical ? 'bg-rose-500 justify-end' : 'bg-slate-700 justify-start'
              }`}
            >
              <div className="bg-white w-4 h-4 rounded-full shadow-md transform" />
            </div>
          </div>

          {/* Religious Content Toggle */}
          <div
            onClick={handleToggleReligious}
            className={`cursor-pointer flex items-center justify-between p-4 rounded-2xl border transition-all ${
              prefs.hideReligious
                ? 'bg-amber-500/10 border-amber-500/40 text-amber-200 shadow-sm shadow-amber-950/50'
                : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
            }`}
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">🙏</span>
              <div>
                <p className="font-semibold text-sm sm:text-base flex items-center gap-2">
                  Ocultar eventos religiosos y cultos espirituales
                  {prefs.hideReligious && (
                    <span className="text-xs bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full border border-amber-500/30">
                      Oculto
                    </span>
                  )}
                </p>
                <p className="text-xs text-slate-400 mt-0.5">
                  Filtra vigilias de oración, misas al aire libre, cultos y retiros de fe.
                </p>
              </div>
            </div>
            <div
              className={`w-12 h-6 flex items-center rounded-full p-1 duration-300 cursor-pointer ${
                prefs.hideReligious ? 'bg-amber-500 justify-end' : 'bg-slate-700 justify-start'
              }`}
            >
              <div className="bg-white w-4 h-4 rounded-full shadow-md transform" />
            </div>
          </div>
        </div>

        {/* Content Mode Selector */}
        <div className="mt-8">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Modo de Categorías
            </h3>
            {prefs.contentFilterMode !== 'all' && (
              <div className="flex items-center gap-2 text-xs">
                <button
                  type="button"
                  onClick={handleSelectAllInMode}
                  className="text-primary-400 hover:text-primary-300 transition-colors"
                >
                  Marcar todas
                </button>
                <span className="text-slate-600">·</span>
                <button
                  type="button"
                  onClick={handleClearInMode}
                  className="text-slate-400 hover:text-white transition-colors"
                >
                  Limpiar
                </button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {[
              {
                id: 'all',
                label: 'Ver Todo',
                desc: 'Muestra todas las categorías de actividades disponibles.',
                icon: Sparkles
              },
              {
                id: 'whitelist',
                label: 'Solo Favoritas',
                desc: 'Muestra únicamente las categorías que marques en la lista.',
                icon: ShieldCheck
              },
              {
                id: 'blacklist',
                label: 'Ocultar Específicas',
                desc: 'Oculta categorías individuales de tu feed y mapa.',
                icon: Ban
              }
            ].map(mode => {
              const Icon = mode.icon
              const isSelected = prefs.contentFilterMode === mode.id
              return (
                <button
                  key={mode.id}
                  type="button"
                  onClick={() => handleModeChange(mode.id as any)}
                  className={`p-3.5 rounded-2xl border text-left transition-all ${
                    isSelected
                      ? 'bg-primary-500/15 border-primary-500 text-white shadow-md shadow-primary-500/10'
                      : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10 hover:text-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-2 font-semibold text-sm">
                    <Icon className={`w-4 h-4 ${isSelected ? 'text-primary-400' : 'text-slate-500'}`} />
                    <span>{mode.label}</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1 leading-snug">{mode.desc}</p>
                </button>
              )
            })}
          </div>
        </div>

        {/* Detailed Category Checklist (when whitelist or blacklist active) */}
        {prefs.contentFilterMode !== 'all' && (
          <div className="mt-6">
            <p className="text-xs text-slate-400 mb-3">
              {prefs.contentFilterMode === 'whitelist'
                ? 'Elige qué categorías quieres incluir en tus resultados:'
                : 'Elige qué categorías deseas ocultar permanentemente:'}
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-56 overflow-y-auto pr-1">
              {CATEGORY_LIST.filter(c => c.slug !== 'other').map((cat: CategoryMeta) => {
                const isSelected =
                  prefs.contentFilterMode === 'whitelist'
                    ? prefs.preferredCategories.includes(cat.slug)
                    : prefs.hiddenCategories.includes(cat.slug)

                return (
                  <button
                    key={cat.slug}
                    type="button"
                    onClick={() => handleToggleCategory(cat.slug)}
                    className={`flex items-center justify-between p-2.5 rounded-xl border text-left transition-all text-xs ${
                      isSelected
                        ? prefs.contentFilterMode === 'whitelist'
                          ? 'bg-primary-500/20 border-primary-500/50 text-white font-medium'
                          : 'bg-rose-500/20 border-rose-500/50 text-rose-200 font-medium'
                        : 'bg-white/5 border-white/5 text-slate-300 hover:bg-white/10'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span>{cat.emoji}</span>
                      <span className="truncate">{cat.label}</span>
                    </div>
                    {isSelected && (
                      <span
                        className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${
                          prefs.contentFilterMode === 'whitelist' ? 'bg-primary-500 text-white' : 'bg-rose-500 text-white'
                        }`}
                      >
                        <Check className="w-2.5 h-2.5" />
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="mt-8 pt-4 border-t border-white/10 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleReset}
            className="text-xs text-slate-400 hover:text-white transition-colors"
          >
            Restablecer valores por defecto
          </button>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-sm font-medium text-slate-300 hover:bg-white/5 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={isSaving}
              onClick={handleSave}
              className="px-5 py-2 rounded-xl text-sm font-medium bg-gradient-to-r from-primary-500 to-indigo-600 hover:from-primary-600 hover:to-indigo-700 text-white shadow-lg shadow-primary-500/20 transition-all flex items-center gap-2 disabled:opacity-50"
            >
              {isSaving ? 'Guardando...' : 'Aplicar Preferencias'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
